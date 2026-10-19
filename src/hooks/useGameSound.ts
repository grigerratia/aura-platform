'use client';

import { create } from 'zustand';

interface SoundStore {
  isMuted: boolean;
  toggleMute: () => void;
  setMuted: (muted: boolean) => void;
}

const STORAGE_KEY = 'aura_game_muted';

export const useSoundStore = create<SoundStore>((set) => ({
  isMuted: typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) === 'true' : false,
  toggleMute: () =>
    set((state) => {
      const next = !state.isMuted;
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, String(next));
      }
      return { isMuted: next };
    }),
  setMuted: (muted: boolean) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, String(muted));
    }
    set({ isMuted: muted });
  },
}));

// Contexto de audio Web Audio API compartido (Lazy Initialization)
let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export function useGameSound() {
  const { isMuted, toggleMute } = useSoundStore();

  // 1. playTap(): Micro-sonido táctil corto y cálido (320Hz -> 140Hz en 45ms) + háptica
  const playTap = () => {
    if (isMuted) return;

    // Vibración háptica nativa (8ms)
    try {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(8);
      }
    } catch {}

    const ctx = getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    const now = ctx.currentTime;
    osc.type = 'sine';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(140, now + 0.045);

    // Volumen ultra-sutil (max 0.10)
    gain.gain.setValueAtTime(0.09, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.045);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.05);
  };

  // 2. playSweep(): Sonido suave de aire/transición al cambiar de modo o abrir Bottom Sheet
  const playSweep = () => {
    if (isMuted) return;

    try {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(10);
      }
    } catch {}

    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(450, now);
    filter.frequency.exponentialRampToValueAtTime(160, now + 0.12);

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(260, now);
    osc.frequency.exponentialRampToValueAtTime(120, now + 0.12);

    gain.gain.setValueAtTime(0.07, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.13);
  };

  // 3. playUnlockSuccess(): Arpegio ascendente suave (Do, Mi, Sol, Do agudo) + háptica compuesta
  const playUnlockSuccess = () => {
    if (isMuted) return;

    try {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([15, 40, 25]);
      }
    } catch {}

    const ctx = getAudioContext();
    if (!ctx) return;

    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    const startTime = ctx.currentTime;

    notes.forEach((freq, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      const noteStart = startTime + index * 0.075;
      const noteDuration = 0.28;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, noteStart);

      gain.gain.setValueAtTime(0.08, noteStart);
      gain.gain.exponentialRampToValueAtTime(0.0001, noteStart + noteDuration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(noteStart);
      osc.stop(noteStart + noteDuration);
    });
  };

  return {
    isMuted,
    toggleMute,
    playTap,
    playSweep,
    playUnlockSuccess,
  };
}

