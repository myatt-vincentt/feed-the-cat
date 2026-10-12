# Feed the Cat

A little toon cat lives on a round peach floor floating over your camera — with a cushion to nap
on and a water bowl. It wanders, now and then curling up on the cushion for a nap, always staying
on the floor and walking round the props. Feed it: tap the floor (or point and quick-pinch) and a
random treat — a fish, a drumstick or a kibble pile — drops there; flick a pinch to throw one. The
cat runs over and eats it, getting a little chubbier with every meal. Point your index finger and
a laser dot appears for it to chase. Tap it (or pinch on it) to pet it — too often and it gets
grumpy. Its mood shows in a bubble (❗ 😋 😻 😾 😼 💤). Turn the stage with a drag or a moving fist;
zoom with a pinch (two fingers or both hands).

- Model: "Toon Cat FREE" (https://skfb.ly/6TKrP) by Omabuarts Studio, licensed under Creative
  Commons Attribution (http://creativecommons.org/licenses/by/4.0/)
  (`public/models/toon_cat_free.glb`). The app credits it on screen. It plays its own animation;
  nothing is added to its rig.
- Dev preview without a camera: the media switcher (☰) starts on the SDK's "Person Fullbody"
  video as the backdrop; click the floor to feed, click the cat to pet, drag to turn, scroll to
  zoom. An optional local clip goes at `dev-media/room.mp4` (see `dev-media/README.md`).
- Tuning: `src/cat/config.ts`. How it works: `PLAN.md`.

---

# v2-template

The Vincentt starter app: a real React + R3F + Vincentt XR SDK (`@vincentt-xr/sdk`)
WebXR app, bundled by esbuild.

## Shape

```
src/
  main.tsx            mount — never edited
  App.tsx             protected shell: XRProvider + AspectRatioContainer +
                      XRScene + media-source binding, camera, lighting,
                      VideoBackground, PreviewAnchors — never edited
  Scene.tsx           the agent's surface: add SDK components and R3F
                      primitives here
  PreviewAnchors.tsx  editor-preview integration — never edited
```

See `AGENTS.md` and `GROUNDING.md` for the API reference and how to author scenes.

## Develop

```
pnpm install
pnpm dev          # esbuild dev server on :5173
pnpm preview      # on-device preview over a secure tunnel (needs `vincentt login`)
pnpm typecheck
pnpm build        # production bundle to dist/
```

## Release

`vincentt init` scaffolds from the **`latest` tag**, not from `main`. Merging to `main` does
not ship a template to creators — cutting a release does.

```
git tag 1.1.0 <sha>      # bare semver, no `v` prefix
git push origin 1.1.0    # the Release workflow verifies the tag, then moves `latest`
```

The Release workflow (`.github/workflows/release.yml`) installs from the frozen lockfile,
builds, and typechecks **the tagged tree** before force-updating `latest` to it. A tag that
fails leaves `latest` where it was, so a broken release cannot reach a new creator.

The job runs in the `release` environment, which accepts bare-semver tags only. To re-run it by
hand, dispatch it from the tag itself ("Use workflow from: 1.1.0"); a dispatch from `main` is
refused.

**Never move `latest` by hand.** It is force-updated by that workflow and nowhere else; moving
it manually decouples the pointer from the version it claims to be.

Creators can pin a specific version — `vincentt init --template 1.0.0` — which is the escape
hatch when a release turns out to be bad. That is why the version tags are immutable and only
`latest` moves.

### `MIGRATION.md` and the platform release row

Root `MIGRATION.md` carries one entry per released tag, newest first, authored in the same
PR as the change: `required: true|false`, a one-line summary, and optional notes bullets.
`required: false` means no consumer action is needed, never that the entry was skipped. The
Release workflow refuses to move `latest` for a tag with no valid entry, then — once `latest`
has moved — posts that entry as this release's row to the platform (`POST
/platform/releases`, component `template`), via `scripts/release-row.mjs`. Both steps read
`MIGRATION.md` from `main`, not from the tagged tree: the note is reviewed via PR into `main`
and is append-only per version, so `main`'s copy is the reviewed source for any tag, including
one cut before this file existed. That row is what `vincentt outdated` reads back to tell a
creator's agent what changed and what to do about it.
