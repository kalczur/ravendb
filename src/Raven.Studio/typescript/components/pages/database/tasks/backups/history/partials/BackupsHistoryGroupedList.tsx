import classNames from "classnames";
import { EmptySet } from "components/common/EmptySet";
import Badge from "react-bootstrap/Badge";
import { Icon } from "components/common/Icon";
import Button from "react-bootstrap/Button";
import moment from "moment";
import genUtils from "common/generalUtils";
import useBoolean from "components/hooks/useBoolean";
import { databaseSelectors } from "components/common/shell/databaseSliceSelectors";
import { useAppUrls } from "components/hooks/useAppUrls";
import { useAppSelector } from "components/store";
import {
    BackupHistoryItemBase,
    BackupHistoryItemFull,
} from "components/pages/database/tasks/backups/history/utils/backupHistoryUtils";
import Collapse from "react-bootstrap/Collapse";

export default function BackupsHistoryGroupedList(props: { groupedItems: BackupHistoryItemFull[] }) {
    const { groupedItems } = props;

    if (!groupedItems.length) {
        return <EmptySet>No backups history available</EmptySet>;
    }

    return (
        <div>
            <div className="backups-history__header rounded-2 px-2 py-1 border border-secondary panel-bg-2 gap-1">
                <div>Task name</div>
                <div>Node</div>
                <div>Type</div>
                <div>Kind</div>
                <div>
                    Date <small>(UTC)</small>
                </div>
                <div>Duration</div>
                <div>Status</div>
                <div></div> {/* Preview column */}
            </div>

            <div className="mt-2 vstack gap-2">
                {groupedItems.map((item) => (
                    <FullBackup key={item.createdAt} item={item} />
                ))}
            </div>
        </div>
    );
}

function FullBackup(props: { item: BackupHistoryItemFull }) {
    const { item } = props;

    const { value: isExpanded, toggle: toggleIsExpanded } = useBoolean(false);

    const hasIncremental = item.incrementalBackupsCount > 0;

    return (
        <div className="rounded-2 border border-secondary">
            <div
                className={classNames(
                    "backups-history__item-header gap-1 panel-bg-1 p-2",
                    hasIncremental ? "rounded-top-2" : "rounded-2"
                )}
            >
                <div className="hstack text-truncate">
                    {hasIncremental && (
                        <Button
                            variant="link"
                            onClick={toggleIsExpanded}
                            className="link-muted p-0"
                            title={isExpanded ? "Collapse task" : "Expand task"}
                            size="xs"
                        >
                            <Icon icon={isExpanded ? "chevron-down" : "chevron-right"} />
                        </Button>
                    )}
                    <TaskLink taskId={item.taskId} taskName={item.taskName} />
                </div>
                <NodeCell nodeTag={item.nodeTag} />
                <div>{item.backupType}</div>
                <div>{item.backupKind}</div>
                <DateCell date={item.createdAt} />
                <DurationCell durationInMs={item.durationInMs} />
                <StatusCell error={item.error} />
                <Button variant="secondary" size="xs">
                    <Icon icon="preview" margin="m-0" />
                </Button>
            </div>
            {hasIncremental && (
                <div className="rounded-bottom-2 px-2 border-top border-secondary panel-bg-2">
                    <Collapse in={!isExpanded}>
                        <div>
                            <FullBackupDetailsCollapsed item={item} />
                        </div>
                    </Collapse>
                    <Collapse in={isExpanded} mountOnEnter unmountOnExit>
                        <div>
                            <FullBackupDetailsExpanded item={item} />
                        </div>
                    </Collapse>
                </div>
            )}
        </div>
    );
}

function FullBackupDetailsCollapsed(props: { item: BackupHistoryItemFull }) {
    const { item } = props;

    const succeededCount = item.incrementalBackups.filter((inc) => !inc.error).length;
    const failedCount = item.incrementalBackupsCount - succeededCount;

    const hasAllFailed = succeededCount === 0;
    const hasSomeFailed = failedCount > 0;

    return (
        <div className="fs-6 py-1">
            {item.incrementalBackupsCount} incremental {item.incrementalBackupsCount > 1 ? "backups" : "backup"} (
            {succeededCount} succeeded,{" "}
            <span
                className={classNames({
                    "text-danger": hasAllFailed,
                    "text-warning": hasSomeFailed,
                })}
            >
                {failedCount} failed
            </span>
            )
        </div>
    );
}

function FullBackupDetailsExpanded(props: { item: BackupHistoryItemFull }) {
    const { item } = props;

    return item.incrementalBackups.map((inc, idx) => (
        <>
            <IncrementalBackup key={inc.createdAt} item={inc} />
            {idx < item.incrementalBackups.length - 1 && <hr className="m-0" />}
        </>
    ));
}

function IncrementalBackup(props: { item: BackupHistoryItemBase }) {
    const { item } = props;

    return (
        <div className="rounded-2">
            <div className="backups-history__item-header gap-1 rounded-2 panel-bg-2 py-2">
                <small className="text-truncate">
                    <Icon icon="arrow-corner-up-right" margin="mx-1" color="secondary" />
                    <TaskLink taskId={item.taskId} taskName={item.taskName} />
                </small>
                <NodeCell nodeTag={item.nodeTag} />
                <div>{item.backupType}</div>
                <div>{item.backupKind}</div>
                <DateCell date={item.createdAt} />
                <DurationCell durationInMs={item.durationInMs} />
                <StatusCell error={item.error} />
                <Button variant="secondary" size="xs">
                    <Icon icon="preview" margin="m-0" />
                </Button>
            </div>
        </div>
    );
}

function TaskLink(props: { taskId: number; taskName: string; className?: string }) {
    const databaseName = useAppSelector(databaseSelectors.activeDatabaseName);
    const { appUrl } = useAppUrls();
    const taskUrl = appUrl.forEditPeriodicBackupTask(databaseName, "Backups", false, props.taskId);

    return (
        <a href={taskUrl} target="_blank" className={props.className}>
            {props.taskName}
        </a>
    );
}

function NodeCell(props: { nodeTag: string }) {
    return (
        <div className="hstack">
            <Icon icon="node" color="node" />
            {props.nodeTag}
        </div>
    );
}

function DateCell(props: { date: string }) {
    return <span>{moment.utc(props.date).format("YYYY-MM-DD HH:mm")}</span>;
}

function DurationCell(props: { durationInMs: number }) {
    return <span>{genUtils.formatDuration(moment.duration(props.durationInMs))}</span>;
}

function StatusCell(props: { error: string }) {
    if (props.error) {
        return (
            <Badge bg="danger" pill className="w-fit-content">
                <Icon icon="cancel" />
                Failed
            </Badge>
        );
    }

    return (
        <Badge bg="success" pill className="w-fit-content">
            <Icon icon="check" />
            Completed
        </Badge>
    );
}
