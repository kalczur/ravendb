using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using Amazon.SQS;
using Raven.Client.Documents;
using Raven.Client.Documents.Operations.ETL;
using Raven.Client.Documents.Operations.ETL.Queue;
using Raven.Client.Util;
using Xunit.Abstractions;

namespace SlowTests.Server.Documents.ETL.Queue.AmazonSqs;

public class AmazonSqsEtlTestBase : QueueEtlTestBase
{
    public AmazonSqsEtlTestBase(ITestOutputHelper output) : base(output)
    {
    }

    protected string OrdersQueueName => "orders";

    protected readonly string[] DefaultCollections = { "orders" };

    protected List<EtlQueue> DefaultExchanges => new() { new EtlQueue { Name = OrdersQueueName } };

    protected string DefaultScript => @"
var orderData = {
    Id: id(this),
    OrderLinesCount: this.OrderLines.length,
    TotalCost: 0
};

for (var i = 0; i < this.OrderLines.length; i++) {
    var line = this.OrderLines[i];
    orderData.TotalCost += line.Cost*line.Quantity;    
}
loadToOrders" + @"(orderData, {
                                                            Id: id(this),                                                            
                                                            Type: 'com.github.users',
                                                            Source: '/registrations/direct-signup'
                                                     });
output('test output')";

    protected QueueEtlConfiguration SetupQueueEtlToAmazonSqsOnline(DocumentStore store, string script,
        IEnumerable<string> collections, IEnumerable<EtlQueue> queues = null, bool applyToAllDocuments = false,
        string configurationName = null,
        string transformationName = null,
        Dictionary<string, string> configuration = null, string connectionString = null,
        bool skipAutomaticQueueDeclaration = false)
    {
        var connectionStringName = $"{store.Database}@{store.Urls.First()} to AmazonSqs";


        Transformation transformation = new Transformation
        {
            Name = transformationName ?? $"ETL : {connectionStringName}",
            Collections = new List<string>(collections),
            Script = script,
            ApplyToAllDocuments = applyToAllDocuments
        };
        var config = new QueueEtlConfiguration
        {
            Name = configurationName ?? connectionStringName,
            ConnectionStringName = connectionStringName,
            Transforms = { transformation },
            Queues = queues?.ToList(),
            BrokerType = QueueBrokerType.AmazonSqs,
            SkipAutomaticQueueDeclaration = skipAutomaticQueueDeclaration
        };

        Etl.AddEtl(store, config,
            new QueueConnectionString
            {
                Name = connectionStringName,
                BrokerType = QueueBrokerType.AmazonSqs,
                AmazonSqsConnectionSettings = new AmazonSqsConnectionSettings
                {
                    UseEmulator = true
                }
            });
        return config;
    }

    protected string GenerateLargeString()
    {
        StringBuilder builder = new();

        // Append characters to the StringBuilder until it's larger than 256KB
        while (builder.Length <= 256 * 1024)
        {
            builder.Append("Lorem ipsum dolor sit amet, consectetur adipiscing elit.");
        }

        return builder.ToString();
    }

    private void CleanupQueues()
    {
        IAmazonSQS queueClient = CreateQueueClient();
        
        var queues = AsyncHelpers.RunSync(() => queueClient.ListQueuesAsync("")).QueueUrls;
        
        foreach (var queue in queues)
        {
            AsyncHelpers.RunSync(() => queueClient.DeleteQueueAsync(queue));
        }
    }

    protected static IAmazonSQS CreateQueueClient()
    {
        IAmazonSQS queueClient = new AmazonSQSClient("dummy-access-key", "dummy-secret-key", new AmazonSQSConfig
        {
            ServiceURL = Environment.GetEnvironmentVariable(AmazonSqsConnectionSettings.EmulatorUrlEnvironmentVariable), 
            UseHttp = true,
        });
        return queueClient;
    }

    public override void Dispose()
    {
        base.Dispose();
        CleanupQueues();
    }
}