"use client";

import { Suspense, useEffect, useMemo } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer } from "@react-three/drei";
import { Bloom, ChromaticAberration, EffectComposer, Noise, Vignette } from "@react-three/postprocessing";
import * as THREE from "three";
import Operator from "./Operator";
import { pointer, useHud, type SectionId } from "@/lib/hud-store";

type View = { pos: [number, number, number]; look: [number, number, number] };

// Landing frames the operator centred. Each section dollies to its body part and
// slides the operator to the left third so the card rail has the rest of the screen.
const VIEWS: Record<"home" | SectionId, View> = {
  home: { pos: [0, 1.48, 2.6], look: [0, 1.4, 0] },
  experience: { pos: [0.1, 1.4, 2.25], look: [0.64, 1.36, 0] },
  projects: { pos: [0.1, 1.66, 2.0], look: [0.6, 1.58, 0] },
  skills: { pos: [0.2, 1.22, 2.1], look: [0.68, 1.2, 0] },
  education: { pos: [0.1, 1.5, 2.1], look: [0.62, 1.46, 0] },
  contact: { pos: [0.1, 1.2, 2.4], look: [0.74, 1.12, 0] },
};

function CameraRig() {
  const camera = useThree((s) => s.camera);
  const target = useMemo(() => new THREE.Vector3(...VIEWS.home.look), []);
  useFrame((_, dt) => {
    const v = VIEWS[useHud.getState().active ?? "home"];
    const k = 2.4;
    camera.position.x = THREE.MathUtils.damp(camera.position.x, v.pos[0] + pointer.x * 0.07, k, dt);
    camera.position.y = THREE.MathUtils.damp(camera.position.y, v.pos[1] + pointer.y * 0.035, k, dt);
    camera.position.z = THREE.MathUtils.damp(camera.position.z, v.pos[2], k, dt);
    target.x = THREE.MathUtils.damp(target.x, v.look[0], k, dt);
    target.y = THREE.MathUtils.damp(target.y, v.look[1], k, dt);
    target.z = THREE.MathUtils.damp(target.z, v.look[2], k, dt);
    camera.lookAt(target);
  });
  return null;
}

function Backdrop() {
  const tex = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = c.height = 512;
    const g = c.getContext("2d")!;
    const grad = g.createRadialGradient(256, 230, 20, 256, 256, 256);
    grad.addColorStop(0, "rgba(30,95,112,0.85)");
    grad.addColorStop(0.45, "rgba(12,48,62,0.6)");
    grad.addColorStop(1, "rgba(5,13,19,0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, 512, 512);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);
  useEffect(() => () => tex.dispose(), [tex]);
  return (
    <mesh position={[0.1, 1.4, -1.8]}>
      <planeGeometry args={[7.5, 7.5]} />
      <meshBasicMaterial map={tex} transparent depthWrite={false} toneMapped={false} />
    </mesh>
  );
}

export default function Scene() {
  return (
    <Canvas
      dpr={[1, 1.75]}
      camera={{ fov: 26, position: VIEWS.home.pos, near: 0.1, far: 30 }}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      className="!absolute inset-0"
    >
      <color attach="background" args={["#040b10"]} />
      <fog attach="fog" args={["#040b10", 5, 11]} />
      <hemisphereLight args={["#2a6c7e", "#03080b", 0.32]} />
      <directionalLight position={[2.2, 2.8, 3.2]} intensity={0.85} color="#a9dbe6" />
      <pointLight position={[-1.7, 2.0, -1.5]} intensity={4.5} distance={7} color="#38c8d8" />
      <pointLight position={[1.9, 1.7, -1.3]} intensity={3} distance={7} color="#2b9fb4" />
      <Environment resolution={128}>
        <Lightformer intensity={1.1} color="#38c8d8" position={[-4, 3, -3]} scale={[6, 2, 1]} />
        <Lightformer intensity={0.55} color="#9ad9e6" position={[4, 2, 3]} scale={[4, 4, 1]} />
      </Environment>
      <Backdrop />
      <CameraRig />
      <Suspense fallback={null}>
        <Operator />
      </Suspense>
      <EffectComposer multisampling={0}>
        <Bloom intensity={0.55} luminanceThreshold={0.8} luminanceSmoothing={0.2} mipmapBlur />
        <ChromaticAberration offset={new THREE.Vector2(0.0007, 0.0009)} radialModulation={false} modulationOffset={0} />
        <Noise opacity={0.07} />
        <Vignette offset={0.25} darkness={0.85} />
      </EffectComposer>
    </Canvas>
  );
}
