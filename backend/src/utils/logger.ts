
type Level = "debug" | "info" | "warn" | "error";

const LEVEL_RANK: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };

const minLevel: Level = (process.env.LOG_LEVEL as Level) || "info";

function shouldEmit(level: Level): boolean {
    return LEVEL_RANK[level] >= LEVEL_RANK[minLevel];
}

function emit(level: Level, event: string, fields: Record<string, unknown>): void {
    if (!shouldEmit(level)) return;
    const entry = {
        ts: new Date().toISOString(),
        level,
        event,
        ...fields,
    };
    const line = process.env.LOG_PRETTY === "1"
        ? `[${entry.ts}] ${level.toUpperCase()} ${event} ${JSON.stringify(fields)}\n`
        : JSON.stringify(entry) + "\n";
    if (level === "error" || level === "warn") {
        process.stderr.write(line);
    } else {
        process.stdout.write(line);
    }
}

export const log = {
    debug: (event: string, fields: Record<string, unknown> = {}) => emit("debug", event, fields),
    info: (event: string, fields: Record<string, unknown> = {}) => emit("info", event, fields),
    warn: (event: string, fields: Record<string, unknown> = {}) => emit("warn", event, fields),
    error: (event: string, fields: Record<string, unknown> = {}) => emit("error", event, fields),
};
