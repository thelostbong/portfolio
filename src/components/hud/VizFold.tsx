"use client";

import { useEffect, useRef, useState } from "react";
import Viz from "./viz";

// Phones: the 840 x 190 project scene is a wide strip, far too small at phone width. Fold
// it into two rows instead, like a snake: the top row runs left to right, the bottom row
// is mirrored so it carries on from the right edge back to the left, and the flow never
// breaks. The labels in the mirrored row are flipped back so they read normally. The same
// animated SVG is drawn twice; nothing in the scenes is redrawn. Each fold sits in a gap
// between two stages, so every row reads as a step of the story.

const W = 840;
const H = 190;
const TURN = 20; // height of the turn marker between the rows

// Where each scene folds, in its own 840-wide units.
const SEAM: Record<string, number> = {
  lineguard: 350, // cameras | Pi, queue, MES
  "nano-sentry": 460, // camera and chip | inference result
  threadline: 460, // translate, prompt | render, score
  heartbeat: 535, // trace and data split | models and verdict
  stockpile: 580, // the whole forecast graph | cost comparison (the graph stays in one piece)
  "impact-twin": 480, // profile, Opus, schema check | impact profile and SDGs
};

export default function VizFold({ slug }: { slug: string }) {
  const box = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const read = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    read();
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const seam = SEAM[slug] ?? W / 2;
  const widest = Math.max(seam, W - seam);
  // As large as the card allows: the wider half fills the width, both rows fit the height.
  const s = size.w ? Math.min(size.w / widest, Math.max(0, size.h - TURN) / (H * 2)) : 0;
  const w1 = seam * s;
  const w2 = (W - seam) * s;
  const rowH = H * s;
  const cw = Math.max(w1, w2); // the bottom row hangs from the right edge, where the top row ends

  return (
    <div ref={box} data-scene={slug} className="viz-fold relative h-full min-h-0 w-full">
      {s > 0 && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2" style={{ width: cw }}>
          <div className="relative overflow-hidden" style={{ width: w1, height: rowH }}>
            <div className="absolute left-0 top-0" style={{ width: W * s, height: rowH }}>
              <Viz slug={slug} />
            </div>
          </div>
          {/* The bend on the right: the flow goes down and turns back. */}
          <svg width={cw} height={TURN} className="block" aria-hidden="true">
            <path
              d={`M${w1 - 2},0 V${TURN / 2} H${cw - 3} V${TURN}`}
              fill="none"
              stroke="var(--color-cyan)"
              strokeOpacity="0.5"
              strokeWidth="1.2"
              strokeDasharray="3 4"
            />
          </svg>
          <div className="viz-mirror relative overflow-hidden" style={{ width: w2, height: rowH, marginLeft: cw - w2 }} aria-hidden="true">
            <div className="absolute top-0" style={{ left: -seam * s, width: W * s, height: rowH }}>
              <Viz slug={slug} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
