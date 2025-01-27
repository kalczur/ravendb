/// <reference path="../../typings/tsd.d.ts" />

import database = require("models/resources/database");
import d3 = require("d3");
import abstractWebSocketClient = require("common/abstractWebSocketClient");
import endpoints = require("endpoints");
import TaskUtils from "../components/utils/TaskUtils";
import appUrl from "common/appUrl";

class liveEtlStatsWebSocketClient extends abstractWebSocketClient<resultsDto<Raven.Server.Documents.ETL.Stats.EtlTaskPerformanceStats>> {

    private static readonly isoParser = d3.time.format.iso;
    private readonly onData: (data: Raven.Server.Documents.ETL.Stats.EtlTaskPerformanceStats[]) => void;

    private readonly dateCutOff: Date;
    private mergedData: Raven.Server.Documents.ETL.Stats.EtlTaskPerformanceStats[] = [];
    private pendingDataToApply: Raven.Server.Documents.ETL.Stats.EtlTaskPerformanceStats[] = [];

    private updatesPaused = false;
    loading = ko.observable<boolean>(true);

    constructor(db: database,
                location: databaseLocationSpecifier,
                onData: (data: Raven.Server.Documents.ETL.Stats.EtlTaskPerformanceStats[]) => void,
                dateCutOff?: Date) {
        super(db, location);
        this.onData = onData;
        this.dateCutOff = dateCutOff;
    }

    get connectionDescription() {
        return "Live Etl Stats";
    }

    protected webSocketUrlFactory(location: databaseLocationSpecifier) {
        const args = appUrl.urlEncodeArgs(location);
        return endpoints.databases.etl.etlPerformanceLive + args;
    }

    get autoReconnect() {
        return false;
    }

    pauseUpdates() {
        this.updatesPaused = true;
    }

    resumeUpdates() {
        this.updatesPaused = false;

        if (this.pendingDataToApply.length) {
            this.mergeIncomingData(this.pendingDataToApply);
        }
        this.pendingDataToApply = [];
        this.onData(this.mergedData);
    }

    protected onHeartBeat() {
        this.loading(false);
    }

    protected onMessage(e: resultsDto<Raven.Server.Documents.ETL.Stats.EtlTaskPerformanceStats>) {
        this.loading(false);

        if (this.updatesPaused) {
            this.pendingDataToApply.push(...e.Results);
        } else {
            const hasAnyChange = this.mergeIncomingData(e.Results);
            if (hasAnyChange) {
                this.onData(this.mergedData);    
            }
        }
    }

    private mergeIncomingData(e: Raven.Server.Documents.ETL.Stats.EtlTaskPerformanceStats[]) {
        let hasAnyChange = false;
        
        e.forEach(etlStatsFromEndpoint => {
            const etlType = etlStatsFromEndpoint.EtlType;
            const etlTaskName = etlStatsFromEndpoint.TaskName;
            const etlSubType = etlStatsFromEndpoint.EtlSubType;
            
            let existingEtlStats = this.mergedData.find(x => x.EtlType === etlType && x.TaskName === etlTaskName && x.EtlSubType === etlSubType);
            
            if (!existingEtlStats) {
                existingEtlStats = {
                    TaskName: etlTaskName,
                    EtlType: etlType,
                    EtlSubType: etlSubType,
                    TaskId: etlStatsFromEndpoint.TaskId,
                    Stats: []
                };
                
                this.mergedData.push(existingEtlStats);
                hasAnyChange = true;
            }
            
            etlStatsFromEndpoint.Stats.forEach(perTaskStatsFromEndpoint => {
                const transformationName = perTaskStatsFromEndpoint.TransformationName;
                
                let existingTransformationStats = existingEtlStats.Stats.find(x => x.TransformationName === transformationName);
                if (!existingTransformationStats) {
                    existingTransformationStats = {
                        TransformationName: transformationName,
                        Performance: []
                    };
                    
                    existingEtlStats.Stats.push(existingTransformationStats);
                    hasAnyChange = true;
                }
                
                const idToIndexCache = new Map<number, number>();
                existingTransformationStats.Performance.forEach((v, idx) => {
                    idToIndexCache.set(v.Id, idx);
                });
                
                perTaskStatsFromEndpoint.Performance.forEach(perf => {
                    liveEtlStatsWebSocketClient.fillCache(perf, TaskUtils.etlTypeToStudioType(etlStatsFromEndpoint.EtlType, etlStatsFromEndpoint.EtlSubType));

                    if (this.dateCutOff && this.dateCutOff.getTime() >= (perf as EtlPerformanceBaseWithCache).StartedAsDate.getTime()) {
                        return;
                    }

                    hasAnyChange = true;

                    if (idToIndexCache.has(perf.Id)) {
                        // update 
                        const indexToUpdate = idToIndexCache.get(perf.Id);
                        existingTransformationStats.Performance[indexToUpdate] = perf;
                    } else {
                        // this shouldn't invalidate idToIndexCache as we always append only
                        existingTransformationStats.Performance.push(perf);
                    }
                })
            });
        });
        
        return hasAnyChange;
    }

    static fillCache(perf: Raven.Server.Documents.ETL.Stats.EtlPerformanceStats, type: StudioEtlType) {
        const withCache = perf as EtlPerformanceBaseWithCache;
        withCache.CompletedAsDate = perf.Completed ? liveEtlStatsWebSocketClient.isoParser.parse(perf.Completed) : undefined;
        withCache.StartedAsDate = liveEtlStatsWebSocketClient.isoParser.parse(perf.Started);
        withCache.HasLoadErrors = perf.SuccessfullyLoaded === false;
        withCache.HasTransformErrors = perf.TransformationErrorCount > 0;
        withCache.HasErrors =  withCache.HasLoadErrors || withCache.HasTransformErrors;
        withCache.Type = type;
    }
}

export = liveEtlStatsWebSocketClient;

