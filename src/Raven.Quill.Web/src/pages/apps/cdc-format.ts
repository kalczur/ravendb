const TIME_WITH_MS_OPTIONS: Intl.DateTimeFormatOptions = {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    fractionalSecondDigits: 3,
    hour12: false,
};

const timeFormatter = new Intl.DateTimeFormat("en-GB", TIME_WITH_MS_OPTIONS);
const dateTimeFormatter = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...TIME_WITH_MS_OPTIONS,
});

/** Wall clock down to the millisecond, e.g. "12:51:24.128". */
export function formatCdcTime(value: string | number): string {
    return format(timeFormatter, value);
}

/** Date plus wall clock, e.g. "30 Jul 2026, 12:51:24.128". */
export function formatCdcDateTime(value: string | number): string {
    return format(dateTimeFormatter, value);
}

function format(formatter: Intl.DateTimeFormat, value: string | number): string {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? String(value) : formatter.format(date);
}

const SECOND_IN_MS = 1000;
const MINUTE_IN_MS = 60 * SECOND_IN_MS;
const HOUR_IN_MS = 60 * MINUTE_IN_MS;

/** Largest useful unit only, e.g. "358ms", "1.6s", "2m 30s", "3h 5m". */
export function formatCdcDuration(durationInMs: number): string {
    if (durationInMs < SECOND_IN_MS) {
        return `${Math.round(durationInMs)}ms`;
    }

    if (durationInMs < MINUTE_IN_MS) {
        return `${(durationInMs / SECOND_IN_MS).toFixed(1)}s`;
    }

    if (durationInMs < HOUR_IN_MS) {
        return joinUnits(durationInMs, MINUTE_IN_MS, "m", SECOND_IN_MS, "s");
    }

    return joinUnits(durationInMs, HOUR_IN_MS, "h", MINUTE_IN_MS, "m");
}

function joinUnits(
    durationInMs: number,
    majorInMs: number,
    majorSuffix: string,
    minorInMs: number,
    minorSuffix: string,
): string {
    const major = Math.floor(durationInMs / majorInMs);
    const minor = Math.floor((durationInMs % majorInMs) / minorInMs);
    return minor === 0 ? `${major}${majorSuffix}` : `${major}${majorSuffix} ${minor}${minorSuffix}`;
}
