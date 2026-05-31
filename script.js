const canvas = document.getElementById("webgl-canvas");
const gl = canvas.getContext("webgl", {
  alpha: false,
  antialias: false,
  depth: false,
  stencil: false,
  preserveDrawingBuffer: false,
  powerPreference: "high-performance"
});

if (!gl) {
  canvas.style.background = "#0a0a0f";
  throw new Error("WebGL not supported");
}

const vs = `
attribute vec2 a;
void main() {
  gl_Position = vec4(a, 0.0, 1.0);
}
`;

const fs = `
precision highp float;

uniform vec2  uR;
uniform float uT, uS, uSc, uBl;
uniform vec3  uBg;

#define PI 3.14159265359
#define MARCH_STEPS 24
#define REFINE_STEPS 6

vec3 sCol(vec3 c0, vec3 c1, vec3 c2, vec3 c3, vec3 c4, vec3 c5) {
  int si = int(uSc);
  vec3 a = c0, b = c1;
  if (si == 1) { a = c1; b = c2; }
  else if (si == 2) { a = c2; b = c3; }
  else if (si == 3) { a = c3; b = c4; }
  else if (si == 4) { a = c4; b = c5; }
  return mix(a, b, uBl);
}

float sF(float c0, float c1, float c2, float c3, float c4, float c5) {
  int si = int(uSc);
  float a = c0, b = c1;
  if (si == 1) { a = c1; b = c2; }
  else if (si == 2) { a = c2; b = c3; }
  else if (si == 3) { a = c3; b = c4; }
  else if (si == 4) { a = c4; b = c5; }
  return mix(a, b, uBl);
}

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);

  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));

  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float waveH(vec2 p, float t, float amp) {
  float h = 0.0;

  vec2 swellDir = normalize(vec2(1.0, 0.35));
  float d = dot(p, swellDir);

  h += amp * 0.28 * sin(d * 0.80 + t * 0.60);
  h += amp * 0.40 * sin(p.x * 0.70 + t * 0.55 + p.y * 0.28);
  h += amp * 0.24 * sin(p.x * 1.60 - t * 0.82 + p.y * 0.72);
  h += amp * 0.16 * sin(p.x * 3.10 + t * 1.15 - p.y * 0.50);
  h += amp * 0.10 * sin(p.x * 5.50 - t * 1.70 + p.y * 1.30);
  h += amp * 0.05 * sin(p.x * 8.60 + t * 2.20 + p.y * 1.95);

  float micro = noise(p * 18.0 + vec2(t * 0.35, t * 0.12)) * 0.010;
  h += micro * amp;

  return h;
}

vec3 waveNorm(vec2 p, float t, float amp) {
  float e = 0.014;
  float hL = waveH(p - vec2(e, 0.0), t, amp);
  float hR = waveH(p + vec2(e, 0.0), t, amp);
  float hD = waveH(p - vec2(0.0, e), t, amp);
  float hU = waveH(p + vec2(0.0, e), t, amp);
  return normalize(vec3(-(hR - hL) / (2.0 * e), 1.0, -(hU - hD) / (2.0 * e)));
}

void main() {
  vec2 uv = (gl_FragCoord.xy - uR * 0.5) / uR.y;

  vec3 ro = vec3(
    sin(uT * 0.07) * 0.02,
    1.1 + sin(uT * 0.11) * 0.01,
    0.0
  );

  vec3 rd = normalize(vec3(uv.x, uv.y - 0.10, -1.4));

  vec3 skyTop  = sCol(
    vec3(0.18, 0.06, 0.24),
    vec3(0.05, 0.24, 0.68),
    vec3(0.26, 0.06, 0.04),
    vec3(0.01, 0.01, 0.05),
    vec3(0.04, 0.05, 0.09),
    vec3(0.18, 0.06, 0.24)
  );

  vec3 skyHori = sCol(
    vec3(0.92, 0.48, 0.18),
    vec3(0.42, 0.62, 0.90),
    vec3(0.88, 0.32, 0.04),
    vec3(0.03, 0.05, 0.14),
    vec3(0.15, 0.17, 0.23),
    vec3(0.92, 0.48, 0.18)
  );

  vec3 sunCol = sCol(
    vec3(1.0, 0.62, 0.22),
    vec3(1.0, 0.96, 0.80),
    vec3(1.0, 0.38, 0.05),
    vec3(0.70, 0.75, 0.94),
    vec3(0.26, 0.28, 0.34),
    vec3(1.0, 0.62, 0.22)
  );

  vec3 seaDeep = sCol(
    vec3(0.08, 0.05, 0.12),
    vec3(0.03, 0.14, 0.34),
    vec3(0.10, 0.06, 0.04),
    vec3(0.00, 0.01, 0.03),
    vec3(0.03, 0.04, 0.07),
    vec3(0.08, 0.05, 0.12)
  );

  vec3 seaShlo = sCol(
    vec3(0.28, 0.17, 0.24),
    vec3(0.09, 0.38, 0.60),
    vec3(0.24, 0.13, 0.06),
    vec3(0.04, 0.06, 0.16),
    vec3(0.07, 0.10, 0.14),
    vec3(0.28, 0.17, 0.24)
  );

  vec3 fogCol = sCol(
    vec3(0.80, 0.50, 0.30),
    vec3(0.58, 0.72, 0.90),
    vec3(0.70, 0.28, 0.05),
    vec3(0.02, 0.03, 0.08),
    vec3(0.12, 0.14, 0.18),
    vec3(0.80, 0.50, 0.30)
  );

  float sunProgress = clamp(uS / 0.58, 0.0, 1.0);
  float sunAngle = sunProgress * PI;
  float sunArcX = cos(sunAngle) * -0.75;
  float sunArcY = sin(sunAngle) * 0.38 - 0.08;

  vec3 sunDir  = normalize(vec3(sunArcX, sunArcY, -1.0));
  vec3 moonDir = normalize(vec3(-0.14, 0.42, -1.0));

  float warm = smoothstep(0.22, -0.08, sunDir.y);
  sunCol = mix(sunCol, vec3(1.0, 0.55, 0.25), warm * 0.35);

  float waveAmp = sF(0.08, 0.07, 0.10, 0.05, 0.34, 0.08);
  float fogDen  = sF(0.018, 0.010, 0.020, 0.032, 0.048, 0.018);
  float moonAmt = sF(0.0, 0.0, 0.05, 0.92, 0.06, 0.0);

  float sunAbove = step(0.0, sunDir.y);
  float sunGlow  = smoothstep(-0.10, 0.06, sunDir.y);

  vec3 col;

  if (rd.y < 0.0) {
    float tFlat = ro.y / (-rd.y);
    float baseStep = tFlat / float(MARCH_STEPS);
    float t = baseStep;

    for (int i = 0; i < MARCH_STEPS; i++) {
      vec2 wpTest = ro.xz + rd.xz * t;
      float wy = ro.y + rd.y * t;
      if (wy < waveH(wpTest, uT, waveAmp)) break;
      t += baseStep;
    }

    float ta = t - baseStep;
    float tb = t;

    for (int i = 0; i < REFINE_STEPS; i++) {
      float tm = (ta + tb) * 0.5;
      vec2 wpm = ro.xz + rd.xz * tm;
      if (ro.y + rd.y * tm < waveH(wpm, uT, waveAmp)) tb = tm;
      else ta = tm;
    }

    t = (ta + tb) * 0.5;

    vec2 wp = ro.xz + rd.xz * t;
    vec3 n = waveNorm(wp, uT, waveAmp);
    vec3 vDir = -rd;

    float fres = pow(1.0 - clamp(dot(n, vDir), 0.0, 1.0), 4.0);

    vec3 refl = reflect(rd, n);
    float rh = clamp(refl.y, 0.0, 1.0);

    vec3 reflSky = mix(skyHori, skyTop, pow(rh, 0.42));
    reflSky = mix(reflSky, skyHori, 0.12);

    float rSun = max(dot(refl, sunDir), 0.0);
    reflSky += sunCol * pow(rSun, 128.0) * 2.2 * sunGlow;
    reflSky += sunCol * pow(rSun, 18.0) * 0.08 * sunGlow;

    if (moonAmt > 0.04) {
      float rMoon = max(dot(refl, moonDir), 0.0);
      reflSky += vec3(0.72, 0.80, 0.95) * pow(rMoon, 128.0) * 0.8 * moonAmt;
    }

    float depth = exp(-t * 0.40);
    vec3 waterC = mix(seaDeep, seaShlo, depth * 0.5);

    vec3 absorb = vec3(0.78, 0.90, 1.0);
    waterC *= mix(vec3(1.0), absorb, clamp(t * 0.35, 0.0, 1.0));

    float stormTex = noise(wp * 1.9 + vec2(uT * 0.24, uT * 0.08));
    waterC += stormTex * 0.018 * smoothstep(0.75, 1.0, uS);

    col = mix(waterC, reflSky, 0.15 + fres * 0.35);

    float spec = pow(max(dot(reflect(-sunDir, n), vDir), 0.0), 220.0);
    col += sunCol * spec * 1.25 * sunAbove;

    float broadSpec = pow(max(dot(reflect(-sunDir, n), vDir), 0.0), 36.0);
    col += sunCol * broadSpec * 0.14 * sunGlow;

    float sunLine = pow(max(dot(reflect(rd, n), sunDir), 0.0), 10.0);
    col += sunCol * sunLine * 0.32 * smoothstep(0.0, 0.35, -rd.y) * sunGlow;

    float sparkle = noise(wp * 24.0 + vec2(uT * 0.8, uT * 0.35));
    sparkle = smoothstep(0.92, 1.0, sparkle);
    col += sunCol * sparkle * 0.12 * sunGlow * sunAbove;

    if (moonAmt > 0.04) {
      float mSpec = pow(max(dot(reflect(-moonDir, n), vDir), 0.0), 600.0);
      col += vec3(0.72, 0.80, 0.95) * mSpec * 0.11 * moonAmt;
    }

    float hC = waveH(wp, uT, waveAmp);
    float hL = waveH(wp - vec2(0.02, 0.0), uT, waveAmp);
    float hR = waveH(wp + vec2(0.02, 0.0), uT, waveAmp);
    float hD = waveH(wp - vec2(0.0, 0.02), uT, waveAmp);
    float hU = waveH(wp + vec2(0.0, 0.02), uT, waveAmp);

    float curvature = hR + hL + hU + hD - 4.0 * hC;
    float foam = clamp(curvature * 28.0, 0.0, 1.0);
    col += foam * vec3(1.0) * 0.10 * smoothstep(0.70, 1.0, uS);

    float fog = 1.0 - exp(-t * fogDen);
    col = mix(col, fogCol, fog);
  } else {
    float h = clamp(rd.y, 0.0, 1.0);
    col = mix(skyHori, skyTop, pow(h, 0.38));
  }

  float horizonW = 0.008;
  float skyMix = smoothstep(-horizonW, horizonW, rd.y);

  vec3 skyCol;
  {
    float h = clamp(rd.y, 0.0, 1.0);
    skyCol = mix(skyHori, skyTop, pow(h, 0.38));

    float sd = max(dot(rd, sunDir), 0.0);
    skyCol += sunCol * pow(sd, 420.0) * 7.2 * sunGlow;
    skyCol += sunCol * pow(sd, 24.0)  * 0.22 * sunGlow;
    skyCol += sunCol * pow(sd, 5.0)   * 0.10 * sunGlow;

    float sunDisk = smoothstep(0.9992, 0.99995, dot(rd, sunDir));
    skyCol += sunCol * sunDisk * 2.8 * sunGlow;

    float halo = pow(max(dot(rd, sunDir), 0.0), 2.0);
    skyCol += sunCol * halo * 0.04 * sunGlow;

    float horizonBand = exp(-abs(rd.y) * 24.0);
    skyCol += sunCol * horizonBand * 0.12 * sunGlow;

    float viewSun = max(dot(rd, sunDir), 0.0);
    skyCol += sunCol * pow(viewSun, 3.0) * 0.04 * sunGlow;

    if (moonAmt > 0.04) {
      float md = max(dot(rd, moonDir), 0.0);
      skyCol += vec3(0.88, 0.92, 1.0) * pow(md, 900.0) * 8.0 * moonAmt;
      skyCol += vec3(0.88, 0.92, 1.0) * pow(md, 6.0)   * 0.05 * moonAmt;
    }

    float horizonMist = exp(-abs(rd.y) * 40.0);
    skyCol += fogCol * horizonMist * 0.08;

    float horizonFade = exp(-abs(rd.y) * 18.0);
    float lum = dot(skyCol, vec3(0.3333333));
    skyCol = mix(skyCol, vec3(lum), horizonFade * 0.12);
  }

  col = mix(col, skyCol, skyMix);

  float hEdge = smoothstep(-0.008, 0.018, rd.y);
  col = mix(fogCol, col, hEdge * 0.25 + 0.75);

  vec2 uvV = (gl_FragCoord.xy - uR * 0.5) / uR.y;
  float vignette = smoothstep(1.15, 0.35, length(uvV));
  col = mix(uBg, col, vignette);

  float grain = hash(gl_FragCoord.xy + uT * 60.0) - 0.5;
  col += grain * 0.004;

  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`;

const mkShader = (type, src) => {
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);

  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    console.error(gl.getShaderInfoLog(s));
    gl.deleteShader(s);
    return null;
  }

  return s;
};

const vert = mkShader(gl.VERTEX_SHADER, vs);
const frag = mkShader(gl.FRAGMENT_SHADER, fs);

if (!vert || !frag) {
  throw new Error("Shader compilation failed");
}

const prog = gl.createProgram();
gl.attachShader(prog, vert);
gl.attachShader(prog, frag);
gl.linkProgram(prog);

if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
  console.error(gl.getProgramInfoLog(prog));
  throw new Error("Program linking failed");
}

gl.useProgram(prog);
gl.disable(gl.DEPTH_TEST);
gl.disable(gl.CULL_FACE);
gl.disable(gl.BLEND);
gl.disable(gl.DITHER);

const buf = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, buf);
gl.bufferData(
  gl.ARRAY_BUFFER,
  new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
  gl.STATIC_DRAW
);

const ap = gl.getAttribLocation(prog, "a");
gl.enableVertexAttribArray(ap);
gl.vertexAttribPointer(ap, 2, gl.FLOAT, false, 0, 0);

const uR = gl.getUniformLocation(prog, "uR");
const uTi = gl.getUniformLocation(prog, "uT");
const uScroll = gl.getUniformLocation(prog, "uS");
const uScene = gl.getUniformLocation(prog, "uSc");
const uBlend = gl.getUniformLocation(prog, "uBl");
const uBg = gl.getUniformLocation(prog, "uBg");

const hexToVec3 = (hex) => {
  const n = parseInt(hex.replace("#", ""), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};

const bgColors = {
  dark: "#0a0a0f",
  light: "#545457"
};

const updateBg = (theme) => {
  const [r, g, b] = hexToVec3(bgColors[theme] ?? bgColors.dark);
  gl.uniform3f(uBg, r, g, b);
};

const mq = window.matchMedia("(prefers-color-scheme: dark)");
const getSystemTheme = () => (mq.matches ? "dark" : "light");

const applyTheme = (theme) => {
  document.documentElement.setAttribute("data-theme", theme);
  document.documentElement.style.colorScheme = theme;
  updateBg(theme);
};

applyTheme(getSystemTheme());

mq.addEventListener("change", (e) => {
  applyTheme(e.matches ? "dark" : "light");
});

const themeToggle = document.getElementById("theme-toggle");
if (themeToggle) {
  themeToggle.addEventListener("click", () => {
    const current =
      document.documentElement.getAttribute("data-theme") || getSystemTheme();
    applyTheme(current === "dark" ? "light" : "dark");
  });
}

const N = 6;
const NAMES = ["HOME", "EDUCATION", "EXPERIENCE", "PROJECTS", "PUBLICATIONS", "CONTACT"];

let maxScroll = 1;
let tgt = 0;
let smooth = 0;
let velocity = 0;

const scrollEase = 0.1;

let qualityScale = 1.0;
const MAX_DPR = 1.5;
const MIN_QUALITY = 0.82;
const MAX_QUALITY = 1.0;

let resizeRAF = 0;

const resize = () => {
  resizeRAF = 0;

  const vp = window.visualViewport ?? {
    width: window.innerWidth,
    height: window.innerHeight
  };

  const cssW = Math.round(vp.width);
  const cssH = Math.round(vp.height);

  if (!cssW || !cssH) return;

  const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
  const renderScale = dpr * qualityScale;

  const pixelW = Math.max(1, Math.round(cssW * renderScale));
  const pixelH = Math.max(1, Math.round(cssH * renderScale));

  if (canvas.width !== pixelW || canvas.height !== pixelH) {
    canvas.width = pixelW;
    canvas.height = pixelH;
    canvas.style.width = `${cssW}px`;
    canvas.style.height = `${cssH}px`;
    gl.viewport(0, 0, pixelW, pixelH);
    gl.uniform2f(uR, pixelW, pixelH);
  }

  maxScroll = Math.max(1, document.documentElement.scrollHeight - cssH);
  tgt = maxScroll > 0 ? window.scrollY / maxScroll : 0;
};

const requestResize = () => {
  if (!resizeRAF) resizeRAF = requestAnimationFrame(resize);
};

resize();

window.addEventListener("resize", requestResize, { passive: true });

if (window.visualViewport) {
  window.visualViewport.addEventListener("resize", requestResize, {
    passive: true
  });
}

window.addEventListener(
  "scroll",
  () => {
    tgt = maxScroll > 0 ? window.scrollY / maxScroll : 0;
  },
  { passive: true }
);

const progFill = document.getElementById("prog-fill");
const hudPct = document.getElementById("hud-pct");
const sceneName = document.getElementById("scene-name");
const dots = document.querySelectorAll(".scene-dot");

let lastHUDPct = -1;
let lastHUDScene = -1;

const updateHUD = (s) => {
  const p = Math.round(s * 100);
  const si = Math.min(N - 1, Math.floor(s * N));

  if (p !== lastHUDPct) {
    lastHUDPct = p;

    if (hudPct) {
      hudPct.textContent = String(p).padStart(3, "0") + "%";
    }

    if (progFill) {
      progFill.style.width = `${p}%`;
    }
  }

  if (si !== lastHUDScene) {
    lastHUDScene = si;

    if (sceneName) {
      sceneName.textContent = NAMES[si];
    }

    dots.forEach((d, i) => d.classList.toggle("active", i === si));
  }
};

const revealEls = [
  ...document.querySelectorAll(
    ".tag, h1, h2, .body-text, .stat-row, .cta, .h-line"
  )
];

for (const el of revealEls) {
  if (el.getBoundingClientRect().top < window.innerHeight * 0.92) {
    el.classList.add("visible");
  }
}

const io = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        io.unobserve(entry.target);
      }
    }
  },
  {
    threshold: 0.1,
    rootMargin: "0px 0px -6% 0px"
  }
);

for (const el of revealEls) {
  io.observe(el);
}

let anchorAnim = null;

const stopAnchorAnim = () => {
  if (anchorAnim) {
    cancelAnimationFrame(anchorAnim);
    anchorAnim = null;
  }
};

const smoothScrollToY = (targetY, duration = 900) => {
  stopAnchorAnim();
  velocity = 0;

  const startY = window.scrollY;
  const diff = targetY - startY;
  const start = performance.now();

  const easeInOutCubic = (t) =>
    t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

  const tick = (now) => {
    const p = Math.min(1, (now - start) / duration);
    const e = easeInOutCubic(p);

    window.scrollTo(0, startY + diff * e);

    if (p < 1) {
      anchorAnim = requestAnimationFrame(tick);
    } else {
      anchorAnim = null;
      requestResize();
    }
  };

  anchorAnim = requestAnimationFrame(tick);
};

window.addEventListener("wheel", stopAnchorAnim, { passive: true });
window.addEventListener("touchstart", stopAnchorAnim, { passive: true });
window.addEventListener("mousedown", stopAnchorAnim, { passive: true });
window.addEventListener("keydown", stopAnchorAnim, { passive: true });

// Listen for all anchor tags correctly so the Navbar links apply to the smooth scroll function
document.querySelectorAll('a[href^="#"]').forEach((a) => {
  a.addEventListener("click", (e) => {
    e.preventDefault();

    const id = a.getAttribute("href");
    const target = document.querySelector(id);
    if (!target) return;

    const y = Math.max(0, Math.min(target.offsetTop, maxScroll));
    smoothScrollToY(y);
  });
});

const t0 = performance.now();
let lastNow = t0;
let fpsAccum = 0;
let fpsFrames = 0;
let lowFpsTime = 0;
let highFpsTime = 0;

const maybeAdjustQuality = (dt) => {
  fpsAccum += dt;
  fpsFrames++;

  if (fpsAccum < 0.75) return;

  const avgDt = fpsAccum / fpsFrames;
  const fps = 1 / avgDt;

  fpsAccum = 0;
  fpsFrames = 0;

  if (fps < 50) {
    lowFpsTime += 0.75;
    highFpsTime = 0;
  } else if (fps > 57) {
    highFpsTime += 0.75;
    lowFpsTime = 0;
  } else {
    lowFpsTime = 0;
    highFpsTime = 0;
  }

  if (lowFpsTime >= 1.5 && qualityScale > MIN_QUALITY) {
    qualityScale = Math.max(MIN_QUALITY, +(qualityScale - 0.06).toFixed(2));
    lowFpsTime = 0;
    requestResize();
  }

  if (highFpsTime >= 3.0 && qualityScale < MAX_QUALITY) {
    qualityScale = Math.min(MAX_QUALITY, +(qualityScale + 0.04).toFixed(2));
    highFpsTime = 0;
    requestResize();
  }
};

const frame = (now) => {
  requestAnimationFrame(frame);

  const dt = Math.min((now - lastNow) * 0.001, 0.033);
  lastNow = now;

  maybeAdjustQuality(dt);

  // We rely entirely on native browser scrolling now.
  // The 'scroll' event listener automatically updates 'tgt'.
  smooth += (tgt - smooth) * (1 - Math.exp(-dt * 8));

  const raw = smooth * (N - 1);
  const flr = Math.floor(raw);
  const si = Math.min(flr, N - 2);
  const bl = flr >= N - 1 ? 1.0 : raw - flr;

  updateHUD(smooth);

  gl.uniform1f(uTi, (now - t0) / 1000);
  gl.uniform1f(uScroll, smooth);
  gl.uniform1f(uScene, si);
  gl.uniform1f(uBlend, bl);

  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
};

requestAnimationFrame(frame);

/* =========================================
   3D SLIDER LOGIC (Vanilla JS Port)
   ========================================= */
const projectsData = [
  {
    title: "Bhogar",
    subtitle: "Bhogar - Quantum AI",
    description: "A hybrid classical-quantum pipeline for intelligent drug discovery, designed to identify novel therapeutic candidates for complex neurological disorders like Alzheimer's.",
    image: "./assets/projects/Bhogar.png",
    link: "https://github.com/narc-kany/Bhogar"
  },
  {
    title: "PAS-FDR",
    subtitle: "PAS-FDR - Sustainable AI",
    description: "Sustainability Architect is a multi-agent, AI-powered framework designed to support sustainable financial data reuse infrastructure.",
    image: "./assets/projects/PAS-FDR.png",
    link: "https://github.com/narc-kany/Pluriformic-Architecture-for-Sustainable-Financial-Data-Reuse-PAS-FDR-"
  },
  {
    title: "Marketing System",
    subtitle: "AdTech Agents",
    description: "Multi-agent AI system designed to automate marketing campaign creation using Google ADK and language models like Gemini-2.0.",
    image: "./assets/projects/Multi-Agent-Marketing.png",
    link: "https://github.com/narc-kany/Multi-Agent-Marketing-Workflow-using-Google-ADK-Gemini-and-MCP-Tools"
  },
  {
    title: "SAHADEV",
    subtitle: "SAHADEV - Vedic Astrology",
    description: "Detects basic yogas & provides Vimshottari dasa placeholders (integrates with pyjhora or VedicAstro if installed).",
    image: "./assets/projects/SAHADEV.png",
    link: "https://github.com/narc-kany/Sahadev"
  },
  {
    title: "MDM",
    subtitle: "MDM - Generative AI",
    description: "Matryoshka Diffusion Models: A unified, nested diffusion framework that handles multiple resolutions within a single model for high-fidelity image generation.",
    image: "./assets/projects/Matryoshka.png",
    link: "https://github.com/narc-kany/Matryoshka-Diffusion-Models"
  }
];

const track = document.getElementById("slides-track");
const prevBtn = document.getElementById("slide-prev");
const nextBtn = document.getElementById("slide-next");

let currentSlideIndex = 0;
const totalUniqueSlides = projectsData.length;

// Duplicate the array to create the infinite looping effect (just like the React code)
const renderList = [...projectsData, ...projectsData, ...projectsData];

// Generate HTML
track.innerHTML = renderList.map((project, i) => `
  <div class="slide" id="slide-${i}">
    <div class="slideBackground" style="background-image: url('${project.image}')"></div>
    <a href="${project.link}" target="_blank" class="slideContent" style="background-image: url('${project.image}')">
      <div class="slideContentInner">
        <h2 class="slideTitle">${project.title}</h2>
        <h3 class="slideSubtitle">${project.subtitle}</h3>
        <p class="slideDescription">${project.description}</p>
      </div>
    </a>
  </div>
`).join('');

const slideElements = document.querySelectorAll('.slide');

// Update positions and states
function updateSlides() {
  slideElements.forEach((el, i) => {
    // Math exactly matching your provided React logic
    let offset = totalUniqueSlides + (currentSlideIndex - i);
    let dir = offset === 0 ? 0 : offset > 0 ? 1 : -1;
    let isActive = offset === 0;

    el.style.setProperty('--offset', offset);
    el.style.setProperty('--dir', dir);
    
    if (isActive) {
      el.setAttribute('data-active', 'true');
      attachTilt(el.querySelector('.slideContent'));
    } else {
      el.setAttribute('data-active', 'false');
      detachTilt(el.querySelector('.slideContent'));
    }
  });
}

// Tilt effect logic
function handleMouseMove(e) {
  const el = e.currentTarget;
  const rect = el.getBoundingClientRect();
  const px = (e.clientX - rect.left) / rect.width;
  const py = (e.clientY - rect.top) / rect.height;
  el.style.setProperty("--px", px);
  el.style.setProperty("--py", py);
}

function attachTilt(el) {
  el.addEventListener('mousemove', handleMouseMove);
}

function detachTilt(el) {
  el.removeEventListener('mousemove', handleMouseMove);
  el.style.removeProperty('--px');
  el.style.removeProperty('--py');
}

// Button Listeners
nextBtn.addEventListener('click', () => {
  currentSlideIndex = (currentSlideIndex + 1) % totalUniqueSlides;
  updateSlides();
});

prevBtn.addEventListener('click', () => {
  currentSlideIndex = currentSlideIndex === 0 ? totalUniqueSlides - 1 : currentSlideIndex - 1;
  updateSlides();
});

// Initialize
updateSlides();

/* =========================================
   ACCORDION LOGIC (EDU, EXP & PUB)
   ========================================= */
document.addEventListener("DOMContentLoaded", () => {
  const allAccordionBlocks = document.querySelectorAll('.edu-block, .exp-block, .pub-block');
  const interactiveSections = [
    document.getElementById('education'), 
    document.getElementById('experience'),
    document.getElementById('publications')
  ];

  // Handle clicking to expand/collapse
  allAccordionBlocks.forEach(block => {
    const header = block.querySelector('.edu-header, .exp-header, .pub-header');
    
    if (header) {
      header.addEventListener('click', () => {
        const isCurrentlyActive = block.classList.contains('active');
        
        // Close all blocks within the same section to keep UI clean
        const parentSection = block.closest('section');
        const siblings = parentSection.querySelectorAll('.edu-block, .exp-block, .pub-block');
        siblings.forEach(b => b.classList.remove('active'));
        
        // If the clicked block wasn't already open, open it
        if (!isCurrentlyActive) {
          block.classList.add('active');
        }
      });
    }
  });

  // Handle auto-collapsing when scrolling away from the sections
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) {
        // Find open blocks only within the section we just scrolled past and close them
        const blocksInSection = entry.target.querySelectorAll('.edu-block, .exp-block, .pub-block');
        blocksInSection.forEach(b => b.classList.remove('active'));
      }
    });
  }, {
    threshold: 0.1 
  });

  interactiveSections.forEach(section => {
    if (section) observer.observe(section);
  });
});