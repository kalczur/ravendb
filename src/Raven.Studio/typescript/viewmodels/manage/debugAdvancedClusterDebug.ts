import viewModelBase = require("viewmodels/viewModelBase");
import getClusterLogCommand = require("commands/database/cluster/getClusterLogCommand");
import virtualGridController = require("widgets/virtualGrid/virtualGridController");
import columnPreviewPlugin = require("widgets/virtualGrid/columnPreviewPlugin");
import textColumn = require("widgets/virtualGrid/columns/textColumn");
import generalUtils = require("common/generalUtils");
import moment = require("moment");
import actionColumn = require("widgets/virtualGrid/columns/actionColumn");
import FollowerDebugView = Raven.Server.Rachis.FollowerDebugView;
import appUrl = require("common/appUrl");
import removeEntryFromLogCommand = require("commands/database/cluster/removeEntryFromLogCommand");
import getClusterLogEntryCommand = require("commands/database/cluster/getClusterLogEntryCommand");
import showDataDialog = require("viewmodels/common/showDataDialog");
import app = require("durandal/app");
import debugAdvancedClusterSnapshotInstallation = require("viewmodels/manage/debugAdvancedClusterSnapshotInstallation");
import notificationCenter = require("common/notifications/notificationCenter");
import messagePublisher = require("common/messagePublisher");
import virtualColumn = require("widgets/virtualGrid/columns/virtualColumn");

type LogEntryStatus = "Commited" | "Appended";

interface LogEntry {
    Status: LogEntryStatus;
    CommandType: string;
    CreateAt?: string;
    Flags: Raven.Server.Rachis.RachisEntryFlags;
    Index: number;
    SizeInBytes: number;
    Term: number;
}

class clusterDebug extends viewModelBase {

    view = require("views/manage/debugAdvancedClusterDebug.html");
    
    spinners = {
        refresh: ko.observable<boolean>(false)
    }
  
    clusterLog = ko.observable<Raven.Server.Rachis.RaftDebugView>();
    
    private gridController = ko.observable<virtualGridController<LogEntry>>();
    private columnPreview = new columnPreviewPlugin<LogEntry>();
    
    lastAppendedAsAgo: KnockoutComputed<string>;
    lastCommittedAsAgo: KnockoutComputed<string>;
    lastCommittedTooltip: KnockoutComputed<string>;
    installingSnapshot: KnockoutComputed<boolean>;
    progress: KnockoutComputed<number>;
    progressTooltip: KnockoutComputed<string>;
    queueLength: KnockoutComputed<number>;
    rawJsonUrl: KnockoutComputed<string>;
    hasCriticalError: KnockoutComputed<boolean>;
    connections: KnockoutComputed<Raven.Server.Rachis.RaftDebugView.PeerConnection[]>;
    chokedCluster: KnockoutComputed<boolean>;
    
    private nextIndexToFetch = ko.observable<number>();
    private totalCount = ko.observable<number>();
    
    constructor() {
        super();
        
        this.bindToCurrentInstance("refresh", "customInlinePreview", "deleteLogEntry", "openInstallationDetails", "openCriticalError", "showConnectionDetails");

        this.queueLength = ko.pureComputed(() => {
            const log = this.clusterLog();
            if (!log || log.Log.Logs.length === 0) {
                return 0;
            }

            return log.Log.LastLogEntryIndex - log.Log.CommitIndex;
        });

        this.chokedCluster = ko.pureComputed(() => {
            const log = this.clusterLog();
            if (!log) {
                return false;
            }
            
            const queueSizeCheck = this.queueLength() >= 5;
            const lastCommit = moment.utc(log.Log.LastCommitedTime);
            const lastCommitAgoInMs = moment.utc().diff(lastCommit);
            const lastCommitCheck = lastCommitAgoInMs >= 2 * 60 * 1_000; // 2 minutes
            return queueSizeCheck && lastCommitCheck;
        })
        
        this.connections = ko.pureComputed(() => {
            const log = this.clusterLog();
            if (!log) {
                return [];
            }
            
            if ("ConnectionToPeers" in log) {
                return (log as any).ConnectionToPeers;
            }

            if ("ConnectionToLeader" in log) {
                return [(log as any).ConnectionToLeader];
            }
            
            return [];
        })
        
        this.hasCriticalError = ko.pureComputed(() => {
            const log = this.clusterLog();
            if (!log) {
                return false;
            }
            
            return !!log.Log.CriticalError;
        });
        
        this.lastAppendedAsAgo = ko.pureComputed(() => {
            const log = this.clusterLog();
            if (!log) {
                return null;
            }
            
            const date = log.Log.LastAppendedTime;
            if (!date) {
                return null;
            }
            
            return generalUtils.formatDurationByDate(moment.utc(date), true);
        });

        this.lastCommittedAsAgo = ko.pureComputed(() => {
            const log = this.clusterLog();
            if (!log) {
                return null;
            }

            const date = log.Log.LastCommitedTime;
            if (!date) {
                return null;
            }

            return generalUtils.formatDurationByDate(moment.utc(date), true);
        });
        
        this.lastCommittedTooltip = ko.pureComputed(() => {
            const log = this.clusterLog();
            if (!log) {
                return null;
            }

            const chokedText = this.chokedCluster() ? `<span class="text-warning">Warning: No commits for over 2 minutes </span><br />` : "";
            const commitTimeText = log.Log.LastCommitedTime ?? 'n/a';
            
            return chokedText + commitTimeText;
        })
        
        this.installingSnapshot = ko.pureComputed(() => {
            const log = this.clusterLog();
            if (!log) {
                return false;
            }
            
            return log.Role === "Follower" && (log as FollowerDebugView).Phase === "Snapshot";
        });
        
       
        this.progress = ko.pureComputed(() => {
            const log = this.clusterLog();
            if (!log) {
                return null;
            }
            
            const first = log.Log.FirstEntryIndex;
            const last = log.Log.LastLogEntryIndex;

            if (!first && !last) {
                return 100;
            }
            
            const logLength = last - first + 1;
            const queueLength = this.queueLength();
            
            return Math.ceil(100 * (logLength - queueLength) / logLength);
        });
        
        this.progressTooltip = ko.pureComputed(() => {
            const log = this.clusterLog();
            if (!log) {
                return null;
            }
            
            return `
                <div>
                    First entry index: <strong>${log.Log.FirstEntryIndex.toLocaleString()}</strong><br />
                    Commit index: <strong>${log.Log.CommitIndex.toLocaleString()}</strong><br />
                    Last log entry index: <strong>${log.Log.LastLogEntryIndex.toLocaleString()}</strong> 
                </div>
              `;
        });

        this.rawJsonUrl = ko.pureComputed(() => appUrl.forAdminClusterLogRawData());
    }
    
    activate(args: any, parameters?: any) {
        super.activate(args, parameters);
        
        return this.fetchClusterLog();
    }

    private static mapStatus(entry: Raven.Server.Rachis.RachisConsensus.RachisDebugLogEntry, commitIndex: number): LogEntryStatus {
        const committed = entry.Index <= commitIndex;
        return committed ? "Commited" : "Appended";
    }
    
    compositionComplete(): void {
        super.compositionComplete();
        
        const fetcher = (skip: number) => {
            const log = this.clusterLog().Log;
            const data = log.Logs;
            
            if (skip === 0) {
                // we have preloaded data
                const logLength = log.Logs.length;
                const hasMore = logLength !== log.TotalEntries;
                const total = hasMore ? logLength + 1 : logLength;
                
                this.nextIndexToFetch(log.Logs.length ? log.Logs[log.Logs.length - 1].Index - 1 : 0);
                this.totalCount(data.length);
              
                return $.when({
                    totalResultCount: total,
                    items: data.map(x => {
                        return {
                            ...x,
                            Status: clusterDebug.mapStatus(x, log.CommitIndex)
                        }
                    })
                } as pagedResult<LogEntry>);
            } else {
                const chuckSize = 1001;
                return new getClusterLogCommand(this.nextIndexToFetch(), chuckSize)
                    .execute()
                    .then(data => {
                        const hasMore = data.Log.Logs.length === chuckSize;
                        if (hasMore) {
                            // truncate last item
                            const lastItem = data.Log.Logs.pop();
                            this.nextIndexToFetch(lastItem.Index);
                        }
                        
                        this.totalCount(this.totalCount() + data.Log.Logs.length);

                        const total = this.totalCount() + (hasMore ? 1 : 0);
                        
                        return {
                            totalResultCount: total,
                            items: data.Log.Logs.map(x => {
                                return {
                                    ...x,
                                    Status: clusterDebug.mapStatus(x, log.CommitIndex)
                                }
                            })
                        } as pagedResult<LogEntry>;
                    });
            }
        };

        const previewColumn = new actionColumn<LogEntry>(this.gridController(),
            log => this.customInlinePreview(log), "Preview", `<i class="icon-preview"></i>`, "75px",
            {
                title: () => 'Show item preview',
                extraClass: item => item.SizeInBytes === 0 ? "invisible" : ""
            });

        const grid = this.gridController();
        grid.headerVisible(true);
        grid.setDefaultSortBy(1, "desc");
        grid.init(fetcher, () =>
            [
                previewColumn,
                new textColumn<LogEntry>(grid, x => x.Index, "Index", "15%", {
                    sortable: "number"
                }),
                new textColumn<LogEntry>(grid, x => x.CommandType, "CommandType", "15%", {
                    sortable: "string"
                }),
                new textColumn<LogEntry>(grid, x => x.CreateAt, "Created", "15%", {
                    sortable: "string"
                }),
                new textColumn<LogEntry>(grid, x => generalUtils.formatBytesToSize(x.SizeInBytes), "Size", "15%", {
                    sortable: "number"
                }),
                new textColumn<LogEntry>(grid, x => x.Term, "Term", "15%", {
                    sortable: "number"
                }),
                new textColumn<LogEntry>(grid, x => x.Status, "Status", "15%", {
                    sortable: "string"
                }),
                new actionColumn<LogEntry>(this.gridController(), x => this.deleteLogEntry(x),
                    "Delete",
                    `<i class="icon-trash"></i>`,
                    "35px",
                    {
                        title: () => 'Delete Log Entry',
                        extraClass: item => item.Index <= this.clusterLog().Log.CommitIndex ? "file-trash btn-danger invisible" : "file-trash btn-danger"
                    })
            ]
        );

        this.columnPreview.install("virtual-grid", ".js-cluster-log-tooltip",
            (entry: LogEntry, column: virtualColumn, e: JQuery.TriggeredEvent, onValue: (context: any, valueToCopy: string) => void) => {
                if (column.header === "Created") {
                    onValue(moment.utc(entry.CreateAt), entry.CreateAt);
                } else {
                    if (column instanceof textColumn) {
                        const value = column.getCellValue(entry);
                        onValue(generalUtils.escapeHtml(value), value);
                    }
                }
               
            });
    }

    deleteLogEntry(log: LogEntry) {
        this.confirmationMessage("Are you sure?", "Do you want to delete log item with index '" + log.Index +"' from cluster log?", {
            buttons: ["Cancel", "I understand the risk, delete"]
        })
            .done(result => {
                if (result.can) {
                    new removeEntryFromLogCommand(log.Index)
                        .execute()
                    
                }
            });
    }

    customInlinePreview(log: LogEntry) {
        new getClusterLogEntryCommand(log.Index)
            .execute()
            .done((entry) => {
                app.showBootstrapDialog(new showDataDialog("Cluster Log Entry", JSON.stringify(entry, null, 4), "javascript"));
            });
    }
    
    private fetchClusterLog() {
        return new getClusterLogCommand(undefined, 1024) 
            .execute()
            .done(log => {
                this.clusterLog(log);
                this.nextIndexToFetch(null);
            });
    }

    openInstallationDetails() {
        if (this.clusterLog().Role === "Follower") {
            const log = this.clusterLog() as Raven.Server.Rachis.FollowerDebugView;
            if (log.Phase === "Snapshot") {
                const items = log.RecentMessages;
                const dialog = new debugAdvancedClusterSnapshotInstallation(items);
                app.showBootstrapDialog(dialog);
            }
        }
    }

    openCriticalError() {
        const alertId = this.clusterLog().Log.CriticalError.Id;
        const criticalErrorAlert = notificationCenter.instance.globalNotifications().find(x => x.id === alertId);
        if (!criticalErrorAlert) {
            messagePublisher.reportError("Unable to find critical error alert");
        }
        
        notificationCenter.instance.openDetails(criticalErrorAlert);
    }
    
    refresh() {
        this.spinners.refresh(true);
        
        this.fetchClusterLog()
            .done(() => this.gridController().reset())
            .always(() => this.spinners.refresh(false));
    }

    showConnectionDetails(connection: Raven.Server.Rachis.RaftDebugView.PeerConnection) {
        app.showBootstrapDialog(new showDataDialog("Connection details", JSON.stringify(connection, null, 4), "javascript"));
    }
}

export = clusterDebug;
