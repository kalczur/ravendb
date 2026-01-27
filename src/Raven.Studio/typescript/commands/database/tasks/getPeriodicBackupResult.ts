import commandBase = require("commands/commandBase");
import endpoints = require("endpoints");

interface ResultDto {
    BackupResult: Raven.Client.Documents.Operations.Backups.BackupResult;
}

class getPeriodicBackupResult extends commandBase {

    constructor(private db: string, private taskId: number, private backupTicks: number) {
        super();
    }

    execute(): JQueryPromise<ResultDto> {
        const url = endpoints.global.backupDatabase.periodicBackupResult;
        
        const args = {
            database: this.db,
            taskId: this.taskId,
            backupTicks: this.backupTicks
        };

        return this.query<ResultDto>(url, args);
    }
}

export = getPeriodicBackupResult;
