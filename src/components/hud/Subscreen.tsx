"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import gsap from "gsap";
import Lenis from "lenis";
import { SECTIONS, useHud, type SectionId } from "@/lib/hud-store";
import { SECTION_BLURB, cardsFor, detailFor } from "./cards";

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
  const panelRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const detailKey = useHud((s) => s.detail);
  const setDetail = useHud((s) => s.setDetail);

  const cards = useMemo(() => (active ? cardsFor(active) : []), [active]);
  const section = SECTIONS.find((s) => s.id === active);
  const detail = useMemo(() => (active && detailKey ? detailFor(active, detailKey) : null), [active, detailKey]);

  const closeDetail = useCallback(() => {
    const el = panelRef.current;
    if (!el) return setDetail(null);
    gsap.to(el, { opacity: 0, y: 14, duration: 0.22, ease: "power2.in", onComplete: () => setDetail(null) });
  }, [setDetail]);

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
    wrapper.scrollLeft = 0; // every section starts at its first card
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
        // Cards leaving to the left fade out fully so they never ghost over the operator.
        el.style.opacity = String(d < 0 ? Math.min(1, Math.max(0, 1 - Math.max(0, ad - 0.22) * 2.6)) : Math.max(0.35, 1 - Math.max(0, ad - 0.28) * 1.1));
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
      if (useHud.getState().detail) return; // the detail panel owns the keyboard while open
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

  // Detail panel: pause the rail, move focus in, keep Tab inside, Esc closes the panel only.
  useEffect(() => {
    const panel = panelRef.current;
    if (!detailKey || !panel) return;
    openerRef.current = document.activeElement as HTMLElement | null;
    lenisRef.current?.stop();
    gsap.fromTo(panel, { opacity: 0, y: 26 }, { opacity: 1, y: 0, duration: 0.4, ease: "power3.out" });
    panel.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeDetail();
      } else if (e.key === "Tab") {
        const f = Array.from(panel.querySelectorAll<HTMLElement>("a[href], button:not([disabled])"));
        if (!f.length) return;
        const first = f[0];
        const last = f[f.length - 1];
        if (e.shiftKey && (document.activeElement === first || document.activeElement === panel)) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      lenisRef.current?.start();
      openerRef.current?.focus?.();
    };
  }, [detailKey, closeDetail]);

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
      <div ref={railRef} className="rail absolute bottom-[11vh] left-[31vw] right-0 top-[29vh] cursor-grab">
        <div ref={trackRef} className="flex h-full w-max items-stretch gap-6 pr-[8vw]">
          {cards.map((c, i) => (
            <div key={i} data-slot className="flex h-full shrink-0 items-center">
              {c}
            </div>
          ))}
        </div>
      </div>

      {/* Detail panel */}
      {detail && (
        <div className="absolute inset-0 z-10">
          <div className="absolute inset-0 bg-ink/80 backdrop-blur-[3px]" onClick={closeDetail} aria-hidden="true" />
          <div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={detail.title}
            tabIndex={-1}
            className="absolute bottom-[8vh] left-[31vw] right-[5vw] top-[12vh] outline-none"
          >
            <div className="panel flex h-full flex-col px-8 py-6">
              <header className="flex items-start justify-between gap-6">
                <div>
                  <p className="hud text-cyan">{detail.tag}</p>
                  <h3 className="mt-2 font-display text-[clamp(26px,2.8vw,40px)] font-bold uppercase leading-[1.02]">{detail.title}</h3>
                  {detail.sub && <p className="hud mt-2 text-mist">{detail.sub}</p>}
                </div>
                <button
                  type="button"
                  onClick={closeDetail}
                  className="hud shrink-0 border border-cyan/50 px-4 py-2 text-cyan transition-colors hover:bg-cyan hover:text-ink"
                >
                  Close <span className="text-mist">Esc</span>
                </button>
              </header>
              <div className="card-scroll mt-5 min-h-0 flex-1 border-t border-cyan/20 pr-3 pt-5" data-lenis-prevent>
                {detail.body}
              </div>
            </div>
          </div>
        </div>
      )}

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
