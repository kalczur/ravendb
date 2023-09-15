﻿import React from "react";
import database from "models/resources/database";
import { IndexPanel } from "./IndexPanel";
import IndexFilter from "./IndexFilter";
import IndexSelectActions from "./IndexSelectActions";
import IndexUtils from "../../../../utils/IndexUtils";
import { useAccessManager } from "hooks/useAccessManager";
import { useAppUrls } from "hooks/useAppUrls";
import "./IndexesPage.scss";
import { Alert, Button, Card, Col, Row, UncontrolledPopover } from "reactstrap";
import { LoadingView } from "components/common/LoadingView";
import { StickyHeader } from "components/common/StickyHeader";
import { BulkIndexOperationConfirm } from "components/pages/database/indexes/list/BulkIndexOperationConfirm";
import { ConfirmResetIndex } from "components/pages/database/indexes/list/ConfirmResetIndex";
import { getAllIndexes, useIndexesPage } from "components/pages/database/indexes/list/useIndexesPage";
import { useEventsCollector } from "hooks/useEventsCollector";
import { NoIndexes } from "components/pages/database/indexes/list/partials/NoIndexes";
import { Icon } from "components/common/Icon";
import { ConfirmSwapSideBySideIndex } from "./ConfirmSwapSideBySideIndex";
import ActionContextUtils from "components/utils/actionContextUtils";
import ButtonWithSpinner from "components/common/ButtonWithSpinner";
import AboutViewFloating, { AccordionItemWrapper } from "components/common/AboutView";
import { getLicenseLimitReachStatus } from "components/utils/licenseLimitsUtils";
import { todo } from "common/developmentHelper";
import { useAppSelector } from "components/store";
import { licenseSelectors } from "components/common/shell/licenseSlice";
import { useRavenLink } from "components/hooks/useRavenLink";
import FeatureAvailabilitySummaryWrapper, {
    FeatureAvailabilityData,
} from "components/common/FeatureAvailabilitySummary";

interface IndexesPageProps {
    db: database;
    stale?: boolean;
    indexName?: string;
}

export function IndexesPage(props: IndexesPageProps) {
    const { db, stale, indexName: indexToHighlight } = props;

    const { canReadWriteDatabase } = useAccessManager();
    const { reportEvent } = useEventsCollector();

    const { forCurrentDatabase: urls } = useAppUrls();
    const newIndexUrl = urls.newIndex();

    const {
        loading,
        bulkOperationConfirm,
        setBulkOperationConfirm,
        resetIndexData,
        swapSideBySideData,
        stats,
        selectedIndexes,
        toggleSelectAll,
        onSelectCancel,
        filter,
        setFilter,
        filterByStatusOptions,
        filterByTypeOptions,
        groups,
        replacements,
        highlightCallback,
        confirmSetLockModeSelectedIndexes,
        allIndexesCount,
        setIndexPriority,
        startIndexes,
        disableIndexes,
        pauseIndexes,
        setIndexLockMode,
        toggleSelection,
        openFaulty,
        getSelectedIndexes,
        confirmDeleteIndexes,
        globalIndexingStatus,
    } = useIndexesPage(db, stale);

    const deleteSelectedIndexes = () => {
        reportEvent("indexes", "delete-selected");
        return confirmDeleteIndexes(db, getSelectedIndexes());
    };

    const startSelectedIndexes = () => startIndexes(getSelectedIndexes());
    const disableSelectedIndexes = () => disableIndexes(getSelectedIndexes());
    const pauseSelectedIndexes = () => pauseIndexes(getSelectedIndexes());

    const indexNames = getAllIndexes(groups, replacements).map((x) => x.name);

    const allActionContexts = ActionContextUtils.getContexts(db.getLocations());

    const isProfessionalOrAbove = useAppSelector(licenseSelectors.isProfessionalOrAbove());

    const upgradeLicenseLink = useRavenLink({ hash: "FLDLO4", isDocs: false });
    const overviewDocsLink = useRavenLink({ hash: "8VWNHJ" });
    const listDocsLink = useRavenLink({ hash: "7HOOEA" });

    const autoClusterLimit = useAppSelector(licenseSelectors.statusValue("MaxNumberOfAutoIndexesPerCluster"));
    const staticClusterLimit = useAppSelector(licenseSelectors.statusValue("MaxNumberOfStaticIndexesPerCluster"));
    const autoDatabaseLimit = useAppSelector(licenseSelectors.statusValue("MaxNumberOfAutoIndexesPerDatabase"));
    const staticDatabaseLimit = useAppSelector(licenseSelectors.statusValue("MaxNumberOfStaticIndexesPerDatabase"));

    const autoClusterCount = useAppSelector(licenseSelectors.limitsUsage).ClusterAutoIndexes;
    const staticClusterCount = useAppSelector(licenseSelectors.limitsUsage).ClusterStaticIndexes;

    const autoDatabaseCount = stats.indexes.filter((x) => IndexUtils.isAutoIndex(x)).length;
    const staticDatabaseCount = stats.indexes.length - autoDatabaseCount;

    const autoClusterLimitStatus = getLicenseLimitReachStatus(autoClusterCount, autoClusterLimit);
    const staticClusterLimitStatus = getLicenseLimitReachStatus(staticClusterCount, staticClusterLimit);

    const autoDatabaseLimitStatus = getLicenseLimitReachStatus(autoDatabaseCount, autoDatabaseLimit);
    const staticDatabaseLimitStatus = getLicenseLimitReachStatus(staticDatabaseCount, staticDatabaseLimit);

    const isNewIndexDisabled =
        !isProfessionalOrAbove &&
        (staticClusterLimitStatus === "limitReached" || staticDatabaseLimitStatus === "limitReached");

    todo("Other", "Damian", "Move limits to separate component");

    if (loading) {
        return <LoadingView />;
    }

    if (stats.indexes.length === 0) {
        return <NoIndexes database={db} />;
    }

    return (
        <>
            {!isProfessionalOrAbove && (
                <>
                    {staticClusterLimitStatus !== "notReached" && (
                        <Alert
                            color={staticClusterLimitStatus === "limitReached" ? "danger" : "warning"}
                            className="text-center mb-3"
                        >
                            Cluster {staticClusterLimitStatus === "limitReached" ? "has reached" : "is reaching"} the{" "}
                            <strong>maximum number of static indexes</strong> allowed per cluster by your license{" "}
                            <strong>
                                ({staticClusterCount}/{staticClusterLimit})
                            </strong>
                            <br /> Delete unused indexes or{" "}
                            <strong>
                                <a href={upgradeLicenseLink} target="_blank">
                                    upgrade your license
                                </a>
                            </strong>
                        </Alert>
                    )}

                    {autoClusterLimitStatus !== "notReached" && (
                        <Alert
                            color={autoClusterLimitStatus === "limitReached" ? "danger" : "warning"}
                            className="text-center mb-3"
                        >
                            Cluster {autoClusterLimitStatus === "limitReached" ? "has reached" : "is reaching"} the{" "}
                            <strong>maximum number of auto indexes</strong> allowed per cluster by your license{" "}
                            <strong>
                                ({autoClusterCount}/{autoClusterLimit})
                            </strong>
                            <br /> Delete unused indexes or{" "}
                            <strong>
                                <a href={upgradeLicenseLink} target="_blank">
                                    upgrade your license
                                </a>
                            </strong>
                        </Alert>
                    )}

                    {staticDatabaseLimitStatus !== "notReached" && (
                        <Alert
                            color={staticDatabaseLimitStatus === "limitReached" ? "danger" : "warning"}
                            className="text-center mb-3"
                        >
                            Database {staticDatabaseLimitStatus === "limitReached" ? "has reached" : "is reaching"} the{" "}
                            <strong>maximum number of static indexes</strong> allowed per database by your license{" "}
                            <strong>
                                ({staticDatabaseCount}/{staticDatabaseLimit})
                            </strong>
                            <br /> Delete unused indexes or{" "}
                            <strong>
                                <a href={upgradeLicenseLink} target="_blank">
                                    upgrade your license
                                </a>
                            </strong>
                        </Alert>
                    )}

                    {autoDatabaseLimitStatus !== "notReached" && (
                        <Alert
                            color={autoDatabaseLimitStatus === "limitReached" ? "danger" : "warning"}
                            className="text-center mb-3"
                        >
                            Database {autoDatabaseLimitStatus === "limitReached" ? "has reached" : "is reaching"} the{" "}
                            <strong>maximum number of auto indexes</strong> allowed per database by your license{" "}
                            <strong>
                                ({autoDatabaseCount}/{autoDatabaseLimit})
                            </strong>
                            <br /> Delete unused indexes or{" "}
                            <strong>
                                <a href={upgradeLicenseLink} target="_blank">
                                    upgrade your license
                                </a>
                            </strong>
                        </Alert>
                    )}
                </>
            )}
            {stats.indexes.length > 0 && (
                <StickyHeader>
                    <Row>
                        <Col className="hstack">
                            <div id="NewIndexButton">
                                <Button
                                    color="primary"
                                    href={newIndexUrl}
                                    disabled={isNewIndexDisabled}
                                    className="rounded-pill px-3 pe-auto"
                                >
                                    <Icon icon="index" addon="plus" />
                                    <span>New index</span>
                                </Button>
                            </div>

                            {isNewIndexDisabled && (
                                <UncontrolledPopover
                                    trigger="hover"
                                    target="NewIndexButton"
                                    placement="top"
                                    className="bs5"
                                >
                                    <div className="p-3 text-center">
                                        {staticClusterLimitStatus === "limitReached" ? "Cluster" : "Database"} has
                                        reached the maximum number of static indexes allowed per{" "}
                                        {staticClusterLimitStatus === "limitReached" ? "cluster" : "database"} by your
                                        license.
                                        <br />
                                        Delete unused indexes or{" "}
                                        <strong>
                                            <a href={upgradeLicenseLink} target="_blank">
                                                upgrade your license
                                            </a>
                                        </strong>
                                    </div>
                                </UncontrolledPopover>
                            )}
                        </Col>
                        <Col xs="auto">
                            <AboutViewFloating defaultOpen={isProfessionalOrAbove ? null : "licensing"}>
                                <AccordionItemWrapper
                                    icon="about"
                                    color="info"
                                    heading="About this view"
                                    description="Get additional info on this feature"
                                    targetId="about-view"
                                >
                                    <p>
                                        Manage all indexes in the database from this view.
                                        <br />
                                        The indexes are grouped based on their associated collections.
                                    </p>
                                    <ul>
                                        <li>
                                            <strong>Detailed information</strong> for each index is provided such as:
                                            <br />
                                            the index type and data source, its current state, staleness status, the
                                            number of index-entries, etc.
                                        </li>
                                        <li className="margin-top-xs">
                                            <strong>Various actions</strong> can be performed such as:
                                            <br />
                                            create a new index, modify existing, delete, restart, disable or pause
                                            indexing, set index priority, and more.
                                        </li>
                                    </ul>
                                    <hr />
                                    <div className="small-label mb-2">useful links</div>
                                    <a href={overviewDocsLink} target="_blank">
                                        <Icon icon="newtab" /> Docs - Indexes Overview
                                    </a>
                                    <br />
                                    <a href={listDocsLink} target="_blank">
                                        <Icon icon="newtab" /> Docs - Indexes List View
                                    </a>
                                </AccordionItemWrapper>
                                <FeatureAvailabilitySummaryWrapper
                                    isUnlimited={isProfessionalOrAbove}
                                    data={featureAvailability}
                                />
                            </AboutViewFloating>
                        </Col>
                    </Row>
                    <IndexFilter
                        filter={filter}
                        setFilter={(x) => setFilter(x)}
                        filterByStatusOptions={filterByStatusOptions}
                        filterByTypeOptions={filterByTypeOptions}
                        indexesCount={allIndexesCount}
                    />

                    {/*  TODO  <IndexGlobalIndexing /> */}

                    {canReadWriteDatabase(db) && (
                        <IndexSelectActions
                            indexNames={indexNames}
                            selectedIndexes={selectedIndexes}
                            deleteSelectedIndexes={deleteSelectedIndexes}
                            startSelectedIndexes={startSelectedIndexes}
                            disableSelectedIndexes={disableSelectedIndexes}
                            pauseSelectedIndexes={pauseSelectedIndexes}
                            setLockModeSelectedIndexes={confirmSetLockModeSelectedIndexes}
                            toggleSelectAll={toggleSelectAll}
                            onCancel={onSelectCancel}
                        />
                    )}
                </StickyHeader>
            )}
            <div className="indexes p-4 pt-0 no-transition">
                <div className="indexes-list">
                    {groups.map((group) => {
                        return (
                            <div className="mb-4" key={"group-" + group.name}>
                                <h2 className="mt-0" title={"Collection: " + group.name}>
                                    {group.name}
                                </h2>

                                {group.indexes.map((index) => {
                                    const replacement = replacements.find(
                                        (x) => x.name === IndexUtils.SideBySideIndexPrefix + index.name
                                    );
                                    return (
                                        <React.Fragment key={index.name}>
                                            <IndexPanel
                                                setPriority={(p) => setIndexPriority(index, p)}
                                                setLockMode={(l) => setIndexLockMode(index, l)}
                                                globalIndexingStatus={globalIndexingStatus}
                                                resetIndex={() => resetIndexData.setIndexName(index.name)}
                                                openFaulty={(location: databaseLocationSpecifier) =>
                                                    openFaulty(index, location)
                                                }
                                                startIndexing={() => startIndexes([index])}
                                                disableIndexing={() => disableIndexes([index])}
                                                pauseIndexing={() => pauseIndexes([index])}
                                                index={index}
                                                hasReplacement={!!replacement}
                                                database={db}
                                                deleteIndex={() => confirmDeleteIndexes(db, [index])}
                                                selected={selectedIndexes.includes(index.name)}
                                                toggleSelection={() => toggleSelection(index)}
                                                key={index.name}
                                                ref={indexToHighlight === index.name ? highlightCallback : undefined}
                                            />
                                            {replacement && (
                                                <Card className="mb-0 px-5 py-2 bg-faded-warning">
                                                    <div className="flex-horizontal">
                                                        <div className="title me-4">
                                                            <Icon icon="swap" /> Side by side
                                                        </div>
                                                        <ButtonWithSpinner
                                                            color="warning"
                                                            size="sm"
                                                            onClick={() => swapSideBySideData.setIndexName(index.name)}
                                                            title="Click to replace the current index definition with the replacement index"
                                                            isSpinning={swapSideBySideData.inProgress(index.name)}
                                                            icon="force"
                                                        >
                                                            Swap now
                                                        </ButtonWithSpinner>
                                                    </div>
                                                </Card>
                                            )}
                                            {replacement && (
                                                <IndexPanel
                                                    setPriority={(p) => setIndexPriority(replacement, p)}
                                                    setLockMode={(l) => setIndexLockMode(replacement, l)}
                                                    globalIndexingStatus={globalIndexingStatus}
                                                    resetIndex={() => resetIndexData.setIndexName(replacement.name)}
                                                    openFaulty={(location: databaseLocationSpecifier) =>
                                                        openFaulty(replacement, location)
                                                    }
                                                    startIndexing={() => startIndexes([replacement])}
                                                    disableIndexing={() => disableIndexes([replacement])}
                                                    pauseIndexing={() => pauseIndexes([replacement])}
                                                    index={replacement}
                                                    database={db}
                                                    deleteIndex={() => confirmDeleteIndexes(db, [replacement])}
                                                    selected={selectedIndexes.includes(replacement.name)}
                                                    toggleSelection={() => toggleSelection(replacement)}
                                                    key={replacement.name}
                                                    ref={undefined}
                                                />
                                            )}
                                        </React.Fragment>
                                    );
                                })}
                            </div>
                        );
                    })}
                </div>
            </div>

            {bulkOperationConfirm && (
                <BulkIndexOperationConfirm {...bulkOperationConfirm} toggle={() => setBulkOperationConfirm(null)} />
            )}
            {resetIndexData.indexName && (
                <ConfirmResetIndex
                    indexName={resetIndexData.indexName}
                    toggle={() => resetIndexData.setIndexName(null)}
                    onConfirm={(x) => resetIndexData.onConfirm(x)}
                    allActionContexts={allActionContexts}
                />
            )}
            {swapSideBySideData.indexName && (
                <ConfirmSwapSideBySideIndex
                    indexName={swapSideBySideData.indexName}
                    toggle={() => swapSideBySideData.setIndexName(null)}
                    onConfirm={(x) => swapSideBySideData.onConfirm(x)}
                    allActionContexts={allActionContexts}
                />
            )}
        </>
    );
}

export const featureAvailability: FeatureAvailabilityData[] = [
    {
        featureName: "Database static indexes limit",
        community: { value: 12 },
        professional: { value: Infinity },
        enterprise: { value: Infinity },
    },
    {
        featureName: "Database auto indexes limit",
        community: { value: 24 },
        professional: { value: Infinity },
        enterprise: { value: Infinity },
    },
    {
        featureName: "Cluster static indexes limit",
        community: { value: 60 },
        professional: { value: Infinity },
        enterprise: { value: Infinity },
    },
    {
        featureName: "Cluster auto indexes limit",
        community: { value: 120 },
        professional: { value: Infinity },
        enterprise: { value: Infinity },
    },
];
