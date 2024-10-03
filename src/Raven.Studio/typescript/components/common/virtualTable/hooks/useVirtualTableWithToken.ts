import { useEffect, useRef, useState } from "react";
import { useAsync, useAsyncCallback } from "react-async-hook";
import { virtualTableConstants } from "../utils/virtualTableConstants";

type FetchData<T extends pagedResultWithToken<unknown>> = (
    skip: number,
    take: number,
    continuationToken?: string
) => Promise<T>;

interface UseVirtualTableWithTokenProps<T extends pagedResultWithToken<unknown>> {
    fetchData: FetchData<T>;
    initialOverscan?: number;
}

export function useVirtualTableWithToken<T extends pagedResultWithToken<unknown>>({
    fetchData,
    initialOverscan = 50,
}: UseVirtualTableWithTokenProps<T>) {
    const tableContainerRef = useRef<HTMLDivElement>(null);

    const initialItemsCount = Math.ceil(window.innerHeight / defaultRowHeightInPx) + initialOverscan;

    const [dataArray, setDataArray] = useState<T["items"]>([]);
    const [continuationToken, setContinuationToken] = useState<string>();
    const [totalResultCount, setTotalResultCount] = useState<number>(0);

    const asyncLoadInitialData = useAsync(async () => {
        const result = await fetchData(0, initialItemsCount);

        setDataArray(result.items);
        setContinuationToken(result.continuationToken);
        setTotalResultCount(result.totalResultCount);
    }, []);

    const asyncLoadData = useAsyncCallback(async () => {
        const result = await fetchData(null, null, continuationToken);

        // TODO if no continuationToken and some left then ... idk

        setDataArray((prev) => [...prev, ...result.items]);
        setContinuationToken(result.continuationToken);
    });

    // Handle scroll
    useEffect(() => {
        if (!tableContainerRef.current) {
            return;
        }
        let isFetching = false;

        const handleScroll = async (e: Event) => {
            if (totalResultCount > 0 && totalResultCount === dataArray.length) {
                return;
            }

            const target = e.target as HTMLDivElement;
            const positionToFetch = target.scrollHeight - target.clientHeight - defaultRowHeightInPx;

            if (target.scrollTop >= positionToFetch) {
                if (isFetching) {
                    return;
                }

                isFetching = true;
                await asyncLoadData.execute();
            } else {
                isFetching = false;
            }
        };

        const current = tableContainerRef.current;
        current.addEventListener("scroll", handleScroll);

        return () => {
            current.removeEventListener("scroll", handleScroll);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return {
        dataArray,
        componentProps: {
            tableContainerRef,
            isLoading: asyncLoadInitialData.loading || asyncLoadData.loading,
        },
    };
}

const { defaultRowHeightInPx } = virtualTableConstants;
