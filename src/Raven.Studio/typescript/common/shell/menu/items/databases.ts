﻿import leafMenuItem = require("common/shell/menu/leafMenuItem");
import appUrl = require("common/appUrl");
import reactUtils = require("common/reactUtils");
import DatabasesPage = require("components/pages/resources/databases/DatabasesPage");

export = getDatabasesMenuItem;

function getDatabasesMenuItem(appUrls: computedAppUrls) {
    const databasesView = reactUtils.bridgeToReact(DatabasesPage.DatabasesPage, "nonShardedView");
    
    appUrl.defaultModule = databasesView;
    
    return new leafMenuItem({
        route: "databases",
        title: "Databases",
        moduleId: databasesView,
        nav: true,
        css: "icon-resources",
        dynamicHash: appUrls.databasesManagement,
        search: {
            innerActions: [
                { name: "Add New Database", alternativeNames: ["Create Database"] },
                { name: "Restore database from backup" },
                { name: "Disable database" },
                { name: "Enable database" },
                { name: "Pause indexing until restart" },
                { name: "Disable indexing" },
                { name: "Resume indexing" },
                { name: "Restart database" },
                { name: "Compact database" },
                { name: "Delete database", alternativeNames: ["Remove database"] },
                { name: "Allow database delete" },
                { name: "Prevent database delete" },
            ],
        },
    });
}
