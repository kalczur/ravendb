import "./BackupsHistory.scss";
import { AboutViewHeading } from "components/common/AboutView";
import { LoadError } from "components/common/LoadError";
import { LoadingView } from "components/common/LoadingView";
import { databaseSelectors } from "components/common/shell/databaseSliceSelectors";
import { useServices } from "components/hooks/useServices";
import BackupsHistoryGroupedList from "components/pages/database/tasks/backups/history/partials/BackupsHistoryGroupedList";
import { backupHistoryUtils } from "components/pages/database/tasks/backups/history/utils/backupHistoryUtils";
import { useAppSelector } from "components/store";
import { useMemo } from "react";
import { useAsync } from "react-async-hook";

// TODO: Currently EP does not support pagination, filtering, sorting, multiple nodes and shards

export function BackupsHistory() {
    const databaseName = useAppSelector(databaseSelectors.activeDatabaseName);
    const { tasksService } = useServices();

    const asyncHistory = useAsync(() => tasksService.getPeriodicBackupHistory(databaseName), []);

    const groupedItems = useMemo(() => {
        if (!asyncHistory.result) {
            return [];
        }

        return backupHistoryUtils.mapFromDto(asyncHistory.result.BackupHistory);
    }, [asyncHistory.result]);

    return (
        <div className="content-padding backups-history">
            <AboutViewHeading title="Backups History" icon="backup-history" />
            <div className="flex-grow-1 overflow-auto vstack">
                {asyncHistory.loading && <LoadingView />}
                {asyncHistory.error && (
                    <LoadError error="Unable to load backups history" refresh={asyncHistory.execute} />
                )}
                {asyncHistory.result && <BackupsHistoryGroupedList groupedItems={groupedItems} />}
            </div>
        </div>
    );
}
