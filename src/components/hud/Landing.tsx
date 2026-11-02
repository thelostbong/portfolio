"use client";

import { useEffect, useRef, useState } from "react";
import { profile, projects as projectData, experience as experienceData, skills as skillData, education as educationData } from "@/content";
import { anchors, headRing, SECTIONS, useHud, type SectionId } from "@/lib/hud-store";

type Callout = { id: SectionId; side: "left" | "right"; top: string; meta: string };

const CALLOUTS: Callout[] = [
  { id: "education", side: "left", top: "21%", meta: `${educationData.length} degrees` },
  { id: "experience", side: "left", top: "36%", meta: `${experienceData.length} roles` },
  { id: "contact", side: "left", top: "51%", meta: "Email, LinkedIn, CV" },
  { id: "projects", side: "right", top: "19%", meta: `${projectData.length} featured` },
  { id: "skills", side: "right", top: "44%", meta: `${skillData.length} groups` },
];

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

const READOUT = [
  ["95%", "mAP@50 defect detection"],
  ["<500ms", "edge inference"],
  ["99.99%", "IoT platform uptime"],
  ["10,000+", "edge devices managed"],
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

      {/* Top left: identity */}
      <div className="absolute left-[7vw] top-[8.5vh] flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center border border-cyan/60 font-display text-lg font-bold tracking-wider text-cyan">
          NM
        </div>
        <div className="hud leading-tight text-mist">
          <p className="text-bone">Portfolio</p>
          <p>{profile.location} // 2026</p>
        </div>
      </div>

      {/* Top right: timer and CV */}
      <div className="absolute right-[7vw] top-[8.5vh] flex items-center gap-6">
        <p className="hud hidden text-mist md:block">
          Session <span className="text-bone"><Timecode /></span>
        </p>
        <a
          href={profile.links.cv}
          className="hud border border-cyan/60 bg-cyan/10 px-4 py-2 text-cyan transition-colors hover:bg-cyan hover:text-ink"
        >
          Download CV
        </a>
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
              className={`group absolute z-10 w-[210px] text-left transition-transform duration-300 ${c.side === "left" ? "left-[8vw]" : "right-[8vw] text-right"} ${isHover ? (c.side === "left" ? "translate-x-1" : "-translate-x-1") : ""}`}
              style={{ top: c.top }}
            >
              <span className="hud block text-cyan-dim">{s.number}</span>
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
      <div className="absolute bottom-[10.5vh] left-[7vw] w-[250px]">
        <span className="chip chip-alert">Status</span>
        <p className="mt-3 font-display text-2xl font-semibold uppercase leading-tight">Open to work</p>
        <dl className="hud mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-mist">
          <dt>Region</dt>
          <dd className="text-bone">Germany</dd>
          <dt>Focus</dt>
          <dd className="text-bone">MLOps, computer vision, edge AI</dd>
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
          className="glitch font-display text-[clamp(40px,5vw,84px)] font-bold uppercase leading-[0.92] tracking-[0.02em] text-bone"
          data-text={profile.name}
        >
          {profile.name}
        </h1>
        <p className="mt-3 border border-cyan/50 bg-teal/60 px-6 py-1.5 font-display text-[clamp(16px,1.7vw,26px)] font-semibold uppercase tracking-[0.34em] text-bone backdrop-blur-sm">
          {profile.title}
        </p>
      </div>

      {/* Readout bar */}
      <div className="absolute inset-x-[7vw] bottom-[4.4vh] flex items-end justify-between border-t border-cyan/30 pt-2">
        {READOUT.map(([v, l]) => (
          <div key={l} className="flex items-baseline gap-2">
            <span className="font-display text-xl font-semibold tracking-wide text-cyan">{v}</span>
            <span className="hud text-mist">{l}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
