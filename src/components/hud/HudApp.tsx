"use client";

import { useEffect } from "react";
import dynamic from "next/dynamic";
import { archive, languages as languageData, projects as projectData, skills as skillData, profile, experience as experienceData, education as educationData } from "@/content";
import { LOCK_MS, SECTIONS, loop, pointer, useHud } from "@/lib/hud-store";
import Landing from "./Landing";
import Subscreen from "./Subscreen";

const Scene = dynamic(() => import("./Scene"), { ssr: false });

// Plain-text copy of the whole site for crawlers, screen readers and the no-WebGL case.
function PlainContent() {
  return (
    <div className="sr-only">
      <h1>
        {profile.name}, {profile.title}
      </h1>
      <p>{profile.summary}</p>
      <h2>Experience</h2>
      <ul>
        {experienceData.map((r) => (
          <li key={r.id}>
            {r.title}, {r.org}, {r.start} to {r.end}. {r.bullets.map((b) => b.text).join(" ")}
          </li>
        ))}
      </ul>
      <h2>Projects</h2>
      <ul>
        {projectData.map((m) => (
          <li key={m.slug}>
            {m.title}. {m.summary}
          </li>
        ))}
        {archive
          .filter((a) => a.kind === "original")
          .map((a) => (
            <li key={a.repo}>
              {a.title}. {a.description}
            </li>
          ))}
      </ul>
      <h2>Skills</h2>
      <ul>
        {skillData.map((g) => (
          <li key={g.group}>
            {g.group}: {[...g.core, ...g.also].join(", ")}
          </li>
        ))}
      </ul>
      <h2>Education</h2>
      <ul>
        {educationData.map((t) => (
          <li key={t.school}>
            {t.degree}, {t.school}, {t.start} to {t.end}. {t.result}
          </li>
        ))}
        <li>{languageData.map((c) => `${c.language} ${c.level}`).join(", ")}</li>
      </ul>
      <h2>Contact</h2>
      <p>
        {profile.contact.email}, {profile.contact.phone}
      </p>
    </div>
  );
}

export default function HudApp() {
  const ready = useHud((s) => s.ready);
  const setReady = useHud((s) => s.setReady);

  // If WebGL or the model fails, show the HUD anyway after a few seconds.
  useEffect(() => {
    const id = setTimeout(() => setReady(true), 9000);
    return () => clearTimeout(id);
  }, [setReady]);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.y = -((e.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  // The landing screen is the first stop of the scroll loop: scrolling down opens the
  // first section, scrolling up opens the last one at its final card.
  useEffect(() => {
    let last = 0;
    let acc = 0;
    const onWheel = (e: WheelEvent) => {
      const st = useHud.getState();
      if (st.active || !st.ready) return;
      const now = performance.now();
      if (now < loop.lockUntil) return;
      const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      if (!d) return;
      if (now - last > 180 || Math.sign(d) !== Math.sign(acc)) acc = 0;
      last = now;
      acc += d;
      if (Math.abs(acc) >= 60) {
        acc = 0;
        loop.lockUntil = now + LOCK_MS;
        if (d > 0) st.setActive(SECTIONS[0].id, "start");
        else st.setActive(SECTIONS[SECTIONS.length - 1].id, "end");
      }
    };
    const onKey = (e: KeyboardEvent) => {
      const st = useHud.getState();
      if (st.active || !st.ready || performance.now() < loop.lockUntil) return;
      if (e.key === "ArrowDown" || e.key === "PageDown") {
        loop.lockUntil = performance.now() + LOCK_MS;
        st.setActive(SECTIONS[0].id, "start");
      } else if (e.key === "ArrowUp" || e.key === "PageUp") {
        loop.lockUntil = performance.now() + LOCK_MS;
        st.setActive(SECTIONS[SECTIONS.length - 1].id, "end");
      }
    };
    window.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <main className="fixed inset-0 overflow-hidden bg-ink text-bone">
      <Scene />

      {/* Screen furniture over the 3D layer */}
      <div className="screen-grid pointer-events-none absolute inset-0" />
      <div className="screen-vignette pointer-events-none absolute inset-0" />
      <div className="screen-scan pointer-events-none absolute inset-x-0 top-0" />
      <div className="screen-grain pointer-events-none absolute inset-0" />

      <div className={`absolute inset-0 transition-opacity duration-1000 ${ready ? "opacity-100" : "opacity-0"}`}>
        <Landing />
        <Subscreen />
      </div>

      {/* Monitor bezel with a notch */}
      <div className="pointer-events-none absolute inset-0 z-30">
        <div className="absolute inset-[10px] rounded-[22px] border border-cyan/20 shadow-[0_0_0_14px_#02070a]" />
        <div className="absolute left-1/2 top-[10px] h-[14px] w-[210px] -translate-x-1/2 rounded-b-[12px] border border-t-0 border-cyan/25 bg-[#02070a]">
          <span className="absolute left-4 top-[5px] h-[3px] w-[110px] rounded bg-cyan/30" />
          <span className="absolute right-4 top-[3px] h-[6px] w-[6px] rounded-full bg-cyan" style={{ animation: "pulse-dot 2.4s infinite" }} />
        </div>
      </div>

      {/* Loader */}
      <div className={`pointer-events-none absolute inset-0 z-40 grid place-items-center bg-ink transition-opacity duration-700 ${ready ? "opacity-0" : "opacity-100"}`}>
        <p className="hud text-cyan">Initialising display<span className="animate-pulse"> ...</span></p>
      </div>

      <PlainContent />
    </main>
  );
}
