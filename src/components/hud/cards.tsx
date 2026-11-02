import type { ReactNode } from "react";
import { archive, languages as languageData, projects as projectData, skills as skillData, profile, experience as experienceData, education as educationData } from "@/content";
import type { SectionId } from "@/lib/hud-store";

// Every card is a fixed-width panel; the rail lays them out in a row.
const W = "w-[min(560px,42vw)] min-w-[420px]";

function Card({ children, tag, index, wide, short }: { children: ReactNode; tag: string; index?: string; wide?: boolean; short?: boolean }) {
  return (
    <article className={`rail-card panel flex shrink-0 flex-col p-6 ${short ? "h-[340px]" : "h-full"} ${wide ? "w-[min(760px,54vw)] min-w-[520px]" : W}`}>
      <header className="flex items-center justify-between">
        <span className="hud text-cyan">{tag}</span>
        {index && <span className="numeral-outline font-display text-5xl font-bold leading-none">{index}</span>}
      </header>
      <div className="card-scroll mt-4 flex-1 pr-1">{children}</div>
    </article>
  );
}

function Stats({ stats }: { stats: { value: string; label: string }[] }) {
  return (
    <dl className="mt-4 grid gap-x-5 gap-y-3 border-t border-cyan/20 pt-3" style={{ gridTemplateColumns: `repeat(${Math.min(stats.length, 4)}, minmax(0, 1fr))` }}>
      {stats.map((s) => (
        <div key={s.label}>
          <dd className="font-display text-[26px] font-semibold leading-none text-cyan">{s.value}</dd>
          <dt className="hud mt-1 text-[10px] leading-snug text-mist">{s.label}</dt>
        </div>
      ))}
    </dl>
  );
}

function Link({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      target={href.startsWith("http") ? "_blank" : undefined}
      rel="noreferrer"
      className="hud mt-4 inline-flex items-center gap-2 border border-cyan/60 px-4 py-2 text-cyan transition-colors hover:bg-cyan hover:text-ink"
    >
      {children} <span aria-hidden="true">→</span>
    </a>
  );
}

const experience = (): ReactNode[] => [
  <Card key="profile" tag="Profile" wide>
    <h2 className="font-display text-[40px] font-bold uppercase leading-none">{profile.title}</h2>
    <p className="mt-5 max-w-[620px] text-[17px] leading-relaxed text-bone/90">{profile.summary}</p>
    <div className="mt-6 flex flex-wrap gap-2">
      {["AWS", "Kubernetes", "Terraform", "YOLO", "FastAPI", "MLflow"].map((c) => (
        <span key={c} className="chip">{c}</span>
      ))}
    </div>
    <div className="mt-8">
      <Stats
        stats={[
          { value: "2 yrs", label: "production DevOps and cloud" },
          { value: "2", label: "research assistant roles" },
          { value: "1.8", label: "M.Eng grade" },
        ]}
      />
    </div>
  </Card>,
  ...experienceData.map((r, i) => (
    <Card key={r.id} tag={`${r.start} to ${r.end} // ${r.duration}`} index={String(i + 1).padStart(2, "0")} wide>
      <h2 className="font-display text-[30px] font-bold uppercase leading-[1.02]">{r.title}</h2>
      <p className="hud mt-2 text-mist">
        {r.org} // {r.place}
      </p>
      <ul className="mt-4 space-y-3">
        {r.bullets.map((b) => (
          <li key={b.label} className="text-[14.5px] leading-relaxed text-bone/90">
            <span className="hud mr-2 text-cyan">{b.label}</span>
            {b.text}
          </li>
        ))}
      </ul>
      <Stats stats={r.stats.slice(0, 4)} />
    </Card>
  )),
];

const projects = (): ReactNode[] => [
  ...projectData.map((m) => (
    <Card key={m.slug} tag="Featured project" index={m.number}>
      <h2 className="font-display text-[27px] font-bold uppercase leading-[1.02]">{m.title}</h2>
      <p className="mt-3 text-[15px] leading-relaxed text-bone">{m.objective}</p>
      <p className="mt-2 text-[14px] leading-relaxed text-mist">{m.summary}</p>
      <div className="mt-4 flex flex-wrap gap-1.5">
        {m.stack.map((s) => (
          <span key={s} className="chip">{s}</span>
        ))}
      </div>
      <Stats stats={m.stats} />
      {m.repo ? (
        <Link href={`${profile.links.github}/${m.repo}`}>View repository</Link>
      ) : (
        <p className="hud mt-4 text-mist">Team project // no public repository</p>
      )}
    </Card>
  )),
  <Card key="more" tag="More work" index="+">
    <h2 className="font-display text-[30px] font-bold uppercase leading-[1.02]">Other repositories</h2>
    <ul className="mt-4 space-y-3">
      {archive
        .filter((a) => a.kind === "original")
        .map((a) => (
          <li key={a.repo}>
            <a
              href={`${profile.links.github}/${a.repo}`}
              target="_blank"
              rel="noreferrer"
              className="block border-l-2 border-cyan/40 pl-3 transition-colors hover:border-cyan"
            >
              <span className="block font-display text-lg font-semibold uppercase leading-tight">{a.title}</span>
              <span className="hud text-mist">{a.language}</span>
            </a>
          </li>
        ))}
    </ul>
    <Link href={profile.links.github}>All of GitHub</Link>
  </Card>,
];

const skills = (): ReactNode[] =>
  skillData.map((g, i) => (
    <Card key={g.group} short tag={`Group ${String(i + 1).padStart(2, "0")}`} index={String(i + 1).padStart(2, "0")}>
      <h2 className="font-display text-[34px] font-bold uppercase leading-none">{g.group}</h2>
      <ul className="mt-6 flex flex-wrap gap-2">
        {g.items.map((it) => (
          <li key={it} className="chip text-[12px]">{it}</li>
        ))}
      </ul>
    </Card>
  ));

const education = (): ReactNode[] => [
  ...educationData.map((t, i) => (
    <Card key={t.school} short tag={`${t.start} to ${t.end}`} index={String(i + 1).padStart(2, "0")}>
      <h2 className="font-display text-[32px] font-bold uppercase leading-[1.02]">{t.degree}</h2>
      <p className="mt-3 text-[16px] text-bone">{t.school}</p>
      <p className="hud mt-1 text-mist">{t.place}</p>
      <p className="mt-6 font-display text-[44px] font-semibold leading-none text-cyan">{t.result.replace(/^[^:]+:\s*/, "")}</p>
      <p className="hud mt-1 text-mist">{t.result.split(":")[0]}</p>
    </Card>
  )),
  <Card key="lang" short tag="Languages" index="+">
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

const contact = (): ReactNode[] => {
  const rows: [string, string, string, string?][] = [
    ["Email", profile.contact.email, `mailto:${profile.contact.email}`],
    ["Phone", profile.contact.phone, `tel:${profile.contact.phone.replace(/\s/g, "")}`],
    ["LinkedIn", "nayeemuddin-mohammed-03", profile.links.linkedin],
    ["GitHub", "github.com/thelostbong", profile.links.github],
    ["CV", "Download PDF", profile.links.cv],
  ];
  return rows.map(([k, v, href], i) => (
    <Card key={k} short tag={k} index={String(i + 1).padStart(2, "0")}>
      <a href={href} target={href.startsWith("http") ? "_blank" : undefined} rel="noreferrer" className="group block">
        <h2 className="break-words font-display text-[30px] font-bold uppercase leading-[1.05] transition-colors group-hover:text-cyan">{v}</h2>
        <span className="hud mt-4 inline-block text-cyan">Open →</span>
      </a>
    </Card>
  ));
};

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
    case "contact":
      return contact();
  }
}

export const SECTION_BLURB: Record<SectionId, string> = {
  experience: "Industry and research roles, newest first.",
  projects: "Computer vision, edge AI, generative pipelines and forecasting.",
  skills: "What I build with, grouped by area.",
  education: "Degrees and languages.",
  contact: "Fastest way to reach me is email.",
};
