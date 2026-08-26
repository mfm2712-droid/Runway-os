import { DESIGN_LAB_TOKENS_KEY } from "./storageKeys";

/**
 * Shape written by public/design-lab.html's "Clonar / Aplicar a la app" button
 * (its `S` state object, JSON-serialized). Only the fields this bridge reads
 * are declared — the export always contains more.
 */
export interface DesignLabTokens {
  bg: string;
  card: string;
  borderCol: string;
  borderA: number;
  bw: number;
  radius: number;
  shadow: number;
  blur: number;
  gap: number;
  gutter: number;
  accentFollows: boolean;
  accent: string;
  cHealthy: string;
  ringD: number;
  stroke: number;
  bloom: number;
  bloomA: number;
  hero: number;
  heroW: number;
  navH: number;
  fab: boolean;
  logoSpeed?: number;
  logoPaused?: boolean;
  logoDir?: "cw" | "ccw";
}

export function hexToRgbaString(hex: string, alpha: number): string {
  let h = hex.replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function readDesignLabTokens(): DesignLabTokens | null {
  try {
    const raw = localStorage.getItem(DESIGN_LAB_TOKENS_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as DesignLabTokens;
  } catch {
    return null;
  }
}

/**
 * Pushes the CSS-variable-drivable subset of the tokens straight onto
 * :root so already-mounted components repaint immediately. Ring geometry,
 * hero typography, nav height/FAB and logo spin are NOT CSS vars — those
 * are read straight out of the tokens object by the components that need
 * them (see useDesignLabOverrides).
 */
export function applyDesignLabTokens(tokens: DesignLabTokens) {
  const root = document.documentElement.style;
  const accent = tokens.accentFollows ? tokens.cHealthy : tokens.accent;

  root.setProperty("--bg", tokens.bg);
  root.setProperty("--card", hexToRgbaString(tokens.card, 0.88));
  root.setProperty("--card-strong", hexToRgbaString(tokens.card, 0.96));
  root.setProperty("--border", hexToRgbaString(tokens.borderCol, tokens.borderA));
  root.setProperty("--border-soft", hexToRgbaString(tokens.borderCol, tokens.borderA * 0.55));
  root.setProperty(
    "--shadow-card",
    `0 ${(tokens.shadow * 22).toFixed(0)}px ${(tokens.shadow * 54).toFixed(0)}px rgba(0,0,0,${tokens.shadow.toFixed(2)})`
  );
  root.setProperty("--radius-xl", `${tokens.radius}px`);
  root.setProperty("--dl-border-width", `${tokens.bw}px`);
  root.setProperty("--dl-blur", `${tokens.blur}px`);
  root.setProperty("--dl-gutter", `${tokens.gutter}px`);
  root.setProperty("--dl-gap", `${tokens.gap}px`);
  root.setProperty("--color-cyan-400", accent);
  root.setProperty("--color-mint-400", accent);
}
