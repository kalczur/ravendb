import commandBase = require("commands/commandBase");
import endpoints = require("endpoints");
import aiAgentsTypes = require("components/pages/database/aiHub/aiAgents/utils/aiAgentsTypes");

export interface RunAiAgentRequestDto
    extends Omit<Raven.Client.Documents.Operations.AI.Agents.ConversionRequestBody, "UserPrompt"> {
    UserPrompt: string | { type: "text"; text: string }[];
    attachments?: File[];
}

interface AttachmentPutCommandDto {
    Id: string;
    Name: string;
    ContentType: string;
    ChangeVector: string;
    Type: "AttachmentPUT";
    FromEtl: boolean;
}

export default class runAiAgentCommand extends commandBase {
    constructor(
        private db: string,
        private dto: RunAiAgentRequestDto,
        private agentId: string,
        private conversationId: string,
        private changeVector: string
    ) {
        super();
    }

    execute(): JQueryPromise<aiAgentsTypes.AiAgentRunResult> {
        const args = {
            agentId: this.agentId,
            conversationId: this.conversationId,
            changeVector: this.changeVector,
        };

        const url = endpoints.databases.aiAgent.aiAgent + this.urlEncodeArgs(args);
        const requestPayload = this.createRequestPayload();
        const requestOptions = this.createRequestOptions();

        return this.post(url, requestPayload, this.db, requestOptions).fail((response: JQueryXHR) =>
            this.reportError("Failed to run AI agent", response.responseText, response.statusText)
        );
    }

    private createRequestPayload(): string | FormData {
        if (this.dto.attachments?.length > 0) {
            return this.createMultipartPayload(this.dto.attachments);
        }

        return JSON.stringify(this.createRequestBody());
    }

    private createRequestOptions(): JQueryAjaxSettings {
        if (this.dto.attachments?.length > 0) {
            return {
                processData: false,
                contentType: false,
                cache: false,
                dataType: "json",
            };
        }

        return undefined;
    }

    private createMultipartPayload(files: File[]): FormData {
        const formData = new FormData();
        const attachmentCommands = this.createAttachmentCommands(files);

        formData.append(
            "request",
            new Blob([JSON.stringify(this.createRequestBody())], {
                type: "application/json",
            })
        );

        formData.append(
            "commands",
            new Blob(
                [
                    JSON.stringify({
                        Commands: attachmentCommands,
                    }),
                ],
                {
                    type: "application/json",
                }
            )
        );

        files.forEach((file) => {
            formData.append("attachment", file, file.name);
        });

        return formData;
    }

    private createAttachmentCommands(files: File[]): AttachmentPutCommandDto[] {
        return files.map((file) => ({
            Id: "__this__",
            Name: file.name,
            ContentType: file.type || "application/octet-stream",
            ChangeVector: "",
            Type: "AttachmentPUT",
            FromEtl: false,
        }));
    }

    private createRequestBody(): Omit<RunAiAgentRequestDto, "attachments"> {
        const dto = { ...this.dto };
        delete dto.attachments;
        return dto;
    }
}
