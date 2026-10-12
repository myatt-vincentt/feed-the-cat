// Every tunable in one place. Units: stage units (the ground's radius is
// GROUND.radius), seconds, radians.

/** "Toon Cat FREE" (https://skfb.ly/6TKrP) by Omabuarts Studio, CC BY 4.0. */
export const MODEL = {
  url: "/models/toon_cat_free.glb",
  credit: '"Toon Cat FREE" by Omabuarts Studio (skfb.ly/6TKrP), CC BY 4.0',
  /** The cat's length nose to tail-base on the stage. */
  length: 0.62,
  /** Bones that tell which way it faces (as three.js names them on load). */
  headBone: "head_018",
  tailBone: "tail_07",
};

/** The ground: a flat disc, light peach in the middle to dusty rose at the rim. */
export const GROUND = {
  radius: 1,
  thickness: 0.05,
  rimSize: 0.035,
  /** The cat keeps this far inside the rim (its body's half-length, about). */
  margin: 0.24,
  centre: "#ffd9c6",
  middle: "#f4bfa8",
  rim: "#d99c8c",
  side: "#c4877a",
  /** The rounded rim's thickness and colour; the faint shadow beneath. */
  rimColor: "#e3a897",
  underShadow: 0.32,
};

/**
 * Soft shadows on the floor (stage units): an oval under the cat (shaped to
 * its body, turning with it), a little disc under each treat.
 */
export const SHADOW = {
  cat: { length: 0.62, width: 0.34, opacity: 0.42 },
  treat: { size: 0.17, opacity: 0.35 },
  /** Nudged toward the back-right, as if lit from the front-left above. */
  offset: { x: 0.025, z: -0.03 },
};

/** Where the stage sits in front of the camera (world units; the camera is at z = 5). */
export const STAGE = { position: [0, -0.9, 0] as const };

/** Orbit: drag to spin and tilt, pinch / scroll to zoom; it eases. */
export const ORBIT = {
  yaw: 0.08,
  pitch: 0.44,
  pitchRange: [0.12, 1.1] as const,
  zoom: 1,
  zoomRange: [0.6, 1.8] as const,
  /** Radians per px dragged, and how fast it eases to the target (per second). */
  dragSpeed: 0.008,
  ease: 10,
  /** A press that moves less than this (px) and is this short (s) is a tap. */
  tapMove: 9,
  tapTime: 0.35,
};

/** How the cat moves around (stage units / s, radians / s). */
export const CAT = {
  walkSpeed: 0.2,
  runSpeed: 0.62,
  turnWalk: 2.4,
  turnRun: 5.5,
  /** Close enough to a spot (stage units); close enough to food to eat. */
  arrive: 0.05,
  reach: 0.16,
  /** Chance of a pause after reaching a spot, and how long (s). */
  pauseChance: 0.45,
  pause: [1.5, 4] as const,
  /** Eating (s), being petted (s). */
  eat: 2.4,
  pet: 2.8,
  /** Each meal makes it rounder by this much (0..1), easing off after a while. */
  chubbyPerMeal: 0.3,
  chubbyHold: 8,
  chubbyFade: 0.04,
  /** How much wider / taller / longer it's drawn when fully chubby. */
  chubbyWidth: 0.28,
  chubbyHeight: 0.12,
  chubbyLength: 0.06,
};

/** Food: it drops from this high (stage units), bounces, and sits until eaten. */
export const FOOD = {
  dropFrom: 1.4,
  gravity: 7,
  bounce: 0.35,
  max: 6,
  /** Kept this far inside the rim. */
  margin: 0.12,
};

/**
 * Hand control (screen px, seconds):
 *   pinch     thumb tip to index tip under `closed` palm sizes (open again past
 *             `open`), the index reaching out (≥ `reach` palm sizes from the
 *             wrist — a fist curls it in); held at least `hold`
 *   tap       a quick pinch (shorter than `tapTime`) with one hand, at the
 *             point between thumb and index — the cursor
 *   orbit     a fist (the SDK's grab score ≥ `grab`) moving: px moved turn the
 *             stage like a drag, × `orbitGain`
 *   zoom      both hands pinching: their distance over its starting distance
 */
export const HANDS = {
  closed: 0.3,
  open: 0.48,
  reach: 1.0,
  hold: 0.05,
  tapTime: 0.45,
  grab: 0.7,
  orbitGain: 1.4,
  /** A fist turns the stage after this long (s); moves under `jitter` px are ignored. */
  fistHold: 0.15,
  jitter: 4,
  /** A hand that jumps further than this (share of the screen height) is another hand. */
  jump: 0.3,
  /** Pointing: the SDK's index-only finger-pattern score at least this (see LASER). */
  point: 0.6,
  /** A pinch let go while moving faster than this (screen heights / s) throws. */
  flick: 0.9,
};

/**
 * The floor's props (stage units; angle in radians round the floor, r from
 * the middle): a cushion the cat naps on, and a water bowl. The cat walks
 * round them; food that lands on one slides off.
 */
export const PROPS = {
  cushion: {
    angle: 2.45,
    r: 0.66,
    radius: 0.19,
    height: 0.06,
    color: "#9d8bd6",
    trim: "#7d6bbd",
  },
  bowl: {
    angle: 0.6,
    r: 0.72,
    radius: 0.1,
    height: 0.05,
    color: "#5bb4e8",
    water: "#b9e6ff",
  },
  /** Keep the cat's middle this far clear of a prop's edge. */
  clearance: 0.2,
};

/** Naps: now and then after a walk the cat heads for the cushion and sleeps (s). */
export const NAP = { chance: 0.22, time: [7, 11] as const };

/**
 * The laser pointer: point with your index finger (HANDS.point) and a red dot
 * lands on the floor; the cat chases it, and watches it once it's close
 * (within `near`).
 */
export const LASER = { near: 0.14, color: "#ff2a3a" };

/**
 * Throwing (a flicked pinch, HANDS.flick): the treat flies from `height` up,
 * at `up` upward, and sideways at the flick's speed × `gain`, up to `max`
 * (stage units / s).
 */
export const THROW = { height: 0.35, up: 1.6, gain: 0.9, max: 2.4 };

/**
 * Emote bubbles over the cat (seconds): ❗ when food lands (for `alert`),
 * 😋 eating, 😻 petted, 😾 petted `grumpyPets` times within `grumpyWindow`
 * (for `grumpy`), 😼 chasing the laser, 💤 napping.
 */
export const EMOTE = {
  alert: 1.3,
  grumpyPets: 3,
  grumpyWindow: 6,
  grumpy: 2.5,
  /** Height above the floor (stage units) and size. */
  height: 0.5,
  size: 0.17,
};
