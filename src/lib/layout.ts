"use client";

import { useSyncExternalStore } from "react";
import { COMPACT_QUERY } from "./layout-query";

let mql: MediaQueryList | null = null;
const query = () => (mql ??= window.matchMedia(COMPACT_QUERY));

// For code outside React (the particle scene reads it every frame).
export const isCompact = () => typeof window !== "undefined" && query().matches;

const subscribe = (cb: () => void) => {
  const m = query();
  m.addEventListener("change", cb);
  return () => m.removeEventListener("change", cb);
};

// The static HTML is rendered as "wide"; on a phone the first client render switches over.
// The loader covers the screen for that moment, so nothing visibly jumps.
export function useCompact() {
  return useSyncExternalStore(subscribe, () => query().matches, () => false);
}
