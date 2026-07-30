import { useId, useLayoutEffect, useRef, useState, type PointerEvent, type UIEvent } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/shadcn/ui/button";
import { Label } from "@/components/shadcn/ui/label";
import { Switch } from "@/components/shadcn/ui/switch";
import { formatCompact } from "@/lib/format";
import { cn } from "@/lib/utils";
import { CdcBatchDetails } from "@/pages/apps/cdc-batch-details";
import { CDC_BATCH_STATES } from "@/pages/apps/cdc-batch-state";
import { formatCdcDuration, formatCdcTime } from "@/pages/apps/cdc-format";
import {
    BATCH_SPACING_IN_PX,
    IDLE_LABEL_MIN_WIDTH_IN_PX,
    buildCdcTimelineLayout,
    buildCdcTimelineTicks,
    findCdcTimelineWindow,
    type CdcTimelineBatchCell,
    type CdcTimelineCell,
    type CdcTimelineIdleCell,
    type CdcTimelineTick,
} from "@/pages/apps/cdc-timeline-layout";
import type { CdcLiveBatch } from "@/pages/apps/use-cdc-live-performance";

const RULER_HEIGHT_IN_PX = 28;
const TRACK_HEIGHT_IN_PX = 68;
const TICK_SPACING_IN_PX = 160;
// Rendered beyond both edges of the viewport, so a pan reveals cells that are already mounted.
const OVERSCAN_IN_PX = 400;
const PAN_STEP_RATIO = 0.85;
// Short travel still counts as a click on a bar rather than a pan.
const DRAG_THRESHOLD_IN_PX = 4;
// Slack around the right edge so a resting scroll position still counts as "at the latest".
const AT_LATEST_THRESHOLD_IN_PX = 24;
// How far the view has to travel back before it reads as the user leaving the live tail.
const SCROLL_BACK_SLACK_IN_PX = 8;
// Keeps the playhead inside the scrollable content when it sits at the live edge.
const PLAYHEAD_EDGE_INSET_IN_PX = 10;

export function CdcTimeline({ batches }: { batches: CdcLiveBatch[] }) {
    if (batches.length === 0) {
        return (
            <div className="rounded-lg border">
                <p className="py-12 text-center text-sm text-muted-foreground">No batches yet.</p>
            </div>
        );
    }

    return <CdcTimelineChart batches={batches} />;
}

function CdcTimelineChart({ batches }: { batches: CdcLiveBatch[] }) {
    const idleId = useId();
    const scrollRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    const wasDraggedRef = useRef(false);
    // Batch to bring back under the viewport once the axis has been rescaled.
    const anchorKeyRef = useRef<string | null>(null);
    // Furthest offset reached without the user pulling back, so appended batches - which grow the
    // track without ever moving scrollLeft - cannot be mistaken for a scroll away from the tail.
    const highWaterOffsetRef = useRef(0);
    const [viewportWidthInPx, setViewportWidthInPx] = useState(0);
    const [scrollLeftInPx, setScrollLeftInPx] = useState(0);
    const [isIdleShown, setIsIdleShown] = useState(false);
    const [isFollowingLatest, setIsFollowingLatest] = useState(true);
    const [selectedKey, setSelectedKey] = useState<string | null>(null);

    useLayoutEffect(() => {
        const scrollElement = scrollRef.current;
        if (!scrollElement) {
            return;
        }

        const measure = () => setViewportWidthInPx(scrollElement.clientWidth);
        measure();

        const observer = new ResizeObserver(measure);
        observer.observe(scrollElement);

        return () => observer.disconnect();
    }, []);

    const layout = buildCdcTimelineLayout({ batches, viewportWidthInPx, isIdleShown });

    // The feed keeps appending, so pin the view to the newest batch while following is on. The
    // rendered track can still settle after the layout lands, so watching the content element
    // re-pins on that late growth too and the newest bar never ends up half cut off.
    useLayoutEffect(() => {
        const scrollElement = scrollRef.current;
        const contentElement = contentRef.current;
        if (!isFollowingLatest || !scrollElement || !contentElement) {
            return;
        }

        const pinToLiveEdge = () => {
            scrollElement.scrollLeft = scrollElement.scrollWidth;
            highWaterOffsetRef.current = scrollElement.scrollLeft;
            // The scroll event that follows would do this too, but only on the next frame - and the
            // window has to line up with the new position in the very commit that moved it.
            setScrollLeftInPx(scrollElement.scrollLeft);
        };

        pinToLiveEdge();

        const observer = new ResizeObserver(pinToLiveEdge);
        observer.observe(contentElement);

        return () => observer.disconnect();
    }, [isFollowingLatest, layout]);

    // Showing or hiding idle moves every offset, so the selected bar has to be chased to its new
    // one - the alternative is leaving the user parked on an unrelated stretch of the feed.
    useLayoutEffect(() => {
        const scrollElement = scrollRef.current;
        const anchorKey = anchorKeyRef.current;
        anchorKeyRef.current = null;

        const anchorCell = anchorKey === null ? null : findBatchCell(layout.cells, anchorKey);
        if (!scrollElement || !anchorCell) {
            return;
        }

        scrollElement.scrollLeft = anchorCell.offsetInPx + anchorCell.widthInPx / 2 - scrollElement.clientWidth / 2;
        highWaterOffsetRef.current = scrollElement.scrollLeft;
        setScrollLeftInPx(scrollElement.scrollLeft);
    }, [layout]);

    // Panning back parks the view where the user left it, panning to the end resumes following.
    const handleScroll = (event: UIEvent<HTMLDivElement>) => {
        const { scrollLeft, scrollWidth, clientWidth } = event.currentTarget;
        setScrollLeftInPx(scrollLeft);

        if (scrollLeft < highWaterOffsetRef.current - SCROLL_BACK_SLACK_IN_PX) {
            setIsFollowingLatest(false);
        } else if (scrollWidth - scrollLeft - clientWidth <= AT_LATEST_THRESHOLD_IN_PX) {
            setIsFollowingLatest(true);
        }

        // Only forward travel moves the mark, so a slow drag backwards still adds up to a pause.
        highWaterOffsetRef.current = Math.max(highWaterOffsetRef.current, scrollLeft);
    };

    const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
        const scrollElement = scrollRef.current;
        if (event.button !== 0 || !scrollElement) {
            return;
        }

        const startX = event.clientX;
        const startScrollLeftInPx = scrollElement.scrollLeft;
        wasDraggedRef.current = false;

        // Window listeners rather than pointer capture: capturing would retarget the click that
        // follows and the bars would stop being selectable.
        const handleMove = (moveEvent: globalThis.PointerEvent) => {
            const deltaX = moveEvent.clientX - startX;
            if (!wasDraggedRef.current && Math.abs(deltaX) < DRAG_THRESHOLD_IN_PX) {
                return;
            }

            wasDraggedRef.current = true;
            scrollElement.scrollLeft = startScrollLeftInPx - deltaX;
            setScrollLeftInPx(scrollElement.scrollLeft);
        };

        const stopDragging = () => {
            window.removeEventListener("pointermove", handleMove);
            window.removeEventListener("pointerup", stopDragging);
            window.removeEventListener("pointercancel", stopDragging);
        };

        window.addEventListener("pointermove", handleMove);
        window.addEventListener("pointerup", stopDragging);
        window.addEventListener("pointercancel", stopDragging);
    };

    const pan = (direction: -1 | 1) => {
        const scrollElement = scrollRef.current;
        scrollElement?.scrollBy({ left: direction * scrollElement.clientWidth * PAN_STEP_RATIO, behavior: "smooth" });
    };

    const toggleIdle = (isIdleNowShown: boolean) => {
        anchorKeyRef.current = selectedKey;
        setIsIdleShown(isIdleNowShown);
        // With nothing selected there is no anchor worth keeping, so fall back to the live edge.
        setIsFollowingLatest(selectedKey === null);
    };

    const selectBatch = (key: string) => {
        // A drag that ends on top of a bar still fires a click, and panning is not a selection.
        if (wasDraggedRef.current) {
            return;
        }

        // Following would scroll the batch the user just picked out of view.
        setIsFollowingLatest(false);
        setSelectedKey((previous) => (previous === key ? null : key));
    };

    const selectedCell = selectedKey === null ? null : findBatchCell(layout.cells, selectedKey);
    const playheadOffsetInPx = selectedCell
        ? selectedCell.offsetInPx + selectedCell.widthInPx / 2
        : layout.totalWidthInPx - PLAYHEAD_EDGE_INSET_IN_PX;

    const ticks = buildCdcTimelineTicks({
        cells: layout.cells,
        scrollLeftInPx,
        viewportWidthInPx,
        spacingInPx: TICK_SPACING_IN_PX,
    });

    const { startIndex, endIndex } = findCdcTimelineWindow({
        cells: layout.cells,
        scrollLeftInPx,
        viewportWidthInPx,
        overscanInPx: OVERSCAN_IN_PX,
    });

    return (
        <div className="space-y-4">
            <div className="overflow-hidden rounded-lg border">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-muted/40 px-3 py-2">
                    <p className="text-xs text-muted-foreground">
                        <span className="tabular-nums">{formatCompact(batches.length)}</span> batches, durations to
                        scale, idle {isIdleShown ? "shown" : "hidden"}. Drag or use the arrows to pan.
                    </p>
                    <div className="flex items-center gap-2">
                        <Label htmlFor={idleId} className="text-xs font-normal text-muted-foreground">
                            Idle
                        </Label>
                        <Switch id={idleId} checked={isIdleShown} onCheckedChange={toggleIdle} />
                        <Button
                            variant="outline"
                            size="icon-sm"
                            aria-label="Pan to earlier batches"
                            onClick={() => pan(-1)}
                        >
                            <ChevronLeft />
                        </Button>
                        <Button
                            variant="outline"
                            size="icon-sm"
                            aria-label="Pan to later batches"
                            onClick={() => pan(1)}
                        >
                            <ChevronRight />
                        </Button>
                        <Button
                            variant={isFollowingLatest ? "secondary" : "outline"}
                            size="sm"
                            aria-pressed={isFollowingLatest}
                            onClick={() => setIsFollowingLatest((previous) => !previous)}
                        >
                            <span
                                aria-hidden={true}
                                className={cn(
                                    "size-1.5 rounded-full",
                                    isFollowingLatest ? "animate-pulse bg-destructive" : "bg-muted-foreground",
                                )}
                            />
                            Live
                        </Button>
                    </div>
                </div>
                <div
                    ref={scrollRef}
                    onScroll={handleScroll}
                    onPointerDown={handlePointerDown}
                    className="cursor-grab overflow-x-auto overscroll-x-contain select-none active:cursor-grabbing"
                >
                    <div ref={contentRef} className="relative" style={{ width: layout.totalWidthInPx }}>
                        <div className="relative border-b bg-muted/20" style={{ height: RULER_HEIGHT_IN_PX }}>
                            {ticks.map((tick) => (
                                <CdcTimelineTickMark key={tick.offsetInPx} tick={tick} />
                            ))}
                            <span className="absolute top-1.5 right-4 text-[10px] text-info">now</span>
                        </div>
                        <div className="relative" style={{ height: TRACK_HEIGHT_IN_PX }}>
                            {layout.cells.slice(startIndex, endIndex + 1).map((cell) => (
                                <div
                                    key={cell.key}
                                    className="absolute inset-y-0"
                                    style={{ left: cell.offsetInPx, width: cell.widthInPx }}
                                >
                                    <CdcTimelineCellContent
                                        cell={cell}
                                        isSelected={cell.key === selectedKey}
                                        isDimmed={selectedKey !== null && cell.key !== selectedKey}
                                        onSelect={selectBatch}
                                    />
                                </div>
                            ))}
                        </div>
                        <div
                            aria-hidden={true}
                            className="pointer-events-none absolute inset-y-0 w-px bg-info/70"
                            style={{ left: playheadOffsetInPx }}
                        >
                            <span
                                className="absolute -left-[3px] size-[7px] rounded-full bg-info"
                                style={{ top: RULER_HEIGHT_IN_PX - 4 }}
                            />
                        </div>
                    </div>
                </div>
            </div>
            {selectedCell && <CdcBatchDetails batch={selectedCell.batch} onClose={() => setSelectedKey(null)} />}
        </div>
    );
}

function CdcTimelineCellContent({
    cell,
    isSelected,
    isDimmed,
    onSelect,
}: {
    cell: CdcTimelineCell;
    isSelected: boolean;
    isDimmed: boolean;
    onSelect: (key: string) => void;
}) {
    if (cell.kind === "live") {
        return (
            <div
                aria-hidden={true}
                className="cdc-timeline-live-edge absolute inset-x-0 inset-y-3 rounded-md border border-dashed"
            />
        );
    }

    if (cell.kind === "idle") {
        return <CdcTimelineIdleGap cell={cell} />;
    }

    return <CdcTimelineBar cell={cell} isSelected={isSelected} isDimmed={isDimmed} onSelect={onSelect} />;
}

function CdcTimelineBar({
    cell,
    isSelected,
    isDimmed,
    onSelect,
}: {
    cell: CdcTimelineBatchCell;
    isSelected: boolean;
    isDimmed: boolean;
    onSelect: (key: string) => void;
}) {
    const { batch } = cell;
    const state = CDC_BATCH_STATES[batch.state];
    const summary = `${formatCdcTime(batch.started)}, ${formatCdcDuration(batch.durationInMs)}, ${describeCounts(batch)}`;

    return (
        <button
            type="button"
            onClick={() => onSelect(batch.key)}
            aria-pressed={isSelected}
            aria-label={`${state.label} batch, ${summary}`}
            title={summary}
            style={{ left: BATCH_SPACING_IN_PX / 2, right: BATCH_SPACING_IN_PX / 2 }}
            className={cn(
                "absolute inset-y-3 rounded-md transition-opacity focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                state.barClassName,
                isDimmed && "opacity-30",
                isSelected && "ring-2 ring-foreground",
            )}
        />
    );
}

function CdcTimelineIdleGap({ cell }: { cell: CdcTimelineIdleCell }) {
    if (cell.widthInPx < IDLE_LABEL_MIN_WIDTH_IN_PX) {
        return <div aria-hidden={true} className="absolute inset-x-0 inset-y-3 bg-muted" />;
    }

    return (
        <div className="absolute inset-x-0 inset-y-3 flex flex-col items-center justify-center gap-1 bg-muted text-[10px] leading-none text-muted-foreground">
            <span>
                Started <span className="font-mono text-foreground tabular-nums">{formatCdcTime(cell.startMs)}</span>
            </span>
            <span>
                Idle for{" "}
                <span className="font-mono text-foreground tabular-nums">
                    {formatCdcDuration(cell.endMs - cell.startMs)}
                </span>
            </span>
        </div>
    );
}

function CdcTimelineTickMark({ tick }: { tick: CdcTimelineTick }) {
    return (
        <div className="absolute inset-y-0" style={{ left: tick.offsetInPx }}>
            <div className={cn("absolute inset-y-0 w-px", tick.isError ? "bg-destructive/60" : "bg-border")} />
            <span
                className={cn(
                    "absolute top-1.5 left-1.5 font-mono text-[10px] whitespace-nowrap tabular-nums",
                    tick.isError ? "text-destructive" : "text-muted-foreground",
                )}
            >
                {formatCdcTime(tick.timeMs)}
            </span>
        </div>
    );
}

function describeCounts(batch: CdcLiveBatch): string {
    const errorCount = batch.scriptErrors + batch.readErrors;
    const processed = `${formatCompact(batch.processed)} processed`;
    return errorCount === 0
        ? processed
        : `${processed}, ${formatCompact(errorCount)} ${errorCount === 1 ? "error" : "errors"}`;
}

function findBatchCell(cells: CdcTimelineCell[], key: string): CdcTimelineBatchCell | null {
    for (const cell of cells) {
        if (cell.kind === "batch" && cell.key === key) {
            return cell;
        }
    }

    return null;
}
