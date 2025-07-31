import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";

const schema = yup.object({
    prompt: yup.string().nullable().required(),
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
});

export const chatAiAgentYupResolver = yupResolver(schema);
export type ChatAiAgentFormData = yup.InferType<typeof schema>;
