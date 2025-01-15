import confirmViewModelBase = require("viewmodels/confirmViewModelBase");
import router = require("plugins/router");
import appUrl = require("common/appUrl");
import databases = require("components/models/databases");

class deleteDatabaseConfirm extends confirmViewModelBase<deleteDatabaseConfirmResult> {

    view = require("views/resources/deleteDatabaseConfirm.html");
    
    private isKeepingFiles = ko.observable<boolean>(true);
    private encryptedCount: number;

    private readonly databasesToDelete: databases.DatabaseSharedInfo[];

    constructor(databasesToDelete: databases.DatabaseSharedInfo[]) {
        super();
        this.databasesToDelete = databasesToDelete;

        this.encryptedCount = databasesToDelete.filter(x => x.isEncrypted).length;
    }

    goToManageDbGroup() {
        router.navigate(appUrl.forManageDatabaseGroup(this.databasesToDelete[0].name));
        this.cancel();
    }
    
    keepFiles() {
        this.isKeepingFiles(true);
        this.confirm();
    }

    deleteEverything() {
        this.isKeepingFiles(false);
        this.confirm();
    }

    exportDatabase() {
        router.navigate(appUrl.forExportDatabase(this.databasesToDelete[0].name));
        this.cancel();
    }

    protected getConfirmButton(): HTMLElement {
        return $(".modal-footer:visible .btn-danger")[0] as HTMLElement;
    }

    protected prepareResponse(can: boolean): deleteDatabaseConfirmResult {
        return {
            can: can,
            keepFiles: this.isKeepingFiles()
        };
    }
}

export = deleteDatabaseConfirm;
