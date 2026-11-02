import * as THREE from "three";
import type { SectionId } from "@/lib/hud-store";

// Original equipment modelled in code and attached to the base mesh's bones.
// Everything here is authored in WORLD space at the bind pose (character faces +z,
// y up), then each piece follows its bone by the bone's rotation since bind.

export type Gear = {
  group: THREE.Group;
  pose: { armAngle: number; foreAngle: number; worldYawSign: number };
  update: (t: number) => void;
  anchorWorld: (id: SectionId, out: THREE.Vector3) => THREE.Vector3;
  dispose: () => void;
};

type Item = {
  obj: THREE.Object3D;
  bone: THREE.Object3D;
  offset: THREE.Vector3; // world offset from the bone at bind pose
  restQ: THREE.Quaternion; // bone world rotation at bind pose
  baseQ: THREE.Quaternion; // object's own rotation at bind pose
  mode: "full" | "position";
};

const _p = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _d = new THREE.Quaternion();
const _inv = new THREE.Quaternion();

export function buildGear(
  _root: THREE.Object3D,
  bones: Record<string, THREE.Object3D>,
  B: Record<string, string>,
): Gear {
  const group = new THREE.Group();
  group.name = "operator-gear";
  const items: Item[] = [];
  const disposables: { dispose: () => void }[] = [];

  const metal = new THREE.MeshStandardMaterial({ color: "#0f2229", roughness: 0.5, metalness: 0.75 });
  const matte = new THREE.MeshStandardMaterial({ color: "#0b171c", roughness: 0.85, metalness: 0.2 });
  const glow = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.15, 1.1, 1.3), toneMapped: false });
  const lensGlow = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.1, 0.55, 0.65), toneMapped: false });
  disposables.push(metal, matte, glow, lensGlow);

  const worldOf = (name: string) => bones[name].getWorldPosition(new THREE.Vector3());
  const worldQ = (name: string) => bones[name].getWorldQuaternion(new THREE.Quaternion());

  function add(
    obj: THREE.Object3D,
    boneName: string,
    worldPos: THREE.Vector3,
    mode: Item["mode"] = "full",
  ) {
    const bone = bones[boneName];
    if (!bone) return;
    obj.position.copy(worldPos);
    group.add(obj);
    items.push({
      obj,
      bone,
      offset: worldPos.clone().sub(worldOf(boneName)),
      restQ: worldQ(boneName),
      baseQ: obj.quaternion.clone(),
      mode,
    });
  }

  function mesh(geo: THREE.BufferGeometry, mat: THREE.Material) {
    disposables.push(geo);
    return new THREE.Mesh(geo, mat);
  }

  const headBase = worldOf(B.head);
  const spineBase = worldOf(B.spine2);

  // ---- Head: comms headset cups, antenna ----
  for (const s of [-1, 1]) {
    const cup = mesh(new THREE.CylinderGeometry(0.044, 0.044, 0.04, 20), metal);
    cup.rotation.z = Math.PI / 2;
    add(cup, B.head, new THREE.Vector3(s * 0.112, headBase.y + 0.1, headBase.z + 0.055));
    const ring = mesh(new THREE.TorusGeometry(0.036, 0.004, 8, 28), glow);
    ring.rotation.y = Math.PI / 2;
    add(ring, B.head, new THREE.Vector3(s * 0.134, headBase.y + 0.1, headBase.z + 0.055));
  }
  const antenna = mesh(new THREE.CylinderGeometry(0.0045, 0.0045, 0.18, 8), matte);
  antenna.rotation.x = -0.18;
  add(antenna, B.head, new THREE.Vector3(0.075, headBase.y + 0.26, headBase.z - 0.04));
  const antennaTip = mesh(new THREE.SphereGeometry(0.008, 10, 10), glow);
  add(antennaTip, B.head, new THREE.Vector3(0.075, headBase.y + 0.35, headBase.z - 0.055));

  // ---- Head: night-vision mount and flipped-up monocular on the helmet brow ----
  const mount = mesh(new THREE.BoxGeometry(0.075, 0.032, 0.05), metal);
  add(mount, B.head, new THREE.Vector3(0, headBase.y + 0.225, headBase.z + 0.11));
  const tube = mesh(new THREE.CylinderGeometry(0.022, 0.026, 0.085, 18), metal);
  tube.rotation.x = Math.PI / 2 - 0.5;
  add(tube, B.head, new THREE.Vector3(0, headBase.y + 0.255, headBase.z + 0.14));
  const lens = mesh(new THREE.CircleGeometry(0.017, 20), lensGlow);
  lens.rotation.x = -0.5;
  add(lens, B.head, new THREE.Vector3(0, headBase.y + 0.2785, headBase.z + 0.18));

  // ---- Chest rig: plate carrier trim, three magazine-style pouches, shoulder lamps ----
  for (let i = -1; i <= 1; i++) {
    const pouch = mesh(new THREE.BoxGeometry(0.066, 0.1, 0.045), matte);
    add(pouch, B.spine2, new THREE.Vector3(i * 0.078, spineBase.y - 0.1, spineBase.z + 0.135));
    const strap = mesh(new THREE.BoxGeometry(0.066, 0.008, 0.048), glow);
    add(strap, B.spine2, new THREE.Vector3(i * 0.078, spineBase.y - 0.056, spineBase.z + 0.135));
  }
  const badge = mesh(new THREE.BoxGeometry(0.1, 0.034, 0.012), metal);
  add(badge, B.spine2, new THREE.Vector3(-0.1, spineBase.y + 0.07, spineBase.z + 0.145));
  const badgeLine = mesh(new THREE.BoxGeometry(0.07, 0.004, 0.014), glow);
  add(badgeLine, B.spine2, new THREE.Vector3(-0.1, spineBase.y + 0.07, spineBase.z + 0.147));
  for (const s of [-1, 1]) {
    const lamp = mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.028, 14), metal);
    add(lamp, s < 0 ? B.rShoulder : B.lShoulder, new THREE.Vector3(s * 0.19, worldOf(B.lShoulder).y + 0.085, worldOf(B.lShoulder).z));
    const lampLens = mesh(new THREE.CircleGeometry(0.011, 14), glow);
    lampLens.rotation.x = -Math.PI / 2;
    add(lampLens, s < 0 ? B.rShoulder : B.lShoulder, new THREE.Vector3(s * 0.19, worldOf(B.lShoulder).y + 0.1, worldOf(B.lShoulder).z));
  }

  // ---- Tablet held in the character's left hand (world +x side) ----
  const tablet = new THREE.Group();
  const body = mesh(new THREE.BoxGeometry(0.25, 0.17, 0.014), metal);
  tablet.add(body);
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 340;
  const ctx = canvas.getContext("2d")!;
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  disposables.push(tex);
  const screenMat = new THREE.MeshBasicMaterial({ map: tex, toneMapped: false });
  disposables.push(screenMat);
  const screen = mesh(new THREE.PlaneGeometry(0.232, 0.152), screenMat);
  screen.position.z = 0.0075;
  tablet.add(screen);
  tablet.rotation.set(-0.22, -0.28, 0.06);
  const handBase = worldOf(B.lHand);
  add(tablet, B.lHand, new THREE.Vector3(handBase.x - 0.015, handBase.y + 0.09, handBase.z + 0.145), "position");

  let lastDraw = -1;
  function drawScreen(t: number) {
    ctx.fillStyle = "#04141b";
    ctx.fillRect(0, 0, 512, 340);
    ctx.strokeStyle = "rgba(56,200,216,0.35)";
    ctx.lineWidth = 2;
    ctx.strokeRect(10, 10, 492, 320);
    ctx.fillStyle = "#38c8d8";
    ctx.font = "600 26px monospace";
    ctx.fillText("NM // PORTFOLIO", 28, 52);
    ctx.fillStyle = "rgba(56,200,216,0.55)";
    ctx.font = "500 18px monospace";
    ctx.fillText("SYSTEM ONLINE", 28, 80);
    for (let i = 0; i < 14; i++) {
      const h = 30 + 90 * Math.abs(Math.sin(t * 1.4 + i * 0.7)) * (0.5 + 0.5 * Math.sin(i * 1.3));
      ctx.fillStyle = i % 5 === 0 ? "#b8374a" : "rgba(56,200,216,0.8)";
      ctx.fillRect(34 + i * 33, 300 - h, 20, h);
    }
    ctx.strokeStyle = "rgba(217,236,230,0.5)";
    ctx.beginPath();
    for (let x = 0; x < 460; x += 4) {
      const y = 140 + Math.sin(x * 0.04 + t * 3) * 14 + Math.sin(x * 0.11 - t) * 6;
      if (x === 0) ctx.moveTo(30 + x, y);
      else ctx.lineTo(30 + x, y);
    }
    ctx.stroke();
    tex.needsUpdate = true;
  }
  drawScreen(0);

  function update(t: number) {
    for (const it of items) {
      it.bone.getWorldPosition(_p);
      if (it.mode === "full") {
        // delta = rotation now * inverse(rotation at bind pose)
        it.bone.getWorldQuaternion(_q);
        _d.copy(_q).multiply(_inv.copy(it.restQ).invert());
        it.obj.position.copy(it.offset).applyQuaternion(_d).add(_p);
        it.obj.quaternion.copy(_d).multiply(it.baseQ);
      } else {
        it.obj.position.copy(it.offset).add(_p);
        it.obj.position.y += Math.sin(t * 1.1) * 0.003;
      }
    }
    if (t - lastDraw > 0.09) {
      lastDraw = t;
      drawScreen(t);
    }
  }

  function anchorWorld(id: SectionId, out: THREE.Vector3) {
    switch (id) {
      case "projects":
        return bones[B.head].getWorldPosition(out).add(_p.set(-0.09, 0.2, 0.05));
      case "experience":
        return bones[B.spine2].getWorldPosition(out).add(_p.set(-0.11, 0.0, 0.16));
      case "education":
        return bones[B.rArm].getWorldPosition(out).add(_p.set(-0.01, 0.07, 0.03));
      case "contact":
        return bones[B.hips].getWorldPosition(out).add(_p.set(-0.16, 0.22, 0.14));
      case "skills":
      default:
        return tablet.getWorldPosition(out);
    }
  }

  return {
    group,
    pose: { armAngle: -0.28, foreAngle: -1.3, worldYawSign: 1 },
    update,
    anchorWorld,
    dispose: () => disposables.forEach((d) => d.dispose()),
  };
}
