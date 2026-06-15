import type { FastifyServerOptions } from "fastify";

export type LogIconMode = "auto" | "nerd" | "ascii" | "none";
export type ResolvedLogIconMode = Exclude<LogIconMode, "auto">;

export interface LoggerOptionInput {
  nodeEnv?: string;
  env?: Record<string, string | undefined>;
  stdout?: { isTTY?: boolean };
}

export interface TerminalLogRecord {
  level?: number | string;
  msg?: string;
  time?: number | string;
  reqId?: string;
  req?: {
    method?: string;
    url?: string;
  };
  res?: {
    statusCode?: number;
  };
  responseTime?: number;
  err?: {
    message?: string;
    stack?: string;
  };
  module?: string;
}

export interface TerminalLogFormatOptions {
  color: boolean;
  iconMode: ResolvedLogIconMode;
  requestCache?: Map<string, { method?: string; url?: string }>;
}

export interface TerminalLogStreamOptions extends Partial<TerminalLogFormatOptions> {
  write?: (line: string) => void;
}

const colorCodes = {
  reset: "\u001b[0m",
  dim: "\u001b[2m",
  gray: "\u001b[90m",
  blue: "\u001b[34m",
  yellow: "\u001b[33m",
  red: "\u001b[31m",
  magenta: "\u001b[35m",
};

const levelByNumber = new Map<
  number,
  { label: string; color: keyof typeof colorCodes; ascii: string; nerd: string }
>([
  [10, { label: "TRACE", color: "magenta", ascii: "·", nerd: "󰌵" }],
  [20, { label: "DEBUG", color: "magenta", ascii: "d", nerd: "" }],
  [30, { label: "INFO", color: "blue", ascii: "i", nerd: "" }],
  [40, { label: "WARN", color: "yellow", ascii: "!", nerd: "" }],
  [50, { label: "ERROR", color: "red", ascii: "x", nerd: "" }],
  [60, { label: "FATAL", color: "red", ascii: "x", nerd: "" }],
]);

const levelByName = new Map<string, number>([
  ["trace", 10],
  ["debug", 20],
  ["info", 30],
  ["warn", 40],
  ["warning", 40],
  ["error", 50],
  ["fatal", 60],
]);

export function getFastifyLoggerOptions(
  input: LoggerOptionInput = {},
): FastifyServerOptions["logger"] {
  const nodeEnv = input.nodeEnv ?? process.env.NODE_ENV ?? "development";

  if (nodeEnv === "test") return false;
  if (nodeEnv === "production") return { level: "info" };

  return {
    level: "info",
    stream: createTerminalLogStream({
      color: resolveColor(
        input.env ?? process.env,
        input.stdout ?? process.stdout,
      ),
      iconMode: resolveIconMode(
        input.env ?? process.env,
        input.stdout ?? process.stdout,
      ),
    }),
  };
}

export function resolveIconMode(
  env: Record<string, string | undefined>,
  stdout: { isTTY?: boolean },
): ResolvedLogIconMode {
  const requested = env.PLAYLIST2VIDEO_LOG_ICONS?.toLowerCase();
  if (requested === "nerd" || requested === "ascii" || requested === "none")
    return requested;

  if (env.CI || env.TERM === "dumb") return "ascii";
  if (stdout.isTTY === false && !env.FORCE_COLOR) return "ascii";
  return "nerd";
}

export function createTerminalLogStream(
  options: TerminalLogStreamOptions = {},
) {
  const requestCache =
    options.requestCache ??
    new Map<string, { method?: string; url?: string }>();
  const write =
    options.write ?? ((line: string) => process.stdout.write(`${line}\n`));
  const formatOptions: TerminalLogFormatOptions = {
    color: options.color ?? resolveColor(process.env, process.stdout),
    iconMode: options.iconMode ?? resolveIconMode(process.env, process.stdout),
    requestCache,
  };

  return {
    write(message: string) {
      const trimmed = message.trim();
      if (!trimmed) return;

      try {
        write(
          formatTerminalLogRecord(
            JSON.parse(trimmed) as TerminalLogRecord,
            formatOptions,
          ),
        );
      } catch {
        write(trimmed);
      }
    },
  };
}

export function formatTerminalLogRecord(
  record: TerminalLogRecord,
  options: TerminalLogFormatOptions,
): string {
  cacheRequest(record, options.requestCache);

  const level = getLevel(record.level);
  const icon = getIcon(level, options.iconMode);
  const label = level.label.padEnd(5, " ");
  const scope = getScope(record).padEnd(6, " ");
  const message = getMessage(record, options.requestCache);
  const time = formatTime(record.time);
  const prefix = `${icon} ${label}`;
  const line = `${prefix} ${scope} ${message}`;

  if (!options.color) return time ? `${time} ${line}` : line;

  const color = colorCodes[level.color];
  const coloredPrefix = `${color}${prefix}${colorCodes.reset}`;
  const coloredScope = `${colorCodes.gray}${scope}${colorCodes.reset}`;
  const coloredTime = time
    ? `${colorCodes.dim}${time}${colorCodes.reset} `
    : "";
  return `${coloredTime}${coloredPrefix} ${coloredScope} ${message}`;
}

function resolveColor(
  env: Record<string, string | undefined>,
  stdout: { isTTY?: boolean },
): boolean {
  if (env.NO_COLOR) return false;
  if (env.FORCE_COLOR && env.FORCE_COLOR !== "0") return true;
  return stdout.isTTY === true;
}

function getLevel(level: TerminalLogRecord["level"]) {
  const levelNumber =
    typeof level === "string"
      ? (levelByName.get(level.toLowerCase()) ?? 30)
      : (level ?? 30);
  return levelByNumber.get(levelNumber) ?? levelByNumber.get(30)!;
}

function getIcon(
  level: ReturnType<typeof getLevel>,
  iconMode: ResolvedLogIconMode,
): string {
  if (iconMode === "none") return " ";
  return iconMode === "nerd" ? level.nerd : level.ascii;
}

function getScope(record: TerminalLogRecord): string {
  if (record.module) return record.module;
  if (record.req || record.res) return "http";
  if (
    record.err ||
    getLevel(record.level).label === "ERROR" ||
    getLevel(record.level).label === "FATAL"
  )
    return "error";
  return "server";
}

function getMessage(
  record: TerminalLogRecord,
  requestCache?: Map<string, { method?: string; url?: string }>,
): string {
  if (record.res) {
    const cached = record.reqId ? requestCache?.get(record.reqId) : undefined;
    const method = cached?.method ?? record.req?.method;
    const url = cached?.url ?? record.req?.url;
    const request = method && url ? `${method} ${url}` : "request";
    const statusCode = record.res.statusCode ?? "-";
    const duration =
      typeof record.responseTime === "number"
        ? `${Math.round(record.responseTime)}ms`
        : "";
    return [request, statusCode, duration].filter(Boolean).join("  ");
  }

  if (record.req) {
    const request = [record.req.method, record.req.url]
      .filter(Boolean)
      .join(" ");
    return request || record.msg || "incoming request";
  }

  const parts = [record.msg, record.err?.message].filter(
    (part): part is string => Boolean(part),
  );
  return parts.join("  ") || "log event";
}

function cacheRequest(
  record: TerminalLogRecord,
  requestCache?: Map<string, { method?: string; url?: string }>,
) {
  if (!requestCache || !record.reqId || !record.req) return;
  requestCache.set(record.reqId, {
    method: record.req.method,
    url: record.req.url,
  });
}

function formatTime(time: TerminalLogRecord["time"]): string {
  if (!time) return "";
  const date = new Date(time);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("en-US", { hour12: false });
}
