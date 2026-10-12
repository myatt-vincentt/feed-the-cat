// The ground: a smooth, flat round disc — light peach in the middle, deepening
// to a dusty rose at a rounded rim — on a thin edge, with a faint shadow
// beneath; a cushion and a water bowl on it. And the soft shadow texture.
// Stage units: radius GROUND.radius, the top at y = 0.
import { useEffect, useMemo } from "react";
import { CanvasTexture, SRGBColorSpace } from "three";

import { GROUND, PROPS } from "./config";
import { PROP_LIST } from "./world";

/** The top's colour: a radial gradient, painted once. */
const makeTop = () => {
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
  const g = ctx.createRadialGradient(
    size * 0.47,
    size * 0.45,
    0,
    size / 2,
    size / 2,
    size / 2,
  );
  g.addColorStop(0, GROUND.centre);
  g.addColorStop(0.55, GROUND.middle);
  g.addColorStop(1, GROUND.rim);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
};

let shadow: CanvasTexture | null = null;
/** A soft round shadow (a radial gradient), shared by the cat and the treats. */
export const shadowTexture = () => {
  if (shadow) return shadow;
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
  const g = ctx.createRadialGradient(
    size / 2,
    size / 2,
    0,
    size / 2,
    size / 2,
    size / 2,
  );
  g.addColorStop(0, "rgba(70, 30, 40, 1)");
  g.addColorStop(0.45, "rgba(70, 30, 40, 0.75)");
  g.addColorStop(1, "rgba(70, 30, 40, 0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  shadow = new CanvasTexture(canvas);
  return shadow;
};

/** The cushion (a puffy round pillow) and the water bowl, where world.ts puts them. */
const Props = () => {
  const c = PROPS.cushion;
  const b = PROPS.bowl;
  return (
    <>
      {PROP_LIST.map((p) =>
        p.kind === "cushion" ? (
          <group key={p.kind} position={[p.x, 0, p.z]}>
            <mesh position-y={p.height * 0.5} scale={[1, 0.32, 1]}>
              <sphereGeometry args={[p.radius, 32, 16]} />
              <meshStandardMaterial color={c.color} roughness={0.95} />
            </mesh>
            <mesh rotation-x={-Math.PI / 2} position-y={p.height * 0.35}>
              <torusGeometry args={[p.radius * 0.92, p.radius * 0.1, 10, 40]} />
              <meshStandardMaterial color={c.trim} roughness={0.9} />
            </mesh>
            <mesh rotation-x={-Math.PI / 2} position-y={0.002}>
              <planeGeometry args={[p.radius * 2.6, p.radius * 2.6]} />
              <meshBasicMaterial
                map={shadowTexture()}
                transparent
                depthWrite={false}
                opacity={0.3}
              />
            </mesh>
          </group>
        ) : (
          <group key={p.kind} position={[p.x, 0, p.z]}>
            <mesh position-y={p.height / 2}>
              <cylinderGeometry
                args={[p.radius, p.radius * 0.82, p.height, 32]}
              />
              <meshStandardMaterial color={b.color} roughness={0.35} />
            </mesh>
            <mesh rotation-x={-Math.PI / 2} position-y={p.height}>
              <torusGeometry
                args={[p.radius * 0.93, p.radius * 0.08, 10, 40]}
              />
              <meshStandardMaterial color={b.color} roughness={0.3} />
            </mesh>
            <mesh rotation-x={-Math.PI / 2} position-y={p.height * 0.82}>
              <circleGeometry args={[p.radius * 0.86, 32]} />
              <meshStandardMaterial
                color={b.water}
                roughness={0.1}
                metalness={0.1}
              />
            </mesh>
            <mesh rotation-x={-Math.PI / 2} position-y={0.002}>
              <planeGeometry args={[p.radius * 3, p.radius * 3]} />
              <meshBasicMaterial
                map={shadowTexture()}
                transparent
                depthWrite={false}
                opacity={0.3}
              />
            </mesh>
          </group>
        ),
      )}
    </>
  );
};

export const Ground = () => {
  const top = useMemo(makeTop, []);
  useEffect(() => () => top.dispose(), [top]);
  const r = GROUND.radius;
  const t = GROUND.thickness;
  return (
    <group name="ground">
      {/* The top: a disc whose UVs map the gradient straight across. */}
      <mesh rotation-x={-Math.PI / 2}>
        <circleGeometry args={[r, 96]} />
        <meshStandardMaterial map={top} roughness={0.9} metalness={0} />
      </mesh>
      {/* A rounded rim, then the thin edge below it. */}
      <mesh rotation-x={-Math.PI / 2} position-y={-GROUND.rimSize * 0.4}>
        <torusGeometry
          args={[r - GROUND.rimSize * 0.6, GROUND.rimSize, 12, 96]}
        />
        <meshStandardMaterial color={GROUND.rimColor} roughness={0.85} />
      </mesh>
      <mesh position={[0, -t / 2 - 0.001, 0]}>
        <cylinderGeometry args={[r, r * 0.985, t, 96, 1, true]} />
        <meshStandardMaterial color={GROUND.side} roughness={0.9} />
      </mesh>
      {/* A faint soft shadow beneath, so it sits on something. */}
      <mesh rotation-x={-Math.PI / 2} position-y={-t - 0.06}>
        <planeGeometry args={[r * 2.5, r * 2.5]} />
        <meshBasicMaterial
          map={shadowTexture()}
          transparent
          depthWrite={false}
          opacity={GROUND.underShadow}
        />
      </mesh>
      <Props />
    </group>
  );
};
