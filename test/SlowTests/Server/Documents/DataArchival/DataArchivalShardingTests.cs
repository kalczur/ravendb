﻿using System;
using System.Threading.Tasks;
using Raven.Client;
using Raven.Client.Documents.Operations.DataArchival;
using Raven.Server.Documents.DataArchival;
using SlowTests.Core.Utils.Entities;
using Sparrow;
using Tests.Infrastructure;
using Xunit;
using Xunit.Abstractions;

namespace SlowTests.Server.Documents.DataArchival;

public class DataArchivalShardingTests : ClusterTestBase
{
    [RavenFact(RavenTestCategory.ExpirationRefresh | RavenTestCategory.Sharding)]
    public async Task ShouldArchiveDocsForSharding()
    {
        var database2 = GetDatabaseName();
        var cluster = await CreateRaftCluster(3, watcherCluster: true, leaderIndex: 0);
        await ShardingCluster.CreateShardedDatabaseInCluster(database2, replicationFactor: 2, cluster, shards: 3);

        var configuration = new DataArchivalConfiguration {Disabled = false, ArchiveFrequencyInSec = 100};

        using (var store = Sharding.GetDocumentStore(new Options {Server = cluster.Leader, CreateDatabase = false, ModifyDatabaseName = _ => database2}))
        {
            await store.Maintenance.SendAsync(new ConfigureDataArchivalOperation(configuration));

            var retires = DateTime.Now; // intentionally local time
            var numOfDocs = 20;

            using (var session = store.OpenSession())
            {
                for (var i = 0; i < numOfDocs; i++)
                {
                    var comp = new Company {Name = $"{i}"};
                    session.Store(comp, $"company/{i}");
                    var metadata = session.Advanced.GetMetadataFor(comp);
                    metadata[Constants.Documents.Metadata.ArchiveAt] = retires.ToString(DefaultFormat.DateTimeOffsetFormatsToWrite);
                }

                session.SaveChanges();
            }

            var servers = await ShardingCluster.GetShardsDocumentDatabaseInstancesFor(store, cluster.Nodes);

            while (Sharding.AllShardHaveDocs(servers) == false)
            {
                using (var session = store.OpenSession())
                {
                    for (var i = numOfDocs; i < numOfDocs + 20; i++)
                    {
                        var comp = new Company {Name = $"{i}"};
                        session.Store(comp, $"company/{i}");
                        var metadata = session.Advanced.GetMetadataFor(comp);
                        metadata[Constants.Documents.Metadata.ArchiveAt] = retires.ToString(DefaultFormat.DateTimeOffsetFormatsToWrite);
                    }

                    session.SaveChanges();
                }

                numOfDocs += 20;
            }

            for (var i = 0; i < numOfDocs; i++)
            {
                using (var session = store.OpenAsyncSession())
                {
                    var comp = await session.LoadAsync<Company>($"company/{i}");
                    Assert.NotNull(comp);
                }
            }

            foreach (var kvp in servers)
            {
                foreach (var database in kvp.Value)
                {
                    database.Time.UtcDateTime = () => DateTime.UtcNow.AddMinutes(10);

                    DataArchivist archivist = null;
                    Assert.True(WaitForValue(() =>
                    {
                        archivist = database.DataArchivist;
                        return archivist != null;
                    }, expectedVal: true));

                    await archivist.ArchiveDocs();
                }
            }

            for (var i = 0; i < numOfDocs; i++)
            {
                using (var session = store.OpenAsyncSession())
                {
                    var company = await session.LoadAsync<Company>($"company/{i}");
                    Assert.NotNull(company);
                    var metadata = session.Advanced.GetMetadataFor(company);
                    Assert.DoesNotContain(Constants.Documents.Metadata.ArchiveAt, metadata.Keys);
                    Assert.Contains(Constants.Documents.Metadata.Collection, metadata.Keys);
                    Assert.Contains(Constants.Documents.Metadata.Archived, metadata.Keys);
                    Assert.Equal(true, metadata[Constants.Documents.Metadata.Archived]);

                }
            }
        }
    }

    public DataArchivalShardingTests(ITestOutputHelper output) : base(output)
    {
    }
}
