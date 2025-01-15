import commandBase = require("commands/commandBase");
import database = require("models/resources/database");
import endpoints = require("endpoints");
import indexes = require("components/models/indexes");

class saveIndexLockModeCommand extends commandBase {

    private indexes: Array<indexes.IndexSharedInfo>;

    private lockMode: Raven.Client.Documents.Indexes.IndexLockMode;

    private db: database | string;

    constructor(indexes: Array<indexes.IndexSharedInfo>, lockMode: Raven.Client.Documents.Indexes.IndexLockMode, db: database | string) {
        super();
        this.db = db;
        this.lockMode = lockMode;
        this.indexes = indexes;
    }

    execute(): JQueryPromise<void> {
        const payload: Raven.Client.Documents.Operations.Indexes.SetIndexesLockOperation.Parameters = {
            Mode: this.lockMode,
            IndexNames: this.indexes.map(x => x.name)
        };

        const url = endpoints.databases.index.indexesSetLock;

        return this.post(url, JSON.stringify(payload), this.db, { dataType: undefined })
            .fail((response: JQueryXHR) => this.reportError("Failed to set index lock mode", response.responseText));
    }
} 

export = saveIndexLockModeCommand;
