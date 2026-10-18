# Recreate this site as a single HTML file: Ascend — Scale Smarter, Not Harder

You are an expert creative front-end developer. Produce a **single self-contained `index.html`**
that reproduces the project below **exactly** — same layout, sections, visuals, motion, and
interaction. Pure HTML/CSS/JS in one file: no build step, no framework, no bundler. Use ES modules
with a CDN importmap for the libraries. Hardcode every value given here as a fixed constant.
Rebuild each component described below as a section of the one file.

## What it is

A premium, immersive **SaaS landing page** for a fictional revenue-operations product called
**Ascend**. The whole page floats over a **fixed, full-viewport WebGL planet** — a GLTF Earth with
a custom day/night-city-lights/ocean-glint/rim shader, a soft blue atmosphere halo, three drifting
cloud shells, ambient motes, a twinkling starfield, and golden radar-ping land markers, all
composited through a bloom + corner-flame final pass. Four glassmorphism content sections
(hero · features · showcase+stats · CTA/footer) scroll over the planet in a **deep-space palette**
(near-black navy) with a **mint-green** accent. As you scroll, the planet zooms out from a huge
half-below-the-fold globe and swings left → right before settling near the final CTA, turning as it
goes. Content reveals with a staggered fade-up; Lenis drives smooth scroll.

## Page shell & libraries

- Single `index.html`. `<html lang="en">`, `<meta charset>`, responsive viewport meta.
- **Fonts:** Google Fonts **Inter** weights 400–900 (`<link>` preconnect + stylesheet).
- **Importmap (CDN, pin Three.js r0.143.0 — the shader injection relies on its chunk names and the
  WebGL1Renderer / `outputEncoding` / `sRGBEncoding` API):**
  ```html
  <script type="importmap">
  { "imports": {
    "three": "https://unpkg.com/three@0.143.0/build/three.module.js",
    "three/examples/jsm/": "https://unpkg.com/three@0.143.0/examples/jsm/"
  }}
  </script>
  ```
  Modules used from `three/examples/jsm/`: `postprocessing/EffectComposer.js`,
  `postprocessing/RenderPass.js`, `postprocessing/UnrealBloomPass.js`,
  `postprocessing/ShaderPass.js`, `shaders/GammaCorrectionShader.js`, `shaders/CopyShader.js`,
  `loaders/GLTFLoader.js`, `loaders/DRACOLoader.js`, `controls/OrbitControls.js`.
- **Lenis** smooth scroll from CDN, e.g. `import Lenis from 'https://unpkg.com/lenis@1.3.23/dist/lenis.mjs'`.
- DOM: a single fixed `<canvas class="planet-canvas">` first, then a `<div class="page" id="top">`
  containing the four sections.

### Global CSS (`:root` tokens + resets — use verbatim)

```css
:root{
  --bg:#04060f; --bg-2:#060a18; --ink:#f3f6ff; --muted:#9aa6c4; --muted-2:#6b7796;
  --line:rgba(150,175,230,.12); --line-strong:rgba(150,175,230,.22);
  --accent:#5df0a8; --accent-2:#2fd38a; --accent-ink:#032018;
  --glass:rgba(12,18,38,.55); --glass-2:rgba(16,24,48,.65);
  --radius:18px; --radius-lg:26px; --maxw:1180px;
  --shadow:0 30px 80px -30px rgba(0,0,0,.75);
  --font:'Inter',-apple-system,BlinkMacSystemFont,system-ui,sans-serif;
}
*{box-sizing:border-box;margin:0;padding:0}
html{scroll-behavior:smooth}
body{font-family:var(--font);color:var(--ink);background:var(--bg);-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility;overflow-x:hidden}
a{color:inherit;text-decoration:none}
/* Lenis */
html.lenis,html.lenis body{height:auto}
.lenis.lenis-smooth{scroll-behavior:auto !important}
.lenis.lenis-smooth [data-lenis-prevent]{overscroll-behavior:contain}
.lenis.lenis-stopped{overflow:hidden}
/* staggered scroll-reveal */
[data-reveal]{opacity:0;transform:translateY(26px);transition:opacity .7s cubic-bezier(.22,.7,.2,1),transform .7s cubic-bezier(.22,.7,.2,1);transition-delay:var(--rd,0ms);will-change:opacity,transform}
[data-reveal].in{opacity:1;transform:none}
/* fixed WebGL planet behind everything, never grabs pointer/scroll */
.planet-canvas{position:fixed;inset:0;width:100vw;height:100vh;display:block;z-index:0;pointer-events:none}
.page{position:relative;z-index:1}
.section{position:relative;z-index:1;max-width:var(--maxw);margin:0 auto;padding:clamp(80px,12vw,160px) 24px}
.eyebrow{display:inline-block;font-size:12px;font-weight:600;letter-spacing:.18em;text-transform:uppercase;color:var(--accent);margin-bottom:18px}
.section-head{max-width:680px;margin:0 auto clamp(48px,6vw,80px);text-align:center}
.section-head h2,.showcase-copy h2,.cta-card h2{font-size:clamp(30px,4.4vw,50px);font-weight:800;line-height:1.05;letter-spacing:-.02em;text-shadow:0 2px 40px rgba(0,0,0,.6)}
.section-head p{margin-top:18px;color:var(--muted);font-size:18px;line-height:1.65;text-shadow:0 1px 24px rgba(0,0,0,.55)}
/* buttons */
.btn{display:inline-flex;align-items:center;gap:9px;font-size:15px;font-weight:600;padding:13px 22px;border-radius:999px;border:1px solid transparent;cursor:pointer;transition:transform .18s ease,box-shadow .25s ease,background .2s ease,border-color .2s ease;white-space:nowrap}
.btn svg{width:17px;height:17px}
.btn-primary{color:var(--accent-ink);background:linear-gradient(180deg,var(--accent),var(--accent-2));box-shadow:0 10px 30px -8px rgba(93,240,168,.55),inset 0 1px 0 rgba(255,255,255,.4)}
.btn-primary:hover{transform:translateY(-2px);box-shadow:0 16px 38px -8px rgba(93,240,168,.7)}
.btn-outline{color:var(--ink);background:rgba(255,255,255,.04);border-color:var(--line-strong);backdrop-filter:blur(10px)}
.btn-outline:hover{background:rgba(255,255,255,.09);transform:translateY(-2px)}
.btn-ghost{color:var(--ink);background:rgba(255,255,255,.05);border-color:var(--line-strong);padding:9px 18px}
.btn-ghost:hover{background:rgba(255,255,255,.1)}
```

All inline SVG icons are 24×24, `fill:none; stroke:currentColor; stroke-width:1.6`
(the arrow uses stroke-width 2), `stroke-linecap/linejoin:round`. Reproduce these icons:
**workflow** (two rounded rects 3,3 6×6 and 15,15 6×6 joined by `M6 9v3a3 3 0 0 0 3 3h3`),
**analytics** (axis `M4 19V5`,`M4 19h16` + bars `M8 16v-4`,`M13 16V8`,`M18 16v-7`),
**leads** (two-person group: `M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2`, `circle 9,7 r4`,
`M22 21v-2a4 4 0 0 0-3-3.87`, `M16 3.13a4 4 0 0 1 0 7.75`),
**shield** (`M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z` + check `m9 12 2 2 4-4`),
**bolt** (`M13 2 3 14h9l-1 8 10-12h-9l1-8Z`),
**globe** (`circle 12,12 r10`,`M2 12h20`,`M12 2a15 15 0 0 1 0 20 15 15 0 0 1 0-20Z`),
**arrow** (`M5 12h14`,`m12 5 7 7-7 7`).

## Layout & sections (in order)

### SECTION 1 · HERO  — `<header class="hero" >` then `.logos`
- The hero is `min-height:100vh`, flex column, with a **top-only scrim** so nav + title stay legible
  while the planet reads through the rest:
  `background:radial-gradient(125% 62% at 50% -10%, rgba(4,6,15,.82) 0%, rgba(4,6,15,.28) 44%, transparent 68%)`.
- **Nav** (`.nav`, max-width var(--maxw), padding 22px 24px, flex space-between): brand on the left —
  `.brand` (inline-flex, gap 9, font-weight 800, 19px, letter-spacing .16em) = a mint **▲** mark
  (`.brand-mark`, color var(--accent), 14px, translateY(-1px)) + the word **Ascend**. Center: nav
  links `Features · Solutions · Plans · Learning` (`.nav-links`, gap 30, 14.5px, color var(--muted),
  hover → var(--ink)). Right: a `.btn .btn-ghost` labeled **Sign Up**.
- **Hero inner** (`.hero-inner`, flex-1, centered, `transform:translateY(-10vh)`):
  - `<h1 class="hero-title">` — **“Scale Smarter,<br>Not <em>Harder</em>”**, font
    `clamp(34px,5.2vw,62px)`, weight 800, line-height 1.04, letter-spacing -.03em, max-width 15ch,
    `text-shadow:0 2px 50px rgba(0,0,0,.55)`. The `<em>Harder</em>` is non-italic with a mint gradient
    text fill (`linear-gradient(180deg,var(--accent),var(--accent-2))`, background-clip:text,
    transparent color).
  - `<p class="hero-sub">` — “Drive your funnel forward with clever workflows, analytics, and
    seamless lead management — all in one immersive command center.” (margin-top 24, max-width 560,
    `clamp(16px,2vw,19px)`, line-height 1.6, var(--muted)).
  - `.hero-actions` (margin-top 38, flex, gap 14, centered, wrap): primary button **“Start Free
    Right Now”** + arrow icon; outline button **“Schedule a Consult”**.
- **Logos** (`.logos`, centered, padding `0 24px clamp(36px,6vw,64px)`): label **“Trusted by
  fast-moving teams”** (`.logos-label`, 12px, letter-spacing .16em, uppercase, var(--muted-2)),
  then a wrapping row (`.logos-row`, gap `clamp(24px,5vw,56px)`) of six wordmarks
  **Nimbus · Pluma · Citrus · Spider · Helod · Vertx** (`.logo`, 17px, weight 700, var(--muted-2),
  opacity .8, hover → var(--ink)/opacity 1).
- Reveal stagger via inline `--rd`: hero-title 60ms, hero-sub 180ms, hero-actions 300ms, logos 420ms.

### SECTION 2 · FEATURES  — `<section class="section features" id="features">` (transparent bg)
- `.section-head`: eyebrow **“Everything in orbit”**; h2 **“One platform to run the entire revenue
  engine”**; p **“Stop stitching tools together. Ascend unifies capture, automation, and insight
  into a single surface your whole team actually enjoys using.”** (eyebrow no delay, h2 80ms, p 160ms).
- `.feature-grid` — `repeat(3,1fr)`, gap 18 (2 cols ≤980px, 1 col ≤560px). Six `.card`s (padding 30,
  radius var(--radius), `background:var(--glass)`, `border:1px solid var(--line)`, blur(14px); on
  hover translateY(-4px), border var(--line-strong), bg var(--glass-2), and a `::before`
  `radial-gradient(120% 120% at 0% 0%, rgba(93,240,168,.08), transparent 45%)` fades in). Each card:
  `.card-icon` (46×46, radius 12, color var(--accent), bg rgba(93,240,168,.1), border
  rgba(93,240,168,.18)) holding the icon, then `<h3>` (19px/700) and `<p>` (15px, var(--muted)).
  Cards reveal staggered by index × 90ms. Content:
  1. **workflow** icon · “Clever workflows” · “Automate every hand-off with visual, branching pipelines that move deals forward while you sleep.”
  2. **analytics** · “Live analytics” · “Real-time dashboards turn raw funnel data into the one number that tells you what to do next.”
  3. **leads** · “Seamless leads” · “Capture, score, and route every lead automatically — no spreadsheet, no leak, no lag.”
  4. **bolt** · “Instant triggers” · “Fire actions across your stack the moment intent appears, in milliseconds not minutes.”
  5. **shield** · “Enterprise-grade” · “SOC 2, SSO, and granular roles baked in — security that scales quietly with your team.”
  6. **globe** · “Global by default” · “Multi-region, multi-currency, and low-latency everywhere your customers happen to be.”

### SECTION 3 · SHOWCASE + STATS  — `<section class="section showcase" id="solutions">` (transparent)
- `.showcase-grid` — `grid-template-columns:1fr 1.05fr`, gap `clamp(36px,6vw,72px)`, items centered
  (collapses to 1 col centered ≤980px).
  - **Left copy** (`.showcase-copy`): eyebrow **“Built for momentum”**; h2 **“See the whole funnel
    move in real time”**; p **“Every stage, every signal, every dollar — rendered live. Ascend gives
    operators the altitude to spot what’s working and the controls to double down instantly.”**;
    primary button **“Explore the platform”** + arrow. (h2 90ms, p 180ms, btn 270ms.)
  - **Right dashboard mock** (`.dashboard`, padding 24, radius var(--radius-lg), bg var(--glass-2),
    border var(--line-strong), var(--shadow), blur(18px); a `::after` gradient-border
    `linear-gradient(160deg, rgba(93,240,168,.35), transparent 40%)` via mask-composite; reveal 160ms):
    - `.dash-top`: title **“Pipeline · Q3”** + a live pill (`.dash-live`, var(--accent)) = a small
      mint dot + **“Live”**.
    - `.dash-bars` (flex, align-end, gap 10, height 150, bg rgba(0,0,0,.25), border var(--line),
      radius 14): seven `.dash-bar`s with heights **62, 88, 47, 95, 71, 80, 58 (%)**; each
      `background:linear-gradient(180deg,var(--accent),rgba(47,211,138,.25))`, radius 6 6 3 3,
      and a `grow` keyframe (`scaleY(0)→1`, transform-origin bottom) delayed by index × 90ms.
    - `.dash-rows`: four rows (`grid 120px 1fr`, gap 14, 13.5px, var(--muted)) — **New leads 90%**,
      **Qualified 72%**, **In negotiation 48%**, **Closed won 34%** — each a label + a `.dash-track`
      (8px, radius 999, bg rgba(255,255,255,.06)) holding a `.dash-fill`
      (`linear-gradient(90deg,var(--accent-2),var(--accent))`, `fill` keyframe width 0→--w, .3s delay).
- `.stats` (margin-top `clamp(56px,8vw,96px)`, `repeat(4,1fr)`, gap 18; 2 cols ≤980px, 1 ≤380px):
  four `.stat`s (centered, padding 30 18, radius var(--radius), bg var(--glass), border var(--line),
  blur 12). `.stat-value` is `clamp(30px,4vw,44px)`/800 with a `linear-gradient(180deg,#fff,var(--accent))`
  text fill; `.stat-label` is 14px var(--muted), margin-top 8. Reveal staggered index × 80ms. Values:
  **3.4× / Faster pipeline velocity · 92% / Lead capture accuracy · 11k+ / Teams scaling on Ascend ·
  $2.1B / Revenue influenced.**

### SECTION 4 · CTA + FOOTER  — `<section class="section cta" id="cta">` (transparent)
- `.cta-card` (centered, max-width 760, padding `clamp(48px,7vw,80px) clamp(28px,5vw,64px)`, radius
  var(--radius-lg), `background:radial-gradient(120% 140% at 50% 0%, rgba(93,240,168,.12), transparent 55%), var(--glass-2)`,
  border var(--line-strong), var(--shadow), blur 18): eyebrow **“Ready when you are”** (60ms);
  h2 **“Put your growth on a new trajectory”** (140ms); p **“Launch in minutes. No credit card.
  Cancel anytime. Join thousands of teams compounding revenue on Ascend.”** (220ms); `.hero-actions`
  (300ms, margin-top 0) with primary **“Start Free Right Now”** + arrow and outline **“Talk to Sales”**.
- `.footer` (flex space-between, gap 48, wrap, margin-top `clamp(64px,9vw,110px)`, padding-top 48,
  `border-top:1px solid var(--line)`): left `.footer-brand` = the ▲ Ascend brand + “The revenue
  command center for ambitious teams.”; right `.footer-cols` (three columns, uppercase 12px headers
  var(--muted-2)) — **Product**: Features, Solutions, Plans · **Company**: About, Careers, Blog ·
  **Legal**: Privacy, Terms, Security.
- `.copyright` (centered, margin-top 56, 13px, var(--muted-2)): **“© <current year> Ascend, Inc. —
  Built among the stars.”** (compute the year with `new Date().getFullYear()`).

### Responsive (match exactly)
- ≤980px: feature-grid 2 cols; showcase-grid 1 col, copy centered; stats 2 cols.
- ≤720px: hide `.nav-links`; nav padding 18 20; section padding `clamp(64px,16vw,110px) 20px`.
- ≤560px: feature-grid 1 col; dash-row `90px 1fr`; hero-action buttons full-width flex:1; cta-card
  padding 40 22; footer column.
- ≤380px: stats 1 col; smaller logos.
- `prefers-reduced-motion`: disable reveals (show immediately), bar/fill animations, smooth scroll,
  and skip Lenis + the planet float-up entrance.

## Scroll behavior & reveal (vanilla JS)
- **Lenis:** `new Lenis({ duration:1.15, smoothWheel:true, touchMultiplier:1.5 })`, driven by a rAF
  loop calling `lenis.raf(t)`. Skip entirely under reduced-motion.
- **Staggered reveal:** an `IntersectionObserver` (`threshold:0.18`, `rootMargin:'0px 0px -8% 0px'`)
  that adds `.in` to each `[data-reveal]` once and unobserves it. Per-element delay comes from an
  inline `--rd` custom property (the ms values listed per section). Under reduced-motion, add `.in`
  to all immediately.

## The WebGL / canvas scene  (this IS the project — reproduce exactly)

Mount on the fixed `.planet-canvas`. Port the module below **verbatim** — same CONFIG, same composer
chain, same shaders. (It was authored against three r0.143: `WebGL1Renderer`, `renderer.outputEncoding`,
`THREE.sRGBEncoding`, `THREE.VSMShadowMap`.)

### CONFIG (bake these in exactly)
```js
const CONFIG = {
  rimColor:'#c1faff', rimPower:2.4, nightLights:10, terrainDepth:0.33, terrainShade:1.3,
  oceanGlint:0.45, oceanDeep:0.12, oceanFlow:3, oceanFlowSpeed:0.8, oceanFlowScale:2.1,
  glowColor:'#3a6cff', glowIntensity:3.35, planetRadius:1.95, spin:0.03, initRotation:2.07,
  tilt:0.37, autoRotate:0,
  cloud1Height:1.005, cloud1Opacity:0.6, cloud1Spin:0.06,
  cloud2Height:1.03, cloud2Opacity:0.5, cloud2Spin:0.14,
  cloud3Height:1.075, cloud3Opacity:0.5, cloud3Spin:0.1,
  bgColor:'#040a1e', flameColor:'#3a6cff', flameColor2:'#c1faff', flameAmt:0.15,
  atmoColor:'#9fc4ff', atmoCount:320, atmoSize:22, atmoSpeed:0.8,
  starColor:'#cfe0ff', starCount:1400, starSize:1.6, starFlicker:1,
  markerColor:'#ffd27a', markerCount:60, markerSize:16, markerSpeed:0.5,
};
const LAYERS = { NONE:0, TORUS_SCENE:1, BLOOM_SCENE:2, ENTIRE_SCENE:3 };
```
Helpers: `Lerp(a,b,t)=a+(b-a)*t`; `clamp(v,lo,hi)`; `hexToVec3(hex)` → `THREE.Vector3` of the rgb/255;
`sample(stops,p)` = piecewise smoothstep over keyframe stops `[{p,v}]` (smoothstep `t*t*(3-2t)`).

### Shared simplex noise (GLSL, used by planet + cloud shaders) — VERBATIM
```glsl
vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x, 289.0);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}
float snoise(vec3 v){
  const vec2 C = vec2(1.0/6.0, 1.0/3.0); const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i = floor(v + dot(v, C.yyy)); vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz); vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy); vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + 1.0 * C.xxx; vec3 x2 = x0 - i2 + 2.0 * C.xxx; vec3 x3 = x0 - 1.0 + 3.0 * C.xxx;
  i = mod(i, 289.0);
  vec4 p = permute(permute(permute(i.z + vec4(0.0, i1.z, i2.z, 1.0)) + i.y + vec4(0.0, i1.y, i2.y, 1.0)) + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 1.0/7.0; vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z *ns.z);
  vec4 x_ = floor(j * ns.z); vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ *ns.x + ns.yyyy; vec4 y = y_ *ns.x + ns.yyyy; vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy); vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0)*2.0 + 1.0; vec4 s1 = floor(b1)*2.0 + 1.0; vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy; vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
  vec3 p0 = vec3(a0.xy,h.x); vec3 p1 = vec3(a0.zw,h.y); vec3 p2 = vec3(a1.xy,h.z); vec3 p3 = vec3(a1.zw,h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.5 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0); m = m * m;
  return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}
```

### Renderer / scene / camera / composers
- `new THREE.WebGL1Renderer({ canvas, antialias:true })`, `setPixelRatio(devicePixelRatio)`,
  `outputEncoding = THREE.sRGBEncoding`, `shadowMap.enabled=true`, `shadowMap.type=THREE.VSMShadowMap`.
- `scene.background = new THREE.Color(0x000000)`.
- Camera `PerspectiveCamera(40, w/h, 0.1, 200)` at `(0,0,8)`; enable layers TORUS/BLOOM/ENTIRE; add to scene.
- Lights: `AmbientLight(0xffffff, 1.8)` and `DirectionalLight(0xffffff, 0.8)` at `(0,10,2)`, both on layer ENTIRE.
- **Three composers** (render-to-texture chain feeding a final fullscreen pass):
  - `torusComposer` (renderToScreen=false): RenderPass → `ShaderPass(GammaCorrectionShader)` →
    `UnrealBloomPass(vec2(w,h), 0.22, 0.2, 0)` → `ShaderPass(CopyShader)`.
  - `bloomComposer` (renderToScreen=false): RenderPass → `UnrealBloomPass(vec2(w,h), 0.5, 0.6, 0)` →
    `ShaderPass(GammaCorrectionShader)`.
  - `finalComposer`: RenderPass → `ShaderPass(FinalPass)`, where FinalPass.bloomTexture =
    bloomComposer.renderTarget1.texture and FinalPass.torusTexture = torusComposer.renderTarget1.texture.
- `OrbitControls(camera, renderer.domElement)` with `enableDamping`, dampingFactor 0.06, `enablePan=false`,
  **`enabled=false`** (never capture pointer/scroll), `autoRotate=true`, `autoRotateSpeed=CONFIG.autoRotate`,
  minDistance 3.5, maxDistance 16, target (0,0,0).

### FinalPass shader (the bg + corner-flame composite) — VERBATIM
```js
const FinalPass = {
  uniforms: {
    iTime:{value:0}, tDiffuse:{value:null}, torusTexture:{value:null}, bloomTexture:{value:null}, haloTexture:{value:null},
    uBg:{value:hexToVec3(CONFIG.bgColor)}, uFlameA:{value:hexToVec3(CONFIG.flameColor)},
    uFlameB:{value:hexToVec3(CONFIG.flameColor2)}, uFlameAmt:{value:CONFIG.flameAmt},
  },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position, 1.0); }`,
  fragmentShader: `
    uniform float iTime; uniform sampler2D tDiffuse; uniform sampler2D bloomTexture; uniform sampler2D torusTexture; uniform sampler2D haloTexture;
    uniform vec3 uBg; uniform vec3 uFlameA; uniform vec3 uFlameB; uniform float uFlameAmt;
    varying vec2 vUv;
    vec3 warp3d(vec3 pos, float t){ float curv=.8,a=1.9,b=0.7; pos*=2.;
      pos.x+=curv*sin(t+a*pos.y)+t*b; pos.y+=curv*cos(t+a*pos.x);
      pos.y+=curv*sin(t+a*pos.z)+t*b; pos.z+=curv*cos(t+a*pos.y);
      pos.z+=curv*sin(t+a*pos.x)+t*b; pos.x+=curv*cos(t+a*pos.z);
      return 0.5+0.5*cos(pos.xyz+vec3(1,2,4)); }
    void main(){
      vec2 uv = 2.*vUv - 1.;
      vec3 w = pow(warp3d(vec3(uv.x, sin(uv.y), uv.y), iTime*1.5), vec3(1.5));
      vec3 flame = 1.5*uFlameA*w.x; flame*=w.y; flame += uFlameB*w.z;
      flame *= smoothstep(0.25, 1., abs(uv.y));
      float md = smoothstep(-0.7, 1., -uv.y*uv.x); flame *= md*md;
      vec3 bg = uBg * (1.0 - 0.4 * length(uv));
      vec3 halo = texture2D(haloTexture, vUv).xyz;
      gl_FragColor = vec4(bg + flame*uFlameAmt + texture2D(bloomTexture, vUv).xyz + texture2D(torusTexture, vUv).xyz + texture2D(tDiffuse, vUv).xyz + halo, 1.);
    }`,
};
```

### Planet material — `onBeforeCompile` injection (VERBATIM)
Load `planet-lights.glb` (its first mesh's `material.map` is the night-city-lights texture `nightTex`),
then load `planet.glb`; take its first mesh, `computeBoundingSphere()`, scale so radius =
`CONFIG.planetRadius`. Clone the material, set `metalness 0, roughness 1, envMapIntensity 0`, and apply
this `onBeforeCompile`. Uniforms: `time` (shared `planetTime`), `noiseScale 30`, `speedX 1.5`,
`speedY 2.0`, `speedZ 2.5`, `rimColor`, `rimPower`, `nightBlendTexture = nightTex`, `nightLights`,
`terrainDepth`, `terrainShade`, `oceanGlint`, `oceanDeep`, `oceanFlow`, `oceanFlowSpeed`, `oceanFlowScale`.
Prepend `varying vec2 vCustomUv;` to the vertex shader and set `vCustomUv = uv;` at `void main(){`.
Prepend the uniforms + the `${SNOISE}` block to the fragment shader, then replace
`#include <dithering_fragment>` with:
```glsl
#include <dithering_fragment>
vec3 normalizedNormal = normalize(vNormal);
vec3 viewDir = normalize(vViewPosition);
float rim = 1.0 - max(dot(viewDir, normalizedNormal), 0.0);
rim = pow(rim, rimPower); rim = pow(rim, 1.5); rim *= 0.7;
vec3 currentColor = gl_FragColor.rgb;
float blueDom = currentColor.b - max(currentColor.r, currentColor.g);
float waterMask = clamp(smoothstep(-0.005, 0.03, blueDom), 0.0, 1.0);
float shimmer = snoise(vec3(vCustomUv.x * noiseScale + time * speedX, vCustomUv.y * noiseScale - time * speedY, time * speedZ));
gl_FragColor.rgb += waterMask * shimmer * 0.025;
float fT = time * oceanFlowSpeed * 4.0;
float fS = 4.0 * oceanFlowScale;
float warp = snoise(vec3(vCustomUv.x * fS - fT * 0.5, vCustomUv.y * fS + fT * 0.4, fT * 0.5));
float flow = snoise(vec3(vCustomUv.x * fS * 2.0 + fT * 0.6 + warp, vCustomUv.y * fS * 2.0 - fT * 0.5, fT * 0.7));
flow = warp * 0.6 + flow * 0.4;
gl_FragColor.rgb += waterMask * flow * 0.12 * oceanFlow;
gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(0.01, 0.06, 0.16), waterMask * oceanDeep);
vec3 finalColor = mix(gl_FragColor.rgb, rimColor, rim);
gl_FragColor = vec4(finalColor, 1.0);
vec3 surfPos = -vViewPosition;
float terrH = dot(texture2D(map, vCustomUv).rgb, vec3(0.299, 0.587, 0.114));
vec3 sigX = dFdx(surfPos), sigY = dFdy(surfPos);
vec3 vR1 = cross(sigY, normalizedNormal), vR2 = cross(normalizedNormal, sigX);
float fDet = dot(sigX, vR1);
vec3 vGrad = sign(fDet) * (dFdx(terrH) * vR1 + dFdy(terrH) * vR2);
vec3 bumpedNormal = normalize(abs(fDet) * normalizedNormal - terrainDepth * vGrad);
vec3 shadeNormal = mix(bumpedNormal, normalizedNormal, waterMask);
vec3 cityLights = texture2D(nightBlendTexture, vCustomUv).rgb * gl_FragColor.rgb * nightLights;
vec3 viewSunDir = normalize(vec3(-0.9, 0.18, 0.4));
float ndl = dot(normalizedNormal, viewSunDir);
float dayAmt = smoothstep(-0.05, 0.35, ndl);
float relief = dot(shadeNormal, viewSunDir) - ndl;
gl_FragColor.rgb *= clamp(1.0 + relief * terrainShade * dayAmt, 0.55, 1.6);
float nightFactor  = smoothstep(0.18, -0.30, ndl);
float lightsFactor = smoothstep(0.30, -0.35, ndl);
gl_FragColor.rgb = mix(gl_FragColor.rgb, gl_FragColor.rgb * 0.08, nightFactor);
gl_FragColor.rgb += cityLights * lightsFactor;
vec3 halfDir = normalize(viewSunDir + viewDir);
float ripple = snoise(vec3(vCustomUv * 240.0, time * 4.0));
float ndh = max(dot(normalizedNormal, halfDir) + ripple * 0.02, 0.0);
float glint = pow(ndh, 140.0);
gl_FragColor.rgb += glint * waterMask * dayAmt * oceanGlint * vec3(1.0, 0.97, 0.88);
```
The planet GLTF is DRACO-compressed: configure a `DRACOLoader` with
`setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.5/')` on the `GLTFLoader`.

### Scene hierarchy & grouping
`worldGroup` (scroll-driven parent — only ever gets position + uniform scale, never rotation) holds:
`planetGroup` (rotation.z = `CONFIG.tilt`) with the planet mesh; `cloudGroup` (rotation.z = tilt,
starts `visible=false` until the planet loads) with the cloud shells; and the atmosphere `glowMesh`.
Initialize `worldGroup.position=(STOPS_X[0].v, STOPS_Y[0].v, 0)`, `scale=STOPS_S[0].v`.

### Atmosphere halo glow (additive billboard plane) — VERBATIM
A `PlaneGeometry(2,2)` ShaderMaterial (transparent, DoubleSide, depthWrite:false, AdditiveBlending),
uniforms `uGlow=hexToVec3(CONFIG.glowColor)`, `uIntensity=CONFIG.glowIntensity`, scaled to
`planetRadius*2.3`, added to `worldGroup`, and billboarded each frame (`glowMesh.quaternion.copy(camera.quaternion)`).
```glsl
// vertex: varying vec2 vUv; void main(){ vUv=uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }
// fragment:
uniform vec3 uGlow; uniform float uIntensity; varying vec2 vUv;
void main(){
  float d = length(vUv - 0.5) * 2.0;
  float a = pow(clamp(1.0 - d, 0.0, 1.0), 2.2);
  gl_FragColor = vec4(uGlow * a * uIntensity, a);
}
```

### Cloud shells (3 layers) — `onBeforeCompile` injection (VERBATIM)
Load texture `planet-clouds.png`, `wrapS=wrapT=RepeatWrapping`, `repeat.set(5,5)`. For each layer
`[{h:cloud1Height,o:cloud1Opacity,s:cloud1Spin,ry:0.0,phase:0.0}, {cloud2…,ry:2.2,phase:13.0},
{cloud3…,ry:4.3,phase:27.0}]` build `SphereGeometry(planetRadius*hKey, 64, 64)` with a
`MeshStandardMaterial({ map:tex, transparent:true, depthWrite:false })`. Uniforms `uTime` (shared
`cloudTime`), `noiseScale 20`, `uSpeedX 1`, `uSpeedY 2`, `uSpeedZ 2`, `uOpacity`, `uPhase`. Vertex:
prepend `varying vec2 vCloudUv;` and set `vCloudUv = uv;`. Fragment: prepend uniforms + `${SNOISE}`,
then replace `#include <dithering_fragment>` with:
```glsl
#include <dithering_fragment>
gl_FragColor.rgb = vec3(1.0);
float cloudNoise = snoise(vec3(vCloudUv.x * noiseScale + uTime * uSpeedX + uPhase, vCloudUv.y * noiseScale - uTime * uSpeedY + uPhase, uTime * uSpeedZ + uPhase));
float cloudNdv = max(dot(normalize(vNormal), normalize(vViewPosition)), 0.0);
float cloudEdge = pow(1.0 - cloudNdv, 3.0);
float cloudMod = mix(cloudNoise, 1.0, cloudEdge);
float cloudNdl = dot(normalize(vNormal), normalize(vec3(-0.9, 0.18, 0.4)));
float cloudDay = 1.0 - smoothstep(0.30, -0.30, cloudNdl) * 0.9;
gl_FragColor.a *= cloudMod * uOpacity * cloudDay;
```
Each cloud mesh: `rotation.y = layer.ry`, `renderOrder = 2`, added to `cloudGroup`; in the loop spin
each by `+= dt * CONFIG[spinKey]`.

### Ambient atmosphere motes (Points) — VERBATIM
`CONFIG.atmoCount` points, random positions in [-1,1]³, `size = atmoSize*(0.4+rand)`, random `seed`.
Additive, depthWrite/test false. Each frame set `uTime = perfNow*atmoSpeed*8`, copy the points to the
camera position, and also drive `finalPass.uniforms.iTime` from this `onBeforeRender`.
```glsl
// vertex:
attribute float size; attribute float seed; uniform float uTime; uniform vec2 uRes;
varying float vA;
vec3 warp(vec3 p, float t){ float c=0.9,a=1.9,b=0.02,s=0.05; p*=2.;
  p.x+=c*sin(s*t+a*p.y)+t*b; p.y+=c*cos(s*t+a*p.x); p.y+=c*sin(s*t+a*p.z)+t*b;
  p.z+=c*cos(s*t+a*p.y); p.z+=c*sin(s*t+a*p.x)+t*b; p.x+=c*cos(s*t+a*p.z);
  return cos(p+vec3(1,2,4)); }
void main(){
  vec3 v = position*4.0 + warp(position, uTime)*1.2;
  vec4 mv = modelViewMatrix * vec4(v, 1.0);
  float r = length(v); float farF = 1.0 - smoothstep(5.0, 6.5, r); float nearF = smoothstep(0.0, 0.5, -mv.z);
  vA = farF * nearF;
  gl_PointSize = size * uRes.y / 900.0 / -mv.z; gl_PointSize = max(gl_PointSize, 1.0);
  gl_Position = projectionMatrix * mv;
}
// fragment:
uniform vec3 uColor; varying float vA;
void main(){ vec2 p = gl_PointCoord - 0.5; float l = length(p); if (l > 0.5) discard;
  float tex = smoothstep(0.5, 0.0, l); gl_FragColor = vec4(uColor * tex, tex * vA * 0.55); }
```

### Starfield (Points on a sphere, r=90) — VERBATIM
`CONFIG.starCount` points uniformly on a sphere radius 90, per-point `seed` and `bright=0.35+rand*0.65`.
Uniforms `uTime` (`starTime`, advanced by `dt`), `uSize`, `uFlicker`, `uColor`, `uRes`. Additive,
depthWrite false, depthTest true, frustumCulled false.
```glsl
// vertex:
attribute float seed; attribute float bright;
uniform float uTime; uniform float uSize; uniform float uFlicker; uniform vec2 uRes;
varying float vTw;
void main(){
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  float tw = 0.6 + 0.4 * sin(uTime * uFlicker + seed);
  vTw = bright * tw;
  gl_PointSize = max(uSize * uRes.y / 900.0 * (90.0 / max(-mv.z, 1.0)), 1.0);
  gl_Position = projectionMatrix * mv;
}
// fragment:
uniform vec3 uColor; varying float vTw;
void main(){
  vec2 p = gl_PointCoord - 0.5; float l = length(p); if (l > 0.5) discard;
  float core = smoothstep(0.5, 0.0, l);
  gl_FragColor = vec4(uColor, core * vTw);
}
```

### Land markers (golden radar pings on land) — VERBATIM
After the planet loads, sample `CONFIG.markerCount` points on the **land** (not ocean) surface:
read the planet base-color texture into a canvas; do area-weighted triangle sampling over the mesh
(cumulative-area binary search), barycentric-interpolate a UV, reject pixels where blue dominates
(`cb > cr+6 && cb > cg+6` → ocean), and push the lifted (×1.012) world position + a random `seed`.
Build a Points cloud added to the planet mesh. Uniforms `uTime` (`markerTime`, +=dt), `uColor`,
`uSize`, `uSpeed`, `uRes`. Additive, depthTest true, depthWrite false.
```glsl
// vertex:
attribute float seed; uniform float uSize; uniform vec2 uRes;
varying float vSeed; varying float vFade;
void main(){
  vSeed = seed;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vec3 vn = normalize(normalMatrix * normalize(position));
  vec3 vd = normalize(-mv.xyz);
  vFade = smoothstep(0.15, 0.5, dot(vn, vd));
  gl_PointSize = max(uSize * uRes.y / 900.0 * (7.0 / max(-mv.z, 1.0)), 2.0);
  gl_Position = projectionMatrix * mv;
}
// fragment:
uniform vec3 uColor; uniform float uTime; uniform float uSpeed;
varying float vSeed; varying float vFade;
void main(){
  if (vFade <= 0.001) discard;
  vec2 p = gl_PointCoord - 0.5;
  float d = length(p) * 2.0;
  if (d > 1.0) discard;
  float core = smoothstep(0.30, 0.0, d) * 1.2;
  float ph = fract(uTime * uSpeed + vSeed);
  float ring = smoothstep(0.07, 0.0, abs(d - ph)) * (1.0 - ph);
  gl_FragColor = vec4(uColor, clamp(core + ring, 0.0, 1.0) * vFade);
}
```

### Scroll storytelling (the hero "reveal" + page choreography) — bake in exactly
Scroll progress `p` (0 at top → 1 at bottom) drives the planet through smoothstep keyframes
(damped per-frame), so the globe enters huge and low, then zooms out and swings side to side:
```js
const STOPS_X = [{p:0,v:0},{p:0.32,v:-3.1},{p:0.64,v:3.2},{p:1,v:0}];
const STOPS_Y = [{p:0,v:-4.5},{p:0.32,v:0.55},{p:0.64,v:0.45},{p:1,v:0.15}];
const STOPS_S = [{p:0,v:2.15},{p:0.32,v:1.0},{p:0.64,v:0.92},{p:1,v:1.12}];
```
Per frame: `pTarget = clamp(scrollY / (scrollHeight-innerHeight), 0,1)`; `curP += (pTarget-curP)*min(1,dt*4.5)`.
A `sideScale = clamp(innerWidth/1200, 0.5, 1)` multiplies the X target (less lateral travel on
narrow screens). Damp `curX/curY/curS` toward `sample(STOPS_*, curP)` with `k=min(1,dt*3.2)`.
**One-time float-up entrance** when the planet finishes loading: `ENTRY_DUR=1.9`, `ENTRY_START_Y=-6.5`,
eased `1-(1-t)^3`, added on top of `curY`. Set `worldGroup.position=(curX, curY+entryY, 0)`,
`scale=curS`. The planet also turns with scroll: `planetGroup.rotation.y = CONFIG.initRotation +
spinPhase + curP*PI*1.6`, where `spinPhase += dt*CONFIG.spin`.

### Per-frame time advances & render order
`planetTime += dt/12`, `cloudTime += dt/20`, `starTime += dt`, `markerTime += dt` (clamp `dt ≤ 0.05`).
Then render the three composers in order with the camera's layer switched each time:
`camera.layers.set(TORUS_SCENE); torusComposer.render();`
`camera.layers.set(BLOOM_SCENE); bloomComposer.render();`
`camera.layers.set(ENTIRE_SCENE); finalComposer.render();`
On resize, update camera aspect + all three composers' pixel ratio/size and the `uRes` uniforms.

## The loader / reveal

There is no separate loading screen. The "reveal" is the combination of: the hero copy fading up in
sequence (60 → 180 → 300 → 420ms) on first paint, the planet's **one-time float-up entrance** (rising
from `y=-6.5` over ~1.9s once the GLTF loads) sitting low and huge behind the hero, and then the
scroll-driven zoom-out/side-swing described above. This low-globe hero with the rising planet is the
signature moment.

## Fixed parameters (bake these in)
- Palette: bg `#04060f`, accent `#5df0a8` / `#2fd38a`, accent-ink `#032018`, ink `#f3f6ff`,
  muted `#9aa6c4`/`#6b7796`, glass `rgba(12,18,38,.55)`/`rgba(16,24,48,.65)`. Scene bg `#040a1e`.
- Planet: radius 1.95, tilt 0.37, initRotation 2.07, spin 0.03, scroll-turn `curP*PI*1.6`.
- Bloom passes: torus (0.22, 0.2, 0), bloom (0.5, 0.6, 0). Flame amount 0.15; glow `#3a6cff`,
  intensity 3.35. Stars 1400 @ size 1.6; motes 320 @ size 22; markers 60 (gold `#ffd27a`) @ size 16.
- Reveal stagger ms per element exactly as listed; bar heights 62/88/47/95/71/80/58; row fills
  90/72/48/34; stat values 3.4× · 92% · 11k+ · $2.1B.

## Assets
The scene loads three assets — load each from our public bucket (not a relative path):

`ASSET_BASE_URL = https://api.getlayers.ai/storage/v1/object/public/public/assets/ascend-d9857ad1f2`

- `PLANET_GLB` (Earth mesh, DRACO-compressed — use the GLTFLoader+DRACOLoader above) →
  `https://api.getlayers.ai/storage/v1/object/public/public/assets/ascend-d9857ad1f2/planet.glb`
- `PLANET_LIGHTS_GLB` (night city-lights mesh; its material map is the night texture) →
  `https://api.getlayers.ai/storage/v1/object/public/public/assets/ascend-d9857ad1f2/planet-lights.glb`
- `PLANET_CLOUDS_PNG` (cloud shell texture, RepeatWrapping ×5) →
  `https://api.getlayers.ai/storage/v1/object/public/public/assets/ascend-d9857ad1f2/planet-clouds.png`