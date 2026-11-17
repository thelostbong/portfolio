"use client";

import { useEffect, useRef, useState } from "react";
import Viz from "./viz";

// Phones: the 840 x 190 project scene is a wide strip, far too small at phone width. Fold
// it into two rows instead, like a snake: the first part of the scene runs left to right,
// the rest runs back right to left underneath. The lower row is the same animated SVG
// mirrored, with every label flipped back so it still reads (globals.css, .fold-back).
// A flowing line on the right edge carries the scene's own flow from one row into the
// next, at the height where that flow crosses the fold. Nothing in the scenes is redrawn.

const W = 840;
const H = 190;
const GAP = 16; // space between the two rows

// Where each scene folds (x), and where its flow crosses the fold (y), in scene units.
// Each fold sits in a gap between two stages, so every row reads as a step of the story.
const FOLD: Record<string, { x: number; y: number } | null> = {
  lineguard: { x: 350, y: 74 }, // cameras | Pi, queue, MES
  "nano-sentry": { x: 460, y: 92 }, // camera and chip | inference result
  threadline: { x: 460, y: 95 }, // translate, prompt | render, score
  heartbeat: { x: 535, y: 93 }, // trace and data split | models and verdict
  stockpile: null, // one chart: kept whole
  "impact-twin": { x: 480, y: 93 }, // profile, Opus, schema check | impact profile and SDGs
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

  const fold = FOLD[slug];

  // Kept whole: the scene at the full card width.
  if (!fold) {
    const s = size.w ? Math.min(size.w / W, size.h / H) : 0;
    return (
      <div ref={box} data-scene={slug} className="viz-fold relative h-full min-h-0 w-full">
        {s > 0 && (
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" style={{ width: W * s, height: H * s }}>
            <Viz slug={slug} />
          </div>
        )}
      </div>
    );
  }

  const turn = 10; // how far the link swings out past the rows' right edge
  const widest = Math.max(fold.x, W - fold.x);
  // As large as the card allows: the wider part fills the width, both rows fit the height.
  const s = size.w ? Math.min((size.w - turn - 2) / widest, Math.max(0, size.h - GAP) / (H * 2)) : 0;
  const w1 = fold.x * s;
  const w2 = (W - fold.x) * s;
  const rowH = H * s;
  const full = Math.max(w1, w2);
  const y1 = fold.y * s; // where the flow leaves the first row
  const y2 = rowH + GAP + fold.y * s; // and enters the second
  const r = 5;

  return (
    <div ref={box} data-scene={slug} className="viz-fold relative h-full min-h-0 w-full">
      {s > 0 && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2" style={{ width: full + turn + 2, height: rowH * 2 + GAP }}>
          {/* First part, left to right. Both rows end flush right, where they meet. */}
          <div className="absolute top-0 overflow-hidden" style={{ left: full - w1, width: w1, height: rowH }}>
            <div className="absolute left-0 top-0" style={{ width: W * s, height: rowH }}>
              <Viz slug={slug} />
            </div>
          </div>
          {/* Rest of the scene, mirrored: it carries on right to left. */}
          <div className="fold-back absolute overflow-hidden" style={{ left: full - w2, top: rowH + GAP, width: w2, height: rowH }} aria-hidden="true">
            <div className="absolute top-0" style={{ left: -fold.x * s, width: W * s, height: rowH }}>
              <Viz slug={slug} />
            </div>
          </div>
          {/* The flow itself, running down the right edge from one row into the next. */}
          <svg className="pointer-events-none absolute left-0 top-0" width={full + turn + 2} height={rowH * 2 + GAP} aria-hidden="true">
            <path
              className="fold-link"
              d={`M${full - 1},${y1} H${full + turn - r} Q${full + turn},${y1} ${full + turn},${y1 + r} V${y2 - r} Q${full + turn},${y2} ${full + turn - r},${y2} H${full - 1}`}
              fill="none"
            />
          </svg>
        </div>
      )}
    </div>
  );
}
