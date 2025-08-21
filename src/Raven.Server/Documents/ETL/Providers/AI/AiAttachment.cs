using System;
using Raven.Client.Util;
using Sparrow.Json.Parsing;

namespace Raven.Server.Documents.ETL.Providers.AI;

public class AiAttachment
{
    public string Name { get; set; }
    public string Type { get; set; }
    public AiAttachmentSource Source { get; set; }
    public string DataAsBase64 { get; set; }

    public AiAttachment()
    {
        // for deserialization
    }

    public AiAttachment(string name, string type, AiAttachmentSource source, string dataAsBase64)
    {
        ValidationMethods.AssertNotNullOrEmpty(name, nameof(Name));
        ValidationMethods.AssertNotNullOrEmpty(type, nameof(Type));
        if (source != AiAttachmentSource.NotFound)
            ValidationMethods.AssertNotNullOrEmpty(dataAsBase64, nameof(DataAsBase64));

        Name = name;
        Type = type;
        Source = source;
        DataAsBase64 = dataAsBase64;
    }

    public DynamicJsonValue ToJson()
    {
        var json = new DynamicJsonValue
        {
            [nameof(Name)] = Name,
            [nameof(Type)] = Type,
            [nameof(Source)] = Source,
            [nameof(DataAsBase64)] = DataAsBase64
        };

        return json;
    }
}

public enum AiAttachmentSource { FromDatabase, FromUser, NotFound }
