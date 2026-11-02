"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import gsap from "gsap";
import Lenis from "lenis";
import { SECTIONS, useHud, type SectionId } from "@/lib/hud-store";
import { SECTION_BLURB, cardsFor } from "./cards";

const pad = (n: number) => String(n).padStart(2, "0");

export default function Subscreen() {
  const active = useHud((s) => s.active);
  const setActive = useHud((s) => s.setActive);
  const rootRef = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const counterRef = useRef<HTMLSpanElement>(null);
  const lenisRef = useRef<Lenis | null>(null);

  const cards = useMemo(() => (active ? cardsFor(active) : []), [active]);
  const section = SECTIONS.find((s) => s.id === active);

  const close = useCallback(() => {
    const el = rootRef.current;
    if (!el) return setActive(null);
    gsap.to(el, { opacity: 0, duration: 0.35, ease: "power2.in", onComplete: () => setActive(null) });
  }, [setActive]);

  const go = useCallback(
    (id: SectionId) => {
      if (id !== useHud.getState().active) setActive(id);
    },
    [setActive],
  );

  // Rail: Lenis in horizontal mode, per-card depth effect, progress, drag.
  useEffect(() => {
    const wrapper = railRef.current;
    const content = trackRef.current;
    const root = rootRef.current;
    if (!active || !wrapper || !content || !root) return;

    // Animations are time-based: never let a slow frame stall them.
    gsap.ticker.lagSmoothing(0);
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const lenis = new Lenis({
      wrapper,
      content,
      orientation: "horizontal",
      gestureOrientation: "both",
      smoothWheel: !still,
      lerp: still ? 1 : 0.085,
      wheelMultiplier: 1.15,
    });
    lenisRef.current = lenis;

    const slots = Array.from(content.querySelectorAll<HTMLElement>("[data-slot]"));
    const total = slots.length;
    let raf = 0;
    const paint = (time: number) => {
      lenis.raf(time);
      const wr = wrapper.getBoundingClientRect();
      const cx = wr.left + wr.width * 0.42;
      let nearest = 0;
      let best = Infinity;
      slots.forEach((el, i) => {
        const r = el.getBoundingClientRect();
        const d = (r.left + r.width / 2 - cx) / wr.width; // -1..1 around the focus line
        const ad = Math.abs(d);
        if (Math.abs(r.left - wr.left) < best) {
          best = Math.abs(r.left - wr.left);
          nearest = i;
        }
        el.style.opacity = String(Math.max(0.35, 1 - Math.max(0, ad - 0.28) * 1.1));
        el.style.transform = `translate3d(0, ${Math.min(ad, 1) * 16}px, 0) scale(${1 - Math.min(ad, 1) * 0.045})`;
      });
      const p = lenis.limit > 0 ? lenis.scroll / lenis.limit : 0;
      if (barRef.current) barRef.current.style.transform = `scaleX(${Math.min(1, Math.max(0.02, p))})`;
      if (counterRef.current) counterRef.current.textContent = `${pad(nearest + 1)} / ${pad(total)}`;
      raf = requestAnimationFrame(paint);
    };
    raf = requestAnimationFrame(paint);

    // Mouse drag to scroll. Touch is handled by Lenis' own sync.
    let startX = 0;
    let startScroll = 0;
    let dragging = false;
    let moved = 0;
    const down = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" || e.button !== 0) return;
      dragging = true;
      moved = 0;
      startX = e.clientX;
      startScroll = lenis.scroll;
    };
    const move = (e: PointerEvent) => {
      if (!dragging) return;
      const dx = e.clientX - startX;
      moved = Math.max(moved, Math.abs(dx));
      if (moved > 6) {
        wrapper.style.cursor = "grabbing";
        lenis.scrollTo(startScroll - dx * 1.4, { immediate: true });
      }
    };
    const up = () => {
      dragging = false;
      wrapper.style.cursor = "";
    };
    const swallowClick = (e: MouseEvent) => {
      if (moved > 6) {
        e.preventDefault();
        e.stopPropagation();
        moved = 0;
      }
    };
    wrapper.addEventListener("pointerdown", down);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    wrapper.addEventListener("click", swallowClick, true);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowRight") lenis.scrollTo(lenis.scroll + 520, { duration: 0.9 });
      else if (e.key === "ArrowLeft") lenis.scrollTo(lenis.scroll - 520, { duration: 0.9 });
      else if (/^[1-5]$/.test(e.key)) go(SECTIONS[Number(e.key) - 1].id);
    };
    window.addEventListener("keydown", onKey);

    // Entrance.
    const ctx = gsap.context(() => {
      gsap.fromTo(root, { opacity: 0 }, { opacity: 1, duration: 0.45, ease: "power2.out" });
      gsap.fromTo(".sub-head", { y: 28, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, ease: "power3.out", delay: 0.2, stagger: 0.08 });
      gsap.fromTo(".rail-card", { x: 140, opacity: 0 }, { x: 0, opacity: 1, duration: 1, ease: "power3.out", delay: 0.3, stagger: 0.09 });
    }, root);

    return () => {
      ctx.revert();
      cancelAnimationFrame(raf);
      wrapper.removeEventListener("pointerdown", down);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      wrapper.removeEventListener("click", swallowClick, true);
      window.removeEventListener("keydown", onKey);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, [active, close, go]);

  if (!active || !section) return null;

  return (
    <div ref={rootRef} className="absolute inset-0 z-20" role="region" aria-label={section.label}>
      {/* Darken the right side so cards read; leave the operator visible on the left. */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,transparent_22%,rgb(5_13_19/0.74)_38%,rgb(5_13_19/0.9)_100%)]" />

      {/* Back + tabs */}
      <div className="absolute inset-x-[5vw] top-[7vh] flex items-center justify-between">
        <button
          type="button"
          onClick={close}
          className="hud flex items-center gap-3 border border-cyan/50 bg-ink/50 px-4 py-2 text-cyan transition-colors hover:bg-cyan hover:text-ink"
        >
          <span aria-hidden="true">←</span> Back <span className="text-mist">Esc</span>
        </button>
        <nav aria-label="Sections" className="flex gap-1">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => go(s.id)}
              aria-current={s.id === active}
              className={`hud border px-3.5 py-2 transition-colors ${s.id === active ? "border-cyan bg-cyan text-ink" : "border-cyan/25 text-mist hover:border-cyan/70 hover:text-bone"}`}
            >
              <span className="mr-2 opacity-60">{s.number}</span>
              {s.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Title block */}
      <div className="absolute left-[31vw] right-[5vw] top-[13vh] flex items-end gap-6">
        <span className="sub-head numeral-outline font-display text-[clamp(80px,9vw,140px)] font-bold leading-[0.8]">{section.number}</span>
        <div className="pb-1">
          <h2 className="sub-head font-display text-[clamp(44px,5vw,78px)] font-bold uppercase leading-[0.9] tracking-wide">{section.label}</h2>
          <p className="sub-head hud mt-2 text-mist">{SECTION_BLURB[active]}</p>
        </div>
      </div>

      {/* Rail */}
      <div ref={railRef} className="rail absolute bottom-[12vh] left-[31vw] right-0 top-[31vh] cursor-grab">
        <div ref={trackRef} className="flex h-full w-max items-stretch gap-6 pr-[8vw]">
          {cards.map((c, i) => (
            <div key={i} data-slot className="flex h-full shrink-0 items-center">
              {c}
            </div>
          ))}
        </div>
      </div>

      {/* Progress */}
      <div className="absolute bottom-[6vh] left-[31vw] right-[5vw] flex items-center gap-6">
        <span ref={counterRef} className="hud w-20 text-cyan">01 / 01</span>
        <div className="h-px flex-1 bg-cyan/20">
          <div ref={barRef} className="h-px origin-left bg-cyan" style={{ transform: "scaleX(0.02)" }} />
        </div>
        <span className="hud hidden text-mist md:block">Scroll, drag or use ← →</span>
      </div>
    </div>
  );
}
