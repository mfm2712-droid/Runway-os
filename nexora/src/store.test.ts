import { describe as d, it, expect } from 'vitest';
import { addToCart, defaultConfig, loadCart, priceOf, saveCart, setQty, totals, MAX_QTY, PRODUCTS } from './store';

d('pricing', () => {
  it('prices defaults at base price', () => {
    expect(priceOf(defaultConfig('pulse'))).toBe(PRODUCTS.pulse.basePrice);
    expect(priceOf(defaultConfig('iris'))).toBe(PRODUCTS.iris.basePrice);
  });
  it('adds finish and size deltas', () => {
    expect(priceOf({ product: 'pulse', finish: 'uv', size: '46' })).toBe(1290 + 240 + 90);
  });
  it('rejects invalid configs', () => {
    expect(() => priceOf({ product: 'pulse', finish: 'nope', size: '41' })).toThrow();
  });
});

d('cart', () => {
  it('merges identical configurations', () => {
    let c = addToCart([], defaultConfig('pulse'));
    c = addToCart(c, defaultConfig('pulse'));
    expect(c).toHaveLength(1);
    expect(c[0].qty).toBe(2);
  });
  it('keeps different configurations separate', () => {
    let c = addToCart([], defaultConfig('pulse'));
    c = addToCart(c, { ...defaultConfig('pulse'), finish: 'void' });
    expect(c).toHaveLength(2);
  });
  it('clamps quantity and removes at zero', () => {
    let c = addToCart([], defaultConfig('iris'), 99);
    expect(c[0].qty).toBe(MAX_QTY);
    c = setQty(c, c[0].key, 0);
    expect(c).toHaveLength(0);
  });
  it('computes totals with free shipping threshold', () => {
    expect(totals([]).total).toBe(0);
    const one = addToCart([], defaultConfig('pulse'));
    expect(totals(one)).toMatchObject({ subtotal: 1290, shipping: 40, total: 1330, count: 1 });
    const two = addToCart(one, defaultConfig('iris'));
    expect(totals(two).shipping).toBe(0);
  });
  it('persists and re-validates storage', () => {
    const mem = new Map<string, string>();
    const s = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v) };
    const c = addToCart([], defaultConfig('pulse'));
    saveCart(s, c);
    expect(loadCart(s)).toEqual(c);
    mem.set('nexora.cart.v1', JSON.stringify([{ ...c[0], unitPrice: 1 }]));
    expect(loadCart(s)).toEqual([]);
    mem.set('nexora.cart.v1', '{garbage');
    expect(loadCart(s)).toEqual([]);
  });
});
