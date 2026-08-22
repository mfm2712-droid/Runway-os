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
  if (!ctx) ctx = new Ctor();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

/** A short synthesized tone — no external audio assets. */
function playTone(freq: number, duration: number, peakGain: number): void {
  if (muted) return;
  const audioCtx = getContext();
  if (!audioCtx) return;

  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = "sine";
  osc.frequency.value = freq;

  const now = audioCtx.currentTime;
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(peakGain, now + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start(now);
  osc.stop(now + duration);
}

/** A light tap click — tab switches, ring taps. */
export function playClick(): void {
  playTone(1100, 0.05, 0.05);
}

/** A rounder confirmation pop — expense logged, subscription cancelled. */
export function playPop(): void {
  playTone(660, 0.14, 0.08);
}
