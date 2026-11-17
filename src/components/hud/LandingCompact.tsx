"use client";

import { useEffect, useRef } from "react";
import { profile } from "@/content";
import { anchors, clearZone, LOCK_MS, loop, SECTIONS, useHud, type SectionId } from "@/lib/hud-store";
import { FOOTER_LINKS, TAGLINE } from "./Landing";

// The landing for phones and small tablets. Same scene, same name with its letter
// particles, same four sections joined to the ring by leader lines. The labels sit in
// two rows, above and below the ring, in the same columns as on the wide screen.

type Callout = { id: SectionId; row: "top" | "bottom"; side: "left" | "right"; meta: string };

const CALLOUTS: Callout[] = [
  { id: "projects", row: "top", side: "left", meta: "Edge AI, ML pipelines" },
  { id: "education", row: "top", side: "right", meta: "M.Eng in Applied AI" },
  { id: "experience", row: "bottom", side: "left", meta: "DevOps, computer vision" },
  { id: "skills", row: "bottom", side: "right", meta: "MLOps, Kubernetes, AWS" },
];

const SHORT_LINKS = [
  { label: "Email", href: FOOTER_LINKS[0].href },
  { label: "LinkedIn", href: FOOTER_LINKS[1].href },
  { label: "GitHub", href: FOOTER_LINKS[2].href },
];

export default function LandingCompact() {
  const active = useHud((s) => s.active);
  const hover = useHud((s) => s.hover);
  const setActive = useHud((s) => s.setActive);
  const setHover = useHud((s) => s.setHover);
  const labelRefs = useRef<Partial<Record<SectionId, HTMLButtonElement | null>>>({});
  const pathRefs = useRef<Partial<Record<SectionId, SVGPathElement | null>>>({});
  const dotRefs = useRef<Partial<Record<SectionId, SVGCircleElement | null>>>({});
  const heroRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  // Leader lines and the name's clearing, every frame.
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      for (const c of CALLOUTS) {
        const el = labelRefs.current[c.id];
        const path = pathRefs.current[c.id];
        const dot = dotRefs.current[c.id];
        const a = anchors[c.id];
        if (!el || !path || !dot) continue;
        const r = el.getBoundingClientRect();
        const sx = c.side === "left" ? r.left + 1 : r.right - 1;
        const sy = c.row === "top" ? r.bottom + 6 : r.top - 6;
        const ey = c.row === "top" ? sy + 16 : sy - 16;
        path.setAttribute("d", `M${sx},${sy} L${sx},${ey} L${a.x},${a.y}`);
        dot.setAttribute("cx", String(a.x));
        dot.setAttribute("cy", String(a.y));
      }
      const hero = heroRef.current;
      if (hero) {
        const r = hero.getBoundingClientRect();
        const padX = r.width * 0.12;
        const padY = r.height * 0.9;
        clearZone.x = r.left - padX;
        clearZone.y = r.top - padY;
        clearZone.w = r.width + padX * 2;
        clearZone.h = r.height + padY * 2;
        clearZone.on = r.width > 0;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    // The scene seeds the letter particles from the heading on resize; this heading
    // replaced the wide one, so ask for a fresh seed once the font is in.
    document.fonts.ready.then(() => window.dispatchEvent(new Event("resize")));
    return () => {
      cancelAnimationFrame(raf);
      clearZone.on = false;
      clearZone.el = null;
    };
  }, []);

  // Swipe up enters the loop at the first section; swipe down enters at the last.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    let x0 = 0;
    let y0 = 0;
    const start = (e: TouchEvent) => {
      const t = e.touches[0];
      x0 = t.clientX;
      y0 = t.clientY;
    };
    const end = (e: TouchEvent) => {
      const st = useHud.getState();
      if (st.active || !st.ready) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - x0;
      const dy = t.clientY - y0;
      const now = performance.now();
      if (now < loop.lockUntil) return;
      if (Math.abs(dy) < 60 || Math.abs(dy) < Math.abs(dx) * 1.3) return;
      loop.lockUntil = now + LOCK_MS;
      if (dy < 0) st.setActive(SECTIONS[0].id, "start");
      else st.setActive(SECTIONS[SECTIONS.length - 1].id, "end");
    };
    root.addEventListener("touchstart", start, { passive: true });
    root.addEventListener("touchend", end, { passive: true });
    return () => {
      root.removeEventListener("touchstart", start);
      root.removeEventListener("touchend", end);
    };
  }, []);

  const hidden = active !== null;

  return (
    <div
      ref={rootRef}
      className={`absolute inset-0 touch-none select-none transition-opacity duration-500 ${hidden ? "pointer-events-none opacity-0" : "opacity-100"}`}
      aria-hidden={hidden}
    >
      <svg className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
        <g fill="none" strokeWidth="1">
          {CALLOUTS.map((c) => (
            <g key={c.id} style={{ color: hover === c.id ? "#e9b44c" : "#9aa0a9" }}>
              <path ref={(el) => void (pathRefs.current[c.id] = el)} stroke="currentColor" strokeOpacity={hover === c.id ? 0.95 : 0.6} />
              <circle ref={(el) => void (dotRefs.current[c.id] = el)} r={hover === c.id ? 4.5 : 3} fill="currentColor" />
            </g>
          ))}
        </g>
      </svg>

      {/* Section labels: the navigation */}
      <nav aria-label="Sections">
        {CALLOUTS.map((c) => {
          const s = SECTIONS.find((x) => x.id === c.id)!;
          const on = hover === c.id;
          return (
            <button
              key={c.id}
              ref={(el) => void (labelRefs.current[c.id] = el)}
              type="button"
              onClick={() => {
                if (performance.now() < loop.lockUntil) return;
                loop.lockUntil = performance.now() + LOCK_MS;
                setActive(c.id);
              }}
              onPointerDown={() => setHover(c.id)}
              onPointerUp={() => setHover(null)}
              onPointerCancel={() => setHover(null)}
              onPointerLeave={() => setHover(null)}
              className={`text-pool absolute z-10 w-[43vw] max-w-[220px] py-1 ${c.side === "left" ? "left-[5vw] text-left" : "right-[5vw] text-right"}`}
              style={c.row === "top" ? { top: "calc(var(--safe-t) + 11dvh)" } : { bottom: "calc(var(--safe-b) + 27dvh)" }}
            >
              <span className={`block font-display text-[clamp(24px,7vw,32px)] font-bold uppercase leading-none tracking-wide transition-colors ${on ? "text-cyan" : "text-[#b8bcc2]"}`}>
                {s.label}
              </span>
              <span className="hud mt-1 block text-[10px] leading-snug text-mist">{c.meta}</span>
            </button>
          );
        })}
      </nav>

      {/* Name in the ring. Its letters shed particles into the star field (see Scene). */}
      <div className="pointer-events-none absolute inset-x-0 flex -translate-y-1/2 justify-center" style={{ top: "calc(var(--safe-t) / 2 + 45dvh)" }}>
        <div ref={heroRef} className="hero-in flex flex-col items-center text-center">
          <h1
            ref={(el) => {
              clearZone.el = el;
            }}
            className="whitespace-nowrap font-display text-[clamp(20px,6.4vw,30px)] font-bold uppercase leading-none tracking-[0.12em] text-white"
          >
            {profile.name}
          </h1>
          <p className="mt-2.5 font-display text-[clamp(11px,3.3vw,15px)] font-semibold uppercase tracking-[0.18em] text-cyan">{TAGLINE}</p>
        </div>
      </div>

      {/* Status */}
      <div className="pointer-events-none absolute inset-x-0 flex justify-center" style={{ bottom: "calc(var(--safe-b) + 19.5dvh)" }}>
        <p className="text-pool hud relative flex items-center gap-2.5 text-[11px] text-bone">
          <span className="h-2 w-2 rounded-full bg-cyan" style={{ animation: "pulse-dot 1.6s infinite" }} />
          Open to work <span className="text-mist">·</span> Germany
        </p>
      </div>

      {/* Swipe hint */}
      <div className="pointer-events-none absolute inset-x-0 flex justify-center" style={{ bottom: "calc(var(--safe-b) + 9.5dvh)" }}>
        <div className="text-pool relative flex flex-col items-center gap-1">
          <span aria-hidden="true" className="scroll-chevrons flex scale-75 rotate-180 flex-col items-center">
            <i />
            <i />
          </span>
          <span className="hud text-bone/80">Swipe up or tap a section</span>
        </div>
      </div>

      {/* Contact bar */}
      <div className="absolute inset-x-[5vw] flex items-stretch justify-between border-t border-rule/45" style={{ bottom: "calc(var(--safe-b) + 1.5dvh)" }}>
        {SHORT_LINKS.map((l) => (
          <a
            key={l.label}
            href={l.href}
            target={l.href.startsWith("http") ? "_blank" : undefined}
            rel="noreferrer"
            className="flex min-h-[44px] items-center font-display text-[16px] font-semibold uppercase tracking-[0.08em] text-cyan active:text-bone"
          >
            {l.label}
          </a>
        ))}
        <a href={profile.links.cv} className="flex min-h-[44px] items-center gap-1.5 font-display text-[16px] font-semibold uppercase tracking-[0.14em] text-cyan active:text-bone">
          CV <span aria-hidden="true">→</span>
        </a>
      </div>
    </div>
  );
}
