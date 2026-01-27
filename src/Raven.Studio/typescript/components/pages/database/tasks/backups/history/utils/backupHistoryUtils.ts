type BackupHistory = Raven.Server.Documents.PeriodicBackup.BackupHistory.BackupHistory;

export interface BackupHistoryItemBase {
    taskId: number;
    taskName: string;
    createdAt: string;
    durationInMs: number;
    error: string;
    backupType: Raven.Client.Documents.Operations.Backups.BackupType;
    backupKind: Raven.Server.Documents.PeriodicBackup.BackupKind;
    nodeTag: string;
    lastFullBackup: string;
}

export interface BackupHistoryItemFull extends BackupHistoryItemBase {
    incrementalBackupsCount: number;
    incrementalBackups: BackupHistoryItemBase[];
}

function mapFromDto(dto: BackupHistory): BackupHistoryItemFull[] {
    return dto.Groups.map((group) => ({
        taskId: group.TaskId,
        taskName: group.TaskName,
        createdAt: group.FullBackup.CreatedAt,
        durationInMs: group.FullBackup.DurationInMs,
        error: group.FullBackup.Error,
        backupType: group.FullBackup.BackupType,
        backupKind: group.FullBackup.BackupKind,
        nodeTag: group.FullBackup.NodeTag,
        lastFullBackup: group.FullBackup.LastFullBackup,
        incrementalBackupsCount: group.IncrementalBackupsCount,
        incrementalBackups:
            group.IncrementalBackups?.map((inc) => ({
                taskId: group.TaskId,
                taskName: group.TaskName,
                createdAt: inc.CreatedAt,
                durationInMs: inc.DurationInMs,
                error: inc.Error,
                backupType: inc.BackupType,
                backupKind: inc.BackupKind,
                nodeTag: inc.NodeTag,
                lastFullBackup: inc.LastFullBackup,
            })) ?? [],
    }));
}

export const backupHistoryUtils = {
    mapFromDto,
};
