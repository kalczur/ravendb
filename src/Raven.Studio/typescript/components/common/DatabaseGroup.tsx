import React, { HTMLAttributes, ReactNode } from "react";

import classNames from "classnames";
import { NodeInfo } from "components/models/databases";
import { Badge, Button, Modal, ModalBody, ModalFooter, ModalHeader } from "reactstrap";
import genUtils from "common/generalUtils";
import assertUnreachable from "components/utils/assertUnreachable";

import "./DatabaseGroup.scss";
import { Icon } from "./Icon";
import IconName from "typings/server/icons";
import { TextColor } from "components/models/common";
import copyToClipboard from "common/copyToClipboard";
import useBoolean from "components/hooks/useBoolean";

interface DatabaseGroupProps extends HTMLAttributes<HTMLDivElement> {
    children?: ReactNode | ReactNode[];
    className?: string;
}

export function DatabaseGroup(props: DatabaseGroupProps) {
    const { children, className } = props;
    return <div className={classNames("dbgroup", className)}>{children}</div>;
}

export function DatabaseGroupList(props: { children?: ReactNode | ReactNode[] }) {
    const { children } = props;
    return <div className="dbgroup-list">{children}</div>;
}

interface DatabaseGroupItemProps extends HTMLAttributes<HTMLDivElement> {
    children?: ReactNode | ReactNode[];
    className?: string;
}

export function DatabaseGroupItem(props: DatabaseGroupItemProps) {
    const { children, className } = props;
    return <div className={classNames("dbgroup-item", className)}>{children}</div>;
}

interface DatabaseGroupNodeProps extends HTMLAttributes<HTMLDivElement> {
    children?: ReactNode | ReactNode[];
    icon?: IconName;
    color?: TextColor;
}

export function DatabaseGroupNode(props: DatabaseGroupNodeProps) {
    const { children, icon, color } = props;
    const nodeIcon = icon ?? "node";
    const nodeColor = color ?? "node";
    return (
        <div className="dbgroup-node">
            <Icon icon={nodeIcon} color={nodeColor} /> {children ? <strong>{children}</strong> : null}
        </div>
    );
}

interface DatabaseGroupTypeProps extends HTMLAttributes<HTMLDivElement> {
    node?: NodeInfo;
    children?: ReactNode | ReactNode[];
}

export function DatabaseGroupType(props: DatabaseGroupTypeProps) {
    const { node, children } = props;

    function nodeBadgeColor(node: NodeInfo) {
        switch (node.lastStatus) {
            case "Ok":
                return "success";
            case "NotResponding":
                return "danger";
            default:
                return "warning";
        }
    }

    function cssIcon(node: NodeInfo): IconName {
        const type = node.type;

        switch (type) {
            case "Member":
                return "dbgroup-member";
            case "Promotable":
                return "dbgroup-promotable";
            case "Rehab":
                return "dbgroup-rehab";
            default:
                assertUnreachable(type);
        }
    }

    function nodeBadgeText(node: NodeInfo) {
        switch (node.lastStatus) {
            case "Ok":
                return "Active";
            case "NotResponding":
                return "Error";
            default:
                return "Catching up";
        }
    }

    return (
        <div className="dbgroup-type">
            <div title={node.type} className="mb-1">
                <Icon icon={cssIcon(node)} /> {node.type}
            </div>
            <div>
                <Badge color={nodeBadgeColor(node)}>
                    {nodeBadgeText(node)}
                    {node.responsibleNode && (
                        <span
                            className="ms-1"
                            title="Database group node that is responsible for caught up of this node"
                        >
                            <Icon icon="node" margin="m-0" />
                            <strong className="text-reset"> {node.responsibleNode}</strong>
                        </span>
                    )}
                </Badge>
            </div>
            {children}
        </div>
    );
}

export function DatabaseGroupActions(props: { children?: ReactNode | ReactNode[] }) {
    const { children } = props;
    return <div className="dbgroup-actions">{children}</div>;
}

interface DatabaseGroupErrorProps extends HTMLAttributes<HTMLDivElement> {
    node: NodeInfo;
}

export function DatabaseGroupError({ node }: DatabaseGroupErrorProps) {
    const { value: isDetailsOpen, toggle: toggleIsDetailsOpen } = useBoolean(false);

    const lastErrorShort = node.lastError ? genUtils.trimMessage(node.lastError) : null;

    if (!lastErrorShort) {
        return null;
    }

    return (
        <div className="dbgroup-error position-relative">
            <div className="text-danger">
                <Icon icon="warning" /> Error
            </div>

            <small className="d-flex flex-column">
                {lastErrorShort}
                <Button
                    color="link"
                    size="sm"
                    className="stretched-link ms-2"
                    title="Click to see error details"
                    onClick={toggleIsDetailsOpen}
                >
                    Error Details <Icon icon="info" margin="m-0" />
                </Button>
                {isDetailsOpen && (
                    <DatabaseGroupErrorDetails nodeTag={node.tag} error={node.lastError} close={toggleIsDetailsOpen} />
                )}
            </small>
            <div></div>
        </div>
    );
}

interface DatabaseGroupErrorDetailsProps {
    nodeTag: string;
    error: string;
    close: () => void;
}

function DatabaseGroupErrorDetails({ nodeTag, error, close }: DatabaseGroupErrorDetailsProps) {
    const copyError = () => {
        copyToClipboard.copy(error, `Error details for Node ${nodeTag} was copied to clipboard`);
    };

    return (
        <Modal isOpen wrapClassName="bs5" centered toggle={close} size="lg">
            <ModalHeader toggle={close}>
                Error details for <Icon icon="node" color="node" />
                <strong>Node {nodeTag}</strong>
            </ModalHeader>
            <ModalBody>
                <pre>{error}</pre>
            </ModalBody>
            <ModalFooter className="hstack gap-1 justify-content-end">
                <Button color="secondary" onClick={close}>
                    Close
                </Button>
                <Button color="primary" onClick={copyError}>
                    <Icon icon="copy-to-clipboard" />
                    Copy to clipboard
                </Button>
            </ModalFooter>
        </Modal>
    );
}
