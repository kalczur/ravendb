import { createAsyncThunk, createSelector, createSlice, PayloadAction } from "@reduxjs/toolkit";
import { services } from "components/hooks/useServices";
import { loadStatus } from "components/models/common";
import { RootState } from "components/store";

export interface AdminLogsMessage {
    Date: string;
    Level: Uppercase<Sparrow.Logging.LogLevel>;
    ThreadID: string;
    Resource: string;
    Component?: string;
    Logger: string;
    Message: string;
    Data?: string;
    _meta: {
        id: string;
        isExpanded: boolean;
    };
}

export interface AdminLogsState {
    logs: AdminLogsMessage[];
    configs: {
        adminLogsConfig: Raven.Client.ServerWide.Operations.Logs.GetLogsConfigurationResult;
        trafficWatchConfig: Omit<
            Raven.Client.ServerWide.Operations.TrafficWatch.PutTrafficWatchConfigurationOperation.Parameters,
            "Persist"
        >;
        eventListenerConfig: Omit<Raven.Server.EventListener.EventListenerToLog.EventListenerConfiguration, "Persist">;
    };
    configsLoadStatus: loadStatus;
    maxLogsCount: number;
    isPaused: boolean;
    isMonitorTail: boolean;
    isDiscSettingOpen: boolean;
    isViewSettingOpen: boolean;
    isDisplaySettingsOpen: boolean;
    isDownloadDiskLogsOpen: boolean;
    isAllExpanded: boolean;
    filter: string;
}

const initialState: AdminLogsState = {
    logs: [],
    configs: null,
    configsLoadStatus: "idle",
    maxLogsCount: 100_000,
    isPaused: false,
    isMonitorTail: true,
    isDiscSettingOpen: false,
    isViewSettingOpen: false,
    isDisplaySettingsOpen: false,
    isDownloadDiskLogsOpen: false,
    isAllExpanded: false,
    filter: "",
};

export const adminLogsSlice = createSlice({
    name: "adminLogs",
    initialState,
    reducers: {
        liveClientStarted: () => {
            // defined only for middleware
        },
        liveClientStopped: () => {
            // defined only for middleware
        },
        logsSet: (state, action: PayloadAction<AdminLogsMessage[]>) => {
            state.logs = action.payload;
        },
        logsAppended: (state, action: PayloadAction<Omit<AdminLogsMessage, "_meta">>) => {
            let newLogs: AdminLogsMessage[] = [
                ...state.logs,
                { ...action.payload, _meta: { id: _.uniqueId(), isExpanded: state.isAllExpanded } },
            ];

            if (newLogs.length > state.maxLogsCount) {
                newLogs = newLogs.slice(newLogs.length - state.maxLogsCount);
            }

            state.logs = newLogs;
        },
        maxLogsCountSet: (state, action: PayloadAction<number>) => {
            state.maxLogsCount = action.payload;
        },
        isPausedToggled: (state) => {
            state.isPaused = !state.isPaused;
        },
        isMonitorTailToggled: (state) => {
            state.isMonitorTail = !state.isMonitorTail;
        },
        isDiscSettingOpenToggled: (state) => {
            state.isDiscSettingOpen = !state.isDiscSettingOpen;
        },
        isViewSettingOpenToggled: (state) => {
            state.isViewSettingOpen = !state.isViewSettingOpen;
        },
        isDisplaySettingsOpenToggled: (state) => {
            state.isDisplaySettingsOpen = !state.isDisplaySettingsOpen;
        },
        isDownloadDiskLogsOpenToggled: (state) => {
            state.isDownloadDiskLogsOpen = !state.isDownloadDiskLogsOpen;
        },
        isAllExpandedToggled: (state) => {
            state.isAllExpanded = !state.isAllExpanded;
        },
        filterSet: (state, action: PayloadAction<string>) => {
            state.filter = action.payload;
        },
        isLogExpandedToggled: (state, action: PayloadAction<AdminLogsMessage>) => {
            const newLogs = state.logs.map((logItem) =>
                logItem._meta.id === action.payload._meta.id
                    ? { ...logItem, _meta: { ...logItem._meta, isExpanded: !logItem._meta.isExpanded } }
                    : logItem
            );
            state.logs = newLogs;
        },
        reset: () => initialState,
    },
    extraReducers(builder) {
        builder
            .addCase(fetchConfigs.fulfilled, (state, action) => {
                state.configs = action.payload;
                state.configsLoadStatus = "success";
            })
            .addCase(fetchConfigs.pending, (state) => {
                state.configsLoadStatus = "loading";
            })
            .addCase(fetchConfigs.rejected, (state) => {
                state.configsLoadStatus = "failure";
            });
    },
});

const fetchConfigs = createAsyncThunk<AdminLogsState["configs"]>(adminLogsSlice.name + "/fetchConfigs", async () => {
    const { manageServerService } = services;

    const configs = await manageServerService.getAdminLogsConfiguration();
    const trafficWatchConfig = await manageServerService.getTrafficWatchConfiguration();
    const eventListenerConfig = await manageServerService.getEventListenerConfiguration();

    return {
        adminLogsConfig: configs,
        trafficWatchConfig,
        eventListenerConfig,
    };
});

export const adminLogsActions = {
    ...adminLogsSlice.actions,
    fetchConfigs,
};

const selectFilteredLogs = createSelector(
    [(store: RootState) => store.adminLogs.logs, (store: RootState) => store.adminLogs.filter],
    (logs, filter) =>
        logs.filter((log) =>
            Object.entries(log).some(
                (entry) =>
                    entry[0] !== "_meta" &&
                    typeof entry[1] === "string" &&
                    entry[1].toLowerCase().includes(filter.toLocaleLowerCase())
            )
        )
);

export const adminLogsSelectors = {
    logs: (store: RootState) => store.adminLogs.logs,
    filteredLogs: selectFilteredLogs,
    configs: (store: RootState) => store.adminLogs.configs,
    configsLoadStatus: (store: RootState) => store.adminLogs.configsLoadStatus,
    maxLogsCount: (store: RootState) => store.adminLogs.maxLogsCount,
    isPaused: (store: RootState) => store.adminLogs.isPaused,
    isMonitorTail: (store: RootState) => store.adminLogs.isMonitorTail,
    isDiscSettingOpen: (store: RootState) => store.adminLogs.isDiscSettingOpen,
    isViewSettingOpen: (store: RootState) => store.adminLogs.isViewSettingOpen,
    isDisplaySettingsOpen: (store: RootState) => store.adminLogs.isDisplaySettingsOpen,
    isDownloadDiskLogsOpen: (store: RootState) => store.adminLogs.isDownloadDiskLogsOpen,
    isAllExpanded: (store: RootState) => store.adminLogs.isAllExpanded,
    filter: (store: RootState) => store.adminLogs.filter,
};
