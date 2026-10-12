import { describe, expect, it } from "vitest";

import { HANDS } from "./config";
import { createHandControl, type HandInput, stepHands } from "./hands";

const H = 1000;

/** A hand with its wrist at (x, y + 100), palm 100 px, thumb–index gap `gap` palms. */
const hand = (
  x: number,
  y: number,
  gap: number,
  grab = 0,
  point = 0,
): HandInput => ({
  wrist: { x, y: y + 100 },
  middleBase: { x, y },
  thumbTip: { x: x - 20, y: y - 60 },
  indexTip: { x: x - 20 + gap * 100, y: y - 60 },
  grab,
  point,
});

const frames = (
  c: ReturnType<typeof createHandControl>,
  seconds: number,
  hands: (t: number) => HandInput[],
) => {
  const outs = [];
  for (let t = 0; t < seconds; t += 1 / 30)
    outs.push(stepHands(c, hands(t), 1 / 30, H));
  return outs;
};

describe("hand tap", () => {
  it("a quick pinch taps where thumb and index meet; the cursor follows them", () => {
    const c = createHandControl();
    const open = frames(c, 0.3, () => [hand(400, 500, 0.9)]);
    expect(open[open.length - 1].cursor).not.toBeNull();
    expect(open[open.length - 1].cursor!.fill).toBeLessThan(0.1);
    const pinch = frames(c, 0.2, () => [hand(400, 500, 0.1)]);
    expect(pinch.some((o) => o.tap)).toBe(false); // taps on release
    expect(pinch[pinch.length - 1].cursor!.fill).toBe(1);
    const release = frames(c, 0.1, () => [hand(400, 500, 0.9)]);
    const tap = release.find((o) => o.tap)?.tap;
    expect(tap).toBeDefined();
    expect(tap!.x).toBeCloseTo(400 - 20 + 5);
    expect(tap!.y).toBeCloseTo(440);
  });

  it("a long pinch doesn't tap", () => {
    const c = createHandControl();
    frames(c, 0.3, () => [hand(400, 500, 0.9)]);
    frames(c, HANDS.tapTime + 0.3, () => [hand(400, 500, 0.1)]);
    const release = frames(c, 0.1, () => [hand(400, 500, 0.9)]);
    expect(release.some((o) => o.tap)).toBe(false);
  });
});

describe("hand orbit", () => {
  it("a fist moving drags the stage round", () => {
    const c = createHandControl();
    const outs = frames(c, 0.5, (t) => [hand(300 + t * 400, 500, 0.6, 0.95)]);
    const dx = outs.reduce((a, o) => a + (o.orbit?.x ?? 0), 0);
    expect(dx).toBeGreaterThan(150);
    expect(outs.some((o) => o.tap)).toBe(false);
    // A fist shows no cursor.
    expect(outs[outs.length - 1].cursor).toBeNull();
  });
});

describe("hand orbit, still", () => {
  it("a resting fist's jitter doesn't turn the stage", () => {
    const c = createHandControl();
    const outs = frames(c, 2, (t) => [
      hand(400 + Math.sin(t * 40), 500 + Math.cos(t * 37), 0.6, 0.95),
    ]);
    expect(outs.some((o) => o.orbit)).toBe(false);
  });
});

describe("hand zoom", () => {
  it("pinching with both hands and pulling apart zooms in, without tapping", () => {
    const c = createHandControl();
    frames(c, 0.3, () => [hand(300, 500, 0.9), hand(700, 500, 0.9)]);
    const outs = frames(c, 0.6, (t) => [
      hand(300 - t * 200, 500, 0.1),
      hand(700 + t * 200, 500, 0.1),
    ]);
    expect(outs.some((o) => o.zoomStart)).toBe(true);
    expect(outs[outs.length - 1].zoom).toBeGreaterThan(1.2);
    const release = frames(c, 0.1, () => [
      hand(180, 500, 0.9),
      hand(820, 500, 0.9),
    ]);
    expect(release.some((o) => o.tap)).toBe(false);
  });
});

describe("hand laser and throw", () => {
  it("pointing shines the laser at the fingertip (no cursor), not when pinching", () => {
    const c = createHandControl();
    const outs = frames(c, 0.3, () => [hand(400, 500, 0.9, 0, 0.9)]);
    const last = outs[outs.length - 1];
    expect(last.laser).toEqual({ x: 400 - 20 + 90, y: 440 });
    expect(last.cursor).toBeNull();
    const pinched = frames(c, 0.3, () => [hand(400, 500, 0.1, 0, 0.9)]);
    expect(pinched[pinched.length - 1].laser).toBeNull();
  });

  it("a pinch let go mid-flick throws that way (and doesn't tap)", () => {
    const c = createHandControl();
    frames(c, 0.3, () => [hand(300, 500, 0.9)]);
    frames(c, 0.1, () => [hand(300, 500, 0.1)]);
    // Flick right fast: 1500 px/s (1.5 screen heights / s).
    const flick = frames(c, 0.15, (t) => [hand(300 + t * 1500, 500, 0.1)]);
    const release = frames(c, 0.05, () => [hand(530, 500, 0.9)]);
    const all = [...flick, ...release];
    const thrown = all.find((o) => o.throw)?.throw;
    expect(thrown).toBeDefined();
    expect(thrown!.vel.x).toBeGreaterThan(HANDS.flick * H);
    expect(all.some((o) => o.tap)).toBe(false);
  });
});
