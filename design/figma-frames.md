# Figma frame list

File name: `Portfolio / Loadout`. Pages: `00 Tokens`, `01 Components`, `02 Desktop 1440`, `03 Mobile 390`, `04 Tunnel storyboard`, `05 Prototype`.

## 00 Tokens
Create variables from `tokens.json`: colors, spacing scale, radius, and text styles for every row in the type scale (desktop and mobile). Name styles exactly as in the file so Claude Code can map them one to one.

## 01 Components (build as components with variants)
| Component | Variants |
|---|---|
| HUD frame (chamfered panel) | default, hover, active |
| Button | primary (ember), ghost, icon; default, hover, focus, disabled |
| Stat block | big number + HUD label; 1-up, 2-up, 4-up |
| Mission card | featured (large), archive (compact), fork (dimmed); default, hover |
| Detection box | box + label + confidence chip; used on hover over mission cards |
| Crosshair cursor | idle, moving (gaps spread), hit-marker (click) |
| Slot (loadout) | empty, filled, active |
| Ring gate (tunnel milestone) | role title + date + stat readouts |
| Nav | desktop bar, mobile sheet |
| Tag chip | topic, language, fork |
| Boot loader | 0%, 50%, 100% |

## 02 Desktop 1440 (one frame per section)
1. **Boot**: loader. Black screen, `DEPLOYING` in HUD mono, progress bar, tiny line of system text.
2. **Hero / Operator (Warzone)**: night battlefield (burning skyline, smoke, embers, tracers), original running-operator silhouette with orange rim light, a swinging steel dog tag as the title (MOHAMMED / NAYEEMUDDIN engraved, role and `THD // GERMANY` below), crosshair cursor, radar, kill-feed of project results, ammo-style mission counter, `Current objective` block with `Deploy` and `Download CV`. Reference render: `spikes/warzone-hero/index.html`.
3. **Service Record**: three frames, one per role, each showing a ring gate with the stat readouts from `content.ts`.
4. **Missions rail**: pinned frame with the first card centered, plus two more frames showing the rail mid-scroll. Giant outlined numerals 01 to 06 behind the cards.
5. **Mission card hover**: card with the detection box and confidence chip drawn over it.
6. **Mission detail**: cover, objective, summary, stack, stats, repo link, next/previous mission.
7. **Mission Archive**: filter bar (language, topic, originals/forks), grid of compact cards, collapsed `Reference armory` strip for forks.
8. **Loadout**: left, Pi 5 and camera rig scene area; right, four slots with items. One slot active.
9. **Training and Comms**: two education entries, language badges.
10. **Contact / Extraction**: LinkedIn (primary), Email, GitHub, CV download, plus a details panel with email, phone and date of birth (published with the owner's approval, 2026-11-02). No postal address, no form.
11. **Footer, short privacy note ("this site collects nothing"), 404**.

## 03 Mobile 390
Same list as above. Differences to design explicitly:
- Rail becomes a swipeable scroll-snap row with the card number above each card.
- Tunnel runs in lite mode: fewer rings, no bloom. Draw the simplified look.
- Loadout slots stack as an accordion; the 3D rig sits above them at 240px tall.
- Nav is a full-screen sheet.

## 04 Tunnel storyboard (6 keyframes, 1440)
1. Tunnel mouth at rest (hero).
2. Entering: first ring passes camera, speed lines start.
3. Ring gate 1: THD computer vision role centered, readouts lit.
4. Ring gate 2: DOE role.
5. Ring gate 3: TCS role.
6. Exit: tunnel opens into the missions section.
Annotate each frame with camera position, ring count visible, and speed-line intensity (0 to 1).

## 05 Prototype (Figma click-through)
Flows to wire: nav to every section; mission card to detail and back; archive filter states; mobile nav open and close. Figma cannot prototype the WebGL tunnel, so it stays storyboard-only.

## Hand-off to Claude Code
Name frames and layers exactly as above. Export the tokens as variables, one PNG per frame at 1x, and the project covers as separate assets. The dog tag is built in code, so no portrait asset is needed.

## Theme: Warzone (2026-11-02)
Palette: night, smoke, olive-dk, olive, olive-lt, steel, bone, ember, ember-dim, hazard (see tokens.json). Figma Color variables were renamed and recolored in place, so every frame picked up the palette. Hero frame 3:42 was redrawn; other frames keep their layouts. Service Record gates are labeled Deployment.

### Warzone pass 2 (2026-11-02, later)
- New components on the Components page: `Battlefield BG / Desktop` (1440x1000) and `/ Mobile` (390x1100), used as `battlefield-bg` behind Boot, Service Record, Extraction, 404 and their mobile frames.
- `Reticle Cursor` is now `Crosshair Cursor` (Idle, Moving, Hit-marker).
- Boot is a loading screen with a field tip; Extraction has an exfil zone marker; Service Record frames have a deployment marker per role.
- Mission links read `View briefing`. Mobile hero rebuilt with the dog tag and operator.
- Keyframe 04.01 is the hero at rest. The scroll tunnel stays as the dive after the hero (keyframes 02 to 06 unchanged).
- The Figma file is the design source. The built hero lives in `src/components/Hero.tsx` and `src/lib/warzone-scene.js`.
