import commandBase = require("commands/commandBase");
import database = require("models/resources/database");
import appUrl = require("common/appUrl");
import endpoints = require("endpoints");
import genUtils = require("common/generalUtils");

class getDatabaseStatsCommand extends commandBase {
    private readonly db: database | string;
    private readonly location: databaseLocationSpecifier;

    constructor(db: database | string, location: databaseLocationSpecifier) {
        super();
        this.db = db;
        this.location = location;
    }

    execute(): JQueryPromise<Raven.Client.Documents.Operations.DatabaseStatistics> {
        const url = this.getQueryUrlFragment();
        const args = this.location;
        
        return this.query<Raven.Client.Documents.Operations.DatabaseStatistics>(url, args, this.db, null, null)
            .fail((response: JQueryXHR) => this.reportError(`Failed to get database statistics for ${genUtils.formatLocation(this.location)}`, response.responseText, response.statusText));
    }

    getQueryUrl(): string {
        return appUrl.forDatabaseQuery(this.db) + this.getQueryUrlFragment();
    }

    private getQueryUrlFragment(): string {
        return endpoints.databases.stats.stats;
    }
}

export = getDatabaseStatsCommand;
