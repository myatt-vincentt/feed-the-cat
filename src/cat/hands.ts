// Hand control — pure, unit-tested (hands.test.ts). Per frame it takes the
// hands in view (screen px, y down) and turns them into what the stage does:
//
//   🤏 quick pinch                tap at the cursor (between thumb and index)
//   🤏💨 pinch, flick and let go     throw a treat that way
//   ☝️ point (index only)          a laser dot at the fingertip
//   ✊ fist and move               orbit (spin left / right, tilt up / down)
//   🤏🤏 pinch with both hands       zoom: pulled apart in, pushed together out
//
// A pinch only taps when it's quick and alone: a long pinch, or one that
// becomes a two-handed zoom, doesn't. Hands are kept apart by position (the
// tracker's own order can swap between frames).
import { HANDS } from "./config";

export type P = { x: number; y: number };

/**
 * One hand this frame (screen px, y down), the SDK's grab score 0..1 and its
 * index-only finger-pattern score 0..1 (pointing).
 */
export type HandInput = {
  wrist: P;
  thumbTip: P;
  indexTip: P;
  middleBase: P;
  grab: number;
  point: number;
};

type Track = {
  at: P;
  pinched: boolean;
  /** Seconds closed (held), and since the pinch began. */
  closedFor: number;
  pinchAge: number;
  /** This pinch took part in a zoom (so it won't tap). */
  zoomed: boolean;
  /** Where the pinch is (between thumb and index): a tap lands here. */
  pinchAt: P | null;
  /** The pinch's velocity (px/s, smoothed): fast at release, it throws. */
  pinchVel: P;
  /** Fist: where the palm was last frame, and how long it's been a fist. */
  fistAt: P | null;
  fistFor: number;
  seen: boolean;
};

export type HandControl = {
  tracks: Track[];
  /** Zoom: the two pinches' starting distance (px), or 0. */
  zoomFrom: number;
};

export const createHandControl = (): HandControl => ({
  tracks: [],
  zoomFrom: 0,
});

export type HandOutput = {
  /** Where a tap would land, and how closed the pinch is (0..1). */
  cursor: (P & { fill: number }) | null;
  /** A quick pinch released this frame: tap here. */
  tap?: P;
  /** A pinch released mid-flick: throw from here at this velocity (px/s). */
  throw?: { at: P; vel: P };
  /** Pointing: the laser dot's spot (the index fingertip), or null. */
  laser: P | null;
  /** A fist moved this frame by (px). */
  orbit?: P;
  /** Both hands pinching: their distance over its starting distance. */
  zoom?: number;
  /** A two-hand zoom just began (take the stage's zoom as the base). */
  zoomStart?: boolean;
};

const dist = (a: P, b: P) => Math.hypot(a.x - b.x, a.y - b.y);
const mid = (a: P, b: P) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

/** Pinch closeness from 0 (open) to 1 (closed), and whether it counts as closed. */
const pinchOf = (h: HandInput, wasPinched: boolean) => {
  const palm = Math.max(1, dist(h.wrist, h.middleBase));
  const ratio = dist(h.thumbTip, h.indexTip) / palm;
  const reach = dist(h.indexTip, h.wrist) / palm;
  const closed = wasPinched
    ? ratio < HANDS.open
    : ratio < HANDS.closed && reach >= HANDS.reach;
  const fill = Math.max(0, Math.min(1, (0.9 - ratio) / (0.9 - HANDS.closed)));
  return { closed, fill };
};

/**
 * Advance one frame with the hands in view on a `height`-px-tall screen.
 * Mutates the control; returns what the stage should do.
 */
export const stepHands = (
  c: HandControl,
  hands: readonly HandInput[],
  dt: number,
  height: number,
): HandOutput => {
  const out: HandOutput = { cursor: null, laser: null };
  // Match this frame's hands to last frame's tracks, nearest first.
  const palms = hands.map((h) => mid(h.wrist, h.middleBase));
  const used = new Set<number>();
  const owner: number[] = palms.map(() => -1);
  const pairs: { d: number; t: number; p: number }[] = [];
  c.tracks.forEach((t, ti) =>
    palms.forEach((p, pi) => {
      const d = dist(t.at, p);
      if (d < HANDS.jump * height) pairs.push({ d, t: ti, p: pi });
    }),
  );
  pairs.sort((a, b) => a.d - b.d);
  for (const { t, p } of pairs)
    if (owner[p] === -1 && !used.has(t)) {
      owner[p] = t;
      used.add(t);
    }
  const next: Track[] = palms.map((p, i) => {
    const old = owner[i] >= 0 ? c.tracks[owner[i]] : null;
    return (
      old ?? {
        at: p,
        pinched: false,
        closedFor: 0,
        pinchAge: 0,
        zoomed: false,
        pinchAt: null,
        pinchVel: { x: 0, y: 0 },
        fistAt: null,
        fistFor: 0,
        seen: false,
      }
    );
  });

  let pinching = 0;
  // A fist that hardly moved keeps its last position, so slow drags add up.
  let continueFist = false;
  hands.forEach((h, i) => {
    const t = next[i];
    t.at = palms[i];
    const { closed, fill } = pinchOf(h, t.pinched);
    const fist = h.grab >= HANDS.grab && !closed;
    // Pinch: closed long enough to count; a quick one taps on release.
    if (!t.seen) {
      // A hand arriving mid-pinch doesn't tap.
      t.seen = true;
      t.pinched = closed;
      t.zoomed = closed;
    } else {
      t.closedFor = closed ? t.closedFor + dt : 0;
      if (!t.pinched && t.closedFor >= HANDS.hold) {
        t.pinched = true;
        t.pinchAge = 0;
        t.zoomed = false;
      } else if (t.pinched && !closed) {
        t.pinched = false;
        const speed = Math.hypot(t.pinchVel.x, t.pinchVel.y);
        if (!t.zoomed && t.pinchAt && speed >= HANDS.flick * height)
          out.throw = { at: t.pinchAt, vel: { ...t.pinchVel } };
        else if (!t.zoomed && t.pinchAge < HANDS.tapTime && t.pinchAt)
          out.tap = t.pinchAt;
        t.pinchVel = { x: 0, y: 0 };
        t.pinchAt = null;
      }
    }
    if (t.pinched) {
      t.pinchAge += dt;
      const at = mid(h.thumbTip, h.indexTip);
      if (t.pinchAt && dt > 0) {
        const k = 1 - Math.exp(-dt * 18);
        t.pinchVel.x += ((at.x - t.pinchAt.x) / dt - t.pinchVel.x) * k;
        t.pinchVel.y += ((at.y - t.pinchAt.y) / dt - t.pinchVel.y) * k;
      }
      t.pinchAt = at;
      pinching++;
    }
    // Fist: drag the stage round — once it's been a fist a moment, and
    // ignoring the tracker's jitter.
    if (fist) {
      t.fistFor += dt;
      if (t.fistAt && t.fistFor >= HANDS.fistHold) {
        const dx = t.at.x - t.fistAt.x;
        const dy = t.at.y - t.fistAt.y;
        if (Math.hypot(dx, dy) >= HANDS.jitter)
          out.orbit = {
            x: (out.orbit?.x ?? 0) + dx * HANDS.orbitGain,
            y: (out.orbit?.y ?? 0) + dy * HANDS.orbitGain,
          };
        else continueFist = true;
      }
      if (!continueFist) t.fistAt = { ...t.at };
      continueFist = false;
    } else {
      t.fistAt = null;
      t.fistFor = 0;
    }
    // Pointing: a laser dot at the fingertip (instead of the cursor).
    const pointing = h.point >= HANDS.point && !closed && !fist;
    if (pointing && !out.laser) out.laser = { ...h.indexTip };
    // The cursor: the first open (not fist, not pointing) hand.
    if (!out.cursor && !fist && !pointing)
      out.cursor = {
        ...mid(h.thumbTip, h.indexTip),
        fill: t.pinched ? 1 : fill,
      };
  });

  // Zoom: both hands pinching.
  if (pinching >= 2 && hands.length >= 2) {
    const pinched = hands.filter((_, i) => next[i].pinched);
    const d = dist(
      mid(pinched[0].thumbTip, pinched[0].indexTip),
      mid(pinched[1].thumbTip, pinched[1].indexTip),
    );
    for (const t of next) if (t.pinched) t.zoomed = true;
    if (c.zoomFrom === 0) {
      c.zoomFrom = Math.max(1, d);
      out.zoomStart = true;
    }
    out.zoom = d / c.zoomFrom;
  } else c.zoomFrom = 0;

  c.tracks = next;
  return out;
};
