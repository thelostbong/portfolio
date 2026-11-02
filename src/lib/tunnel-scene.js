// @ts-nocheck
// Scroll-driven tunnel for the Service Record. One ring gate per role; the camera flies
// down the tunnel as the pinned section scrolls. Plain three.js, same approach as the hero.
import * as THREE from "three";

const NIGHT = 0x0a0b09;
const STEEL = 0xa7adb0;
const EMBER = 0xf0561d;
const HAZARD = 0xe7b73c;

const RING_COUNT = 36;
const RING_SPACING = 6;
const RADIUS = 3.2;
const LENGTH = RING_COUNT * RING_SPACING;
const TRAVEL = LENGTH - 12; // how far the camera flies

export const gateProgress = (k, n) => (k + 1) / (n + 1);

function glowTexture(color) {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d");
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  const col = new THREE.Color(color);
  const rgb = `${Math.round(col.r * 255)},${Math.round(col.g * 255)},${Math.round(col.b * 255)}`;
  grad.addColorStop(0, `rgba(${rgb},0.55)`);
  grad.addColorStop(0.3, `rgba(${rgb},0.12)`);
  grad.addColorStop(1, `rgba(${rgb},0)`);
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export async function initTunnel(canvas, opts = {}) {
  const { gates = 3, getProgress = () => 0, isVisible = () => true, lite = false } = opts;
  const host = canvas.parentElement;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !lite, alpha: false, powerPreference: "high-performance" });
  renderer.setClearColor(NIGHT, 1);
  const maxDpr = lite ? 1.25 : 2;

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(NIGHT, 8, 70);
  const camera = new THREE.PerspectiveCamera(62, 1, 0.1, 120);

  // Shell rings
  const ringGeo = new THREE.TorusGeometry(RADIUS, 0.028, 6, 72);
  const matSteel = new THREE.MeshBasicMaterial({ color: STEEL, transparent: true, opacity: 0.55 });
  const matEmber = new THREE.MeshBasicMaterial({ color: EMBER, transparent: true, opacity: 0.9 });
  const gateIdx = new Set(Array.from({ length: gates }, (_, k) => Math.round(gateProgress(k, gates) * TRAVEL / RING_SPACING)));
  for (let i = 0; i < RING_COUNT; i++) {
    if (gateIdx.has(i)) continue; // gates get their own heavier ring
    const m = new THREE.Mesh(ringGeo, i % 6 === 0 ? matEmber : matSteel);
    m.position.z = -i * RING_SPACING;
    scene.add(m);
  }

  // Longitudinal ribs
  const ribPts = [];
  const RIBS = 16;
  for (let r = 0; r < RIBS; r++) {
    const a = (r / RIBS) * Math.PI * 2;
    ribPts.push(Math.cos(a) * RADIUS, Math.sin(a) * RADIUS, 6, Math.cos(a) * RADIUS, Math.sin(a) * RADIUS, -LENGTH - 20);
  }
  const ribGeo = new THREE.BufferGeometry();
  ribGeo.setAttribute("position", new THREE.Float32BufferAttribute(ribPts, 3));
  scene.add(new THREE.LineSegments(ribGeo, new THREE.LineBasicMaterial({ color: 0x3e4833, transparent: true, opacity: 0.7 })));

  // Gates: heavy hazard ring, four corner brackets, glow behind
  const gateGroup = [];
  const gateRingGeo = new THREE.TorusGeometry(RADIUS * 0.96, 0.09, 8, 96);
  const matHazard = new THREE.MeshBasicMaterial({ color: HAZARD });
  const glowTex = glowTexture(HAZARD);
  for (let k = 0; k < gates; k++) {
    const g = new THREE.Group();
    g.position.z = -gateProgress(k, gates) * TRAVEL;
    g.add(new THREE.Mesh(gateRingGeo, matHazard));
    for (let b = 0; b < 4; b++) {
      const a = (b / 4) * Math.PI * 2 + Math.PI / 4;
      const bracket = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.06, 0.06), matHazard);
      bracket.position.set(Math.cos(a) * (RADIUS * 0.96 - 0.35), Math.sin(a) * (RADIUS * 0.96 - 0.35), 0);
      bracket.rotation.z = a;
      g.add(bracket);
    }
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.2 }));
    glow.scale.setScalar(RADIUS * 1.5);
    glow.position.z = -0.4;
    g.add(glow);
    scene.add(g);
    gateGroup.push({ g, glow });
  }

  // Embers drifting in the tunnel
  const EMB = lite ? 120 : 260;
  const embPos = new Float32Array(EMB * 3);
  const embSeed = [];
  for (let i = 0; i < EMB; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = Math.sqrt(Math.random()) * (RADIUS - 0.3);
    embPos[i * 3] = Math.cos(a) * r;
    embPos[i * 3 + 1] = Math.sin(a) * r;
    embPos[i * 3 + 2] = -Math.random() * LENGTH;
    embSeed.push(Math.random() * 6.28);
  }
  const embGeo = new THREE.BufferGeometry();
  embGeo.setAttribute("position", new THREE.BufferAttribute(embPos, 3));
  const embers = new THREE.Points(embGeo, new THREE.PointsMaterial({ color: EMBER, size: 0.07, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false }));
  scene.add(embers);

  // Speed lines: short streaks in a ring around the camera path, length follows scroll speed
  const LINES = lite ? 60 : 140;
  const lineBase = [];
  for (let i = 0; i < LINES; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = RADIUS * (0.45 + Math.random() * 0.5);
    lineBase.push({ x: Math.cos(a) * r, y: Math.sin(a) * r, z: Math.random() * 80 });
  }
  const linePos = new Float32Array(LINES * 6);
  const lineGeo = new THREE.BufferGeometry();
  lineGeo.setAttribute("position", new THREE.BufferAttribute(linePos, 3));
  const lineMat = new THREE.LineBasicMaterial({ color: 0xe7e4d8, transparent: true, opacity: 0 });
  const speedLines = new THREE.LineSegments(lineGeo, lineMat);
  speedLines.frustumCulled = false;
  scene.add(speedLines);

  function resize() {
    const w = host.clientWidth || 1;
    const h = host.clientHeight || 1;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxDpr));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // On wide screens the card sits on the right, so push the tunnel centre left
    if (w / h > 1.2) camera.setViewOffset(w, h, w * 0.14, 0, w, h);
    else camera.clearViewOffset();
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener("resize", resize);

  let mx = 0, my = 0;
  const onMove = (e) => {
    mx = (e.clientX / window.innerWidth) * 2 - 1;
    my = (e.clientY / window.innerHeight) * 2 - 1;
  };
  window.addEventListener("mousemove", onMove);

  let raf = 0;
  let prevP = getProgress();
  let smoothP = prevP;
  let vel = 0;
  let last = performance.now();
  let swayX = 0, swayY = 0;

  function frame(now) {
    raf = requestAnimationFrame(frame);
    if (!isVisible()) { last = now; return; }
    const dt = Math.min(0.05, Math.max(0.001, (now - last) / 1000));
    last = now;
    const target = getProgress();
    smoothP += (target - smoothP) * Math.min(1, dt * 7); // ease the camera behind the scroll
    const v = Math.abs(smoothP - prevP) / dt;
    prevP = smoothP;
    vel += (Math.min(1, v * 2.2) - vel) * Math.min(1, dt * 6);

    const camZ = -smoothP * TRAVEL;
    swayX += (mx * 0.35 - swayX) * Math.min(1, dt * 3);
    swayY += (-my * 0.22 - swayY) * Math.min(1, dt * 3);
    const t = now * 0.001;
    camera.position.set(swayX + Math.sin(t * 0.7) * 0.05, swayY + Math.cos(t * 0.9) * 0.04, camZ);
    camera.lookAt(swayX * 0.4, swayY * 0.4, camZ - 10);
    camera.fov = 62 + vel * 8; // slight push in the fov while moving fast
    camera.updateProjectionMatrix();

    // Gate glow pulses when the camera is near
    for (let k = 0; k < gateGroup.length; k++) {
      const d = Math.abs(smoothP - gateProgress(k, gates));
      const near = Math.max(0, 1 - d / 0.12);
      gateGroup[k].glow.material.opacity = 0.08 + near * 0.22;
    }

    // Speed lines wrap around the camera
    for (let i = 0; i < LINES; i++) {
      const b = lineBase[i];
      const z0 = camZ - 2 - ((((b.z + camZ) % 80) + 80) % 80); // fixed in the world, wrapped to the 80 units ahead of the camera
      const len = 0.3 + vel * 3.2;
      linePos[i * 6] = b.x; linePos[i * 6 + 1] = b.y; linePos[i * 6 + 2] = z0;
      linePos[i * 6 + 3] = b.x; linePos[i * 6 + 4] = b.y; linePos[i * 6 + 5] = z0 - len;
    }
    lineGeo.attributes.position.needsUpdate = true;
    lineMat.opacity = Math.min(0.75, vel * 0.9);

    // Embers wobble
    const pa = embGeo.attributes.position;
    for (let i = 0; i < EMB; i++) {
      pa.array[i * 3 + 1] += Math.sin(t + embSeed[i]) * 0.0016;
    }
    pa.needsUpdate = true;

    renderer.render(scene, camera);
  }
  raf = requestAnimationFrame(frame);

  return () => {
    cancelAnimationFrame(raf);
    window.removeEventListener("resize", resize);
    window.removeEventListener("mousemove", onMove);
    scene.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose()); });
    glowTex.dispose();
    renderer.dispose();
  };
}
