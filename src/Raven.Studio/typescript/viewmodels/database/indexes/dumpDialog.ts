import dialog = require("plugins/dialog");
import dialogViewModelBase = require("viewmodels/dialogViewModelBase");
import dumpIndexCommand = require("commands/database/index/dumpIndexCommand");
import getFolderPathOptionsCommand = require("commands/resources/getFolderPathOptionsCommand");
import database = require("models/resources/database");
import SingleDatabaseLocationSelector = require("components/common/SingleDatabaseLocationSelector");

class dumpDialog extends dialogViewModelBase {
    
    view = require("views/database/indexes/dumpDialog.html");

    indexName = ko.observable<string>();
    
    location = ko.observable<databaseLocationSpecifier>();
    
    directoryPath = ko.observable<string>();
    directoryPathOptions = ko.observableArray<string>([]);
    directoryPathHasFocus = ko.observable<boolean>(false);
    
    validationGroup: KnockoutValidationGroup;

    locationSelectorOptions: ReactInKnockout<typeof SingleDatabaseLocationSelector.SingleDatabaseLocationSelector>;
    
    constructor(indexName: string, private db: database) {
        super();

        this.indexName(indexName);

        _.bindAll(this, "directoryPathChanged");
        this.updateDirectoryPathOptions(this.directoryPath());

        this.initObservables();
        this.initValidation();
    }

    private initObservables(): void {
        this.directoryPath.throttle(300).subscribe(newPathValue => {
            this.updateDirectoryPathOptions(newPathValue);
        });
        
        const locations = this.db.getLocations();
        if (locations.length === 1) {
            // when single node - auto select context
            this.location(locations[0]);
        }

        this.locationSelectorOptions = ko.pureComputed(() => ({
            component: SingleDatabaseLocationSelector.SingleDatabaseLocationSelector,
            props: {
                locations,
                selectedLocation: this.location(),
                setSelectedLocation: l => this.location(l)
            } as Parameters<typeof SingleDatabaseLocationSelector.SingleDatabaseLocationSelector>[0]
        }));
    }

    private initValidation(): void {
        this.directoryPath.extend({
            required: true
        });
        
        this.location.extend({
            required: true
        });

        this.validationGroup = ko.validatedObservable({
            directoryPath: this.directoryPath,
            location: this.location
        });
    }

    private updateDirectoryPathOptions(path: string): void {
        getFolderPathOptionsCommand.forServerLocal(path, true)
            .execute()
            .done((result: Raven.Server.Web.Studio.FolderPathOptions) => {
                if (this.directoryPath() !== path) {
                    // the path has changed
                    return;
                }

                this.directoryPathOptions(result.List);
            });
    }

    directoryPathChanged(value: string): void {
        this.directoryPath(value);
        this.directoryPathHasFocus(true);
    }
    
    dumpIndex() {
        if (!this.isValid(this.validationGroup)) {
            return;
        }

        new dumpIndexCommand(this.indexName(), this.activeDatabase(), this.directoryPath(), this.location())
            .execute()
            .done(() => {
                dialog.close(this);
            });
    }

    close() {
        dialog.close(this);
    }
}

export = dumpDialog; 
