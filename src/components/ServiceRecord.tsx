"use client";

import { useEffect, useRef, useState } from "react";
import { serviceRecord } from "@/content";
import { gateProgress, initTunnel } from "@/lib/tunnel-scene";

function StatRow({ stats, compact = false }: { stats: { value: string; label: string }[]; compact?: boolean }) {
  return (
    <dl
      className={`mt-4 grid gap-x-4 gap-y-3 ${compact ? "grid-cols-2 md:[grid-template-columns:repeat(var(--n),minmax(0,1fr))]" : "grid-cols-2 gap-x-6 md:grid-cols-4"}`}
      style={compact ? ({ "--n": stats.length } as React.CSSProperties) : undefined}
    >
      {stats.map((s) => (
        <div key={s.label}>
          <dt className={`hud text-steel ${compact ? "text-[10px] leading-tight [overflow-wrap:anywhere]" : ""}`}>{s.label}</dt>
          <dd className={`font-display font-semibold uppercase text-hazard ${compact ? "text-2xl" : "text-3xl"}`}>{s.value}</dd>
        </div>
      ))}
    </dl>
  );
}

const N = serviceRecord.length;
const WINDOW = 0.11; // how far either side of a gate its card stays visible

export default function ServiceRecord() {
  const sectionRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cardRefs = useRef<(HTMLElement | null)[]>([]);
  const barRef = useRef<HTMLDivElement>(null);
  const [tunnel, setTunnel] = useState(false);

  useEffect(() => {
    const section = sectionRef.current;
    const canvas = canvasRef.current;
    if (!section || !canvas) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return; // plain list stays
    let dispose: (() => void) | undefined;
    let cancelled = false;
    let visible = false;
    let progress = 0;
    let raf = 0;

    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting), { rootMargin: "100px" });
    io.observe(section);

    const measure = () => {
      const r = section.getBoundingClientRect();
      const span = Math.max(1, r.height - window.innerHeight);
      progress = Math.min(1, Math.max(0, -r.top / span));
    };

    const paint = () => {
      measure();
      cardRefs.current.forEach((el, k) => {
        if (!el) return;
        const d = Math.abs(progress - gateProgress(k, N));
        const o = Math.max(0, 1 - d / WINDOW);
        const eased = o * o * (3 - 2 * o);
        el.style.opacity = String(eased);
        el.style.transform = `translate3d(0, ${(1 - eased) * (progress < gateProgress(k, N) ? 28 : -28)}px, 0)`;
        el.style.pointerEvents = eased > 0.5 ? "auto" : "none";
        el.setAttribute("aria-hidden", eased > 0.2 ? "false" : "true");
      });
      if (barRef.current) barRef.current.style.transform = `scaleX(${progress})`;
      raf = requestAnimationFrame(paint);
    };

    const lite = window.matchMedia("(max-width: 767px)").matches;
    initTunnel(canvas, { gates: N, getProgress: () => progress, isVisible: () => visible, lite })
      .then((d) => {
        if (cancelled) return d();
        dispose = d;
        setTunnel(true);
        raf = requestAnimationFrame(paint);
      })
      .catch((e) => console.warn("[tunnel] scene failed, using plain list", e));

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      io.disconnect();
      dispose?.();
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      id="service-record"
      className="relative border-t border-line"
      style={tunnel ? { height: `${(N + 1) * 100}svh` } : undefined}
    >
      {/* Plain list: the default, and what no-WebGL / reduced-motion visitors keep. Hidden visually once the tunnel runs. */}
      <div className={tunnel ? "sr-only" : "mx-auto max-w-[1440px] px-5 py-20 md:px-16"}>
        <h2 className="font-display text-[32px] font-bold uppercase md:text-5xl">Service Record</h2>
        <div className="mt-10 space-y-14">
          {serviceRecord.map((r) => (
            <article key={r.id}>
              <p className="hud text-steel">
                {r.start} to {r.end} // {r.duration}
              </p>
              <h3 className="mt-2 font-display text-[22px] font-semibold uppercase md:text-3xl">{r.title}</h3>
              <p className="text-steel">
                {r.org}, {r.place}
              </p>
              <StatRow stats={r.stats} />
              <ul className="mt-6 max-w-3xl space-y-3">
                {r.bullets.map((b) => (
                  <li key={b.label}>
                    <span className="font-medium text-bone">{b.label}. </span>
                    <span className="text-bone/90">{b.text}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </div>

      {/* Pinned tunnel stage */}
      <div className={
          tunnel
            ? "sticky top-0 h-[100svh] w-full overflow-hidden bg-night"
            : "pointer-events-none invisible absolute inset-x-0 top-0 h-[100svh] overflow-hidden"
        }
        aria-hidden="true">
        <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
        <div className="vignette pointer-events-none absolute inset-0" />

        <p className="hud pointer-events-none absolute left-5 top-24 text-steel md:left-16">
          SERVICE RECORD // DEPLOYMENT HISTORY
        </p>
        <div className="pointer-events-none absolute bottom-8 left-5 right-5 md:left-16 md:right-16">
          <div className="hud mb-2 flex justify-between text-steel">
            <span>ENTRY</span>
            <span>EXFIL</span>
          </div>
          <div className="h-px w-full bg-olive">
            <div ref={barRef} className="h-px origin-left bg-ember" style={{ transform: "scaleX(0)" }} />
          </div>
        </div>

        {serviceRecord.map((r, k) => (
          <article
            key={r.id}
            ref={(el) => {
              cardRefs.current[k] = el;
            }}
            style={{ opacity: 0 }}
            className="chamfer absolute left-5 right-5 top-1/2 max-h-[78svh] -translate-y-1/2 overflow-hidden border border-hazard/60 bg-night/80 p-5 backdrop-blur-sm md:left-auto md:right-16 md:w-[560px] md:p-6"
          >
            <p className="hud text-hazard">
              GATE 0{k + 1} // {r.start} to {r.end} // {r.duration}
            </p>
            <h3 className="mt-2 font-display text-[22px] font-semibold uppercase leading-tight md:text-3xl">{r.title}</h3>
            <p className="text-steel">
              {r.org}, {r.place}
            </p>
            <StatRow stats={r.stats} compact />
            <ul className="mt-4 hidden space-y-2 text-[14px] leading-snug md:block">
              {r.bullets.map((b) => (
                <li key={b.label}>
                  <span className="font-medium text-bone">{b.label}. </span>
                  <span className="text-bone/85">{b.text}</span>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}
