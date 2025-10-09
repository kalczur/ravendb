import { useReactTable, getCoreRowModel } from "@tanstack/react-table";
import { databaseSelectors } from "components/common/shell/databaseSliceSelectors";
import SizeGetter from "components/common/SizeGetter";
import { useDocumentColumnsProvider } from "components/common/virtualTable/columnProviders/useDocumentColumnsProvider";
import { useServices } from "components/hooks/useServices";
import { useAppSelector } from "components/store";
import { useMemo, useState } from "react";
import VirtualTable from "components/common/virtualTable/VirtualTable";
import { virtualTableConstants } from "components/common/virtualTable/utils/virtualTableConstants";
import CustomPagination from "components/common/Pagination";
import Form from "react-bootstrap/Form";
import Select from "components/common/select/Select";
import { SelectOption } from "components/common/select/Select";
import { useAsync } from "react-async-hook";
import document from "models/database/documents/document";

export default function AllDocumentsPagination() {
    return (
        <div className="content-padding vstack">
            <h2>React Pagination</h2>
            <div className="flex-grow">
                <SizeGetter isHeighRequired render={(size) => <AllDocuments {...size} />} />
            </div>
        </div>
    );
}

interface AllDocumentsProps {
    width: number;
    height: number;
}

function AllDocuments({ height }: AllDocumentsProps) {
    const databaseName = useAppSelector(databaseSelectors.activeDatabaseName);
    const { databasesService } = useServices();

    const defaultPageSize = Math.floor(
        (height - virtualTableConstants.paddingInPx - virtualTableConstants.headerHeightInPx - paginationHeightInPx) /
            virtualTableConstants.defaultRowHeightInPx
    );

    const [pageSize, setPageSize] = useState(defaultPageSize);

    const [page, setPage] = useState(1);
    const [maxPage, setMaxPage] = useState(1);

    const sizeOptions = useMemo(() => {
        return [
            { label: `Default (${defaultPageSize})`, value: defaultPageSize },
            { label: "10", value: 10 },
            { label: "50", value: 50 },
            { label: "100", value: 100 },
            { label: "200", value: 200 },
        ] satisfies SelectOption<number>[];
    }, [defaultPageSize]);

    const [documents, setDocuments] = useState<document[]>([]);

    const asyncGetPreview = useAsync(async () => {
        if (databaseName) {
            const skip = (page - 1) * pageSize;
            const take = pageSize;

            const result = await databasesService.getDocumentsPreview(databaseName, skip, take, undefined);
            setDocuments(result.items);
            setMaxPage(Math.ceil(result.totalResultCount / pageSize));
        }
    }, [page, pageSize]);

    const { columnDefs } = useDocumentColumnsProvider({
        documents,
        hasPreview: true,
        hasFlags: true,
        hasCheckbox: true,
        hasHyperlinkForIds: true,
    });

    const table = useReactTable({
        defaultColumn: {
            enableSorting: false,
            enableColumnFilter: false,
        },
        columns: columnDefs,
        data: documents,
        columnResizeMode: "onChange",
        getCoreRowModel: getCoreRowModel(),
    });

    return (
        <div>
            <VirtualTable
                table={table}
                heightInPx={height - paginationHeightInPx}
                isLoading={asyncGetPreview.loading}
            />
            <div className="d-flex justify-content-center align-items-baseline mt-2 gap-2">
                <CustomPagination page={page} totalPages={maxPage} onPageChange={setPage} />
                <div>Go to page:</div>
                <Form.Control
                    type="number"
                    onChange={(x) => setPage(Number(x.currentTarget.value || 1))}
                    value={page}
                    placeholder="Enter page"
                    style={{ width: "100px", minHeight: "32px", height: "32px", padding: 8 }}
                    max={maxPage}
                    min={1}
                />
                <div>Result per page:</div>
                <Select
                    onChange={(x) => setPageSize(x.value)}
                    value={sizeOptions.find((x) => x.value === pageSize)}
                    options={sizeOptions}
                    menuPlacement="top"
                    styles={{
                        container: (base) => ({
                            ...base,
                            width: "200px",
                            maxWidth: "200px",
                        }),
                    }}
                />
            </div>
        </div>
    );
}

const paginationHeightInPx = 80;
