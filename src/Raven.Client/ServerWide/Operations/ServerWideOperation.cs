﻿using Raven.Client.Documents.Conventions;
using Raven.Client.Documents.Operations;
using Raven.Client.Http;

namespace Raven.Client.ServerWide.Operations
{
    public class ServerWideOperation : Operation
    {
        public ServerWideOperation(RequestExecutor requestExecutor, DocumentConventions conventions, long id, string commandSelectedNodeTagForRequest = null)
            : base(requestExecutor, null, conventions, id)
        {
            StatusFetchMode = OperationStatusFetchMode.Polling;
            NodeTag = commandSelectedNodeTagForRequest;
        }

        protected override RavenCommand<OperationState> GetOperationStateCommand(DocumentConventions conventions, long id, string nodeTag = null)
        {
            return new GetServerWideOperationStateOperation.GetServerWideOperationStateCommand(conventions, id, nodeTag);
        }
    }
}
