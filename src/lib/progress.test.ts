import { describe, expect, it } from "vitest";
import { completionPercent } from "./progress";

describe("completionPercent", () => {
  it("calculates rounded progress", () => expect(completionPercent(2, 3)).toBe(67));
  it("returns zero when there is no scope", () => expect(completionPercent(0, 0)).toBe(0));
  it("clamps inconsistent data", () => expect(completionPercent(12, 10)).toBe(100));
});
