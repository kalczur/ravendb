
// import aiAgentsTypes = require("components/pages/database/aiHub/aiAgents/utils/aiAgentsTypes");

import commandBase = require("commands/commandBase");
import endpoints = require("endpoints");

type AiAgentTestRequest = Raven.Server.Documents.Handlers.AI.Agents.AiAgentProcessorForTestConversation.AiAgentTestRequest;

export default class runChatbotAiAssistantCommand extends commandBase {
    constructor(private db: string, private dto: AiAgentTestRequest, private isStreaming: boolean, private streamPropertyPath: string) {
        super();
    }

    execute() {
        const args = {
            streaming: !!this.isStreaming,
            streamPropertyPath: this.streamPropertyPath,
        };

        const relativeUrl = endpoints.databases.aiAgent.aiAgentTest + this.urlEncodeArgs(args);

        return this.fetch({
            relativeUrl,
            db: this.db,
            options: {
                method: "POST",
                body: JSON.stringify(this.dto),
            },
        });
    }
}
