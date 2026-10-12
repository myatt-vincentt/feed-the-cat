import { describe, expect, it } from "vitest";

import { CAT, EMOTE, FOOD, GROUND, LASER, NAP } from "./config";
import {
  clearPath,
  createWorld,
  dropFood,
  emoteOf,
  petCat,
  PROP_LIST,
  randomSpot,
  setLaser,
  stepWorld,
  throwFood,
  walkRadius,
  type World,
} from "./world";

const random = (() => {
  let s = 3;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
})();

const run = (w: World, seconds: number) => {
  const ate = [];
  let landed = 0;
  let maxR = 0;
  const states = new Set<string>();
  for (let t = 0; t < seconds; t += 1 / 60) {
    const ev = stepWorld(w, 1 / 60, random);
    if (ev.ate) ate.push(ev.ate);
    landed += ev.landed.length;
    maxR = Math.max(maxR, Math.hypot(w.cat.x, w.cat.z));
    states.add(w.cat.state);
  }
  return { ate, landed, maxR, states };
};

describe("the cat wanders", () => {
  it("walks about, pauses sometimes, and never leaves the patch", () => {
    const w = createWorld(random);
    const r = run(w, 120);
    expect(r.maxR).toBeLessThanOrEqual(walkRadius() + 1e-9);
    expect(r.states.has("walk")).toBe(true);
    expect(r.states.has("idle")).toBe(true);
    expect(w.cat.travelled).toBeGreaterThan(5);
  });
});

describe("feeding", () => {
  it("food drops, bounces and lands; the cat runs over, eats it, gets chubbier", () => {
    const w = createWorld(random);
    run(w, 2);
    const f = dropFood(w, 0.5, -0.3, random);
    expect(f.y).toBe(FOOD.dropFrom);
    const r = run(w, 1.5);
    expect(f.landed).toBe(true);
    expect(r.landed).toBeGreaterThanOrEqual(1);
    expect(r.states.has("run")).toBe(true);
    const r2 = run(w, CAT.eat + 4);
    expect(r2.ate.map((x) => x.id)).toContain(f.id);
    expect(w.foods.length).toBe(0);
    expect(w.meals).toBe(1);
    expect(w.cat.chubby).toBeCloseTo(CAT.chubbyPerMeal);
  });

  it("food tapped outside the patch lands just inside it", () => {
    const w = createWorld(random);
    const f = dropFood(w, 5, 0, random);
    expect(Math.hypot(f.x, f.z)).toBeCloseTo(GROUND.radius - FOOD.margin);
  });

  it("several pieces: eats them all, nearest first", () => {
    const w = createWorld(random);
    dropFood(w, 0.6, 0, random);
    dropFood(w, -0.6, 0, random);
    dropFood(w, 0, 0.6, random);
    const r = run(w, 20);
    expect(r.ate.length).toBe(3);
    expect(w.meals).toBe(3);
    expect(w.cat.chubby).toBeLessThanOrEqual(1);
  });

  it("chubbiness wears off after a while", () => {
    const w = createWorld(random);
    w.cat.chubby = 0.6;
    w.cat.sinceMeal = 0;
    run(w, CAT.chubbyHold + 10);
    expect(w.cat.chubby).toBeLessThan(0.3);
  });
});

describe("petting", () => {
  it("stops it for a purr, then it carries on", () => {
    const w = createWorld(random);
    run(w, 3);
    expect(petCat(w, random)).toBe(true);
    run(w, 0.8);
    expect(w.cat.state).toBe("pet");
    expect(w.cat.speed).toBeLessThan(0.02);
    run(w, CAT.pet + 2);
    expect(w.cat.state).not.toBe("pet");
    expect(w.pets).toBe(1);
  });

  it("doesn't interrupt a meal", () => {
    const w = createWorld(random);
    w.cat.state = "eat";
    w.cat.timer = 1;
    expect(petCat(w)).toBe(false);
  });
});

describe("props, naps", () => {
  it("random spots are clear of the props and reachable straight", () => {
    for (let i = 0; i < 200; i++) {
      const from = randomSpot(random);
      const p = randomSpot(random, from);
      expect(clearPath(from, p)).toBe(true);
    }
  });

  it("now and then it naps on the cushion, then gets up", () => {
    const w = createWorld(random);
    let napped = false;
    for (let t = 0; t < 400 && !napped; t += 1 / 60) {
      stepWorld(w, 1 / 60, random);
      if (w.cat.state === "nap") napped = true;
    }
    expect(napped).toBe(true);
    const c = PROP_LIST.find((p) => p.kind === "cushion")!;
    expect(Math.hypot(w.cat.x - c.x, w.cat.z - c.z)).toBeLessThan(0.08);
    expect(emoteOf(w)).toBe("sleep");
    run(w, NAP.time[1] + 1);
    expect(w.cat.state).not.toBe("nap");
  });

  it("food landing on a prop slides off it", () => {
    const w = createWorld(random);
    const b = PROP_LIST.find((p) => p.kind === "bowl")!;
    const f = dropFood(w, b.x, b.z, random);
    run(w, 1.5);
    expect(Math.hypot(f.x - b.x, f.z - b.z)).toBeGreaterThanOrEqual(b.radius);
  });
});

describe("throwing", () => {
  it("a thrown treat arcs further and stays on the floor, bouncing off the rim", () => {
    const w = createWorld(random);
    w.cat.x = 0;
    w.cat.z = -0.6;
    const f = throwFood(w, 0, 0, 1.5, 0, random);
    run(w, 2.5);
    expect(f.landed).toBe(true);
    expect(f.x).toBeGreaterThan(0.2);
    expect(Math.hypot(f.x, f.z)).toBeLessThanOrEqual(
      GROUND.radius - FOOD.margin + 1e-9,
    );
    // A hard throw at the rim comes back inside.
    const g = throwFood(w, 0.5, 0, 9, 0, random);
    run(w, 2.5);
    expect(Math.hypot(g.x, g.z)).toBeLessThanOrEqual(
      GROUND.radius - FOOD.margin + 1e-9,
    );
  });
});

describe("laser", () => {
  it("the cat chases the dot, watches it close up, and stops when it's gone", () => {
    const w = createWorld(random);
    setLaser(w, { x: 0.5, z: 0.2 });
    run(w, 3);
    expect(w.cat.state).toBe("chase");
    expect(Math.hypot(w.cat.x - 0.5, w.cat.z - 0.2)).toBeLessThan(
      LASER.near + 0.05,
    );
    expect(emoteOf(w)).toBe("hunt");
    setLaser(w, null);
    run(w, 0.2);
    expect(w.cat.state).not.toBe("chase");
  });

  it("food beats the laser", () => {
    const w = createWorld(random);
    setLaser(w, { x: 0.5, z: 0.2 });
    run(w, 1);
    dropFood(w, -0.4, -0.3, random);
    run(w, 1.4);
    expect(["run", "eat"]).toContain(w.cat.state);
  });
});

describe("emotes", () => {
  it("❗ when food lands, 😋 eating, 😾 petted too often", () => {
    const w = createWorld(random);
    run(w, 1);
    dropFood(w, 0.4, 0, random);
    let sawAlert = false;
    let sawYum = false;
    for (let t = 0; t < 6; t += 1 / 60) {
      stepWorld(w, 1 / 60, random);
      if (emoteOf(w) === "alert") sawAlert = true;
      if (emoteOf(w) === "yum") sawYum = true;
    }
    expect(sawAlert).toBe(true);
    expect(sawYum).toBe(true);
    for (let i = 0; i < EMOTE.grumpyPets; i++) {
      petCat(w, random);
      run(w, 0.5);
    }
    expect(emoteOf(w)).toBe("grumpy");
  });
});
