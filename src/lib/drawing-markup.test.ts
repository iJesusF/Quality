import { describe, expect, it } from "vitest";
import { getSegmentColor, getSegmentStatusLabel } from "./drawing-markup";

describe("drawing markup statuses", () => {
  it("assigns field colors consistently", () => {
    expect(getSegmentColor("NOT_STARTED")).toBe("#94a3b8");
    expect(getSegmentColor("IN_REVIEW")).toBe("#eab308");
    expect(getSegmentColor("APPROVED")).toBe("#16a34a");
    expect(getSegmentColor("NCR")).toBe("#ef4444");
  });

  it("formats an unknown status instead of hiding it", () => {
    expect(getSegmentStatusLabel("PENDING_SIGNATURE")).toBe("PENDING SIGNATURE");
  });
});
