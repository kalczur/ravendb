import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import { RootState } from "components/store";
import { AiAgentMessage, AiAgentRunResult, AiAgentToolCall } from "../../utils/aiAgentsTypes";
import { services } from "components/hooks/useServices";
import { loadStatus } from "components/models/common";
import { TestAiAgentFormData } from "../utils/editAiAgentValidation";
import { aiAgentsUtils } from "../../utils/aiAgentsUtils";

interface EditAiAgentState {
    isTestOpen: boolean;
    isTestPinned: boolean;
    isRawData: boolean;
    testMessages: AiAgentMessage[];
    testToolParameters: AiAgentToolCall[];
    testDocument: documentDto;
    runTestState: loadStatus;
    isWaitingForActionToolSubmit: boolean;
}

const initialState: EditAiAgentState = {
    isTestOpen: false,
    isTestPinned: false,
    isRawData: false,
    testMessages: [],
    testToolParameters: [],
    testDocument: null,
    runTestState: "idle",
    isWaitingForActionToolSubmit: false,
};

export const editAiAgentSlice = createSlice({
    name: "editAiAgent",
    initialState,
    reducers: {
        isTestOpenSet: (state, action: PayloadAction<boolean>) => {
            state.isTestOpen = action.payload;
        },
        isTestPinnedSet: (state, action: PayloadAction<boolean>) => {
            state.isTestPinned = action.payload;
        },
        isRawDataSet: (state, action: PayloadAction<boolean>) => {
            state.isRawData = action.payload;
        },
        testMessagesSet: (state, action: PayloadAction<AiAgentMessage[]>) => {
            state.testMessages = action.payload;
        },
        testMessageAdded: (state, action: PayloadAction<AiAgentMessage>) => {
            state.testMessages.push(action.payload);
        },
        testMessageUpdated: (state, action: PayloadAction<{ id: string; content: string }>) => {
            const message = state.testMessages.find((x) => x.id === action.payload.id);
            if (message) {
                message.content = action.payload.content;
            }
        },
        testToolParametersSet: (state, action: PayloadAction<AiAgentToolCall[]>) => {
            state.testToolParameters = action.payload;
        },
        testDocumentSet: (state, action: PayloadAction<any>) => {
            state.testDocument = action.payload;
        },
        isWaitingForActionToolSubmitSet: (state, action: PayloadAction<boolean>) => {
            state.isWaitingForActionToolSubmit = action.payload;
        },
        reset: () => initialState,
    },
    extraReducers: (builder) => {
        builder.addCase(runTest.pending, (state) => {
            state.runTestState = "loading";
        });
        builder.addCase(runTest.rejected, (state) => {
            state.runTestState = "failure";
        });
        builder.addCase(runTest.fulfilled, (state, action) => {
            state.runTestState = "success";
            state.testDocument = action.payload.result.Document;

            const messages = action.payload.result.Document.Messages.map((x) => aiAgentsUtils.mapMessageFromDoc(x));

            state.testMessages = aiAgentsUtils.mergeToolResults(messages, action.payload.allQueriesNames);
        });
    },
});

const getIsDocumentExpirationEnabled = createAsyncThunk(
    editAiAgentSlice.name + "/getIsDocumentExpirationEnabled",
    async (databaseName: string): Promise<boolean> => {
        const result = await services.databasesService.getExpirationConfiguration(databaseName);
        if (!result) {
            return false;
        }
        return !result.Disabled;
    }
);

// TODO
const runTest = createAsyncThunk(
    editAiAgentSlice.name + "/runTest",
    async (
        payload: {
            databaseName: string;
            configuration: Raven.Client.Documents.Operations.AI.Agents.AiAgentConfiguration;
            testFormValues: TestAiAgentFormData;
            toolCallParameters?: AiAgentToolCall[];
            allQueriesNames: string[];
        },
        { getState, dispatch }
    ): Promise<{ result: AiAgentRunResult; allQueriesNames: string[] }> => {
        const { databaseName, configuration, testFormValues, toolCallParameters, allQueriesNames } = payload;

        const state = getState() as RootState;
        const testDocument = state.editAiAgent.testDocument;

        const response = await services.aiAgentService.testAiAgent(
            databaseName,
            {
                Configuration: configuration,
                UserPrompt: toolCallParameters?.length > 0 ? null : testFormValues.prompt,
                ActionResponses: toolCallParameters?.map((x) => ({
                    ToolId: x.id,
                    Content: x.arguments,
                })),
                Document: testDocument,
                RequestBody: undefined,
                CreationOptions: {
                    Parameters: Object.fromEntries(testFormValues.parameters.map((item) => [item.name, item.value])),
                },
            },
            true,
            "Answer"
        );

        const streamContentObject = {
            Answer: "",
        };

        const answerId = _.uniqueId();

        dispatch(
            editAiAgentActions.testMessageAdded({
                id: answerId,
                role: "assistant",
                content: JSON.stringify(streamContentObject),
                state: "success",
            })
        );

        const reader = response.body.getReader();
        const decoder = new TextDecoder("utf-8");

        // eslint-disable-next-line no-constant-condition
        while (true) {
            const { done, value } = await reader.read();
            console.log("kalczur done", done);
            if (done) {
                break;
            }

            const responseString = decoder.decode(value, { stream: true });
            const responseLines = responseString.split("\n");

            console.log("kalczur responseString", responseString);

            for (const line of responseLines) {
                console.log("kalczur line", line);
                if (line.startsWith('"')) {
                    console.log("kalczur is stream");
                    streamContentObject.Answer += line;
                    dispatch(
                        editAiAgentActions.testMessageUpdated({
                            id: answerId,
                            content: JSON.stringify(streamContentObject),
                        })
                    );
                } else if (line.startsWith("{")) {
                    console.log("kalczur is end");
                    return { result: JSON.parse(line), allQueriesNames };
                }
            }
        }

        return { result: null, allQueriesNames };
    }
);

export const editAiAgentActions = {
    ...editAiAgentSlice.actions,
    getIsDocumentExpirationEnabled,
    runTest,
};

export const editAiAgentSelectors = {
    isTestOpen: (state: RootState) => state.editAiAgent.isTestOpen,
    isTestPinned: (state: RootState) => state.editAiAgent.isTestPinned,
    isRawData: (state: RootState) => state.editAiAgent.isRawData,
    testMessages: (state: RootState) => state.editAiAgent.testMessages,
    testToolParameters: (state: RootState) => state.editAiAgent.testToolParameters,
    testDocument: (state: RootState) => state.editAiAgent.testDocument,
    runTestState: (state: RootState) => state.editAiAgent.runTestState,
    isWaitingForActionToolSubmit: (state: RootState) => state.editAiAgent.isWaitingForActionToolSubmit,
};
