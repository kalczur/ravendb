import React, { useCallback } from "react";
import { Button, Form, FormGroup, Label, Modal, ModalBody, ModalFooter, ModalHeader } from "reactstrap";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import {
    ReorderNodes,
    ReorderNodesControls,
} from "components/pages/resources/manageDatabaseGroup/partials/ReorderNodes";
import { OrchestratorInfoComponent } from "components/pages/resources/manageDatabaseGroup/partials/NodeInfoComponent";
import { DeletionInProgress } from "components/pages/resources/manageDatabaseGroup/partials/DeletionInProgress";
import { useEventsCollector } from "hooks/useEventsCollector";
import { useServices } from "hooks/useServices";
import classNames from "classnames";
import {
    RichPanel,
    RichPanelActions,
    RichPanelHeader,
    RichPanelInfo,
    RichPanelName,
} from "components/common/RichPanel";
import {
    DatabaseGroup,
    DatabaseGroupActions,
    DatabaseGroupItem,
    DatabaseGroupList,
    DatabaseGroupNode,
} from "components/common/DatabaseGroup";
import { useGroup } from "components/pages/resources/manageDatabaseGroup/partials/useGroup";
import { Icon } from "components/common/Icon";
import useConfirm from "components/common/ConfirmDialog";
import { databaseSelectors } from "components/common/shell/databaseSliceSelectors";
import { useAppSelector } from "components/store";
import * as yup from "yup";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { FormSelect } from "components/common/Form";
import useBoolean from "components/hooks/useBoolean";
import { clusterSelectors } from "components/common/shell/clusterSlice";
import { OptionWithIcon, SelectOptionWithIcon, SingleValueWithIcon } from "components/common/select/Select";
import { tryHandleSubmit } from "components/utils/common";
import ButtonWithSpinner from "components/common/ButtonWithSpinner";

export function OrchestratorsGroup() {
    const db = useAppSelector(databaseSelectors.activeDatabase);

    const {
        fixOrder,
        setNewOrder,
        newOrder,
        setFixOrder,
        addNodeEnabled,
        canSort,
        sortableMode,
        enableReorder,
        exitReorder,
    } = useGroup(db.nodes, db.isFixOrder);

    const { databasesService } = useServices();
    const { reportEvent } = useEventsCollector();
    const confirm = useConfirm();
    const { value: isNewNodeConfirmOpen, toggle: toggleIsNewNodeConfirmOpen } = useBoolean(false);

    const saveNewOrder = useCallback(
        async (tagsOrder: string[], fixOrder: boolean) => {
            reportEvent("db-group", "save-order");
            await databasesService.reorderNodesInGroup(db.name, tagsOrder, fixOrder);
            exitReorder();
        },
        [databasesService, db.name, reportEvent, exitReorder]
    );

    const deleteOrchestratorFromGroup = useCallback(
        async (nodeTag: string) => {
            const isConfirmed = await confirm({
                icon: "trash",
                title: (
                    <span>
                        Do you want to delete orchestrator from node <strong>{nodeTag}</strong>?
                    </span>
                ),
                confirmText: "Delete",
                actionColor: "danger",
            });

            if (isConfirmed) {
                await databasesService.deleteOrchestratorFromNode(db.name, nodeTag);
            }
        },
        [confirm, databasesService, db.name]
    );

    const onSave = async () => {
        await saveNewOrder(
            newOrder.map((x) => x.tag),
            fixOrder
        );
    };

    return (
        <RichPanel className="mt-3">
            <RichPanelHeader className="bg-faded-orchestrator">
                <RichPanelInfo>
                    <RichPanelName className="text-orchestrator">
                        <Icon icon="orchestrator" /> Orchestrators
                    </RichPanelName>
                </RichPanelInfo>
                <RichPanelActions>
                    <ReorderNodesControls
                        enableReorder={enableReorder}
                        canSort={canSort}
                        sortableMode={sortableMode}
                        cancelReorder={exitReorder}
                        onSave={onSave}
                    />
                </RichPanelActions>
            </RichPanelHeader>

            {sortableMode ? (
                <DndProvider backend={HTML5Backend}>
                    <ReorderNodes
                        fixOrder={fixOrder}
                        setFixOrder={setFixOrder}
                        newOrder={newOrder}
                        setNewOrder={setNewOrder}
                    />
                </DndProvider>
            ) : (
                <React.Fragment>
                    <DatabaseGroup>
                        <DatabaseGroupList>
                            <DatabaseGroupItem
                                className={classNames("item-new", "position-relative", {
                                    "item-disabled": !addNodeEnabled,
                                })}
                            >
                                <DatabaseGroupNode icon="node-add" color="success" />
                                <DatabaseGroupActions>
                                    <Button
                                        size="xs"
                                        color="success"
                                        outline
                                        className="rounded-pill stretched-link"
                                        disabled={!addNodeEnabled}
                                        onClick={toggleIsNewNodeConfirmOpen}
                                    >
                                        <Icon icon="plus" />
                                        Add node
                                    </Button>
                                    {isNewNodeConfirmOpen && <AddNodeConfirmation close={toggleIsNewNodeConfirmOpen} />}
                                </DatabaseGroupActions>
                            </DatabaseGroupItem>
                            {db.nodes.map((node) => (
                                <OrchestratorInfoComponent
                                    key={node.tag}
                                    node={node}
                                    canDelete={db.nodes.length > 1}
                                    deleteFromGroup={deleteOrchestratorFromGroup}
                                />
                            ))}

                            {db.deletionInProgress.map((deleting) => (
                                <DeletionInProgress key={deleting} nodeTag={deleting} />
                            ))}
                        </DatabaseGroupList>
                    </DatabaseGroup>
                </React.Fragment>
            )}
        </RichPanel>
    );
}

function AddNodeConfirmation({ close }: { close: () => void }) {
    const { control, formState, handleSubmit } = useForm<NewNodeFormData>({
        resolver: yupResolver(schema),
        defaultValues: {
            nodeTag: "",
        },
    });

    const db = useAppSelector(databaseSelectors.activeDatabase);
    const allClusterNodeTags = useAppSelector(clusterSelectors.allNodeTags);
    const usedNodeTags = db.nodes.map((x) => x.tag);

    const availableNodeTagOptions: SelectOptionWithIcon[] = allClusterNodeTags
        .filter((x) => !usedNodeTags.includes(x))
        .map((x) => ({ label: x, value: x, icon: "node", iconColor: "node" }));

    const { databasesService } = useServices();

    const addNode = async (data: NewNodeFormData) => {
        return tryHandleSubmit(async () => {
            const nodeTag = data.nodeTag;
            await databasesService.addOrchestratorToDatabaseGroup(db.name, nodeTag);
            close();
        });
    };

    return (
        <Modal isOpen wrapClassName="bs5" centered toggle={close}>
            <Form onSubmit={handleSubmit(addNode)}>
                <ModalHeader className="pb-0" toggle={close}>
                    Add a new orchestrator to the database group
                </ModalHeader>
                <ModalBody>
                    <FormGroup>
                        <Label>Node Tag</Label>
                        <FormSelect
                            control={control}
                            name="nodeTag"
                            placeholder="Select node tag"
                            options={availableNodeTagOptions}
                            components={{
                                SingleValue: SingleValueWithIcon,
                                Option: OptionWithIcon,
                            }}
                        />
                    </FormGroup>
                </ModalBody>
                <ModalFooter className="hstack gap-1 justify-content-end">
                    <Button type="button" onClick={close}>
                        Cancel
                    </Button>
                    <ButtonWithSpinner color="primary" type="submit" icon="plus" isSpinning={formState.isSubmitting}>
                        Add Node
                    </ButtonWithSpinner>
                </ModalFooter>
            </Form>
        </Modal>
    );
}

const schema = yup.object({
    nodeTag: yup.string().required(),
});

type NewNodeFormData = yup.InferType<typeof schema>;
