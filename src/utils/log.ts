import { cyan, dim, red, yellow } from "./colors";

export type Level = "debug" | "info" | "warn" | "error" | "silent";

const THRESHOLDS: Record<Level, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
  silent: 100,
};

const LEVEL_LABEL: Record<Exclude<Level, "silent">, string> = {
  debug: dim("DEBUG"),
  info: cyan("INFO "),
  warn: yellow("WARN "),
  error: red("ERROR"),
};

/** Resolved per-call so `LOG_LEVEL` changes (e.g. in tests) take effect immediately. */
function threshold(): number {
  const level = process.env.LOG_LEVEL as Level | undefined;
  return level && level in THRESHOLDS ? THRESHOLDS[level] : THRESHOLDS.info;
}

export interface Logger {
  debug(message: string): void;
  info(message: string): void;
  warn(message: string): void;
  error(message: string): void;
}

/**
 * Creates a leveled, timestamped, colored logger. Pass a `scope` to prefix every
 * line (e.g. `createLogger("stack 22")`). Verbosity is controlled by the
 * `LOG_LEVEL` env var (debug | info | warn | error | silent; default info).
 */
export function createLogger(scope?: string): Logger {
  const prefix = scope ? ` ${dim(`[${scope}]`)}` : "";

  const emit = (
    level: Exclude<Level, "silent">,
    write: (line: string) => void,
    message: string,
  ) => {
    if (THRESHOLDS[level] < threshold()) return;
    write(
      `${dim(new Date().toISOString())} ${LEVEL_LABEL[level]}${prefix} ${message}`,
    );
  };

  return {
    debug: (message) => emit("debug", console.log, message),
    info: (message) => emit("info", console.log, message),
    warn: (message) => emit("warn", console.warn, message),
    error: (message) => emit("error", console.error, message),
  };
}
