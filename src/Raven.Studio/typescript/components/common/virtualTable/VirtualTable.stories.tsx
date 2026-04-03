import { Meta, StoryObj } from "@storybook/react-webpack5";
import { withStorybookContexts, withBootstrap5 } from "test/storybookTestUtils";
import VirtualTable from "./VirtualTable";
import document from "models/database/documents/document";
import { useDocumentColumnsProvider } from "./columnProviders/useDocumentColumnsProvider";
import { mockStore } from "test/mocks/store/MockStore";
import { createElement, useMemo, useRef, useState } from "react";
import {
    useReactTable,
    getCoreRowModel,
    getSortedRowModel,
    ColumnDef,
    getFilteredRowModel,
    ColumnFiltersState,
    flexRender,
} from "@tanstack/react-table";
import TableDisplaySettings from "./commonComponents/columnsSelect/TableDisplaySettings";
import { FlexGrow } from "components/common/FlexGrow";
import { CellValueWrapper } from "./cells/CellValue";
import { useVirtualTableWithToken } from "components/common/virtualTable/hooks/useVirtualTableWithToken";
import { useVirtualTableWithLazyLoading } from "components/common/virtualTable/hooks/useVirtualTableWithLazyLoading";
import VirtualTableWithLazyLoading from "components/common/virtualTable/VirtualTableWithLazyLoading";
import Button from "react-bootstrap/Button";

// copied from queryCommand
const selector = (
    results: Raven.Client.Documents.Queries.QueryResult<Array<any>, any>
): pagedResultExtended<document> => ({
    items: results.Results.map((d) => new document(d)),
    totalResultCount: results.CappedMaxResults || results.TotalResults,
    additionalResultInfo: results,
    resultEtag: results.ResultEtag.toString(),
    highlightings: results.Highlightings,
    explanations: results.Explanations,
    timings: results.Timings,
    queryPlan: (results.Timings as any)?.QueryPlan,
    includes: results.Includes,
    includesRevisions: results.RevisionIncludes,
});

const queryCommandResult: pagedResultExtended<document> = selector(require("../../../test/fixtures/query_result.json"));

export default {
    title: "Bits/Virtual Table",
    decorators: [withStorybookContexts, withBootstrap5],
    parameters: {
        design: {
            type: "figma",
            url: "https://www.figma.com/design/ITHbe2U19Ok7cjbEzYa4cb/Design-System-RavenDB-Studio?node-id=15-838",
        },
    },
} satisfies Meta;

export const VirtualTableStory: StoryObj = {
    name: "Default",
    render: () => {
        const { collectionsTracker } = mockStore;
        collectionsTracker.with_Collections();

        return <VirtualTableExample />;
    },
};

export const VirtualTableWithLazyLoadingStory: StoryObj = {
    name: "With lazy loading",
    render: VirtualTableWithLazyLoadingExample,
};

export const VirtualTableWithTokenStory: StoryObj = {
    name: "With token (infinite scroll)",
    render: VirtualTableWithTokenExample,
};

const CELL_PADDING_X = 12 * 2;

function VirtualTableExample() {
    const tableContainerRef = useRef<HTMLDivElement>(null);

    const { columnDefs, initialColumnVisibility } = useDocumentColumnsProvider({
        documents: queryCommandResult.items,
        availableWidth: window.innerWidth,
        hasCheckbox: true,
        hasPreview: true,
        hasFlags: true,
    });

    const [rowSelection, setRowSelection] = useState({});
    const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>(initialColumnVisibility);

    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

    const table = useReactTable({
        data: queryCommandResult.items,
        columns: columnDefs,
        columnResizeMode: "onChange",
        state: {
            rowSelection,
            columnVisibility,
            columnFilters,
        },
        onColumnFiltersChange: setColumnFilters,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        onRowSelectionChange: setRowSelection,
        onColumnVisibilityChange: setColumnVisibility,
    });

    const context = useMemo(() => {
        const canvas = window.document.createElement("canvas");
        const context = canvas.getContext("2d");
        context.font = "14px Figtree";
        return context;
    }, []);

    const autoSizeColumns = () => {
        const rows = table.getRowModel().rows;
        const newSizing: Record<string, number> = {};

        // For text columns measure all cells
        for (const row of rows) {
            const cells = row.getVisibleCells();

            for (let cellIdx = 0; cellIdx < cells.length; cellIdx++) {
                const cell = cells[cellIdx];
                const columnId = cell.column.id;
                const value = cell.getValue();

                if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
                    newSizing[columnId] = Math.max(
                        newSizing[columnId] ?? 0,
                        context.measureText(String(value)).width + CELL_PADDING_X
                    );
                }
            }
        }

        // For non-text columns measure elements available in DOM
        const firstRowCells = table.getRowModel().rows[0].getVisibleCells();
        for (let cellIdx = 0; cellIdx < firstRowCells.length; cellIdx++) {
            const cell = firstRowCells[cellIdx];
            const columnId = cell.column.id;

            if (!newSizing[columnId]) {
                tableContainerRef.current?.querySelectorAll(`tbody tr td:nth-child(${cellIdx + 1})`).forEach((td) => {
                    const cellContent = td.firstElementChild;
                    if (cellContent) {
                        newSizing[columnId] = Math.max(
                            newSizing[columnId] ?? 0,
                            cellContent.getBoundingClientRect().width + CELL_PADDING_X
                        );
                    }
                });
            }
        }

        table.setColumnSizing((prev) => ({
            ...prev,
            ...newSizing,
        }));
    };

    return (
        <div>
            <div className="d-flex mb-2">
                <FlexGrow />
                <TableDisplaySettings table={table} />
            </div>
            <VirtualTable table={table} tableContainerRef={tableContainerRef} heightInPx={400} />
            <hr />
            <h5>Selected Items:</h5>
            <pre>{JSON.stringify(rowSelection, null, 2)}</pre>
            <h5>Column filter:</h5>
            <pre>{JSON.stringify(columnFilters, null, 2)}</pre>
            <Button className="me-2" variant="primary" onClick={autoSizeColumns}>
                Auto size
            </Button>
            <Button variant="primary" onClick={() => table.resetColumnSizing()}>
                Reset size
            </Button>
        </div>
    );
}

function VirtualTableWithLazyLoadingExample() {
    const { dataPreview, componentProps } = useVirtualTableWithLazyLoading({ fetchData: fetchPagedResultData });

    const table = useReactTable({
        defaultColumn: {
            enableSorting: false,
        },
        data: dataPreview,
        columns: itemColumnDefs,
        columnResizeMode: "onChange",
        getCoreRowModel: getCoreRowModel(),
    });

    return (
        <div>
            <h2>100M items</h2>
            <VirtualTableWithLazyLoading {...componentProps} table={table} heightInPx={500} />
        </div>
    );
}

function VirtualTableWithTokenExample() {
    const fetchData = useMemo(() => fetchPagedResultWithToken(100), []);

    const { dataArray, componentProps } = useVirtualTableWithToken({ fetchData });

    const table = useReactTable({
        defaultColumn: {
            enableSorting: false,
            enableColumnFilter: false,
        },
        columns: itemColumnDefs,
        data: dataArray,
        columnResizeMode: "onChange",
        getCoreRowModel: getCoreRowModel(),
    });

    return (
        <div>
            <h2>Infinity scroll</h2>
            <VirtualTable {...componentProps} table={table} heightInPx={500} />
        </div>
    );
}

interface Item {
    id: number;
    name: string;
}

// mocked fetcher with 100_000_001 items
function fetchPagedResultData(skip: number, take: number): Promise<pagedResult<Item>> {
    const items: Item[] = new Array(take).fill(null).map((_, i) => {
        return {
            id: skip + i,
            name: `Item ${skip + i}`,
        };
    });

    return new Promise((resolve) => {
        setTimeout(() => {
            resolve({
                totalResultCount: 100_000_001,
                items,
            });
        }, 200);
    });
}

function fetchPagedResultWithToken(take: number): () => Promise<pagedResultWithToken<Item>> {
    const initialTake = take;
    let lastFetchedIndex = 0;

    return () => {
        const items: Item[] = new Array(initialTake).fill(null).map((_, i) => {
            return {
                id: lastFetchedIndex + i,
                name: `Item ${lastFetchedIndex + i}`,
            };
        });

        lastFetchedIndex += initialTake;

        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({
                    totalResultCount: 100_000_001,
                    items,
                    continuationToken: "continuationToken",
                });
            }, 200);
        });
    };
}

function getAutoSizedColumnWidth<T>({
    tableContainer,
    table,
    columnId,
}: {
    tableContainer: HTMLDivElement;
    table: ReturnType<typeof useReactTable<T>>;
    columnId: string;
}) {
    const visibleColumns = table.getVisibleLeafColumns();
    const visibleColumnIndex = visibleColumns.findIndex((column) => column.id === columnId);

    if (visibleColumnIndex === -1) {
        return table.getColumn(columnId)?.getSize() ?? 0;
    }

    const headerElement = tableContainer.querySelector(
        `thead th:nth-child(${visibleColumnIndex + 1})`
    ) as HTMLElement | null;
    const cellElement = tableContainer.querySelector(
        `tbody td:nth-child(${visibleColumnIndex + 1})`
    ) as HTMLElement | null;

    const headerWidth = measureHeaderWidth(headerElement);
    const largestCellWidth = measureLargestCellWidth({
        table,
        columnId,
        sampleCellElement: cellElement,
    });

    return Math.ceil(Math.max(headerWidth, largestCellWidth));
}

function measureHeaderWidth(headerElement: HTMLElement | null) {
    if (!headerElement) {
        return 0;
    }

    const computedStyle = window.getComputedStyle(headerElement);
    return headerElement.scrollWidth + getHorizontalBorderWidth(computedStyle) + 8;
}

function measureLargestCellWidth<T>({
    table,
    columnId,
    sampleCellElement,
}: {
    table: ReturnType<typeof useReactTable<T>>;
    columnId: string;
    sampleCellElement: HTMLElement | null;
}) {
    const measurementElement = window.document.createElement("span");
    const sampleContentElement = sampleCellElement?.firstElementChild as HTMLElement | null;
    const typographySource = sampleContentElement ?? sampleCellElement;

    measurementElement.style.position = "absolute";
    measurementElement.style.visibility = "hidden";
    measurementElement.style.whiteSpace = "nowrap";
    measurementElement.style.pointerEvents = "none";
    measurementElement.style.left = "-9999px";
    measurementElement.style.top = "0";

    if (typographySource) {
        const computedStyle = window.getComputedStyle(typographySource);
        measurementElement.style.font = computedStyle.font;
        measurementElement.style.fontFamily = computedStyle.fontFamily;
        measurementElement.style.fontSize = computedStyle.fontSize;
        measurementElement.style.fontWeight = computedStyle.fontWeight;
        measurementElement.style.letterSpacing = computedStyle.letterSpacing;
        measurementElement.style.textTransform = computedStyle.textTransform;
    }

    window.document.body.appendChild(measurementElement);

    let largestContentWidth = 0;

    for (const row of table.getRowModel().rows) {
        const cell = row.getVisibleCells().find((candidate) => candidate.column.id === columnId);

        if (!cell) {
            continue;
        }

        measurementElement.textContent = getCellMeasurementText(cell.getValue());
        largestContentWidth = Math.max(largestContentWidth, measurementElement.getBoundingClientRect().width);
    }

    measurementElement.remove();

    if (!sampleCellElement) {
        return largestContentWidth;
    }

    const computedStyle = window.getComputedStyle(sampleCellElement);
    return largestContentWidth + getHorizontalPaddingWidth(computedStyle) + getHorizontalBorderWidth(computedStyle) + 2;
}

function getCellMeasurementText(value: unknown) {
    if (value === undefined) {
        return "";
    }

    if (value === null) {
        return "null";
    }

    if (typeof value === "number") {
        return value.toLocaleString();
    }

    if (typeof value === "object") {
        return Array.isArray(value) ? `[...]${value.length}` : `{...}${Object.keys(value).length}`;
    }

    return String(value);
}

function getHorizontalPaddingWidth(computedStyle: CSSStyleDeclaration) {
    return getCssPixels(computedStyle.paddingLeft) + getCssPixels(computedStyle.paddingRight);
}

function getHorizontalBorderWidth(computedStyle: CSSStyleDeclaration) {
    return getCssPixels(computedStyle.borderLeftWidth) + getCssPixels(computedStyle.borderRightWidth);
}

function getCssPixels(value: string) {
    return Number.parseFloat(value) || 0;
}

const itemColumnDefs: ColumnDef<Item>[] = [
    {
        header: "Index",
        accessorKey: "id",
        cell: CellValueWrapper,
        size: 300,
    },
    {
        header: "Name",
        accessorKey: "name",
        cell: CellValueWrapper,
        size: 500,
    },
];
