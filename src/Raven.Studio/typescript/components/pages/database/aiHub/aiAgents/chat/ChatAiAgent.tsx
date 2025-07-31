import { databaseSelectors } from "components/common/shell/databaseSliceSelectors";
import { useAppUrls } from "components/hooks/useAppUrls";
import { useAppDispatch, useAppSelector } from "components/store";
import router from "plugins/router";
import { chatAiAgentActions, chatAiAgentSelectors } from "./store/chatAiAgentSlice";
import ButtonWithSpinner from "components/common/ButtonWithSpinner";
import { useEffect, useRef } from "react";
import AiAgentMessages from "../partials/AiAgentMessages";
import { Icon } from "components/common/Icon";
import ChatAiAgentInfoHub from "./ChatAiAgentInfoHub";
import { useForm, useWatch } from "react-hook-form";
import { ChatAiAgentFormData, chatAiAgentYupResolver } from "./utils/chatAiAgentValidation";
import AiAgentParametersField from "../partials/AiAgentParametersField";
import { FormInput } from "components/common/Form";
import { tryHandleSubmit } from "components/utils/common";
import { AiAgentToolCall } from "../utils/aiAgentsTypes";
import SizeGetter from "components/common/SizeGetter";
import AceEditor from "components/common/ace/AceEditor";
import { Switch } from "components/common/Checkbox";
import Spinner from "react-bootstrap/Spinner";
import Button from "react-bootstrap/Button";
import classNames from "classnames";

interface QueryParams {
    agentId: string;
    conversationId: string;
    isHistory: boolean;
}

export default function ChatAiAgent({ queryParams }: ReactQueryParamsProps<QueryParams>) {
    const dispatch = useAppDispatch();
    const messagesPanelRef = useRef<HTMLDivElement>(null);
    const { appUrl } = useAppUrls();

    const databaseName = useAppSelector(databaseSelectors.activeDatabaseName);
    const messages = useAppSelector(chatAiAgentSelectors.messages);
    const config = useAppSelector(chatAiAgentSelectors.config);
    const isRawData = useAppSelector(chatAiAgentSelectors.isRawData);
    const document = useAppSelector(chatAiAgentSelectors.document);
    const runChatState = useAppSelector(chatAiAgentSelectors.runChatState);
    const isLoading = useAppSelector(chatAiAgentSelectors.isLoading);
    const isWaitingForActionToolSubmit = useAppSelector(chatAiAgentSelectors.isWaitingForActionToolSubmit);
    const hasScroll = useAppSelector(chatAiAgentSelectors.hasScroll);

    // Get data on load
    useEffect(() => {
        const getData = async () => {
            dispatch(chatAiAgentActions.conversationIdSet(queryParams?.conversationId));

            const config = await dispatch(
                chatAiAgentActions.getConfig({ databaseName, id: queryParams?.agentId })
            ).unwrap();

            setValue(
                "parameters",
                config.Parameters.map((x) => ({ name: x.Name, value: "" }))
            );

            if (queryParams?.conversationId) {
                dispatch(chatAiAgentActions.getDocument({ databaseName, id: queryParams?.conversationId }));
            }
        };

        getData();

        return () => {
            dispatch(chatAiAgentActions.reset());
        };
    }, []);

    // Scroll to the bottom of the test panel when new messages are added and set hasScroll
    useEffect(() => {
        dispatch(
            chatAiAgentActions.hasScrollSet(
                messagesPanelRef.current?.scrollHeight > messagesPanelRef.current?.clientHeight
            )
        );

        if (messagesPanelRef.current) {
            messagesPanelRef.current.scrollTo({
                top: messagesPanelRef.current.scrollHeight,
                behavior: "smooth",
            });
        }
    }, [messages.length]);

    const areParametersRequired = !window.location.href.includes("conversationId");

    const { control, handleSubmit, setValue } = useForm<ChatAiAgentFormData>({
        resolver: chatAiAgentYupResolver,
        defaultValues: {
            prompt: "",
            parameters: [],
        },
        context: {
            areParametersRequired,
        },
    });

    const formValues = useWatch({
        control,
    });

    const runChat = async (toolCallParameters?: AiAgentToolCall[]) => {
        await dispatch(
            chatAiAgentActions.runChat({
                databaseName,
                prompt: formValues.prompt,
                initialParameters: formValues.parameters,
                toolCallParameters,
            })
        ).unwrap();

        setValue("prompt", "");
    };

    const handleSend = async () => {
        return tryHandleSubmit(async () => {
            runChat();
        });
    };

    const handleNewChat = () => {
        dispatch(chatAiAgentActions.conversationIdSet(null));
        dispatch(chatAiAgentActions.messagesSet([]));
        dispatch(chatAiAgentActions.documentSet(null));
        dispatch(chatAiAgentActions.isWaitingForActionToolSubmitSet(false));
        setValue("prompt", "");
    };

    if (!queryParams?.agentId) {
        router.navigate(appUrl.forAiAgents(databaseName));
        return null;
    }

    return (
        <div className="h-100 vstack">
            <div className="hstack justify-content-between align-items-start px-3 pt-3">
                <h2 className="text-truncate w-50 mb-3" title={config.data?.Name}>
                    <Icon icon="ai-agents" /> {config.data?.Name ?? "AI Agent"}{" "}
                </h2>
                <ChatAiAgentInfoHub />
            </div>
            <div className="hstack mb-2 justify-content-between px-3">
                <div className="hstack gap-2">
                    <Button
                        variant="primary"
                        className="rounded-pill"
                        onClick={handleNewChat}
                        title="Click to start a new chat with the LLM using this agent"
                    >
                        <Icon icon="plus" /> New chat
                    </Button>
                    <a className="btn btn-secondary rounded-pill" href={appUrl.forAiAgents(databaseName)}>
                        <Icon icon="cancel" /> Cancel
                    </a>
                </div>
                <Switch
                    color="primary"
                    selected={isRawData}
                    toggleSelection={() => dispatch(chatAiAgentActions.isRawDataSet(!isRawData))}
                    title="Toggle on to view the chat communication in raw data format"
                >
                    Raw data
                </Switch>
            </div>

            <div
                className={classNames("flex-grow-1 hstack justify-content-center", { "pb-3": queryParams?.isHistory })}
            >
                <SizeGetter
                    isHeighRequired
                    render={({ height }) => (
                        <form className="vstack overflow-auto" onSubmit={handleSubmit(handleSend)} style={{ height }}>
                            <div
                                ref={messagesPanelRef}
                                className={classNames(
                                    "overflow-auto ps-2 flex-grow-1 position-relative d-flex justify-content-center",
                                    { "pe-2": !hasScroll }
                                )}
                                style={{ height: height - promptHeightInPx }}
                            >
                                <div className="w-100" style={{ maxWidth: "800px" }}>
                                    {messages.length === 0 && (
                                        <div className="h-100 vstack justify-content-center">
                                            <AiAgentParametersField
                                                control={control}
                                                name="parameters"
                                                value={formValues.parameters}
                                            />
                                        </div>
                                    )}
                                    {!isRawData && messages.length > 0 && (
                                        <AiAgentMessages
                                            messages={messages}
                                            toolQueries={config.data?.Queries}
                                            toolActions={config.data?.Actions}
                                            handleSaveParameters={runChat}
                                            setIsWaitingForActionToolSubmit={(value: boolean) =>
                                                dispatch(chatAiAgentActions.isWaitingForActionToolSubmitSet(value))
                                            }
                                        />
                                    )}
                                    {isRawData && document.data && (
                                        <AceEditor
                                            mode="json"
                                            value={JSON.stringify(document.data, null, 2)}
                                            height={`${height - promptHeightInPx}px`}
                                            readOnly
                                        />
                                    )}
                                    {isLoading && (
                                        <div className="position-absolute top-50 start-50 translate-middle">
                                            <Spinner animation="border" />
                                        </div>
                                    )}
                                </div>
                            </div>
                            {!queryParams?.isHistory && (
                                <div className="d-flex justify-content-center mt-3 px-3 pb-3">
                                    <div className="w-100" style={{ maxWidth: "800px" }}>
                                        <div className="position-relative">
                                            <FormInput
                                                type="textarea"
                                                as="textarea"
                                                control={control}
                                                name="prompt"
                                                placeholder="Ask the agent anything"
                                                className="rounded-2"
                                                rows={3}
                                                onKeyDown={(e) => {
                                                    if (e.key === "Enter" && !e.shiftKey) {
                                                        e.preventDefault();
                                                        handleSubmit(handleSend)();
                                                    }
                                                }}
                                                disabled={isLoading || isWaitingForActionToolSubmit}
                                            />
                                            {formValues.prompt && (
                                                <ButtonWithSpinner
                                                    type="submit"
                                                    variant="secondary"
                                                    icon="arrow-up"
                                                    isSpinning={runChatState === "loading"}
                                                    disabled={isLoading || isWaitingForActionToolSubmit}
                                                    className="position-absolute rounded-pill"
                                                    style={{ right: "10px", bottom: "10px", zIndex: 5 }}
                                                />
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </form>
                    )}
                />
            </div>
        </div>
    );
}

const promptHeightInPx = 150;
