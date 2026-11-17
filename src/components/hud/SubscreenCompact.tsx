"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import gsap from "gsap";
import { projects as projectData } from "@/content";
import { LOCK_MS, SECTIONS, loop, useHud, type Entry, type SectionId } from "@/lib/hud-store";
import { SECTION_BLURB, cardsFor, detailFor } from "./cards";
import Viz from "./viz";

// Sections on phones and small tablets. Same cards and the same loop as the wide screen:
// swipe sideways through the cards, swipe up or down for the next or previous section.
// The particle cloud rises behind the title. Details open as a sheet from the bottom.

const pad = (n: number) => String(n).padStart(2, "0");

export default function SubscreenCompact() {
  const active = useHud((s) => s.active);
  const entry = useHud((s) => s.entry);
  const setActive = useHud((s) => s.setActive);
  const detailKey = useHud((s) => s.detail);
  const setDetail = useHud((s) => s.setDetail);
  const rootRef = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const counterRef = useRef<HTMLSpanElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);

  const cards = useMemo(() => (active ? cardsFor(active, true) : []), [active]);
  const section = SECTIONS.find((s) => s.id === active);
  const idx = SECTIONS.findIndex((s) => s.id === active);
  const nextLabel = idx + 1 < SECTIONS.length ? SECTIONS[idx + 1].label : "Home";
  const detail = useMemo(() => (active && detailKey ? detailFor(active, detailKey) : null), [active, detailKey]);
  const detailViz = active === "projects" && detailKey && projectData.some((p) => p.slug === detailKey) ? detailKey : null;

  const closeDetail = useCallback(() => {
    const el = sheetRef.current;
    if (!el) return setDetail(null);
    gsap.to(el, { yPercent: 100, duration: 0.26, ease: "power2.in", onComplete: () => setDetail(null) });
  }, [setDetail]);

  const leave = useCallback((then: () => void) => {
    loop.lockUntil = performance.now() + LOCK_MS;
    const el = rootRef.current;
    if (!el) return then();
    gsap.to(el, { opacity: 0, duration: 0.3, ease: "power2.in", onComplete: then });
  }, []);

  const close = useCallback(() => leave(() => setActive(null)), [leave, setActive]);
  const go = useCallback(
    (id: SectionId) => {
      if (id !== useHud.getState().active) leave(() => setActive(id, "start"));
    },
    [leave, setActive],
  );
  const step = useCallback(
    (dir: 1 | -1) => {
      if (performance.now() < loop.lockUntil) return;
      const cur = useHud.getState().active;
      const i = SECTIONS.findIndex((x) => x.id === cur);
      const j = i + dir;
      if (j < 0 || j >= SECTIONS.length) return leave(() => setActive(null));
      const next: Entry = dir === 1 ? "start" : "end";
      leave(() => setActive(SECTIONS[j].id, next));
    },
    [leave, setActive],
  );

  // Rail: native touch scroll with snap. Track which card is in view.
  useEffect(() => {
    const rail = railRef.current;
    const root = rootRef.current;
    if (!active || !rail || !root) return;
    const slots = Array.from(rail.querySelectorAll<HTMLElement>("[data-slot]"));
    const total = slots.length;
    rail.scrollLeft = entry === "end" ? rail.scrollWidth : 0;

    let focused = -1;
    const update = () => {
      const max = Math.max(1, rail.scrollWidth - rail.clientWidth);
      let nearest = 0;
      let best = Infinity;
      slots.forEach((el, i) => {
        const d = Math.abs(el.offsetLeft - 16 - rail.scrollLeft);
        if (d < best) {
          best = d;
          nearest = i;
        }
      });
      if (rail.scrollLeft >= max - 2) nearest = total - 1;
      if (nearest !== focused) {
        focused = nearest;
        slots.forEach((el, i) => (i === nearest ? el.setAttribute("data-focus", "") : el.removeAttribute("data-focus")));
        if (counterRef.current) counterRef.current.textContent = `${pad(nearest + 1)} / ${pad(total)}`;
      }
      if (barRef.current) barRef.current.style.transform = `scaleX(${Math.min(1, Math.max(0.02, (nearest + 1) / total))})`;
    };
    update();
    rail.addEventListener("scroll", update, { passive: true });

    // Swipe up or down anywhere outside the sheet: next or previous section.
    let x0 = 0;
    let y0 = 0;
    const start = (e: TouchEvent) => {
      const t = e.touches[0];
      x0 = t.clientX;
      y0 = t.clientY;
    };
    const end = (e: TouchEvent) => {
      if (useHud.getState().detail) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - x0;
      const dy = t.clientY - y0;
      if (Math.abs(dy) < 70 || Math.abs(dy) < Math.abs(dx) * 1.4) return;
      step(dy < 0 ? 1 : -1);
    };
    root.addEventListener("touchstart", start, { passive: true });
    root.addEventListener("touchend", end, { passive: true });

    // Keyboard (tablets with keyboards, narrow desktop windows).
    const onKey = (e: KeyboardEvent) => {
      if (useHud.getState().detail) return;
      const w = slots[1] ? slots[1].offsetLeft - slots[0].offsetLeft : rail.clientWidth;
      if (e.key === "Escape") close();
      else if (e.key === "ArrowRight") rail.scrollBy({ left: w, behavior: "smooth" });
      else if (e.key === "ArrowLeft") rail.scrollBy({ left: -w, behavior: "smooth" });
      else if (e.key === "ArrowDown" || e.key === "PageDown") step(1);
      else if (e.key === "ArrowUp" || e.key === "PageUp") step(-1);
    };
    window.addEventListener("keydown", onKey);

    const ctx = gsap.context(() => {
      gsap.fromTo(root, { opacity: 0 }, { opacity: 1, duration: 0.45, ease: "power2.out" });
      gsap.fromTo(".sub-head", { y: 22, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7, ease: "power3.out", delay: 0.15, stagger: 0.07 });
      gsap.fromTo(".rail-card", { y: 28, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, ease: "power3.out", delay: 0.2, stagger: 0.07 });
    }, root);

    return () => {
      ctx.revert();
      rail.removeEventListener("scroll", update);
      root.removeEventListener("touchstart", start);
      root.removeEventListener("touchend", end);
      window.removeEventListener("keydown", onKey);
    };
  }, [active, entry, close, step]);

  // Detail sheet: slides up, swipe its top edge down (or tap outside) to close.
  useEffect(() => {
    const sheet = sheetRef.current;
    if (!detailKey || !sheet) return;
    openerRef.current = document.activeElement as HTMLElement | null;
    gsap.fromTo(sheet, { yPercent: 100 }, { yPercent: 0, duration: 0.42, ease: "power3.out" });
    sheet.focus({ preventScroll: true });
    const grip = sheet.querySelector<HTMLElement>("[data-grip]");
    let y0 = 0;
    let dy = 0;
    let dragging = false;
    const start = (e: TouchEvent) => {
      dragging = true;
      dy = 0;
      y0 = e.touches[0].clientY;
    };
    const move = (e: TouchEvent) => {
      if (!dragging) return;
      dy = Math.max(0, e.touches[0].clientY - y0);
      gsap.set(sheet, { y: dy });
    };
    const end = () => {
      if (!dragging) return;
      dragging = false;
      if (dy > 90) closeDetail();
      else gsap.to(sheet, { y: 0, duration: 0.25, ease: "power2.out" });
    };
    grip?.addEventListener("touchstart", start, { passive: true });
    grip?.addEventListener("touchmove", move, { passive: true });
    grip?.addEventListener("touchend", end);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeDetail();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      grip?.removeEventListener("touchstart", start);
      grip?.removeEventListener("touchmove", move);
      grip?.removeEventListener("touchend", end);
      window.removeEventListener("keydown", onKey);
      openerRef.current?.focus?.({ preventScroll: true });
    };
  }, [detailKey, closeDetail]);

  if (!active || !section) return null;

  return (
    <div ref={rootRef} className="absolute inset-0 z-20 touch-none" role="region" aria-label={section.label}>
      {/* The cloud stays visible behind the title; the card area is darkened so text reads. */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,rgb(0_0_0/0.15)_0%,rgb(0_0_0/0.45)_22%,rgb(0_0_0/0.82)_38%,rgb(0_0_0/0.9)_100%)]" />

      {/* Back + position */}
      <div className="absolute inset-x-4 flex items-center justify-between" style={{ top: "calc(var(--safe-t) + 12px)" }}>
        <button
          type="button"
          onClick={close}
          className="hud flex min-h-[40px] items-center gap-2.5 border border-rule/65 bg-ink/60 px-3.5 text-cyan active:bg-cyan active:text-ink"
        >
          <span aria-hidden="true">←</span> Home
        </button>
        <span ref={counterRef} className="hud text-cyan">01 / 01</span>
      </div>

      {/* Section switcher */}
      <nav aria-label="Sections" className="absolute inset-x-4 grid grid-cols-4 gap-1" style={{ top: "calc(var(--safe-t) + 62px)" }}>
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => go(s.id)}
            aria-current={s.id === active}
            className={`hud min-h-[38px] border px-0.5 text-center text-[10px] tracking-[0.06em] ${s.id === active ? "border-cyan bg-cyan text-ink" : "border-rule/40 bg-ink/40 text-mist active:text-bone"}`}
          >
            {s.label}
          </button>
        ))}
      </nav>

      {/* Title */}
      <div className="absolute inset-x-4" style={{ top: "calc(var(--safe-t) + 112px)" }}>
        <h2 className="sub-head font-display text-[38px] font-bold uppercase leading-[0.9] tracking-wide">{section.label}</h2>
        <p className="sub-head hud mt-1.5 line-clamp-2 text-[10px] leading-snug text-mist">{SECTION_BLURB[active]}</p>
      </div>

      {/* Rail */}
      <div ref={railRef} className="rail-c absolute inset-x-0" style={{ top: "calc(var(--safe-t) + 196px)", bottom: "calc(var(--safe-b) + 62px)" }}>
        <div className="flex h-full w-max items-stretch gap-3 pl-4" style={{ paddingRight: "40px" }}>
          {cards.map((c, i) => (
            <div key={i} data-slot className="flex h-full shrink-0 items-center">
              {c}
            </div>
          ))}
        </div>
      </div>

      {/* Progress + next section */}
      <div className="absolute inset-x-4 flex items-center gap-4" style={{ bottom: "calc(var(--safe-b) + 14px)" }}>
        <div className="h-px flex-1 bg-cyan/20">
          <div ref={barRef} className="h-px origin-left bg-cyan transition-transform duration-300" style={{ transform: "scaleX(0.02)" }} />
        </div>
        <button type="button" onClick={() => step(1)} className="hud flex min-h-[40px] items-center gap-2 text-bone active:text-cyan">
          Next: {nextLabel} <span aria-hidden="true" className="text-cyan">↑</span>
        </button>
      </div>

      {/* Detail sheet */}
      {detail && (
        <div className="absolute inset-0 z-30">
          <div className="absolute inset-0 bg-ink/80" onClick={closeDetail} aria-hidden="true" />
          <div
            ref={sheetRef}
            role="dialog"
            aria-modal="true"
            aria-label={detail.title}
            tabIndex={-1}
            className="absolute inset-x-0 bottom-0 flex max-h-[90dvh] flex-col border-t-2 border-cyan bg-abyss outline-none"
            style={{ paddingBottom: "var(--safe-b)" }}
          >
            <div data-grip className="shrink-0 px-4 pb-3 pt-2.5">
              <div className="mx-auto h-1 w-10 rounded-full bg-rule/50" aria-hidden="true" />
              <header className="mt-3 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="hud text-[10px] text-cyan">{detail.tag}</p>
                  <h3 className="mt-1.5 font-display text-[24px] font-bold uppercase leading-[1.05]">{detail.title}</h3>
                  {detail.sub && <p className="hud mt-1.5 text-[10px] text-mist">{detail.sub}</p>}
                </div>
                <button type="button" onClick={closeDetail} className="hud min-h-[40px] shrink-0 border border-rule/65 px-3 text-cyan active:bg-cyan active:text-ink">
                  Close
                </button>
              </header>
            </div>
            <div className="card-scroll min-h-0 flex-1 touch-pan-y overscroll-contain border-t border-rule/35 px-4 pb-6 pt-4">
              {detailViz && (
                <div className="mb-6">
                  <div className="viz-pan -mx-4 px-4">
                    <div style={{ width: 720, height: 163 }}>
                      <Viz slug={detailViz} />
                    </div>
                  </div>
                  <p className="hud mt-1.5 text-[9.5px] text-mist">Swipe the diagram sideways</p>
                </div>
              )}
              {detail.body}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
