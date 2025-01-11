﻿import viewModelBase = require("viewmodels/viewModelBase");
import shardSelector = require("viewmodels/common/sharding/shardSelector");
import nonShardedDatabase = require("models/resources/nonShardedDatabase");
import shardedDatabase = require("models/resources/shardedDatabase");
import shard = require("models/resources/shard");
import database = require("models/resources/database");
import genUtils = require("common/generalUtils");

class shardingContext extends viewModelBase {

    mode: shardingMode;

    effectiveLocation = ko.observable<databaseLocationSpecifier>(null);

    onChangeHandler: (db: database, location: databaseLocationSpecifier) => void;
    
    view = require("views/common/sharding/shardingContext.html");

    shardSelector = ko.observable<shardSelector>();

    showContext: KnockoutComputed<boolean>;
    canChangeScope: KnockoutComputed<boolean>;
    contextName: KnockoutComputed<string>;
    
    constructor(mode: shardingMode) {
        super();
        
        this.mode = mode;

        this.showContext = ko.pureComputed(() => {
            if (this.shardSelector()) {
                return false;
            }
            
            return !!this.effectiveLocation();
        });

        this.canChangeScope = ko.pureComputed(() => this.mode === "singleShard");

        this.contextName = ko.pureComputed(() => {
            const db = this.activeDatabase();

            if (!db) {
                return "";
            }

            if (this.effectiveLocation()) {
                return genUtils.formatLocation(this.effectiveLocation());
            }
            
            return "";
        });

        this.bindToCurrentInstance("useDatabase");
    }
    
    onChange(handler: (db: database, location: databaseLocationSpecifier) => void) {
        this.onChangeHandler = handler;
    }

    changeScope() {
        const onClose = () => this.shardSelector(null);
        this.shardSelector(new shardSelector((db, nodeTag) => this.onShardSelected(db, nodeTag), onClose));
    }

    private onShardSelected(db: shard, nodeTag: string): void {
        const location: databaseLocationSpecifier = {
            shardNumber: db.shardNumber,
            nodeTag: nodeTag
        };

        this.useDatabase(db.root, location);
        this.shardSelector(null);
    }

    supportsDatabase(db: database): boolean {
        if (db instanceof nonShardedDatabase) {
            return true;
        }

        if (db instanceof shardedDatabase) {
            switch (this.mode) {
                case "allShards":
                    return !this.effectiveLocation();
                case "singleShard":
                    return !!this.effectiveLocation();
            }
        }
        
        return true;
    }

    resetView() {
        const activeDatabase = this.activeDatabase();

        this.effectiveLocation(null);
        
        if (this.supportsDatabase(activeDatabase)) {
            this.onChangeHandler(activeDatabase, null);
        } else {
            this.shardSelector(new shardSelector((db, nodeTag) => this.onShardSelected(db, nodeTag)));
        }
    }

    useDatabase(db: database, location: databaseLocationSpecifier) {
        this.effectiveLocation(location);
        this.onChangeHandler(db, location);
    }
}

export = shardingContext;
