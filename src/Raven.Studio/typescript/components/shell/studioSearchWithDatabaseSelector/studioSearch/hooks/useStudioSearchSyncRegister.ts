import accessManager from "common/shell/accessManager";
import databasesManager from "common/shell/databasesManager";
import intermediateMenuItem from "common/shell/menu/intermediateMenuItem";
import leafMenuItem from "common/shell/menu/leafMenuItem";
import {
    StudioSearchMenuItemType,
    StudioSearchItem,
    StudioSearchItemType,
    StudioSearchItemEvent,
} from "../studioSearchTypes";
import { exhaustiveStringTuple } from "components/utils/common";
import { useEffect, useCallback, useMemo } from "react";
import IconName from "typings/server/icons";
import { OmniSearch } from "common/omniSearch/omniSearch";
import { useAppUrls } from "components/hooks/useAppUrls";
import generateMenuItems from "common/shell/menu/generateMenuItems";
import { collectionsTrackerSelectors } from "components/common/shell/collectionsTrackerSlice";
import { databaseSelectors } from "components/common/shell/databaseSliceSelectors";
import { useAppSelector } from "components/store";

interface UseStudioSearchSyncRegisterParams {
    omniSearch: OmniSearch<StudioSearchItem, StudioSearchItemType>;
    goToUrl: (url: string, newTab: boolean) => void;
    resetDropdown: () => void;
}

export function useStudioSearchSyncRegister(props: UseStudioSearchSyncRegisterParams) {
    const { omniSearch, goToUrl, resetDropdown } = props;

    const activeDatabaseName = useAppSelector(databaseSelectors.activeDatabaseName);
    const allDatabaseNames = useAppSelector(databaseSelectors.allDatabaseNames);
    const collectionNames = useAppSelector(collectionsTrackerSelectors.collectionNames);

    const menuItems = useMemo(() => generateMenuItems(activeDatabaseName), [activeDatabaseName]);

    const { appUrl } = useAppUrls();

    const goToMenuItem = useCallback(
        (item: leafMenuItem, event: StudioSearchItemEvent) => {
            const url = item.dynamicHash();
            goToUrl(url, event.ctrlKey);
        },
        [goToUrl]
    );

    const goToCollection = useCallback(
        (collectionName: string, event: StudioSearchItemEvent) => {
            const url = appUrl.forDocuments(collectionName, activeDatabaseName);
            goToUrl(url, event.ctrlKey);
        },
        [activeDatabaseName, appUrl, goToUrl]
    );

    const handleDatabaseSwitch = useCallback(
        (databaseName: string, e: StudioSearchItemEvent) => {
            resetDropdown();

            if (e.ctrlKey) {
                window.open(appUrl.forDocumentsByDatabaseName(null, databaseName));
            }
            const db = databasesManager.default.getDatabaseByName(databaseName);
            databasesManager.default.activate(db);
        },
        [resetDropdown, appUrl]
    );

    // Register collections
    useEffect(() => {
        omniSearch.register(
            "collection",
            collectionNames.map((name) => ({
                type: "collection",
                icon: "documents",
                onSelected: (e) => goToCollection(name, e),
                text: name,
            }))
        );
    }, [collectionNames, goToCollection, omniSearch]);

    // Register databases
    useEffect(() => {
        omniSearch.register(
            "database",
            allDatabaseNames.map((databaseName) => ({
                type: "database",
                icon: "database",
                onSelected: (e) => handleDatabaseSwitch(databaseName, e),
                text: databaseName,
            }))
        );
    }, [allDatabaseNames, appUrl, omniSearch, handleDatabaseSwitch]);

    const getMenuItemType = useCallback(
        (route: string): StudioSearchMenuItemType => {
            if (route === "virtual") {
                return null;
            }

            const isDatabaseRoute = getIsDatabaseRoute(route);

            if (isDatabaseRoute && !activeDatabaseName) {
                return "serverMenuItem";
            }

            if (isDatabaseRoute) {
                if (route.startsWith("databases/tasks")) {
                    return "tasksMenuItem";
                }
                if (route.startsWith("databases/indexes") || route.startsWith("databases/query")) {
                    return "indexesMenuItem";
                }
                if (route.startsWith("databases/documents")) {
                    return "documentsMenuItem";
                }
                if (route.startsWith("databases/settings")) {
                    return "settingsMenuItem";
                }
                if (route.startsWith("databases/status")) {
                    return "statsMenuItem";
                }
            }

            return "serverMenuItem";
        },
        [activeDatabaseName]
    );

    // Register menu items
    useEffect(() => {
        const searchItems: StudioSearchItem[] = [];
        const menuLeafs: leafMenuItem[] = [];

        const crawlMenu = (item: menuItem) => {
            if (item instanceof leafMenuItem) {
                menuLeafs.push(item);
            } else if (item instanceof intermediateMenuItem) {
                item.children.forEach(crawlMenu);
            }
        };

        menuItems.forEach(crawlMenu);

        menuLeafs.forEach((item) => {
            if (ko.unwrap(item.nav) && !item.alias) {
                const canHandle = item.requiredAccess
                    ? accessManager.canHandleOperation(item.requiredAccess, activeDatabaseName)
                    : true;

                if (!canHandle) {
                    return;
                }

                const firstRoute = (Array.isArray(item.route) ? item.route[0] : item.route) ?? "";
                const type = getMenuItemType(firstRoute);

                if (type === null) {
                    return;
                }

                searchItems.push({
                    type,
                    text: item.title,
                    route: firstRoute,
                    alternativeTexts: item.search?.alternativeTitles ?? [],
                    icon: item.css.replace("icon-", "") as IconName,
                    onSelected: (e) => goToMenuItem(item, e),
                    innerActions: (item.search?.innerActions ?? []).map((x) => ({
                        text: x.name,
                        alternativeTexts: x.alternativeNames,
                    })),
                });
            }
        });

        const allMenuItemTypes = exhaustiveStringTuple<StudioSearchMenuItemType>()(
            "serverMenuItem",
            "documentsMenuItem",
            "indexesMenuItem",
            "tasksMenuItem",
            "settingsMenuItem",
            "statsMenuItem"
        );

        allMenuItemTypes.forEach((type) => {
            omniSearch.register(
                type,
                searchItems.filter((x) => x.type === type)
            );
        });
    }, [activeDatabaseName, menuItems, omniSearch, goToMenuItem, getMenuItemType]);
}

function getIsDatabaseRoute(route: string): boolean {
    if (route === "databases") {
        return false;
    }

    return route.startsWith("databases");
}
