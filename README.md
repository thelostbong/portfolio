# Portfolio: Loadout

Next.js (static export) + Three.js / React Three Fiber + GSAP + Lenis.

- `src/content.ts`: every word and number on the site. Edit here, not in components.
- `design/tokens.json`: design tokens. `src/app/globals.css` mirrors them. Keep in sync.
- `design/figma-frames.md`: Figma frame list and hand-off notes.
- `src/lib/store.ts`: quality tier (full / lite / static) and scroll state shared with the 3D scene.
- `src/app/page.tsx`: baseline semantic page. Also the static fallback tier; 3D layers on top of it.

```
npm run dev     # local dev server
npm run build   # static export to ./out
```
