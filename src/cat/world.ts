// The cat and its food — pure, unit-tested (world.test.ts). No drawing here.
//
// On a round floor (stage units, x / z, centre at 0) the cat wanders: it picks
// a spot inside the floor, clear of the props (a cushion, a water bowl), turns
// toward it and walks there, sometimes pausing, now and then heading for the
// cushion for a nap. It never leaves: every spot is inside the floor (a disc
// is convex, so the straight path is too), and a safety clamp keeps it there.
//
// Food dropped or thrown falls, bounces (off the rim too) and lands; the cat
// sprints to the nearest piece and eats it, getting a little chubbier with
// every meal (slimming down again after a while). A laser dot on the floor:
// the cat chases it, and watches it once close. Food beats the laser; both
// wake it from a nap. Tap the cat to pet it — too often and it gets grumpy.
// Its mood shows as an emote (`emoteOf`).
import { CAT, EMOTE, FOOD, GROUND, LASER, NAP, PROPS, THROW } from "./config";

export type FoodKind = "fish" | "drumstick" | "kibble";
export const FOOD_KINDS: readonly FoodKind[] = ["fish", "drumstick", "kibble"];

export type Food = {
  id: number;
  kind: FoodKind;
  x: number;
  z: number;
  /** Height above the floor while it flies, and its speed (thrown food moves sideways too). */
  y: number;
  vx: number;
  vy: number;
  vz: number;
  landed: boolean;
  /** How much has been eaten, 0..1. */
  eaten: number;
  /** A per-piece turn, so no two lie the same way. */
  spin: number;
};

export type CatState =
  | "idle"
  | "walk"
  | "run"
  | "eat"
  | "pet"
  | "chase"
  | "toNap"
  | "nap";

export type Cat = {
  x: number;
  z: number;
  /** Facing (radians, 0 = +z), and current speed. */
  heading: number;
  speed: number;
  state: CatState;
  target: { x: number; z: number } | null;
  /** The food it's after or eating. */
  food: number | null;
  /** Seconds left in a pause, a meal, a pet or a nap. */
  timer: number;
  /** Distance walked (stage units). */
  travelled: number;
  /** Roundness 0..1 from meals, and seconds since the last meal. */
  chubby: number;
  sinceMeal: number;
};

export type Emote = "alert" | "yum" | "love" | "grumpy" | "hunt" | "sleep";

export type World = {
  cat: Cat;
  foods: Food[];
  /** The laser dot on the floor, if any. */
  laser: { x: number; z: number } | null;
  nextId: number;
  meals: number;
  pets: number;
  /** Seconds so far; when the cat was last petted (for grumpiness). */
  clock: number;
  petTimes: number[];
  /** Seconds left of the ❗ (food just landed) and 😾 (petted too much) emotes. */
  alert: number;
  grumpy: number;
};

export type Prop = {
  kind: "cushion" | "bowl";
  x: number;
  z: number;
  radius: number;
  height: number;
};

/** The floor's props, where they sit. */
export const PROP_LIST: readonly Prop[] = (["cushion", "bowl"] as const).map(
  (kind) => {
    const p = PROPS[kind];
    return {
      kind,
      x: Math.cos(p.angle) * p.r,
      z: Math.sin(p.angle) * p.r,
      radius: p.radius,
      height: p.height,
    };
  },
);
const CUSHION = PROP_LIST[0];

/** The radius the cat's body stays inside. */
export const walkRadius = () => GROUND.radius - GROUND.margin;

const between = ([a, b]: readonly [number, number], random: () => number) =>
  a + (b - a) * random();

const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

type XZ = { x: number; z: number };

/** Distance from p to the segment a–b. */
const segDist = (p: XZ, a: XZ, b: XZ) => {
  const abx = b.x - a.x;
  const abz = b.z - a.z;
  const len = abx * abx + abz * abz;
  const t =
    len > 0
      ? Math.max(0, Math.min(1, ((p.x - a.x) * abx + (p.z - a.z) * abz) / len))
      : 0;
  return Math.hypot(p.x - (a.x + abx * t), p.z - (a.z + abz * t));
};

/** The walk from a to b keeps clear of every prop (but `except`). */
export const clearPath = (a: XZ, b: XZ, except?: Prop) =>
  PROP_LIST.every(
    (p) => p === except || segDist(p, a, b) > p.radius + PROPS.clearance,
  );

/** A random spot inside the walkable disc, clear of the props, reachable in a straight line. */
export const randomSpot = (random: () => number, from?: XZ, away = 0.3) => {
  const r = walkRadius();
  for (let i = 0; i < 40; i++) {
    const a = random() * Math.PI * 2;
    const d = Math.sqrt(random()) * r;
    const p = { x: Math.cos(a) * d, z: Math.sin(a) * d };
    if (from && Math.hypot(p.x - from.x, p.z - from.z) < away) continue;
    if (!clearPath(p, p) || (from && !clearPath(from, p))) continue;
    return p;
  }
  return { x: 0, z: 0 };
};

/** The floor's height under (x, z): up on the cushion, else 0. */
export const standHeight = (x: number, z: number) =>
  Math.hypot(x - CUSHION.x, z - CUSHION.z) < CUSHION.radius * 0.8
    ? CUSHION.height
    : 0;

export const createWorld = (random: () => number): World => ({
  cat: {
    x: 0,
    z: 0,
    heading: random() * Math.PI * 2,
    speed: 0,
    state: "idle",
    target: null,
    food: null,
    timer: 1.2,
    travelled: 0,
    chubby: 0,
    sinceMeal: 0,
  },
  foods: [],
  laser: null,
  nextId: 1,
  meals: 0,
  pets: 0,
  clock: 0,
  petTimes: [],
  alert: 0,
  grumpy: 0,
});

const maxFood = () => GROUND.radius - FOOD.margin;

/** Keep a point inside the floor (within `max` of the middle). */
const inside = (p: XZ, max: number) => {
  const d = Math.hypot(p.x, p.z);
  return d > max ? { x: (p.x * max) / d, z: (p.z * max) / d } : p;
};

const addFood = (w: World, food: Food) => {
  w.foods.push(food);
  if (w.foods.length > FOOD.max) {
    const old = w.foods.find((f) => f.id !== w.cat.food);
    if (old) w.foods.splice(w.foods.indexOf(old), 1);
  }
  return food;
};

const newFood = (
  w: World,
  at: XZ,
  y: number,
  v: { x: number; y: number; z: number },
  random: () => number,
): Food => ({
  id: w.nextId++,
  kind: FOOD_KINDS[
    Math.floor(random() * FOOD_KINDS.length) % FOOD_KINDS.length
  ],
  x: at.x,
  z: at.z,
  y,
  vx: v.x,
  vy: v.y,
  vz: v.z,
  landed: false,
  eaten: 0,
  spin: random() * Math.PI * 2,
});

/** Drop a piece of food at (x, z), kept inside the floor; the oldest goes past FOOD.max. */
export const dropFood = (
  w: World,
  x: number,
  z: number,
  random: () => number,
) =>
  addFood(
    w,
    newFood(
      w,
      inside({ x, z }, maxFood()),
      FOOD.dropFrom,
      { x: 0, y: 0, z: 0 },
      random,
    ),
  );

/**
 * Throw a piece of food from (x, z) at (vx, vz) stage units / s (capped at
 * THROW.max): it arcs up and lands further on, bouncing off the rim.
 */
export const throwFood = (
  w: World,
  x: number,
  z: number,
  vx: number,
  vz: number,
  random: () => number,
) => {
  const s = Math.hypot(vx, vz);
  const k = s > THROW.max ? THROW.max / s : 1;
  return addFood(
    w,
    newFood(
      w,
      inside({ x, z }, maxFood()),
      THROW.height,
      { x: vx * k, y: THROW.up, z: vz * k },
      random,
    ),
  );
};

/** Where the laser dot is on the floor (kept inside it), or null. */
export const setLaser = (w: World, p: XZ | null) => {
  w.laser = p ? inside(p, maxFood()) : null;
};

/** Pet the cat: it stops (except eating) and purrs — or, petted too often, gets grumpy and walks off. */
export const petCat = (w: World, random: () => number = Math.random) => {
  const { cat } = w;
  if (cat.state === "eat") return false;
  w.petTimes = w.petTimes.filter((t) => w.clock - t < EMOTE.grumpyWindow);
  w.petTimes.push(w.clock);
  w.pets++;
  if (w.petTimes.length >= EMOTE.grumpyPets) {
    w.grumpy = EMOTE.grumpy;
    w.petTimes = [];
    cat.state = "walk";
    cat.target = randomSpot(random, cat, 0.4);
    return true;
  }
  cat.state = "pet";
  cat.timer = CAT.pet;
  cat.target = null;
  return true;
};

export type WorldEvents = {
  /** Food that hit the floor this frame (first touch: a dust puff). */
  landed: Food[];
  /** The cat finished a meal / a pet this frame. */
  ate?: Food;
  petted?: boolean;
};

/** Turn toward `want` at up to `rate` rad/s; returns the angle still to turn. */
const turnToward = (cat: Cat, want: number, rate: number, dt: number) => {
  const diff = wrap(want - cat.heading);
  const step = Math.max(-rate * dt, Math.min(rate * dt, diff));
  cat.heading = wrap(cat.heading + step);
  return wrap(want - cat.heading);
};

/** Head for (x, z) at `speed`, turning at `rate`; true once within `close`. */
const goTo = (
  cat: Cat,
  x: number,
  z: number,
  speed: number,
  rate: number,
  close: number,
  dt: number,
) => {
  const dx = x - cat.x;
  const dz = z - cat.z;
  const d = Math.hypot(dx, dz);
  if (d <= close) return true;
  const left = turnToward(cat, Math.atan2(dx, dz), rate, dt);
  // Slow down to turn on the spot when facing well away; ease in near the end.
  const facing = Math.max(0, Math.cos(left));
  const want = speed * facing * Math.min(1, d / (close * 3 + 0.05));
  cat.speed += (want - cat.speed) * (1 - Math.exp(-8 * dt));
  return false;
};

const slow = (cat: Cat, rate: number, dt: number) => {
  cat.speed *= Math.exp(-rate * dt);
};

const nearestFood = (w: World) => {
  let best: Food | null = null;
  let bestD = Infinity;
  for (const f of w.foods) {
    const d = Math.hypot(f.x - w.cat.x, f.z - w.cat.z);
    if (d < bestD) {
      bestD = d;
      best = f;
    }
  }
  return best;
};

/** Food that lands on a prop slides off its edge. */
const offProps = (f: Food) => {
  for (const p of PROP_LIST) {
    const dx = f.x - p.x;
    const dz = f.z - p.z;
    const d = Math.hypot(dx, dz);
    const min = p.radius + 0.06;
    if (d < min) {
      const k = d > 1e-6 ? min / d : 1;
      f.x = p.x + (d > 1e-6 ? dx : min) * k;
      f.z = p.z + (d > 1e-6 ? dz : 0) * k;
    }
  }
  const q = inside(f, maxFood());
  f.x = q.x;
  f.z = q.z;
};

/** Advance one frame. */
export const stepWorld = (
  w: World,
  dt: number,
  random: () => number,
): WorldEvents => {
  const ev: WorldEvents = { landed: [] };
  const { cat } = w;
  w.clock += dt;
  w.alert = Math.max(0, w.alert - dt);
  w.grumpy = Math.max(0, w.grumpy - dt);

  // Food flies, bounces (off the rim too) and lands.
  const max = maxFood();
  for (const f of w.foods) {
    if (f.landed) continue;
    f.vy -= FOOD.gravity * dt;
    f.x += f.vx * dt;
    f.y += f.vy * dt;
    f.z += f.vz * dt;
    const d = Math.hypot(f.x, f.z);
    if (d > max) {
      // Off the rim: back inside, the outward part bounced back.
      const nx = f.x / d;
      const nz = f.z / d;
      f.x = nx * max;
      f.z = nz * max;
      const out = f.vx * nx + f.vz * nz;
      if (out > 0) {
        f.vx -= 1.6 * out * nx;
        f.vz -= 1.6 * out * nz;
      }
    }
    if (f.y <= 0) {
      if (f.vy < -0.6) {
        ev.landed.push(f);
        if (cat.state !== "eat") w.alert = EMOTE.alert;
      }
      f.y = 0;
      f.vx *= 0.45;
      f.vz *= 0.45;
      if (Math.abs(f.vy) > 0.6) f.vy = -f.vy * FOOD.bounce;
      else {
        f.vx = 0;
        f.vy = 0;
        f.vz = 0;
        f.landed = true;
        offProps(f);
      }
    }
  }

  // Chubbiness eases off a while after the last meal.
  cat.sinceMeal += dt;
  if (cat.sinceMeal > CAT.chubbyHold)
    cat.chubby = Math.max(0, cat.chubby - CAT.chubbyFade * dt);

  // Food on the ground beats everything but eating and purring; then the laser.
  if (cat.state !== "eat" && cat.state !== "pet") {
    const f = nearestFood(w);
    if (f && f.landed) {
      cat.state = "run";
      cat.food = f.id;
    } else if (w.laser && cat.state !== "run") {
      cat.state = "chase";
    }
  }

  switch (cat.state) {
    case "pet":
      slow(cat, 10, dt);
      cat.timer -= dt;
      if (cat.timer <= 0) {
        ev.petted = true;
        cat.state = "idle";
        cat.timer = 0.6;
      }
      break;
    case "idle":
      slow(cat, 10, dt);
      cat.timer -= dt;
      if (cat.timer <= 0) {
        cat.target = randomSpot(random, cat);
        cat.state = "walk";
      }
      break;
    case "walk": {
      const t = cat.target ?? randomSpot(random, cat);
      cat.target = t;
      if (goTo(cat, t.x, t.z, CAT.walkSpeed, CAT.turnWalk, CAT.arrive, dt)) {
        const r = random();
        if (r < NAP.chance && clearPath(cat, CUSHION, CUSHION)) {
          cat.state = "toNap";
          cat.target = { x: CUSHION.x, z: CUSHION.z };
        } else if (r < NAP.chance + CAT.pauseChance) {
          cat.state = "idle";
          cat.timer = between(CAT.pause, random);
        } else cat.target = randomSpot(random, cat);
      }
      break;
    }
    case "toNap":
      if (
        goTo(cat, CUSHION.x, CUSHION.z, CAT.walkSpeed, CAT.turnWalk, 0.04, dt)
      ) {
        cat.state = "nap";
        cat.timer = between(NAP.time, random);
      }
      break;
    case "nap":
      slow(cat, 12, dt);
      cat.timer -= dt;
      if (cat.timer <= 0) {
        cat.state = "walk";
        cat.target = randomSpot(random, cat, 0.4);
      }
      break;
    case "chase": {
      const l = w.laser;
      if (!l) {
        cat.state = "idle";
        cat.timer = 0.8;
        break;
      }
      // Run at the dot; once close, stop and watch it (turning to follow).
      if (Math.hypot(l.x - cat.x, l.z - cat.z) <= LASER.near) {
        slow(cat, 12, dt);
        turnToward(cat, Math.atan2(l.x - cat.x, l.z - cat.z), CAT.turnRun, dt);
      } else
        goTo(cat, l.x, l.z, CAT.runSpeed, CAT.turnRun, LASER.near * 0.7, dt);
      break;
    }
    case "run": {
      const f = w.foods.find((x) => x.id === cat.food);
      if (!f) {
        cat.state = "idle";
        cat.timer = 0.4;
        break;
      }
      if (goTo(cat, f.x, f.z, CAT.runSpeed, CAT.turnRun, CAT.reach, dt)) {
        cat.state = "eat";
        cat.timer = CAT.eat;
      }
      break;
    }
    case "eat": {
      slow(cat, 14, dt);
      const f = w.foods.find((x) => x.id === cat.food);
      if (f)
        turnToward(cat, Math.atan2(f.x - cat.x, f.z - cat.z), CAT.turnRun, dt);
      cat.timer -= dt;
      if (f) f.eaten = Math.min(1, 1 - cat.timer / CAT.eat);
      if (cat.timer <= 0) {
        if (f) {
          w.foods.splice(w.foods.indexOf(f), 1);
          ev.ate = f;
        }
        w.meals++;
        cat.chubby = Math.min(1, cat.chubby + CAT.chubbyPerMeal);
        cat.sinceMeal = 0;
        cat.food = null;
        cat.state = "idle";
        cat.timer = 0.8;
      }
      break;
    }
    default:
      break;
  }

  // Move, and never leave the floor.
  cat.x += Math.sin(cat.heading) * cat.speed * dt;
  cat.z += Math.cos(cat.heading) * cat.speed * dt;
  cat.travelled += cat.speed * dt;
  const r = walkRadius();
  const d = Math.hypot(cat.x, cat.z);
  if (d > r) {
    cat.x *= r / d;
    cat.z *= r / d;
  }
  return ev;
};

/** The cat's mood, as an emote to show (or null). */
export const emoteOf = (w: World): Emote | null => {
  const { state } = w.cat;
  if (state === "eat") return "yum";
  if (w.grumpy > 0) return "grumpy";
  if (state === "pet") return "love";
  if (state === "nap") return "sleep";
  if (state === "chase") return "hunt";
  if (state === "run" && w.alert > 0) return "alert";
  return null;
};
