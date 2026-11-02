// Warzone hero scene (ported from spikes/warzone-hero). Plain three.js, no React:
// the Hero component owns the canvas and calls dispose() on unmount.
// eslint-disable-next-line
// @ts-nocheck
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

export async function initWarzone(canvas, opts = {}) {
  const size = () => ({ w: canvas.parentElement.clientWidth || innerWidth, h: canvas.parentElement.clientHeight || innerHeight });
  await Promise.all([
    document.fonts.load('700 120px "Barlow Condensed"'),
    document.fonts.load('600 40px "Barlow Condensed"'),
  ]);



function rng(seed) { return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const R = rng(7);
const rr = (a, b) => a + (b - a) * R();

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.setSize(size().w, size().h);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x3a1f12, 0.016);

function gradTex(stops) {
  const c = document.createElement("canvas"); c.width = 4; c.height = 512; const g = c.getContext("2d");
  const gr = g.createLinearGradient(0, 0, 0, 512); stops.forEach(([p, col]) => gr.addColorStop(p, col));
  g.fillStyle = gr; g.fillRect(0, 0, 4, 512);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
scene.background = gradTex([[0, "#05070a"], [0.35, "#12100e"], [0.55, "#3a1d10"], [0.68, "#b4501a"], [0.74, "#f08a34"], [1, "#2a1308"]]);

const camera = new THREE.PerspectiveCamera(38, size().w / size().h, 0.1, 400);
camera.position.set(0, 1.5, 14);
const look = new THREE.Vector3(0, 3.2, 0);
camera.lookAt(look);

function radial(size, stops) {
  const c = document.createElement("canvas"); c.width = c.height = size; const g = c.getContext("2d");
  const gr = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  stops.forEach(([p, col]) => gr.addColorStop(p, col)); g.fillStyle = gr; g.fillRect(0, 0, size, size);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const glowTex = radial(256, [[0, "rgba(255,170,80,1)"], [0.35, "rgba(240,86,29,.55)"], [1, "rgba(240,86,29,0)"]]);
const smokeTex = radial(256, [[0, "rgba(255,255,255,.9)"], [0.5, "rgba(255,255,255,.35)"], [1, "rgba(255,255,255,0)"]]);
const dotTex = radial(64, [[0, "rgba(255,255,255,1)"], [0.4, "rgba(255,255,255,.7)"], [1, "rgba(255,255,255,0)"]]);

// ---- skyline layers ----
const layers = [];
function makeLayer({ z, color, count, hMin, hMax, speed, span = 130, windows = 0 }) {
  const g = new THREE.Group(); g.position.z = z; scene.add(g);
  const mat = new THREE.MeshBasicMaterial({ color });
  const items = [];
  let x = -span / 2;
  for (let i = 0; i < count; i++) {
    const w = rr(2, 5.5), h = rr(hMin, hMax);
    const b = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, 3), mat); body.position.y = h / 2; b.add(body);
    const k = Math.floor(rr(0, 3));
    for (let j = 0; j < k; j++) { const cw = rr(0.6, w * 0.6), ch = rr(0.4, 1.8); const c = new THREE.Mesh(new THREE.BoxGeometry(cw, ch, 2.4), mat); c.position.set(rr(-w / 2, w / 2), h + ch / 2 - 0.15, 0); c.rotation.z = rr(-0.35, 0.35); b.add(c); }
    if (windows) for (let j = 0; j < windows; j++) { if (R() < 0.45) { const win = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 0.4), new THREE.MeshBasicMaterial({ color: 0xff8a3a, fog: false, transparent: true, opacity: rr(0.4, 0.95) })); win.position.set(rr(-w / 2 + 0.3, w / 2 - 0.3), rr(1.2, h - 0.8), 1.52); b.add(win); } }
    b.userData = { x0: x + w / 2, w };
    x += w + rr(0.2, 2.2); items.push(b); g.add(b);
  }
  const total = x + span / 2;
  layers.push({ g, items, speed, total });
}
makeLayer({ z: -60, color: 0x5b2c15, count: 40, hMin: 10, hMax: 26, speed: 0.35, span: 220 });
makeLayer({ z: -38, color: 0x3a1d10, count: 36, hMin: 7, hMax: 20, speed: 0.8, span: 170, windows: 4 });
makeLayer({ z: -22, color: 0x1f130c, count: 30, hMin: 5, hMax: 14, speed: 1.8, span: 130, windows: 5 });
makeLayer({ z: -11, color: 0x0e0a07, count: 22, hMin: 3, hMax: 8, speed: 3.6, span: 100 });

// fire glows
const glows = [];
for (let i = 0; i < 9; i++) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, fog: false, opacity: rr(0.5, 0.95) }));
  const sz = rr(10, 26); s.scale.set(sz, sz, 1); s.position.set(rr(-45, 45), rr(1.5, 7), rr(-50, -18)); scene.add(s); glows.push(s);
}
const horizonGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, fog: false, opacity: 0.9 }));
horizonGlow.scale.set(120, 36, 1); horizonGlow.position.set(6, 3, -64); scene.add(horizonGlow);

// ---- ground ----
function roadTex() {
  const c = document.createElement("canvas"); c.width = 1024; c.height = 512; const g = c.getContext("2d");
  g.fillStyle = "#17110c"; g.fillRect(0, 0, 1024, 512);
  for (let i = 0; i < 9000; i++) { const v = Math.floor(rr(10, 46)); g.fillStyle = `rgb(${v + 6},${v},${v - 4})`; g.fillRect(rr(0, 1024), rr(0, 512), rr(1, 3), rr(1, 3)); }
  g.fillStyle = "rgba(231,183,60,.75)"; for (let i = 0; i < 4; i++) g.fillRect(i * 256 + 40, 250, 120, 7);
  g.strokeStyle = "rgba(0,0,0,.6)"; g.lineWidth = 3; for (let i = 0; i < 14; i++) { g.beginPath(); let x = rr(0, 1024), y = rr(0, 512); g.moveTo(x, y); for (let j = 0; j < 5; j++) { x += rr(-40, 40); y += rr(-30, 30); g.lineTo(x, y); } g.stroke(); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.repeat.set(10, 1); return t;
}
const rt = roadTex();
const ground = new THREE.Mesh(new THREE.PlaneGeometry(260, 90), new THREE.MeshBasicMaterial({ map: rt }));
ground.rotation.x = -Math.PI / 2; ground.position.set(0, 0, -30); scene.add(ground);

// foreground props (rubble, barriers, tires) scrolling fast
const props = [];
const darkMat = new THREE.MeshStandardMaterial({ color: 0x0b0907, roughness: 1, metalness: 0 });
for (let i = 0; i < 16; i++) {
  const kind = i % 3; let m;
  if (kind === 0) m = new THREE.Mesh(new THREE.BoxGeometry(rr(0.8, 2.2), rr(0.3, 0.9), rr(0.6, 1.4)), darkMat);
  else if (kind === 1) m = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.3, 14), darkMat);
  else m = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.9, 0.6), darkMat);
  m.position.set(rr(-30, 30), 0.3, rr(4, 9)); m.rotation.y = rr(-0.5, 0.5); scene.add(m); props.push(m);
}
// burning car silhouette
const car = new THREE.Group();
const carMat = new THREE.MeshBasicMaterial({ color: 0x050403 });
const body = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.9, 1.8), carMat); body.position.y = 0.75; car.add(body);
const cab = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.8, 1.6), carMat); cab.position.set(-0.2, 1.5, 0); car.add(cab);
car.position.set(-6, 0, -5); scene.add(car);
const carFire = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, fog: false, opacity: 1 }));
carFire.scale.set(7, 7, 1); carFire.position.set(-6, 1.6, -4.6); scene.add(carFire);

// ---- smoke ----
const smokes = [];
for (let i = 0; i < 46; i++) {
  const lit = R() < 0.4;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: smokeTex, color: lit ? 0x5a2a14 : 0x1a1512, transparent: true, depthWrite: false, opacity: rr(0.18, 0.45), fog: false }));
  const sz = rr(8, 20); s.scale.set(sz, sz * 0.7, 1); s.position.set(rr(-40, 40), rr(3, 13), rr(-45, -4)); s.userData = { vx: rr(-0.25, -0.05), vy: rr(0.02, 0.12) }; scene.add(s); smokes.push(s);
}
// ---- embers ----
const EN = 700;
const ePos = new Float32Array(EN * 3), eVel = new Float32Array(EN * 3);
for (let i = 0; i < EN; i++) { ePos[i * 3] = rr(-24, 24); ePos[i * 3 + 1] = rr(0, 14); ePos[i * 3 + 2] = rr(-22, 9); eVel[i * 3] = rr(-1.6, -0.3); eVel[i * 3 + 1] = rr(0.2, 1.1); eVel[i * 3 + 2] = rr(-0.1, 0.1); }
const eGeo = new THREE.BufferGeometry(); eGeo.setAttribute("position", new THREE.BufferAttribute(ePos, 3));
const embers = new THREE.Points(eGeo, new THREE.PointsMaterial({ map: dotTex, color: 0xff9a40, size: 0.16, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, opacity: 0.95 }));
scene.add(embers);
// ---- tracers ----
const tracers = [];
for (let i = 0; i < 9; i++) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(rr(4, 9), 0.05), new THREE.MeshBasicMaterial({ color: R() < 0.5 ? 0xffd8a0 : 0xff7a2a, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, fog: false, opacity: 0.9 }));
  m.position.set(rr(-30, 30), rr(3.5, 11), rr(-40, -14)); m.rotation.z = rr(-0.18, 0.05); m.userData = { v: rr(20, 45) * (R() < 0.7 ? 1 : -1) }; scene.add(m); tracers.push(m);
}

// ---- lights ----
scene.add(new THREE.HemisphereLight(0x5a6a88, 0x1a0e08, 0.5));
const rim = new THREE.DirectionalLight(0xff7a2a, 11); rim.position.set(-6, 4, -12); scene.add(rim);
const rim2 = new THREE.DirectionalLight(0xffb36b, 3.5); rim2.position.set(8, 6, -10); scene.add(rim2);
const fill = new THREE.DirectionalLight(0x7088aa, 0.9); fill.position.set(2, 3, 12); scene.add(fill);
const tagLight = new THREE.PointLight(0xff7a2a, 40, 14, 1.6); tagLight.position.set(-5, 3.6, 3); scene.add(tagLight);

// ---- operator (original stylised silhouette) ----
const opMat = new THREE.MeshStandardMaterial({ color: 0x15160f, roughness: 0.85, metalness: 0.05 });
const gearMat = new THREE.MeshStandardMaterial({ color: 0x0c0d09, roughness: 0.9 });
const box = (w, h, d, m = opMat) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
const operator = new THREE.Group();
const hips = new THREE.Group(); hips.position.y = 1.02; operator.add(hips);
const torso = new THREE.Group(); hips.add(torso); torso.rotation.z = -0.2;
const chest = box(0.5, 0.66, 0.34); chest.position.y = 0.4; torso.add(chest);
const vest = box(0.56, 0.5, 0.4, gearMat); vest.position.y = 0.45; torso.add(vest);
const pack = box(0.28, 0.5, 0.26, gearMat); pack.position.set(-0.36, 0.45, 0); torso.add(pack);
const neck = box(0.12, 0.1, 0.12); neck.position.y = 0.78; torso.add(neck);
const head = new THREE.Group(); head.position.y = 0.92; torso.add(head);
const skull = new THREE.Mesh(new THREE.SphereGeometry(0.15, 14, 12), opMat); head.add(skull);
const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.62), gearMat); helmet.position.y = 0.03; head.add(helmet);
const nvg = box(0.1, 0.12, 0.2, gearMat); nvg.position.set(0.17, 0.1, 0); head.add(nvg);
const rifle = new THREE.Group(); const rBody = box(0.95, 0.1, 0.07, gearMat); const rStock = box(0.28, 0.14, 0.07, gearMat); rStock.position.set(-0.55, -0.02, 0); const rBarrel = box(0.5, 0.04, 0.04, gearMat); rBarrel.position.set(0.7, 0.01, 0); const rMag = box(0.08, 0.22, 0.06, gearMat); rMag.position.set(0.05, -0.15, 0); rifle.add(rBody, rStock, rBarrel, rMag); rifle.position.set(0.28, 0.42, 0.04); rifle.rotation.z = 0.12; torso.add(rifle);
function limb(len1, len2, w, topMat = opMat) {
  const root = new THREE.Group(); const up = box(w, len1, w, topMat); up.position.y = -len1 / 2; root.add(up);
  const knee = new THREE.Group(); knee.position.y = -len1; root.add(knee); const lo = box(w * 0.85, len2, w * 0.85, topMat); lo.position.y = -len2 / 2; knee.add(lo);
  return { root, knee, end: lo };
}
const legs = [limb(0.5, 0.5, 0.2), limb(0.5, 0.5, 0.2)];
legs.forEach((l, i) => { l.root.position.z = i ? -0.13 : 0.13; hips.add(l.root); const boot = box(0.34, 0.12, 0.17, gearMat); boot.position.set(0.1, -0.5, 0); l.knee.add(boot); const pad = box(0.24, 0.14, 0.24, gearMat); pad.position.set(0.04, 0, 0); l.knee.add(pad); });
const arms = [limb(0.34, 0.32, 0.13), limb(0.34, 0.32, 0.13)];
arms.forEach((a, i) => { a.root.position.set(0.02, 0.68, i ? -0.3 : 0.3); torso.add(a.root); });
operator.scale.setScalar(1.75); operator.position.set(3.2, 0, 1.6); scene.add(operator);

// ---- dog tag ----
const tagGroup = new THREE.Group(); scene.add(tagGroup);
const pmrem = new THREE.PMREMGenerator(renderer); const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
function rrect(w, h, r) { const s = new THREE.Shape(); const x = -w / 2, y = -h / 2; s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h); s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r); s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y); return s; }
const TW = 5.6, TH = 3.1;
const shape = rrect(TW, TH, 0.5); const hole = new THREE.Path(); hole.absarc(0, TH / 2 - 0.3, 0.14, 0, Math.PI * 2, true); shape.holes.push(hole);
const tagGeo = new THREE.ExtrudeGeometry(shape, { depth: 0.07, bevelEnabled: true, bevelThickness: 0.035, bevelSize: 0.05, bevelSegments: 4, curveSegments: 24 });
tagGeo.translate(0, 0, -0.035);
const steel = new THREE.MeshStandardMaterial({ color: 0x6c7270, metalness: 1, roughness: 0.42, envMap: envTex, envMapIntensity: 0.55 });
const tagMesh = new THREE.Mesh(tagGeo, steel);
// raised rim
const rimOuter = rrect(TW - 0.24, TH - 0.24, 0.4); const rimInner = rrect(TW - 0.44, TH - 0.44, 0.3); rimOuter.holes.push(new THREE.Path(rimInner.getPoints(24).reverse()));
const rimGeo = new THREE.ExtrudeGeometry(rimOuter, { depth: 0.022, bevelEnabled: false, curveSegments: 24 });
const rimMesh = new THREE.Mesh(rimGeo, steel); rimMesh.position.z = 0.07;
// engraved plate
function engrave() {
  const W = 1600, H = 880; const c = document.createElement("canvas"); c.width = W; c.height = H; const g = c.getContext("2d");
  const b = document.createElement("canvas"); b.width = W; b.height = H; const bg = b.getContext("2d"); bg.fillStyle = "#fff"; bg.fillRect(0, 0, W, H);
  const draw = (ctx, fill, off) => {
    ctx.textAlign = "center"; ctx.textBaseline = "alphabetic"; ctx.fillStyle = fill; ctx.letterSpacing = "6px";
    ctx.font = '700 250px "Barlow Condensed"'; ctx.fillText("MOHAMMED", W / 2 + off, 300 + off);
    ctx.font = '700 205px "Barlow Condensed"'; ctx.fillText("NAYEEMUDDIN", W / 2 + off, 520 + off);
    ctx.letterSpacing = "10px"; ctx.font = '600 78px "Barlow Condensed"'; ctx.fillText("AI INFRASTRUCTURE / MLOPS", W / 2 + off, 650 + off);
    ctx.font = '600 70px "Barlow Condensed"'; ctx.fillText("THD // GERMANY  ·  OPERATOR 01", W / 2 + off, 750 + off);
  };
  draw(g, "rgba(255,255,255,.55)", 3); draw(g, "rgba(30,31,30,.95)", 0);
  draw(bg, "#000", 0);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  const bt = new THREE.CanvasTexture(b); return { t, bt };
}
const { t: txTex, bt: bumpTex } = engrave();
const plate = new THREE.Mesh(new THREE.PlaneGeometry(TW - 0.7, (TW - 0.7) * 880 / 1600), new THREE.MeshStandardMaterial({ map: txTex, bumpMap: bumpTex, bumpScale: 3, transparent: true, metalness: 0.85, roughness: 0.5, envMap: envTex, envMapIntensity: 0.9 }));
plate.position.set(0, -0.12, 0.1);
const tag = new THREE.Group(); tag.add(tagMesh, rimMesh, plate);
// chain
const chain = new THREE.Group(); const linkGeo = new THREE.TorusGeometry(0.11, 0.028, 8, 16); const linkN = 22;
for (let i = 0; i < linkN; i++) { const l = new THREE.Mesh(linkGeo, steel); l.scale.set(1, 1.5, 1); l.position.y = i * 0.2; l.rotation.y = (i % 2) * Math.PI / 2; chain.add(l); }
const pivot = new THREE.Group(); pivot.position.set(-2.6, 9.3, 0.5); pivot.scale.setScalar(0.82); scene.add(pivot); pivot.add(tagGroup);
tagGroup.position.set(0, 0, 0);
chain.position.y = -linkN * 0.2 + 0.1; tagGroup.add(chain);
tag.position.set(0, -linkN * 0.2 - TH / 2 + 0.55, 0); tagGroup.add(tag);
// ring clip
const clip = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.035, 10, 24), steel); clip.position.set(0, -linkN * 0.2 + 0.55 + 0.08, 0); tagGroup.add(clip);

// ---- animate ----
const wrap = (v, lo, hi) => { const r = hi - lo; return ((((v - lo) % r) + r) % r) + lo; };
let T = 0, last = performance.now(), raf = 0, disposed = false;
function frame() {
  if (disposed) return;
  if (opts.isVisible && !opts.isVisible()) { last = performance.now(); raf = requestAnimationFrame(frame); return; }
  const now = performance.now(); const dt = Math.min((now - last) / 1000, 0.05); last = now; T += dt;
  for (const L of layers) for (const b of L.items) b.position.x = wrap(b.userData.x0 - T * L.speed, -L.total / 2 - 20, L.total / 2 + 20);
  rt.offset.x = (T * 0.33) % 1;
  for (const p of props) { p.position.x -= dt * 11; if (p.position.x < -26) p.position.x = 26; }
  car.position.x = wrap(-6 - T * 3.6, -45, 45); carFire.position.x = car.position.x; carFire.material.opacity = 0.75 + Math.sin(T * 17) * 0.15 + Math.sin(T * 7.3) * 0.1;
  for (const s of smokes) { s.position.x += s.userData.vx * dt; s.position.y += s.userData.vy * dt; if (s.position.x < -46) s.position.x = 46; if (s.position.y > 15) s.position.y = 3; }
  const p = eGeo.attributes.position.array; for (let i = 0; i < EN; i++) { p[i * 3] += eVel[i * 3] * dt * 4; p[i * 3 + 1] += eVel[i * 3 + 1] * dt; if (p[i * 3] < -24) p[i * 3] = 24; if (p[i * 3 + 1] > 14) p[i * 3 + 1] = 0; } eGeo.attributes.position.needsUpdate = true;
  for (const t of tracers) { t.position.x += t.userData.v * dt; if (Math.abs(t.position.x) > 40) t.position.x = -Math.sign(t.userData.v) * 40; }
  glows.forEach((g, i) => { g.material.opacity = 0.55 + Math.sin(T * (1.3 + i * 0.37) + i) * 0.2; });
  // operator run cycle
  const ph = T * 9.5;
  hips.position.y = 1.03 + Math.abs(Math.sin(ph)) * 0.075;
  legs.forEach((l, i) => { const o = ph + i * Math.PI; l.root.rotation.z = Math.sin(o) * 0.85; l.knee.rotation.z = -(Math.max(0, -Math.sin(o + 0.7)) * 1.35 + 0.18); });
  arms.forEach((a, i) => { const o = ph + i * Math.PI + Math.PI; a.root.rotation.z = Math.sin(o) * 0.55 - 0.15; a.knee.rotation.z = 1.25 + Math.max(0, Math.sin(o)) * 0.3; });
  torso.rotation.z = -0.22 + Math.sin(ph * 2) * 0.015; head.rotation.z = 0.12;
  // tag swing
  pivot.rotation.z = Math.sin(T * 0.9) * 0.045 + 0.02; tagGroup.rotation.y = Math.sin(T * 0.6) * 0.14 - 0.1; tag.rotation.z = Math.sin(T * 1.7) * 0.012;
  tagLight.intensity = 36 + Math.sin(T * 9) * 5;
  camera.position.x = Math.sin(T * 0.4) * 0.25; camera.position.y = 1.5 + Math.sin(T * 0.7) * 0.06; camera.lookAt(look);
  renderer.render(scene, camera);
  window.__frames = (window.__frames || 0) + 1;
  raf = requestAnimationFrame(frame);
}
const onResize = () => { renderer.setSize(size().w, size().h); camera.aspect = size().w / size().h; camera.updateProjectionMatrix(); };
addEventListener("resize", onResize);
if (opts.still) { T = 2.4; disposed = false; frame(); disposed = true; } else frame();
return () => { disposed = true; cancelAnimationFrame(raf); removeEventListener("resize", onResize); renderer.dispose(); pmrem.dispose(); };

}
