import {
  operator,
  serviceRecord,
  featuredMissions,
  archive,
  loadout,
  training,
  comms,
} from "@/content";

// Baseline page: plain semantic HTML driven entirely by content.ts.
// This is also the "static" fallback tier. The 3D tunnel, horizontal rail,
// and reticle layer on top of this markup; they never replace it.

function StatRow({ stats }: { stats: { value: string; label: string }[] }) {
  return (
    <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 md:grid-cols-4">
      {stats.map((s) => (
        <div key={s.label}>
          <dt className="hud text-ash">{s.label}</dt>
          <dd className="font-display text-3xl font-semibold uppercase text-gold">
            {s.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export default function Home() {
  const originals = archive.filter((a) => a.kind === "original");
  const forks = archive.filter((a) => a.kind === "fork");

  return (
    <main className="mx-auto max-w-[1440px] px-5 md:px-16">
      <section id="operator" className="py-24 md:py-32">
        <p className="hud text-ash">Operator // {operator.handle}</p>
        <h1 className="mt-4 font-display text-[56px] font-bold uppercase leading-[0.92] md:text-[clamp(72px,9vw,144px)]">
          {operator.name}
        </h1>
        <p className="mt-4 font-display text-2xl font-semibold uppercase tracking-wide text-vermilion md:text-4xl">
          {operator.title}
        </p>
        <p className="mt-8 max-w-2xl text-paper">{operator.summary}</p>
        <div className="mt-8 flex flex-wrap gap-4">
          <a
            href="#missions"
            className="chamfer bg-vermilion px-6 py-3 font-display text-lg font-semibold uppercase tracking-wide text-sumi"
          >
            Deploy
          </a>
          <a
            href={operator.links.cv}
            className="chamfer border border-line px-6 py-3 font-display text-lg font-semibold uppercase tracking-wide"
          >
            Download CV
          </a>
        </div>
      </section>

      <section id="service-record" className="border-t border-line py-20">
        <h2 className="font-display text-[32px] font-bold uppercase md:text-5xl">Service Record</h2>
        <div className="mt-10 space-y-14">
          {serviceRecord.map((r) => (
            <article key={r.id}>
              <p className="hud text-ash">
                {r.start} to {r.end} // {r.duration}
              </p>
              <h3 className="mt-2 font-display text-[22px] font-semibold uppercase md:text-3xl">
                {r.title}
              </h3>
              <p className="text-ash">
                {r.org}, {r.place}
              </p>
              <StatRow stats={r.stats} />
              <ul className="mt-6 max-w-3xl space-y-3">
                {r.bullets.map((b) => (
                  <li key={b.label}>
                    <span className="font-medium text-paper">{b.label}. </span>
                    <span className="text-paper/90">{b.text}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section id="missions" className="border-t border-line py-20">
        <h2 className="font-display text-[32px] font-bold uppercase md:text-5xl">Missions</h2>
        <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {featuredMissions.map((m) => (
            <article key={m.slug} className="chamfer border border-line bg-ink-2 p-6">
              <p className="hud text-ash">
                {m.number} // {m.codename}
              </p>
              <h3 className="mt-2 font-display text-[22px] font-semibold uppercase md:text-2xl">
                {m.title}
              </h3>
              <p className="mt-3 text-paper/90">{m.objective}</p>
              <p className="mt-3 text-sm text-ash">{m.summary}</p>
              <StatRow stats={m.stats} />
              <p className="hud mt-4 text-ash">{m.stack.join(" / ")}</p>
              {m.repo ? (
                <a
                  className="hud mt-4 inline-block text-gold underline"
                  href={`${operator.links.github}/${m.repo}`}
                >
                  View repo
                </a>
              ) : (
                <p className="hud mt-4 text-ash">Team project, no public repo</p>
              )}
            </article>
          ))}
        </div>
      </section>

      <section id="archive" className="border-t border-line py-20">
        <h2 className="font-display text-[32px] font-bold uppercase md:text-5xl">Mission Archive</h2>
        <ul className="mt-10 grid gap-4 md:grid-cols-2">
          {originals.map((a) => (
            <li key={a.repo} className="chamfer border border-line bg-ink p-5">
              <p className="hud text-ash">{a.language}</p>
              <h3 className="mt-1 font-display text-xl font-semibold uppercase">{a.title}</h3>
              <p className="mt-2 text-sm text-paper/90">{a.description}</p>
              <a className="hud mt-3 inline-block text-gold underline" href={`${operator.links.github}/${a.repo}`}>
                View repo
              </a>
            </li>
          ))}
        </ul>
        <details className="mt-10">
          <summary className="hud cursor-pointer text-ash">
            Reference armory // {forks.length} forks
          </summary>
          <ul className="mt-4 grid gap-3 md:grid-cols-2">
            {forks.map((f) => (
              <li key={f.repo} className="border border-line p-4 opacity-80">
                <p className="hud text-ash">Fork of {f.forkOf}</p>
                <p className="mt-1 font-display text-lg font-semibold uppercase">{f.title}</p>
              </li>
            ))}
          </ul>
        </details>
      </section>

      <section id="loadout" className="border-t border-line py-20">
        <h2 className="font-display text-[32px] font-bold uppercase md:text-5xl">Loadout</h2>
        <div className="mt-10 grid gap-6 md:grid-cols-2">
          {loadout.map((slot) => (
            <div key={slot.slot} className="chamfer border border-line bg-ink-2 p-6">
              <p className="hud text-gold">{slot.slot}</p>
              <h3 className="mt-1 font-display text-2xl font-semibold uppercase">{slot.group}</h3>
              <ul className="mt-3 flex flex-wrap gap-2">
                {slot.items.map((i) => (
                  <li key={i} className="hud border border-line px-2 py-1 text-paper">
                    {i}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section id="training" className="border-t border-line py-20">
        <h2 className="font-display text-[32px] font-bold uppercase md:text-5xl">Training</h2>
        <ul className="mt-10 space-y-6">
          {training.map((t) => (
            <li key={t.school}>
              <p className="hud text-ash">
                {t.start} to {t.end}
              </p>
              <h3 className="font-display text-2xl font-semibold uppercase">{t.school}</h3>
              <p>
                {t.degree} // {t.result}
              </p>
              <p className="text-ash">{t.place}</p>
            </li>
          ))}
        </ul>
        <p className="hud mt-10 text-ash">
          Comms: {comms.map((c) => `${c.language} ${c.level}`).join(" // ")}
        </p>
      </section>

      <section id="contact" className="border-t border-line py-24">
        <h2 className="font-display text-[32px] font-bold uppercase md:text-5xl">Extraction</h2>
        <div className="mt-8 flex flex-wrap gap-4">
          <a className="chamfer bg-vermilion px-6 py-3 font-display text-lg font-semibold uppercase text-sumi" href={operator.links.linkedin}>
            LinkedIn
          </a>
          <a className="chamfer border border-line px-6 py-3 font-display text-lg font-semibold uppercase" href={operator.links.github}>
            GitHub
          </a>
          <a className="chamfer border border-line px-6 py-3 font-display text-lg font-semibold uppercase" href={operator.links.cv}>
            Download CV
          </a>
        </div>
        <p className="hud mt-12 text-ash">This site collects nothing: no cookies, forms, or analytics.</p>
      </section>
    </main>
  );
}
