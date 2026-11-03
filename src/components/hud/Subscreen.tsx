"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import gsap from "gsap";
import Lenis from "lenis";
import { LOCK_MS, SECTIONS, loop, useHud, type Entry, type SectionId } from "@/lib/hud-store";
import { SECTION_BLURB, cardsFor, detailFor } from "./cards";
import ExpTimeline, { type ExpTimelineHandle } from "./ExpTimeline";

const pad = (n: number) => String(n).padStart(2, "0");

export default function Subscreen() {
  const active = useHud((s) => s.active);
  const entry = useHud((s) => s.entry);
  const setActive = useHud((s) => s.setActive);
  const rootRef = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<ExpTimelineHandle>(null);
  const counterRef = useRef<HTMLSpanElement>(null);
  const lenisRef = useRef<Lenis | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const detailKey = useHud((s) => s.detail);
  const setDetail = useHud((s) => s.setDetail);

  const cards = useMemo(() => (active ? cardsFor(active) : []), [active]);
  const section = SECTIONS.find((s) => s.id === active);
  const nextIdx = SECTIONS.findIndex((s) => s.id === active) + 1;
  const nextLabel = nextIdx < SECTIONS.length ? SECTIONS[nextIdx].label : "Home";
  const detail = useMemo(() => (active && detailKey ? detailFor(active, detailKey) : null), [active, detailKey]);

  const closeDetail = useCallback(() => {
    const el = panelRef.current;
    if (!el) return setDetail(null);
    gsap.to(el, { opacity: 0, y: 14, duration: 0.22, ease: "power2.in", onComplete: () => setDetail(null) });
  }, [setDetail]);

  // Fade the screen out, then run `then`. Every section change goes through here.
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

  // One step around the loop: next/previous section, or back to the landing screen
  // past either end. Scrolling back into a section lands on its last card.
  const step = useCallback(
    (dir: 1 | -1) => {
      const cur = useHud.getState().active;
      const i = SECTIONS.findIndex((x) => x.id === cur);
      const j = i + dir;
      if (j < 0 || j >= SECTIONS.length) return leave(() => setActive(null));
      const next: Entry = dir === 1 ? "start" : "end";
      leave(() => setActive(SECTIONS[j].id, next));
    },
    [leave, setActive],
  );

  // Rail: Lenis in horizontal mode, per-card depth effect, progress, drag.
  useEffect(() => {
    const wrapper = railRef.current;
    const content = trackRef.current;
    const root = rootRef.current;
    if (!active || !wrapper || !content || !root) return;

    // Animations are time-based: never let a slow frame stall them.
    gsap.ticker.lagSmoothing(0);
    wrapper.scrollLeft = 0; // sections open at the first card, or the last one when scrolling back in
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const lenis = new Lenis({
      wrapper,
      content,
      eventsTarget: window, // the wheel works anywhere on the screen, not only over the rail
      orientation: "horizontal",
      gestureOrientation: "both",
      smoothWheel: !still,
      lerp: still ? 1 : 0.085,
      wheelMultiplier: 1.15,
    });
    lenisRef.current = lenis;
    if (process.env.NODE_ENV !== "production") (window as unknown as { __lenis?: Lenis }).__lenis = lenis;
    const maxScroll = () => Math.max(0, wrapper.scrollWidth - wrapper.clientWidth);
    if (entry === "end") lenis.scrollTo(maxScroll(), { immediate: true, force: true });

    // Hold the new rail still until the section change has settled, so the tail of the
    // wheel flick that brought us here does not drag it along.
    let alive = true;
    let unlock = 0;
    const wait = loop.lockUntil - performance.now();
    if (wait > 0) {
      lenis.stop();
      unlock = window.setTimeout(() => alive && lenis.start(), wait);
    }

    const slots = Array.from(content.querySelectorAll<HTMLElement>("[data-slot]"));
    const total = slots.length;
    // Projects: one wide card fills the rail, its neighbours are blurred, and the rail
    // settles on a card whenever the wheel or the drag lets go.
    const focusMode = active === "projects" || active === "experience";
    let focused = -1;
    let raf = 0;
    const paint = (time: number) => {
      lenis.raf(time);
      const wr = wrapper.getBoundingClientRect();
      const cx = wr.left + wr.width * 0.42;
      let nearest = 0;
      let best = Infinity;
      slots.forEach((el, i) => {
        const r = el.getBoundingClientRect();
        if (focusMode) {
          const d = (r.left - wr.left) / r.width; // 0 = this card is the one in view
          const ad = Math.abs(d);
          if (ad < best) {
            best = ad;
            nearest = i;
          }
          el.style.opacity = String(d < 0 ? Math.max(0, 1 - ad * 2.4) : 1 - Math.min(d, 1) * 0.45);
          el.style.filter = ad > 0.02 ? `blur(${(Math.min(1, ad * 3) * 6).toFixed(2)}px)` : "";
          el.style.transform = `scale(${1 - Math.min(ad, 1) * 0.04})`;
          return;
        }
        if (el.style.filter) el.style.filter = "";
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
      if (nearest !== focused) {
        focused = nearest;
        slots.forEach((el, i) => (i === nearest ? el.setAttribute("data-focus", "") : el.removeAttribute("data-focus")));
      }
      if (chartRef.current && slots.length > 1) chartRef.current.set(lenis.scroll / Math.max(1, slots[1].offsetLeft - slots[0].offsetLeft));
      const p = lenis.limit > 0 ? lenis.scroll / lenis.limit : 0;
      if (barRef.current) barRef.current.style.transform = `scaleX(${Math.min(1, Math.max(0.02, p))})`;
      if (counterRef.current) counterRef.current.textContent = `${pad(nearest + 1)} / ${pad(total)}`;
      raf = requestAnimationFrame(paint);
    };
    raf = requestAnimationFrame(paint);

    // Settling on a card (projects only).
    let anchor = entry === "end" ? total - 1 : 0;
    let snapTimer = 0;
    const slotAt = (i: number) => Math.min(slots[i].offsetLeft, maxScroll());
    const nearestSlot = (t: number) => {
      let k = 0;
      slots.forEach((_, i) => {
        if (Math.abs(slotAt(i) - t) < Math.abs(slotAt(k) - t)) k = i;
      });
      return k;
    };
    const snap = () => {
      if (!alive || !focusMode || useHud.getState().detail) return;
      if (performance.now() < loop.lockUntil) return;
      const t = lenis.targetScroll;
      const delta = t - slotAt(anchor);
      let idx = nearestSlot(t);
      // A deliberate push always moves one card on, however short the flick.
      if (delta > 36) idx = Math.max(idx, Math.min(total - 1, anchor + 1));
      else if (delta < -36) idx = Math.min(idx, Math.max(0, anchor - 1));
      else idx = anchor;
      anchor = idx;
      if (Math.abs(slotAt(idx) - t) > 1) lenis.scrollTo(slotAt(idx), { duration: 0.75 });
    };
    const scheduleSnap = () => {
      if (!focusMode) return;
      window.clearTimeout(snapTimer);
      snapTimer = window.setTimeout(snap, 150);
    };

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
      if (dragging && moved > 6) scheduleSnap();
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

    // Where the rail is right now, judged by where it is heading, not where it is drawn.
    const edges = () => {
      const t = lenis.targetScroll;
      const lim = maxScroll();
      return { start: t <= 2, end: t >= lim - 2 };
    };

    // Wheel: scrolling moves the rail. A gesture that begins with the rail already parked
    // at an end, and keeps pushing past it, hands over to the neighbouring section. A
    // gesture that begins mid-rail never does, so inertia cannot skip a section.
    let lastWheel = 0;
    let pushed = 0;
    let from = { start: false, end: false };
    const onWheel = (e: WheelEvent) => {
      if (useHud.getState().detail) return;
      const now = performance.now();
      if (now < loop.lockUntil) return;
      const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      if (!d) return;
      if (now - lastWheel > 180) {
        pushed = 0;
        from = edges();
      }
      lastWheel = now;
      scheduleSnap();
      const forward = d > 0;
      if ((forward && from.end) || (!forward && from.start)) {
        pushed += Math.abs(d);
        if (pushed >= 80) {
          pushed = 0;
          step(forward ? 1 : -1);
        }
      } else {
        pushed = 0;
      }
    };
    window.addEventListener("wheel", onWheel, { passive: true });

    const onKey = (e: KeyboardEvent) => {
      if (useHud.getState().detail) return; // the detail panel owns the keyboard while open
      const locked = performance.now() < loop.lockUntil;
      if (e.key === "Escape") close();
      else if (e.key === "ArrowRight") {
        if (edges().end) {
          if (!locked) step(1);
        } else if (focusMode) {
          anchor = Math.min(total - 1, nearestSlot(lenis.targetScroll) + 1);
          lenis.scrollTo(slotAt(anchor), { duration: 0.9 });
        } else lenis.scrollTo(lenis.targetScroll + 520, { duration: 0.9 });
      } else if (e.key === "ArrowLeft") {
        if (edges().start) {
          if (!locked) step(-1);
        } else if (focusMode) {
          anchor = Math.max(0, nearestSlot(lenis.targetScroll) - 1);
          lenis.scrollTo(slotAt(anchor), { duration: 0.9 });
        } else lenis.scrollTo(lenis.targetScroll - 520, { duration: 0.9 });
      } else if (e.key === "ArrowDown" || e.key === "PageDown") {
        if (!locked) step(1);
      } else if (e.key === "ArrowUp" || e.key === "PageUp") {
        if (!locked) step(-1);
      } else if (/^[1-4]$/.test(e.key) && !locked) go(SECTIONS[Number(e.key) - 1].id);
    };
    window.addEventListener("keydown", onKey);

    // Entrance.
    const ctx = gsap.context(() => {
      gsap.fromTo(root, { opacity: 0 }, { opacity: 1, duration: 0.45, ease: "power2.out" });
      gsap.fromTo(".sub-head", { y: 28, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, ease: "power3.out", delay: 0.2, stagger: 0.08 });
      gsap.fromTo(".rail-card", { y: 34, opacity: 0 }, { y: 0, opacity: 1, duration: 0.9, ease: "power3.out", delay: 0.25, stagger: 0.08 });
    }, root);

    return () => {
      ctx.revert();
      cancelAnimationFrame(raf);
      wrapper.removeEventListener("pointerdown", down);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      wrapper.removeEventListener("click", swallowClick, true);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("wheel", onWheel);
      alive = false;
      window.clearTimeout(unlock);
      window.clearTimeout(snapTimer);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, [active, entry, close, go, step]);

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
              {s.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Title block */}
      <div className="absolute left-[31vw] right-[5vw] top-[13vh] flex items-end gap-6">
        <div className="pb-1">
          <h2 className="sub-head font-display text-[clamp(44px,5vw,78px)] font-bold uppercase leading-[0.9] tracking-wide">{section.label}</h2>
          <p className="sub-head hud mt-2 text-mist">{SECTION_BLURB[active]}</p>
        </div>
      </div>

      {/* Rail */}
      <div ref={railRef} className="rail absolute bottom-[11vh] left-[31vw] right-0 top-[29vh] cursor-grab">
        <div ref={trackRef} className={`relative flex h-full w-max items-stretch gap-6 ${active === "projects" ? "project-track" : active === "experience" ? "project-track exp-track" : "pr-[8vw]"}`}>
          {cards.map((c, i) => (
            <div key={i} data-slot className="flex h-full shrink-0 items-center">
              {c}
            </div>
          ))}
          {active === "experience" && <ExpTimeline ref={chartRef} />}
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
        <span className="hud hidden text-mist md:block">Scroll or drag · Next: {nextLabel}</span>
      </div>
    </div>
  );
}
