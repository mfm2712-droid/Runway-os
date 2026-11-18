import './style.css';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { S, createScene, type Scene } from './scene';
import {
  PRODUCTS, addToCart, defaultConfig, describe, fmt, loadCart, priceOf, saveCart, setQty, totals,
  type CartLine, type Config, type ProductId,
} from './store';

gsap.registerPlugin(ScrollTrigger);

const $ = <T extends HTMLElement = HTMLElement>(s: string, root: ParentNode = document) => root.querySelector(s) as T;
const $$ = <T extends HTMLElement = HTMLElement>(s: string, root: ParentNode = document) => Array.from(root.querySelectorAll(s)) as T[];
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const lowPower = matchMedia('(max-width: 760px)').matches || (navigator.hardwareConcurrency ?? 8) <= 4;
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const smooth = (a: number, b: number, v: number) => { const t = clamp01((v - a) / (b - a)); return t * t * (3 - 2 * t); };

// ───────────────────────── WebGL universe ─────────────────────────
let scene: Scene | null = null;
try {
  scene = createScene($('#gl') as unknown as HTMLCanvasElement, { lowPower, reducedMotion: reduced });
} catch (err) {
  // No WebGL: the DOM experience and the shop still work; background falls back to CSS.
  console.warn('WebGL unavailable', err);
  document.body.classList.add('no-webgl');
  $('#gl').style.background = 'radial-gradient(circle at 70% 40%, #1b1050, #03040a 60%)';
}

// ───────────────────────── Split typography ─────────────────────────
$$('.split').forEach((el) => {
  const html = el.innerHTML.split(/(<br\s*\/?>|<em>|<\/em>)/);
  el.innerHTML = html.map((part) => (part.startsWith('<') ? part : [...part].map((c) => (c === ' ' ? ' ' : `<span class="ch">${c}</span>`)).join(''))).join('');
});

// ───────────────────────── 1 · Boot sequence ─────────────────────────
const LOG = [
  '> nexora.kernel 50.11.18 — cold start',
  '> calibrating photonic lattice ........ ok',
  '> condensing liquid chrome ............ ok',
  '> syncing biosignal mesh .............. ok',
  '> opening dimensional aperture ........ ok',
  '> universe ready.',
];
document.body.classList.add('booting');
const boot = $('#boot');
const bootTl = gsap.timeline({ paused: true });
const logEl = $('#boot-log');
const state = { pct: 0 };
bootTl
  .to('.boot-grid', { '--gy': '-120px', duration: 3, ease: 'none' }, 0)
  .to('.boot-word span', { opacity: 1, filter: 'blur(0px)', duration: 0.9, stagger: 0.09, ease: 'power3.out' }, 0.1)
  .to(state, {
    pct: 100, duration: 2.4, ease: 'power2.inOut',
    onUpdate() {
      $('#boot-pct').textContent = String(Math.round(state.pct)).padStart(3, '0');
      $('#boot-fill').style.transform = `scaleX(${state.pct / 100})`;
      logEl.textContent = LOG.slice(0, Math.ceil((state.pct / 100) * LOG.length)).join('\n');
    },
  }, 0.2)
  .to(S, { boot: 1, duration: 1.6, ease: 'power2.out' }, 2.4)
  .to('.boot-core', { scale: 1.6, opacity: 0, filter: 'blur(12px)', duration: 0.8, ease: 'power3.in' }, 2.6)
  .to(boot, { clipPath: 'circle(0% at 50% 50%)', duration: 1.1, ease: 'expo.inOut' }, 2.8)
  .add(() => { boot.classList.add('gone'); document.body.classList.remove('booting'); introHero(); }, 3.4)
  .to(S, { watchRise: 1, duration: 2.6, ease: 'expo.out' }, 3.1);
gsap.set(boot, { clipPath: 'circle(150% at 50% 50%)' });
if (reduced) bootTl.timeScale(3);
bootTl.play();
$('#boot-skip').addEventListener('click', () => bootTl.timeScale(6));
addEventListener('keydown', (e) => { if (e.key === 'Enter' && !boot.classList.contains('gone')) bootTl.timeScale(6); });

function introHero() {
  gsap.from('.hero .ch', { yPercent: 110, rotateX: -80, opacity: 0, filter: 'blur(10px)', stagger: 0.05, duration: 1.2, ease: 'expo.out' });
  gsap.from('.hero .reveal', { y: 24, opacity: 0, duration: 1, stagger: 0.12, delay: 0.4, ease: 'power3.out' });
  boot.hidden = true;
}

// ───────────────────────── Scroll choreography ─────────────────────────
// Targets are derived from each chapter's own scroll progress; S eases toward them every frame,
// giving cinematic inertia without hijacking native scroll (works with touch and keyboard).
const chapters = ['#transform', '#bio', '#rift', '#spatial', '#configure', '#finale'].map((id) => $(id));
const T = { watchSpin: 0, explode: 0, holo: 0, portal: 0, glassesOut: 0, worldMix: 0, spatial: 0, config: 0, finale: 0 };
type Key = keyof typeof T;

function progressOf(el: HTMLElement, lead = 0) {
  const r = el.getBoundingClientRect();
  const span = r.height - innerHeight + lead * innerHeight;
  return clamp01((lead * innerHeight - r.top) / Math.max(1, span));
}

function computeTargets() {
  const [tx, bio, rift, spatial, cfg, fin] = chapters.map((c, i) => progressOf(c, i >= 4 ? 0.6 : 0));
  T.watchSpin = tx;
  T.explode = smooth(0.12, 0.45, tx) * (1 - smooth(0.85, 1, tx));
  T.holo = smooth(0, 0.3, bio) * (1 - smooth(0, 0.35, rift));
  T.worldMix = smooth(0.1, 0.6, rift) * (1 - 0.45 * smooth(0, 0.3, cfg));
  T.portal = smooth(0.2, 0.6, rift) * (1 - smooth(0.2, 0.7, spatial));
  T.glassesOut = smooth(0.5, 0.95, rift) * (1 - smooth(0, 0.3, cfg));
  T.spatial = smooth(0, 0.2, spatial) * (1 - smooth(0.9, 1, spatial));
  T.config = smooth(0, 0.25, cfg) * (1 - smooth(0, 0.45, fin));
  T.finale = smooth(0, 0.6, fin);

  // Layer callouts in the transformation chapter
  $$('.tx-layers li').forEach((li) => li.classList.toggle('on', tx >= Number(li.dataset.at)));
  $$('.bio-panel').forEach((p, i) => { p.style.opacity = String(smooth(0.15 + i * 0.08, 0.3 + i * 0.08, bio) * (1 - smooth(0.85, 1, bio))); });
  $$('.bio-panel').forEach((p, i) => { p.style.transform = `translateY(${(1 - smooth(0.15 + i * 0.08, 0.35 + i * 0.08, bio)) * 40}px)`; });
  const riftText = $('.rift');
  riftText.style.opacity = String(smooth(0, 0.15, rift) * (1 - smooth(0.7, 0.9, rift)));
  riftText.style.transform = `scale(${1 + smooth(0.4, 0.9, rift) * 0.6})`;
  riftText.style.filter = `blur(${smooth(0.55, 0.9, rift) * 14}px)`;

  // HUD
  const doc = document.documentElement;
  $('#progress').style.transform = `scaleX(${scrollY / Math.max(1, doc.scrollHeight - innerHeight)})`;
  const active = $$('.chapter').filter((c) => c.getBoundingClientRect().top <= innerHeight * 0.5).pop();
  if (active) $('#chapter').textContent = active.dataset.ch ?? '';
  $$('.hud-nav a').forEach((a) => a.classList.toggle('on', active?.id === a.getAttribute('href')!.slice(1)));
}

gsap.ticker.add(() => {
  computeTargets();
  const k = reduced ? 1 : 0.085;
  (Object.keys(T) as Key[]).forEach((key) => { S[key] += (T[key] - S[key]) * k; });
});

// Character reveals tied to scroll (ScrollTrigger)
$$('.chapter:not(.hero) .split').forEach((el) => {
  gsap.from(el.querySelectorAll('.ch'), {
    yPercent: 100, opacity: 0, filter: 'blur(8px)', stagger: 0.025, duration: 1, ease: 'expo.out',
    scrollTrigger: { trigger: el, start: 'top 85%', toggleActions: 'play none none reverse' },
  });
});
ScrollTrigger.create({ trigger: '#configure', start: 'top 40%', onEnter: () => gsap.from('.forge-panel', { x: -40, opacity: 0, duration: 0.9, ease: 'expo.out' }), once: true });

// Pointer coordinates HUD
addEventListener('pointermove', (e) => {
  $('#coords').textContent = `X ${(e.clientX / innerWidth).toFixed(3)} / Y ${(e.clientY / innerHeight).toFixed(3)}`;
}, { passive: true });

// ───────────────────────── 4 · Live biometrics ─────────────────────────
const ecg = $('#ecg') as unknown as SVGPathElement;
let tBio = 0;
setInterval(() => {
  tBio += 0.25;
  const bpm = Math.round(scene?.bpm ?? 64 + Math.sin(tBio) * 4);
  $('#m-bpm').textContent = String(bpm);
  $('#pane-bpm').textContent = `${bpm} BPM`;
  const calm = Math.round(80 + Math.sin(tBio * 0.3) * 6);
  $('#m-calm').textContent = String(calm);
  $('#calm-bar').style.width = `${calm}%`;
  let d = '';
  for (let x = 0; x <= 200; x += 4) {
    const p = ((x / 200) * 3 + tBio * 0.5) % 1;
    const y = 20 - (p > 0.45 && p < 0.55 ? 16 * Math.sin((p - 0.45) * 62) : Math.sin(x * 0.2) * 1.5);
    d += `${x ? 'L' : 'M'}${x} ${y.toFixed(1)}`;
  }
  ecg.setAttribute('d', d);
  const mins = 402 - Math.floor(tBio) % 400;
  $('#m-circ').textContent = `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;
}, 250);

// ───────────────────────── 6 · Spatial interface ─────────────────────────
const space = $('#space');
space.addEventListener('pointermove', (e) => {
  const r = space.getBoundingClientRect();
  const nx = (e.clientX - r.left) / r.width, ny = (e.clientY - r.top) / r.height;
  space.style.setProperty('--mx', `${nx * 100}%`);
  space.style.setProperty('--my', `${ny * 100}%`);
  $$('.pane', space).forEach((p) => {
    const depth = Number(p.dataset.depth);
    p.style.setProperty('--rx', `${(0.5 - ny) * 18}deg`);
    p.style.setProperty('--ry', `${(nx - 0.5) * 22}deg`);
    p.style.setProperty('--dz', `${depth * (p.classList.contains('focus') ? 1.6 : 1)}px`);
  });
});
$$('.pane', space).forEach((p) => {
  let sx = 0, sy = 0, ox = 0, oy = 0, moved = false, dragging = false;
  p.style.setProperty('--dz', `${p.dataset.depth}px`);
  p.addEventListener('pointerdown', (e) => {
    dragging = true; moved = false; sx = e.clientX; sy = e.clientY;
    ox = parseFloat(p.style.getPropertyValue('--dx')) || 0; oy = parseFloat(p.style.getPropertyValue('--dy')) || 0;
    p.setPointerCapture(e.pointerId);
  });
  p.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - sx, dy = e.clientY - sy;
    if (Math.hypot(dx, dy) > 4) moved = true;
    const r = space.getBoundingClientRect();
    p.style.setProperty('--dx', `${gsap.utils.clamp(-r.width * 0.5, r.width * 0.5, ox + dx)}px`);
    p.style.setProperty('--dy', `${gsap.utils.clamp(-r.height * 0.5, r.height * 0.5, oy + dy)}px`);
  });
  p.addEventListener('pointerup', () => { dragging = false; });
  p.addEventListener('click', () => {
    if (moved) return;
    const was = p.classList.contains('focus');
    $$('.pane', space).forEach((q) => q.classList.remove('focus'));
    if (!was) p.classList.add('focus');
  });
});

// ───────────────────────── 7 · Configurator ─────────────────────────
let cfg: Config = defaultConfig('pulse');
const shown = { price: priceOf(cfg) };

function renderConfig(animate = true) {
  const p = PRODUCTS[cfg.product];
  $('#cfg-name').textContent = p.name;
  $('#cfg-tag').textContent = p.tagline;
  $('#cfg-finishes').innerHTML = p.finishes.map((f) => `
    <button class="swatch" role="radio" aria-checked="${f.id === cfg.finish}" data-finish="${f.id}" style="--c:${f.color}">
      <i></i>${f.label}${f.priceDelta ? ` <small>+${f.priceDelta}</small>` : ''}
    </button>`).join('');
  $('#cfg-sizes').innerHTML = p.sizes.map((s) => `
    <button class="chip" role="radio" aria-checked="${s.id === cfg.size}" data-size="${s.id}">${s.label}${s.priceDelta ? ` +${s.priceDelta}` : ''}</button>`).join('');
  $('#cfg-finishes').setAttribute('role', 'radiogroup');
  $('#cfg-sizes').setAttribute('role', 'radiogroup');
  $$('.tab').forEach((t) => t.setAttribute('aria-selected', String(t.dataset.product === cfg.product)));
  $('.tabs').style.setProperty('--tab', cfg.product === 'pulse' ? '0' : '1');

  const finish = p.finishes.find((f) => f.id === cfg.finish)!;
  if (cfg.product === 'pulse') { scene?.setWatchColor(finish.color); scene?.setWatchSize(cfg.size === '46'); }
  else scene?.setGlassesColor(finish.color);

  const target = priceOf(cfg);
  gsap.to(shown, {
    price: target, duration: animate ? 0.6 : 0, ease: 'power3.out',
    onUpdate: () => { $('#cfg-price').textContent = fmt(Math.round(shown.price)); },
  });
}

$$('.tab').forEach((t) => t.addEventListener('click', () => {
  const product = t.dataset.product as ProductId;
  if (product === cfg.product) return;
  cfg = defaultConfig(product);
  gsap.to(S, { configProduct: product === 'iris' ? 1 : 0, duration: 1.1, ease: 'expo.inOut' });
  gsap.fromTo('#cfg-name, #cfg-tag', { y: 12, opacity: 0, filter: 'blur(6px)' }, { y: 0, opacity: 1, filter: 'blur(0px)', duration: 0.5, ease: 'power3.out', stagger: 0.05 });
  renderConfig();
}));
$('#cfg-finishes').addEventListener('click', (e) => {
  const b = (e.target as HTMLElement).closest<HTMLElement>('[data-finish]');
  if (!b) return;
  cfg = { ...cfg, finish: b.dataset.finish! };
  renderConfig();
});
$('#cfg-sizes').addEventListener('click', (e) => {
  const b = (e.target as HTMLElement).closest<HTMLElement>('[data-size]');
  if (!b) return;
  cfg = { ...cfg, size: b.dataset.size! };
  renderConfig();
});
$('#cfg-add').addEventListener('click', () => {
  cart = addToCart(cart, cfg);
  commitCart();
  $('#cfg-msg').textContent = `${PRODUCTS[cfg.product].name} · ${describe(cfg)} added to cargo.`;
  toast('Added to cargo ◈');
});
$('[data-bundle]').addEventListener('click', () => {
  cart = addToCart(addToCart(cart, defaultConfig('pulse')), defaultConfig('iris'));
  commitCart();
  toast('PULSE + IRIS added ◈');
  openCart();
});
renderConfig(false);

// ───────────────────────── Cart ─────────────────────────
let cart: CartLine[] = loadCart(localStorage);
const cartEl = $('#cart');
const scrim = $('#cart-scrim');
let lastFocus: HTMLElement | null = null;

function commitCart() {
  saveCart(localStorage, cart);
  renderCart();
  const btn = $('#cart-open');
  btn.classList.remove('bump'); void btn.offsetWidth; btn.classList.add('bump');
}

function renderCart() {
  const t = totals(cart);
  $('#cart-count').textContent = String(t.count);
  $('#cart-lines').innerHTML = cart.map((l) => {
    const color = PRODUCTS[l.product].finishes.find((f) => f.id === l.finish)!.color;
    return `<li class="cart-line">
      <span class="dot" style="--c:${color}"></span>
      <div><h4>${PRODUCTS[l.product].name}</h4><p>${describe(l)} · ${fmt(l.unitPrice)}</p></div>
      <div class="qty" data-key="${l.key}">
        <button data-d="-1" aria-label="Decrease quantity">−</button><span aria-label="Quantity">${l.qty}</span><button data-d="1" aria-label="Increase quantity">+</button>
      </div></li>`;
  }).join('');
  $('#cart-empty').hidden = cart.length > 0;
  $('#t-sub').textContent = fmt(t.subtotal);
  $('#t-ship').textContent = t.shipping ? fmt(t.shipping) : 'Free';
  $('#t-total').textContent = fmt(t.total);
  ($('#checkout') as HTMLButtonElement).disabled = cart.length === 0;
}
$('#cart-lines').addEventListener('click', (e) => {
  const b = (e.target as HTMLElement).closest<HTMLElement>('[data-d]');
  if (!b) return;
  const key = b.parentElement!.dataset.key!;
  const line = cart.find((l) => l.key === key)!;
  cart = setQty(cart, key, line.qty + Number(b.dataset.d));
  commitCart();
});

function openCart() {
  lastFocus = document.activeElement as HTMLElement;
  scrim.hidden = false;
  requestAnimationFrame(() => scrim.classList.add('on'));
  cartEl.classList.add('open');
  cartEl.setAttribute('aria-hidden', 'false');
  $('#cart-close').focus();
}
function closeCart() {
  scrim.classList.remove('on');
  cartEl.classList.remove('open');
  cartEl.setAttribute('aria-hidden', 'true');
  setTimeout(() => (scrim.hidden = true), 300);
  lastFocus?.focus();
}
$('#cart-open').addEventListener('click', openCart);
$('#cart-close').addEventListener('click', closeCart);
scrim.addEventListener('click', closeCart);
addEventListener('keydown', (e) => { if (e.key === 'Escape' && cartEl.classList.contains('open')) closeCart(); });

// Demo checkout
const form = $('#checkout-form') as HTMLFormElement;
const show = (view: 'cart' | 'form' | 'done') => {
  $('#cart-view').hidden = view !== 'cart';
  form.hidden = view !== 'form';
  $('#co-done').hidden = view !== 'done';
};
$('#checkout').addEventListener('click', () => { show('form'); (form.elements.namedItem('name') as HTMLInputElement).focus(); });
$('#co-back').addEventListener('click', () => show('cart'));
form.addEventListener('submit', (e) => {
  e.preventDefault();
  const bad = Array.from(form.elements).filter((el): el is HTMLInputElement => el instanceof HTMLInputElement && !el.checkValidity());
  Array.from(form.querySelectorAll('input')).forEach((i) => i.setAttribute('aria-invalid', String(bad.includes(i))));
  if (bad.length) {
    $('#co-err').textContent = 'Signal incomplete — check the highlighted fields.';
    bad[0].focus();
    return;
  }
  $('#co-err').textContent = '';
  $('#co-ref').textContent = `NX-${Date.now().toString(36).toUpperCase().slice(-6)}`;
  cart = [];
  commitCart();
  form.reset();
  show('done');
  gsap.from('.co-done > *', { y: 20, opacity: 0, stagger: 0.08, duration: 0.6, ease: 'expo.out' });
});
$('#co-again').addEventListener('click', () => { show('cart'); closeCart(); });
renderCart();

// Toast
let toastT = 0;
function toast(msg: string) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('on');
  clearTimeout(toastT);
  toastT = window.setTimeout(() => t.classList.remove('on'), 1800);
}

// Expose for e2e tests
(window as unknown as { __nexora: unknown }).__nexora = { S, getCart: () => cart };
