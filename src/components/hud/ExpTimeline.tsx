"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { experience, profile } from "@/content";
import { useHud } from "@/lib/hud-store";

// The Experience section: a ticker-style career line with the experience written along
// it, no cards. The line is cumulative months of work, drawn newest to oldest as the
// rail moves. The tip travels with the rail and each role's text hangs from the point
// the tip reaches, building up as it arrives and clearing as it moves on.
// The rail only drives this: it calls set(p) every frame, where p is the rail position
// in cards (0 = profile, 1 = newest role, 2 = the one before, ...).

export type ExpTimelineHandle = { set: (p: number) => void };

const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const monthIdx = (s: string) => {
  const [m, y] = s.split(" ");
  return Number(y) * 12 + MON.indexOf(m);
};
const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));

type Pt = { x: number; y: number; v: number; p: number };

function useSize(ref: React.RefObject<HTMLDivElement | null>) {
  const [size, setSize] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const read = () => setSize({ w: Math.round(el.clientWidth), h: Math.round(el.clientHeight) });
    read();
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return size;
}

const ExpTimeline = forwardRef<ExpTimelineHandle>(function ExpTimeline(_, ref) {
  const box = useRef<HTMLDivElement>(null);
  const { w, h } = useSize(box);

  const model = useMemo(() => {
    if (!w || !h) return null;
    const roles = experience; // newest first
    const lo = Math.min(...roles.map((r) => monthIdx(r.start)));
    const hi = Math.max(...roles.map((r) => monthIdx(r.end))) + 1;
    const dur = roles.map((r) => monthIdx(r.end) - monthIdx(r.start) + 1);
    const total = dur.reduce((a, b) => a + b, 0);
    const yMax = Math.ceil((total + 1) / 12) * 12;

    // The chart sits to the right of the heading; the text hangs below it.
    const fs = Math.min(78, Math.max(44, window.innerWidth * 0.05));
    const X0 = Math.min(w * 0.5, fs * 4.9 + 48);
    const X1 = w - 74;
    const YT = 30;
    const YB = Math.min(190, h * (h < 520 ? 0.28 : 0.34));
    const X = (m: number) => X0 + ((m - lo) / (hi - lo)) * (X1 - X0);
    const Y = (v: number) => YB - (v / yMax) * (YB - YT);

    const pts: Pt[] = [];
    let cum = total;
    roles.forEach((r, i) => {
      pts.push({ x: X(monthIdx(r.end) + 1), v: cum, y: Y(cum), p: i === 0 ? 0 : i + 0.4 });
      pts.push({ x: X(monthIdx(r.start)), v: cum - dur[i], y: Y(cum - dur[i]), p: i + 1 });
      cum -= dur[i];
    });
    const cumLen: number[] = [0];
    for (let i = 1; i < pts.length; i++) cumLen.push(cumLen[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
    const L = cumLen[cumLen.length - 1];

    const line = pts.map((q, i) => `${i ? "L" : "M"}${q.x.toFixed(1)},${q.y.toFixed(1)}`).join(" ");
    const area = `${line} L${pts[pts.length - 1].x.toFixed(1)},${YB} L${pts[0].x.toFixed(1)},${YB} Z`;
    const years: { x: number; label: string }[] = [{ x: X(lo), label: String(Math.floor(lo / 12)) }];
    for (let y = Math.floor(lo / 12) + 1; y * 12 < hi; y++) years.push({ x: X(y * 12), label: String(y) });
    const ticks: { v: number; y: number }[] = [];
    for (let v = 0; v <= yMax; v += 12) ticks.push({ v, y: Y(v) });

    // Each text block hangs from the point the tip is at when its card is in view.
    const blockTop = YB + (h < 520 ? 38 : 44);
    const anchors = [pts[0], ...roles.map((_, i) => pts[2 * i + 1])];
    const blocks = anchors.map((a) => {
      const right = w - a.x - 6;
      const left = a.x - 6;
      const flagRight = right >= left * 0.6 || right >= 520;
      const room = flagRight ? right : left;
      const width = Math.min(520, Math.max(300, room));
      return { x: a.x, y: a.y, flagRight, width, left: flagRight ? a.x : a.x - width };
    });
    return { pts, cumLen, L, line, area, years, ticks, X0, X1, YT, YB, blockTop, blocks, total, first: roles[roles.length - 1].start, last: roles[0].end };
  }, [w, h]);

  const modelRef = useRef(model);
  modelRef.current = model;
  const pRef = useRef(0);

  const lineRef = useRef<SVGPathElement>(null);
  const clipRef = useRef<SVGRectElement>(null);
  const tipRef = useRef<SVGGElement>(null);
  const tipText = useRef<SVGTextElement>(null);
  const guide = useRef<SVGLineElement>(null);
  const dots = useRef<(SVGCircleElement | null)[]>([]);
  const poles = useRef<(SVGLineElement | null)[]>([]);
  const blocks = useRef<(HTMLDivElement | null)[]>([]);

  const apply = useCallback((p: number) => {
    const m = modelRef.current;
    if (!m) return;
    const { pts, cumLen, L, YB } = m;
    const pc = clamp(p, 0, pts[pts.length - 1].p);
    let i = 0;
    while (i < pts.length - 2 && pc > pts[i + 1].p) i++;
    const t = clamp((pc - pts[i].p) / (pts[i + 1].p - pts[i].p));
    const x = pts[i].x + (pts[i + 1].x - pts[i].x) * t;
    const y = pts[i].y + (pts[i + 1].y - pts[i].y) * t;
    const v = pts[i].v + (pts[i + 1].v - pts[i].v) * t;
    const drawn = cumLen[i] + (cumLen[i + 1] - cumLen[i]) * t;

    lineRef.current?.setAttribute("stroke-dashoffset", String(L - drawn));
    clipRef.current?.setAttribute("x", x.toFixed(1));
    clipRef.current?.setAttribute("width", String(Math.max(0, 4000 - x)));
    if (tipRef.current) {
      tipRef.current.setAttribute("transform", `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
      tipRef.current.style.opacity = p > 0.02 ? "1" : "0";
    }
    if (tipText.current) {
      tipText.current.textContent = `${Math.round(v)} mo`;
      const nearLeft = x < m.X0 + 40;
      tipText.current.setAttribute("x", nearLeft ? "10" : "-10");
      tipText.current.setAttribute("text-anchor", nearLeft ? "start" : "end");
    }
    if (guide.current) {
      guide.current.setAttribute("x1", x.toFixed(1));
      guide.current.setAttribute("x2", x.toFixed(1));
      guide.current.setAttribute("y1", y.toFixed(1));
      guide.current.setAttribute("y2", String(YB));
    }
    dots.current.forEach((d, k) => {
      if (d) d.style.opacity = k === 0 ? "1" : String(clamp((drawn - cumLen[k]) / 6 + 1));
    });

    blocks.current.forEach((el, k) => {
      if (!el) return;
      const a = clamp(1 - Math.abs(p - k) * 1.8);
      el.style.visibility = a > 0.02 ? "visible" : "hidden";
      el.style.borderColor = `rgb(56 200 216 / ${(0.55 * a).toFixed(3)})`;
      el.querySelectorAll<HTMLElement>("[data-i]").forEach((c) => {
        const o = clamp(a * 2.1 - Number(c.dataset.i) * 0.2);
        c.style.opacity = o.toFixed(3);
        c.style.transform = `translateY(${((1 - o) * 14).toFixed(1)}px)`;
      });
      const pole = poles.current[k];
      if (pole) pole.style.opacity = a.toFixed(3);
    });
  }, []);

  useImperativeHandle(ref, () => ({
    set(p: number) {
      pRef.current = p;
      apply(p);
    },
  }), [apply]);

  // A resize rebuilds the geometry; put the line back where the rail is.
  useEffect(() => {
    apply(pRef.current);
  }, [model, apply]);

  const openDetail = (id: string) => useHud.getState().setDetail(id);

  return (
    <div ref={box} className="pointer-events-none absolute inset-0">
      {model && (
        <>
          <svg width={w} height={h} className="absolute inset-0" role="img" aria-label={`Months of work over time, ${model.first} to ${model.last}, ${model.total} months in total`}>
            <defs>
              <linearGradient id="exp-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="var(--color-cyan)" stopOpacity="0.32" />
                <stop offset="1" stopColor="var(--color-cyan)" stopOpacity="0" />
              </linearGradient>
              <clipPath id="exp-clip">
                <rect ref={clipRef} x={w} y="0" width="0" height={h} />
              </clipPath>
            </defs>

            {model.ticks.map((t) => (
              <g key={t.v}>
                <line x1={model.X0} x2={model.X1 + 12} y1={t.y} y2={t.y} stroke="rgb(143 179 184 / 0.22)" strokeDasharray={t.v ? "2 4" : undefined} />
                <text x={model.X0 - 8} y={t.y + 3} textAnchor="end" className="exp-t">{t.v}</text>
              </g>
            ))}
            {model.years.map((yr) => (
              <g key={yr.label}>
                <line x1={yr.x} x2={yr.x} y1={model.YB} y2={model.YB + 4} stroke="rgb(143 179 184 / 0.5)" />
                <text x={yr.x} y={model.YB + 17} textAnchor="middle" className="exp-t">{yr.label}</text>
              </g>
            ))}
            <text x={model.X1 + 12} y="12" textAnchor="end" className="exp-t">Months worked</text>

            <path d={model.area} fill="url(#exp-fill)" clipPath="url(#exp-clip)" />
            <path
              ref={lineRef}
              d={model.line}
              fill="none"
              stroke="var(--color-cyan)"
              strokeWidth="2.2"
              strokeLinejoin="round"
              strokeLinecap="round"
              strokeDasharray={model.L}
              strokeDashoffset={model.L}
              style={{ filter: "drop-shadow(0 0 5px rgb(56 200 216 / .6))" }}
            />
            {model.pts.map((q, k) => (
              <circle key={k} ref={(el) => void (dots.current[k] = el)} cx={q.x} cy={q.y} r="3.2" fill="var(--color-ink)" stroke="var(--color-bone)" strokeWidth="1.4" style={{ opacity: 0 }} />
            ))}

            {model.blocks.map((b, k) => (
              <line key={k} ref={(el) => void (poles.current[k] = el)} x1={b.x} x2={b.x} y1={b.y + 6} y2={model.blockTop} stroke="rgb(56 200 216 / 0.55)" strokeDasharray="2 3" style={{ opacity: 0 }} />
            ))}
            <line ref={guide} x1={model.X1} x2={model.X1} y1={model.YT} y2={model.YB} stroke="rgb(56 200 216 / 0.45)" strokeDasharray="2 3" />
            <g ref={tipRef} style={{ opacity: 0 }}>
              <circle r="9" fill="rgb(56 200 216 / 0.18)" className="exp-pulse" />
              <circle r="4.5" fill="var(--color-cyan)" />
              <text ref={tipText} x="-10" y="-11" textAnchor="end" className="exp-t exp-tip">0 mo</text>
            </g>
          </svg>

          {/* Profile, then each role, hanging from its point on the line */}
          {model.blocks.map((b, k) => {
            const role = k > 0 ? experience[k - 1] : null;
            const stats = role ? role.stats : [
              { value: "2 yrs", label: "production DevOps and cloud" },
              { value: "2", label: "research assistant roles" },
              { value: "1.8", label: "M.Eng grade" },
            ];
            const align = b.flagRight ? "" : "text-right";
            return (
              <div
                key={k}
                ref={(el) => void (blocks.current[k] = el)}
                className={`absolute ${b.flagRight ? "border-l-2 pl-5" : "border-r-2 pr-5"} ${align}`}
                style={{ left: b.left, top: model.blockTop, width: b.width, visibility: "hidden", borderColor: "transparent" }}
              >
                <p data-i="0" className="hud text-cyan">
                  {role ? `${role.start} to ${role.end} // ${role.duration}` : "Profile"}
                </p>
                <h2 data-i="1" className="mt-2 font-display text-[clamp(22px,2.2vw,32px)] font-bold uppercase leading-[1.04]">
                  {role ? role.title : profile.title}
                </h2>
                <p data-i="2" className="hud mt-1.5 text-mist">
                  {role ? `${role.org} // ${role.place}` : "Germany // MLOps, computer vision, edge AI"}
                </p>
                <p data-i="3" className={`mt-3 ${role ? "line-clamp-3" : ""} text-[clamp(14px,1.1vw,16px)] leading-snug text-bone/90 [@media(max-height:700px)]:hidden`}>
                  {role ? role.headline : profile.summary}
                </p>
                <dl data-i="4" className="mt-4 grid gap-x-6 gap-y-3 [@media(max-height:700px)]:mt-3" style={{ gridTemplateColumns: `repeat(${Math.min(stats.length, 3)}, minmax(0, 1fr))` }}>
                  {stats.map((s) => (
                    <div key={s.label}>
                      <dd className="font-display text-[clamp(22px,2vw,30px)] font-semibold leading-none text-cyan [@media(max-height:700px)]:text-[20px]">{s.value}</dd>
                      <dt className="hud mt-1 text-[10px] leading-snug text-mist">{s.label}</dt>
                    </div>
                  ))}
                </dl>
                {role && (
                  <div data-i="5" className={`mt-3 flex ${b.flagRight ? "" : "justify-end"}`}>
                    <button type="button" onClick={() => openDetail(role.id)} className="ghost-btn plus pointer-events-auto" aria-haspopup="dialog">
                      Full details <span className="sign" aria-hidden="true">+</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </>
      )}
    </div>
  );
});

export default ExpTimeline;
