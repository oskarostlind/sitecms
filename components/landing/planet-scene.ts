/**
 * Immersiv WebGL-planet för landningssidan – porterad från docs/LANDING-SPEC.md.
 *
 * Modulen importerar three statiskt men laddas bara via dynamic import från
 * <PlanetScene/> i webbläsaren, så three hamnar aldrig i server-bundlen och
 * inte heller i sidans initiala JS-chunk.
 *
 * Skriven mot three r0.143 (WebGL1Renderer, outputEncoding, sRGBEncoding,
 * VSMShadowMap) – shader-injektionen förlitar sig på den versionens chunk-namn.
 */
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { GammaCorrectionShader } from "three/examples/jsm/shaders/GammaCorrectionShader.js";
import { CopyShader } from "three/examples/jsm/shaders/CopyShader.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

/* ------------------------------------------------------------------------ */
/* CONFIG                                                                    */
/* ------------------------------------------------------------------------ */

const CONFIG = {
  rimColor: "#c1faff", rimPower: 2.4, nightLights: 10, terrainDepth: 0.33, terrainShade: 1.3,
  oceanGlint: 0.45, oceanDeep: 0.12, oceanFlow: 3, oceanFlowSpeed: 0.8, oceanFlowScale: 2.1,
  glowColor: "#3a6cff", glowIntensity: 3.35, planetRadius: 1.95, spin: 0.03, initRotation: 2.07,
  tilt: 0.37, autoRotate: 0,
  cloud1Height: 1.005, cloud1Opacity: 0.6, cloud1Spin: 0.06,
  cloud2Height: 1.03, cloud2Opacity: 0.5, cloud2Spin: 0.14,
  cloud3Height: 1.075, cloud3Opacity: 0.5, cloud3Spin: 0.1,
  bgColor: "#040a1e", flameColor: "#3a6cff", flameColor2: "#c1faff", flameAmt: 0.15,
  atmoColor: "#9fc4ff", atmoCount: 320, atmoSize: 22, atmoSpeed: 0.8,
  starColor: "#cfe0ff", starCount: 1400, starSize: 1.6, starFlicker: 1,
  markerColor: "#ffd27a", markerCount: 60, markerSize: 16, markerSpeed: 0.5,
};
const LAYERS = { NONE: 0, TORUS_SCENE: 1, BLOOM_SCENE: 2, ENTIRE_SCENE: 3 };

const ASSETS = {
  PLANET_GLB: "/planet/planet.glb",
  PLANET_LIGHTS_GLB: "/planet/planet-lights.glb",
  PLANET_CLOUDS_PNG: "/planet/planet-clouds.png",
};
const DRACO_DECODER_PATH = "https://www.gstatic.com/draco/versioned/decoders/1.5.5/";

/* Scroll-storytelling: keyframes för worldGroup (x, y, uniform skala). */
type Stop = { p: number; v: number };
const STOPS_X: Stop[] = [{ p: 0, v: 0 }, { p: 0.32, v: -3.1 }, { p: 0.64, v: 3.2 }, { p: 1, v: 0 }];
const STOPS_Y: Stop[] = [{ p: 0, v: -4.5 }, { p: 0.32, v: 0.55 }, { p: 0.64, v: 0.45 }, { p: 1, v: 0.15 }];
const STOPS_S: Stop[] = [{ p: 0, v: 2.15 }, { p: 0.32, v: 1.0 }, { p: 0.64, v: 0.92 }, { p: 1, v: 1.12 }];

const ENTRY_DUR = 1.9;
const ENTRY_START_Y = -6.5;

/* ------------------------------------------------------------------------ */
/* Helpers                                                                   */
/* ------------------------------------------------------------------------ */

const Lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
function hexToVec3(hex: string) {
  const c = new THREE.Color(hex);
  return new THREE.Vector3(c.r, c.g, c.b);
}
function sample(stops: Stop[], p: number) {
  if (p <= stops[0].p) return stops[0].v;
  for (let i = 0; i < stops.length - 1; i++) {
    const a = stops[i];
    const b = stops[i + 1];
    if (p <= b.p) {
      let t = (p - a.p) / (b.p - a.p);
      t = t * t * (3 - 2 * t);
      return Lerp(a.v, b.v, t);
    }
  }
  return stops[stops.length - 1].v;
}

/* ------------------------------------------------------------------------ */
/* Shared simplex noise (GLSL) – VERBATIM                                    */
/* ------------------------------------------------------------------------ */

const SNOISE = /* glsl */ `
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
`;

/* ------------------------------------------------------------------------ */
/* FinalPass – bg + corner-flame composite (VERBATIM)                        */
/* ------------------------------------------------------------------------ */

const FinalPass = {
  uniforms: {
    iTime: { value: 0 }, tDiffuse: { value: null }, torusTexture: { value: null }, bloomTexture: { value: null }, haloTexture: { value: null },
    uBg: { value: hexToVec3(CONFIG.bgColor) }, uFlameA: { value: hexToVec3(CONFIG.flameColor) },
    uFlameB: { value: hexToVec3(CONFIG.flameColor2) }, uFlameAmt: { value: CONFIG.flameAmt },
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

/* ------------------------------------------------------------------------ */
/* Planet-materialets fragment-injektion (VERBATIM)                          */
/* ------------------------------------------------------------------------ */

const PLANET_FRAG_UNIFORMS = /* glsl */ `
uniform float time; uniform float noiseScale; uniform float speedX; uniform float speedY; uniform float speedZ;
uniform vec3 rimColor; uniform float rimPower; uniform sampler2D nightBlendTexture; uniform float nightLights;
uniform float terrainDepth; uniform float terrainShade; uniform float oceanGlint; uniform float oceanDeep;
uniform float oceanFlow; uniform float oceanFlowSpeed; uniform float oceanFlowScale;
varying vec2 vCustomUv;
`;

const PLANET_FRAG = /* glsl */ `
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
`;

/* ------------------------------------------------------------------------ */
/* Atmosfärhalo (VERBATIM)                                                   */
/* ------------------------------------------------------------------------ */

const GLOW_VERT = /* glsl */ `varying vec2 vUv; void main(){ vUv=uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`;
const GLOW_FRAG = /* glsl */ `
uniform vec3 uGlow; uniform float uIntensity; varying vec2 vUv;
void main(){
  float d = length(vUv - 0.5) * 2.0;
  float a = pow(clamp(1.0 - d, 0.0, 1.0), 2.2);
  gl_FragColor = vec4(uGlow * a * uIntensity, a);
}
`;

/* ------------------------------------------------------------------------ */
/* Molnskal (VERBATIM)                                                       */
/* ------------------------------------------------------------------------ */

const CLOUD_FRAG_UNIFORMS = /* glsl */ `
uniform float uTime; uniform float noiseScale; uniform float uSpeedX; uniform float uSpeedY; uniform float uSpeedZ;
uniform float uOpacity; uniform float uPhase;
varying vec2 vCloudUv;
`;

const CLOUD_FRAG = /* glsl */ `
#include <dithering_fragment>
gl_FragColor.rgb = vec3(1.0);
float cloudNoise = snoise(vec3(vCloudUv.x * noiseScale + uTime * uSpeedX + uPhase, vCloudUv.y * noiseScale - uTime * uSpeedY + uPhase, uTime * uSpeedZ + uPhase));
float cloudNdv = max(dot(normalize(vNormal), normalize(vViewPosition)), 0.0);
float cloudEdge = pow(1.0 - cloudNdv, 3.0);
float cloudMod = mix(cloudNoise, 1.0, cloudEdge);
float cloudNdl = dot(normalize(vNormal), normalize(vec3(-0.9, 0.18, 0.4)));
float cloudDay = 1.0 - smoothstep(0.30, -0.30, cloudNdl) * 0.9;
gl_FragColor.a *= cloudMod * uOpacity * cloudDay;
`;

/* ------------------------------------------------------------------------ */
/* Motes (VERBATIM)                                                          */
/* ------------------------------------------------------------------------ */

const MOTES_VERT = /* glsl */ `
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
`;
const MOTES_FRAG = /* glsl */ `
uniform vec3 uColor; varying float vA;
void main(){ vec2 p = gl_PointCoord - 0.5; float l = length(p); if (l > 0.5) discard;
  float tex = smoothstep(0.5, 0.0, l); gl_FragColor = vec4(uColor * tex, tex * vA * 0.55); }
`;

/* ------------------------------------------------------------------------ */
/* Stjärnfält (VERBATIM)                                                     */
/* ------------------------------------------------------------------------ */

const STARS_VERT = /* glsl */ `
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
`;
const STARS_FRAG = /* glsl */ `
uniform vec3 uColor; varying float vTw;
void main(){
  vec2 p = gl_PointCoord - 0.5; float l = length(p); if (l > 0.5) discard;
  float core = smoothstep(0.5, 0.0, l);
  gl_FragColor = vec4(uColor, core * vTw);
}
`;

/* ------------------------------------------------------------------------ */
/* Landmarkörer (VERBATIM)                                                   */
/* ------------------------------------------------------------------------ */

const MARKER_VERT = /* glsl */ `
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
`;
const MARKER_FRAG = /* glsl */ `
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
`;

/* ------------------------------------------------------------------------ */
/* Scenen                                                                    */
/* ------------------------------------------------------------------------ */

export type PlanetSceneOptions = {
  /** prefers-reduced-motion: hoppar över float-up-entrén. */
  reducedMotion: boolean;
};

type Disposable = { dispose: () => void };
type AnyPass = {
  dispose?: () => void;
  fsQuad?: Disposable;
  material?: THREE.Material;
  copyUniforms?: unknown;
};

/**
 * Monterar scenen på `canvas` och returnerar en cleanup-funktion.
 * Kastar synkront om WebGL saknas – anroparen fångar det.
 */
export function createPlanetScene(canvas: HTMLCanvasElement, options: PlanetSceneOptions): () => void {
  let disposed = false;
  let raf = 0;

  let width = window.innerWidth;
  let height = window.innerHeight;

  /* ---- Renderer / scene / camera ------------------------------------- */
  const renderer = new THREE.WebGL1Renderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(width, height, false);
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.VSMShadowMap;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);

  const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 200);
  camera.position.set(0, 0, 8);
  camera.layers.enable(LAYERS.TORUS_SCENE);
  camera.layers.enable(LAYERS.BLOOM_SCENE);
  camera.layers.enable(LAYERS.ENTIRE_SCENE);
  scene.add(camera);

  const ambient = new THREE.AmbientLight(0xffffff, 1.8);
  ambient.layers.set(LAYERS.ENTIRE_SCENE);
  scene.add(ambient);
  const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
  dirLight.position.set(0, 10, 2);
  dirLight.layers.set(LAYERS.ENTIRE_SCENE);
  scene.add(dirLight);

  const pixelRatio = () => renderer.getPixelRatio();
  const resU = { value: new THREE.Vector2(width * pixelRatio(), height * pixelRatio()) };

  /* ---- Composers ------------------------------------------------------ */
  const torusComposer = new EffectComposer(renderer);
  torusComposer.renderToScreen = false;
  torusComposer.addPass(new RenderPass(scene, camera));
  torusComposer.addPass(new ShaderPass(GammaCorrectionShader));
  torusComposer.addPass(new UnrealBloomPass(new THREE.Vector2(width, height), 0.22, 0.2, 0));
  torusComposer.addPass(new ShaderPass(CopyShader));

  const bloomComposer = new EffectComposer(renderer);
  bloomComposer.renderToScreen = false;
  bloomComposer.addPass(new RenderPass(scene, camera));
  bloomComposer.addPass(new UnrealBloomPass(new THREE.Vector2(width, height), 0.5, 0.6, 0));
  bloomComposer.addPass(new ShaderPass(GammaCorrectionShader));

  const finalComposer = new EffectComposer(renderer);
  finalComposer.addPass(new RenderPass(scene, camera));
  const finalPass = new ShaderPass(FinalPass);
  // ShaderPass klonar uniforms (även texturer) – därför sätts RT-texturerna
  // på passets egna uniforms efteråt, inte i FinalPass-definitionen.
  finalPass.uniforms.bloomTexture.value = bloomComposer.renderTarget1.texture;
  finalPass.uniforms.torusTexture.value = torusComposer.renderTarget1.texture;
  finalComposer.addPass(finalPass);

  const composers = [torusComposer, bloomComposer, finalComposer];

  /* ---- Controls (aldrig interaktiva) --------------------------------- */
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.enablePan = false;
  controls.enabled = false;
  controls.autoRotate = true;
  controls.autoRotateSpeed = CONFIG.autoRotate;
  controls.minDistance = 3.5;
  controls.maxDistance = 16;
  controls.target.set(0, 0, 0);

  /* ---- Hierarki ------------------------------------------------------- */
  const worldGroup = new THREE.Group();
  const planetGroup = new THREE.Group();
  planetGroup.rotation.z = CONFIG.tilt;
  const cloudGroup = new THREE.Group();
  cloudGroup.rotation.z = CONFIG.tilt;
  cloudGroup.visible = false;
  worldGroup.add(planetGroup, cloudGroup);
  worldGroup.position.set(STOPS_X[0].v, STOPS_Y[0].v, 0);
  worldGroup.scale.setScalar(STOPS_S[0].v);
  scene.add(worldGroup);

  /* ---- Delade tider --------------------------------------------------- */
  const planetTimeU = { value: 0 };
  const cloudTimeU = { value: 0 };
  const starTimeU = { value: 0 };
  const markerTimeU = { value: 0 };

  /* ---- Atmosfärhalo --------------------------------------------------- */
  const glowMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(2, 2),
    new THREE.ShaderMaterial({
      uniforms: {
        uGlow: { value: hexToVec3(CONFIG.glowColor) },
        uIntensity: { value: CONFIG.glowIntensity },
      },
      vertexShader: GLOW_VERT,
      fragmentShader: GLOW_FRAG,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  glowMesh.scale.setScalar(CONFIG.planetRadius * 2.3);
  glowMesh.layers.set(LAYERS.ENTIRE_SCENE);
  // Halon visas först när planeten finns (annars en ensam blå fläck).
  glowMesh.visible = false;
  worldGroup.add(glowMesh);

  /* ---- Molnskal (3 lager) -------------------------------------------- */
  const cloudTex = new THREE.TextureLoader().load(ASSETS.PLANET_CLOUDS_PNG);
  cloudTex.wrapS = cloudTex.wrapT = THREE.RepeatWrapping;
  cloudTex.repeat.set(5, 5);

  const cloudLayers = [
    { h: CONFIG.cloud1Height, o: CONFIG.cloud1Opacity, s: CONFIG.cloud1Spin, ry: 0.0, phase: 0.0 },
    { h: CONFIG.cloud2Height, o: CONFIG.cloud2Opacity, s: CONFIG.cloud2Spin, ry: 2.2, phase: 13.0 },
    { h: CONFIG.cloud3Height, o: CONFIG.cloud3Opacity, s: CONFIG.cloud3Spin, ry: 4.3, phase: 27.0 },
  ];
  const cloudMeshes = cloudLayers.map((layer) => {
    const mat = new THREE.MeshStandardMaterial({ map: cloudTex, transparent: true, depthWrite: false });
    const uniforms = {
      uTime: cloudTimeU,
      noiseScale: { value: 20 },
      uSpeedX: { value: 1 },
      uSpeedY: { value: 2 },
      uSpeedZ: { value: 2 },
      uOpacity: { value: layer.o },
      uPhase: { value: layer.phase },
    };
    mat.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, uniforms);
      shader.vertexShader =
        "varying vec2 vCloudUv;\n" +
        shader.vertexShader.replace("void main() {", "void main() {\n\tvCloudUv = uv;");
      shader.fragmentShader =
        CLOUD_FRAG_UNIFORMS +
        SNOISE +
        shader.fragmentShader.replace("#include <dithering_fragment>", CLOUD_FRAG);
    };
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(CONFIG.planetRadius * layer.h, 64, 64), mat);
    mesh.rotation.y = layer.ry;
    mesh.renderOrder = 2;
    mesh.layers.set(LAYERS.TORUS_SCENE);
    cloudGroup.add(mesh);
    return { mesh, spin: layer.s };
  });

  /* ---- Motes ---------------------------------------------------------- */
  const moteUniforms = {
    uTime: { value: 0 },
    uRes: resU,
    uColor: { value: new THREE.Color(CONFIG.atmoColor) },
  };
  const moteGeo = new THREE.BufferGeometry();
  {
    const n = CONFIG.atmoCount;
    const pos = new Float32Array(n * 3);
    const size = new Float32Array(n);
    const seed = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      pos[i * 3] = Math.random() * 2 - 1;
      pos[i * 3 + 1] = Math.random() * 2 - 1;
      pos[i * 3 + 2] = Math.random() * 2 - 1;
      size[i] = CONFIG.atmoSize * (0.4 + Math.random());
      seed[i] = Math.random();
    }
    moteGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    moteGeo.setAttribute("size", new THREE.BufferAttribute(size, 1));
    moteGeo.setAttribute("seed", new THREE.BufferAttribute(seed, 1));
  }
  const motes = new THREE.Points(
    moteGeo,
    new THREE.ShaderMaterial({
      uniforms: moteUniforms,
      vertexShader: MOTES_VERT,
      fragmentShader: MOTES_FRAG,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: false,
    }),
  );
  motes.frustumCulled = false;
  motes.layers.set(LAYERS.ENTIRE_SCENE);
  motes.onBeforeRender = (_r, _s, cam) => {
    const perfNow = performance.now() / 1000;
    moteUniforms.uTime.value = perfNow * CONFIG.atmoSpeed * 8;
    motes.position.copy(cam.position);
    finalPass.uniforms.iTime.value = perfNow;
  };
  scene.add(motes);

  /* ---- Stjärnfält ----------------------------------------------------- */
  const starGeo = new THREE.BufferGeometry();
  {
    const n = CONFIG.starCount;
    const pos = new Float32Array(n * 3);
    const seed = new Float32Array(n);
    const bright = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const u = Math.random() * 2 - 1;
      const phi = Math.random() * Math.PI * 2;
      const s = Math.sqrt(1 - u * u);
      pos[i * 3] = 90 * s * Math.cos(phi);
      pos[i * 3 + 1] = 90 * u;
      pos[i * 3 + 2] = 90 * s * Math.sin(phi);
      seed[i] = Math.random() * Math.PI * 2;
      bright[i] = 0.35 + Math.random() * 0.65;
    }
    starGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    starGeo.setAttribute("seed", new THREE.BufferAttribute(seed, 1));
    starGeo.setAttribute("bright", new THREE.BufferAttribute(bright, 1));
  }
  const stars = new THREE.Points(
    starGeo,
    new THREE.ShaderMaterial({
      uniforms: {
        uTime: starTimeU,
        uSize: { value: CONFIG.starSize },
        uFlicker: { value: CONFIG.starFlicker },
        uColor: { value: new THREE.Color(CONFIG.starColor) },
        uRes: resU,
      },
      vertexShader: STARS_VERT,
      fragmentShader: STARS_FRAG,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: true,
    }),
  );
  stars.frustumCulled = false;
  stars.layers.set(LAYERS.BLOOM_SCENE);
  scene.add(stars);

  /* ---- Planet (asynkront) -------------------------------------------- */
  const draco = new DRACOLoader();
  draco.setDecoderPath(DRACO_DECODER_PATH);
  const gltfLoader = new GLTFLoader();
  gltfLoader.setDRACOLoader(draco);

  let planetLoaded = false;
  let nightTex: THREE.Texture | null = null;
  let entryStart = -1; // clock-tid då entrén startade
  const clock = new THREE.Clock();

  const firstMesh = (root: THREE.Object3D): THREE.Mesh | null => {
    let found: THREE.Mesh | null = null;
    root.traverse((o) => {
      if (!found && (o as THREE.Mesh).isMesh) found = o as THREE.Mesh;
    });
    return found;
  };

  const loadPlanet = async () => {
    const lightsGltf = await gltfLoader.loadAsync(ASSETS.PLANET_LIGHTS_GLB);
    if (disposed) return disposeObject(lightsGltf.scene, true);
    const lightsMesh = firstMesh(lightsGltf.scene);
    nightTex = lightsMesh ? (lightsMesh.material as THREE.MeshStandardMaterial).map : null;
    // Bara texturen behövs – släpp mesh + material (men inte map:en).
    if (lightsMesh) {
      lightsMesh.geometry.dispose();
      (lightsMesh.material as THREE.Material).dispose();
    }

    const planetGltf = await gltfLoader.loadAsync(ASSETS.PLANET_GLB);
    if (disposed) {
      nightTex?.dispose();
      return disposeObject(planetGltf.scene, true);
    }
    const planet = firstMesh(planetGltf.scene);
    if (!planet) throw new Error("planet.glb saknar mesh");

    planet.geometry.computeBoundingSphere();
    const r = planet.geometry.boundingSphere?.radius || 1;
    planet.removeFromParent();
    planet.position.set(0, 0, 0);
    planet.rotation.set(0, 0, 0);
    planet.scale.setScalar(CONFIG.planetRadius / r);

    const srcMat = planet.material as THREE.MeshStandardMaterial;
    const mat = srcMat.clone();
    srcMat.dispose();
    mat.metalness = 0;
    mat.roughness = 1;
    mat.envMapIntensity = 0;
    // dFdx/dFdy i injektionen kräver OES_standard_derivatives i WebGL1.
    (mat as unknown as { extensions: { derivatives: boolean } }).extensions = { derivatives: true };

    const planetUniforms = {
      time: planetTimeU,
      noiseScale: { value: 30 },
      speedX: { value: 1.5 },
      speedY: { value: 2.0 },
      speedZ: { value: 2.5 },
      rimColor: { value: new THREE.Color(CONFIG.rimColor) },
      rimPower: { value: CONFIG.rimPower },
      nightBlendTexture: { value: nightTex },
      nightLights: { value: CONFIG.nightLights },
      terrainDepth: { value: CONFIG.terrainDepth },
      terrainShade: { value: CONFIG.terrainShade },
      oceanGlint: { value: CONFIG.oceanGlint },
      oceanDeep: { value: CONFIG.oceanDeep },
      oceanFlow: { value: CONFIG.oceanFlow },
      oceanFlowSpeed: { value: CONFIG.oceanFlowSpeed },
      oceanFlowScale: { value: CONFIG.oceanFlowScale },
    };
    mat.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, planetUniforms);
      shader.vertexShader =
        "varying vec2 vCustomUv;\n" +
        shader.vertexShader.replace("void main() {", "void main() {\n\tvCustomUv = uv;");
      shader.fragmentShader =
        PLANET_FRAG_UNIFORMS +
        SNOISE +
        shader.fragmentShader.replace("#include <dithering_fragment>", PLANET_FRAG);
    };
    planet.material = mat;
    planet.layers.set(LAYERS.ENTIRE_SCENE);
    planetGroup.add(planet);

    // Stjärnor + markörer renderas i BLOOM-passet (depthTest:true) där planeten
    // inte finns. En svart sfär i samma lager skymmer stjärnorna bakom
    // planeten; svart bidrar med 0 i FinalPass-summan.
    const occluder = new THREE.Mesh(
      new THREE.SphereGeometry(CONFIG.planetRadius, 64, 64),
      new THREE.MeshBasicMaterial({ color: 0x000000 }),
    );
    occluder.layers.set(LAYERS.BLOOM_SCENE);
    planetGroup.add(occluder);

    try {
      addMarkers(planet, mat);
    } catch (err) {
      console.warn("[planet] kunde inte placera landmarkörer", err);
    }

    cloudGroup.visible = true;
    glowMesh.visible = true;
    planetLoaded = true;
    entryStart = clock.getElapsedTime();
  };

  /* ---- Landmarkörer --------------------------------------------------- */
  const addMarkers = (planet: THREE.Mesh, mat: THREE.MeshStandardMaterial) => {
    const img = mat.map?.image as CanvasImageSource & { width: number; height: number } | undefined;
    if (!img || !img.width) return;
    // Nedskalad kopia räcker för land/hav-klassning och sparar minne.
    const scale = Math.min(1, 1024 / img.width);
    const cw = Math.max(1, Math.round(img.width * scale));
    const ch = Math.max(1, Math.round(img.height * scale));
    const cvs = document.createElement("canvas");
    cvs.width = cw;
    cvs.height = ch;
    const ctx = cvs.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;
    ctx.drawImage(img, 0, 0, cw, ch);
    const pixels = ctx.getImageData(0, 0, cw, ch).data;

    const geo = planet.geometry;
    const posAttr = geo.getAttribute("position") as THREE.BufferAttribute;
    const uvAttr = geo.getAttribute("uv") as THREE.BufferAttribute;
    if (!posAttr || !uvAttr) return;
    const index = geo.getIndex();
    const triCount = index ? index.count / 3 : posAttr.count / 3;
    const vi = (t: number, k: number) => (index ? index.getX(t * 3 + k) : t * 3 + k);

    const a = new THREE.Vector3();
    const b = new THREE.Vector3();
    const c = new THREE.Vector3();
    const ab = new THREE.Vector3();
    const ac = new THREE.Vector3();
    const cum = new Float64Array(triCount);
    let total = 0;
    for (let t = 0; t < triCount; t++) {
      a.fromBufferAttribute(posAttr, vi(t, 0));
      b.fromBufferAttribute(posAttr, vi(t, 1));
      c.fromBufferAttribute(posAttr, vi(t, 2));
      ab.subVectors(b, a);
      ac.subVectors(c, a);
      total += ab.cross(ac).length() * 0.5;
      cum[t] = total;
    }
    if (total <= 0) return;

    const positions: number[] = [];
    const seeds: number[] = [];
    const uvA = new THREE.Vector2();
    const uvB = new THREE.Vector2();
    const uvC = new THREE.Vector2();
    const p = new THREE.Vector3();
    const maxTries = CONFIG.markerCount * 400;
    for (let tries = 0; tries < maxTries && seeds.length < CONFIG.markerCount; tries++) {
      // Areaviktad triangelsampling – binärsök i kumulativ area.
      const target = Math.random() * total;
      let lo = 0;
      let hi = triCount - 1;
      while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (cum[mid] < target) lo = mid + 1;
        else hi = mid;
      }
      const t = lo;
      let u1 = Math.random();
      let u2 = Math.random();
      if (u1 + u2 > 1) {
        u1 = 1 - u1;
        u2 = 1 - u2;
      }
      const w0 = 1 - u1 - u2;
      const i0 = vi(t, 0);
      const i1 = vi(t, 1);
      const i2 = vi(t, 2);
      uvA.fromBufferAttribute(uvAttr, i0);
      uvB.fromBufferAttribute(uvAttr, i1);
      uvC.fromBufferAttribute(uvAttr, i2);
      const u = uvA.x * w0 + uvB.x * u1 + uvC.x * u2;
      const v = uvA.y * w0 + uvB.y * u1 + uvC.y * u2;
      const fu = u - Math.floor(u);
      const fv = v - Math.floor(v);
      // GLTF-texturer har flipY=false: v=0 är bildens överkant.
      const px = Math.min(cw - 1, Math.floor(fu * cw));
      const py = Math.min(ch - 1, Math.floor(fv * ch));
      const o = (py * cw + px) * 4;
      const cr = pixels[o];
      const cg = pixels[o + 1];
      const cb = pixels[o + 2];
      if (cb > cr + 6 && cb > cg + 6) continue; // hav

      a.fromBufferAttribute(posAttr, i0);
      b.fromBufferAttribute(posAttr, i1);
      c.fromBufferAttribute(posAttr, i2);
      p.set(0, 0, 0).addScaledVector(a, w0).addScaledVector(b, u1).addScaledVector(c, u2).multiplyScalar(1.012);
      positions.push(p.x, p.y, p.z);
      seeds.push(Math.random());
    }
    if (!seeds.length) return;

    const mGeo = new THREE.BufferGeometry();
    mGeo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    mGeo.setAttribute("seed", new THREE.Float32BufferAttribute(seeds, 1));
    const markers = new THREE.Points(
      mGeo,
      new THREE.ShaderMaterial({
        uniforms: {
          uTime: markerTimeU,
          uColor: { value: new THREE.Color(CONFIG.markerColor) },
          uSize: { value: CONFIG.markerSize },
          uSpeed: { value: CONFIG.markerSpeed },
          uRes: resU,
        },
        vertexShader: MARKER_VERT,
        fragmentShader: MARKER_FRAG,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthTest: true,
        depthWrite: false,
      }),
    );
    markers.layers.set(LAYERS.BLOOM_SCENE);
    // Positionerna är i planetens lokala rymd (barn till planet-meshen).
    planet.add(markers);
  };

  loadPlanet().catch((err) => {
    if (!disposed) console.warn("[planet] kunde inte ladda planeten", err);
  });

  /* ---- Scroll-storytelling-state ------------------------------------- */
  let curP = 0;
  let curX = STOPS_X[0].v;
  let curY = STOPS_Y[0].v;
  let curS = STOPS_S[0].v;
  let spinPhase = 0;

  /* ---- Loop ----------------------------------------------------------- */
  const frame = () => {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(clock.getDelta(), 0.05);
    const elapsed = clock.getElapsedTime();

    const doc = document.documentElement;
    const max = doc.scrollHeight - window.innerHeight;
    const pTarget = max > 0 ? clamp(window.scrollY / max, 0, 1) : 0;
    curP += (pTarget - curP) * Math.min(1, dt * 4.5);

    const sideScale = clamp(window.innerWidth / 1200, 0.5, 1);
    const k = Math.min(1, dt * 3.2);
    curX += (sample(STOPS_X, curP) * sideScale - curX) * k;
    curY += (sample(STOPS_Y, curP) - curY) * k;
    curS += (sample(STOPS_S, curP) - curS) * k;

    // One-time float-up-entré när planeten laddat (hoppas över vid reduced motion).
    let entryY = 0;
    if (!options.reducedMotion) {
      if (!planetLoaded) {
        entryY = ENTRY_START_Y;
      } else {
        const t = clamp((elapsed - entryStart) / ENTRY_DUR, 0, 1);
        const eased = 1 - Math.pow(1 - t, 3);
        entryY = Lerp(ENTRY_START_Y, 0, eased);
      }
    }

    worldGroup.position.set(curX, curY + entryY, 0);
    worldGroup.scale.setScalar(curS);

    spinPhase += dt * CONFIG.spin;
    planetGroup.rotation.y = CONFIG.initRotation + spinPhase + curP * Math.PI * 1.6;
    for (const cm of cloudMeshes) cm.mesh.rotation.y += dt * cm.spin;

    planetTimeU.value += dt / 12;
    cloudTimeU.value += dt / 20;
    starTimeU.value += dt;
    markerTimeU.value += dt;

    controls.update();
    glowMesh.quaternion.copy(camera.quaternion);

    camera.layers.set(LAYERS.TORUS_SCENE);
    torusComposer.render();
    camera.layers.set(LAYERS.BLOOM_SCENE);
    bloomComposer.render();
    camera.layers.set(LAYERS.ENTIRE_SCENE);
    finalComposer.render();
  };
  raf = requestAnimationFrame(frame);

  /* ---- Resize --------------------------------------------------------- */
  const onResize = () => {
    width = window.innerWidth;
    height = window.innerHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
    const pr = pixelRatio();
    for (const c of composers) {
      c.setPixelRatio(pr);
      c.setSize(width, height);
    }
    resU.value.set(width * pr, height * pr);
  };
  window.addEventListener("resize", onResize);

  /* ---- Cleanup -------------------------------------------------------- */
  return () => {
    if (disposed) return;
    disposed = true;
    cancelAnimationFrame(raf);
    window.removeEventListener("resize", onResize);
    controls.dispose();
    draco.dispose();

    disposeObject(scene, false);
    cloudTex.dispose();
    nightTex?.dispose();

    for (const c of composers) {
      for (const pass of c.passes as unknown as AnyPass[]) {
        pass.dispose?.();
        pass.fsQuad?.dispose();
        pass.material?.dispose();
      }
      (c as unknown as { copyPass?: AnyPass }).copyPass?.material?.dispose();
      c.renderTarget1.dispose();
      c.renderTarget2.dispose();
    }

    renderer.dispose();
  };
}

/** Disponerar geometrier, material och deras texturer under `root`. */
function disposeObject(root: THREE.Object3D, removeFromParent: boolean) {
  const textures = new Set<THREE.Texture>();
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (mesh.geometry) mesh.geometry.dispose();
    const mats = mesh.material ? (Array.isArray(mesh.material) ? mesh.material : [mesh.material]) : [];
    for (const m of mats) {
      for (const val of Object.values(m)) {
        if (val && (val as THREE.Texture).isTexture) textures.add(val as THREE.Texture);
      }
      const uniforms = (m as THREE.ShaderMaterial).uniforms;
      if (uniforms) {
        for (const u of Object.values(uniforms)) {
          const v = (u as { value?: unknown })?.value as THREE.Texture | undefined;
          if (v && v.isTexture) textures.add(v);
        }
      }
      m.dispose();
    }
  });
  textures.forEach((t) => t.dispose());
  if (removeFromParent) root.removeFromParent();
}
