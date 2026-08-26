// HSL interpolation for the hero ring's health colour — mirrors the "gradual"
// mode from the Design Lab tool. RGB lerp turns amber into olive mud, so we
// interpolate through HSL along the shortest hue path instead.

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const n = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  return [parseInt(n.slice(0, 2), 16), parseInt(n.slice(2, 4), 16), parseInt(n.slice(4, 6), 16)];
}

export function hexToRgba(hex: string, alpha: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  const mx = Math.max(r, g, b);
  const mn = Math.min(r, g, b);
  const d = mx - mn;
  let h = 0;
  if (d) {
    if (mx === r) h = ((g - b) / d) % 6;
    else if (mx === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  const l = (mx + mn) / 2;
  const s = d ? d / (1 - Math.abs(2 * l - 1)) : 0;
  return [h, s, l];
}

function hslToHex(h: number, s: number, l: number): string {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hp = (((h % 360) + 360) % 360) / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let r = 0;
  let g = 0;
  let b = 0;
  if (hp < 1) {
    r = c;
    g = x;
  } else if (hp < 2) {
    r = x;
    g = c;
  } else if (hp < 3) {
    g = c;
    b = x;
  } else if (hp < 4) {
    g = x;
    b = c;
  } else if (hp < 5) {
    r = x;
    b = c;
  } else {
    r = c;
    b = x;
  }
  const m = l - c / 2;
  return (
    "#" +
    [r, g, b]
      .map((v) =>
        Math.round((v + m) * 255)
          .toString(16)
          .padStart(2, "0"),
      )
      .join("")
  );
}

function mixHue(hex1: string, hex2: string, t: number): string {
  const clamped = Math.max(0, Math.min(1, t));
  const a = rgbToHsl(...hexToRgb(hex1));
  const b = rgbToHsl(...hexToRgb(hex2));
  let dh = b[0] - a[0];
  if (dh > 180) dh -= 360;
  if (dh < -180) dh += 360;
  return hslToHex(a[0] + dh * clamped, a[1] + (b[1] - a[1]) * clamped, a[2] + (b[2] - a[2]) * clamped);
}

export const RING_HEALTHY = "#19D9A0";
export const RING_CAUTION = "#FFC24D";
export const RING_DANGER = "#FF5C72";
export const RING_NEGATIVE = "#C8323F";
const RING_LOW = 0.2;
const RING_HIGH = 0.5;

/** Continuous HSL-interpolated ring colour for a given 0..1 "share remaining" pct. */
export function ringColorForPct(pct: number): string {
  if (pct <= 0) return RING_NEGATIVE;
  if (pct <= RING_LOW) return mixHue(RING_DANGER, RING_CAUTION, pct / RING_LOW);
  if (pct <= RING_HIGH) return mixHue(RING_CAUTION, RING_HEALTHY, (pct - RING_LOW) / (RING_HIGH - RING_LOW));
  return RING_HEALTHY;
}
