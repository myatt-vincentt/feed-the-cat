// The stage: a round peach floor floating in front of the camera, over the
// live camera feed, with the cat living on it, soft shadows under it and its
// treats. Drag to spin and tilt it, pinch or scroll to zoom (the stage
// turns, not the camera). A quick tap feeds: food drops where you tapped on
// the floor. Tap the cat to pet it.
import { useEffect, useMemo, useRef } from "react";
import {
  Group,
  Mesh,
  MeshBasicMaterial,
  type MeshStandardMaterial,
  Plane,
  PlaneGeometry,
  Raycaster,
  type Sprite,
  Vector2,
  Vector3,
} from "three";
import { useFrame, useThree } from "@react-three/fiber";

import { animateCat, useCatRig } from "./CatModel";
import {
  CAT,
  EMOTE,
  LASER,
  MODEL,
  ORBIT,
  SHADOW,
  STAGE,
  THROW,
} from "./config";
import { emoteTexture } from "./emotes";
import { Ground, shadowTexture } from "./Ground";
import { catState, orbitBy, stageControl, zoomTo } from "./state";
import { disposeTreat, makeHeart, makePuff, makeTreat } from "./treats";
import {
  createWorld,
  dropFood,
  type Emote,
  emoteOf,
  petCat,
  setLaser,
  standHeight,
  stepWorld,
  throwFood,
} from "./world";

type Fx = {
  obj: Group | Sprite;
  age: number;
  life: number;
  kind: "puff" | "heart";
};

const ndc = new Vector2();
const raycaster = new Raycaster();
const plane = new Plane(new Vector3(0, 1, 0), 0);
const hit = new Vector3();
const hit2 = new Vector3();
const v = new Vector3();

/** A small soft shadow under a treat (its own material, freed with the treat). */
const treatShadow = () => {
  const m = new Mesh(
    new PlaneGeometry(SHADOW.treat.size, SHADOW.treat.size),
    new MeshBasicMaterial({
      map: shadowTexture(),
      transparent: true,
      depthWrite: false,
      opacity: SHADOW.treat.opacity,
    }),
  );
  m.name = "treatShadow";
  m.rotation.x = -Math.PI / 2;
  return m;
};

export const Stage = () => {
  const { camera, events, size } = useThree();
  const rig = useCatRig();
  const world = useMemo(() => createWorld(Math.random), []);
  const stage = useRef<Group>(null);
  const foods = useRef<Group>(null);
  const fxRoot = useRef<Group>(null);
  const catShadow = useRef<Mesh>(null);
  const laserDot = useRef<Mesh>(null);
  const emote = useRef<Sprite>(null);
  const live = useMemo(
    () => ({
      orbit: { yaw: ORBIT.yaw, pitch: ORBIT.pitch, zoom: ORBIT.zoom },
      treats: new Map<number, Group>(),
      fx: [] as Fx[],
      heartClock: 0,
      catY: 0,
      emote: null as Emote | null,
      emoteAge: 0,
    }),
    [],
  );

  // Input: drag to orbit, pinch / scroll to zoom, a quick tap to feed or pet.
  const source = events.connected as HTMLElement | undefined;
  useEffect(() => {
    const el = source;
    if (!el) return undefined;
    const pointers = new Map<
      number,
      { x: number; y: number; x0: number; y0: number; t0: number }
    >();
    let pinch = 0;
    const zoomBy = (k: number) => zoomTo(stageControl.target.zoom * k);
    const down = (e: PointerEvent) => {
      if ((e.target as Element | null)?.closest?.("button")) return;
      pointers.set(e.pointerId, {
        x: e.clientX,
        y: e.clientY,
        x0: e.clientX,
        y0: e.clientY,
        t0: performance.now(),
      });
      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        pinch = Math.hypot(a.x - b.x, a.y - b.y);
      }
    };
    const move = (e: PointerEvent) => {
      const p = pointers.get(e.pointerId);
      if (!p) return;
      const dx = e.clientX - p.x;
      const dy = e.clientY - p.y;
      p.x = e.clientX;
      p.y = e.clientY;
      if (pointers.size === 1) {
        orbitBy(dx, dy);
      } else if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (pinch > 0) zoomBy(d / pinch);
        pinch = d;
      }
    };
    const up = (e: PointerEvent) => {
      const p = pointers.get(e.pointerId);
      pointers.delete(e.pointerId);
      if (!p || pointers.size > 0) return;
      const moved = Math.hypot(e.clientX - p.x0, e.clientY - p.y0);
      const held = (performance.now() - p.t0) / 1000;
      if (moved < ORBIT.tapMove && held < ORBIT.tapTime) {
        const r = el.getBoundingClientRect();
        stageControl.taps.push({
          x: ((e.clientX - r.left) / r.width) * 2 - 1,
          y: -((e.clientY - r.top) / r.height) * 2 + 1,
        });
      }
    };

    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      zoomBy(Math.exp(-e.deltaY * 0.0015));
    };
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    el.addEventListener("wheel", wheel, { passive: false });
    return () => {
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
      el.removeEventListener("wheel", wheel);
    };
  }, [source, live]);

  // Dev hook for inspecting the stage live.
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      (window as unknown as { __cat?: unknown }).__cat = {
        world,
        rig,
        live,
        state: catState,
        control: stageControl,
      };
    }
  }, [world, rig, live]);

  useFrame((_s, rawDt) => {
    const dt = Math.min(rawDt, 1 / 20);
    const st = stage.current;
    if (!st) return;
    // Orbit, eased.
    const k = 1 - Math.exp(-ORBIT.ease * dt);
    live.orbit.yaw += (stageControl.target.yaw - live.orbit.yaw) * k;
    live.orbit.pitch += (stageControl.target.pitch - live.orbit.pitch) * k;
    live.orbit.zoom += (stageControl.target.zoom - live.orbit.zoom) * k;
    st.rotation.set(live.orbit.pitch, live.orbit.yaw, 0);
    st.scale.setScalar(live.orbit.zoom);
    st.updateMatrixWorld(true);

    // A point on screen (NDC) onto the floor, in the stage's own frame.
    const inv = st.matrixWorld.clone().invert();
    const floorAt = (x: number, y: number, out: Vector3) => {
      ndc.set(x, y);
      raycaster.setFromCamera(ndc, camera);
      raycaster.ray.applyMatrix4(inv);
      return raycaster.ray.intersectPlane(plane, out) !== null;
    };

    // Taps: the cat (pet) or the floor (food).
    for (const t of stageControl.taps.splice(0)) {
      rig.root.getWorldPosition(v);
      v.y += MODEL.length * 0.25 * live.orbit.zoom;
      v.project(camera);
      const aspect = size.width / Math.max(1, size.height);
      const reach = 0.16 * live.orbit.zoom;
      if (Math.hypot((t.x - v.x) * aspect, t.y - v.y) < reach) {
        petCat(world, Math.random);
        continue;
      }
      if (floorAt(t.x, t.y, hit)) {
        dropFood(world, hit.x, hit.z, Math.random);
        catState.fed++;
      }
    }
    // Throws: where the flick let go, and where it was heading a moment on.
    for (const t of stageControl.throws.splice(0)) {
      const ahead = 0.1;
      if (
        floorAt(t.at.x, t.at.y, hit) &&
        floorAt(t.at.x + t.vel.x * ahead, t.at.y + t.vel.y * ahead, hit2)
      ) {
        throwFood(
          world,
          hit.x,
          hit.z,
          ((hit2.x - hit.x) / ahead) * THROW.gain,
          ((hit2.z - hit.z) / ahead) * THROW.gain,
          Math.random,
        );
        catState.fed++;
      }
    }
    // The laser: where the fingertip points, on the floor.
    const l = stageControl.laser;
    setLaser(
      world,
      l && floorAt(l.x, l.y, hit) ? { x: hit.x, z: hit.z } : null,
    );
    if (laserDot.current) {
      laserDot.current.visible = !!world.laser;
      if (world.laser) {
        laserDot.current.position.set(world.laser.x, 0.006, world.laser.z);
        laserDot.current.scale.setScalar(0.9 + Math.random() * 0.25);
      }
    }

    // The world.
    const ev = stepWorld(world, dt, Math.random);
    const { cat } = world;
    // Up on the cushion when it's on it.
    live.catY +=
      (standHeight(cat.x, cat.z) - live.catY) * (1 - Math.exp(-8 * dt));
    rig.root.position.set(cat.x, live.catY, cat.z);
    rig.root.rotation.y = cat.heading;
    animateCat(rig, cat, dt);
    if (catShadow.current) {
      const sh = catShadow.current;
      sh.position.x = cat.x + SHADOW.offset.x;
      sh.position.z = cat.z + SHADOW.offset.z;
      sh.rotation.z = cat.heading;
      sh.scale.set(
        SHADOW.cat.width * (1 + CAT.chubbyWidth * cat.chubby),
        SHADOW.cat.length,
        1,
      );
    }

    // The emote bubble over the cat: pops in when the mood changes.
    const mood = emoteOf(world);
    if (mood !== live.emote) {
      live.emote = mood;
      live.emoteAge = 0;
    }
    live.emoteAge += dt;
    const em = emote.current;
    if (em) {
      em.visible = !!mood;
      if (mood) {
        if (em.material.map !== emoteTexture(mood)) {
          em.material.map = emoteTexture(mood);
          em.material.needsUpdate = true;
        }
        const u = Math.min(1, live.emoteAge / 0.25);
        const pop = 1 + 0.35 * Math.sin(u * Math.PI) * (1 - u);
        const bob = Math.sin(live.emoteAge * 3) * 0.01;
        em.scale.setScalar(EMOTE.size * Math.min(1, u * 1.6) * pop);
        em.position.set(cat.x, live.catY + EMOTE.height + bob, cat.z);
      }
    }

    // Treats: make, place, nibble, remove.
    const fr = foods.current;
    if (fr) {
      const alive = new Set(world.foods.map((f) => f.id));
      for (const [id, g] of live.treats)
        if (!alive.has(id)) {
          fr.remove(g);
          disposeTreat(g);
          live.treats.delete(id);
        }
      for (const f of world.foods) {
        let g = live.treats.get(f.id);
        if (!g) {
          g = makeTreat(f.kind);
          g.add(treatShadow());
          live.treats.set(f.id, g);
          fr.add(g);
        }
        g.position.set(f.x, f.y, f.z);
        // The treat's shadow stays on the floor while it drops.
        const sh = g.getObjectByName("treatShadow");
        if (sh) {
          sh.position.y = -f.y / Math.max(0.01, g.scale.y) + 0.002;
          sh.scale.setScalar(1 / (1 + f.y * 1.5));
        }
        g.rotation.y = f.spin;
        const nib = 1 - f.eaten * 0.9;
        g.scale.setScalar(
          nib * (1 + (f.eaten > 0 ? Math.sin(cat.timer * 30) * 0.05 : 0)),
        );
      }
    }

    // Effects: dust where food lands, hearts from a petted or fed cat.
    const fx = fxRoot.current;
    if (fx) {
      for (const f of ev.landed) {
        const puff = makePuff();
        puff.position.set(f.x, 0.01, f.z);
        fx.add(puff);
        live.fx.push({ obj: puff, age: 0, life: 0.5, kind: "puff" });
      }
      const heartsAt = (n: number) => {
        for (let i = 0; i < n; i++) {
          const h = makeHeart();
          h.position.set(
            cat.x + (Math.random() - 0.5) * 0.15,
            MODEL.length * 0.45,
            cat.z + (Math.random() - 0.5) * 0.15,
          );
          fx.add(h);
          live.fx.push({ obj: h, age: -i * 0.12, life: 1.3, kind: "heart" });
        }
      };
      if (ev.ate) heartsAt(5);
      if (cat.state === "pet") {
        live.heartClock -= dt;
        if (live.heartClock <= 0) {
          live.heartClock = 0.35;
          heartsAt(1);
        }
      }
      for (const e of live.fx) {
        e.age += dt;
        const u = Math.max(0, e.age) / e.life;
        if (e.kind === "puff") {
          e.obj.children.forEach((b) => {
            const [dx, dz] = b.userData.dir as [number, number];
            b.position.set(dx * u * 0.14, u * 0.03, dz * u * 0.14);
            b.scale.setScalar(1 + u);
            ((b as Mesh).material as MeshStandardMaterial).opacity = 1 - u;
          });
        } else {
          e.obj.visible = e.age >= 0;
          e.obj.position.y += dt * 0.18;
          (e.obj as Sprite).material.opacity = Math.min(1, (1 - u) * 2);
        }
      }
      for (const e of live.fx.filter((x) => x.age >= x.life)) {
        fx.remove(e.obj);
        e.obj.traverse((o) => {
          const m = o as Mesh;
          if (m.isMesh) {
            m.geometry.dispose();
            (m.material as MeshStandardMaterial).dispose();
          }
        });
        if ((e.obj as Sprite).isSprite) (e.obj as Sprite).material.dispose();
      }
      live.fx = live.fx.filter((x) => x.age < x.life);
    }
    catState.pets = world.pets;
    catState.meals = world.meals;
    catState.chubby = cat.chubby;
    catState.purring = cat.state === "pet";
    catState.eating = cat.state === "eat";
  });

  return (
    <group ref={stage} position={[...STAGE.position]}>
      <Ground />
      <mesh ref={catShadow} rotation-x={-Math.PI / 2} position-y={0.003}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial
          map={shadowTexture()}
          transparent
          depthWrite={false}
          opacity={SHADOW.cat.opacity}
        />
      </mesh>
      <primitive object={rig.root} />
      <mesh ref={laserDot} rotation-x={-Math.PI / 2} visible={false}>
        <circleGeometry args={[0.025, 24]} />
        <meshBasicMaterial color={LASER.color} transparent opacity={0.95} />
        <mesh position-z={-0.001}>
          <circleGeometry args={[0.06, 24]} />
          <meshBasicMaterial
            color={LASER.color}
            transparent
            opacity={0.3}
            depthWrite={false}
          />
        </mesh>
      </mesh>
      <sprite ref={emote} visible={false} scale={EMOTE.size}>
        <spriteMaterial transparent depthWrite={false} />
      </sprite>
      <group ref={foods} />
      <group ref={fxRoot} />
    </group>
  );
};
