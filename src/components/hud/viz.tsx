"use client";

import type { CSSProperties, ReactNode } from "react";

// One animated scene per featured project. Each is an SVG on an 840 x 190 canvas,
// styled with the HUD tokens (classes vz-* live in globals.css) and driven by CSS
// keyframes, so a scene costs nothing while its card is out of focus: the rail
// pauses every scene except the one being looked at.

// Keyframes that fade an element in at `a`% of the loop and out after `b`%.
const win = (name: string, a: number, b: number, f = 3) =>
  `@keyframes ${name}{0%,${a}%{opacity:0}${a + f}%,${b}%{opacity:1}${b + f}%,100%{opacity:0}}`;

// Same, with two separate visible windows in one loop.
const win2 = (name: string, a: number, b: number, c: number, d: number, f = 3) =>
  `@keyframes ${name}{0%,${a}%{opacity:0}${a + f}%,${b}%{opacity:1}${b + f}%,${c}%{opacity:0}${c + f}%,${d}%{opacity:1}${d + f}%,100%{opacity:0}}`;

function Stage({ label, css, children }: { label: string; css: string; children: ReactNode }) {
  return (
    <div className="viz relative h-full min-h-[110px] w-full overflow-hidden border border-cyan/20 bg-ink/50">
      <style>{css}</style>
      <svg viewBox="0 0 840 190" preserveAspectRatio="xMidYMid meet" className="absolute inset-0 h-full w-full" role="img" aria-label={label}>
        {children}
      </svg>
    </div>
  );
}

const along = (d: string, delay: number): CSSProperties => ({ offsetPath: `path("${d}")`, animationDelay: `${delay}s` });
const origin = (x: string, y: string): CSSProperties => ({ transformBox: "fill-box", transformOrigin: `${x} ${y}` });

/* ------------------------------------------------------------------ */
/* 1. Assembly inspection: three cameras, a Pi running YOLO, a MES       */
/* ------------------------------------------------------------------ */

const LG_LINK = "M504,90 L640,90";
const LG_CAMS = "M232,34 C320,34 340,84 392,88";

function LineGuardViz() {
  const css = [
    `.lg-belt{animation:lg-belt .9s linear infinite}@keyframes lg-belt{to{stroke-dashoffset:-16}}`,
    `.lg-part{animation:lg-travel 6s linear infinite}@keyframes lg-travel{0%{transform:translateX(24px);opacity:0}6%{opacity:1}94%{opacity:1}100%{transform:translateX(296px);opacity:0}}`,
    `.lg-box{animation:lg-box 6s linear infinite}@keyframes lg-box{0%,38%{opacity:0}42%,56%{opacity:1}60%,100%{opacity:0}}`,
    `.lg-beam{animation:lg-beam 1.4s ease-in-out infinite}@keyframes lg-beam{0%,100%{opacity:.04}50%{opacity:.34}}`,
    `.lg-pkt{animation:lg-pkt 1.8s linear infinite;offset-rotate:0deg}@keyframes lg-pkt{from{offset-distance:0%}to{offset-distance:100%}}`,
    `.lg-gate{animation:lg-gate 8s linear infinite}@keyframes lg-gate{0%,28%{opacity:1}32%,56%{opacity:0}60%,100%{opacity:1}}`,
    `.lg-x{animation:lg-x 8s linear infinite}@keyframes lg-x{0%,28%{opacity:0}32%,56%{opacity:1}60%,100%{opacity:0}}`,
    ...[0, 1, 2, 3].map((i) => {
      const a = 30 + i * 6;
      return `.lg-q${i}{animation:lg-q${i} 8s linear infinite}@keyframes lg-q${i}{0%,${a}%{opacity:.08}${a + 3}%,57%{opacity:1}62%,100%{opacity:.08}}`;
    }),
    ...[0, 1, 2, 3].map((i) => `.lg-r${i}{animation:lg-r${i} 8s linear infinite}${win2(`lg-r${i}`, 4 + i * 6, 12 + i * 6, 62 + i * 5, 70 + i * 5, 2)}`),
  ].join("");

  const part = (i: number, defect: boolean) => (
    <g key={i} className="lg-part" style={{ animationDelay: `${-i * 2}s` }}>
      <rect x="0" y="114" width="34" height="22" rx="2" className="vz-f" />
      <circle cx="10" cy="125" r="3.5" className="vz-sd" />
      <path d="M20,120 h8 M20,125 h8 M20,130 h8" className="vz-sd" />
      <g className="lg-box">
        <rect x="-6" y="107" width="46" height="34" className={defect ? "vz-a" : "vz-s"} />
        <text x="-6" y="102" className={`vz-t ${defect ? "vz-ta" : "vz-tc"}`}>
          {defect ? "Defect 0.91" : "OK 0.97"}
        </text>
      </g>
    </g>
  );

  return (
    <Stage label="Three cameras watch parts on a conveyor. A Raspberry Pi runs YOLOv12s and posts each result to a MES, queuing records when the link drops." css={css}>
      <text x="160" y="16" textAnchor="middle" className="vz-t">3 cameras</text>
      {[110, 160, 210].map((cx, i) => (
        <g key={cx}>
          <polygon points={`${cx - 6},50 ${cx + 6},50 174,114 146,114`} className="vz-fillc lg-beam" style={{ animationDelay: `${i * 0.25}s` }} />
          <rect x={cx - 11} y="24" width="22" height="14" rx="2" className="vz-fb" />
          <circle cx={cx} cy="44" r="4.5" className="vz-s" />
        </g>
      ))}
      <rect x="20" y="136" width="312" height="6" className="vz-fb" />
      <line x1="20" y1="150" x2="332" y2="150" strokeDasharray="8 8" className="vz-sd lg-belt" />
      {part(0, false)}
      {part(1, true)}
      {part(2, false)}

      <path d={LG_CAMS} className="vz-sd" />
      {[0, 0.6, 1.2].map((d) => (
        <rect key={d} x="-3" y="-3" width="6" height="6" className="vz-fillc lg-pkt" style={along(LG_CAMS, -d)} />
      ))}

      <rect x="392" y="58" width="112" height="64" className="vz-fb" />
      {[408, 428, 448, 468, 488].map((x) => (
        <path key={x} d={`M${x},58 v-6 M${x},122 v6`} className="vz-sd" />
      ))}
      <text x="448" y="82" textAnchor="middle" className="vz-t vz-tb" style={{ fontSize: 10 }}>Raspberry Pi 5</text>
      <text x="448" y="98" textAnchor="middle" className="vz-t vz-tc" style={{ fontSize: 10 }}>YOLOv12s · ONNX</text>
      <text x="448" y="144" textAnchor="middle" className="vz-t vz-tc">&lt; 500 ms</text>

      <path d={LG_LINK} className="vz-sd" />
      <g className="lg-gate">
        {[0, 0.6, 1.2].map((d) => (
          <rect key={d} x="-3" y="-3" width="6" height="6" className="vz-fillc lg-pkt" style={along(LG_LINK, -d)} />
        ))}
      </g>
      <g className="lg-x">
        <path d="M562,84 l12,12 M574,84 l-12,12" className="vz-a" />
        <text x="568" y="74" textAnchor="middle" className="vz-t vz-ta">Link down</text>
      </g>
      <text x="568" y="30" textAnchor="middle" className="vz-t vz-tc">&lt; 1 s edge to MES</text>
      <rect x="528" y="112" width="80" height="24" className="vz-fb" />
      {[0, 1, 2, 3].map((i) => (
        <rect key={i} x={534 + i * 18} y="118" width="14" height="12" className={`vz-fillc lg-q${i}`} />
      ))}
      <text x="568" y="150" textAnchor="middle" className="vz-t">Offline queue</text>

      <rect x="640" y="34" width="170" height="124" className="vz-fb" />
      <text x="652" y="52" className="vz-t vz-tb">Tulip MES</text>
      {[0, 1, 2, 3].map((i) => (
        <g key={i}>
          <rect x="650" y={62 + i * 22} width="150" height="16" className="vz-sd" />
          <rect x="650" y={62 + i * 22} width="150" height="16" className={`vz-fillc lg-r${i}`} style={{ opacity: 0.0 }} />
          <text x="658" y={74 + i * 22} className="vz-t">{`Record ${String(i + 1).padStart(3, "0")} · OK`}</text>
        </g>
      ))}
      <text x="652" y="178" className="vz-t vz-tc">Zero duplicates</text>
    </Stage>
  );
}

/* ------------------------------------------------------------------ */
/* 2. Edge AI defect detection on a microcontroller                     */
/* ------------------------------------------------------------------ */

const NS_IN = "M215,118 L320,100";
const NS_OUT = "M450,92 L530,92";

function NanoSentryViz() {
  const css = [
    `@keyframes ns-scan{0%{transform:translateX(0);opacity:0}3%{opacity:.9}20%{transform:translateX(146px);opacity:.9}24%,50%{transform:translateX(146px);opacity:0}52%{transform:translateX(0);opacity:0}55%{opacity:.9}70%{transform:translateX(146px);opacity:.9}74%,100%{transform:translateX(146px);opacity:0}}`,
    `.ns-scan{animation:ns-scan 14s linear infinite}`,
    `@keyframes ns-s1{0%,2%{opacity:0}5%,20%{opacity:1}23%,54%{opacity:0}57%,72%{opacity:1}75%,100%{opacity:0}}`,
    `@keyframes ns-s2{0%,22%{opacity:0}25%,40%{opacity:1}43%,74%{opacity:0}77%,92%{opacity:1}95%,100%{opacity:0}}`,
    `.ns-b1,.ns-lab1{animation:ns-s1 14s linear infinite}.ns-b2,.ns-lab2{animation:ns-s2 14s linear infinite}`,
    `@keyframes ns-stud{0%,49%{opacity:1}50%,99%{opacity:0}100%{opacity:1}}.ns-stud{animation:ns-stud 14s linear infinite}`,
    `@keyframes ns-miss{0%,57%{opacity:0}60%,96%{opacity:1}99%,100%{opacity:0}}.ns-miss{animation:ns-miss 14s linear infinite}`,
    `@keyframes ns-ring{0%,2%{stroke-dashoffset:188.5}42%,50%{stroke-dashoffset:0}51%,54%{stroke-dashoffset:188.5}92%,99%{stroke-dashoffset:0}100%{stroke-dashoffset:188.5}}.ns-ring{animation:ns-ring 14s linear infinite}`,
    `@keyframes ns-pass{0%,42%{opacity:0}45%,56%{opacity:1}59%,100%{opacity:0}}.ns-pass{animation:ns-pass 14s linear infinite}`,
    `@keyframes ns-fail{0%,2%{opacity:1}6%,92%{opacity:0}95%,100%{opacity:1}}.ns-fail{animation:ns-fail 14s linear infinite}`,
    `.lg-pkt{animation:lg-pkt 1.8s linear infinite;offset-rotate:0deg}@keyframes lg-pkt{from{offset-distance:0%}to{offset-distance:100%}}`,
  ].join("");

  const studX = [68.75, 106.25, 143.75, 181.25];

  return (
    <Stage label="A brick passes a camera. Two YOLOv11n stages, colour and missing piece, run on an ESP32-P4. A complete brick passes and a brick with a missing stud is flagged." css={css}>
      <rect x="30" y="140" width="190" height="6" className="vz-fb" />
      <rect x="50" y="100" width="150" height="40" className="vz-f" />
      {studX.map((x, i) => (
        <rect key={x} x={x - 11} y="91" width="22" height="9" rx="2" className={`vz-f ${i === 2 ? "ns-stud" : ""}`} />
      ))}
      <rect x="132.75" y="89" width="22" height="13" rx="2" className="vz-a ns-miss" strokeDasharray="3 3" />
      <g className="ns-scan" style={{ opacity: 0 }}>
        <rect x="36" y="86" width="14" height="60" className="vz-fillc" fillOpacity="0.16" />
        <rect x="50" y="86" width="2.5" height="60" className="vz-fillc" />
      </g>
      <text x="125" y="70" textAnchor="middle" className="vz-t vz-tc ns-lab1" style={{ opacity: 0 }}>Stage 1 · colour</text>
      <text x="125" y="70" textAnchor="middle" className="vz-t vz-tc ns-lab2" style={{ opacity: 0 }}>Stage 2 · missing piece</text>
      <text x="125" y="172" textAnchor="middle" className="vz-t">Camera frame</text>

      <path d={NS_IN} className="vz-sd" />
      <path d={NS_OUT} className="vz-sd" />
      {[0, 0.6].map((d) => (
        <g key={d}>
          <rect x="-3" y="-3" width="6" height="6" className="vz-fillc lg-pkt" style={along(NS_IN, -d)} />
          <rect x="-3" y="-3" width="6" height="6" className="vz-fillc lg-pkt" style={along(NS_OUT, -d)} />
        </g>
      ))}

      <text x="322" y="30" className="vz-t">FP32</text>
      <rect x="356" y="24" width="72" height="7" className="vz-sd" />
      <text x="322" y="46" className="vz-t vz-tc">INT8</text>
      <rect x="356" y="40" width="18" height="7" className="vz-fillc" />
      <rect x="320" y="52" width="130" height="80" className="vz-fb" />
      {[336, 352, 368, 384, 400, 416, 432].map((x) => (
        <path key={x} d={`M${x},52 v-6 M${x},132 v6`} className="vz-sd" />
      ))}
      <text x="385" y="76" textAnchor="middle" className="vz-t vz-tb">ESP32-P4</text>
      <text x="385" y="90" textAnchor="middle" className="vz-t vz-tc">YOLOv11n · INT8</text>
      <rect x="332" y="102" width="50" height="20" className="vz-sd" />
      <rect x="388" y="102" width="50" height="20" className="vz-sd" />
      <rect x="332" y="102" width="50" height="20" className="vz-fillc ns-b1" style={{ opacity: 0 }} />
      <rect x="388" y="102" width="50" height="20" className="vz-fillc ns-b2" style={{ opacity: 0 }} />
      <text x="357" y="116" textAnchor="middle" className="vz-t vz-tb">S1</text>
      <text x="413" y="116" textAnchor="middle" className="vz-t vz-tb">S2</text>
      <text x="385" y="156" textAnchor="middle" className="vz-t">No cloud · no GPU</text>

      <rect x="530" y="36" width="280" height="116" className="vz-fb" />
      <circle cx="590" cy="94" r="30" className="vz-sd" />
      <circle cx="590" cy="94" r="30" className="vz-s ns-ring" strokeDasharray="188.5" transform="rotate(-90 590 94)" strokeWidth="3" />
      <text x="590" y="99" textAnchor="middle" className="vz-t vz-tc" style={{ fontSize: 13, fontWeight: 700 }}>&lt; 2 s</text>
      <text x="590" y="140" textAnchor="middle" className="vz-t">Inference</text>
      <text x="720" y="90" textAnchor="middle" className="vz-big vz-tc ns-pass" style={{ opacity: 0 }}>Pass</text>
      <text x="720" y="90" textAnchor="middle" className="vz-big vz-ta ns-fail" style={{ opacity: 0 }}>Defect</text>
      <text x="720" y="118" textAnchor="middle" className="vz-t">False positives &lt; 5%</text>
    </Stage>
  );
}

/* ------------------------------------------------------------------ */
/* 3. Fashion image pipeline: translate, prompt, generate, score         */
/* ------------------------------------------------------------------ */

const SHIRT = "M14,10 L22,6 Q28,11 34,6 L42,10 L50,20 L43,25 L40,22 L40,44 L16,44 L16,22 L13,25 L6,20 Z";
const NOISE = (() => {
  let s = 7;
  const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  return Array.from({ length: 26 }, () => ({ x: r() * 46 + 1, y: r() * 46 + 1, w: 2 + r() * 3 }));
})();

function ThreadlineViz() {
  const css = [
    win("tl-a", 3, 92), win("tl-b", 8, 92), win("tl-c", 13, 92), win("tl-d", 19, 92), win("tl-e", 24, 92), win("tl-f", 29, 92),
    win("tl-h1", 4, 36), win("tl-h2", 30, 46), win("tl-h3", 44, 72), win("tl-h4", 68, 94),
    `.tl-bar{transform-box:fill-box;transform-origin:left center;animation:tl-bar 10s linear infinite}@keyframes tl-bar{0%,31%{transform:scaleX(0)}39%,90%{transform:scaleX(1)}96%,100%{transform:scaleX(0)}}`,
    `.tl-noise{animation:tl-noise 10s linear infinite}@keyframes tl-noise{0%,44%{opacity:0}48%{opacity:.9}62%{opacity:0}100%{opacity:0}}`,
    `.tl-shirt{animation:tl-shirt 10s linear infinite}@keyframes tl-shirt{0%,48%{opacity:0;filter:blur(8px)}62%,92%{opacity:1;filter:blur(0)}97%,100%{opacity:0;filter:blur(0)}}`,
    `.tl-score{transform-box:fill-box;transform-origin:left center;animation:tl-score 10s linear infinite}@keyframes tl-score{0%,68%{transform:scaleX(0)}76%,92%{transform:scaleX(var(--s))}97%,100%{transform:scaleX(0)}}`,
    `.tl-dim{animation:tl-dim 10s linear infinite}@keyframes tl-dim{0%,76%{opacity:1}80%,94%{opacity:.28}98%,100%{opacity:1}}`,
    win("tl-keep", 78, 94),
    `.tl-fade{animation:tl-fade 10s linear infinite}`,
  ].join("");

  const tiles = [
    { x: 476, y: 34, s: 0.84, extra: null },
    { x: 536, y: 34, s: 0.76, extra: "print" },
    { x: 476, y: 104, s: 0.9, extra: "stripe" },
    { x: 536, y: 104, s: 0.7, extra: null },
  ];
  const anim = (name: string, delay = 0): CSSProperties => ({ animation: `${name} 10s linear infinite`, animationDelay: `${delay}s`, opacity: 0 });

  return (
    <Stage label="German product copy is translated, expanded into an image prompt, rendered as four candidates by FLUX.1 with a LoRA, and CLIP picks the best one." css={css}>
      {/* column headers, the active one lights up */}
      {[
        { x: 20, t: "Translate · Helsinki-NLP", k: "tl-h1" },
        { x: 322, t: "Prompt · Phi-3 Mini", k: "tl-h2" },
        { x: 476, t: "Render · FLUX.1 + LoRA", k: "tl-h3" },
        { x: 650, t: "Score · CLIP", k: "tl-h4" },
      ].map((h) => (
        <g key={h.k}>
          <text x={h.x} y="20" className="vz-t">{h.t}</text>
          <text x={h.x} y="20" className="vz-t vz-tc" style={anim(h.k)}>{h.t}</text>
        </g>
      ))}

      {[
        ["Kurzarm-Shirt", "tl-a"],
        ["100% Baumwolle", "tl-b"],
        ["rot, Rundhals", "tl-c"],
      ].map(([t, k], i) => (
        <text key={t} x="22" y={66 + i * 20} className="vz-t vz-tb" style={{ ...anim(k), fontSize: 11.5 }}>{t}</text>
      ))}
      <rect x="20" y="36" width="22" height="12" className="vz-fb" />
      <text x="24" y="45" className="vz-t vz-tc">DE</text>
      <path d="M150,86 h22 m-6,-5 l6,5 l-6,5" className="vz-s" style={anim("tl-c")} />
      {[
        ["Short-sleeve shirt", "tl-d"],
        ["100% cotton", "tl-e"],
        ["red, crew neck", "tl-f"],
      ].map(([t, k], i) => (
        <text key={t} x="180" y={66 + i * 20} className="vz-t vz-tc" style={{ ...anim(k), fontSize: 11.5 }}>{t}</text>
      ))}
      <rect x="180" y="36" width="22" height="12" className="vz-fb" />
      <text x="184" y="45" className="vz-t vz-tc">EN</text>
      <path d="M296,86 h20 m-6,-5 l6,5 l-6,5" className="vz-s" style={anim("tl-e")} />

      <rect x="322" y="36" width="130" height="118" className="vz-fb" />
      {[96, 76, 104, 60, 88, 70].map((w, i) => (
        <rect key={i} x="332" y={48 + i * 17} width={w} height="6" className="vz-fillc tl-bar" style={{ animationDelay: `${i * 0.18}s` }} />
      ))}

      {tiles.map((t, i) => (
        <g key={i} className={i === 2 ? "" : "tl-dim"} transform={`translate(${t.x} ${t.y})`}>
          <rect width="56" height="56" className="vz-fb" />
          <g className="tl-noise" style={{ animationDelay: `${i * 0.2}s`, opacity: 0, filter: "blur(1.2px)" }}>
            {NOISE.map((n, j) => (
              <rect key={j} x={n.x + 3} y={n.y + 3} width={n.w} height={n.w} fill="rgb(143 179 184 / .8)" />
            ))}
          </g>
          <g className="tl-shirt" style={{ animationDelay: `${i * 0.2}s`, opacity: 0 }} transform={`translate(${28 - 28 * t.s} ${28 - 26 * t.s}) scale(${t.s})`}>
            <path d={SHIRT} transform="translate(0 4)" className="vz-shirt" />
            {t.extra === "print" && <circle cx="28" cy="30" r="5" fill="rgb(217 236 230 / .8)" />}
            {t.extra === "stripe" && <path d="M16,32 h24 M16,38 h24" stroke="rgb(217 236 230 / .65)" strokeWidth="2" />}
          </g>
        </g>
      ))}
      {[476, 536].flatMap((x, ci) =>
        [0, 1].map((ri) => {
          const idx = ri * 2 + ci;
          const sc = [0.62, 0.55, 0.92, 0.5][idx];
          return (
            <rect key={idx} x={x} y={ri === 0 ? 94 : 164} width="56" height="4" className="vz-fillc tl-score" style={{ ["--s" as string]: sc, animationDelay: `${idx * 0.1}s` }} />
          );
        }),
      )}
      <rect x="474" y="102" width="60" height="60" className="vz-s" strokeWidth="2.2" style={anim("tl-keep")} />
      <text x="476" y="176" className="vz-t vz-tc" style={anim("tl-keep")}>Best match</text>

      <rect x="650" y="34" width="150" height="120" className="vz-fb" />
      <g style={anim("tl-keep")} transform="translate(668 40)">
        <path d={SHIRT} transform="scale(2.4) translate(0 2)" className="vz-shirt" />
        <path d="M24,64 h72" stroke="rgb(217 236 230 / .65)" strokeWidth="2.4" transform="scale(1) translate(0 20)" />
      </g>
      <text x="725" y="172" textAnchor="middle" className="vz-t vz-tc" style={anim("tl-keep")}>Catalogue-ready</text>
    </Stage>
  );
}

/* ------------------------------------------------------------------ */
/* 4. Impact digital twin: one Opus call, a Zod gate, a profile         */
/* ------------------------------------------------------------------ */

const RADAR = { cx: 640, cy: 106, r: 52 };
const radarPt = (i: number, k: number) => {
  const a = ((-90 + i * 72) * Math.PI) / 180;
  return [RADAR.cx + RADAR.r * k * Math.cos(a), RADAR.cy + RADAR.r * k * Math.sin(a)] as const;
};
const ring = (k: number) => [0, 1, 2, 3, 4].map((i) => radarPt(i, k).join(",")).join(" ");
const PROFILE = [0.84, 0.6, 0.76, 0.52, 0.7].map((v, i) => radarPt(i, v).join(",")).join(" ");
const SDG_LIT = [3, 8, 9, 11, 13];
const AXES = ["What", "Who", "How much", "Contribution", "Risk"];

function ImpactViz() {
  const css = [
    `.im-pkt{opacity:0}`,
    `.im-p1{animation:im-p1 9s linear infinite}@keyframes im-p1{0%,8%{transform:translateX(0);opacity:0}10%{opacity:1}24%{transform:translateX(96px);opacity:1}26%,100%{transform:translateX(96px);opacity:0}}`,
    `.im-p2{animation:im-p2 9s linear infinite}@keyframes im-p2{0%,38%{transform:translateX(0);opacity:0}40%{opacity:1}50%{transform:translateX(62px);opacity:1}52%,100%{transform:translateX(62px);opacity:0}}`,
    `.im-p3{animation:im-p3 9s linear infinite}@keyframes im-p3{0%,56%{transform:translateX(0);opacity:0}58%{opacity:1}66%{transform:translateX(92px);opacity:1}68%,100%{transform:translateX(92px);opacity:0}}`,
    `.im-pulse{transform-box:fill-box;transform-origin:center;animation:im-pulse 9s ease-out infinite}@keyframes im-pulse{0%,25%{transform:scale(1);opacity:0}27%{opacity:.7}42%,100%{transform:scale(1.7);opacity:0}}`,
    `.im-check{stroke-dasharray:40;animation:im-check 9s linear infinite}@keyframes im-check{0%,52%{stroke-dashoffset:40;opacity:0}54%{opacity:1}60%,92%{stroke-dashoffset:0;opacity:1}96%,100%{stroke-dashoffset:0;opacity:0}}`,
    `.im-radar{transform-origin:${RADAR.cx}px ${RADAR.cy}px;animation:im-radar 9s cubic-bezier(.16,1,.3,1) infinite}@keyframes im-radar{0%,64%{transform:scale(.04);opacity:0}66%{opacity:1}76%,92%{transform:scale(1);opacity:1}97%,100%{transform:scale(1);opacity:0}}`,
    ...[0, 1, 2, 3, 4].map((i) => win(`im-l${i}`, 4 + i * 4, 40)),
    ...SDG_LIT.map((n, j) => `.im-t${n}{animation:im-t${n} 9s linear infinite}${win(`im-t${n}`, 70 + j * 4, 94, 2)}`),
  ].join("");

  return (
    <Stage label="A startup profile goes to one Claude Opus call, passes a Zod schema check, and returns a multi-dimensional impact profile scored against IMP, IRIS+ and UN SDG targets." css={css}>
      <text x="20" y="24" className="vz-t">Startup profile</text>
      <rect x="20" y="34" width="150" height="118" className="vz-fb" />
      <circle cx="38" cy="52" r="7" className="vz-f" />
      <rect x="52" y="48" width="70" height="6" className="vz-fillm" />
      {[120, 100, 128, 84, 108].map((w, i) => (
        <g key={i}>
          <rect x="32" y={72 + i * 14} width={w} height="5" className="vz-fillm" opacity="0.5" />
          <rect x="32" y={72 + i * 14} width={w} height="5" className="vz-fillc" style={{ animation: `im-l${i} 9s linear infinite`, opacity: 0 }} />
        </g>
      ))}

      <path d="M172,93 L268,93" className="vz-sd" />
      <g transform="translate(170 93)">
        <rect x="-3" y="-3" width="6" height="6" className="vz-fillc im-pkt im-p1" />
      </g>

      <text x="300" y="46" textAnchor="middle" className="vz-t">Claude Opus</text>
      <circle cx="300" cy="93" r="32" className="vz-fb" />
      <circle cx="300" cy="93" r="32" className="vz-s im-pulse" />
      <text x="300" y="99" textAnchor="middle" className="vz-big vz-tb" style={{ fontSize: 17 }}>Opus</text>
      <text x="300" y="146" textAnchor="middle" className="vz-t vz-tc">1 call</text>

      <path d="M334,93 L394,93" className="vz-sd" />
      <g transform="translate(334 93)">
        <rect x="-3" y="-3" width="6" height="6" className="vz-fillc im-pkt im-p2" />
      </g>
      <text x="420" y="56" textAnchor="middle" className="vz-t">Zod</text>
      <path d="M420,66 L446,76 L446,104 C446,120 432,128 420,134 C408,128 394,120 394,104 L394,76 Z" className="vz-fb" />
      <path d="M408,100 l8,8 l15,-17" className="vz-s im-check" strokeWidth="2.6" />
      <text x="420" y="150" textAnchor="middle" className="vz-t vz-tc">Schema OK</text>

      <path d="M448,93 L540,93" className="vz-sd" />
      <g transform="translate(448 93)">
        <rect x="-3" y="-3" width="6" height="6" className="vz-fillc im-pkt im-p3" />
      </g>

      <text x={RADAR.cx} y="16" textAnchor="middle" className="vz-t">IMP profile</text>
      {[0.33, 0.66, 1].map((k) => (
        <polygon key={k} points={ring(k)} className="vz-sd" />
      ))}
      {[0, 1, 2, 3, 4].map((i) => {
        const [x, y] = radarPt(i, 1);
        const [lx, ly] = radarPt(i, 1.2);
        const anchor = Math.abs(lx - RADAR.cx) < 6 ? "middle" : lx > RADAR.cx ? "start" : "end";
        return (
          <g key={i}>
            <line x1={RADAR.cx} y1={RADAR.cy} x2={x} y2={y} className="vz-sd" />
            <text x={lx} y={ly + 3} textAnchor={anchor} className="vz-t" style={{ fontSize: 9 }}>{AXES[i]}</text>
          </g>
        );
      })}
      <g className="im-radar" style={{ opacity: 0 }}>
        <polygon points={PROFILE} className="vz-f" />
        {[0, 1, 2, 3, 4].map((i) => {
          const [x, y] = radarPt(i, [0.84, 0.6, 0.76, 0.52, 0.7][i]);
          return <circle key={i} cx={x} cy={y} r="3" className="vz-fillb" />;
        })}
      </g>

      <text x="742" y="24" className="vz-t" style={{ fontSize: 10 }}>UN SDG · IRIS+</text>
      {Array.from({ length: 17 }, (_, n) => {
        const x = 742 + (n % 4) * 24;
        const y = 36 + Math.floor(n / 4) * 24;
        const lit = SDG_LIT.includes(n + 1);
        return (
          <g key={n}>
            <rect x={x} y={y} width="20" height="20" className="vz-fb" />
            <text x={x + 10} y={y + 14} textAnchor="middle" className="vz-t" style={{ fontSize: 8.5 }}>{n + 1}</text>
            {lit && <rect x={x} y={y} width="20" height="20" className={`vz-fillc im-t${n + 1}`} style={{ opacity: 0 }} />}
          </g>
        );
      })}
    </Stage>
  );
}

/* ------------------------------------------------------------------ */
/* 5. Fetal health classification: CTG, SMOTE on train only, metrics     */
/* ------------------------------------------------------------------ */

const CTG_P = 230;
const ctgPath = (fn: (x: number) => number) => {
  let d = "";
  for (let x = 0; x <= CTG_P * 2; x += 3) d += `${x === 0 ? "M" : "L"}${x},${fn(x % CTG_P).toFixed(1)}`;
  return d;
};
const TAU = Math.PI * 2;
const FHR = ctgPath((x) => 62 + 6 * Math.sin((TAU * 9 * x) / CTG_P) + 3 * Math.sin((TAU * 23 * x) / CTG_P) - 20 * Math.exp(-(((x - 120) / 14) ** 2)) + 12 * Math.exp(-(((x - 190) / 10) ** 2)));
const UC = ctgPath((x) => 112 - 18 * Math.exp(-(((x - 70) / 16) ** 2)) - 18 * Math.exp(-(((x - 175) / 16) ** 2)));

function HeartbeatViz() {
  const css = [
    `.hb-scroll{animation:hb-scroll 5s linear infinite}@keyframes hb-scroll{to{transform:translateX(-${CTG_P}px)}}`,
    `.hb-grow{transform-box:fill-box;transform-origin:left center;animation:hb-grow 8s linear infinite}@keyframes hb-grow{0%,18%{transform:scaleX(0)}34%,86%{transform:scaleX(1)}92%,100%{transform:scaleX(0)}}`,
    `.hb-dot{animation:hb-dot 8s linear infinite}${win("hb-dot", 20, 86, 4)}`,
    ...[0, 1, 2].map((i) => `.hb-m${i}{transform-box:fill-box;transform-origin:left center;animation:hb-m${i} 8s linear infinite}@keyframes hb-m${i}{0%,${6 + i * 20}%{transform:scaleX(0)}${24 + i * 20}%,88%{transform:scaleX(1)}94%,100%{transform:scaleX(0)}}`),
    `.hb-gauge{animation:hb-gauge 8s ease-out infinite}@keyframes hb-gauge{0%,64%{stroke-dashoffset:163.4;opacity:0}66%{opacity:1}80%,92%{stroke-dashoffset:8.8;opacity:1}97%,100%{stroke-dashoffset:8.8;opacity:0}}`,
    win("hb-val", 70, 94),
    ...[0, 1, 2].map((i) => win(`hb-o${i}`, 4 + i * 30, 30 + i * 30, 3)),
  ].join("");

  return (
    <Stage label="A cardiotocography trace feeds a training set balanced with SMOTE while the test set stays untouched. Three models are compared and the best reaches 94.6 percent accuracy." css={css}>
      <text x="20" y="22" className="vz-t">CTG · fetal heart rate and contractions</text>
      <defs>
        <clipPath id="hb-clip">
          <rect x="22" y="32" width="226" height="118" />
        </clipPath>
        <pattern id="hb-grid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M20,0 H0 V20" fill="none" stroke="rgb(56 200 216 / .12)" strokeWidth="1" />
        </pattern>
      </defs>
      <rect x="20" y="30" width="230" height="122" className="vz-fb" />
      <rect x="22" y="32" width="226" height="118" fill="url(#hb-grid)" />
      <g clipPath="url(#hb-clip)">
        <g transform="translate(22 32)">
          <g className="hb-scroll">
            <path d={FHR} className="vz-s" strokeWidth="1.6" />
            <path d={UC} className="vz-s" strokeWidth="1.2" opacity="0.7" />
          </g>
        </g>
      </g>
      <text x="26" y="46" className="vz-t vz-tc" style={{ fontSize: 9 }}>FHR</text>
      <text x="26" y="126" className="vz-t" style={{ fontSize: 9 }}>UC</text>

      <path d="M252,93 L278,93 m-6,-5 l6,5 l-6,5" className="vz-s" />

      <rect x="282" y="30" width="240" height="68" className="vz-fb" />
      <text x="290" y="44" className="vz-t vz-tc">Train</text>
      {[
        ["Normal", 52, 150, 0],
        ["Suspect", 66, 36, 70],
        ["Pathol.", 80, 24, 84],
      ].map(([n, y, w, extra]) => (
        <g key={n as string}>
          <text x="290" y={(y as number) + 7} className="vz-t" style={{ fontSize: 9 }}>{n as string}</text>
          <rect x="346" y={y as number} width={w as number} height="8" className="vz-fillc" opacity="0.75" />
          {(extra as number) > 0 && (
            <rect x={346 + (w as number)} y={y as number} width={extra as number} height="8" className="vz-s hb-grow" strokeDasharray="3 2" style={{ fill: "rgb(56 200 216 / .22)" }} />
          )}
        </g>
      ))}
      <text x="480" y="44" textAnchor="end" className="vz-t vz-tc hb-dot" style={{ opacity: 0 }}>+ SMOTE</text>

      <rect x="282" y="108" width="240" height="44" className="vz-fb" />
      <text x="290" y="122" className="vz-t">Test</text>
      {[
        [116, 100],
        [126, 24],
        [136, 16],
      ].map(([y, w]) => (
        <rect key={y} x="346" y={y} width={w} height="5" className="vz-fillm" opacity="0.7" />
      ))}
      <g transform="translate(496 114)">
        <rect x="0" y="6" width="14" height="11" className="vz-fb" />
        <path d="M3,6 v-3 a4,4 0 0 1 8,0 v3" className="vz-s" />
      </g>
      <text x="290" y="144" className="vz-t vz-tc">Untouched</text>
      <path d="M284,103 H520" className="vz-sd" strokeDasharray="4 4" />

      <path d="M524,93 L550,93 m-6,-5 l6,5 l-6,5" className="vz-s" />

      {["Logistic regression", "Random forest", "SVM"].map((m, i) => (
        <g key={m}>
          <rect x="556" y={36 + i * 34} width="128" height="24" className="vz-fb" />
          <text x="564" y={52 + i * 34} className="vz-t vz-tb" style={{ fontSize: 9 }}>{m}</text>
          <rect x="690" y={46 + i * 34} width="52" height="5" className="vz-sd" />
          <rect x="690" y={46 + i * 34} width="52" height="5" className={`vz-fillc hb-m${i}`} />
        </g>
      ))}
      <circle cx="782" cy="82" r="26" className="vz-sd" />
      <circle cx="782" cy="82" r="26" className="vz-s hb-gauge" strokeDasharray="163.4" transform="rotate(-90 782 82)" strokeWidth="3.2" />
      <text x="782" y="87" textAnchor="middle" className="vz-t vz-tc hb-val" style={{ fontSize: 13, fontWeight: 700, opacity: 0 }}>94.6%</text>
      <text x="782" y="124" textAnchor="middle" className="vz-t hb-val" style={{ opacity: 0 }}>Accuracy</text>
      <text x="782" y="138" textAnchor="middle" className="vz-t vz-tc hb-val" style={{ opacity: 0 }}>F1 94.4%</text>
      {["Normal", "Suspect", "Pathological"].map((c, i) => (
        <g key={c}>
          <rect x={556 + i * 82} y="162" width="76" height="18" className="vz-fb" />
          <rect x={556 + i * 82} y="162" width="76" height="18" className="vz-fillc" style={{ animation: `hb-o${i} 8s linear infinite`, opacity: 0 }} />
          <text x={594 + i * 82} y="174" textAnchor="middle" className="vz-t vz-tb" style={{ fontSize: 9 }}>{c}</text>
        </g>
      ))}
    </Stage>
  );
}

/* ------------------------------------------------------------------ */
/* 6. Cost-aware demand forecasting: expanding backtest, cost bars      */
/* ------------------------------------------------------------------ */

const demand = (x: number) => 96 + 20 * Math.sin((x - 20) / 36) + 8 * Math.sin((x - 20) / 10.5) - (x - 20) * 0.03;
const seasonal = (x: number) => 20 * Math.sin((x - 20) / 36);
const line = (fn: (x: number) => number, from: number, to: number, step = 4) => {
  let d = "";
  for (let x = from; x <= to; x += step) d += `${x === from ? "M" : "L"}${x},${fn(x).toFixed(1)}`;
  return d;
};
const ORIGINS = [230, 320, 410];
const forecasts = (o: number) => {
  const base = demand(o);
  const slope = (demand(o) - demand(o - 30)) / 30;
  return {
    arima: line((x) => base + slope * 0.4 * (x - o) + 0.55 * (seasonal(x) - seasonal(o)), o, o + 110),
    sarima: line((x) => base + slope * 0.4 * (x - o) + 1.5 * (seasonal(x) - seasonal(o)) + 4 * Math.sin((x - o) / 7), o, o + 110),
    prophet: line((x) => base + slope * 0.4 * (x - o) + 0.9 * (seasonal(x) - seasonal(o)) - 6 * Math.sin((x - o) / 19), o, o + 110),
  };
};

function StockpileViz() {
  const css = [
    ...ORIGINS.map((_, i) => `.sp-s${i}{animation:sp-s${i} 9s linear infinite}${win(`sp-s${i}`, i * 30, i * 30 + 28, 2)}`),
    `.sp-bar{transform-box:fill-box;transform-origin:center bottom;animation:sp-bar 9s cubic-bezier(.16,1,.3,1) infinite}@keyframes sp-bar{0%,64%{transform:scaleY(0)}78%,92%{transform:scaleY(1)}97%,100%{transform:scaleY(0)}}`,
    win("sp-tag", 80, 94),
  ].join("");

  return (
    <Stage label="ARIMA, SARIMA and Prophet forecasts are backtested on an expanding window. Plain ARIMA ends with the lowest total inventory cost in both categories." css={css}>
      <defs>
        {ORIGINS.map((o, i) => (
          <clipPath key={o} id={`sp-clip-${i}`}>
            <rect x="20" y="20" width={o - 20} height="140" />
          </clipPath>
        ))}
      </defs>
      <path d="M20,22 V150 H560" className="vz-sd" />
      <path d={line(demand, 20, 540)} className="vz-sd" strokeDasharray="2 4" />
      {[
        ["ARIMA", "vz-s", 0],
        ["SARIMA", "vz-sb", 80],
        ["Prophet", "vz-sm", 170],
      ].map(([n, c, dx]) => (
        <g key={n as string}>
          <path d={`M${30 + (dx as number)},14 h18`} className={c as string} strokeDasharray={c === "vz-s" ? undefined : "4 3"} />
          <text x={54 + (dx as number)} y="17" className="vz-t" style={{ fontSize: 9 }}>{n as string}</text>
        </g>
      ))}
      <text x="560" y="17" textAnchor="end" className="vz-t vz-tc">Expanding window</text>

      {ORIGINS.map((o, i) => {
        const f = forecasts(o);
        return (
          <g key={o} className={`sp-s${i}`} style={{ opacity: 0 }}>
            <rect x="20" y="24" width={o - 20} height="126" className="vz-fillc" opacity="0.07" />
            <path d={line(demand, 20, o)} className="vz-s" clipPath={`url(#sp-clip-${i})`} strokeWidth="1.8" />
            <line x1={o} y1="24" x2={o} y2="150" className="vz-sd" strokeDasharray="3 3" />
            <path d={f.prophet} className="vz-sm" strokeDasharray="4 3" />
            <path d={f.sarima} className="vz-sb" strokeDasharray="4 3" />
            <path d={f.arima} className="vz-s" strokeWidth="2.2" />
            <text x={o - 6} y="36" textAnchor="end" className="vz-t" style={{ fontSize: 9 }}>Train</text>
            <text x={o + 6} y="36" className="vz-t vz-tc" style={{ fontSize: 9 }}>Forecast</text>
          </g>
        );
      })}

      <text x="600" y="17" className="vz-t">Total inventory cost</text>
      <path d="M596,150 H820" className="vz-sd" />
      {[
        { x: 620, h: 60, c: "vz-fillc", n: "ARIMA" },
        { x: 690, h: 104, c: "vz-fillb", n: "SARIMA" },
        { x: 760, h: 104, c: "vz-fillm", n: "Prophet" },
      ].map((b, i) => (
        <g key={b.n}>
          <rect x={b.x} y={150 - b.h} width="46" height={b.h} className={`${b.c} sp-bar`} style={{ animationDelay: `${i * 0.12}s`, opacity: i === 0 ? 0.95 : 0.55 }} />
          <text x={b.x + 23} y="164" textAnchor="middle" className="vz-t" style={{ fontSize: 9 }}>{b.n}</text>
        </g>
      ))}
      <g className="sp-tag" style={{ animation: "sp-tag 9s linear infinite", opacity: 0 }}>
        <text x="643" y="82" textAnchor="middle" className="vz-t vz-tc">Lowest</text>
      </g>
      <text x="620" y="180" className="vz-t vz-tc" style={{ animation: "sp-tag 9s linear infinite", opacity: 0 }}>Won both categories</text>
    </Stage>
  );
}

export default function Viz({ slug }: { slug: string }) {
  switch (slug) {
    case "lineguard":
      return <LineGuardViz />;
    case "nano-sentry":
      return <NanoSentryViz />;
    case "threadline":
      return <ThreadlineViz />;
    case "impact-twin":
      return <ImpactViz />;
    case "heartbeat":
      return <HeartbeatViz />;
    case "stockpile":
      return <StockpileViz />;
    default:
      return null;
  }
}
