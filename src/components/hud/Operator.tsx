"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { anchors, headRing, pointer, useHud, type SectionId } from "@/lib/hud-store";
import { buildGear, type Gear } from "./gear";

const MODEL_URL = "/models/operator.glb";

// The base mesh is a Mixamo "Vanguard" character. GLTFLoader strips ':' from node names.
const B = {
  hips: "mixamorigHips",
  spine2: "mixamorigSpine2",
  neck: "mixamorigNeck",
  head: "mixamorigHead",
  lShoulder: "mixamorigLeftShoulder",
  rShoulder: "mixamorigRightShoulder",
  lArm: "mixamorigLeftArm",
  lFore: "mixamorigLeftForeArm",
  lHand: "mixamorigLeftHand",
  rArm: "mixamorigRightArm",
  rFore: "mixamorigRightForeArm",
  rHand: "mixamorigRightHand",
} as const;

// Left hand finger chains, base joint to tip, for the tablet grip.
const FINGERS = ["Thumb", "Index", "Middle", "Ring", "Pinky"].flatMap((f) =>
  [1, 2, 3, 4].map((i) => `mixamorigLeftHand${f}${i}`),
);

const _q = new THREE.Quaternion();
const _q2 = new THREE.Quaternion();
const _v = new THREE.Vector3();
const _pq = new THREE.Quaternion();
const _ringOff = new THREE.Vector3(0, 0.1, 0.05);

// Rotate a bone by `q` expressed in world axes.
function rotateInWorld(bone: THREE.Object3D, q: THREE.Quaternion) {
  if (!bone.parent) return;
  bone.parent.getWorldQuaternion(_pq);
  _q2.copy(_pq).invert().multiply(q).multiply(_pq);
  bone.quaternion.premultiply(_q2);
}

// Grade the body material: desaturate toward teal, add a cyan rim and a slow scan sweep.
function gradeMaterial(mat: THREE.MeshStandardMaterial, uTime: { value: number }) {
  mat.roughness = Math.max(mat.roughness, 0.62);
  mat.metalness = Math.min(mat.metalness, 0.35);
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = uTime;
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vWorldPos;")
      .replace(
        "#include <project_vertex>",
        "vWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;\n#include <project_vertex>",
      );
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vWorldPos;\nuniform float uTime;")
      .replace(
        "#include <map_fragment>",
        `#include <map_fragment>
        float lum = dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114));
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(lum), 0.72) * vec3(0.22, 0.32, 0.37);`,
      )
      .replace(
        "#include <emissivemap_fragment>",
        `#include <emissivemap_fragment>
        float rim = pow(1.0 - saturate(dot(normalize(vViewPosition), normal)), 2.6);
        totalEmissiveRadiance += vec3(0.16, 0.78, 0.86) * rim * 0.85;
        float sweepY = mod(uTime * 0.16, 1.6) * 2.0 - 0.3;
        float sweep = smoothstep(0.045, 0.0, abs(vWorldPos.y - sweepY));
        totalEmissiveRadiance += vec3(0.1, 0.55, 0.62) * sweep * 0.4;`,
      );
  };
  mat.needsUpdate = true;
}

export default function Operator() {
  const gltf = useGLTF(MODEL_URL);
  const flip = useRef<THREE.Group>(null);
  const gearRef = useRef<Gear | null>(null);
  const mixer = useRef<THREE.AnimationMixer | null>(null);
  const bones = useRef<Record<string, THREE.Object3D>>({});
  const timeU = useMemo(() => ({ value: 0 }), []);
  const { camera, size } = useThree();
  const setReady = useHud((s) => s.setReady);
  const yaw = useRef(0);
  const pitch = useRef(0);
  const frames = useRef(0);

  const scene = useMemo(() => gltf.scene, [gltf]);

  useEffect(() => {
    const root = flip.current;
    if (!root) return;
    scene.traverse((o) => {
      const m = o as THREE.SkinnedMesh;
      if (m.isSkinnedMesh) {
        m.frustumCulled = false;
        const mats = Array.isArray(m.material) ? m.material : [m.material];
        mats.forEach((mat) => {
          const std = mat as THREE.MeshStandardMaterial;
          if (std.name.toLowerCase().includes("visor")) {
            std.transparent = false;
            std.color.set("#040d12");
            std.metalness = 0.9;
            std.roughness = 0.12;
            std.emissive.set("#1fb6c8");
            std.emissiveIntensity = 0.1;
          } else {
            gradeMaterial(std, timeU);
          }
        });
      }
    });
    Object.values(B).forEach((n) => {
      const o = scene.getObjectByName(n);
      if (o) bones.current[n] = o;
    });
    FINGERS.forEach((n) => {
      const o = scene.getObjectByName(n);
      if (o) bones.current[n] = o;
    });
    scene.updateMatrixWorld(true);
    const gear = buildGear(root, bones.current, B);
    gearRef.current = gear;
    // Gear lives in world space beside the (flipped) model, not inside it.
    const parent = root.parent;
    parent?.add(gear.group);

    const m = new THREE.AnimationMixer(scene);
    const idle = gltf.animations.find((a) => a.name === "Idle") ?? gltf.animations[0];
    if (idle) m.clipAction(idle).play();
    mixer.current = m;
    return () => {
      m.stopAllAction();
      gear.dispose();
      parent?.remove(gear.group);
      gearRef.current = null;
    };
  }, [scene, gltf, timeU]);

  useFrame((state, dt) => {
    const root = flip.current;
    const g = gearRef.current;
    if (!root || !g) return;
    timeU.value = state.clock.elapsedTime;
    mixer.current?.update(Math.min(dt, 0.05));
    root.updateMatrixWorld(true);

    const b = bones.current;
    // Hold the tablet: bend the left arm forward from the idle pose.
    const arm = b[B.lArm];
    const fore = b[B.lFore];
    if (arm && fore) {
      const t = Math.min(1, state.clock.elapsedTime / 1.4);
      const k = t * t * (3 - 2 * t);
      rotateInWorld(arm, _q.setFromAxisAngle(_v.set(1, 0, 0), g.pose.armAngle * k));
      arm.updateMatrixWorld(true);
      rotateInWorld(fore, _q.setFromAxisAngle(_v.set(1, 0, 0), g.pose.foreAngle * k));
      fore.updateMatrixWorld(true);

      // Close the left hand into a grip so no fingertip pokes through the tablet.
      const grip = k;
      (["Index", "Middle", "Ring", "Pinky"] as const).forEach((f) => {
        [0.95, 1.15, 0.8].forEach((ang, j) => {
          const fb = b[`mixamorigLeftHand${f}${j + 1}`];
          if (fb) fb.rotateX(-ang * grip);
        });
      });
      [0.3, 0.55].forEach((ang, j) => {
        const tb = b[`mixamorigLeftHandThumb${j + 2}`];
        if (tb) tb.rotateX(-ang * grip);
      });
      b[B.lHand]?.updateMatrixWorld(true);
    }

    // Head tracking: neck and head follow the pointer, in world axes.
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const ty = still ? 0 : pointer.x * 0.55;
    const tp = still ? 0 : -pointer.y * 0.28;
    yaw.current = THREE.MathUtils.damp(yaw.current, ty, 3.2, dt);
    pitch.current = THREE.MathUtils.damp(pitch.current, tp, 3.2, dt);
    const flipSign = g.pose.worldYawSign;
    const neck = b[B.neck];
    const head = b[B.head];
    const spine2 = b[B.spine2];
    if (spine2) {
      rotateInWorld(spine2, _q.setFromEuler(new THREE.Euler(pitch.current * 0.15, flipSign * yaw.current * 0.18, 0)));
      spine2.updateMatrixWorld(true);
    }
    if (neck) {
      rotateInWorld(neck, _q.setFromEuler(new THREE.Euler(pitch.current * 0.35, flipSign * yaw.current * 0.35, 0)));
      neck.updateMatrixWorld(true);
    }
    if (head) {
      rotateInWorld(head, _q.setFromEuler(new THREE.Euler(pitch.current * 0.5, flipSign * yaw.current * 0.5, 0)));
      head.updateMatrixWorld(true);
    }

    g.update(state.clock.elapsedTime);
    if (process.env.NODE_ENV !== "production") (window as unknown as { __bones?: unknown }).__bones = b;

    // Project the body anchors to screen space for the DOM overlay.
    (Object.keys(anchors) as SectionId[]).forEach((id) => {
      g.anchorWorld(id, _v);
      _v.project(camera);
      const a = anchors[id];
      a.x = (_v.x * 0.5 + 0.5) * size.width;
      a.y = (-_v.y * 0.5 + 0.5) * size.height;
      a.visible = _v.z < 1;
    });

    _v.copy(b[B.head].getWorldPosition(_v)).add(_ringOff).project(camera);
    headRing.x = (_v.x * 0.5 + 0.5) * size.width;
    headRing.y = (-_v.y * 0.5 + 0.5) * size.height;
    headRing.visible = _v.z < 1;

    if (frames.current < 3 && ++frames.current === 3) setReady(true);
  });

  return (
    <group ref={flip} rotation={[0, Math.PI, 0]}>
      <primitive object={scene} />
    </group>
  );
}

useGLTF.preload(MODEL_URL);
