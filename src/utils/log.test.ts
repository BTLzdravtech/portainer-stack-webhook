import { afterEach, describe, expect, it, spyOn } from "bun:test";
import { createLogger } from "./log";

describe("createLogger", () => {
  const original = process.env.LOG_LEVEL;
  afterEach(() => {
    if (original === undefined) delete process.env.LOG_LEVEL;
    else process.env.LOG_LEVEL = original;
  });

  it("suppresses everything at the silent level", () => {
    process.env.LOG_LEVEL = "silent";
    const log = createLogger();
    const out = spyOn(console, "log").mockImplementation(() => {});
    const err = spyOn(console, "error").mockImplementation(() => {});

    log.info("hi");
    log.error("boom");

    expect(out).not.toHaveBeenCalled();
    expect(err).not.toHaveBeenCalled();
    out.mockRestore();
    err.mockRestore();
  });

  it("hides debug but shows info by default", () => {
    delete process.env.LOG_LEVEL;
    const log = createLogger();
    const out = spyOn(console, "log").mockImplementation(() => {});

    log.debug("dbg");
    log.info("nfo");

    expect(out).toHaveBeenCalledTimes(1);
    expect(out.mock.calls[0][0]).toContain("nfo");
    out.mockRestore();
  });

  it("emits debug when LOG_LEVEL=debug", () => {
    process.env.LOG_LEVEL = "debug";
    const log = createLogger();
    const out = spyOn(console, "log").mockImplementation(() => {});

    log.debug("dbg");

    expect(out).toHaveBeenCalledTimes(1);
    out.mockRestore();
  });

  it("prefixes the scope and routes warn/error to the right console methods", () => {
    process.env.LOG_LEVEL = "debug";
    const log = createLogger("stack 22");
    const warn = spyOn(console, "warn").mockImplementation(() => {});
    const error = spyOn(console, "error").mockImplementation(() => {});

    log.warn("careful");
    log.error("broke");

    expect(warn).toHaveBeenCalledTimes(1);
    expect(error).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toContain("stack 22");
    expect(warn.mock.calls[0][0]).toContain("careful");
    warn.mockRestore();
    error.mockRestore();
  });
});
