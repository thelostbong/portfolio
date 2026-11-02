"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { experience, profile } from "@/content";
import { useHud } from "@/lib/hud-store";

// The Experience rail. The track scrolls sideways as usual; this layer sits inside it
// and draws a career line that starts beside the profile and runs along the rail from
// the newest role to the oldest. The line is cumulative months of work counted back from
// today, so it climbs as you go further back. The tip stays at one spot on screen while
// the track moves under it, and each role's text hangs from the point it is on, building
// up as it arrives and clearing as the rail moves on.
// The rail calls set(p) every frame, p being the rail position in cards (0 = profile).

export type ExpTimelineHandle = { set: (p: number) => void };

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const ANCHOR = 0.58; // where the tip sits across the visible card, as a share of its width
const END_AT = 0.14; // where a role's newest point sits inside its own card

type Pt = { x: number; y: number; v: number };
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const monthIdx = (s: string) => {
  const [m, y] = s.split(" ");
  return Number(y) * 12 + MON.indexOf(m);
};

const ExpTimeline = forwardRef<ExpTimelineHandle>(function ExpTimeline(_, ref) {
  const box = useRef<HTMLDivElement>(null);
  const [dim, setDim] = useState({ w: 0, h: 0, card: 0, step: 0 });

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const read = () => {
      const slots = Array.from(el.parentElement?.querySelectorAll<HTMLElement>("[data-slot]") ?? []);
      if (slots.length < 2) return;
      setDim({ w: el.clientWidth, h: el.clientHeight, card: slots[0].clientWidth, step: slots[1].offsetLeft - slots[0].offsetLeft });
    };
    read();
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const model = useMemo(() => {
    const { w, h, card, step } = dim;
    if (!w || !h || !card) return null;
    const roles = experience; // newest first
    const dur = roles.map((r) => monthIdx(r.end) - monthIdx(r.start) + 1);
    const total = dur.reduce((a, b) => a + b, 0);

    const short = h < 420;
    const YT = short ? 22 : 24;
    const YB = YT + (short ? h * 0.17 : Math.min(112, h * 0.22));
    const Y = (v: number) => YB - (v / total) * (YB - YT);
    const blockTop = YB + (short ? 36 : 42);

    const pts: Pt[] = [{ x: card * ANCHOR, v: 0, y: Y(0) }];
    let cum = 0;
    roles.forEach((_, i) => {
      const base = (i + 1) * step;
      pts.push({ x: base + card * END_AT, v: cum, y: Y(cum) });
      cum += dur[i];
      pts.push({ x: base + card * ANCHOR, v: cum, y: Y(cum) });
    });
    const cumLen: number[] = [0];
    for (let i = 1; i < pts.length; i++) cumLen.push(cumLen[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
    const L = cumLen[cumLen.length - 1];
    const line = pts.map((q, i) => `${i ? "L" : "M"}${q.x.toFixed(1)},${q.y.toFixed(1)}`).join(" ");
    const area = `${line} L${pts[pts.length - 1].x.toFixed(1)},${YB} L${pts[0].x.toFixed(1)},${YB} Z`;

    // Dates under the points: today at the start, then each role's end and start.
    const labels = pts.map((q, i) => ({ x: q.x, text: i === 0 ? "Now" : i % 2 ? roles[(i - 1) / 2].end : roles[(i - 2) / 2].start }));
    const grid = [0, 12, 24].filter((v) => v < total).map((v) => ({ v, y: Y(v) }));

    const anchors = [pts[0], ...roles.map((_, i) => pts[2 * i + 2])];
    const bw = Math.min(520, card * ANCHOR - 24);
    return { pts, cumLen, L, line, area, labels, grid, YT, YB, blockTop, anchors, bw, total, card, step, w, h, short };
  }, [dim]);

  const modelRef = useRef(model);
  modelRef.current = model;
  const pRef = useRef(0);

  const lineRef = useRef<SVGPathElement>(null);
  const clipRef = useRef<SVGRectElement>(null);
  const tipRef = useRef<SVGGElement>(null);
  const tipText = useRef<SVGTextElement>(null);
  const guide = useRef<SVGLineElement>(null);
  const dots = useRef<(SVGGElement | null)[]>([]);
  const poles = useRef<(SVGLineElement | null)[]>([]);
  const blocks = useRef<(HTMLDivElement | null)[]>([]);

  const apply = useCallback((p: number) => {
    const m = modelRef.current;
    if (!m) return;
    const { pts, cumLen, L, YB, step, card } = m;
    const pc = clamp(p, 0, m.anchors.length - 1);
    const xt = pc * step + card * ANCHOR; // the line is drawn this far
    let i = 0;
    while (i < pts.length - 2 && xt > pts[i + 1].x) i++;
    const t = clamp((xt - pts[i].x) / (pts[i + 1].x - pts[i].x));
    const y = pts[i].y + (pts[i + 1].y - pts[i].y) * t;
    const v = pts[i].v + (pts[i + 1].v - pts[i].v) * t;
    const drawn = cumLen[i] + (cumLen[i + 1] - cumLen[i]) * t;

    lineRef.current?.setAttribute("stroke-dashoffset", String(L - drawn));
    clipRef.current?.setAttribute("width", xt.toFixed(1));
    if (tipRef.current) tipRef.current.setAttribute("transform", `translate(${xt.toFixed(1)} ${y.toFixed(1)})`);
    if (tipText.current) tipText.current.textContent = `${Math.round(v)} mo`;
    if (guide.current) {
      guide.current.setAttribute("x1", xt.toFixed(1));
      guide.current.setAttribute("x2", xt.toFixed(1));
      guide.current.setAttribute("y1", y.toFixed(1));
      guide.current.setAttribute("y2", String(YB));
    }
    dots.current.forEach((d, k) => {
      if (d) d.style.opacity = String(clamp((xt - pts[k].x) / 8 + 1));
    });

    blocks.current.forEach((el, k) => {
      if (!el) return;
      const a = clamp(1 - Math.abs(p - k) * 1.8);
      el.style.visibility = a > 0.02 ? "visible" : "hidden";
      if (k === 0) el.style.opacity = a.toFixed(3);
      else el.style.borderColor = `rgb(56 200 216 / ${(0.55 * a).toFixed(3)})`;
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

  useEffect(() => {
    apply(pRef.current);
  }, [model, apply]);

  const openDetail = (id: string) => useHud.getState().setDetail(id);

  return (
    <div ref={box} className="pointer-events-none absolute inset-0">
      {model && (
        <>
          <svg width={model.w} height={model.h} className="absolute inset-0" role="img" aria-label={`Career line, ${model.total} months of work, newest role first`}>
            <defs>
              <linearGradient id="exp-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="var(--color-cyan)" stopOpacity="0.3" />
                <stop offset="1" stopColor="var(--color-cyan)" stopOpacity="0" />
              </linearGradient>
              <clipPath id="exp-clip">
                <rect ref={clipRef} x="0" y="0" width="0" height={model.h} />
              </clipPath>
            </defs>

            <line x1="0" x2={model.w} y1={model.YB} y2={model.YB} stroke="rgb(143 179 184 / 0.35)" />
            {model.grid.filter((g) => g.v).map((g) => (
              <line key={g.v} x1="0" x2={model.w} y1={g.y} y2={g.y} stroke="rgb(143 179 184 / 0.14)" strokeDasharray="2 5" />
            ))}
            {model.labels.map((l, k) => (
              <g key={k}>
                <line x1={l.x} x2={l.x} y1={model.YB} y2={model.YB + 5} stroke="rgb(143 179 184 / 0.55)" />
                <text x={l.x} y={model.YB + 18} textAnchor="middle" className="exp-t">{l.text}</text>
              </g>
            ))}

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
              <g key={k} ref={(el) => void (dots.current[k] = el)} style={{ opacity: 0 }}>
                <circle cx={q.x} cy={q.y} r="3.2" fill="var(--color-ink)" stroke="var(--color-bone)" strokeWidth="1.4" />
              </g>
            ))}

            {model.anchors.map((a, k) => (
              <line key={k} ref={(el) => void (poles.current[k] = el)} x1={a.x} x2={a.x} y1={a.y + 6} y2={model.blockTop} stroke="rgb(56 200 216 / 0.55)" strokeDasharray="2 3" style={{ opacity: 0 }} />
            ))}
            <line ref={guide} x1="0" x2="0" y1={model.YT} y2={model.YB} stroke="rgb(56 200 216 / 0.4)" strokeDasharray="2 3" />
            <g ref={tipRef}>
              <circle r="9" fill="rgb(56 200 216 / 0.18)" className="exp-pulse" />
              <circle r="4.5" fill="var(--color-cyan)" />
              <text ref={tipText} x="-12" y="-10" textAnchor="end" className="exp-t exp-tip">0 mo</text>
            </g>
          </svg>

          {/* Profile: the legend the rail opens on, with the line starting beside it */}
          <div ref={(el) => void (blocks.current[0] = el)} className="absolute left-0 top-0" style={{ width: model.card * 0.5, height: model.h, visibility: "hidden" }}>
            <div className="panel flex h-full flex-col px-6 py-5">
              <span data-i="0" className="hud text-cyan">Profile</span>
              <h2 data-i="1" className="mt-3 font-display text-[clamp(24px,2.3vw,34px)] font-bold uppercase leading-[1.04] [@media(max-height:700px)]:text-[22px]">{profile.title}</h2>
              <p data-i="2" className="mt-3 text-[clamp(13px,1.05vw,15.5px)] leading-relaxed text-bone/90 [@media(max-height:700px)]:text-[12.5px] [@media(max-height:700px)]:leading-snug">{profile.summary}</p>
              <div data-i="3" className="mt-auto flex flex-wrap gap-1.5 pt-3">
                {["AWS", "Kubernetes", "Terraform", "YOLO", "FastAPI", "MLflow"].map((c) => (
                  <span key={c} className="chip">{c}</span>
                ))}
              </div>
              <dl data-i="4" className="mt-3 grid grid-cols-3 gap-x-4 border-t border-cyan/20 pt-3">
                {[
                  ["2 yrs", "production DevOps and cloud"],
                  ["2", "research assistant roles"],
                  ["1.8", "M.Eng grade"],
                ].map(([v, l]) => (
                  <div key={l}>
                    <dd className="font-display text-[clamp(20px,1.8vw,26px)] font-semibold leading-none text-cyan">{v}</dd>
                    <dt className="hud mt-1 text-[9px] leading-snug text-mist">{l}</dt>
                  </div>
                ))}
              </dl>
            </div>
          </div>

          {/* Roles: each hangs from its start point on the line */}
          {experience.map((role, i) => {
            const k = i + 1;
            const a = model.anchors[k];
            return (
              <div
                key={role.id}
                ref={(el) => void (blocks.current[k] = el)}
                className="absolute border-r-2 pr-5 text-right"
                style={{ left: a.x - model.bw, top: model.blockTop, width: model.bw, visibility: "hidden", borderColor: "transparent" }}
              >
                <div data-i="0" className="flex items-center justify-end gap-5">
                  <p className="hud text-cyan">
                    {role.start} to {role.end} // {role.duration}
                  </p>
                  <button type="button" onClick={() => openDetail(role.id)} className="ghost-btn plus pointer-events-auto" aria-haspopup="dialog">
                    Full details <span className="sign" aria-hidden="true">+</span>
                  </button>
                </div>
                <h2 data-i="1" className="mt-2 font-display text-[clamp(21px,1.9vw,27px)] font-bold uppercase leading-[1.04]">{role.title}</h2>
                <p data-i="2" className="hud mt-1.5 text-mist">
                  {role.org} // {role.place}
                </p>
                <p data-i="3" className="mt-3 line-clamp-2 text-[clamp(14px,1.05vw,15.5px)] leading-snug text-bone/90 [@media(max-height:700px)]:hidden">{role.headline}</p>
                <dl data-i="4" className="mt-3 grid gap-x-5 gap-y-2.5 [@media(max-height:700px)]:mt-3" style={{ gridTemplateColumns: `repeat(${role.stats.length > 4 ? 3 : role.stats.length}, minmax(0, 1fr))` }}>
                  {role.stats.map((s) => (
                    <div key={s.label}>
                      <dd className="font-display text-[clamp(22px,2vw,30px)] font-semibold leading-none text-cyan [@media(max-height:700px)]:text-[20px]">{s.value}</dd>
                      <dt className="hud mt-1 text-[10px] leading-snug text-mist">{s.label}</dt>
                    </div>
                  ))}
                </dl>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
});

export default ExpTimeline;
