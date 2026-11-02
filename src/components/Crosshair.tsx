"use client";

import { useEffect, useRef } from "react";

// DOM crosshair that replaces the native cursor on fine pointers. The gaps spread
// with mouse speed, a hit-marker flashes on click, and the dot turns ember over links.
export default function Crosshair() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !window.matchMedia("(pointer: fine)").matches) return;
    document.documentElement.classList.add("has-crosshair");
    el.style.display = "block";
    let mx = innerWidth * 0.62, my = innerHeight * 0.46, tx = mx, ty = my, lx = mx, ly = my, spread = 0;
    let last = performance.now(), raf = 0, hitTimer = 0;
    const move = (e: MouseEvent) => {
      tx = e.clientX;
      ty = e.clientY;
      const t = e.target as HTMLElement | null;
      el.classList.toggle("lock", !!t?.closest("a, button, summary"));
    };
    const down = () => {
      el.classList.add("hit");
      spread += 14;
      window.clearTimeout(hitTimer);
      hitTimer = window.setTimeout(() => el.classList.remove("hit"), 140);
    };
    const tick = (now: number) => {
      const dt = Math.max((now - last) / 1000, 0.001);
      last = now;
      mx += (tx - mx) * Math.min(1, dt * 30);
      my += (ty - my) * Math.min(1, dt * 30);
      const sp = Math.hypot(tx - lx, ty - ly) / dt;
      lx = tx;
      ly = ty;
      spread += (Math.min(18, sp / 90) - spread) * Math.min(1, dt * 8);
      el.style.transform = `translate(${mx}px,${my}px)`;
      el.style.setProperty("--s", `${spread.toFixed(1)}px`);
      raf = requestAnimationFrame(tick);
    };
    addEventListener("mousemove", move);
    addEventListener("mousedown", down);
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      removeEventListener("mousemove", move);
      removeEventListener("mousedown", down);
      document.documentElement.classList.remove("has-crosshair");
    };
  }, []);

  return (
    <div ref={ref} id="crosshair" aria-hidden="true" style={{ display: "none" }}>
      <i className="ring" />
      <i className="tick h1" />
      <i className="tick h2" />
      <i className="tick v1" />
      <i className="tick v2" />
      <i className="dot" />
      <i className="hm" />
    </div>
  );
}
