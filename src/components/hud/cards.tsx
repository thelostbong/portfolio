"use client";

import type { ReactNode } from "react";
import type { Stat } from "@/content";
import { archive, languages as languageData, projects as projectData, skills as skillData, profile, experience as experienceData, education as educationData } from "@/content";
import { useHud, type SectionId } from "@/lib/hud-store";
import Viz from "./viz";

// Every card is a fixed-size panel and never scrolls inside. Anything that does not
// fit is in the detail panel, opened with the Details button.
const W = "w-[min(560px,42vw)] min-w-[420px]";
const WIDE = "w-[min(640px,47vw)] min-w-[480px]";

function Card({ children, tag, wide, short }: { children: ReactNode; tag: string; wide?: boolean; short?: boolean }) {
  return (
    <article className={`rail-card panel flex shrink-0 flex-col overflow-hidden px-6 py-5 ${short ? "h-[340px] max-h-full" : "h-full"} ${wide ? WIDE : W}`}>
      <header className="flex h-9 items-center justify-between">
        <span className="hud text-cyan">{tag}</span>
      </header>
      <div className="mt-3 flex min-h-0 flex-1 flex-col">{children}</div>
    </article>
  );
}

function Stats({ stats, cols, size = "md" }: { stats: Stat[]; cols?: number; size?: "md" | "lg" }) {
  const n = cols ?? Math.min(stats.length, 4);
  return (
    <dl className="grid gap-x-5 gap-y-3 border-t border-cyan/20 pt-3" style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}>
      {stats.map((s) => (
        <div key={s.label}>
          <dd className={`font-display font-semibold leading-none text-cyan ${size === "lg" ? "text-[34px]" : "text-[24px]"}`}>{s.value}</dd>
          <dt className="hud mt-1 text-[10px] leading-snug text-mist">{s.label}</dt>
        </div>
      ))}
    </dl>
  );
}

function Link({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target={href.startsWith("http") ? "_blank" : undefined} rel="noreferrer" className="ghost-btn">
      {children} <span className="sign" aria-hidden="true">→</span>
    </a>
  );
}

function DetailsButton({ k, label = "Details" }: { k: string; label?: string }) {
  return (
    <button type="button" onClick={() => useHud.getState().setDetail(k)} className="ghost-btn plus" aria-haspopup="dialog">
      {label} <span className="sign" aria-hidden="true">+</span>
    </button>
  );
}

// "*95%* of parts" -> the starred runs are the figures, shown bright.
function MetricsLine({ text }: { text: string }) {
  return (
    <p className="text-[15px] leading-snug text-bone/90">
      {text.split("*").map((part, i) =>
        i % 2 ? (
          <strong key={i} className="font-semibold text-cyan">{part}</strong>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </p>
  );
}

// Experience has no cards: the rail only scrolls, and ExpTimeline writes the roles along
// the career line. These are the empty stops the rail moves between (profile + roles).
const experience = (): ReactNode[] =>
  [0, ...experienceData].map((_, i) => <div key={i} className="project-card h-full shrink-0" aria-hidden="true" />);

const ownRepos = archive.filter((a) => a.kind === "original");

const projects = (): ReactNode[] => [
  ...projectData.map((m) => (
    <article key={m.slug} className="project-card rail-card panel flex h-full shrink-0 flex-col overflow-hidden px-6 py-5">
      <h2 className="font-display text-[clamp(22px,2vw,28px)] font-bold uppercase leading-none">{m.title}</h2>
      <div className="mt-3 min-h-0 flex-1">
        <Viz slug={m.slug} />
      </div>
      <div className="mt-3">
        <MetricsLine text={m.metricsLine} />
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {m.stack.map((s) => (
          <span key={s} className="chip">{s}</span>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-6">
        <DetailsButton k={m.slug} />
        {m.repo ? <Link href={`${profile.links.github}/${m.repo}`}>Repository</Link> : m.repoUrl ? <Link href={m.repoUrl}>Team project repository</Link> : null}
      </div>
    </article>
  )),
  <article key="more" className="project-card rail-card panel flex h-[320px] max-h-full shrink-0 flex-col overflow-hidden px-6 py-5">
    <h2 className="font-display text-[clamp(22px,2vw,28px)] font-bold uppercase leading-none">Other repositories</h2>
    <ul className="mt-5 grid min-h-0 flex-1 grid-cols-2 content-start gap-x-10 gap-y-4 overflow-hidden">
      {ownRepos.map((a) => (
        <li key={a.repo} className="flex items-baseline justify-between gap-3 border-l-2 border-cyan/40 pl-3">
          <span className="truncate font-display text-[18px] font-semibold uppercase leading-tight">{a.title}</span>
          <span className="hud shrink-0 text-mist">{a.language}</span>
        </li>
      ))}
    </ul>
    <div className="mt-3 flex flex-wrap items-center gap-6">
      <DetailsButton k="archive" />
      <Link href={profile.links.github}>All of GitHub</Link>
    </div>
  </article>,
];

// One panel, four columns. Core tools are large so they read first; the rest sit small below.
const skills = (): ReactNode[] => [
  <article key="skills" className="project-card rail-card panel flex h-full max-h-[460px] shrink-0 flex-col justify-center overflow-hidden px-8 py-6">
    <div className="grid grid-cols-2 gap-x-12 gap-y-8">
      {skillData.map((g) => (
        <section key={g.group} className="border-l-2 border-cyan/50 pl-5">
          <h2 className="hud text-cyan">{g.group}</h2>
          <p className="mt-2.5 font-display text-[clamp(22px,1.9vw,28px)] font-semibold uppercase leading-[1.18] text-bone">
            {g.core.join(" / ")}
          </p>
          <p className="mt-2 text-[clamp(12.5px,0.95vw,14px)] leading-relaxed text-mist">{g.also.join(" · ")}</p>
        </section>
      ))}
    </div>
  </article>,
];

const education = (): ReactNode[] => [
  ...educationData.map((t) => (
    <Card key={t.school} short tag={`${t.start} to ${t.end}`}>
      <h2 className="font-display text-[32px] font-bold uppercase leading-[1.02]">{t.degree}</h2>
      <p className="mt-3 text-[16px] text-bone">{t.school}</p>
      <p className="hud mt-1 text-mist">{t.place}</p>
      <div className="mt-6 flex items-start gap-5">
        <div>
          <p className="font-display text-[44px] font-semibold leading-none text-cyan">{t.result.replace(/^[^:]+:\s*/, "")}</p>
          <p className="hud mt-1 text-mist">{t.result.split(":")[0]}</p>
        </div>
        {"germanGrade" in t && (
          <>
            <span aria-label="approximately equal to" className="font-display text-[40px] font-medium leading-none text-bone">≈</span>
            <div>
              <p className="font-display text-[44px] font-semibold leading-none text-cyan">{t.germanGrade}</p>
              <p className="hud mt-1 text-mist">German scale</p>
            </div>
          </>
        )}
      </div>
    </Card>
  )),
  <Card key="lang" short tag="Languages">
    <h2 className="font-display text-[34px] font-bold uppercase leading-none">Languages</h2>
    <ul className="mt-6 space-y-4">
      {languageData.map((c) => (
        <li key={c.language} className="flex items-baseline justify-between border-b border-cyan/20 pb-2">
          <span className="font-display text-2xl font-semibold uppercase">{c.language}</span>
          <span className="hud text-cyan">{c.level}</span>
        </li>
      ))}
    </ul>
  </Card>,
];

export function cardsFor(id: SectionId): ReactNode[] {
  switch (id) {
    case "experience":
      return experience();
    case "projects":
      return projects();
    case "skills":
      return skills();
    case "education":
      return education();
  }
}

export const SECTION_BLURB: Record<SectionId, string> = {
  experience: "Industry and research roles, newest first.",
  projects: "Defect detection, edge AI, multimodal ML pipelines.",
  skills: "MLOps, Kubernetes, AWS, computer vision.",
  education: "Degrees and languages.",
};

export type Detail = { tag: string; title: string; sub?: string; body: ReactNode };

function Metrics({ stats }: { stats: Stat[] }) {
  return (
    <aside className="border-l border-cyan/25 pl-6">
      <p className="hud text-cyan-dim">Key metrics</p>
      <dl className="mt-4 space-y-5">
        {stats.map((st) => (
          <div key={st.label}>
            <dd className="font-display text-[34px] font-semibold leading-none text-cyan">{st.value}</dd>
            <dt className="hud mt-1.5 text-mist">{st.label}</dt>
          </div>
        ))}
      </dl>
    </aside>
  );
}

export function detailFor(id: SectionId, key: string): Detail | null {
  if (id === "experience") {
    const r = experienceData.find((x) => x.id === key);
    if (!r) return null;
    return {
      tag: `${r.start} to ${r.end} // ${r.duration}`,
      title: r.title,
      sub: `${r.org} // ${r.place}`,
      body: (
        <div className="grid gap-10 lg:grid-cols-[1fr_230px]">
          <ul className="space-y-6">
            {r.bullets.map((b) => (
              <li key={b.label}>
                <p className="hud text-cyan">{b.label}</p>
                <p className="mt-1.5 text-[16.5px] leading-relaxed text-bone/90">{b.text}</p>
              </li>
            ))}
          </ul>
          <Metrics stats={r.stats} />
        </div>
      ),
    };
  }
  if (id === "projects" && key === "archive") {
    return {
      tag: "More work",
      title: "Other repositories",
      sub: `${ownRepos.length} public repositories on GitHub`,
      body: (
        <ul className="grid gap-x-10 gap-y-7 lg:grid-cols-2">
          {ownRepos.map((a) => (
            <li key={a.repo}>
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="font-display text-[22px] font-semibold uppercase leading-tight">{a.title}</h3>
                <span className="chip shrink-0">{a.language}</span>
              </div>
              <p className="mt-2 text-[15px] leading-relaxed text-bone/85">{a.description}</p>
              <a href={`${profile.links.github}/${a.repo}`} target="_blank" rel="noreferrer" className="hud mt-2 inline-block text-cyan hover:text-bone">
                View repository →
              </a>
            </li>
          ))}
        </ul>
      ),
    };
  }
  if (id === "projects") {
    const m = projectData.find((x) => x.slug === key);
    if (!m) return null;
    return {
      tag: "Featured project",
      title: m.title,
      body: (
        <div className="grid gap-10 lg:grid-cols-[1fr_230px]">
          <div>
            <p className="font-display text-[22px] font-medium leading-snug text-bone">{m.objective}</p>
            <p className="mt-4 text-[16.5px] leading-relaxed text-bone/85">{m.summary}</p>
            <p className="hud mt-6 text-cyan-dim">Stack</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {m.stack.map((t) => (
                <span key={t} className="chip">{t}</span>
              ))}
            </div>
            <div className="mt-6">
              {m.repo ? <Link href={`${profile.links.github}/${m.repo}`}>View repository</Link> : m.repoUrl ? <Link href={m.repoUrl}>View team project repository</Link> : null}
            </div>
          </div>
          <Metrics stats={m.stats} />
        </div>
      ),
    };
  }
  return null;
}
