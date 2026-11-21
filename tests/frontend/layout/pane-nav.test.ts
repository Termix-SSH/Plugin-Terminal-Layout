import { describe, expect, it } from "vitest";
import { neighborPane } from "../../../src/frontend/layout/pane-nav";

// a | b
// --+--
// a | c
const rects = {
  a: { left: 0, top: 0, right: 100, bottom: 200 },
  b: { left: 100, top: 0, right: 200, bottom: 100 },
  c: { left: 100, top: 100, right: 200, bottom: 200 },
};

describe("neighborPane", () => {
  it("finds the pane in each direction", () => {
    expect(neighborPane(rects, "a", "right")).toMatch(/^[bc]$/);
    expect(neighborPane(rects, "b", "left")).toBe("a");
    expect(neighborPane(rects, "b", "down")).toBe("c");
    expect(neighborPane(rects, "c", "up")).toBe("b");
  });

  it("returns null at the edge or for an unknown pane", () => {
    expect(neighborPane(rects, "a", "left")).toBeNull();
    expect(neighborPane(rects, "b", "up")).toBeNull();
    expect(neighborPane(rects, "zz", "up")).toBeNull();
  });
});
