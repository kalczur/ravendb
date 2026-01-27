import commandBase = require("commands/commandBase");
import endpoints = require("endpoints");

interface ResultDto {
    BackupHistory: Raven.Server.Documents.PeriodicBackup.BackupHistory.BackupHistory;
}

class getPeriodicBackupHistory extends commandBase {

    constructor(private db: string) {
        super();
    }

    execute(): JQueryPromise<ResultDto> {
        const url = endpoints.global.backupDatabase.periodicBackupHistory;
        
        const args = {
            database: this.db
        };

        return this.query<ResultDto>(url, args);
    }
}

export = getPeriodicBackupHistory;
