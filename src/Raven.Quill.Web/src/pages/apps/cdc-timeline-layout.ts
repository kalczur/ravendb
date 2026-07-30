import type { CdcLiveBatch } from "@/pages/apps/use-cdc-live-performance";

// A batch of the reference duration takes one slot, and roughly this many slots fit the viewport.
const TARGET_CELLS_PER_VIEW = 12;
// Keeps the slot usable when the card is narrow; the track then scrolls instead of shrinking bars.
const MIN_SLOT_WIDTH_IN_PX = 44;
// The duration that maps to exactly one slot. A high quantile keeps one slow batch from squeezing
// every other bar down to a sliver, while still leaving that batch visibly the widest.
const REFERENCE_QUANTILE = 0.9;
const MAX_BATCH_WIDTH_IN_SLOTS = 4;
const MIN_BATCH_WIDTH_IN_PX = 8;
// Idle stretches are orders of magnitude longer than the batches around them, so they are scaled
// like everything else but capped hard - otherwise a quiet night would push every bar off screen.
const MAX_IDLE_WIDTH_IN_SLOTS = 2;
const MIN_IDLE_WIDTH_IN_PX = 28;
const LIVE_EDGE_WIDTH_IN_PX = 220;

/** Space between neighbouring bars, carried inside the batch cell so offsets stay contiguous. */
export const BATCH_SPACING_IN_PX = 6;
/** Below this an idle cell has no room for its two label lines. */
export const IDLE_LABEL_MIN_WIDTH_IN_PX = 104;

type CdcTimelineCellBase = {
    key: string;
    offsetInPx: number;
    widthInPx: number;
    startMs: number;
    endMs: number;
};

export type CdcTimelineBatchCell = CdcTimelineCellBase & { kind: "batch"; batch: CdcLiveBatch };

export type CdcTimelineIdleCell = CdcTimelineCellBase & { kind: "idle" };

/** Trailing "nothing synced here yet" region, ending at the live edge. */
export type CdcTimelineLiveCell = CdcTimelineCellBase & { kind: "live" };

export type CdcTimelineCell = CdcTimelineBatchCell | CdcTimelineIdleCell | CdcTimelineLiveCell;

export type CdcTimelineLayout = {
    cells: CdcTimelineCell[];
    totalWidthInPx: number;
};

/**
 * Places the batches on a horizontal axis: bar width is proportional to the batch duration, and
 * the idle stretches between batches are either compressed away or shown as their own cells.
 * Cells are contiguous, so an offset can be mapped back to a point in time.
 */
export function buildCdcTimelineLayout({
    batches,
    viewportWidthInPx,
    isIdleShown,
}: {
    batches: CdcLiveBatch[];
    viewportWidthInPx: number;
    isIdleShown: boolean;
}): CdcTimelineLayout {
    const slotWidthInPx = Math.max(viewportWidthInPx / TARGET_CELLS_PER_VIEW, MIN_SLOT_WIDTH_IN_PX);
    const pxPerMs = slotWidthInPx / referenceDurationInMs(batches);

    const cells: CdcTimelineCell[] = [];
    let offsetInPx = 0;
    let previousEndMs: number | null = null;

    for (const batch of batches) {
        const startMs = Date.parse(batch.started);
        if (Number.isNaN(startMs)) {
            continue;
        }

        const durationInMs = Math.max(batch.durationInMs, 0);
        const endMs = startMs + durationInMs;

        if (isIdleShown && previousEndMs !== null && startMs > previousEndMs) {
            const widthInPx = clamp(
                (startMs - previousEndMs) * pxPerMs,
                MIN_IDLE_WIDTH_IN_PX,
                slotWidthInPx * MAX_IDLE_WIDTH_IN_SLOTS,
            );
            cells.push({
                kind: "idle",
                key: `idle/${batch.key}`,
                offsetInPx,
                widthInPx,
                startMs: previousEndMs,
                endMs: startMs,
            });
            offsetInPx += widthInPx;
        }

        const widthInPx =
            clamp(durationInMs * pxPerMs, MIN_BATCH_WIDTH_IN_PX, slotWidthInPx * MAX_BATCH_WIDTH_IN_SLOTS) +
            BATCH_SPACING_IN_PX;
        cells.push({ kind: "batch", key: batch.key, offsetInPx, widthInPx, startMs, endMs, batch });
        offsetInPx += widthInPx;
        // Overlapping batches would otherwise reopen an idle gap that never existed.
        previousEndMs = previousEndMs === null ? endMs : Math.max(previousEndMs, endMs);
    }

    const liveStartMs = previousEndMs ?? Date.now();
    cells.push({
        kind: "live",
        key: "live-edge",
        offsetInPx,
        widthInPx: LIVE_EDGE_WIDTH_IN_PX,
        startMs: liveStartMs,
        endMs: liveStartMs,
    });

    return { cells, totalWidthInPx: offsetInPx + LIVE_EDGE_WIDTH_IN_PX };
}

function referenceDurationInMs(batches: CdcLiveBatch[]): number {
    const durations = batches.map((batch) => batch.durationInMs).sort((first, second) => first - second);
    const index = Math.min(durations.length - 1, Math.floor(durations.length * REFERENCE_QUANTILE));
    return Math.max(durations[index] ?? 1, 1);
}

function clamp(value: number, minimum: number, maximum: number): number {
    return Math.min(Math.max(value, minimum), maximum);
}

/** Index of the cell covering the offset, clamped to the ends of the track. */
export function findCdcTimelineIndexAt(cells: CdcTimelineCell[], offsetInPx: number): number {
    let low = 0;
    let high = cells.length - 1;

    while (low <= high) {
        const middle = Math.floor((low + high) / 2);
        const cell = cells[middle];

        if (offsetInPx < cell.offsetInPx) {
            high = middle - 1;
        } else if (offsetInPx >= cell.offsetInPx + cell.widthInPx) {
            low = middle + 1;
        } else {
            return middle;
        }
    }

    return Math.min(Math.max(low, 0), cells.length - 1);
}

/**
 * Virtualization window: the cells that reach into the visible part of the track. Widths are
 * computed rather than measured, so the window comes straight out of the same offsets the cells
 * are positioned with and cannot drift away from them.
 */
export function findCdcTimelineWindow({
    cells,
    scrollLeftInPx,
    viewportWidthInPx,
    overscanInPx,
}: {
    cells: CdcTimelineCell[];
    scrollLeftInPx: number;
    viewportWidthInPx: number;
    overscanInPx: number;
}): { startIndex: number; endIndex: number } {
    return {
        startIndex: findCdcTimelineIndexAt(cells, scrollLeftInPx - overscanInPx),
        endIndex: findCdcTimelineIndexAt(cells, scrollLeftInPx + viewportWidthInPx + overscanInPx),
    };
}

export type CdcTimelineTick = {
    offsetInPx: number;
    timeMs: number;
    isError: boolean;
};

/**
 * Ruler labels for the visible window only. Hiding idle makes the axis non-linear in time, so the
 * ticks sit at even pixel distances and read their timestamp back out of the cell they land in.
 */
export function buildCdcTimelineTicks({
    cells,
    scrollLeftInPx,
    viewportWidthInPx,
    spacingInPx,
}: {
    cells: CdcTimelineCell[];
    scrollLeftInPx: number;
    viewportWidthInPx: number;
    spacingInPx: number;
}): CdcTimelineTick[] {
    const ticks: CdcTimelineTick[] = [];
    const firstOffsetInPx = Math.ceil(scrollLeftInPx / spacingInPx) * spacingInPx;

    for (
        let offsetInPx = firstOffsetInPx;
        offsetInPx <= scrollLeftInPx + viewportWidthInPx;
        offsetInPx += spacingInPx
    ) {
        const cell = cells[findCdcTimelineIndexAt(cells, offsetInPx)];
        // The live edge stands for time that has not been synced, so it carries a "now" label instead.
        if (!cell || cell.kind === "live") {
            continue;
        }

        const progress = (offsetInPx - cell.offsetInPx) / cell.widthInPx;
        ticks.push({
            offsetInPx,
            timeMs: cell.startMs + (cell.endMs - cell.startMs) * progress,
            isError: cell.kind === "batch" && cell.batch.state === "error",
        });
    }

    return ticks;
}
