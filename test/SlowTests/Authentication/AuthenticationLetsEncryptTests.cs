﻿// -----------------------------------------------------------------------
//  <copyright file="CanAuthenticate.cs" company="Hibernating Rhinos LTD">
//      Copyright (c) Hibernating Rhinos LTD. All rights reserved.
//  </copyright>
// -----------------------------------------------------------------------

using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Security.Cryptography.X509Certificates;
using System.Threading.Tasks;
using FastTests;
using Raven.Server.Commercial;
using Raven.Server.Config;
using Raven.Server.Config.Settings;
using Raven.Server.Utils;
using Sparrow.Json;
using Tests.Infrastructure;
using xRetry;
using Xunit;
using Xunit.Abstractions;
using Sparrow.Server;
using System.Linq;
using System.Runtime.CompilerServices;
using Raven.Client.Documents;
using Raven.Client.ServerWide.Operations.Certificates;
using Raven.Server.ServerWide.Context;
using Raven.Client.Exceptions;

namespace SlowTests.Authentication
{
    public partial class AuthenticationLetsEncryptTests : ClusterTestBase
    {
        public AuthenticationLetsEncryptTests(ITestOutputHelper output) : base(output)
        {
        }
        
        [RavenIntegrationRetryFact(delayBetweenRetriesMs: 1000)]
        public async Task CanGetPebbleCertificate()
        {
            var acmeUrl = Environment.GetEnvironmentVariable("RAVEN_PEBBLE_URL") ?? string.Empty;
            Assert.NotEmpty(acmeUrl);
            
            RemoveAcmeCache(acmeUrl);

            SetupLocalServer();
            SetupInfo setupInfo = await SetupClusterInfo(acmeUrl);

            await GetCertificateFromLetsEncrypt(setupInfo, acmeUrl);

            Server.Dispose();
        }

        [RetryFact(delayBetweenRetriesMs: 1000)]
        public async Task CanGetLetsEncryptCertificateAndRenewIt()
        {
            var acmeUrl = "https://acme-staging-v02.api.letsencrypt.org/directory";
            
            SetupLocalServer();
            SetupInfo setupInfo = await SetupClusterInfo(acmeUrl);

            var serverCert = await GetCertificateFromLetsEncrypt(setupInfo, acmeUrl);
            var firstServerCertThumbprint = serverCert.Thumbprint;
            Server.Dispose();

            UseNewLocalServer();
            await RenewCertificate(serverCert, firstServerCertThumbprint);
            using (Server.ServerStore.ContextPool.AllocateOperationContext(out TransactionOperationContext context))
            using (context.OpenReadTransaction())
            {
                var local = Server.ServerStore.Cluster.GetCertificateThumbprintsFromLocalState(context).ToList();
                Assert.Equal(0, local.Count);

                var cluster = Server.ServerStore.Cluster.GetCertificateThumbprintsFromCluster(context).ToList();
                Assert.Equal(0, cluster.Count);
            }
        }

        [RavenIntegrationRetryFact(delayBetweenRetriesMs: 1000)]
        public async Task CanGetLetsEncryptCertificateAndRenewAfterFailurePebble()
        {
            var acmeUrl = Environment.GetEnvironmentVariable("RAVEN_PEBBLE_URL") ?? string.Empty;
            Assert.NotEmpty(acmeUrl);

            await CanGetLetsEncryptCertificateAndRenewAfterFailure(acmeUrl);
        }

        [RetryFact(delayBetweenRetriesMs: 1000)]
        public async Task CanGetLetsEncryptCertificateAndRenewAfterFailure()
        {
            var acmeUrl = "https://acme-staging-v02.api.letsencrypt.org/directory";
            await CanGetLetsEncryptCertificateAndRenewAfterFailure(acmeUrl);
        }

        [RetryFact(delayBetweenRetriesMs: 1000)]
        public async Task ReplaceCertificateWithPrivateKey()
        {
            var acmeUrl = "https://acme-staging-v02.api.letsencrypt.org/directory";
            
            SetupLocalServer();
            SetupInfo setupInfo = await SetupClusterInfo(acmeUrl);

            var serverCert = await GetCertificateFromLetsEncrypt(setupInfo, acmeUrl);
            Server.Dispose();
            UseNewLocalServer();

            var mre = new AsyncManualResetEvent();
            Server.ServerCertificateChanged += (sender, args) => mre.Set();

            var ct = Certificates.GenerateAndSaveSelfSignedCertificate();
            var first = Server.Certificate.Certificate.Thumbprint;

            using (var store = GetDocumentStore(new Options { AdminCertificate = serverCert, ClientCertificate = serverCert }))
            {
                var bytesWithoutPrivateKey = ct.ServerCertificate.Value.RawData;
                var op = new ReplaceClusterCertificateOperation(bytesWithoutPrivateKey, replaceImmediately: true);
                var ex = await Assert.ThrowsAsync<RavenException>(() => store.Maintenance.Server.SendAsync(op));
                Assert.Contains("Unable to find the private key in the provided certificate", ex.ToString());

                var bytesWithPrivateKey = ct.ServerCertificate.Value.Export(X509ContentType.Pkcs12);
                var op2 = new ReplaceClusterCertificateOperation(bytesWithPrivateKey, replaceImmediately: true);
                await store.Maintenance.Server.SendAsync(op2);
            }

            await mre.WaitAsync(TimeSpan.FromSeconds(15));
            Assert.NotEqual(first, Server.Certificate.Certificate.Thumbprint);
        }

        private async Task CanGetLetsEncryptCertificateAndRenewAfterFailure(string acmeUrl)
        {
            RemoveAcmeCache(acmeUrl);

            SetupLocalServer();
            SetupInfo setupInfo = await SetupClusterInfo(acmeUrl);

            var serverCert = await GetCertificateFromLetsEncrypt(setupInfo, acmeUrl);
            var firstServerCertThumbprint = serverCert.Thumbprint;
            Server.Dispose();

            UseNewLocalServer();
            Server.ForTestingPurposesOnly().ThrowExceptionAfterLetsEncryptRefresh = true;
            await RenewCertificate(serverCert, firstServerCertThumbprint);

            using (Server.ServerStore.ContextPool.AllocateOperationContext(out TransactionOperationContext context))
            using (context.OpenReadTransaction())
            {
                var local = Server.ServerStore.Cluster.GetCertificateThumbprintsFromLocalState(context).ToList();
                Assert.Equal(0, local.Count);

                var cluster = Server.ServerStore.Cluster.GetCertificateThumbprintsFromCluster(context).ToList();
                Assert.Equal(0, cluster.Count);
            }
        }

        private static void RemoveAcmeCache(string acmeUrl)
        {
            var path = LetsEncryptClient.GetCachePath(acmeUrl);
            IOExtensions.DeleteFile(path);
        }

        private void SetupLocalServer()
        {
            var settingPath = Path.Combine(NewDataPath(forceCreateDir: true), "settings.json");
            var defaultSettingsPath = new PathSetting("settings.default.json").FullPath;
            File.Copy(defaultSettingsPath, settingPath, true);

            UseNewLocalServer(customConfigPath: settingPath);
        }

        private async Task<X509Certificate2> GetCertificateFromLetsEncrypt(SetupInfo setupInfo, string acmeUrl)
        {
            X509Certificate2 serverCert;
            using (var store = GetDocumentStoreForServerOnly())
            using (var commands = store.Commands())
            using (Server.ServerStore.ContextPool.AllocateOperationContext(out JsonOperationContext context))
            {
                var command = new SetupLetsEncryptCommand(store.Conventions, context, setupInfo)
                {
                    Timeout = TimeSpan.FromMinutes(10)
                };

                await commands.RequestExecutor.ExecuteAsync(command, commands.Context);

                Assert.True(command.Result.Length > 0);

                var zipBytes = command.Result;

                BlittableJsonReaderObject settingsJsonObject;
                byte[] serverCertBytes;
                try
                {
                    settingsJsonObject =
                        SetupManager.ExtractCertificatesAndSettingsJsonFromZip(zipBytes, "A", context, out serverCertBytes, out serverCert, out _, out _, out _, out _);
                }
                catch (Exception e)
                {
                    throw new InvalidOperationException("Unable to extract setup information from the zip file.", e);
                }

                // Finished the setup wizard, need to restart the server.
                // Since cannot restart we'll create a new server loaded with the new certificate and settings and use the server cert to connect to it

                settingsJsonObject.TryGet(RavenConfiguration.GetKey(x => x.Security.CertificatePassword), out string certPassword);
                settingsJsonObject.TryGet(RavenConfiguration.GetKey(x => x.Security.CertificateLetsEncryptEmail), out string letsEncryptEmail);
                settingsJsonObject.TryGet(RavenConfiguration.GetKey(x => x.Core.PublicServerUrl), out string publicServerUrl);
                settingsJsonObject.TryGet(RavenConfiguration.GetKey(x => x.Core.ServerUrls), out string serverUrl);
                settingsJsonObject.TryGet(RavenConfiguration.GetKey(x => x.Core.SetupMode), out SetupMode setupMode);
                settingsJsonObject.TryGet(RavenConfiguration.GetKey(x => x.Core.ExternalIp), out string externalIp);

                var tempFileName = GetTempFileName();
                File.WriteAllBytes(tempFileName, serverCertBytes);

                IDictionary<string, string> customSettings = new ConcurrentDictionary<string, string>
                {
                    [RavenConfiguration.GetKey(x => x.Security.CertificatePath)] = tempFileName,
                    [RavenConfiguration.GetKey(x => x.Security.CertificateLetsEncryptEmail)] = letsEncryptEmail,
                    [RavenConfiguration.GetKey(x => x.Security.CertificatePassword)] = certPassword,
                    [RavenConfiguration.GetKey(x => x.Core.PublicServerUrl)] = publicServerUrl,
                    [RavenConfiguration.GetKey(x => x.Core.ServerUrls)] = serverUrl,
                    [RavenConfiguration.GetKey(x => x.Core.SetupMode)] = setupMode.ToString(),
                    [RavenConfiguration.GetKey(x => x.Core.ExternalIp)] = externalIp,
                    [RavenConfiguration.GetKey(x => x.Core.AcmeUrl)] = acmeUrl
                };

                DoNotReuseServer(customSettings);
            }

            return serverCert;
        }

        private async Task RenewCertificate(X509Certificate2 serverCert, string firstServerCertThumbprint)
        {
            // Note: because we use a staging lets encrypt cert, the chain is not trusted.
            // It only works because in the TestBase ctor we do:
            // RequestExecutor.ServerCertificateCustomValidationCallback += (msg, cert, chain, errors) => true;

            using (var store = GetDocumentStoreForServerOnly(serverCert))
            using (var commands = store.Commands())
            using (Server.ServerStore.ContextPool.AllocateOperationContext(out JsonOperationContext context))
            {
                await Server.ServerStore.EnsureNotPassiveAsync();
                Assert.Equal(firstServerCertThumbprint, Server.Certificate.Certificate.Thumbprint);

                Server.Time.UtcDateTime = () => DateTime.UtcNow.AddDays(80);

                var mre = new AsyncManualResetEvent();
                var clusterReplacementConfirmed = new AsyncManualResetEvent();

                Server.ServerCertificateChanged += (sender, args) => mre.Set();
                Server.ServerStore.ForTestingPurposesOnly().OnConfirmCertificateReplacedValueChanged += clusterReplacementConfirmed.Set;

                var command = new ForceRenewCertCommand(store.Conventions, context);

                await commands.RequestExecutor.ExecuteAsync(command, commands.Context);

                Assert.True(command.Result.Success, "ForceRenewCertCommand returned false");

                var result = await mre.WaitAsync(Debugger.IsAttached ? TimeSpan.FromMinutes(10) : TimeSpan.FromMinutes(4));

                if (result == false && Server.RefreshTask.IsCompleted)
                {
                    if (Server.RefreshTask.IsFaulted || Server.RefreshTask.IsCanceled)
                    {
                        Assert.True(result,
                            $"Refresh task failed to complete successfully. Exception: {Server.RefreshTask.Exception}");
                    }

                    Assert.True(result, "Refresh task completed successfully, waited too long for the cluster cert to be replaced");
                }

                Assert.True(result, "Refresh task didn't complete. Waited too long for the cluster cert to be replaced");

                Assert.NotEqual(firstServerCertThumbprint, Server.Certificate.Certificate.Thumbprint);

                var r = await clusterReplacementConfirmed.WaitAsync(TimeSpan.FromMinutes(2));
                Assert.True(r, "missing ConfirmServerCertificateReplacedCommand");
            }
        }

        private async Task<SetupInfo> SetupClusterInfo(string acmeUrl)
        {
            Server.Configuration.Core.AcmeUrl = acmeUrl;
            Server.ServerStore.Configuration.Core.SetupMode = SetupMode.Initial;

            var domain = "RavenClusterTest" + Environment.MachineName.Replace("-", "");
            string email;
            string rootDomain;

            await Server.ServerStore.EnsureNotPassiveAsync();
            var license = Server.ServerStore.LoadLicense();

            using (var store = GetDocumentStoreForServerOnly())
            using (var commands = store.Commands())
            using (Server.ServerStore.ContextPool.AllocateOperationContext(out JsonOperationContext context))
            {
                var command = new ClaimDomainCommand(store.Conventions, context, new ClaimDomainInfo { Domain = domain, License = license });

                await commands.RequestExecutor.ExecuteAsync(command, commands.Context);

                Assert.True(command.Result.RootDomains.Length > 0);
                rootDomain = command.Result.RootDomains[0];
                email = command.Result.Email;
            }

            var setupInfo = new SetupInfo
            {
                Domain = domain,
                RootDomain = rootDomain,
                ZipOnly = false, // N/A here
                RegisterClientCert = false, // N/A here
                Password = null,
                Certificate = null,
                LocalNodeTag = "A",
                License = license,
                Email = email,
                NodeSetupInfos = new Dictionary<string, NodeInfo>()
                {
                    ["A"] = new NodeInfo { Port = GetAvailablePort(), TcpPort = GetAvailablePort(), Addresses = new List<string> { "127.0.0.1" } }
                }
            };
            return setupInfo;
        }

        public DocumentStore GetDocumentStoreForServerOnly(X509Certificate2 certificate = null, [CallerMemberName] string caller = null)
        {
            return GetDocumentStore(new Options
            {
                CreateDatabase = false,
                DeleteDatabaseOnDispose = false,
                AdminCertificate = certificate,
                ClientCertificate = certificate
            }, caller);
        }
    }
}
