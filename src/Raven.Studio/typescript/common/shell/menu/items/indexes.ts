﻿import intermediateMenuItem = require("common/shell/menu/intermediateMenuItem");
import leafMenuItem = require("common/shell/menu/leafMenuItem");
import footer = require("common/shell/footer");
import { bridgeToReact } from "common/reactUtils";
import { IndexesPage } from "components/pages/database/indexes/list/IndexesPage";
import { IndexCleanup } from "components/pages/database/indexes/cleanup/IndexCleanup";
export = getIndexesMenuItem;

function getIndexesMenuItem(appUrls: computedAppUrls) {
    const indexesItems = [
        new leafMenuItem({
            route: 'databases/query/index(/:indexNameOrRecentQueryIndex)',
            shardingMode: "allShards",
            moduleId: require('viewmodels/database/query/query'),
            title: 'Query',
            nav: true,
            css: 'icon-indexes-query',
            dynamicHash: appUrls.query('')
        }),
        new leafMenuItem({
            title: "List of Indexes",
            nav: true,
            shardingMode: "allShards",
            route: "databases/indexes",
            moduleId: bridgeToReact(IndexesPage, "shardedView"),
            css: 'icon-list-of-indexes',
            dynamicHash: appUrls.indexes(null, false, false)
        }),
        new leafMenuItem({
            route: 'databases/indexes/performance',
            shardingMode: "singleShard",
            moduleId: require('viewmodels/database/indexes/indexPerformance'),
            title: 'Indexing Performance',
            tooltip: "Shows details about indexing performance",
            nav: true,
            css: 'icon-indexing-performance',
            dynamicHash: appUrls.indexPerformance
        }),
        new leafMenuItem({
            route: 'databases/indexes/visualizer',
            shardingMode: "singleShard",
            moduleId: require('viewmodels/database/indexes/visualizer/visualizer'),
            title: 'Map-Reduce Visualizer',
            nav: true,
            css: 'icon-map-reduce-visualizer',
            dynamicHash: appUrls.visualizer
        }),
        new leafMenuItem({
            route: 'databases/indexes/cleanup',
            moduleId: bridgeToReact(IndexCleanup, "nonShardedView"),
            shardingMode: "allShards",
            title: 'Index Cleanup',
            nav: true,
            css: 'icon-index-cleanup',
            dynamicHash: appUrls.indexCleanup
        }),
        new leafMenuItem({
            route: 'databases/indexes/indexErrors',
            shardingMode: "allShards",
            moduleId: require('viewmodels/database/indexes/indexErrors'),
            title: 'Index Errors',
            nav: true,
            css: 'icon-index-errors',
            dynamicHash: appUrls.indexErrors,
            badgeData: ko.pureComputed(() => { return footer.default.stats() ? footer.default.stats().countOfIndexingErrors() : null; })
        }),
        new leafMenuItem({
            title: 'Edit Index',
            shardingMode: "allShards",
            route: 'databases/indexes/edit(/:indexName)',
            moduleId: require('viewmodels/database/indexes/editIndex'),
            css: 'icon-edit',
            nav: false,
            itemRouteToHighlight: 'databases/indexes'
        }),
        new leafMenuItem({
            title: 'Terms',
            route: 'databases/indexes/terms/(:indexName)',
            moduleId: require('viewmodels/database/indexes/indexTerms'),
            shardingMode: "allShards",
            css: 'icon-terms',
            nav: false
        })
    ];

    return new intermediateMenuItem("Indexes", indexesItems, 'icon-indexing', {
        dynamicHash: appUrls.indexes(null, false, false)
    });
}
