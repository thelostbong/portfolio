// Vanilla entry for the single-file preview: the same hero scene and crosshair as the
// Next components, wired up without React so the server-rendered HTML works as is.
import { initWarzone } from "../src/lib/warzone-scene.js";

const section = document.getElementById("operator");
const canvas = section.querySelector("canvas");
let visible = true;
new IntersectionObserver(([e]) => (visible = e.isIntersecting)).observe(section);
const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
initWarzone(canvas, { still, isVisible: () => visible }).catch((e) => {
  console.warn("[hero] scene failed, using poster", e);
  canvas.classList.add("hidden");
});

const el = document.getElementById("crosshair");
if (el && matchMedia("(pointer: fine)").matches) {
  document.documentElement.classList.add("has-crosshair");
  el.style.display = "block";
  let mx = innerWidth * 0.62, my = innerHeight * 0.46, tx = mx, ty = my, lx = mx, ly = my, spread = 0, hit = 0;
  let last = performance.now();
  addEventListener("mousemove", (e) => {
    tx = e.clientX; ty = e.clientY;
    el.classList.toggle("lock", !!(e.target.closest && e.target.closest("a, button, summary")));
  });
  addEventListener("mousedown", () => {
    el.classList.add("hit"); spread += 14; clearTimeout(hit);
    hit = setTimeout(() => el.classList.remove("hit"), 140);
  });
  const tick = (now) => {
    const dt = Math.max((now - last) / 1000, 0.001); last = now;
    mx += (tx - mx) * Math.min(1, dt * 30); my += (ty - my) * Math.min(1, dt * 30);
    spread += (Math.min(18, Math.hypot(tx - lx, ty - ly) / dt / 90) - spread) * Math.min(1, dt * 8);
    lx = tx; ly = ty;
    el.style.transform = "translate(" + mx + "px," + my + "px)";
    el.style.setProperty("--s", spread.toFixed(1) + "px");
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}
