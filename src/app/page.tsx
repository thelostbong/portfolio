import Hero from "@/components/Hero";
import Nav from "@/components/Nav";
import Crosshair from "@/components/Crosshair";
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
          <dt className="hud text-steel">{s.label}</dt>
          <dd className="font-display text-3xl font-semibold uppercase text-hazard">
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
    <>
      <Crosshair />
      <Nav />
      <Hero />
    <main className="mx-auto max-w-[1440px] px-5 md:px-16">
      <section id="service-record" className="border-t border-line py-20">
        <h2 className="font-display text-[32px] font-bold uppercase md:text-5xl">Service Record</h2>
        <div className="mt-10 space-y-14">
          {serviceRecord.map((r) => (
            <article key={r.id}>
              <p className="hud text-steel">
                {r.start} to {r.end} // {r.duration}
              </p>
              <h3 className="mt-2 font-display text-[22px] font-semibold uppercase md:text-3xl">
                {r.title}
              </h3>
              <p className="text-steel">
                {r.org}, {r.place}
              </p>
              <StatRow stats={r.stats} />
              <ul className="mt-6 max-w-3xl space-y-3">
                {r.bullets.map((b) => (
                  <li key={b.label}>
                    <span className="font-medium text-bone">{b.label}. </span>
                    <span className="text-bone/90">{b.text}</span>
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
            <article key={m.slug} className="chamfer border border-line bg-olive-dk p-6">
              <p className="hud text-steel">
                {m.number} // {m.codename}
              </p>
              <h3 className="mt-2 font-display text-[22px] font-semibold uppercase md:text-2xl">
                {m.title}
              </h3>
              <p className="mt-3 text-bone/90">{m.objective}</p>
              <p className="mt-3 text-sm text-steel">{m.summary}</p>
              <StatRow stats={m.stats} />
              <p className="hud mt-4 text-steel">{m.stack.join(" / ")}</p>
              {m.repo ? (
                <a
                  className="hud mt-4 inline-block text-hazard underline"
                  href={`${operator.links.github}/${m.repo}`}
                >
                  View repo
                </a>
              ) : (
                <p className="hud mt-4 text-steel">Team project, no public repo</p>
              )}
            </article>
          ))}
        </div>
      </section>

      <section id="archive" className="border-t border-line py-20">
        <h2 className="font-display text-[32px] font-bold uppercase md:text-5xl">Mission Archive</h2>
        <ul className="mt-10 grid gap-4 md:grid-cols-2">
          {originals.map((a) => (
            <li key={a.repo} className="chamfer border border-line bg-smoke p-5">
              <p className="hud text-steel">{a.language}</p>
              <h3 className="mt-1 font-display text-xl font-semibold uppercase">{a.title}</h3>
              <p className="mt-2 text-sm text-bone/90">{a.description}</p>
              <a className="hud mt-3 inline-block text-hazard underline" href={`${operator.links.github}/${a.repo}`}>
                View repo
              </a>
            </li>
          ))}
        </ul>
        <details className="mt-10">
          <summary className="hud cursor-pointer text-steel">
            Reference armory // {forks.length} forks
          </summary>
          <ul className="mt-4 grid gap-3 md:grid-cols-2">
            {forks.map((f) => (
              <li key={f.repo} className="border border-line p-4 opacity-80">
                <p className="hud text-steel">Fork of {f.forkOf}</p>
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
            <div key={slot.slot} className="chamfer border border-line bg-olive-dk p-6">
              <p className="hud text-hazard">{slot.slot}</p>
              <h3 className="mt-1 font-display text-2xl font-semibold uppercase">{slot.group}</h3>
              <ul className="mt-3 flex flex-wrap gap-2">
                {slot.items.map((i) => (
                  <li key={i} className="hud border border-line px-2 py-1 text-bone">
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
              <p className="hud text-steel">
                {t.start} to {t.end}
              </p>
              <h3 className="font-display text-2xl font-semibold uppercase">{t.school}</h3>
              <p>
                {t.degree} // {t.result}
              </p>
              <p className="text-steel">{t.place}</p>
            </li>
          ))}
        </ul>
        <p className="hud mt-10 text-steel">
          Comms: {comms.map((c) => `${c.language} ${c.level}`).join(" // ")}
        </p>
      </section>

      <section id="contact" className="border-t border-line py-24">
        <h2 className="font-display text-[32px] font-bold uppercase md:text-5xl">Extraction</h2>
        <div className="mt-8 flex flex-wrap gap-4">
          <a className="chamfer bg-ember px-6 py-3 font-display text-lg font-semibold uppercase text-night" href={operator.links.linkedin}>
            LinkedIn
          </a>
          <a className="chamfer border border-line px-6 py-3 font-display text-lg font-semibold uppercase" href={`mailto:${operator.contact.email}`}>
            Email
          </a>
          <a className="chamfer border border-line px-6 py-3 font-display text-lg font-semibold uppercase" href={operator.links.github}>
            GitHub
          </a>
          <a className="chamfer border border-line px-6 py-3 font-display text-lg font-semibold uppercase" href={operator.links.cv}>
            Download CV
          </a>
        </div>
        <dl className="hud mt-10 grid max-w-xl grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-bone">
          <dt className="text-steel">Email</dt>
          <dd><a href={`mailto:${operator.contact.email}`}>{operator.contact.email}</a></dd>
          <dt className="text-steel">Phone</dt>
          <dd><a href={`tel:${operator.contact.phone.replace(/\s/g, "")}`}>{operator.contact.phone}</a></dd>
          <dt className="text-steel">Date of birth</dt>
          <dd>{operator.contact.dob}</dd>
        </dl>
        <p className="hud mt-12 text-steel">This site collects nothing: no cookies, forms, or analytics.</p>
      </section>
    </main>
    </>
  );
}
