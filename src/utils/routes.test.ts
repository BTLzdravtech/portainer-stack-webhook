import { describe, expect, it } from "bun:test";
import { defineRoute, type Route } from "./routes";

describe("Route Utils", () => {
  describe("defineRoute", () => {
    it("should return the same route passed in", () => {
      const expected = Symbol("test object ref") as unknown as Route;

      expect(defineRoute(expected)).toBe(expected);
    });
  });
});
