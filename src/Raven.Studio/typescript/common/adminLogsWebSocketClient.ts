/// <reference path="../../typings/tsd.d.ts" />
import abstractWebSocketClient = require("common/abstractWebSocketClient");
import endpoints = require("endpoints");
import adminLogsConfig = require("models/database/debug/adminLogsConfig");
import appUrl = require("common/appUrl");

interface AdminLogsMessage {
    Date: string;
    Level: string;
    Resource: string;
    Component: string;
    Logger: string;
    Message: string;
    Data: string;
}

class adminLogsWebSocketClient extends abstractWebSocketClient<AdminLogsMessage> {

    private readonly onData: (data: AdminLogsMessage) => void;

    constructor(config: adminLogsConfig, onData: (data: AdminLogsMessage) => void) {
        super(null, config);
        this.onData = onData;
    }

    protected isJsonBasedClient() {
        return true;
    }

    get connectionDescription() {
        return "Admin Logs";
    }

    protected webSocketUrlFactory(config: adminLogsConfig) {
        const includes = config
            .entries()
            .filter(x => x.mode() === "include")
            .map(x => x.toFilter());
        
        const excludes = config
            .entries()
            .filter(x => x.mode() === "exclude")
            .map(x => x.toFilter());
        
        const args = {
            only: includes,
            except: excludes
        };
        
        return endpoints.global.adminLogs.adminLogsWatch + appUrl.urlEncodeArgs(args);
    }

    get autoReconnect() {
        return true;
    }

    protected onMessage(e: AdminLogsMessage) {
        this.onData(e);
    }
}

export = adminLogsWebSocketClient;

