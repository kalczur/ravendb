import "./EditAiAgent.scss";
import { AboutViewHeading } from "components/common/AboutView";
import { FormProvider } from "react-hook-form";
import EditAiAgentFooter from "./partials/EditAiAgentFooter";
import EditAiAgentTestPanel from "./partials/EditAiAgentTestPanel";
import { useAppSelector } from "components/store";
import { editAiAgentSelectors } from "./store/editAiAgentSlice";
import EditAiAgentInfoHub from "./partials/EditAiAgentInfoHub";
import EditAiAgentBasicSection from "./partials/EditAiAgentBasicSection";
import EditAiAgentParametersSection from "./partials/EditAiAgentParametersSection";
import EditAiAgentToolsSection from "./partials/EditAiAgentToolsSection";
import EditAiAgentTrimmingSection from "./partials/EditAiAgentTrimmingSection";
import { LoadingView } from "components/common/LoadingView";
import { LoadError } from "components/common/LoadError";
import useEditAiAgent from "./hooks/useEditAiAgent";
import SplitView from "components/common/SplitView";

interface QueryParams {
    id: string;
    isClone?: boolean;
}

export default function EditAiAgent({ queryParams }: ReactQueryParamsProps<QueryParams>) {
    const aiAgentEditor = useEditAiAgent(queryParams);
    const isTestOpen = useAppSelector(editAiAgentSelectors.isTestOpen);
    const isTestPinned = useAppSelector(editAiAgentSelectors.isTestPinned);

    return (
        <FormProvider {...aiAgentEditor.editForm}>
            <form onSubmit={aiAgentEditor.handleSubmit} className="h-100 edit-ai-agent">
                <SplitView isPanelOpen={isTestOpen} isPanelPinned={isTestPinned} minPanelWidth={300}>
                    <SplitView.Body className="vstack">
                        <div className="hstack justify-content-between align-items-start p-4">
                            <AboutViewHeading
                                title={`${aiAgentEditor.isEditAiAgent ? "Edit" : "Create"} AI Agent`}
                                icon="ai-agents"
                                marginBottom={0}
                            />
                            <EditAiAgentInfoHub />
                        </div>
                        <div className="px-4 pb-4 flex-grow-1 overflow-scroll h-100">
                            {aiAgentEditor.asyncGetEditDefaultValues.loading && <LoadingView />}
                            {aiAgentEditor.asyncGetEditDefaultValues.error && (
                                <LoadError
                                    error="Unable to load configuration"
                                    refresh={aiAgentEditor.reloadEditForm}
                                />
                            )}
                            {aiAgentEditor.asyncGetEditDefaultValues.result && (
                                <>
                                    <EditAiAgentBasicSection isEditAiAgent={aiAgentEditor.isEditAiAgent} />
                                    <EditAiAgentParametersSection />
                                    <EditAiAgentToolsSection />
                                    <EditAiAgentTrimmingSection />
                                </>
                            )}
                        </div>
                        <div className="p-3 border-top border-secondary">
                            <EditAiAgentFooter testForm={aiAgentEditor.testForm} editForm={aiAgentEditor.editForm} />
                        </div>
                    </SplitView.Body>
                    <SplitView.Panel className="vstack panel-bg-1">
                        <EditAiAgentTestPanel
                            testForm={aiAgentEditor.testForm}
                            editForm={aiAgentEditor.editForm}
                            allQueriesNames={aiAgentEditor.allQueriesNames}
                        />
                    </SplitView.Panel>
                </SplitView>
            </form>
        </FormProvider>
    );
}
