import clusterDashboard = require("viewmodels/resources/clusterDashboard");
import nodeTagColumn = require("widgets/virtualGrid/columns/nodeTagColumn");
import abstractDatabaseAndNodeAwareTableWidget = require("viewmodels/resources/widgets/abstractDatabaseAndNodeAwareTableWidget");
import virtualColumn = require("widgets/virtualGrid/columns/virtualColumn");
import databaseDiskUsage = require("models/resources/widgets/databaseDiskUsage");
import textColumn = require("widgets/virtualGrid/columns/textColumn");
import appUrl = require("common/appUrl");
import perNodeStatItems = require("models/resources/widgets/perNodeStatItems");
import DatabaseUtils = require("components/utils/DatabaseUtils");
import generalUtils = require("common/generalUtils");

class databaseStorageWidget extends abstractDatabaseAndNodeAwareTableWidget<Raven.Server.Dashboard.Cluster.Notifications.DatabaseStorageUsagePayload, perNodeStatItems<databaseDiskUsage>, databaseDiskUsage> {

    view = require("views/resources/widgets/databaseStorageWidget.html");
    
    getType(): Raven.Server.Dashboard.Cluster.ClusterDashboardNotificationType {
        return "DatabaseStorageUsage";
    }

    constructor(controller: clusterDashboard) {
        super(controller);

        for (const node of this.controller.nodes()) {
            const stats = new perNodeStatItems<databaseDiskUsage>(node.tag());
            this.nodeStats.push(stats);
        }
    }

    protected createNoDataItem(nodeTag: string, databaseName: string): databaseDiskUsage {
        return databaseDiskUsage.noData(nodeTag, databaseName);
    }
    
    protected mapItems(nodeTag: string, data: Raven.Server.Dashboard.Cluster.Notifications.DatabaseStorageUsagePayload): databaseDiskUsage[] {
        return data.Items.map(x => new databaseDiskUsage(nodeTag, x));
    }

    protected prepareColumns(): virtualColumn[] {
        const grid = this.gridController();
        return [
            new textColumn<databaseDiskUsage>(grid, x => x.hideDatabaseName && !grid.sortEnabled() ? "" : DatabaseUtils.default.formatName(x.database), "Database", "35%"),
            new nodeTagColumn<databaseDiskUsage>(grid, item => this.prepareUrl(item, "Storage Report View")),
            new textColumn<databaseDiskUsage>(grid, x => x.noData ? "-" : generalUtils.formatBytesToSize(x.size), "Data", "15%", {
                headerTitle: "Data files storage usage",
                sortable: x => x.noData ? -1 : x.size,
            }),
            new textColumn<databaseDiskUsage>(grid, x => x.noData ? "-" : generalUtils.formatBytesToSize(x.tempBuffersSize), "Temp", "15%", {
                headerTitle: "Temp file storage usage",
                sortable: x => x.noData ? -1 : x.tempBuffersSize,
            }),
            new textColumn<databaseDiskUsage>(grid, x => x.noData ? "-" : generalUtils.formatBytesToSize(x.total), "Total", "15%", {
                headerTitle: "Total files storage usage (Data + Temp)",
                sortable: x => x.noData ? -1 : x.total,
            }),
        ];
    }

    protected generateLocalLink(database: string): string {
        return database === "<System>" ? appUrl.forSystemStorageReport() : appUrl.forStatusStorageReport(database);
    }
}

export = databaseStorageWidget;
