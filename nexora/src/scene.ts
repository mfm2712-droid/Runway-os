import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { createGlasses, createWatch } from './models';

/** Everything the scroll timeline animates lives on this plain object (GSAP tweens it). */
export const S = {
  boot: 0, // 0 → 1 universe materialises
  watchRise: 0, // watch emerges from the liquid metal
  watchSpin: 0,
  explode: 0, // layered transformation
  holo: 0, // biometric holograms
  portal: 0, // dimensional portal opens
  glassesOut: 0, // glasses emerge from portal
  worldMix: 0, // 0 = cyan liquid world, 1 = ultraviolet portal world
  spatial: 0,
  config: 0, // configurator staging
  configProduct: 0, // 0 watch, 1 glasses (tweened)
  finale: 0,
};

export interface Scene {
  setWatchColor: (hex: string) => void;
  setGlassesColor: (hex: string) => void;
  setWatchSize: (big: boolean) => void;
  bpm: number;
}

const BG_FRAG = /* glsl */ `
precision highp float;
uniform float uTime; uniform vec2 uRes; uniform vec2 uPointer; uniform float uMix; uniform float uBoot; uniform float uPortal; uniform float uFinale;
varying vec2 vUv;
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
float noise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),f.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x), f.y); }
float fbm(vec2 p){ float v=0., a=.5; for(int i=0;i<5;i++){ v+=a*noise(p); p*=2.03; a*=.5; } return v; }
void main(){
  vec2 uv = vUv; vec2 p = (uv - .5) * vec2(uRes.x/uRes.y, 1.);
  vec2 m = (uPointer - .5) * vec2(uRes.x/uRes.y, 1.);
  float d = length(p - m*0.35);
  float t = uTime * .05;
  // volumetric aurora
  float n = fbm(p*1.6 + vec2(t, -t*.7) + m*.3);
  float n2 = fbm(p*3.1 - vec2(t*1.3, t) + n);
  vec3 cyan = vec3(.25,.97,1.), uv_ = vec3(.54,.24,1.), mag = vec3(1.,.25,.85);
  vec3 col = vec3(.008,.01,.03);
  col += cyan * pow(n2, 3.) * .55 * (1.-uMix);
  col += uv_ * pow(n, 2.5) * (.35 + .55*uMix);
  col += mag * pow(n2*n, 3.) * .5 * uMix;
  // pointer glow
  col += mix(cyan, uv_, uMix) * .12 / (d*d*8. + .4);
  // light beams
  float beam = pow(max(0., 1. - abs(p.x*2.2 + sin(p.y*2.+t*3.)*.1)), 18.) * .25;
  col += cyan * beam * (1.-uPortal);
  // dimensional portal tunnel
  float r = length(p - vec2(0., .02));
  float a = atan(p.y, p.x);
  float tunnel = sin(12./(r+.05) - uTime*2. + a*3.) * .5 + .5;
  float ring = smoothstep(.02, .0, abs(r - .32*uPortal)) ;
  col += uPortal * (uv_ * tunnel * .35 + cyan * pow(tunnel,8.)*.4) * smoothstep(.34*uPortal+.01, 0., r);
  col += ring * uPortal * (cyan*1.5 + uv_);
  // finale starfield convergence
  float st = step(.997, hash(floor(uv*uRes/2.))) * (.5+.5*sin(uTime*3.+hash(floor(uv*uRes/2.))*40.));
  col += st * (.5 + uFinale);
  // scanlines + grain
  col *= .92 + .08*sin(uv.y*uRes.y*1.5);
  col += (hash(uv*uRes + uTime) - .5) * .03;
  col *= smoothstep(1.25, .2, length(p)); // vignette
  col *= uBoot;
  gl_FragColor = vec4(col, 1.);
}`;

export function createScene(canvas: HTMLCanvasElement, opts: { lowPower: boolean; reducedMotion: boolean }): Scene {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !opts.lowPower, alpha: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, opts.lowPower ? 1.25 : 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  renderer.autoClear = false;

  // Background pass
  const bgScene = new THREE.Scene();
  const bgCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const bgU = {
    uTime: { value: 0 }, uRes: { value: new THREE.Vector2(1, 1) }, uPointer: { value: new THREE.Vector2(0.5, 0.5) },
    uMix: { value: 0 }, uBoot: { value: 0 }, uPortal: { value: 0 }, uFinale: { value: 0 },
  };
  bgScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
    uniforms: bgU, fragmentShader: BG_FRAG, depthWrite: false,
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }',
  })));

  // Main scene
  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  camera.position.set(0, 0, 9);

  const key = new THREE.PointLight('#3ff8ff', 60, 30); key.position.set(4, 3, 4);
  const rim = new THREE.PointLight('#8a3dff', 80, 30); rim.position.set(-4, -1, -2);
  scene.add(key, rim, new THREE.AmbientLight('#223', 0.6));

  // Liquid metal pool (CPU-displaced grid with a mirror-metal physical material)
  const seg = opts.lowPower ? 70 : 120;
  const poolGeo = new THREE.PlaneGeometry(26, 14, seg, Math.round(seg / 2)).rotateX(-Math.PI / 2);
  const poolBase = (poolGeo.attributes.position.array as Float32Array).slice();
  const pool = new THREE.Mesh(poolGeo, new THREE.MeshPhysicalMaterial({
    color: '#4a5080', metalness: 1, roughness: 0.14, iridescence: 0.7, iridescenceIOR: 1.4, clearcoat: 1,
  }));
  pool.position.y = -1.6;
  scene.add(pool);

  // Particles
  const N = opts.lowPower ? 900 : 2600;
  const pGeo = new THREE.BufferGeometry();
  const pPos = new Float32Array(N * 3);
  const pSeed = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    pPos.set([(Math.random() - 0.5) * 22, (Math.random() - 0.5) * 12, (Math.random() - 0.5) * 14 - 2], i * 3);
    pSeed[i] = Math.random();
  }
  pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
  pGeo.setAttribute('seed', new THREE.BufferAttribute(pSeed, 1));
  const pU = { uTime: { value: 0 }, uMix: { value: 0 }, uBoot: { value: 0 }, uConverge: { value: 0 } };
  const particles = new THREE.Points(pGeo, new THREE.ShaderMaterial({
    uniforms: pU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `attribute float seed; uniform float uTime; uniform float uBoot; uniform float uConverge; varying float vS;
      void main(){ vS = seed; vec3 p = position; p.y += sin(uTime*.3 + seed*30.)*.3; p.x += cos(uTime*.2+seed*20.)*.2;
        float a = seed*6.283 + uTime*.15; vec3 orbit = vec3(cos(a)*(2.6+seed*1.5), sin(a*2.)*.6, sin(a)*(2.6+seed*1.5));
        p = mix(p, orbit, uConverge);
        p *= mix(3., 1., uBoot);
        vec4 mv = modelViewMatrix * vec4(p,1.); gl_PointSize = (2.+seed*4.) * (12./-mv.z); gl_Position = projectionMatrix*mv; }`,
    fragmentShader: `uniform float uMix; uniform float uBoot; varying float vS;
      void main(){ float d = length(gl_PointCoord-.5); float a = smoothstep(.5,0.,d);
        vec3 c = mix(vec3(.25,.97,1.), vec3(.6,.3,1.), mix(vS, 1., uMix)); gl_FragColor = vec4(c, a*.8*uBoot); }`,
  }));
  scene.add(particles);

  // Products
  const watch = createWatch();
  const watchRoot = new THREE.Group();
  watchRoot.add(watch.group);
  scene.add(watchRoot);
  const glasses = createGlasses();
  const glassesRoot = new THREE.Group();
  glassesRoot.add(glasses.group);
  scene.add(glassesRoot);

  // Biometric holograms: rings + data glyph sprites orbiting the watch
  const holo = new THREE.Group();
  const holoMat = (c: string) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false });
  const rings: THREE.Mesh[] = [];
  [1.6, 2.0, 2.45].forEach((r, i) => {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(r, 0.006 + i * 0.003, 8, 200, Math.PI * (1.2 + i * 0.35)), holoMat(['#3ff8ff', '#8a3dff', '#ff3fd8'][i]));
    ring.rotation.x = Math.PI / 2 + (i - 1) * 0.35;
    rings.push(ring);
    holo.add(ring);
  });
  // Tick marks ring
  const ticks = new THREE.InstancedMesh(new THREE.BoxGeometry(0.01, 0.12, 0.01), holoMat('#3ff8ff'), 90);
  const tmp = new THREE.Object3D();
  for (let i = 0; i < 90; i++) {
    const a = (i / 90) * Math.PI * 2;
    tmp.position.set(Math.cos(a) * 2.9, 0, Math.sin(a) * 2.9);
    tmp.rotation.set(0, -a, 0);
    tmp.scale.y = i % 5 ? 1 : 2.5;
    tmp.updateMatrix();
    ticks.setMatrixAt(i, tmp.matrix);
  }
  holo.add(ticks);
  // Waveform helix (live heart-rate driven)
  const helixN = 240;
  const helixGeo = new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(new Float32Array(helixN * 3), 3));
  const helix = new THREE.Line(helixGeo, new THREE.LineBasicMaterial({ color: '#3ff8ff', transparent: true, opacity: 0, blending: THREE.AdditiveBlending }));
  holo.add(helix);
  scene.add(holo);

  // Portal ring (3D torus that frames the background tunnel)
  const portalRing = new THREE.Mesh(
    new THREE.TorusGeometry(2.2, 0.05, 32, 200),
    new THREE.MeshPhysicalMaterial({ color: '#cfd8ff', metalness: 1, roughness: 0.1, emissive: '#8a3dff', emissiveIntensity: 1.5, iridescence: 1 }),
  );
  portalRing.position.z = -1.5;
  scene.add(portalRing);

  // Pointer (smoothed)
  const pointer = new THREE.Vector2(0.5, 0.5);
  const pointerT = new THREE.Vector2(0.5, 0.5);
  window.addEventListener('pointermove', (e) => pointerT.set(e.clientX / innerWidth, 1 - e.clientY / innerHeight), { passive: true });

  const resize = () => {
    const w = innerWidth, h = innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // Pull the camera back on portrait screens so products stay framed on phones.
    camera.position.z = w / h < 0.8 ? 14 : 9;
    camera.updateProjectionMatrix();
    bgU.uRes.value.set(w, h);
  };
  resize();
  window.addEventListener('resize', resize);

  const api: Scene = {
    bpm: 64,
    setWatchColor: (hex) => watch.body.color.set(hex),
    setGlassesColor: (hex) => { glasses.lens.color.set(hex); glasses.lens.emissive.set(hex); },
    setWatchSize: (big) => watch.group.scale.setScalar(big ? 1.08 : 1),
  };

  const clock = new THREE.Clock();
  const tv = new THREE.Vector3();
  let visible = true;
  document.addEventListener('visibilitychange', () => (visible = !document.hidden));

  const tick = () => {
    requestAnimationFrame(tick);
    if (!visible) return;
    const t = clock.getElapsedTime() * (opts.reducedMotion ? 0.25 : 1);
    pointer.lerp(pointerT, 0.06);
    const px = pointer.x - 0.5, py = pointer.y - 0.5;

    api.bpm = 64 + Math.sin(t * 0.4) * 6 + S.holo * 18;
    watch.drawScreen(t, api.bpm);

    // Background uniforms
    Object.assign(bgU.uTime, { value: t });
    bgU.uPointer.value.copy(pointer);
    bgU.uMix.value = S.worldMix;
    bgU.uBoot.value = S.boot;
    bgU.uPortal.value = S.portal * (1 - S.finale * 0.6);
    bgU.uFinale.value = S.finale;
    pU.uTime.value = t; pU.uMix.value = S.worldMix; pU.uBoot.value = S.boot; pU.uConverge.value = S.finale;

    // Liquid metal ripples — strongest where the watch breaks the surface
    const arr = poolGeo.attributes.position.array as Float32Array;
    const breach = S.watchRise > 0.05 && S.watchRise < 0.95 ? 1 : 0.25;
    for (let i = 0; i < arr.length; i += 3) {
      const x = poolBase[i], z = poolBase[i + 2];
      const r = Math.hypot(x, z + 0.5);
      arr[i + 1] = Math.sin(r * 2.6 - t * 3) * 0.12 * breach * Math.exp(-r * 0.25)
        + Math.sin(x * 0.7 + t * 0.8) * 0.05 + Math.cos(z * 0.9 - t * 0.6) * 0.05;
    }
    poolGeo.attributes.position.needsUpdate = true;
    poolGeo.computeVertexNormals();
    pool.position.y = -1.6 - S.worldMix * 4; // drains away in the portal world
    pool.visible = pool.position.y > -5.5;

    // ── Watch staging ──
    const mobile = camera.aspect < 0.8;
    const cfgW = S.config * (1 - S.configProduct);
    const watchX = (mobile ? 0 : 1.6) * (1 - S.holo) * (1 - S.explode);
    watchRoot.position.set(
      THREE.MathUtils.lerp(watchX, mobile ? 0 : 1.8, cfgW) - S.finale * (mobile ? 0.9 : 1.9),
      THREE.MathUtils.lerp(-4.2, 0.1, S.watchRise) + S.worldMix * (1 - S.config) * (1 - S.finale) * 6
        - S.config * S.configProduct * 5 + (mobile ? cfgW * 0.9 + S.finale * 1.2 : 0),
      0,
    );
    const ws = (1 - S.explode * 0.15) * (1 - S.finale * 0.25);
    watchRoot.scale.setScalar(ws);
    watchRoot.rotation.set(
      0.25 + py * 0.4 - S.explode * 0.3,
      -0.6 + S.watchSpin * Math.PI * 2 + px * 0.6 + t * 0.15 * (S.finale + cfgW * 0.6),
      0.1 * Math.sin(t * 0.5),
    );
    watchRoot.position.y += Math.sin(t * 1.1) * 0.06;
    // Exploded transformation: layers separate along Z
    watch.layers.forEach((l, i) => { l.position.z = [0, 0, -0.27, 0.23, 0.27][i] + (i - 1.5) * S.explode * 1.1; });
    watch.layers[0].scale.setScalar(1 - S.explode * 0.3);

    // Holograms follow the watch
    holo.position.copy(watchRoot.position);
    holo.rotation.y = t * 0.2;
    rings.forEach((r, i) => { r.rotation.z = t * (0.3 + i * 0.2) * (i % 2 ? -1 : 1); (r.material as THREE.MeshBasicMaterial).opacity = S.holo * 0.9; });
    (ticks.material as THREE.MeshBasicMaterial).opacity = S.holo * 0.6;
    const hp = helixGeo.attributes.position.array as Float32Array;
    for (let i = 0; i < helixN; i++) {
      const a = (i / helixN) * Math.PI * 6;
      const beat = Math.pow(Math.max(0, Math.sin(a * 2 - t * (api.bpm / 20))), 12) * 0.5;
      hp.set([Math.cos(a) * (2.2 + beat), (i / helixN - 0.5) * 3.5, Math.sin(a) * (2.2 + beat)], i * 3);
    }
    helixGeo.attributes.position.needsUpdate = true;
    (helix.material as THREE.LineBasicMaterial).opacity = S.holo;
    holo.scale.setScalar(0.6 + S.holo * 0.4);
    holo.visible = S.holo > 0.01;

    // ── Portal + glasses ──
    portalRing.scale.setScalar(Math.max(0.001, S.portal * (1 - S.finale)));
    portalRing.rotation.z = t * 0.3;
    portalRing.visible = S.portal > 0.01;
    const cfgG = S.config * S.configProduct;
    glassesRoot.position.set(
      THREE.MathUtils.lerp(0, mobile ? 0 : 1.8, cfgG) + S.finale * (mobile ? 0.9 : 1.9),
      Math.sin(t * 0.9) * 0.08 + (mobile ? cfgG * 0.9 - S.finale * 1.2 : 0) + (1 - Math.max(S.glassesOut, S.config, S.finale)) * 0,
      THREE.MathUtils.lerp(-6, 0.2, Math.max(S.glassesOut, S.config > 0 ? S.configProduct : 0, S.finale)),
    );
    const gScale = Math.max(S.glassesOut, cfgG, S.finale) * (1 - S.finale * 0.15) * (1 + S.spatial * 0.1);
    glassesRoot.scale.setScalar(Math.max(0.001, gScale));
    glassesRoot.visible = gScale > 0.01;
    glassesRoot.rotation.set(py * 0.4 + 0.1, px * 0.8 + (1 - S.glassesOut) * Math.PI + t * 0.15 * (S.finale + cfgG * 0.6), 0);
    watchRoot.visible = watchRoot.position.y < 6 && watchRoot.position.y > -4.1;

    // Lights follow world
    key.color.lerpColors(new THREE.Color('#3ff8ff'), new THREE.Color('#ff3fd8'), S.worldMix);
    camera.position.x = px * 0.6;
    camera.position.y = py * 0.4;
    camera.lookAt(tv.set(0, 0, 0));

    renderer.clear();
    renderer.render(bgScene, bgCam);
    renderer.clearDepth();
    renderer.render(scene, camera);
  };
  tick();
  return api;
}
