"use client";

import { useEffect, useRef } from "react";
import { archive, featuredMissions, operator } from "@/content";
import { initWarzone } from "@/lib/warzone-scene";

const FEED = [
  ["DEPLOYED", "THD // GERMANY"],
  ["COMPLETE", "LINEGUARD 95% MAP@50"],
  ["COMPLETE", "NANO SENTRY ESP32-P4"],
] as const;

export default function Hero() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const section = sectionRef.current;
    if (!canvas || !section) return;
    let dispose: (() => void) | undefined;
    let cancelled = false;
    let visible = true;
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting));
    io.observe(section);
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    initWarzone(canvas, { still, isVisible: () => visible })
      .then((d) => {
        if (cancelled) d();
        else dispose = d;
      })
      .catch((e) => {
        console.warn("[hero] scene failed, using poster", e);
        canvas.classList.add("hidden");
      }); // no WebGL: the CSS poster below stays
    return () => {
      cancelled = true;
      io.disconnect();
      dispose?.();
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      id="operator"
      className="relative isolate h-[100svh] min-h-[640px] w-full overflow-hidden bg-night"
    >
      <div className="poster absolute inset-0 -z-10" />
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" aria-hidden="true" />
      <div className="vignette pointer-events-none absolute inset-0" />

      <h1 className="sr-only">
        {operator.name}, {operator.title}
      </h1>

      <aside
        aria-hidden="true"
        className="hud pointer-events-none absolute right-5 top-24 hidden flex-col items-end gap-1.5 text-steel md:flex md:right-16"
      >
        {FEED.map(([k, v]) => (
          <p key={v}>
            + <span className="text-hazard">{k}</span> {v}
          </p>
        ))}
        <div className="radar mt-6" />
        <p className="mt-2">Recon // 3 contacts</p>
      </aside>

      <div className="absolute inset-x-5 bottom-10 flex items-end justify-between gap-8 md:inset-x-16 md:bottom-14">
        <div className="max-w-[560px]">
          <p className="hud text-hazard">Current objective</p>
          <p className="mt-3 font-display text-[34px] font-bold uppercase leading-none text-bone md:text-[44px]">
            {operator.title}
          </p>
          <p className="mt-4 max-w-[520px] text-[15px] leading-relaxed text-steel md:text-base">
            {operator.summary}
          </p>
          <div className="mt-6 flex flex-wrap gap-4">
            <a
              href="#missions"
              className="chamfer bg-ember px-6 py-3 font-display text-lg font-semibold uppercase tracking-wide text-night"
            >
              Deploy
            </a>
            <a
              href={operator.links.cv}
              className="chamfer border border-steel/40 px-6 py-3 font-display text-lg font-semibold uppercase tracking-wide text-bone"
            >
              Download CV
            </a>
          </div>
        </div>
        <div className="hidden text-right md:block" aria-hidden="true">
          <p className="font-display text-[64px] font-bold leading-none text-bone">
            {String(featuredMissions.length).padStart(2, "0")}
            <span className="text-[28px] text-steel"> / {archive.length}</span>
          </p>
          <p className="hud mt-2 text-steel">Missions // Archive</p>
        </div>
      </div>
    </section>
  );
}
