"use client";

import type { ReactNode } from "react";
import type { Stat } from "@/content";
import { archive, languages as languageData, projects as projectData, skills as skillData, profile, experience as experienceData, education as educationData } from "@/content";
import { useHud, type SectionId } from "@/lib/hud-store";

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

const btn = "hud inline-flex items-center gap-2 border border-cyan/60 px-4 py-2 text-cyan transition-colors hover:bg-cyan hover:text-ink";

function Link({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target={href.startsWith("http") ? "_blank" : undefined} rel="noreferrer" className={btn}>
      {children} <span aria-hidden="true">→</span>
    </a>
  );
}

function DetailsButton({ k, label = "Details" }: { k: string; label?: string }) {
  return (
    <button type="button" onClick={() => useHud.getState().setDetail(k)} className={`${btn} bg-cyan/10`} aria-haspopup="dialog">
      {label} <span aria-hidden="true">+</span>
    </button>
  );
}

const experience = (): ReactNode[] => [
  <Card key="profile" tag="Profile" wide>
    <h2 className="font-display text-[clamp(26px,2.6vw,38px)] font-bold uppercase leading-none">{profile.title}</h2>
    <p className="mt-4 text-[15.5px] leading-relaxed text-bone/90">{profile.summary}</p>
    <div className="mt-4 flex flex-wrap gap-2">
      {["AWS", "Kubernetes", "Terraform", "YOLO", "FastAPI", "MLflow"].map((c) => (
        <span key={c} className="chip">{c}</span>
      ))}
    </div>
    <div className="mt-auto">
      <Stats
        stats={[
          { value: "2 yrs", label: "production DevOps and cloud" },
          { value: "2", label: "research assistant roles" },
          { value: "1.8", label: "M.Eng grade" },
        ]}
      />
    </div>
  </Card>,
  ...experienceData.map((r) => (
    <Card key={r.id} tag={`${r.start} to ${r.end} // ${r.duration}`} wide>
      <h2 className="font-display text-[clamp(20px,1.9vw,27px)] font-bold uppercase leading-[1.04]">{r.title}</h2>
      <p className="hud mt-1 text-mist">
        {r.org} // {r.place}
      </p>
      <p className="mt-3 line-clamp-2 text-[14.5px] leading-snug text-bone/90">{r.headline}</p>
      <div className="mt-auto">
        <Stats stats={r.stats} cols={r.stats.length > 4 ? 3 : Math.min(r.stats.length, 4)} />
        <div className="mt-3">
          <DetailsButton k={r.id} label="Full details" />
        </div>
      </div>
    </Card>
  )),
];

const ownRepos = archive.filter((a) => a.kind === "original");

const projects = (): ReactNode[] => [
  ...projectData.map((m) => (
    <Card key={m.slug} tag="Featured project">
      <h2 className="font-display text-[clamp(20px,1.9vw,26px)] font-bold uppercase leading-[1.04]">{m.title}</h2>
      <p className="mt-2 line-clamp-2 text-[14.5px] leading-snug text-bone">{m.objective}</p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {m.stack.map((s) => (
          <span key={s} className="chip">{s}</span>
        ))}
      </div>
      <div className="mt-auto">
        <Stats stats={m.stats} />
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <DetailsButton k={m.slug} />
          {m.repo ? <Link href={`${profile.links.github}/${m.repo}`}>Repository</Link> : <span className="hud text-mist">Team project // no public repo</span>}
        </div>
      </div>
    </Card>
  )),
  <Card key="more" tag="More work">
    <h2 className="font-display text-[clamp(22px,2vw,28px)] font-bold uppercase leading-[1.04]">Other repositories</h2>
    <ul className="mt-3 space-y-2">
      {ownRepos.map((a) => (
        <li key={a.repo} className="flex items-baseline justify-between gap-3 border-l-2 border-cyan/40 pl-3">
          <span className="truncate font-display text-[16px] font-semibold uppercase leading-tight">{a.title}</span>
          <span className="hud shrink-0 text-mist">{a.language}</span>
        </li>
      ))}
    </ul>
    <div className="mt-auto flex flex-wrap items-center gap-3">
      <DetailsButton k="archive" />
      <Link href={profile.links.github}>All of GitHub</Link>
    </div>
  </Card>,
];

const skills = (): ReactNode[] =>
  skillData.map((g) => (
    <Card key={g.group} short tag="Skill group">
      <h2 className="font-display text-[34px] font-bold uppercase leading-none">{g.group}</h2>
      <ul className="mt-6 flex flex-wrap gap-2">
        {g.items.map((it) => (
          <li key={it} className="chip text-[12px]">{it}</li>
        ))}
      </ul>
    </Card>
  ));

const education = (): ReactNode[] => [
  ...educationData.map((t) => (
    <Card key={t.school} short tag={`${t.start} to ${t.end}`}>
      <h2 className="font-display text-[32px] font-bold uppercase leading-[1.02]">{t.degree}</h2>
      <p className="mt-3 text-[16px] text-bone">{t.school}</p>
      <p className="hud mt-1 text-mist">{t.place}</p>
      <p className="mt-6 font-display text-[44px] font-semibold leading-none text-cyan">{t.result.replace(/^[^:]+:\s*/, "")}</p>
      <p className="hud mt-1 text-mist">{t.result.split(":")[0]}</p>
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
  projects: "Computer vision, edge AI, generative pipelines and forecasting.",
  skills: "What I build with, grouped by area.",
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
              {m.repo ? <Link href={`${profile.links.github}/${m.repo}`}>View repository</Link> : <span className="hud text-mist">Team project // no public repository</span>}
            </div>
          </div>
          <Metrics stats={m.stats} />
        </div>
      ),
    };
  }
  return null;
}
