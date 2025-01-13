using System;
using System.Linq;
using System.Threading.Tasks;
using FastTests;
using Raven.Client.Documents.Conventions;
using Raven.Server.Config;
using Raven.Server.NotificationCenter.Notifications;
using Raven.Server.NotificationCenter.Notifications.Details;
using Sparrow.Json;
using Sparrow.Json.Parsing;
using Sparrow.Server.Collections;
using Tests.Infrastructure;
using Xunit;
using Xunit.Abstractions;

namespace StressTests.Issues;

public class RavenDB_21247_Stress : RavenTestBase
{
    public RavenDB_21247_Stress(ITestOutputHelper output) : base(output)
    {
    }

    [RavenTheory(RavenTestCategory.Querying)]
    [RavenData(DatabaseMode = RavenDatabaseMode.All)]
    public async Task TestQueryCausingRequestLatencyWarning(Options options)
    {
        DoNotReuseServer();

        options.ModifyDatabaseRecord = record => record.Settings[RavenConfiguration.GetKey(x => x.PerformanceHints.TooLongRequestThreshold)] = "0";

        using (var store = GetDocumentStore(options))
        {
            var db = await GetDatabase(store.Database);

            using (var session = store.OpenSession())
            {
                var notificationsQueue = new AsyncQueue<DynamicJsonValue>();

                using (db.NotificationCenter.TrackActions(notificationsQueue, null))
                {
                    Tuple<bool, DynamicJsonValue> notification;

                    var res = session.Query<Dto>().Where(x => x.Name == "SomeName").ToList();

                    Indexes.WaitForIndexing(store);

                    do
                    {
                        notification = await notificationsQueue.TryDequeueAsync(TimeSpan.FromSeconds(5));
                    } while (notification.Item1 == false || notification.Item2["Type"].ToString() != NotificationType.PerformanceHint.ToString());

                    var notificationDetails = notification.Item2[nameof(AlertRaised.Details)] as DynamicJsonValue;

                    using (var ctx = JsonOperationContext.ShortTermSingleUse())
                    {
                        var json = ctx.ReadObject(notificationDetails, "details");

                        var detailsObject =
                            DocumentConventions.DefaultForServer.Serialization.DefaultConverter.FromBlittable<RequestLatencyDetail>(json, "cpu_exhaustion_warning_details");

                        detailsObject.RequestLatencies["Query"].TryDequeue(out RequestLatencyInfo requestLatencyInfo);

                        Assert.Equal("from 'Dtos' where Name = $p0\n{\"p0\":\"SomeName\"}", requestLatencyInfo.Query);
                    }
                }
            }
        }
    }

    private class Dto
    {
        public string Name { get; set; }
    }
}
