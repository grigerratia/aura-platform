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

  // 4. playDustSnap(): Sonido sintético de polvo / arena (ruido blanco filtrado en barrido 1200Hz -> 350Hz) + háptica
  const playDustSnap = (intensity: 'fast' | 'epic' = 'fast') => {
    if (isMuted) return;

    try {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        if (intensity === 'epic') {
          navigator.vibrate([16, 28, 12, 35, 8]);
        } else {
          navigator.vibrate([10, 22, 6]);
        }
      }
    } catch {}

    const ctx = getAudioContext();
    if (!ctx) return;

    const duration = intensity === 'epic' ? 0.65 : 0.32;
    const bufferSize = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    // Generar ruido blanco con atenuación progresiva cálida
    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      lastOut = (lastOut + 0.02 * white) / 1.02;
      data[i] = lastOut * 3.2;
    }

    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = 2.4;

    const gain = ctx.createGain();
    const now = ctx.currentTime;

    // Barrido de frecuencia de 1200Hz a 350Hz
    filter.frequency.setValueAtTime(1200, now);
    filter.frequency.exponentialRampToValueAtTime(350, now + duration);

    // Ganancia sutil y fade out exponencial
    const peakGain = intensity === 'epic' ? 0.10 : 0.08;
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(peakGain, now + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    noiseSource.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    noiseSource.start(now);
    noiseSource.stop(now + duration + 0.02);
  };

  // 5. playAlertChime(): Campana de notificación de dos tonos (Mi5 -> Si5, 659Hz -> 987Hz) para mostrador y confirmación
  const playAlertChime = () => {
    if (isMuted) return;

    try {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([20, 50, 20]);
      }
    } catch {}

    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(659.25, now); // E5
    gain1.gain.setValueAtTime(0.09, now);
    gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.36);

    // Segundo tono más alto
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(987.77, now + 0.09); // B5
    gain2.gain.setValueAtTime(0.12, now + 0.09);
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);

    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.09);
    osc2.stop(now + 0.56);
  };

  // 6. playRadarPing(): Sonar ping suave para escaneo en tiempo real de estante físico (440Hz -> 880Hz)
  const playRadarPing = () => {
    if (isMuted) return;

    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.exponentialRampToValueAtTime(840, now + 0.08);

    gain.gain.setValueAtTime(0.05, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.36);
  };

  return {
    isMuted,
    toggleMute,
    playTap,
    playSweep,
    playUnlockSuccess,
    playDustSnap,
    playAlertChime,
    playRadarPing,
  };
}

