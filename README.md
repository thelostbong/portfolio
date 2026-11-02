# Portfolio

Interactive portfolio of Nayeemuddin Mohammed. A HUD-style screen with a 3D operator in the centre. Five sections (Experience, Projects, Skills, Education, Contact) open as full-screen subscreens where cards flow horizontally.

Desktop first. Next.js static export, React Three Fiber, GSAP, Lenis.

## How it works

- `src/content.ts`: every word and number on the site. Edit here, not in components.
- `src/components/hud/Scene.tsx`: the 3D canvas: lights, camera moves per section, postprocessing.
- `src/components/hud/Operator.tsx`: loads the model, plays the idle loop, head tracks the cursor, grades the material.
- `src/components/hud/gear.ts`: original equipment (headset, night-vision mount, chest rig, tablet) built in code and attached to the model's bones.
- `src/components/hud/Landing.tsx`: landing HUD. Body callouts are the navigation; leader lines follow 3D anchor points.
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

## Credits

The base character mesh and idle animation come from Mixamo ("Vanguard"), via the three.js examples. Headset, night-vision mount, chest rig and tablet are modelled in code for this project.
