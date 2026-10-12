# Plan — Feed the Cat

A toon cat lives on a little round floor over the camera; feed it, play with it, pet it — by
touch or with your hands. Built 2026-10-12.

## Decisions (the user's)

- Model: `public/models/toon_cat_free.glb` (CC BY 4.0, Omabuarts Studio — credited on screen and
  in the README); moved from `public/modals/`. It has one animation clip.
- Food: random treats, dropped from the sky with a bounce and a dust puff. Extras: pet the cat,
  happy & chubby after meals.
- Look: first a grass island; then, from the user's reference, a flat peach floor with a soft
  shadow seen from above. "Shadow not working well" → soft shadow ovals instead of shadow maps.
- "Remove custom riggings, keep the original one": the cat only ever plays its own clip — no
  procedural bone animation (an earlier gait / eating / petting rig was removed).
- Orbit control; the default view is the one the user set (tilt 0.44, turn 0.08, zoom 1); the
  stage sits low on screen.
- Hand tracking: fist + move turns, two-hand pinch zooms, point + quick pinch taps, a hand cursor.
- Then: laser pointer, throwing treats, emote bubbles, floor polish (rounded rim, cushion, water
  bowl).

## How it works

- **World** (`world.ts`, pure, tested): the cat wanders to random spots inside the floor that
  are clear of the props and reachable in a straight line; pauses; now and then naps on the
  cushion. Food (dropped or thrown — thrown food arcs and bounces off the rim, and slides off
  props) beats everything but eating and purring; the laser comes next (chase, then watch when
  close). It eats the nearest piece (chubbier per meal, easing off later). Petting stops it; three
  pets within 6 s make it grumpy and it walks off. `emoteOf` gives its mood.
- **Stage** (`Stage.tsx`): the floor floats in front of the camera; orbiting turns and scales
  the stage, not the camera. Taps go through one queue (touch or hand): near the cat → pet, else a
  raycast onto the floor (in the stage's own frame) → food. Throws project the flick onto the
  floor for a direction. The laser's NDC point is raycast onto the floor each frame.
- **Hands** (`hands.ts`, pure, tested; `HandControl.tsx`): both hands tracked, matched by
  position. Pinch = thumb–index gap under 0.3 palm sizes (open again past 0.48) with the index
  reaching out; quick (< 0.45 s) and alone → tap at the pinch point; let go faster than 0.9
  screen heights / s → throw. Fist (SDK grab ≥ 0.7, held 0.15 s, moves under 4 px ignored) →
  orbit. Two pinches → zoom by their distance ratio. Index-only finger pattern → laser.
- **Looks**: the floor is a disc with a radial gradient, a rounded rim and a faint shadow
  beneath; soft shadow ovals under the cat (turning with it, wider when chubby), the treats (on
  the floor while they fall) and the props; treats built from simple shapes; hearts and dust
  puffs; emote bubbles drawn into canvas sprites.
