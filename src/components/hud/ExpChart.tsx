"use client";

import { forwardRef, useImperativeHandle, useMemo, useRef } from "react";
import { experience } from "@/content";

// A ticker-style career chart. The line is cumulative months of work, drawn from the
// newest role back to the oldest as the rail moves, so the point under the tip always
// belongs to the card in view. The rail calls set(p) every frame, where p is the
// rail position in cards (0 = profile, 1 = newest role, 2 = the one before, ...).

export type ExpChartHandle = { set: (p: number) => void };

const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const monthIdx = (s: string) => {
  const [m, y] = s.split(" ");
  return Number(y) * 12 + MON.indexOf(m);
};

const W = 520;
const H = 140;
const X0 = 34;
const X1 = 462;
const YT = 46;
const YB = 112;

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));

const ExpChart = forwardRef<ExpChartHandle>(function ExpChart(_, ref) {
  const model = useMemo(() => {
    const roles = experience; // newest first
    const lo = Math.min(...roles.map((r) => monthIdx(r.start)));
    const hi = Math.max(...roles.map((r) => monthIdx(r.end))) + 1;
    const dur = roles.map((r) => monthIdx(r.end) - monthIdx(r.start) + 1);
    const total = dur.reduce((a, b) => a + b, 0);
    const yMax = Math.ceil((total + 1) / 12) * 12;
    const X = (m: number) => X0 + ((m - lo) / (hi - lo)) * (X1 - X0);
    const Y = (v: number) => YB - (v / yMax) * (YB - YT);

    // Points newest -> oldest, each with the rail position (p) at which the tip reaches it.
    const pts: { x: number; y: number; v: number; p: number }[] = [];
    let cum = total;
    roles.forEach((r, i) => {
      const end = { x: X(monthIdx(r.end) + 1), v: cum };
      const start = { x: X(monthIdx(r.start)), v: cum - dur[i] };
      pts.push({ ...end, y: Y(end.v), p: i === 0 ? 0 : i + 0.4 });
      pts.push({ ...start, y: Y(start.v), p: i + 1 });
      cum -= dur[i];
    });
    const cumLen: number[] = [0];
    for (let i = 1; i < pts.length; i++) cumLen.push(cumLen[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
    const L = cumLen[cumLen.length - 1];

    const line = pts.map((q, i) => `${i ? "L" : "M"}${q.x.toFixed(1)},${q.y.toFixed(1)}`).join(" ");
    const area = `${line} L${pts[pts.length - 1].x.toFixed(1)},${YB} L${pts[0].x.toFixed(1)},${YB} Z`;

    const years: { x: number; label: string }[] = [{ x: X(lo), label: String(Math.floor(lo / 12)) }];
    for (let y = Math.floor(lo / 12) + 1; y * 12 < hi; y++) years.push({ x: X(y * 12), label: String(y) });
    const ticks = [];
    for (let v = 0; v <= yMax; v += 12) ticks.push({ v, y: Y(v) });

    const reads = [
      { a: "Career so far", b: `${roles[roles.length - 1].start} to ${roles[0].end} · ${total} months` },
      ...roles.map((r) => ({ a: r.short, b: `${r.start} to ${r.end} · ${r.duration}` })),
    ];
    return { pts, cumLen, L, line, area, years, ticks, reads, total };
  }, []);

  const lineRef = useRef<SVGPathElement>(null);
  const clipRef = useRef<SVGRectElement>(null);
  const tipRef = useRef<SVGGElement>(null);
  const tipText = useRef<SVGTextElement>(null);
  const guide = useRef<SVGLineElement>(null);
  const dots = useRef<(SVGCircleElement | null)[]>([]);
  const reads = useRef<(SVGGElement | null)[]>([]);

  useImperativeHandle(ref, () => ({
    set(p: number) {
      const { pts, cumLen, L } = model;
      const pc = clamp(p, 0, pts[pts.length - 1].p);
      let i = 0;
      while (i < pts.length - 2 && pc > pts[i + 1].p) i++;
      const t = clamp((pc - pts[i].p) / (pts[i + 1].p - pts[i].p));
      const x = pts[i].x + (pts[i + 1].x - pts[i].x) * t;
      const y = pts[i].y + (pts[i + 1].y - pts[i].y) * t;
      const v = pts[i].v + (pts[i + 1].v - pts[i].v) * t;
      const drawn = cumLen[i] + (cumLen[i + 1] - cumLen[i]) * t;

      const open = p > 0.02;
      lineRef.current?.setAttribute("stroke-dashoffset", String(L - drawn));
      clipRef.current?.setAttribute("x", x.toFixed(1));
      clipRef.current?.setAttribute("width", String(Math.max(0, W - x)));
      if (tipRef.current) {
        tipRef.current.setAttribute("transform", `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
        tipRef.current.style.opacity = open ? "1" : "0.0";
      }
      if (tipText.current) {
        tipText.current.textContent = `${Math.round(v)} mo`;
        const nearLeft = x < X0 + 40; // keep the label inside the plot at the far end
        tipText.current.setAttribute("x", nearLeft ? "10" : "-10");
        tipText.current.setAttribute("text-anchor", nearLeft ? "start" : "end");
      }
      if (guide.current) {
        guide.current.setAttribute("x1", x.toFixed(1));
        guide.current.setAttribute("x2", x.toFixed(1));
        guide.current.setAttribute("y1", y.toFixed(1));
      }
      dots.current.forEach((d, k) => {
        if (!d) return;
        const reached = k === 0 ? clamp(p * 3) : clamp((drawn - cumLen[k]) / 6 + 1);
        d.style.opacity = String(reached);
      });
      reads.current.forEach((g, k) => {
        if (g) g.style.opacity = String(clamp(1 - Math.abs(p - k) * 2.2));
      });
    },
  }));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMinYMid meet" className="h-full w-full" role="img" aria-label={`Months of work over time, from ${model.reads[0].b}`}>
      <defs>
        <linearGradient id="exp-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--color-cyan)" stopOpacity="0.32" />
          <stop offset="1" stopColor="var(--color-cyan)" stopOpacity="0" />
        </linearGradient>
        <clipPath id="exp-clip">
          <rect ref={clipRef} x={W} y="0" width="0" height={H} />
        </clipPath>
      </defs>

      {model.ticks.map((t) => (
        <g key={t.v}>
          <line x1={X0} x2={X1 + 10} y1={t.y} y2={t.y} stroke="rgb(143 179 184 / 0.22)" strokeDasharray={t.v ? "2 4" : undefined} />
          <text x={X0 - 8} y={t.y + 3} textAnchor="end" className="exp-t">{t.v}</text>
        </g>
      ))}
      {model.years.map((yr) => (
        <g key={yr.label}>
          <line x1={yr.x} x2={yr.x} y1={YB} y2={YB + 4} stroke="rgb(143 179 184 / 0.5)" />
          <text x={yr.x} y={YB + 16} textAnchor="middle" className="exp-t">{yr.label}</text>
        </g>
      ))}

      <path d={model.area} fill="url(#exp-fill)" clipPath="url(#exp-clip)" />
      <path
        ref={lineRef}
        d={model.line}
        fill="none"
        stroke="var(--color-cyan)"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
        strokeDasharray={model.L}
        strokeDashoffset={model.L}
        style={{ filter: "drop-shadow(0 0 5px rgb(56 200 216 / .6))" }}
      />
      {model.pts.map((q, k) => (
        <circle key={k} ref={(el) => void (dots.current[k] = el)} cx={q.x} cy={q.y} r="3" fill="var(--color-ink)" stroke="var(--color-bone)" strokeWidth="1.4" style={{ opacity: 0 }} />
      ))}

      <line ref={guide} x1={X1} x2={X1} y1={YT} y2={YB} stroke="rgb(56 200 216 / 0.5)" strokeDasharray="2 3" />
      <g ref={tipRef} style={{ opacity: 0 }}>
        <circle r="9" fill="rgb(56 200 216 / 0.18)" className="exp-pulse" />
        <circle r="4.5" fill="var(--color-cyan)" />
        <text ref={tipText} x="-10" y="-9" textAnchor="end" className="exp-t exp-tip">0 mo</text>
      </g>

      {model.reads.map((r, k) => (
        <g key={k} ref={(el) => void (reads.current[k] = el)} style={{ opacity: k === 0 ? 1 : 0 }}>
          <text x={X0} y="16" className="exp-t exp-head">{r.a}</text>
          <text x={X0} y="31" className="exp-t exp-sub">{r.b}</text>
        </g>
      ))}
      <text x={W - 6} y="16" textAnchor="end" className="exp-t">Months worked</text>
    </svg>
  );
});

export default ExpChart;
