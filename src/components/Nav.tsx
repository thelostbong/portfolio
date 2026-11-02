import { operator } from "@/content";

const LINKS = [
  ["Operator", "#operator"],
  ["Service Record", "#service-record"],
  ["Missions", "#missions"],
  ["Loadout", "#loadout"],
  ["Extraction", "#contact"],
] as const;

export default function Nav() {
  return (
    <header className="hud fixed inset-x-0 top-0 z-40 flex items-center justify-between bg-night/80 backdrop-blur-sm px-5 py-5 md:px-16">
      <a href="#operator" className="text-bone">
        NM // THD
      </a>
      <nav aria-label="Sections" className="hidden gap-8 text-steel md:flex">
        {LINKS.map(([l, h]) => (
          <a key={h} href={h} className="hover:text-ember">
            {l}
          </a>
        ))}
      </nav>
      <a
        href={operator.links.cv}
        className="chamfer bg-ember px-5 py-2 font-display text-lg font-semibold normal-case tracking-wide text-night"
      >
        DOWNLOAD CV
      </a>
    </header>
  );
}
