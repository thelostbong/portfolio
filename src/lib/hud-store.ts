import { create } from "zustand";

export type SectionId = "education" | "experience" | "projects" | "skills";

// The order here is the order of the scroll loop: landing, then each section, then back to landing.
export const SECTIONS: { id: SectionId; label: string }[] = [
  { id: "projects", label: "Projects" },
  { id: "experience", label: "Experience" },
  { id: "education", label: "Education" },
  { id: "skills", label: "Skills" },
];

// Which end of the rail a section opens at: "start" when arriving from the previous
// section, "end" when scrolling back into it from the next one.
export type Entry = "start" | "end";

// While a section change is animating, wheel input is ignored so one flick of the
// wheel (and its inertia) can never skip more than one section.
export const loop = { lockUntil: 0 };
export const LOCK_MS = 1300;

type HudState = {
  active: SectionId | null;
  entry: Entry;
  hover: SectionId | null;
  ready: boolean; // operator model loaded and first frame drawn
  detail: string | null; // key of the card whose detail panel is open
  setDetail: (key: string | null) => void;
  setActive: (id: SectionId | null, entry?: Entry) => void;
  setHover: (id: SectionId | null) => void;
  setReady: (ready: boolean) => void;
};

export const useHud = create<HudState>((set) => ({
  active: null,
  entry: "start" as Entry,
  hover: null,
  ready: false,
  detail: null,
  setDetail: (detail) => set({ detail }),
  setActive: (active, entry = "start") => set({ active, entry, detail: null }),
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
};

// Centre of the helmet, for the scanner ring.
export const headRing: Anchor = { x: 0, y: 0, visible: false };

// Pointer position, -1..1, y up. Written by the overlay, read by the scene.
export const pointer = { x: 0, y: 0 };
