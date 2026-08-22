const MUTE_KEY = "runway-os:audioMuted";

function loadMuted(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(MUTE_KEY) === "true";
  } catch {
    return false;
  }
}

let muted = loadMuted();
let ctx: AudioContext | null = null;

export function isAudioMuted(): boolean {
  return muted;
}

export function setAudioMuted(value: boolean): void {
  muted = value;
  try {
    window.localStorage.setItem(MUTE_KEY, String(value));
  } catch {
    // storage unavailable — mute preference just won't persist across reloads
  }
}

function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!ctx) {
    try {
      ctx = new Ctor();
    } catch {
      return null;
    }
  }
  return ctx;
}

function resumeIfSuspended(audioCtx: AudioContext): void {
  if (audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => {
      // Some browsers reject resume() outside a "real" user gesture — the
      // gesture-unlock listeners below give this another chance, and every
      // playTone() call retries too, so this is never fatal.
    });
  }
}

// iOS/Safari (and some Android WebViews) only let an AudioContext start
// producing sound after it's created/resumed synchronously inside a real
// user gesture. Creating it lazily on the first click that happens to want
// a sound often works, but isn't guaranteed — so grab the very first
// pointerdown/keydown anywhere in the app and use it to warm the context up
// front, once, before any sound is actually requested.
if (typeof window !== "undefined") {
  const unlock = () => {
    const audioCtx = getContext();
    if (audioCtx) resumeIfSuspended(audioCtx);
  };
  window.addEventListener("pointerdown", unlock, { once: true, passive: true });
  window.addEventListener("keydown", unlock, { once: true, passive: true });
}

/** A short synthesized tone with a falling pitch — no external audio assets. */
function playTone(startFreq: number, endFreq: number, duration: number, peakGain: number): void {
  if (muted) return;
  const audioCtx = getContext();
  if (!audioCtx) return;
  resumeIfSuspended(audioCtx);

  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = "sine";

  const now = audioCtx.currentTime;
  osc.frequency.setValueAtTime(startFreq, now);
  osc.frequency.exponentialRampToValueAtTime(Math.max(1, endFreq), now + duration);

  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(peakGain, now + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start(now);
  osc.stop(now + duration + 0.02);
}

/** A light tap click — button taps, category select, tab changes, modal close. */
export function playClick(): void {
  playTone(800, 400, 0.05, 0.1);
}

/** A rounder confirmation pop — successful add, subscription cancelled. */
export function playPop(): void {
  playTone(700, 350, 0.09, 0.11);
}
