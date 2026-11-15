"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { anchors, clearZone, useHud, type SectionId } from "@/lib/hud-store";

// Landing background: a GPU particle cloud that settles onto a sculpted ring and is
// stirred by the cursor through a small fluid simulation. Everything runs in shaders:
// one pass moves the particles, eight passes run the fluid, one pass draws the points.

const FLUID = {
  sim: 256,
  dye: 512,
  velocityDissipation: 0.98,
  densityDissipation: 0.97,
  pressureDissipation: 0.95,
  pressureIterations: 5,
  curl: 30,
  dt: 1 / 60,
};

// Where the cloud sits. On the landing it is centred between the callouts; inside a
// section it slides to the left third so the card rail has the rest of the screen.
const SHIFT_HOME = -0.42;
const SHIFT_SECTION = -2.3;
const SCALE_HOME = 5;
const SCALE_SECTION = 4.4;

// Points on the ring, in the cloud's own space, that the landing leader lines attach to.
const ANCHOR_LOCAL: Record<SectionId, [number, number, number]> = {
  projects: [-0.2, 0.17, 0.02],
  experience: [-0.27, -0.03, 0.02],
  education: [0.19, 0.19, 0.02],
  skills: [0.27, -0.05, 0.02],
};

const QUAD_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const SPLAT_FRAG = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D uTarget;
  uniform float uAspect;
  uniform vec3 uColor;
  uniform vec2 uFrom;
  uniform vec2 uTo;
  uniform float uRadius;
  void main() {
    vec2 a = vec2(uAspect, 1.0);
    vec2 p = (vUv - uFrom) * a;
    vec2 ab = (uTo - uFrom) * a;
    float h = clamp(dot(p, ab) / max(dot(ab, ab), 1e-6), 0.0, 1.0);
    vec2 d = p - ab * h;
    vec3 splat = exp(-dot(d, d) / (uRadius * uRadius)) * uColor;
    gl_FragColor = vec4(texture2D(uTarget, vUv).xyz + splat, 1.0);
  }
`;

const CURL_FRAG = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D uVelocity;
  uniform vec2 uTexel;
  void main() {
    float L = texture2D(uVelocity, vUv - vec2(uTexel.x, 0.0)).y;
    float R = texture2D(uVelocity, vUv + vec2(uTexel.x, 0.0)).y;
    float T = texture2D(uVelocity, vUv + vec2(0.0, uTexel.y)).x;
    float B = texture2D(uVelocity, vUv - vec2(0.0, uTexel.y)).x;
    gl_FragColor = vec4(0.5 * (R - L - T + B), 0.0, 0.0, 1.0);
  }
`;

const VORTICITY_FRAG = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D uVelocity;
  uniform sampler2D uCurl;
  uniform vec2 uTexel;
  uniform float uCurlStrength;
  uniform float uDt;
  void main() {
    float L = texture2D(uCurl, vUv - vec2(uTexel.x, 0.0)).x;
    float R = texture2D(uCurl, vUv + vec2(uTexel.x, 0.0)).x;
    float T = texture2D(uCurl, vUv + vec2(0.0, uTexel.y)).x;
    float B = texture2D(uCurl, vUv - vec2(0.0, uTexel.y)).x;
    float C = texture2D(uCurl, vUv).x;
    vec2 force = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L));
    force /= length(force) + 0.0001;
    force *= uCurlStrength * C;
    force.y *= -1.0;
    vec2 vel = texture2D(uVelocity, vUv).xy;
    gl_FragColor = vec4(vel + force * uDt, 0.0, 1.0);
  }
`;

const DIVERGENCE_FRAG = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D uVelocity;
  uniform vec2 uTexel;
  void main() {
    float L = texture2D(uVelocity, vUv - vec2(uTexel.x, 0.0)).x;
    float R = texture2D(uVelocity, vUv + vec2(uTexel.x, 0.0)).x;
    float T = texture2D(uVelocity, vUv + vec2(0.0, uTexel.y)).y;
    float B = texture2D(uVelocity, vUv - vec2(0.0, uTexel.y)).y;
    gl_FragColor = vec4(0.5 * (R - L + T - B), 0.0, 0.0, 1.0);
  }
`;

const CLEAR_FRAG = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D uTexture;
  uniform float uValue;
  void main() {
    gl_FragColor = uValue * texture2D(uTexture, vUv);
  }
`;

const PRESSURE_FRAG = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D uPressure;
  uniform sampler2D uDivergence;
  uniform vec2 uTexel;
  void main() {
    float L = texture2D(uPressure, vUv - vec2(uTexel.x, 0.0)).x;
    float R = texture2D(uPressure, vUv + vec2(uTexel.x, 0.0)).x;
    float T = texture2D(uPressure, vUv + vec2(0.0, uTexel.y)).x;
    float B = texture2D(uPressure, vUv - vec2(0.0, uTexel.y)).x;
    float div = texture2D(uDivergence, vUv).x;
    gl_FragColor = vec4((L + R + B + T - div) * 0.25, 0.0, 0.0, 1.0);
  }
`;

const GRADIENT_FRAG = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D uPressure;
  uniform sampler2D uVelocity;
  uniform vec2 uTexel;
  void main() {
    float L = texture2D(uPressure, vUv - vec2(uTexel.x, 0.0)).x;
    float R = texture2D(uPressure, vUv + vec2(uTexel.x, 0.0)).x;
    float T = texture2D(uPressure, vUv + vec2(0.0, uTexel.y)).x;
    float B = texture2D(uPressure, vUv - vec2(0.0, uTexel.y)).x;
    vec2 vel = texture2D(uVelocity, vUv).xy - vec2(R - L, T - B);
    gl_FragColor = vec4(vel, 0.0, 1.0);
  }
`;

const ADVECT_FRAG = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D uVelocity;
  uniform sampler2D uSource;
  uniform vec2 uTexel;
  uniform float uDt;
  uniform float uDissipation;
  void main() {
    vec2 coord = vUv - uDt * texture2D(uVelocity, vUv).xy * uTexel;
    gl_FragColor = vec4(uDissipation * texture2D(uSource, coord).xyz, 1.0);
  }
`;

// The sculpted form: a ring with one large opening whose tube swells into soft lobes
// and rides up and down as it goes round, mirrored front to back with a soft seam.
const SDF_GLSL = /* glsl */ `
  float sdfShape(vec3 p) {
    if (length(p) > 0.8) return length(p) - 0.7;
    p.z = sqrt(p.z * p.z + 0.0215) - sqrt(0.012);
    p.y += 0.55 * p.x * p.x - 0.03;
    float a = atan(p.y, p.x);
    float ring = 0.245 + 0.035 * sin(a * 3.0 + 0.6);
    float tube = 0.082 + 0.03 * sin(a * 2.0 + 1.9) + 0.012 * sin(a * 5.0);
    float lift = 0.085 + 0.06 * sin(a * 2.0 - 0.7);
    vec2 q = vec2(length(p.xy) - ring, p.z - lift);
    return (length(q) - tube) * 0.8;
  }
  vec3 sdfNormal(vec3 p) {
    const vec2 e = vec2(0.001, 0.0);
    return vec3(
      sdfShape(p + e.xyy) - sdfShape(p - e.xyy),
      sdfShape(p + e.yxy) - sdfShape(p - e.yxy),
      sdfShape(p + e.yyx) - sdfShape(p - e.yyx)
    ) / (2.0 * e.x);
  }
`;

const SIM_FRAG = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D uPositions;
  uniform sampler2D uOrigin;
  uniform sampler2D uHome;
  uniform float uHomeStrength;
  uniform sampler2D uFluidVelocity;
  uniform sampler2D uFluidDensity;
  uniform mat4 uViewProjection;
  uniform mat4 uModel;
  uniform mat3 uFlowBasis;
  uniform float uTime;
  uniform float uHz;
  uniform float uMouseStrength;

  ${SDF_GLSL}

  vec3 potential(vec3 p) {
    return vec3(
      sin(p.y * 3.1 + 1.3) + sin(p.z * 4.7 + 0.4) * 0.5 + sin((p.x + p.z) * 2.3) * 0.7,
      sin(p.z * 2.9 + 2.1) + sin(p.x * 5.1 + 3.7) * 0.5 + sin((p.y + p.x) * 2.6) * 0.7,
      sin(p.x * 3.3 + 0.8) + sin(p.y * 4.3 + 5.2) * 0.5 + sin((p.z + p.y) * 2.1) * 0.7
    );
  }
  vec3 curlNoise(vec3 p) {
    const float e = 0.1;
    vec3 dx = potential(p + vec3(e, 0.0, 0.0)) - potential(p - vec3(e, 0.0, 0.0));
    vec3 dy = potential(p + vec3(0.0, e, 0.0)) - potential(p - vec3(0.0, e, 0.0));
    vec3 dz = potential(p + vec3(0.0, 0.0, e)) - potential(p - vec3(0.0, 0.0, e));
    return normalize(vec3(dy.z - dz.y, dz.x - dx.z, dx.y - dy.x) + 1e-5);
  }

  void main() {
    vec3 pos = texture2D(uPositions, vUv).xyz;
    vec3 origin = texture2D(uOrigin, vUv).xyz;

    if (length(pos) > 0.7) pos /= 2.0;
    pos += curlNoise(pos * 0.1 + uTime * 0.05) * 0.0005 * uHz;

    vec3 gradient = sdfNormal(pos);
    float sdf = sdfShape(pos);
    pos += cross(normalize(pos + 1e-5), normalize(gradient + 1e-5)) * 0.0005;
    // Each particle rides its own height above the surface: most sit on it, a few drift
    // well clear, so the form reads as a loose field of stars and not a solid skin.
    float h = fract(sin(dot(origin, vec3(12.9898, 78.233, 37.719))) * 43758.5453);
    float ride = h * h * h * 0.05 - 0.004;
    pos += -gradient * (sdf - ride) * 0.5;
    pos += (origin - pos) * 0.0002 * uHz;

    vec4 clip = uViewProjection * uModel * vec4(pos, 1.0);
    vec2 screenUv = clip.xy / clip.w * 0.5 + 0.5;
    vec2 vel = texture2D(uFluidVelocity, screenUv).xy;
    vel *= min(1.0, 90.0 / (length(vel) + 1e-4));
    vec3 flow = uFlowBasis * vec3(vel, 0.0);
    float mask = min(texture2D(uFluidDensity, screenUv).r, 1.0);
    pos += flow * 0.0001 * uHz * uMouseStrength * mask;

    // Heal: a particle that the cursor has carried off is drawn back to its resting
    // place on the surface. Close to home it is left alone, so the slow swirl carries on.
    vec3 away = texture2D(uHome, vUv).xyz - pos;
    pos += away * uHomeStrength * smoothstep(0.05, 0.2, length(away)) * min(uHz, 2.0);

    gl_FragColor = vec4(pos, 1.0);
  }
`;

const POINTS_VERT = /* glsl */ `
  attribute vec4 random;
  uniform sampler2D uPositions;
  uniform float uDpr;
  uniform vec4 uClear;
  uniform float uClearAmt;
  varying vec4 vRandom;
  varying float vScale;
  varying float vFade;
  void main() {
    vRandom = random;
    vec3 pos = texture2D(uPositions, position.xy).xyz;
    pos *= mix(1.0, 1.5, pow(random.y, 150.0));
    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    float dist = -mv.z;
    vScale = smoothstep(3.0, 15.0, dist) * mix(0.5, 1.0, random.z);
    gl_PointSize = 0.04 * uDpr * 2.0 * vScale * (1000.0 / dist);
    gl_Position = projectionMatrix * mv;
    // The stars behind the name are dimmed a little, so the letters stay easy to read.
    vec2 cd = (gl_Position.xy / gl_Position.w * 0.5 + 0.5 - uClear.xy) / uClear.zw;
    float cl = pow(pow(abs(cd.x), 4.0) + pow(abs(cd.y), 4.0), 0.25);
    vFade = 1.0 - uClearAmt * 0.6 * (1.0 - smoothstep(0.5, 1.6, cl));
  }
`;

const POINTS_FRAG = /* glsl */ `
  precision highp float;
  uniform float uTime;
  uniform float uGain;
  varying vec4 vRandom;
  varying float vScale;
  varying float vFade;

  float softLight(float b, float s) {
    return s < 0.5 ? b - (1.0 - 2.0 * s) * b * (1.0 - b) : b + (2.0 * s - 1.0) * (sqrt(b) - b);
  }
  float overlay(float b, float s) {
    return b < 0.5 ? 2.0 * b * s : 1.0 - 2.0 * (1.0 - b) * (1.0 - s);
  }

  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    if (dot(uv, uv) > 0.25 || vScale < 0.1) discard;

    // Most points are faint and a few are bright, like a star field.
    float mag = 0.25 + 0.75 * pow(vRandom.w, 4.0);
    vec3 color = vec3(mix(0.0, 0.2, vRandom.x)) * mag;
    color = mix(color, vec3(0.95, 0.72, 0.3), pow(vRandom.z, 100.0));
    color *= 0.5 + (0.4 + sin(uTime * 4.0 + vRandom.y * 20.0)) * pow(vRandom.z, 10.0) * 2.5;

    // Soft sphere shading, in place of a matcap texture: lit from the upper left,
    // with the sprite slowly turning so the grain shimmers.
    float turn = sin(uTime + vRandom.z * 20.0) * 0.5 + 1.0;
    vec2 r = mat2(cos(turn), -sin(turn), sin(turn), cos(turn)) * uv * 2.0;
    vec3 n = vec3(r, sqrt(max(1.0 - dot(r, r), 0.0)));
    float matcap = clamp(0.5 + 0.5 * dot(n, normalize(vec3(-0.45, 0.6, 0.66))), 0.0, 1.0);

    vec3 lit = vec3(softLight(color.r, matcap), softLight(color.g, matcap), softLight(color.b, matcap));
    color = mix(color, lit, 0.8);
    vec3 over = vec3(overlay(color.r, matcap), overlay(color.g, matcap), overlay(color.b, matcap));
    color = mix(color, over, 0.2);

    gl_FragColor = vec4(color * uGain * vFade, 1.0);
  }
`;

const NAME_VERT = /* glsl */ `
  attribute vec2 normal2;
  attribute vec4 seed;
  uniform vec4 uRect; // heading rectangle in px: x, y, w, h
  uniform vec2 uViewport;
  uniform sampler2D uFluidVelocity;
  uniform float uTime;
  uniform float uDpr;
  varying float vLife;
  varying vec4 vSeed;

  vec2 drift(vec2 p, float t) {
    // Divergence-free swirl, so the shed particles curl like the star field does.
    float a = sin(p.y * 0.021 + t * 0.6) + sin((p.x + p.y) * 0.013 - t * 0.4);
    float b = sin(p.x * 0.019 - t * 0.5) + sin((p.x - p.y) * 0.015 + t * 0.3);
    return vec2(a, -b);
  }

  void main() {
    vSeed = seed;
    // Most particles hug the outline; a share of them travel.
    float speed = mix(0.07, 0.22, seed.x);
    float life = fract(uTime * speed + seed.y);
    float reach = mix(0.3, 1.0, pow(seed.z, 1.6));
    float t = life * reach;
    vLife = life;

    vec2 home = uRect.xy + position.xy * uRect.zw;
    vec2 uv = vec2(home.x / uViewport.x, 1.0 - home.y / uViewport.y);
    vec2 flow = texture2D(uFluidVelocity, uv).xy;
    flow *= min(1.0, 60.0 / (length(flow) + 1e-4));

    vec2 p = home;
    p += normal2 * (0.6 + t * 8.0);
    p += drift(home + seed.xy * 40.0, uTime) * t * t * 46.0;
    p += vec2(0.0, -1.0) * t * t * 10.0;
    p += vec2(flow.x, -flow.y) * t * 0.6;

    gl_Position = vec4(p.x / uViewport.x * 2.0 - 1.0, 1.0 - p.y / uViewport.y * 2.0, 0.0, 1.0);
    gl_PointSize = uDpr * mix(1.0, 1.9, seed.w) * (1.0 - 0.35 * t);
  }
`;

const NAME_FRAG = /* glsl */ `
  precision highp float;
  uniform float uAlpha;
  varying float vLife;
  varying vec4 vSeed;
  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    if (dot(uv, uv) > 0.25) discard;
    // Faint on the outline, so the letters stay crisp; brightest just after leaving it.
    float fade = smoothstep(0.0, 0.22, vLife) * pow(1.0 - vLife, 1.3);
    vec3 color = mix(vec3(0.82), vec3(0.95, 0.72, 0.3), step(0.9, vSeed.w));
    gl_FragColor = vec4(color * fade * uAlpha * mix(0.3, 0.8, vSeed.z), 1.0);
  }
`;

type Double = { read: THREE.WebGLRenderTarget; write: THREE.WebGLRenderTarget; swap: () => void };

function target(size: number, type: THREE.TextureDataType, filter: THREE.MagnificationTextureFilter) {
  return new THREE.WebGLRenderTarget(size, size, {
    type,
    format: THREE.RGBAFormat,
    minFilter: filter,
    magFilter: filter,
    wrapS: THREE.ClampToEdgeWrapping,
    wrapT: THREE.ClampToEdgeWrapping,
    depthBuffer: false,
    stencilBuffer: false,
  });
}

function double(size: number, type: THREE.TextureDataType, filter: THREE.MagnificationTextureFilter): Double {
  const d: Double = {
    read: target(size, type, filter),
    write: target(size, type, filter),
    swap() {
      const t = d.read;
      d.read = d.write;
      d.write = t;
    },
  };
  return d;
}

const clampMap = (v: number, a: number, b: number, c: number, d: number) =>
  c + (d - c) * Math.min(1, Math.max(0, (v - a) / (b - a)));

export default function Scene() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const setReady = useHud.getState().setReady;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: "high-performance" });
    } catch {
      setReady(true);
      return;
    }
    const mobile = window.matchMedia("(max-width: 760px), (pointer: coarse)").matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    renderer.setPixelRatio(dpr);
    renderer.setClearColor(0x05070a, 1);
    renderer.autoClear = false;

    // ---- Fullscreen pass plumbing ----
    const quadScene = new THREE.Scene();
    const quadCamera = new THREE.Camera();
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
    quad.frustumCulled = false;
    quadScene.add(quad);
    const materials: THREE.ShaderMaterial[] = [];
    const pass = (fragmentShader: string, uniforms: Record<string, THREE.IUniform>) => {
      const m = new THREE.ShaderMaterial({ vertexShader: QUAD_VERT, fragmentShader, uniforms, depthTest: false, depthWrite: false });
      materials.push(m);
      return m;
    };
    const run = (material: THREE.ShaderMaterial, out: THREE.WebGLRenderTarget) => {
      quad.material = material;
      renderer.setRenderTarget(out);
      renderer.render(quadScene, quadCamera);
    };

    // ---- Fluid ----
    const HF = THREE.HalfFloatType;
    const simTexel = new THREE.Vector2(1 / FLUID.sim, 1 / FLUID.sim);
    const dyeTexel = new THREE.Vector2(1 / FLUID.dye, 1 / FLUID.dye);
    const velocity = double(FLUID.sim, HF, THREE.LinearFilter);
    const density = double(FLUID.dye, HF, THREE.LinearFilter);
    const pressure = double(FLUID.sim, HF, THREE.NearestFilter);
    const curlRT = target(FLUID.sim, HF, THREE.NearestFilter);
    const divergenceRT = target(FLUID.sim, HF, THREE.NearestFilter);

    const splatMat = pass(SPLAT_FRAG, {
      uTarget: { value: null },
      uAspect: { value: 1 },
      uColor: { value: new THREE.Vector3() },
      uFrom: { value: new THREE.Vector2() },
      uTo: { value: new THREE.Vector2() },
      uRadius: { value: 0.01 },
    });
    const curlMat = pass(CURL_FRAG, { uVelocity: { value: null }, uTexel: { value: simTexel } });
    const vorticityMat = pass(VORTICITY_FRAG, {
      uVelocity: { value: null },
      uCurl: { value: null },
      uTexel: { value: simTexel },
      uCurlStrength: { value: FLUID.curl },
      uDt: { value: FLUID.dt },
    });
    const divergenceMat = pass(DIVERGENCE_FRAG, { uVelocity: { value: null }, uTexel: { value: simTexel } });
    const clearMat = pass(CLEAR_FRAG, { uTexture: { value: null }, uValue: { value: FLUID.pressureDissipation } });
    const pressureMat = pass(PRESSURE_FRAG, { uPressure: { value: null }, uDivergence: { value: null }, uTexel: { value: simTexel } });
    const gradientMat = pass(GRADIENT_FRAG, { uPressure: { value: null }, uVelocity: { value: null }, uTexel: { value: simTexel } });
    const advectMat = pass(ADVECT_FRAG, {
      uVelocity: { value: null },
      uSource: { value: null },
      uTexel: { value: simTexel },
      uDt: { value: FLUID.dt },
      uDissipation: { value: 1 },
    });

    const stepFluid = () => {
      curlMat.uniforms.uVelocity.value = velocity.read.texture;
      run(curlMat, curlRT);

      vorticityMat.uniforms.uVelocity.value = velocity.read.texture;
      vorticityMat.uniforms.uCurl.value = curlRT.texture;
      run(vorticityMat, velocity.write);
      velocity.swap();

      divergenceMat.uniforms.uVelocity.value = velocity.read.texture;
      run(divergenceMat, divergenceRT);

      clearMat.uniforms.uTexture.value = pressure.read.texture;
      run(clearMat, pressure.write);
      pressure.swap();

      pressureMat.uniforms.uDivergence.value = divergenceRT.texture;
      for (let i = 0; i < FLUID.pressureIterations; i++) {
        pressureMat.uniforms.uPressure.value = pressure.read.texture;
        run(pressureMat, pressure.write);
        pressure.swap();
      }

      gradientMat.uniforms.uPressure.value = pressure.read.texture;
      gradientMat.uniforms.uVelocity.value = velocity.read.texture;
      run(gradientMat, velocity.write);
      velocity.swap();

      advectMat.uniforms.uTexel.value = simTexel;
      advectMat.uniforms.uVelocity.value = velocity.read.texture;
      advectMat.uniforms.uSource.value = velocity.read.texture;
      advectMat.uniforms.uDissipation.value = FLUID.velocityDissipation;
      run(advectMat, velocity.write);
      velocity.swap();

      advectMat.uniforms.uTexel.value = dyeTexel;
      advectMat.uniforms.uVelocity.value = velocity.read.texture;
      advectMat.uniforms.uSource.value = density.read.texture;
      advectMat.uniforms.uDissipation.value = FLUID.densityDissipation;
      run(advectMat, density.write);
      density.swap();
    };

    // ---- Cursor ----
    const mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2, px: 0, py: 0, moved: false, seen: false, lastSplat: 0 };
    const onPointer = (x: number, y: number) => {
      if (!mouse.seen) {
        mouse.px = x;
        mouse.py = y;
        mouse.seen = true;
      }
      mouse.x = x;
      mouse.y = y;
      mouse.moved = true;
    };
    const onMove = (e: PointerEvent) => onPointer(e.clientX, e.clientY);
    const onTouch = (e: TouchEvent) => {
      const t = e.touches[0];
      if (t) onPointer(t.clientX, t.clientY);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("touchstart", onTouch, { passive: true });
    window.addEventListener("touchmove", onTouch, { passive: true });

    const splat = (now: number) => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const dx = mouse.x - mouse.px;
      const dy = mouse.y - mouse.py;
      const len = Math.hypot(dx, dy);
      if (mouse.moved && len > 0.01) {
        const radius = clampMap(len, 0, 5, 0, 60) * 0.6 * (mobile ? 0.8 : 1);
        const mult = clampMap(len, 0, 15, 0, 10);
        const fresh = now - mouse.lastSplat > 50;
        const fromX = fresh ? mouse.x : mouse.px;
        const fromY = fresh ? mouse.y : mouse.py;
        splatMat.uniforms.uAspect.value = w / h;
        splatMat.uniforms.uFrom.value.set(fromX / w, 1 - fromY / h);
        splatMat.uniforms.uTo.value.set(mouse.x / w, 1 - mouse.y / h);
        splatMat.uniforms.uRadius.value = radius / 200 / 2.2;

        splatMat.uniforms.uTarget.value = velocity.read.texture;
        splatMat.uniforms.uColor.value.set(dx * mult, -dy * mult, 1);
        run(splatMat, velocity.write);
        velocity.swap();

        splatMat.uniforms.uTarget.value = density.read.texture;
        splatMat.uniforms.uColor.value.set(1, 1, 1);
        run(splatMat, density.write);
        density.swap();
        mouse.lastSplat = now;
      }
      mouse.px = mouse.x;
      mouse.py = mouse.y;
      mouse.moved = false;
    };

    // ---- Particles ----
    const side = mobile ? 128 : 512;
    const count = side * side;
    const originData = new Float32Array(count * 4);
    for (let i = 0; i < count; i++) {
      originData[i * 4] = Math.random() * 2 - 1;
      originData[i * 4 + 1] = Math.random() * 2 - 1;
      originData[i * 4 + 2] = Math.random() * 2 - 1;
      originData[i * 4 + 3] = 1;
    }
    const originTex = new THREE.DataTexture(originData, side, side, THREE.RGBAFormat, THREE.FloatType);
    originTex.needsUpdate = true;
    const positions = double(side, THREE.FloatType, THREE.NearestFilter);

    const copyMat = pass(CLEAR_FRAG, { uTexture: { value: originTex }, uValue: { value: 1 } });
    run(copyMat, positions.read);

    const simMat = pass(SIM_FRAG, {
      uPositions: { value: null },
      uOrigin: { value: originTex },
      uHome: { value: originTex },
      uHomeStrength: { value: 0 },
      uFluidVelocity: { value: null },
      uFluidDensity: { value: null },
      uViewProjection: { value: new THREE.Matrix4() },
      uModel: { value: new THREE.Matrix4() },
      uFlowBasis: { value: new THREE.Matrix3() },
      uTime: { value: 0 },
      uHz: { value: 1 },
      uMouseStrength: { value: 0.4 },
    });

    // Resting places: let the cloud settle once, untouched, and keep the result. The live
    // simulation still starts from the random positions, so the form gathers on screen.
    const home = double(side, THREE.FloatType, THREE.NearestFilter);
    run(copyMat, home.read);
    simMat.uniforms.uMouseStrength.value = 0;
    simMat.uniforms.uFluidVelocity.value = velocity.read.texture;
    simMat.uniforms.uFluidDensity.value = density.read.texture;
    for (let i = 0; i < 90; i++) {
      simMat.uniforms.uPositions.value = home.read.texture;
      run(simMat, home.write);
      home.swap();
    }
    simMat.uniforms.uHome.value = home.read.texture;
    simMat.uniforms.uHomeStrength.value = 0.045;
    simMat.uniforms.uMouseStrength.value = 0.4;

    const geometry = new THREE.BufferGeometry();
    const uvs = new Float32Array(count * 3);
    const randoms = new Float32Array(count * 4);
    for (let i = 0; i < count; i++) {
      uvs[i * 3] = ((i % side) + 0.5) / side;
      uvs[i * 3 + 1] = (Math.floor(i / side) + 0.5) / side;
      randoms[i * 4] = Math.random();
      randoms[i * 4 + 1] = Math.random();
      randoms[i * 4 + 2] = Math.random();
      randoms[i * 4 + 3] = Math.random();
    }
    geometry.setAttribute("position", new THREE.BufferAttribute(uvs, 3));
    geometry.setAttribute("random", new THREE.BufferAttribute(randoms, 4));

    const pointsMat = new THREE.ShaderMaterial({
      vertexShader: POINTS_VERT,
      fragmentShader: POINTS_FRAG,
      uniforms: {
        uPositions: { value: null },
        uTime: { value: 0 },
        uDpr: { value: dpr },
        uGain: { value: 1 },
        uClear: { value: new THREE.Vector4(0.5, 0.5, 0.2, 0.2) },
        uClearAmt: { value: 0 },
      },
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthTest: true,
      depthWrite: false,
    });
    const points = new THREE.Points(geometry, pointsMat);
    points.frustumCulled = false;

    const scene = new THREE.Scene();
    const group = new THREE.Group();
    const deg = THREE.MathUtils.degToRad;
    group.position.set(0.343 + SHIFT_HOME, 0.2, -1);
    group.rotation.set(deg(-28.4), deg(390), deg(4.92));
    group.scale.set(SCALE_HOME, SCALE_HOME, SCALE_HOME * 1.2);
    group.add(points);
    scene.add(group);

    // ---- Letter particles ----
    // Points seeded on the outlines of the name's letters. Each one peels off its edge,
    // rides the same flow the cursor stirs, fades, and starts again on the edge.
    const nameMat = new THREE.ShaderMaterial({
      vertexShader: NAME_VERT,
      fragmentShader: NAME_FRAG,
      uniforms: {
        uRect: { value: new THREE.Vector4() },
        uViewport: { value: new THREE.Vector2(1, 1) },
        uFluidVelocity: { value: null },
        uTime: { value: 0 },
        uAlpha: { value: 0 },
        uDpr: { value: dpr },
      },
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    });
    const nameGeometry = new THREE.BufferGeometry();
    const namePoints = new THREE.Points(nameGeometry, nameMat);
    namePoints.frustumCulled = false;
    const nameScene = new THREE.Scene();
    nameScene.add(namePoints);
    let nameReady = false;
    let disposed = false;

    const seedName = () => {
      const el = clearZone.el;
      if (!el || disposed) return;
      const r = el.getBoundingClientRect();
      if (r.width < 4 || r.height < 4) return;
      const cs = getComputedStyle(el);
      const ss = 3; // supersample so edges and their normals are clean
      const cw = Math.ceil(r.width * ss);
      const ch = Math.ceil(r.height * ss);
      const c = document.createElement("canvas");
      c.width = cw;
      c.height = ch;
      const ctx = c.getContext("2d", { willReadFrequently: true });
      if (!ctx) return;
      ctx.scale(ss, ss);
      ctx.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
      (ctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = cs.letterSpacing;
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#fff";
      const text = (el.textContent || "").toUpperCase();
      const tw = ctx.measureText(text).width;
      ctx.fillText(text, (r.width - tw) / 2 + parseFloat(cs.letterSpacing || "0") / 2, r.height / 2 + 1);
      const data = ctx.getImageData(0, 0, cw, ch).data;
      const alpha = (x: number, y: number) => (x < 0 || y < 0 || x >= cw || y >= ch ? 0 : data[(y * cw + x) * 4 + 3]);
      const edges: number[] = [];
      for (let y = 0; y < ch; y++) {
        for (let x = 0; x < cw; x++) {
          if (alpha(x, y) < 128) continue;
          const gx = alpha(x - 2, y) - alpha(x + 2, y);
          const gy = alpha(x, y - 2) - alpha(x, y + 2);
          const g = Math.hypot(gx, gy);
          if (g < 60) continue; // interior pixel
          edges.push(x / cw, y / ch, gx / g, gy / g);
        }
      }
      if (edges.length === 0) return;
      const n = mobile ? 2500 : 8000;
      const home = new Float32Array(n * 3);
      const normal = new Float32Array(n * 2);
      const seed = new Float32Array(n * 4);
      const total = edges.length / 4;
      for (let i = 0; i < n; i++) {
        const k = Math.floor(Math.random() * total) * 4;
        home[i * 3] = edges[k];
        home[i * 3 + 1] = edges[k + 1];
        normal[i * 2] = edges[k + 2];
        normal[i * 2 + 1] = edges[k + 3];
        seed[i * 4] = Math.random();
        seed[i * 4 + 1] = Math.random();
        seed[i * 4 + 2] = Math.random();
        seed[i * 4 + 3] = Math.random();
      }
      nameGeometry.setAttribute("position", new THREE.BufferAttribute(home, 3));
      nameGeometry.setAttribute("normal2", new THREE.BufferAttribute(normal, 2));
      nameGeometry.setAttribute("seed", new THREE.BufferAttribute(seed, 4));
      nameReady = true;
    };
    // Seed once the web font is in, and again when the heading changes size.
    let seedTimer = 0;
    const queueSeed = () => {
      window.clearTimeout(seedTimer);
      seedTimer = window.setTimeout(seedName, 150);
    };
    document.fonts.ready.then(queueSeed);
    window.addEventListener("resize", queueSeed);

    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 1000);
    const basePos = new THREE.Vector3(-1.17, 0, 6);
    camera.position.copy(basePos);
    camera.lookAt(0, 0, 0);

    const resize = () => {
      renderer.setSize(window.innerWidth, window.innerHeight, false);
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
    };
    resize();
    window.addEventListener("resize", resize);

    // ---- Frame loop ----
    const camTarget = new THREE.Vector3();
    const camRot = new THREE.Matrix4();
    const groupRotInv = new THREE.Matrix4();
    const flowBasis4 = new THREE.Matrix4();
    const v = new THREE.Vector3();
    let shift = SHIFT_HOME;
    let gain = 0.85;
    let clear = 0;
    let size = SCALE_HOME;
    let frames = 0;
    let last = performance.now();
    let raf = 0;
    const t0 = last;

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const time = (now - t0) / 1000;
      const w = window.innerWidth;
      const h = window.innerHeight;
      const active = useHud.getState().active;

      // Gaze: the camera leans a little with the cursor.
      const mx = (mouse.x / w) * 2 - 1;
      const my = (mouse.y / h) * 2 - 1;
      camTarget.set(basePos.x - mx * 0.4, basePos.y + my * 0.7, basePos.z);
      camera.position.lerp(camTarget, 0.05);
      camera.lookAt(0, 0, 0);

      // Slide left and dim when a section is open.
      const k = 1 - Math.exp(-dt * 3.2);
      shift += ((active ? SHIFT_SECTION : SHIFT_HOME) - shift) * k;
      gain += ((active ? 0.5 : 0.85) - gain) * k;

      // The name's dim patch and letter particles come in once the stars have gathered.
      const wantClear = !active && clearZone.on && time > 1.3 ? 1 : 0;
      clear += (wantClear - clear) * (1 - Math.exp(-dt * 2.2));
      if (clearZone.on && clearZone.w > 0) {
        pointsMat.uniforms.uClear.value.set(
          (clearZone.x + clearZone.w / 2) / w,
          1 - (clearZone.y + clearZone.h / 2) / h,
          clearZone.w / 2 / w,
          clearZone.h / 2 / h,
        );
      }
      pointsMat.uniforms.uClearAmt.value = clear;

      // Letter particles: follow the heading, sample the same cursor flow.
      const nameEl = clearZone.el;
      if (nameEl && nameReady) {
        const r = nameEl.getBoundingClientRect();
        nameMat.uniforms.uRect.value.set(r.left, r.top, r.width, r.height);
      }
      nameMat.uniforms.uViewport.value.set(w, h);
      nameMat.uniforms.uFluidVelocity.value = velocity.read.texture;
      nameMat.uniforms.uTime.value = time;
      nameMat.uniforms.uAlpha.value = nameReady ? clear : 0;
      size += ((active ? SCALE_SECTION : SCALE_HOME) - size) * k;
      group.position.x = 0.343 + shift;
      group.scale.set(size, size, size * 1.2);
      scene.updateMatrixWorld();
      camera.updateMatrixWorld();

      splat(now);
      stepFluid();

      camRot.extractRotation(camera.matrixWorld);
      groupRotInv.extractRotation(group.matrixWorld).invert();
      flowBasis4.multiplyMatrices(groupRotInv, camRot);
      simMat.uniforms.uFlowBasis.value.setFromMatrix4(flowBasis4);
      simMat.uniforms.uViewProjection.value.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
      simMat.uniforms.uModel.value.copy(group.matrixWorld);
      simMat.uniforms.uPositions.value = positions.read.texture;
      simMat.uniforms.uFluidVelocity.value = velocity.read.texture;
      simMat.uniforms.uFluidDensity.value = density.read.texture;
      simMat.uniforms.uTime.value = time;
      simMat.uniforms.uHz.value = dt * 60;
      run(simMat, positions.write);
      positions.swap();

      pointsMat.uniforms.uPositions.value = positions.read.texture;
      pointsMat.uniforms.uTime.value = time;
      pointsMat.uniforms.uGain.value = gain;
      renderer.setRenderTarget(null);
      renderer.clear();
      renderer.render(scene, camera);
      if (nameReady) renderer.render(nameScene, quadCamera);

      // Screen positions of the ring anchors, for the landing leader lines.
      (Object.keys(ANCHOR_LOCAL) as SectionId[]).forEach((id) => {
        v.set(...ANCHOR_LOCAL[id]).applyMatrix4(group.matrixWorld).project(camera);
        const a = anchors[id];
        a.x = (v.x * 0.5 + 0.5) * w;
        a.y = (-v.y * 0.5 + 0.5) * h;
        a.visible = v.z < 1;
      });

      if (frames < 40 && ++frames === 40) setReady(true);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      window.clearTimeout(seedTimer);
      window.removeEventListener("resize", queueSeed);
      nameGeometry.dispose();
      nameMat.dispose();
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("touchstart", onTouch);
      window.removeEventListener("touchmove", onTouch);
      window.removeEventListener("resize", resize);
      [velocity, density, pressure, positions, home].forEach((d) => {
        d.read.dispose();
        d.write.dispose();
      });
      curlRT.dispose();
      divergenceRT.dispose();
      originTex.dispose();
      materials.forEach((m) => m.dispose());
      pointsMat.dispose();
      geometry.dispose();
      quad.geometry.dispose();
      renderer.dispose();
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" aria-hidden="true" />;
}
