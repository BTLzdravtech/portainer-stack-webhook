import { afterEach, describe, expect, it } from "bun:test";
import { ApiError } from "./errors";

describe("ApiError.toResponse", () => {
  const original = process.env.LOG_LEVEL;
  afterEach(() => {
    if (original === undefined) delete process.env.LOG_LEVEL;
    else process.env.LOG_LEVEL = original;
  });

  it("omits the stack trace by default (no leak in production)", async () => {
    delete process.env.LOG_LEVEL;
    const body = await new ApiError(502, "boom", { id: 1 }).toResponse().json();

    expect(body).toEqual({ message: "boom", id: 1 });
    expect(body).not.toHaveProperty("stack");
  });

  it("includes the stack trace only when LOG_LEVEL=debug", async () => {
    process.env.LOG_LEVEL = "debug";
    const body = (await new ApiError(500, "boom").toResponse().json()) as {
      stack?: unknown;
    };

    expect(Array.isArray(body.stack)).toBe(true);
  });
});
