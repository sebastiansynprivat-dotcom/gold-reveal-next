import { useCallback, useRef } from "react";

const SFX_MUTED_KEY = "sfx_muted";

function isMuted(): boolean {
  return localStorage.getItem(SFX_MUTED_KEY) === "true";
}

function createOscillator(
  ctx: AudioContext,
  freq: number,
  startTime: number,
  duration: number,
  type: OscillatorType = "sine",
  gain = 0.15
) {
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.setValueAtTime(gain, startTime);
  g.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
  osc.connect(g).connect(ctx.destination);
  osc.start(startTime);
  osc.stop(startTime + duration);
}

function playCheck() {
  const ctx = new AudioContext();
  const now = ctx.currentTime;
  createOscillator(ctx, 880, now, 0.08, "sine", 0.12);
  createOscillator(ctx, 1320, now + 0.07, 0.1, "sine", 0.12);
  setTimeout(() => ctx.close(), 300);
}

function playStreak() {
  const ctx = new AudioContext();
  const now = ctx.currentTime;
  createOscillator(ctx, 523, now, 0.12, "triangle", 0.13);
  createOscillator(ctx, 659, now + 0.1, 0.12, "triangle", 0.13);
  createOscillator(ctx, 784, now + 0.2, 0.15, "triangle", 0.15);
  setTimeout(() => ctx.close(), 600);
}

function playLevelUp() {
  const ctx = new AudioContext();
  const now = ctx.currentTime;
  createOscillator(ctx, 523, now, 0.12, "square", 0.08);
  createOscillator(ctx, 659, now + 0.1, 0.12, "square", 0.08);
  createOscillator(ctx, 784, now + 0.2, 0.12, "square", 0.08);
  createOscillator(ctx, 1047, now + 0.3, 0.25, "square", 0.1);
  setTimeout(() => ctx.close(), 800);
}

function playCoin() {
  const ctx = new AudioContext();
  const now = ctx.currentTime;
  createOscillator(ctx, 1568, now, 0.06, "sine", 0.1);
  createOscillator(ctx, 2093, now + 0.05, 0.08, "sine", 0.1);
  setTimeout(() => ctx.close(), 250);
}

export function useSoundEffects() {
  const playCheckSound = useCallback(() => {
    if (!isMuted()) playCheck();
  }, []);

  const playStreakSound = useCallback(() => {
    if (!isMuted()) playStreak();
  }, []);

  const playLevelUpSound = useCallback(() => {
    if (!isMuted()) playLevelUp();
  }, []);

  const playCoinSound = useCallback(() => {
    if (!isMuted()) playCoin();
  }, []);

  const toggleMute = useCallback(() => {
    const muted = isMuted();
    localStorage.setItem(SFX_MUTED_KEY, muted ? "false" : "true");
    return !muted;
  }, []);

  const getMuted = useCallback(() => isMuted(), []);

  return { playCheckSound, playStreakSound, playLevelUpSound, playCoinSound, toggleMute, getMuted };
}
