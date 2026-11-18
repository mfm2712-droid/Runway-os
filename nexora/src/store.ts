// Pure commerce logic — no DOM, fully unit-tested.

export type ProductId = 'pulse' | 'iris';

export interface Variant {
  id: string;
  label: string;
  color: string; // hex used by 3D material + swatches
  priceDelta: number;
}

export interface Product {
  id: ProductId;
  name: string;
  tagline: string;
  basePrice: number;
  finishes: Variant[];
  sizes: { id: string; label: string; priceDelta: number }[];
}

export const PRODUCTS: Record<ProductId, Product> = {
  pulse: {
    id: 'pulse',
    name: 'NEXORA PULSE',
    tagline: 'Biometric wrist intelligence',
    basePrice: 1290,
    finishes: [
      { id: 'liquid', label: 'Liquid Chrome', color: '#d9e2ff', priceDelta: 0 },
      { id: 'void', label: 'Void Obsidian', color: '#1a1c2a', priceDelta: 120 },
      { id: 'uv', label: 'Ultraviolet Flux', color: '#8a3dff', priceDelta: 240 },
    ],
    sizes: [
      { id: '41', label: '41 mm', priceDelta: 0 },
      { id: '46', label: '46 mm', priceDelta: 90 },
    ],
  },
  iris: {
    id: 'iris',
    name: 'NEXORA IRIS',
    tagline: 'Spatial vision lenses',
    basePrice: 2490,
    finishes: [
      { id: 'cyan', label: 'Cyan Prism', color: '#3ff8ff', priceDelta: 0 },
      { id: 'chrome', label: 'Mirror Chrome', color: '#cfd8ff', priceDelta: 150 },
      { id: 'eclipse', label: 'Eclipse Black', color: '#14151f', priceDelta: 150 },
    ],
    sizes: [
      { id: 'std', label: 'Standard fit', priceDelta: 0 },
      { id: 'wide', label: 'Wide fit', priceDelta: 0 },
    ],
  },
};

export interface Config {
  product: ProductId;
  finish: string;
  size: string;
}

export interface CartLine extends Config {
  key: string;
  qty: number;
  unitPrice: number;
}

export function defaultConfig(product: ProductId): Config {
  const p = PRODUCTS[product];
  return { product, finish: p.finishes[0].id, size: p.sizes[0].id };
}

export function priceOf(c: Config): number {
  const p = PRODUCTS[c.product];
  const f = p.finishes.find((x) => x.id === c.finish);
  const s = p.sizes.find((x) => x.id === c.size);
  if (!f || !s) throw new Error(`Invalid configuration ${JSON.stringify(c)}`);
  return p.basePrice + f.priceDelta + s.priceDelta;
}

export const lineKey = (c: Config) => `${c.product}:${c.finish}:${c.size}`;

export const MAX_QTY = 5;

export function addToCart(cart: CartLine[], c: Config, qty = 1): CartLine[] {
  const key = lineKey(c);
  const unitPrice = priceOf(c);
  const existing = cart.find((l) => l.key === key);
  if (existing) {
    return cart.map((l) => (l.key === key ? { ...l, qty: Math.min(MAX_QTY, l.qty + qty) } : l));
  }
  return [...cart, { ...c, key, qty: Math.min(MAX_QTY, qty), unitPrice }];
}

export function setQty(cart: CartLine[], key: string, qty: number): CartLine[] {
  if (qty <= 0) return cart.filter((l) => l.key !== key);
  return cart.map((l) => (l.key === key ? { ...l, qty: Math.min(MAX_QTY, qty) } : l));
}

export function totals(cart: CartLine[]) {
  const subtotal = cart.reduce((s, l) => s + l.unitPrice * l.qty, 0);
  const count = cart.reduce((s, l) => s + l.qty, 0);
  // Orbital shipping is free over 2000 credits.
  const shipping = subtotal === 0 || subtotal >= 2000 ? 0 : 40;
  return { subtotal, shipping, total: subtotal + shipping, count };
}

export function describe(l: Config): string {
  const p = PRODUCTS[l.product];
  const f = p.finishes.find((x) => x.id === l.finish)!;
  const s = p.sizes.find((x) => x.id === l.size)!;
  return `${f.label} · ${s.label}`;
}

export const fmt = (n: number) => `◈ ${n.toLocaleString('en-GB')}`;

const STORAGE_KEY = 'nexora.cart.v1';

export function loadCart(storage: Pick<Storage, 'getItem'> | undefined): CartLine[] {
  try {
    const raw = storage?.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CartLine[];
    // Re-validate against the catalogue: drop anything stale or tampered with.
    return parsed.filter((l) => {
      try {
        return priceOf(l) === l.unitPrice && l.qty > 0 && l.qty <= MAX_QTY;
      } catch {
        return false;
      }
    });
  } catch {
    return [];
  }
}

export function saveCart(storage: Pick<Storage, 'setItem'> | undefined, cart: CartLine[]) {
  try {
    storage?.setItem(STORAGE_KEY, JSON.stringify(cart));
  } catch {
    /* private mode — cart stays in memory */
  }
}
