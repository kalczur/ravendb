
import lineChart = require("models/resources/clusterDashboard/lineChart");
import clusterDashboard = require("viewmodels/resources/clusterDashboard");
import cpuUsage = require("models/resources/widgets/cpuUsage");
import abstractChartsWebsocketWidget = require("viewmodels/resources/widgets/abstractChartsWebsocketWidget");

class cpuUsageWidget extends abstractChartsWebsocketWidget<Raven.Server.Dashboard.Cluster.Notifications.CpuUsagePayload, cpuUsage> {

    view = require("views/resources/widgets/cpuUsageWidget.html");
    
    ravenChart: lineChart.lineChart<Raven.Server.Dashboard.Cluster.Notifications.CpuUsagePayload>;
    serverChart: lineChart.lineChart<Raven.Server.Dashboard.Cluster.Notifications.CpuUsagePayload>;
    
    constructor(controller: clusterDashboard) {
        super(controller);

        for (const node of this.controller.nodes()) {
            const stats = new cpuUsage(node.tag());
            this.nodeStats.push(stats);
        }
    }
    
    getType(): Raven.Server.Dashboard.Cluster.ClusterDashboardNotificationType {
        return "CpuUsage";
    }

    protected initCharts() {
        const ravenChartContainer = this.container.querySelector(".ravendb-line-chart");
        this.ravenChart = new lineChart.lineChart(ravenChartContainer, x => x.ProcessCpuUsage, {
            grid: true,
            yMaxProvider: () => 100,
            topPaddingProvider: () => 2,
            tooltipProvider: date => cpuUsageWidget.tooltipContent(date),
            onMouseMove: date => this.onMouseMove(date)
        });
        const serverChartContainer = this.container.querySelector(".machine-line-chart");
        this.serverChart = new lineChart.lineChart(serverChartContainer, x => x.MachineCpuUsage, {
            grid: true,
            yMaxProvider: () => 100,
            topPaddingProvider: () => 2,
            tooltipProvider: date => cpuUsageWidget.tooltipContent(date),
            onMouseMove: date => this.onMouseMove(date)
        });
        
        return [this.ravenChart, this.serverChart];
    }
}

export = cpuUsageWidget;
