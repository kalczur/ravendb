import type { ComponentProps } from "react";
import { CircleAlert, CircleCheck, Loader2, type LucideIcon } from "lucide-react";
import type { Badge } from "@/components/shadcn/ui/badge";
import type { CdcLiveBatchState } from "@/pages/apps/use-cdc-live-performance";

export const CDC_BATCH_STATES: Record<
    CdcLiveBatchState,
    {
        label: string;
        badgeVariant: ComponentProps<typeof Badge>["variant"];
        icon: LucideIcon;
        iconClassName?: string;
        barClassName: string;
    }
> = {
    success: {
        label: "Success",
        badgeVariant: "success",
        icon: CircleCheck,
        barClassName: "bg-primary",
    },
    pending: {
        label: "Pending",
        badgeVariant: "secondary",
        icon: Loader2,
        iconClassName: "animate-spin",
        barClassName: "bg-primary/45 animate-pulse",
    },
    error: {
        label: "Error",
        badgeVariant: "destructive",
        icon: CircleAlert,
        barClassName: "bg-destructive",
    },
};
