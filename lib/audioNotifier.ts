// Web Audio API Sound Notifier for Yokayaki POS

let audioCtx: AudioContext | null = null;

const getAudioContext = (): AudioContext | null => {
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
};

/**
 * Call on user gesture (click/tap) to ensure browser Web Audio API is unlocked
 */
export const unlockAudio = () => {
  const ctx = getAudioContext();
  if (ctx && ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }
};

/**
 * 🍱 Play Kitchen New Order Bell Chime (Bright 2-tone chime: G5 -> C6)
 */
export const playNewOrderSound = () => {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const play = () => {
      const now = ctx.currentTime;

      // Note 1: G5 (783.99 Hz)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(783.99, now);
      gain1.gain.setValueAtTime(0.4, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.35);

      // Note 2: High C6 (1046.50 Hz)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1046.50, now + 0.15);
      gain2.gain.setValueAtTime(0.5, now + 0.15);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.65);

      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.15);
      osc2.stop(now + 0.65);
    };

    if (ctx.state === 'suspended') {
      ctx.resume().then(play).catch(() => {});
    } else {
      play();
    }
  } catch (e) {
    console.warn('New order sound error:', e);
  }
};

/**
 * 🔔 Play Check Bill Alert Sound (Rich 3-tone ascending bell chime: E5 -> A5 -> C6)
 */
export const playCheckBillSound = () => {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const play = () => {
      const now = ctx.currentTime;
      const notes = [659.25, 880.00, 1046.50];

      notes.forEach((freq, idx) => {
        const startTime = now + (idx * 0.13);
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, startTime);
        gain.gain.setValueAtTime(0.5, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.45);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + 0.45);
      });
    };

    if (ctx.state === 'suspended') {
      ctx.resume().then(play).catch(() => {});
    } else {
      play();
    }
  } catch (e) {
    console.warn('Check bill sound error:', e);
  }
};
