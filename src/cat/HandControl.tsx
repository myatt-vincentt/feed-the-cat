// Hand control: reads every hand in view each frame (hands.ts decides) and
// steers the stage like touch does — a quick pinch taps (feed / pet), a
// flicked pinch throws, pointing shines the laser, a fist turns it, a
// two-handed pinch zooms — and shows a cursor where a tap would land: a ring
// between thumb and index that fills as they close.
import { useMemo, useRef } from "react";
import { Html } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { XRModel } from "@vincentt-xr/sdk";
import {
  measureFingerPattern,
  measureGrab,
  useXRModelNode,
  type XRModelNodeHandTracking,
} from "@vincentt-xr/sdk/low-level";
import { HandTracker } from "@vincentt-xr/sdk/tracking";

import { createHandControl, type HandInput, stepHands } from "./hands";
import { handState, orbitBy, stageControl, zoomTo } from "./state";

// Hand landmarks (MediaPipe).
const WRIST = 0;
const THUMB_TIP = 4;
const INDEX_TIP = 8;
const MIDDLE_BASE = 9;
/** Pointing: the index out, the other fingers curled, the thumb either way. */
const POINTING = {
  fingers: [true, false, false, false] as const,
  thumb: null,
};

const Controller = () => {
  const { size } = useThree();
  const hands = useXRModelNode<XRModelNodeHandTracking>(XRModel.HAND_TRACKER);
  const control = useMemo(createHandControl, []);
  const zoomBase = useRef(1);

  useFrame((_s, rawDt) => {
    const dt = Math.min(rawDt, 1 / 20);
    const W = size.width;
    const H = size.height;
    // Tracker points: centre origin, y up, already mirrored — onto screen px.
    const inputs: HandInput[] = [];
    for (const hand of hands?.hands ?? []) {
      const pts = hand.coordinates;
      if (!pts || pts.length <= MIDDLE_BASE) continue;
      const at = (i: number) => ({
        x: (pts[i].x * 0.5 + 0.5) * W,
        y: (0.5 - pts[i].y * 0.5) * H,
      });
      inputs.push({
        wrist: at(WRIST),
        thumbTip: at(THUMB_TIP),
        indexTip: at(INDEX_TIP),
        middleBase: at(MIDDLE_BASE),
        grab: measureGrab(pts),
        point: measureFingerPattern(pts, POINTING),
      });
    }
    const out = stepHands(control, inputs, dt, H);
    if (out.tap)
      stageControl.taps.push({
        x: (out.tap.x / W) * 2 - 1,
        y: 1 - (out.tap.y / H) * 2,
      });
    if (out.throw)
      stageControl.throws.push({
        at: {
          x: (out.throw.at.x / W) * 2 - 1,
          y: 1 - (out.throw.at.y / H) * 2,
        },
        vel: { x: (out.throw.vel.x / W) * 2, y: -(out.throw.vel.y / H) * 2 },
      });
    stageControl.laser = out.laser
      ? { x: (out.laser.x / W) * 2 - 1, y: 1 - (out.laser.y / H) * 2 }
      : null;
    if (out.orbit) orbitBy(out.orbit.x, out.orbit.y);
    if (out.zoomStart) zoomBase.current = stageControl.target.zoom;
    if (out.zoom !== undefined) zoomTo(zoomBase.current * out.zoom);
    handState.cursor = out.cursor;
  });
  return null;
};

/** The cursor: a ring that fills as the pinch closes. */
const Cursor = () => {
  const ring = useRef<HTMLDivElement>(null);
  const dot = useRef<HTMLDivElement>(null);
  useFrame(() => {
    const c = handState.cursor;
    const el = ring.current;
    if (!el || !dot.current) return;
    el.style.opacity = c ? "1" : "0";
    if (!c) return;
    el.style.transform = `translate(${c.x - 22}px, ${c.y - 22}px)`;
    dot.current.style.transform = `scale(${0.15 + 0.85 * c.fill})`;
  });
  return (
    <Html fullscreen zIndexRange={[35, 0]} style={{ pointerEvents: "none" }}>
      <div
        ref={ring}
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: 44,
          height: 44,
          borderRadius: 22,
          border: "3px solid #ffffff",
          boxShadow:
            "0 0 0 2px rgba(74, 125, 50, 0.6), 0 2px 8px rgba(0,0,0,0.3)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          opacity: 0,
          transition: "opacity 0.2s",
          pointerEvents: "none",
        }}
      >
        <div
          ref={dot}
          style={{
            width: 30,
            height: 30,
            borderRadius: 15,
            background: "rgba(255, 255, 255, 0.85)",
          }}
        />
      </div>
    </Html>
  );
};

export const HandControl = () => (
  <>
    <HandTracker />
    <Controller />
    <Cursor />
  </>
);
