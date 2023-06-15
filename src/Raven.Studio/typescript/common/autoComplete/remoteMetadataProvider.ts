import database = require("models/resources/database");
import collectionsTracker = require("common/helpers/database/collectionsTracker");
import getIndexEntriesFieldsCommand = require("commands/database/index/getIndexEntriesFieldsCommand");
import getCollectionFieldsCommand from "commands/database/documents/getCollectionFieldsCommand";
import IndexUtils from "components/utils/IndexUtils";

class remoteMetadataProvider implements queryCompleterProviders {
    
    private readonly db: database;
    private readonly indexes: KnockoutObservable<string[]> | string[];
    
    constructor(database: database, indexes: KnockoutObservable<string[]> | string[]) {
        this.db = database;
        this.indexes = indexes;
    }

    collections(callback: (collectionNames: string[]) => void): void {
        callback(collectionsTracker.default.getCollectionNames());
    }

    indexFields(indexName: string, callback: (fields: string[]) => void): void {
        new getIndexEntriesFieldsCommand(indexName, this.db, this.db.getLocations()[0], false)
            .execute()
            .done(result => {
                callback(result.Static.filter(x => !IndexUtils.FieldsToHideOnUi.includes(x)));
            });
    }

    collectionFields(collectionName: string, prefix: string, callback: (fields: dictionary<string>) => void): void {
        if (collectionName === "@all_docs") {
            collectionName = "All Documents";
        }
        const matchedCollection = collectionsTracker.default.collections().find(x => x.name === collectionName);
        if (matchedCollection) {
            const collectionName = matchedCollection.isAllDocuments ? undefined : matchedCollection.name;
            new getCollectionFieldsCommand(this.db, collectionName, prefix)
                .execute()
                .done(result => {
                    if (result) {
                        if (!prefix) {
                            result["id()"] = "String";
                        }
                        callback(result);
                    }
                });
        } else {
            callback({});
        }
    }

    indexNames(callback: (indexNames: string[]) => void): void {
        callback(ko.isObservable(this.indexes) ? this.indexes() : this.indexes);
    }
}


export = remoteMetadataProvider;
