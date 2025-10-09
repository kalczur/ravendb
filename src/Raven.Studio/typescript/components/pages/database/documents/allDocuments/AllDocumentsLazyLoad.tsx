import { useReactTable, getCoreRowModel } from "@tanstack/react-table";
import { databaseSelectors } from "components/common/shell/databaseSliceSelectors";
import SizeGetter from "components/common/SizeGetter";
import { useVirtualTableWithLazyLoading } from "components/common/virtualTable/hooks/useVirtualTableWithLazyLoading";
import VirtualTableWithLazyLoading from "components/common/virtualTable/VirtualTableWithLazyLoading";
import { useServices } from "components/hooks/useServices";
import { useAppSelector } from "components/store";
import { useDocumentColumnsProvider } from "components/common/virtualTable/columnProviders/useDocumentColumnsProvider";

export default function AllDocumentsLazyLoad() {
    return (
        <div className="content-padding vstack">
            <h2>React Lazy Load</h2>
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

    const { dataPreview, componentProps } = useVirtualTableWithLazyLoading({
        fetchData: (skip: number, take: number) => {
            if (databaseName) {
                return databasesService.getDocumentsPreview(databaseName, skip, take, undefined);
            }

            return Promise.resolve({
                items: [],
                totalResultCount: 0,
            });
        },
        dependencies: [],
    });

    const { columnDefs } = useDocumentColumnsProvider({
        documents: dataPreview,
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
        data: dataPreview,
        columnResizeMode: "onChange",
        getCoreRowModel: getCoreRowModel(),
    });

    return <VirtualTableWithLazyLoading {...componentProps} table={table} heightInPx={height} />;
}
