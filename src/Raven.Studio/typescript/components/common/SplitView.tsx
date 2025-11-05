import { createContext, CSSProperties, ReactNode, useContext } from "react";
import ColumnResize from "./ColumnResize";
import useResizableWidth from "components/hooks/useResizableWidth";
import classNames from "classnames";
import SizeGetter from "./SizeGetter";

type Width = number | `${number}%`;

interface SplitViewProps {
    children: ReactNode;
    isPanelOpen: boolean;
    isPanelPinned?: boolean;
    initialPanelWidth?: Width;
    minPanelWidth?: Width;
    maxPanelWidth?: Width;
    className?: string;
}

function SplitView(props: SplitViewProps) {
    return <SizeGetter render={({ width }) => <SplitViewWithSize viewWidthInPx={width} {...props} />} />;
}

function SplitViewWithSize({
    children,
    className,
    isPanelOpen,
    isPanelPinned,
    maxPanelWidth = "75%",
    initialPanelWidth = "50%",
    minPanelWidth = "30%",
    viewWidthInPx,
}: SplitViewProps & { viewWidthInPx: number }) {
    const getWidthInPx = (width: Width): number => {
        if (typeof width === "number") {
            return width;
        }
        return (Number(width.replace("%", "")) / 100) * viewWidthInPx;
    };

    const initialPanelWidthInPx = getWidthInPx(initialPanelWidth);
    const minPanelWidthInPx = getWidthInPx(minPanelWidth);
    const maxPanelWidthInPx = getWidthInPx(maxPanelWidth);

    const resizable = useResizableWidth({
        initialWidth: initialPanelWidthInPx,
        minWidth: minPanelWidthInPx,
        maxWidth: maxPanelWidthInPx,
    });

    return (
        <SplitViewContext.Provider
            value={{
                isPanelOpen,
                isPanelPinned,
                viewWidthInPx,
                resizable,
            }}
        >
            <div className={classNames("d-flex h-100 w-100", className)}>{children}</div>
        </SplitViewContext.Provider>
    );
}

const SplitViewContext = createContext<{
    isPanelOpen: boolean;
    isPanelPinned: boolean;
    viewWidthInPx: number;
    resizable: ReturnType<typeof useResizableWidth>;
}>(null);

function useSplitViewContext() {
    const context = useContext(SplitViewContext);

    if (!context) {
        throw new Error("SplitView.* component must be rendered as child of SplitView.");
    }

    return context;
}

interface BodyProps {
    children: ReactNode;
    className?: string;
}

function Body({ children, className }: BodyProps) {
    const { viewWidthInPx, resizable } = useSplitViewContext();

    return (
        <div className={classNames("flex-grow-1 h-100", className)} style={{ width: viewWidthInPx - resizable.width }}>
            {children}
        </div>
    );
}

interface SheetProps {
    children: ReactNode;
    className?: string;
}

function Panel({ children, className }: React.PropsWithChildren<SheetProps>) {
    const { isPanelOpen, isPanelPinned, resizable } = useSplitViewContext();

    if (!isPanelOpen) {
        return null;
    }

    const positionStyle: CSSProperties = isPanelPinned
        ? { position: "relative" }
        : { position: "absolute", right: 0, top: 0, bottom: 0 };

    return (
        <div
            className={classNames("h-100", className)}
            style={{
                ...positionStyle,
                borderLeft: `1px solid ${resizable.isDragging ? "#ccc" : "#4c4c63"}`,
                width: resizable.width,
                zIndex: 1000,
            }}
        >
            <ColumnResize handleMouseDown={resizable.handleMouseDown} />
            {children}
        </div>
    );
}

SplitView.Body = Body;
SplitView.Panel = Panel;

export default SplitView;
