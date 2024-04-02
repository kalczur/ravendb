using System;
using System.Linq;
using Sparrow.Json.Parsing;

namespace Raven.Client.Documents.Operations.ETL.Queue;

public sealed class AzureQueueStorageConnectionSettings
{
    public EntraId EntraId { get; set; }

    public string ConnectionString { get; set; }

    public bool Passwordless { get; set; }

    public string GetStorageUrl()
    {
        string storageAccountName = GetStorageAccountName();
        return $"https://{storageAccountName}.queue.core.windows.net/";
    }

    public string GetStorageAccountName()
    {
        string storageAccountName = "";

        if (ConnectionString != null)
        {
            var accountNamePart = ConnectionString.Split(';')
                .FirstOrDefault(part => part.StartsWith("AccountName=", StringComparison.OrdinalIgnoreCase));

            if (accountNamePart == null)
            {
                throw new ArgumentException("Storage account name not found in the connection string.",
                    nameof(ConnectionString));
            }

            storageAccountName = accountNamePart.Substring("AccountName=".Length);
        }
        else if (EntraId != null)
        {
            storageAccountName = EntraId.StorageAccountName;
        }

        return storageAccountName;
    }

    public DynamicJsonValue ToJson()
    {
        var json = new DynamicJsonValue
        {
            [nameof(ConnectionString)] = ConnectionString,
            [nameof(Passwordless)] = Passwordless,
            [nameof(EntraId)] = EntraId == null
                ? null
                : new DynamicJsonValue
                {
                    [nameof(EntraId.StorageAccountName)] = EntraId?.StorageAccountName,
                    [nameof(EntraId.TenantId)] = EntraId?.TenantId,
                    [nameof(EntraId.ClientId)] = EntraId?.ClientId,
                    [nameof(EntraId.ClientSecret)] = EntraId?.ClientSecret
                }
        };


        return json;
    }
}

public sealed class EntraId
{
    public string StorageAccountName { get; set; }
    public string TenantId { get; set; }
    public string ClientId { get; set; }
    public string ClientSecret { get; set; }
}
