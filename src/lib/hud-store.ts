import { create } from "zustand";

export type SectionId = "experience" | "projects" | "skills" | "education" | "contact";

export const SECTIONS: { id: SectionId; label: string; number: string }[] = [
  { id: "experience", label: "Experience", number: "01" },
  { id: "projects", label: "Projects", number: "02" },
  { id: "skills", label: "Skills", number: "03" },
  { id: "education", label: "Education", number: "04" },
  { id: "contact", label: "Contact", number: "05" },
];

type HudState = {
  active: SectionId | null;
  hover: SectionId | null;
  ready: boolean; // operator model loaded and first frame drawn
  setActive: (id: SectionId | null) => void;
  setHover: (id: SectionId | null) => void;
  setReady: (ready: boolean) => void;
};

export const useHud = create<HudState>((set) => ({
  active: null,
  hover: null,
  ready: false,
  setActive: (active) => set({ active }),
  setHover: (hover) => set({ hover }),
  setReady: (ready) => set({ ready }),
}));

// Screen-space positions of the body anchors. The 3D scene writes these every
// frame, the DOM overlay reads them to draw leader lines. Kept outside React
// state on purpose: it changes 60 times a second.
export type Anchor = { x: number; y: number; visible: boolean };
export const anchors: Record<SectionId, Anchor> = {
  experience: { x: 0, y: 0, visible: false },
  projects: { x: 0, y: 0, visible: false },
  skills: { x: 0, y: 0, visible: false },
  education: { x: 0, y: 0, visible: false },
  contact: { x: 0, y: 0, visible: false },
};

// Centre of the helmet, for the scanner ring.
export const headRing: Anchor = { x: 0, y: 0, visible: false };

// Pointer position, -1..1, y up. Written by the overlay, read by the scene.
export const pointer = { x: 0, y: 0 };
