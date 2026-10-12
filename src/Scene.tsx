// Scene.tsx — Feed the Cat: a round little floor floats over your camera with
// a toon cat living on it. Tap the floor (or point and pinch) to drop food, tap
// the cat to pet it; drag (or move a fist) to turn it, pinch (or pinch with
// both hands) to zoom. See PLAN.md.
import { lazy, Suspense } from "react";

import { ExperienceStatus } from "./cat/ExperienceStatus";
import { HandControl } from "./cat/HandControl";
import { Hud } from "./cat/Hud";
import { Stage } from "./cat/Stage";

// Dev-only media switcher for previewing without a camera. Lazy and behind a
// constant esbuild folds to false in production. Two rules:
// `process.env.NODE_ENV`, not `import.meta.env.DEV`
// (vincentt-xr/v2-template#112); and write the check INSIDE the ternary —
// hoisted into a `const`, esbuild keeps the dead branch.
const DevMediaSwitcher =
  process.env.NODE_ENV !== "production"
    ? lazy(() => import("./DevMediaSwitcher"))
    : null;

export const Scene = () => (
  <>
    <ExperienceStatus />
    <hemisphereLight args={["#fff8e8", "#6b8f4e", 0.9]} />
    {/* The model loads through a suspending loader. */}
    <Suspense fallback={null}>
      <Stage />
    </Suspense>
    <HandControl />
    <Hud />
    {DevMediaSwitcher ? (
      <Suspense fallback={null}>
        <DevMediaSwitcher />
      </Suspense>
    ) : null}
  </>
);
