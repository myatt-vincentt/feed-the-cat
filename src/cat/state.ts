// Shared live state: the stage writes it, the HUD reads it, touch and hands
// steer it. Plain mutable fields (no React state).
import { ORBIT } from "./config";

export const catState = {
  /** Food dropped, pets, meals so far; how chubby; what the cat's doing. */
  fed: 0,
  pets: 0,
  meals: 0,
  chubby: 0,
  purring: false,
  eating: false,
};

/**
 * Where the stage is headed (it eases there), taps and throws waiting for the
 * next frame and the laser (NDC) — written by touch and by the hand
 * controller alike.
 */
export const stageControl = {
  target: { yaw: ORBIT.yaw, pitch: ORBIT.pitch, zoom: ORBIT.zoom },
  taps: [] as { x: number; y: number }[],
  /** Throws (from a point, at a velocity — NDC and NDC / s), and the laser's spot (NDC). */
  throws: [] as {
    at: { x: number; y: number };
    vel: { x: number; y: number };
  }[],
  laser: null as { x: number; y: number } | null,
};

/** Turn the stage by a drag of (dx, dy) px. */
export const orbitBy = (dx: number, dy: number) => {
  const t = stageControl.target;
  t.yaw += dx * ORBIT.dragSpeed;
  t.pitch = Math.max(
    ORBIT.pitchRange[0],
    Math.min(ORBIT.pitchRange[1], t.pitch + dy * ORBIT.dragSpeed * 0.6),
  );
};

/** Set the stage's zoom (clamped). */
export const zoomTo = (z: number) => {
  stageControl.target.zoom = Math.max(
    ORBIT.zoomRange[0],
    Math.min(ORBIT.zoomRange[1], z),
  );
};

/** The hand cursor (screen px) and how closed its pinch is, or null. */
export const handState = {
  cursor: null as { x: number; y: number; fill: number } | null,
};
