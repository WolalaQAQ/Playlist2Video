import { describe, expect, it } from "vitest";
import {
  createTerminalLogStream,
  formatTerminalLogRecord,
  getFastifyLoggerOptions,
  resolveIconMode,
} from "./logger";

function stripAnsi(input: string): string {
  return input.replace(/\u001b\[[0-9;]*m/g, "");
}

describe("server logger options", () => {
  it("keeps Vitest output silent", () => {
    expect(getFastifyLoggerOptions({ nodeEnv: "test" })).toBe(false);
  });

  it("keeps production logs structured for machines", () => {
    const logger = getFastifyLoggerOptions({ nodeEnv: "production" });

    expect(logger).toEqual(expect.objectContaining({ level: "info" }));
    expect(logger).not.toHaveProperty("stream");
  });

  it("uses a terminal stream in development", () => {
    const logger = getFastifyLoggerOptions({
      nodeEnv: "development",
      env: { PLAYLIST2VIDEO_LOG_ICONS: "ascii" },
    });

    expect(logger).toEqual(expect.objectContaining({ level: "info" }));
    expect(logger).toHaveProperty("stream");
    expect((logger as { stream: { write: unknown } }).stream.write).toBeTypeOf(
      "function",
    );
  });
});

describe("terminal log icon mode", () => {
  it("allows users to force Nerd Font icons", () => {
    expect(
      resolveIconMode({ PLAYLIST2VIDEO_LOG_ICONS: "nerd" }, { isTTY: false }),
    ).toBe("nerd");
  });

  it("falls back to ASCII when users request it", () => {
    expect(
      resolveIconMode({ PLAYLIST2VIDEO_LOG_ICONS: "ascii" }, { isTTY: true }),
    ).toBe("ascii");
  });

  it("uses ASCII in CI even when auto mode is enabled", () => {
    expect(resolveIconMode({ CI: "true" }, { isTTY: true })).toBe("ascii");
  });

  it("uses Nerd Font icons for forced-color labelled local dev output", () => {
    expect(resolveIconMode({ FORCE_COLOR: "1" }, { isTTY: false })).toBe(
      "nerd",
    );
  });

  it("uses Nerd Font icons for interactive local terminals in auto mode", () => {
    expect(resolveIconMode({}, { isTTY: true })).toBe("nerd");
  });
});

describe("terminal log formatting", () => {
  it("formats info, warn, and error levels with readable labels", () => {
    const info = stripAnsi(
      formatTerminalLogRecord(
        { level: 30, msg: "Server ready" },
        { color: false, iconMode: "ascii" },
      ),
    );
    const warn = stripAnsi(
      formatTerminalLogRecord(
        { level: 40, msg: "Skipped unsupported file" },
        { color: false, iconMode: "ascii" },
      ),
    );
    const error = stripAnsi(
      formatTerminalLogRecord(
        { level: 50, msg: "FFmpeg failed", err: { message: "exit code 1" } },
        { color: false, iconMode: "ascii" },
      ),
    );

    expect(info).toContain("i INFO");
    expect(info).toContain("server");
    expect(info).toContain("Server ready");
    expect(warn).toContain("! WARN");
    expect(warn).toContain("Skipped unsupported file");
    expect(error).toContain("x ERROR");
    expect(error).toContain("FFmpeg failed");
    expect(error).toContain("exit code 1");
  });

  it("tracks request ids so completed requests show method, path, status, and timing", () => {
    const lines: string[] = [];
    const stream = createTerminalLogStream({
      color: false,
      iconMode: "ascii",
      write: (line) => lines.push(stripAnsi(line)),
    });

    stream.write(
      JSON.stringify({
        level: 30,
        reqId: "req-1",
        req: { method: "GET", url: "/api/v1/health" },
        msg: "incoming request",
      }),
    );
    stream.write(
      JSON.stringify({
        level: 30,
        reqId: "req-1",
        res: { statusCode: 200 },
        responseTime: 3.2,
        msg: "request completed",
      }),
    );

    expect(lines).toHaveLength(2);
    expect(lines[1]).toContain("INFO");
    expect(lines[1]).toContain("http");
    expect(lines[1]).toContain("GET /api/v1/health");
    expect(lines[1]).toContain("200");
    expect(lines[1]).toContain("3ms");
  });
});
