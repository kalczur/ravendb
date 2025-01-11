import clusterDashboard = require("viewmodels/resources/clusterDashboard");
import nodeTagColumn = require("widgets/virtualGrid/columns/nodeTagColumn");
import abstractDatabaseAndNodeAwareTableWidget = require("viewmodels/resources/widgets/abstractDatabaseAndNodeAwareTableWidget");
import virtualColumn = require("widgets/virtualGrid/columns/virtualColumn");
import textColumn = require("widgets/virtualGrid/columns/textColumn");
import iconsPlusTextColumn = require("widgets/virtualGrid/columns/iconsPlusTextColumn");
import appUrl = require("common/appUrl");
import perNodeStatItems = require("models/resources/widgets/perNodeStatItems");
import databaseOverviewItem = require("models/resources/widgets/databaseOverviewItem");
import DatabaseUtils = require("components/utils/DatabaseUtils");

interface StatusSummary {
    total: number;
    online: number;
    offline: number;
    disabled: number;
}

class databaseOverviewWidget extends abstractDatabaseAndNodeAwareTableWidget<Raven.Server.Dashboard.Cluster.Notifications.DatabaseOverviewPayload,
    perNodeStatItems<databaseOverviewItem>, databaseOverviewItem> {

    view = require("views/resources/widgets/databaseOverviewWidget.html");

    statusSummary = ko.observable<StatusSummary>();
    
    getType(): Raven.Server.Dashboard.Cluster.ClusterDashboardNotificationType {
        return "DatabaseOverview";
    }

    constructor(controller: clusterDashboard) {
        super(controller);

        for (const node of this.controller.nodes()) {
            const stats = new perNodeStatItems<databaseOverviewItem>(node.tag());
            this.nodeStats.push(stats);
        }
    }

    onData(nodeTag: string, data: Raven.Server.Dashboard.Cluster.Notifications.DatabaseOverviewPayload) {
        super.onData(nodeTag, data);
        this.setStatusSummary(data.Items);
    }

    private setStatusSummary(items: Raven.Server.Dashboard.DatabaseInfoItem[]) {
        const summary: StatusSummary = {
            total: 0,
            online: 0,
            offline: 0,
            disabled: 0,
        };

        for (const item of items) {
            summary.total++;
            
            if (item.Disabled) {
                summary.disabled++;
                continue;
            }
            
            if (item.Online) {
                summary.online++;
                continue;
            }
            
            summary.offline++;
        }

        this.statusSummary(summary);
    }

    protected createNoDataItem(nodeTag: string, databaseName: string): databaseOverviewItem {
        return databaseOverviewItem.noData(nodeTag, databaseName);
    }

    protected mapItems(nodeTag: string, data: Raven.Server.Dashboard.Cluster.Notifications.DatabaseOverviewPayload): databaseOverviewItem[] {
        return data.Items.map(x => new databaseOverviewItem(nodeTag, x));
    }
    
    protected manageItems(items: databaseOverviewItem[]): databaseOverviewItem[] {
        if (items.length) {
            let commonItem;
            let prevDbName = "";

            for (let i = 0; i < items.length; i++) {
                const item = items[i];
                const currentDbName = item.database;

                if (currentDbName !== prevDbName) {
                    commonItem = databaseOverviewItem.commonData(item);
                    items.splice(i++, 0, commonItem);
                    prevDbName = currentDbName;
                }
            }
        }
        
        return items.filter(x => x.relevant);
    }

    protected applyPerDatabaseStripes(items: databaseOverviewItem[]) {
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            
            if (item.nodeTag) {
                item.even = false;
                item.hideDatabaseName = true;
            } else {
                item.even = true;
            }
        }
    }

    protected prepareColumns(): virtualColumn[] {
        const grid = this.gridController();
        return [
            new textColumn<databaseOverviewItem>(grid, x => x.hideDatabaseName ? "" : DatabaseUtils.formatName(x.database), "Database", "20%"),

            new nodeTagColumn<databaseOverviewItem>(grid, item => this.prepareUrl(item, "Documents View")),

            new textColumn<databaseOverviewItem>(grid, x => x.nodeTag ? "" : x.documents, "Documents", "10%"),

            new iconsPlusTextColumn<databaseOverviewItem>(grid, x => x.nodeTag ? x.alertsDataForHtml() : "", "Alerts", "10%"),

            new iconsPlusTextColumn<databaseOverviewItem>(grid, x => x.nodeTag ? x.erroredIndexesDataForHtml() : x.indexes.toLocaleString(), "Indexes", "10%"),

            new iconsPlusTextColumn<databaseOverviewItem>(grid, x => x.nodeTag ? x.indexingErrorsDataForHtml() : "", "Indexing Errors", "10%"),

            new textColumn<databaseOverviewItem>(grid, x => x.nodeTag ? "" : x.ongoingTasks.toLocaleString(), "Ongoing Tasks", "10%"),

            new iconsPlusTextColumn<databaseOverviewItem>(grid, x => x.nodeTag ? "" : x.backupDataForHtml(), "Backups", "10%"),

            new iconsPlusTextColumn<databaseOverviewItem>(grid, x => x.stateDataForHtml(x.nodeTag), "State", "10%")
        ];
    }

    protected generateLocalLink(database: string): string {
        return appUrl.forDocuments(null, database);
    }
}

export = databaseOverviewWidget;
