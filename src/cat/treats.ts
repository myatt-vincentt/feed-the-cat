// The treats, built from simple shapes in a toon style (stage units, each
// about 0.12 across, resting on y = 0): a fish, a drumstick, a pile of kibble.
// Plus the little effects: a dust puff where food lands, hearts from the cat.
import {
  CanvasTexture,
  ConeGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  SphereGeometry,
  Sprite,
  SpriteMaterial,
} from "three";

import type { FoodKind } from "./world";

const mat = (color: string, roughness = 0.6) =>
  new MeshStandardMaterial({ color, roughness });

const fish = () => {
  const g = new Group();
  const body = new Mesh(new SphereGeometry(0.05, 16, 12), mat("#ff9d5c", 0.45));
  body.scale.set(1.7, 0.75, 0.55);
  body.position.y = 0.03;
  const belly = new Mesh(
    new SphereGeometry(0.045, 16, 12),
    mat("#ffe0b8", 0.5),
  );
  belly.scale.set(1.4, 0.45, 0.5);
  belly.position.set(0.005, 0.018, 0);
  const tail = new Mesh(new ConeGeometry(0.035, 0.06, 3), mat("#ff7a3d", 0.5));
  tail.rotation.z = Math.PI / 2;
  tail.scale.set(1, 1, 0.35);
  tail.position.set(-0.095, 0.03, 0);
  const eye = new Mesh(new SphereGeometry(0.008, 8, 6), mat("#1b1b1b", 0.3));
  eye.position.set(0.055, 0.04, 0.022);
  g.add(body, belly, tail, eye);
  return g;
};

const drumstick = () => {
  const g = new Group();
  const meat = new Mesh(new SphereGeometry(0.045, 16, 12), mat("#c8743a", 0.5));
  meat.scale.set(1.45, 0.9, 0.9);
  meat.position.set(0.02, 0.04, 0);
  const bone = new Mesh(
    new CylinderGeometry(0.011, 0.011, 0.07, 10),
    mat("#fbf3e6", 0.4),
  );
  bone.rotation.z = Math.PI / 2;
  bone.position.set(-0.07, 0.035, 0);
  const knobA = new Mesh(new SphereGeometry(0.014, 10, 8), mat("#fbf3e6", 0.4));
  knobA.position.set(-0.105, 0.042, 0.009);
  const knobB = knobA.clone();
  knobB.position.set(-0.105, 0.042, -0.009);
  g.add(meat, bone, knobA, knobB);
  return g;
};

const kibble = () => {
  const g = new Group();
  const colors = ["#a0522d", "#b8692f", "#8b4a24"];
  for (let i = 0; i < 9; i++) {
    const a = i * 2.39996;
    const d = 0.012 + 0.028 * Math.sqrt(i / 9);
    const bit = new Mesh(
      i % 2
        ? new SphereGeometry(0.014, 8, 6)
        : new CylinderGeometry(0.014, 0.014, 0.012, 8),
      mat(colors[i % colors.length], 0.7),
    );
    bit.position.set(
      Math.cos(a) * d,
      0.012 + (i < 3 ? 0.014 : 0),
      Math.sin(a) * d,
    );
    bit.rotation.set(i, i * 2, 0);
    g.add(bit);
  }
  return g;
};

/** A new treat of `kind`, resting on y = 0. */
export const makeTreat = (kind: FoodKind): Group => {
  if (kind === "fish") return fish();
  if (kind === "drumstick") return drumstick();
  return kibble();
};

/** Free a treat's geometry and materials. */
export const disposeTreat = (g: Group) =>
  g.traverse((o) => {
    const m = o as Mesh;
    if (m.isMesh) {
      m.geometry.dispose();
      (m.material as MeshStandardMaterial).dispose();
    }
  });

let heart: CanvasTexture | null = null;
/** A heart sprite (shared texture). */
export const makeHeart = () => {
  if (!heart) {
    const size = 64;
    const c = document.createElement("canvas");
    c.width = size;
    c.height = size;
    const ctx = c.getContext("2d") as CanvasRenderingContext2D;
    ctx.translate(size / 2, size / 2 + 4);
    const s = size * 0.42;
    ctx.beginPath();
    ctx.moveTo(0, s * 0.75);
    ctx.bezierCurveTo(-s * 1.3, -s * 0.1, -s * 0.8, -s * 1.1, 0, -s * 0.45);
    ctx.bezierCurveTo(s * 0.8, -s * 1.1, s * 1.3, -s * 0.1, 0, s * 0.75);
    ctx.fillStyle = "#ff4f7a";
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = "#ffffff";
    ctx.stroke();
    heart = new CanvasTexture(c);
  }
  const s = new Sprite(
    new SpriteMaterial({ map: heart, transparent: true, depthWrite: false }),
  );
  s.scale.setScalar(0.08);
  return s;
};

/** A dust puff: a ring of little white balls. */
export const makePuff = () => {
  const g = new Group();
  for (let i = 0; i < 8; i++) {
    const b = new Mesh(
      new SphereGeometry(0.02, 8, 6),
      new MeshStandardMaterial({
        color: "#f4efe6",
        transparent: true,
        roughness: 1,
      }),
    );
    const a = (i / 8) * Math.PI * 2;
    b.userData.dir = [Math.cos(a), Math.sin(a)];
    g.add(b);
  }
  return g;
};
