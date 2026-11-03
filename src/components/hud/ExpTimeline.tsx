"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { experience, profile } from "@/content";
import { useHud } from "@/lib/hud-store";

// The Experience rail. The track scrolls sideways as usual; this layer sits inside it and
// draws one career line that runs through the middle of every role's slot. A slot is a
// box: the left edge is the date the role ended, the right edge the date it started. The
// line enters on the left, climbs a little as months of work add up, leaves on the right,
// runs flat for a short stretch and enters the next role. The title sits above the line,
// the responsibilities and numbers below it, so text never crosses the line.
// The rail calls set(p) every frame, p being the rail position in slots (0 = profile).

export type ExpTimelineHandle = { set: (p: number) => void };

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const PAD = 36; // inset of the end and start points inside a slot
const NOW_GAP = 10; // how far past the profile card the line starts

type Pt = { x: number; y: number; v: number };
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const monthIdx = (s: string) => {
  const [m, y] = s.split(" ");
  return Number(y) * 12 + MON.indexOf(m);
};

// Up to ten months stay as months; beyond that, years and the months left over.
const span = (m: number) => {
  if (m <= 10) return `${m} month${m === 1 ? "" : "s"}`;
  const y = Math.floor(m / 12);
  const r = m % 12;
  return `${y} yr${y === 1 ? "" : "s"}${r ? ` ${r} mo` : ""}`;
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
    const climb = short ? 44 : 70; // the whole career climbs this far, whatever the month count
    const s = climb / total;
    const topNeed = short ? 74 : 108; // room for dates, title and place above the line
    const yBase = topNeed + (short ? 28 : 34) + climb;
    const Y = (v: number) => yBase - v * s;

    // Points along the line, newest first: today, then for each role its end and start.
    const nowX = card - 44 + NOW_GAP;
    const pts: Pt[] = [{ x: nowX, v: 0, y: Y(0) }];
    const ends: Pt[] = [];
    const starts: Pt[] = [];
    let cum = 0;
    roles.forEach((_, i) => {
      const left = (i + 1) * step;
      const e = { x: left + PAD, v: cum, y: Y(cum) };
      cum += dur[i];
      const st = { x: left + card - PAD, v: cum, y: Y(cum) };
      ends.push(e);
      starts.push(st);
      pts.push(e, st);
    });
    const cumLen: number[] = [0];
    for (let i = 1; i < pts.length; i++) cumLen.push(cumLen[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
    const L = cumLen[cumLen.length - 1];
    const line = pts.map((q, i) => `${i ? "L" : "M"}${q.x.toFixed(1)},${q.y.toFixed(1)}`).join(" ");

    // Where the tip rests when each slot is in focus: beside the profile, then each start point.
    const stops = [nowX, ...starts.map((q) => q.x)];
    const below = short ? 38 : 46; // from the end point down to the lower block
    const above = short ? 30 : 36; // from the start point up to the upper block
    return { pts, ends, starts, cumLen, L, line, yBase, stops, total, card, step, w, h, short, below, above, nowX, span: dur.map((_, i) => span(starts[i].v)) };
  }, [dim]);

  const modelRef = useRef(model);
  modelRef.current = model;
  const pRef = useRef(0);

  const lineRef = useRef<SVGPathElement>(null);
  const tipRef = useRef<SVGGElement>(null);
  const dots = useRef<(SVGGElement | null)[]>([]);
  const counts = useRef<(SVGTextElement | null)[]>([]);
  const blocks = useRef<(HTMLDivElement | null)[]>([]);

  const apply = useCallback((p: number) => {
    const m = modelRef.current;
    if (!m) return;
    const { pts, cumLen, L, stops } = m;
    const pc = clamp(p, 0, stops.length - 1);
    const k0 = Math.floor(pc);
    const k1 = Math.min(stops.length - 1, k0 + 1);
    const xt = stops[k0] + (stops[k1] - stops[k0]) * (pc - k0); // the line is drawn this far

    let i = 0;
    while (i < pts.length - 2 && xt > pts[i + 1].x) i++;
    const t = clamp((xt - pts[i].x) / Math.max(1, pts[i + 1].x - pts[i].x));
    const y = pts[i].y + (pts[i + 1].y - pts[i].y) * t;
    const drawn = cumLen[i] + (cumLen[i + 1] - cumLen[i]) * t;

    lineRef.current?.setAttribute("stroke-dashoffset", String(L - drawn));
    if (tipRef.current) tipRef.current.setAttribute("transform", `translate(${xt.toFixed(1)} ${y.toFixed(1)})`);
    dots.current.forEach((d, k) => {
      if (d) d.style.opacity = String(clamp((xt - pts[k].x) / 8 + 1));
    });
    counts.current.forEach((c, k) => {
      if (c) c.style.opacity = String(clamp((xt - m.starts[k].x) / 14 + 1));
    });

    blocks.current.forEach((el, k) => {
      if (!el) return;
      const d = k - p; // < 0 once passed, > 0 while it is still ahead
      // The role just passed fades out quickly; the next one waits at the edge, blurred.
      const a = d <= 0 ? clamp(1 - Math.abs(d) * 2.4) : 1 - Math.min(d, 1) * 0.45;
      const blur = Math.min(1, Math.abs(d) * 3) * 6;
      const r = clamp(1 - Math.abs(d) * 1.8);
      el.style.visibility = a > 0.02 && Math.abs(d) < 1.4 ? "visible" : "hidden";
      el.style.opacity = a.toFixed(3);
      el.style.filter = blur > 0.05 ? `blur(${blur.toFixed(2)}px)` : "";
      (el as HTMLElement & { inert: boolean }).inert = Math.abs(d) > 0.35;
      el.querySelectorAll<HTMLElement>("[data-i]").forEach((c) => {
        const i = Number(c.dataset.i);
        let o = clamp(r * 2.1 - i * 0.2);
        if (d > 0) o = Math.max(0.6, o);
        c.style.opacity = o.toFixed(3);
        c.style.transform = `translateY(${((1 - o) * 14).toFixed(1)}px)`;
      });
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
            <line x1="0" x2={model.w} y1={model.yBase} y2={model.yBase} stroke="rgb(143 179 184 / 0.16)" strokeDasharray="2 6" />
            <path d={model.line} fill="none" stroke="rgb(56 200 216 / 0.16)" strokeWidth="2" strokeLinejoin="round" />
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

            {model.pts.map((q, k) => {
              const role = k ? experience[Math.floor((k - 1) / 2)] : null;
              const isEnd = k % 2 === 1;
              const text = k === 0 ? "Now" : isEnd ? role!.end : role!.start;
              return (
                <g key={k} ref={(el) => void (dots.current[k] = el)} style={{ opacity: 0 }}>
                  <circle cx={q.x} cy={q.y} r="3.4" fill="var(--color-ink)" stroke="var(--color-bone)" strokeWidth="1.4" />
                  <text x={q.x} y={q.y + 20} textAnchor="middle" className="exp-t">{text}</text>
                </g>
              );
            })}

            {model.starts.map((q, k) => (
              <text key={k} ref={(el) => void (counts.current[k] = el)} x={q.x} y={q.y - 14} textAnchor="end" className="exp-t exp-tip" style={{ opacity: 0 }}>
                {model.span[k]}
              </text>
            ))}

            <g ref={tipRef}>
              <circle r="9" fill="rgb(56 200 216 / 0.18)" className="exp-pulse" />
              <circle r="4.5" fill="var(--color-cyan)" />
            </g>
          </svg>

          {/* Profile: the legend the rail opens on, with the line starting beside it */}
          <div ref={(el) => void (blocks.current[0] = el)} className="absolute left-0 top-0" style={{ width: model.card - 44, height: model.h, visibility: "hidden" }}>
            <div className="panel grid h-full grid-cols-[1.55fr_1fr] gap-10 px-8 py-6">
              <div className="flex min-w-0 flex-col">
                <span data-i="0" className="hud text-cyan">Profile</span>
                <h2 data-i="1" className={`mt-3 font-display font-bold uppercase leading-[1.04] ${model.short ? "text-[24px]" : "text-[clamp(28px,2.6vw,40px)]"}`}>{profile.title}</h2>
                <p data-i="2" className={`mt-3 text-bone/90 ${model.short ? "text-[13px] leading-snug" : "text-[clamp(14px,1.1vw,16px)] leading-relaxed"}`}>{profile.summary}</p>
                <div data-i="3" className="mt-auto flex flex-wrap gap-1.5 pt-3">
                  {["AWS", "Kubernetes", "Terraform", "YOLO", "FastAPI", "MLflow"].map((c) => (
                    <span key={c} className="chip">{c}</span>
                  ))}
                </div>
              </div>
              <dl data-i="4" className="flex min-w-0 flex-col justify-center gap-5 border-l border-cyan/20 pl-8">
                {[
                  ["2 yrs", "production DevOps and cloud"],
                  ["2", "research assistant roles"],
                  ["1.8", "M.Eng grade"],
                ].map(([v, l]) => (
                  <div key={l}>
                    <dd className="font-display text-[clamp(26px,2.4vw,36px)] font-semibold leading-none text-cyan">{v}</dd>
                    <dt className="hud mt-1.5 text-[10px] leading-snug text-mist">{l}</dt>
                  </div>
                ))}
              </dl>
            </div>
          </div>

          {/* Roles: title above the line, responsibilities and numbers below it */}
          {experience.map((role, i) => {
            const k = i + 1;
            const e = model.ends[i];
            const st = model.starts[i];
            const left = k * model.step + PAD;
            const width = model.card - PAD * 2;
                        return (
              <div key={role.id} ref={(el) => void (blocks.current[k] = el)} className="absolute left-0 top-0" style={{ width: model.w, height: model.h, visibility: "hidden" }}>
                <div className="absolute text-left" style={{ left, width, bottom: model.h - (st.y - model.above) }}>
                  <div data-i="0" className="flex items-center justify-between gap-6">
                    <p className="hud text-cyan">
                      {role.start} to {role.end} // {role.duration}
                    </p>
                    <button type="button" onClick={() => openDetail(role.id)} className="ghost-btn plus pointer-events-auto shrink-0" aria-haspopup="dialog">
                      Full details <span className="sign" aria-hidden="true">+</span>
                    </button>
                  </div>
                  <h2 data-i="1" className={`mt-2 font-display font-bold uppercase leading-[1.04] ${model.short ? "text-[21px]" : "text-[clamp(22px,2vw,28px)]"}`}>{role.title}</h2>
                  <p data-i="2" className="hud mt-1.5 text-mist">
                    {role.org} // {role.place}
                  </p>
                </div>

                {/* Three takeaways: the number first, then one sentence on what was done */}
                <div className="absolute grid grid-cols-3 gap-x-6 text-left" style={{ left, width, top: e.y + model.below }}>
                  {role.proof.map((pf, n) => (
                    <div key={pf.hero} data-i={3 + n} className="border-t-2 border-cyan/60 pt-3">
                      <p className={`whitespace-nowrap font-display font-semibold leading-none text-cyan ${model.short ? "text-[22px]" : "text-[clamp(26px,2.2vw,34px)]"}`}>{pf.hero}</p>
                      <p className="hud mt-1.5 text-[10px] text-mist">{pf.cap}</p>
                      <p className={`mt-2.5 text-bone/90 ${model.short ? "text-[12.5px] leading-snug" : "text-[clamp(13.5px,1vw,15px)] leading-[1.4]"}`}>{pf.line}</p>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
});

export default ExpTimeline;
