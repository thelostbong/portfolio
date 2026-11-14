# Portfolio

Interactive portfolio of Nayeemuddin Mohammed. A HUD-style screen with an interactive particle cloud in the centre. Four sections (Projects, Experience, Education, Skills) open as full-screen subscreens where cards flow horizontally.

Desktop first. Next.js static export, three.js, GSAP, Lenis.

## How it works

- `src/content.ts`: every word and number on the site. Edit here, not in components.
- `src/components/hud/Scene.tsx`: the WebGL canvas. 262,144 particles settle onto a ring defined by a signed distance function; a GPU fluid simulation lets the cursor stir them; the cloud slides left when a section opens.
- `src/components/hud/Landing.tsx`: landing HUD. Callouts are the navigation; leader lines follow anchor points on the particle ring.
- `src/components/hud/Subscreen.tsx`, `cards.tsx`: horizontal card rail (Lenis), keyboard and drag control.
- `src/lib/hud-store.ts`: shared state and per-frame anchor positions.
- `design/tokens.json`: design tokens. `src/app/globals.css` mirrors them.

Keys inside a subscreen: `Esc` back, `← →` scroll, `1` to `5` switch section.

## Run

```
npm install
npm run dev     # local dev server
npm run build   # static export to ./out
```
