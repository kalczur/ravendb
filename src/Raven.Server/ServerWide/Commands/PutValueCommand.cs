﻿using System;
using Raven.Client;
using Raven.Server.ServerWide.Context;
using Sparrow.Json;
using Sparrow.Json.Parsing;

namespace Raven.Server.ServerWide.Commands
{
    public abstract class PutValueCommand<T> : CommandBase
    {
        public string Name;

        public T Value;

        public override DynamicJsonValue ToJson(JsonOperationContext context)
        {
            var djv = base.ToJson(context);
            djv[nameof(Name)] = Name;
            djv[nameof(Value)] = ValueToJson();

            return djv;
        }

        public abstract DynamicJsonValue ValueToJson();

        public override void VerifyCanExecuteCommand(ServerStore store, TransactionOperationContext context, bool isClusterAdmin)
        {
            if (Name == ServerStore.LicenseStorageKey ||
                Name == ServerStore.LicenseLimitsStorageKey)
                throw new InvalidOperationException("Attempted to use PutValueCommand to delete a license, use dedicated command for this.");
        }
    }
}
