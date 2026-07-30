import type { ReactNode } from "react";
import { X } from "lucide-react";
import { Alert, AlertDescription } from "@/components/shadcn/ui/alert";
import { Badge } from "@/components/shadcn/ui/badge";
import { Button } from "@/components/shadcn/ui/button";
import { cn } from "@/lib/utils";
import { CDC_BATCH_STATES } from "@/pages/apps/cdc-batch-state";
import { formatCdcDateTime, formatCdcDuration, formatCdcTime } from "@/pages/apps/cdc-format";
import type { CdcLiveBatch } from "@/pages/apps/use-cdc-live-performance";

export function CdcBatchDetails({ batch, onClose }: { batch: CdcLiveBatch; onClose: () => void }) {
    const state = CDC_BATCH_STATES[batch.state];
    const StateIcon = state.icon;
    const errorCount = batch.scriptErrors + batch.readErrors;

    return (
        <div className="space-y-4 rounded-lg border p-4">
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
                <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold">Batch #{batch.id}</h3>
                    <Badge variant={state.badgeVariant}>
                        <StateIcon aria-hidden={true} className={state.iconClassName} />
                        {state.label}
                    </Badge>
                    <span className="font-mono text-xs text-muted-foreground tabular-nums">
                        {formatCdcDuration(batch.durationInMs)}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-muted-foreground tabular-nums">
                        {formatCdcDateTime(batch.started)} to{" "}
                        {batch.ended ? formatCdcTime(batch.ended) : "still in progress"}
                    </span>
                    <Button variant="ghost" size="icon-xs" onClick={onClose} aria-label="Close batch details">
                        <X />
                    </Button>
                </div>
            </div>
            <div className={cn("h-2.5 w-full rounded-full", state.barClassName)} aria-hidden={true} />
            <dl className="grid gap-x-8 sm:grid-cols-2">
                <CdcBatchDetail label="Task" value={batch.taskName || "Unknown"} />
                <CdcBatchDetail label="Documents read" value={batch.read.toLocaleString()} />
                <CdcBatchDetail label="Processed" value={batch.processed.toLocaleString()} />
                {batch.scriptErrors > 0 && (
                    <CdcBatchDetail label="Script errors" value={batch.scriptErrors.toLocaleString()} isDestructive />
                )}
                {batch.readErrors > 0 && (
                    <CdcBatchDetail label="Read errors" value={batch.readErrors.toLocaleString()} isDestructive />
                )}
            </dl>
            {errorCount > 0 && (
                <Alert variant="destructive">
                    <AlertDescription className="text-destructive">
                        This batch reported {errorCount.toLocaleString()} {errorCount === 1 ? "error" : "errors"} while
                        syncing data changes.
                    </AlertDescription>
                </Alert>
            )}
        </div>
    );
}

function CdcBatchDetail({
    label,
    value,
    isDestructive = false,
}: {
    label: string;
    value: ReactNode;
    isDestructive?: boolean;
}) {
    return (
        <div className="flex items-baseline justify-between gap-4 border-b py-1.5">
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd
                className={cn(
                    "font-mono text-xs break-all tabular-nums",
                    isDestructive ? "text-destructive" : "text-foreground",
                )}
            >
                {value}
            </dd>
        </div>
    );
}
