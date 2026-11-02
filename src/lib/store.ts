import { create } from "zustand";

// full: WebGL tunnel, bloom, particles
// lite: fewer particles, no post-processing, capped pixel ratio
// static: no WebGL (unsupported or reduced motion): poster plus plain layout
export type QualityTier = "full" | "lite" | "static";

type SiteState = {
  tier: QualityTier;
  setTier: (tier: QualityTier) => void;
  // 0 to 1 across the whole page. Written by Lenis/ScrollTrigger, read by the 3D scene.
  progress: number;
  setProgress: (progress: number) => void;
  // Scroll speed, used for speed lines and chromatic split in the tunnel.
  velocity: number;
  setVelocity: (velocity: number) => void;
};

export const useSite = create<SiteState>((set) => ({
  tier: "static", // safe default until detection runs on the client
  setTier: (tier) => set({ tier }),
  progress: 0,
  setProgress: (progress) => set({ progress }),
  velocity: 0,
  setVelocity: (velocity) => set({ velocity }),
}));
