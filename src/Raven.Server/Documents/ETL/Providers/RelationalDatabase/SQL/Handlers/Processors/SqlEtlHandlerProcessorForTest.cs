﻿using JetBrains.Annotations;
using Raven.Client.Documents.Operations.ETL.SQL;
using Raven.Server.Documents.ETL.Providers.Raven.Handlers.Processors;
using Raven.Server.Documents.ETL.Providers.RelationalDatabase.Common;
using Raven.Server.Json;
using Sparrow.Json;

namespace Raven.Server.Documents.ETL.Providers.RelationalDatabase.SQL.Handlers.Processors
{
    internal sealed class SqlEtlHandlerProcessorForTest : AbstractDatabaseEtlHandlerProcessorForTest<TestRelationalDatabaseEtlScript<SqlConnectionString, SqlEtlConfiguration>, SqlEtlConfiguration, SqlConnectionString>
    {
        public SqlEtlHandlerProcessorForTest([NotNull] DatabaseRequestHandler requestHandler) : base(requestHandler)
        {
        }

        protected override TestRelationalDatabaseEtlScript<SqlConnectionString, SqlEtlConfiguration> GetTestEtlScript(BlittableJsonReaderObject json) => JsonDeserializationServer.TestRelationalEtlScriptSql(json);
    }
}