// The cat: the rigged toon cat, playing its own animation (the GLB's one
// clip) as it wanders, runs and eats — no extra rigging. Loaded, sized to
// MODEL.length, sat on the ground and turned to face +z; drawn a little wider
// and rounder after meals.
import { useEffect, useMemo } from "react";
import { AnimationMixer, Box3, Group, type Object3D, Vector3 } from "three";
import { useGLTF } from "@react-three/drei";

import { CAT, MODEL } from "./config";
import type { Cat } from "./world";

export type CatRig = {
  root: Group;
  /** The model inside root, turned to face +z and sized. */
  body: Group;
  mixer: AnimationMixer;
};

export const useCatRig = (): CatRig => {
  const { scene, animations } = useGLTF(MODEL.url);
  const rig = useMemo(() => {
    scene.traverse((o: Object3D) => {
      o.frustumCulled = false;
    });
    // Size it, sit it on the ground, and turn it to face +z (head before tail).
    scene.updateMatrixWorld(true);
    const box = new Box3().setFromObject(scene);
    const size = box.getSize(new Vector3());
    scene.scale.multiplyScalar(MODEL.length / Math.max(size.x, size.z));
    scene.updateMatrixWorld(true);
    const box2 = new Box3().setFromObject(scene);
    const centre = box2.getCenter(new Vector3());
    scene.position.x -= centre.x;
    scene.position.z -= centre.z;
    scene.position.y -= box2.min.y;
    scene.updateMatrixWorld(true);
    const head = new Vector3();
    const tail = new Vector3();
    scene.getObjectByName(MODEL.headBone)?.getWorldPosition(head);
    scene.getObjectByName(MODEL.tailBone)?.getWorldPosition(tail);
    const body = new Group();
    body.add(scene);
    body.rotation.y = -Math.atan2(head.x - tail.x, head.z - tail.z);
    const root = new Group();
    root.add(body);
    const mixer = new AnimationMixer(scene);
    if (animations[0]) mixer.clipAction(animations[0]).play();
    return { root, body, mixer };
  }, [scene, animations]);
  useEffect(
    () => () => {
      rig.mixer.stopAllAction();
    },
    [rig],
  );
  return rig;
};

/** Play the cat's own animation, and round it out after meals. */
export const animateCat = (rig: CatRig, cat: Cat, dt: number) => {
  rig.mixer.update(dt);
  const c = cat.chubby;
  rig.body.scale.set(
    1 + CAT.chubbyWidth * c,
    1 + CAT.chubbyHeight * c,
    1 + CAT.chubbyLength * c,
  );
};
