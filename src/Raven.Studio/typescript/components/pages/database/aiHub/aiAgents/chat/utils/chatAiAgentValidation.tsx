import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";

const schema = yup.object({
    prompts: yup
        .array()
        .of(
            yup.object({
                text: yup.string().nullable(),
            })
        )
        .test("prompt-or-attachment-required", function (prompts) {
            const attachments = this.parent.attachments as File[];
            const hasAttachments = attachments?.length > 0;
            const hasPrompt = prompts?.some((prompt) => prompt?.text?.trim());

            if (hasPrompt || hasAttachments) {
                return true;
            }

            return this.createError({
                message: prompts?.length > 1 ? "Prompts are required" : "Prompt is required",
            });
        }),
    attachments: yup.array().of(yup.mixed<File>().required()).default([]),
    parameters: yup.array().of(
        yup.object({
            name: yup.string().nullable(),
            value: yup
                .string()
                .nullable()
                .when("$areParametersRequired", {
                    is: true,
                    then: (schema) => schema.required(),
                }),
        })
    ),

    // Persistence
    isEnableDocumentExpiration: yup.boolean(),
    isDocumentExpireInCustomizeEnabled: yup.boolean(),
    persistenceConversationIdPrefix: yup
        .string()
        .nullable()
        .when("$areParametersRequired", {
            is: true,
            then: (schema) => schema.required(),
        }),
    persistenceExpiresInSeconds: yup.number().nullable().positive().integer(),
});

export const chatAiAgentYupResolver = yupResolver(schema);
export type ChatAiAgentFormData = yup.InferType<typeof schema>;
