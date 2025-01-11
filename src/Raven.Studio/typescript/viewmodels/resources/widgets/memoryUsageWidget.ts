import clusterDashboard = require("viewmodels/resources/clusterDashboard");
import abstractChartsWebsocketWidget = require("viewmodels/resources/widgets/abstractChartsWebsocketWidget");

import lineChart = require("models/resources/clusterDashboard/lineChart");
import memoryUsage = require("models/resources/widgets/memoryUsage");


interface memoryUsageState {
    showProcessDetails: boolean;
    showMachineDetails: boolean;
}

class memoryUsageWidget extends abstractChartsWebsocketWidget<Raven.Server.Dashboard.Cluster.Notifications.MemoryUsagePayload, memoryUsage, void, memoryUsageState> {

    view = require("views/resources/widgets/memoryUsageWidget.html");
    
    showProcessDetails = ko.observable<boolean>(false);
    showMachineDetails = ko.observable<boolean>(false);
    
    ravenChart: lineChart.lineChart<Raven.Server.Dashboard.Cluster.Notifications.MemoryUsagePayload>;
    serverChart: lineChart.lineChart<Raven.Server.Dashboard.Cluster.Notifications.MemoryUsagePayload>;
    
    constructor(controller: clusterDashboard) {
        super(controller);
        
        _.bindAll(this, "toggleProcessDetails", "toggleMachineDetails");

        for (const node of this.controller.nodes()) {
            const stats = new memoryUsage(node.tag());
            this.nodeStats.push(stats);
        }
    }
    
    getType(): Raven.Server.Dashboard.Cluster.ClusterDashboardNotificationType {
        return "MemoryUsage";
    }

    getState(): memoryUsageState {
        return {
            showMachineDetails: this.showMachineDetails(),
            showProcessDetails: this.showProcessDetails()
        }
    }

    restoreState(state: memoryUsageState) {
        this.showProcessDetails(state.showProcessDetails);
        this.showMachineDetails(state.showMachineDetails);
    }

    attached(view: Element, container: HTMLElement) {
        super.attached(view, container);
        
        this.initTooltip();
    }

    initTooltip() {
        $('[data-toggle="tooltip"]', this.container).tooltip();
    }
    
    initCharts() {
        const ravenChartContainer = this.container.querySelector(".ravendb-line-chart");
        this.ravenChart = new lineChart.lineChart(ravenChartContainer, x=> x.WorkingSet, {
            grid: true,
            fillData: true,
            tooltipProvider: date => memoryUsageWidget.tooltipContent(date),
            onMouseMove: date => this.onMouseMove(date)
        });
        const serverChartContainer = this.container.querySelector(".machine-line-chart");
        this.serverChart = new lineChart.lineChart(serverChartContainer, x=> x.PhysicalMemory - x.AvailableMemory, {
            grid: true, 
            fillData: true,
            tooltipProvider: date => memoryUsageWidget.tooltipContent(date),
            onMouseMove: date => this.onMouseMove(date)
        });
        
        return [this.ravenChart, this.serverChart];
    }
    
    toggleProcessDetails() {
        this.showProcessDetails.toggle();

        this.controller.layout(true, "shift");
    }

    toggleMachineDetails() {
        this.showMachineDetails.toggle();

        this.controller.layout(true, "shift");
    }
}

export = memoryUsageWidget;
