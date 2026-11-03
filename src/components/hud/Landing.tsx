"use client";

import { useEffect, useRef, useState } from "react";
import { profile } from "@/content";
import { anchors, headRing, SECTIONS, useHud, type SectionId } from "@/lib/hud-store";

type Callout = { id: SectionId; side: "left" | "right"; top: string; meta: string };

// Left column reads top to bottom, then the right column: the same order as the scroll loop.
const CALLOUTS: Callout[] = [
  { id: "projects", side: "left", top: "22%", meta: "Defect detection, edge AI, multimodal ML pipelines" },
  { id: "experience", side: "left", top: "40%", meta: "DevOps, Computer Vision, Machine Learning" },
  { id: "education", side: "right", top: "19%", meta: "M.Eng in Applied AI for Digital Production Management" },
  { id: "skills", side: "right", top: "44%", meta: "MLOps, Kubernetes, AWS, computer vision" },
];

const TAGLINE = "I ship ML and keep it running.";

const pad = (n: number) => String(n).padStart(2, "0");

function Timecode() {
  const [t, setT] = useState("00:00:00");
  useEffect(() => {
    const t0 = performance.now();
    const id = setInterval(() => {
      const s = Math.floor((performance.now() - t0) / 1000);
      setT(`${pad(Math.floor(s / 3600))}:${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}`);
    }, 1000);
    return () => clearInterval(id);
  }, []);
  return <span>{t}</span>;
}

// Wireframe terrain, drawn once. Perspective grid with a pin for where I study.
function TerrainMap() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    c.width = 240 * dpr;
    c.height = 150 * dpr;
    const g = c.getContext("2d");
    if (!g) return;
    g.scale(dpr, dpr);
    g.strokeStyle = "rgba(56,200,216,0.75)";
    g.lineWidth = 1;
    const cols = 22;
    const rows = 12;
    const h = (x: number, z: number) =>
      Math.sin(x * 0.55) * Math.cos(z * 0.7) * 9 + Math.sin(x * 1.3 + z * 0.9) * 3.5 + (Math.sin(x * 0.2) + 1) * 6;
    const project = (x: number, z: number) => {
      const depth = 1 - z / (rows * 1.5);
      const px = 120 + (x - cols / 2) * 10.5 * depth;
      const py = 40 + z * 8.4 - h(x, z) * depth * 0.9;
      return [px, py] as const;
    };
    for (let z = 0; z < rows; z++) {
      g.beginPath();
      for (let x = 0; x < cols; x++) {
        const [px, py] = project(x, z);
        if (x === 0) g.moveTo(px, py);
        else g.lineTo(px, py);
      }
      g.globalAlpha = 0.35 + (z / rows) * 0.65;
      g.stroke();
    }
    g.globalAlpha = 0.5;
    for (let x = 0; x < cols; x += 2) {
      g.beginPath();
      for (let z = 0; z < rows; z++) {
        const [px, py] = project(x, z);
        if (z === 0) g.moveTo(px, py);
        else g.lineTo(px, py);
      }
      g.stroke();
    }
    g.globalAlpha = 1;
    const [pxx, pyy] = project(12, 6);
    g.fillStyle = "#d9ece6";
    g.beginPath();
    g.arc(pxx, pyy, 2.6, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = "#d9ece6";
    g.beginPath();
    g.arc(pxx, pyy, 7, 0, Math.PI * 2);
    g.stroke();
  }, []);
  return <canvas ref={ref} className="h-[150px] w-[240px]" aria-hidden="true" />;
}

const FOOTER_LINKS = [
  { label: "Email", value: profile.contact.email, href: `mailto:${profile.contact.email}` },
  { label: "LinkedIn", value: "nayeemuddin-mohammed-03", href: profile.links.linkedin },
  { label: "GitHub", value: "thelostbong", href: profile.links.github },
] as const;

export default function Landing() {
  const active = useHud((s) => s.active);
  const hover = useHud((s) => s.hover);
  const setActive = useHud((s) => s.setActive);
  const setHover = useHud((s) => s.setHover);
  const labelRefs = useRef<Partial<Record<SectionId, HTMLButtonElement | null>>>({});
  const pathRefs = useRef<Partial<Record<SectionId, SVGPathElement | null>>>({});
  const dotRefs = useRef<Partial<Record<SectionId, SVGCircleElement | null>>>({});
  const ringRef = useRef<SVGGElement>(null);

  useEffect(() => {
    let raf = 0;
    const loop = () => {
      for (const c of CALLOUTS) {
        const el = labelRefs.current[c.id];
        const path = pathRefs.current[c.id];
        const dot = dotRefs.current[c.id];
        const a = anchors[c.id];
        if (!el || !path || !dot) continue;
        const r = el.getBoundingClientRect();
        const lx = c.side === "left" ? r.right : r.left;
        const ly = r.top + 20;
        const ex = c.side === "left" ? lx + 42 : lx - 42;
        path.setAttribute("d", `M${lx},${ly} L${ex},${ly} L${a.x},${a.y}`);
        dot.setAttribute("cx", String(a.x));
        dot.setAttribute("cy", String(a.y));
      }
      if (ringRef.current) ringRef.current.setAttribute("transform", `translate(${headRing.x} ${headRing.y})`);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const hidden = active !== null;

  return (
    <div
      className={`absolute inset-0 transition-opacity duration-500 ${hidden ? "pointer-events-none opacity-0" : "opacity-100"}`}
      aria-hidden={hidden}
    >
      {/* Tall brackets that frame the profile */}
      <div className="pointer-events-none absolute bottom-[19vh] left-[5vw] top-[19vh] w-3 border-y border-l border-cyan/40" />
      <div className="pointer-events-none absolute bottom-[19vh] right-[5vw] top-[19vh] w-3 border-y border-r border-cyan/40" />
      <svg className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
        {/* Leader lines from labels to body anchors */}
        <g fill="none" strokeWidth="1">
          {CALLOUTS.map((c) => (
            <g key={c.id} style={{ color: hover === c.id ? "#d9ece6" : "#38c8d8" }}>
              <path
                ref={(el) => {
                  pathRefs.current[c.id] = el;
                }}
                stroke="currentColor"
                strokeOpacity={hover === c.id ? 0.95 : 0.65}
              />
              <circle
                ref={(el) => {
                  dotRefs.current[c.id] = el;
                }}
                r={hover === c.id ? 5 : 3}
                fill="currentColor"
              />
            </g>
          ))}
        </g>
        {/* Scanner ring on the helmet */}
        <g ref={ringRef}>
          <circle r="66" fill="none" stroke="rgba(190,243,247,0.85)" strokeWidth="1.5" strokeDasharray="3 7" style={{ transformBox: "fill-box", transformOrigin: "center", animation: "spin-slow 24s linear infinite" }} />
          <circle r="52" fill="none" stroke="#bff3f7" strokeWidth="2.5" strokeDasharray="70 256" style={{ transformBox: "fill-box", transformOrigin: "center", animation: "spin-slow 7s linear infinite reverse" }} />
          <path d="M-74,0 h12 M62,0 h12 M0,-74 v12 M0,62 v12" stroke="#bff3f7" strokeWidth="1.5" />
        </g>
      </svg>

      {/* Top right: session timer */}
      <div className="absolute right-[7vw] top-[8.5vh]">
        <p className="hud hidden text-mist md:block">
          Session <span className="text-bone"><Timecode /></span>
        </p>
      </div>

      {/* Callouts: the navigation */}
      <nav aria-label="Sections">
        {CALLOUTS.map((c) => {
          const s = SECTIONS.find((x) => x.id === c.id)!;
          const isHover = hover === c.id;
          return (
            <button
              key={c.id}
              ref={(el) => {
                labelRefs.current[c.id] = el;
              }}
              type="button"
              onClick={() => setActive(c.id)}
              onPointerEnter={() => setHover(c.id)}
              onPointerLeave={() => setHover(null)}
              onFocus={() => setHover(c.id)}
              onBlur={() => setHover(null)}
              className={`group absolute z-10 w-[250px] text-left transition-transform duration-300 ${c.side === "left" ? "left-[8vw]" : "right-[8vw] text-right"} ${isHover ? (c.side === "left" ? "translate-x-1" : "-translate-x-1") : ""}`}
              style={{ top: c.top }}
            >
              <span className={`block font-display text-[34px] font-bold uppercase leading-none tracking-wide transition-colors ${isHover ? "text-cyan" : "text-bone"}`}>
                {s.label}
              </span>
              <span className="hud mt-1 block text-mist">{c.meta}</span>
              <span className={`mt-2 block h-px bg-cyan/50 transition-all duration-300 ${isHover ? "w-full" : "w-10"} ${c.side === "right" ? "ml-auto" : ""}`} />
            </button>
          );
        })}
      </nav>

      {/* Bottom left: status */}
      <div className="absolute bottom-[10vh] left-[7vw] w-[340px]">
        <span className="chip chip-alert inline-flex items-center gap-2 !px-3 !py-1 !text-[12px]">
          <span className="h-2 w-2 rounded-full bg-white" style={{ animation: "pulse-dot 1.6s infinite" }} />
          Status
        </span>
        <p className="mt-3 font-display text-[44px] font-bold uppercase leading-none tracking-wide text-bone">Open to work</p>
        <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-5 gap-y-1.5 border-l-2 border-cyan pl-4 font-hud text-[13px] uppercase leading-snug tracking-[0.08em]">
          <dt className="text-mist">Region</dt>
          <dd className="text-bone">Germany</dd>
          <dt className="text-mist">Focus</dt>
          <dd className="text-cyan">MLOps, computer vision, edge AI</dd>
        </dl>
      </div>

      {/* Bottom right: terrain map */}
      <div className="absolute bottom-[10.5vh] right-[7vw]">
        <div className="panel p-2">
          <TerrainMap />
          <div className="hud mt-1 flex justify-between text-mist">
            <span>Munich, DE</span>
            <span className="text-bone">48.14N 11.58E</span>
          </div>
        </div>
      </div>

      {/* Name plate */}
      <div className="pointer-events-none absolute inset-x-0 bottom-[17vh] flex flex-col items-center">
        <h1
          className="glitch font-display text-[clamp(24px,2.1vw,38px)] font-bold uppercase leading-none tracking-[0.12em] text-bone"
          data-text={profile.name}
        >
          {profile.name}
        </h1>
        <p className="mt-3 border border-cyan/50 bg-teal/60 px-6 py-1.5 font-display text-[clamp(15px,1.5vw,23px)] font-medium uppercase tracking-[0.2em] text-bone backdrop-blur-sm">
          {TAGLINE}
        </p>
      </div>

      {/* Scroll hint */}
      <div className="pointer-events-none absolute inset-x-0 bottom-[10vh] flex flex-col items-center gap-1">
        <span className="font-display text-[clamp(17px,1.35vw,22px)] font-bold uppercase tracking-[0.34em] text-[#bff3f7] [text-shadow:0_0_18px_rgb(56_200_216/0.8)]">
          Scroll to explore
        </span>
        <span aria-hidden="true" className="scroll-chevrons flex flex-col items-center">
          <i />
          <i />
        </span>
      </div>

      {/* Contact bar */}
      <div className="absolute inset-x-[7vw] bottom-[4.4vh] flex items-end justify-between border-t border-cyan/30 pt-2">
        {FOOTER_LINKS.map((l) => (
          <a
            key={l.label}
            href={l.href}
            target={l.href.startsWith("http") ? "_blank" : undefined}
            rel="noreferrer"
            className="group flex items-baseline gap-2"
          >
            <span className="hud text-mist">{l.label}</span>
            <span className="font-display text-lg font-semibold tracking-wide text-cyan transition-colors group-hover:text-bone">{l.value}</span>
          </a>
        ))}
        <a href={profile.links.cv} className="group flex items-baseline gap-2">
          <span className="font-display text-lg font-semibold uppercase tracking-[0.18em] text-cyan transition-colors group-hover:text-bone">CV</span>
          <span aria-hidden="true" className="text-cyan transition-transform group-hover:translate-x-1">→</span>
        </a>
      </div>
    </div>
  );
}
