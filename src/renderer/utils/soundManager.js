let _ctx = null;

function ctx() {
  if (typeof window === 'undefined') return null;
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return null;
  if (!_ctx) {
    _ctx = new AudioCtx();
  }
  if (_ctx.state === 'suspended') {
    _ctx.resume().catch(() => {});
  }
  return _ctx;
}

export const ALARM_THEMES = {
  zen: {
    label: 'Zen Bowl',
    name: 'Tibetan Singing Bowl',
    desc: 'Deep warm bronze resonance with gentle binaural beating',
  },
  obsidian: {
    label: 'Obsidian',
    name: 'Apple Obsidian Glass',
    desc: 'Minimalist crystal glass chimes with pure harmonics',
  },
  marimba: {
    label: 'Marimba',
    name: 'Forest Marimba',
    desc: 'Organic wooden mallet strikes with natural acoustic warmth',
  },
};

/**
 * Determines whether a phase completion signals the start of a BREAK (unwind)
 * or the start of FOCUS (awaken).
 *
 * - When FOCUS completes: user enters Break (needs calm, descending, grounding acoustic cue).
 * - When SHORT_BREAK or LONG_BREAK completes: user enters Focus (needs bright, ascending, clarifying cue).
 */
export function getAlarmMomentType(phase) {
  const norm = String(phase || '').toUpperCase();
  if (norm.includes('BREAK')) {
    return 'focus'; // Break finished -> Time to focus
  }
  return 'break'; // Focus finished -> Time to take a break
}

/**
 * Synthesizes an organic resonant acoustic chime with smooth attack, lowpass filtering,
 * natural inharmonic partials, and exponential decay.
 */
function playResonantChime(ac, notes, { filterFreq = 3400, masterVol = 0.35, detuneBeat = true } = {}) {
  if (!ac) return;

  const t = ac.currentTime;

  notes.forEach((n) => {
    const startTime = t + (n.delay || 0);
    const dur = n.dur || 1.8;
    const vol = (n.vol ?? 0.3) * masterVol;
    const freq = n.freq;

    // Note master gain with gentle linear attack (zero clicks) & exponential decay
    const noteGain = ac.createGain();
    noteGain.gain.setValueAtTime(0.0001, startTime);
    noteGain.gain.linearRampToValueAtTime(vol, startTime + (n.attack || 0.016));
    noteGain.gain.exponentialRampToValueAtTime(0.0001, startTime + dur);

    // Warm lowpass filter to remove digital edge
    const filter = ac.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(n.filterFreq || filterFreq, startTime);
    filter.Q.setValueAtTime(0.8, startTime);

    noteGain.connect(filter);
    filter.connect(ac.destination);

    // Fundamental oscillator
    const osc = ac.createOscillator();
    osc.type = n.type || 'sine';
    osc.frequency.setValueAtTime(freq, startTime);
    osc.connect(noteGain);
    osc.start(startTime);
    osc.stop(startTime + dur + 0.05);

    // Subtle detuned beating oscillator (emulates physical singing bowl / dual chime pulsation)
    if (detuneBeat && (n.detuneHz || 1.0) > 0) {
      const oscDetune = ac.createOscillator();
      const detuneGain = ac.createGain();
      detuneGain.gain.setValueAtTime(0.35, startTime);
      oscDetune.type = n.type || 'sine';
      oscDetune.frequency.setValueAtTime(freq + (n.detuneHz || 1.1), startTime);
      oscDetune.connect(detuneGain);
      detuneGain.connect(noteGain);
      oscDetune.start(startTime);
      oscDetune.stop(startTime + dur + 0.05);
    }

    // Inharmonic acoustic partials (e.g. 2.76x and 5.4x for bronze bell / bowl modes)
    if (Array.isArray(n.partials)) {
      n.partials.forEach((part) => {
        const partOsc = ac.createOscillator();
        const partGain = ac.createGain();
        const pDur = Math.min(dur * 0.65, 0.9);
        const pVol = (part.vol ?? 0.15);

        partGain.gain.setValueAtTime(0.0001, startTime);
        partGain.gain.linearRampToValueAtTime(pVol, startTime + 0.008);
        partGain.gain.exponentialRampToValueAtTime(0.0001, startTime + pDur);

        partOsc.type = 'sine';
        partOsc.frequency.setValueAtTime(freq * part.mult, startTime);
        partOsc.connect(partGain);
        partGain.connect(noteGain);

        partOsc.start(startTime);
        partOsc.stop(startTime + pDur + 0.05);
      });
    }
  });
}

const storeGet = (key, fallback) => {
  try {
    if (typeof window !== 'undefined' && window.electronAPI?.store?.get) {
      return window.electronAPI.store.get(key, fallback);
    }
  } catch {}
  return fallback;
};

/**
 * Plays the calm moment-aware timer chime:
 * - Entering Break: Descending, grounding, peaceful acoustic resolution ("unwind, breathe, rest").
 * - Entering Focus: Ascending, clarifying, uplifting pristine chimes ("clarity, focus, create").
 */
export function playPhaseComplete(phase = 'FOCUS', overrideTheme = null, overrideVolume = null) {
  try {
    const isEnabled = storeGet('timerSoundEnabled', true);
    if (!isEnabled && overrideTheme === null) return;

    const themeKey = overrideTheme || storeGet('timerSoundTheme', 'zen') || 'zen';
    const volumeSetting = overrideVolume != null
      ? overrideVolume
      : storeGet('timerSoundVolume', 75);

    const masterVol = Math.max(0.1, Math.min(1.0, volumeSetting / 100)) * 0.9;
    const moment = getAlarmMomentType(phase);
    const ac = ctx();
    if (!ac) return;

    if (themeKey === 'zen') {
      if (moment === 'break') {
        // Zen: Tibetan Singing Bowl — Descending Unwind (F4 -> C5 -> A4 with low F3 root)
        playResonantChime(ac, [
          {
            freq: 349.23, // F4
            delay: 0.00,
            dur: 2.2,
            vol: 0.38,
            detuneHz: 1.2,
            partials: [{ mult: 2.76, vol: 0.20 }, { mult: 5.4, vol: 0.08 }],
          },
          {
            freq: 523.25, // C5 (warm fifth)
            delay: 0.38,
            dur: 2.0,
            vol: 0.32,
            detuneHz: 1.0,
            partials: [{ mult: 2.76, vol: 0.16 }],
          },
          {
            freq: 440.00, // A4 (resolving major third)
            delay: 0.76,
            dur: 2.4,
            vol: 0.34,
            detuneHz: 0.8,
            partials: [{ mult: 2.76, vol: 0.14 }],
          },
          {
            freq: 174.61, // F3 (deep grounding body)
            delay: 0.76,
            dur: 2.8,
            vol: 0.22,
            type: 'triangle',
            filterFreq: 1800,
            detuneHz: 0.5,
          },
        ], { filterFreq: 3200, masterVol, detuneBeat: true });
      } else {
        // Zen: Morning Temple Chime — Ascending Awaken (C5 -> G5 -> crystalline C6)
        playResonantChime(ac, [
          {
            freq: 523.25, // C5
            delay: 0.00,
            dur: 1.8,
            vol: 0.30,
            partials: [{ mult: 2.76, vol: 0.18 }],
          },
          {
            freq: 783.99, // G5
            delay: 0.24,
            dur: 1.9,
            vol: 0.32,
            partials: [{ mult: 2.76, vol: 0.16 }],
          },
          {
            freq: 1046.50, // C6 (pure pristine clarity)
            delay: 0.48,
            dur: 2.4,
            vol: 0.36,
            partials: [{ mult: 2.0, vol: 0.15 }, { mult: 2.76, vol: 0.12 }],
          },
        ], { filterFreq: 4600, masterVol, detuneBeat: true });
      }
    } else if (themeKey === 'obsidian') {
      if (moment === 'break') {
        // Obsidian Glass: Descending Electric Glass (G5 -> E5 -> C5 -> F4)
        playResonantChime(ac, [
          { freq: 783.99, delay: 0.00, dur: 1.4, vol: 0.28, type: 'sine' },
          { freq: 659.25, delay: 0.18, dur: 1.4, vol: 0.28, type: 'sine' },
          { freq: 523.25, delay: 0.36, dur: 1.6, vol: 0.30, type: 'sine' },
          { freq: 349.23, delay: 0.54, dur: 2.0, vol: 0.35, type: 'sine' },
        ], { filterFreq: 2600, masterVol, detuneBeat: false });
      } else {
        // Obsidian Glass: Ascending Apple Triad (C5 -> E5 -> G5 -> C6)
        playResonantChime(ac, [
          { freq: 523.25, delay: 0.00, dur: 1.4, vol: 0.28, type: 'sine' },
          { freq: 659.25, delay: 0.16, dur: 1.5, vol: 0.30, type: 'sine' },
          { freq: 783.99, delay: 0.32, dur: 1.6, vol: 0.32, type: 'sine' },
          { freq: 1046.50, delay: 0.48, dur: 2.0, vol: 0.36, type: 'sine' },
        ], { filterFreq: 4000, masterVol, detuneBeat: false });
      }
    } else if (themeKey === 'marimba') {
      if (moment === 'break') {
        // Forest Marimba: Warm wooden descent (A4 -> F4 -> D4 -> A3)
        playResonantChime(ac, [
          { freq: 440.00, delay: 0.00, dur: 0.8, vol: 0.35, type: 'triangle', filterFreq: 2200 },
          { freq: 349.23, delay: 0.16, dur: 0.8, vol: 0.34, type: 'triangle', filterFreq: 2000 },
          { freq: 293.66, delay: 0.32, dur: 1.1, vol: 0.36, type: 'triangle', filterFreq: 1800 },
          { freq: 220.00, delay: 0.48, dur: 1.5, vol: 0.38, type: 'triangle', filterFreq: 1500 },
        ], { filterFreq: 2400, masterVol, detuneBeat: false });
      } else {
        // Forest Marimba: Bouncy wooden ascent (D4 -> G4 -> B4 -> D5)
        playResonantChime(ac, [
          { freq: 293.66, delay: 0.00, dur: 0.8, vol: 0.32, type: 'triangle', filterFreq: 2000 },
          { freq: 392.00, delay: 0.16, dur: 0.8, vol: 0.34, type: 'triangle', filterFreq: 2200 },
          { freq: 493.88, delay: 0.32, dur: 1.0, vol: 0.35, type: 'triangle', filterFreq: 2500 },
          { freq: 587.33, delay: 0.48, dur: 1.3, vol: 0.38, type: 'triangle', filterFreq: 2800 },
        ], { filterFreq: 3000, masterVol, detuneBeat: false });
      }
    }
  } catch (err) {
    console.warn('[soundManager] playPhaseComplete error:', err);
  }
}

/**
 * Previews an alarm sound directly from settings.
 */
export function previewSound(phase = 'FOCUS', theme = 'zen', volume = 75) {
  playPhaseComplete(phase, theme, volume);
}

// Two-note gentle alert played when a reminder fires
export function playReminder() {
  try {
    const ac = ctx();
    if (!ac) return;
    playResonantChime(ac, [
      { freq: 880.00, delay: 0.00, dur: 0.45, vol: 0.25, type: 'sine' },
      { freq: 1108.73, delay: 0.14, dur: 0.65, vol: 0.28, type: 'sine' },
    ], { filterFreq: 3500, masterVol: 0.7, detuneBeat: false });
  } catch {}
}

// Soft organic acoustic chime played when a custom timer completes
export function playCustomTimerComplete() {
  try {
    const ac = ctx();
    if (!ac) return;
    playResonantChime(ac, [
      { freq: 698.46, delay: 0.00, dur: 0.65, vol: 0.28, type: 'triangle', filterFreq: 2800 },
      { freq: 1046.50, delay: 0.14, dur: 0.95, vol: 0.32, type: 'triangle', filterFreq: 3200 },
    ], { filterFreq: 3000, masterVol: 0.75, detuneBeat: false });
  } catch {}
}

// Crisp Apple-style tactile UI click (button / tab press)
export function playUiClick() {
  try {
    const ac = ctx();
    const t = ac.currentTime;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, t);
    osc.frequency.exponentialRampToValueAtTime(300, t + 0.015);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(0.08, t + 0.003);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.018);
    osc.start(t);
    osc.stop(t + 0.02);
  } catch {}
}

// Crisp magnetic center detent click played when island snaps back to center
export function playSnapHaptic() {
  try {
    const isSoundEnabled = storeGet('soundEffectsEnabled', true);
    if (!isSoundEnabled) return;

    const ac = ctx();
    const t = ac.currentTime;

    // Transient tick (sharp mechanical pulse)
    const osc1 = ac.createOscillator();
    const gain1 = ac.createGain();
    osc1.connect(gain1);
    gain1.connect(ac.destination);
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(1500, t);
    osc1.frequency.exponentialRampToValueAtTime(450, t + 0.012);
    gain1.gain.setValueAtTime(0.0001, t);
    gain1.gain.linearRampToValueAtTime(0.12, t + 0.002);
    gain1.gain.exponentialRampToValueAtTime(0.0001, t + 0.015);
    osc1.start(t);
    osc1.stop(t + 0.02);

    // Warm resonant body (subtle wooden/obsidian magnetic detent)
    const osc2 = ac.createOscillator();
    const gain2 = ac.createGain();
    osc2.connect(gain2);
    gain2.connect(ac.destination);
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(360, t);
    osc2.frequency.exponentialRampToValueAtTime(200, t + 0.035);
    gain2.gain.setValueAtTime(0.0001, t);
    gain2.gain.linearRampToValueAtTime(0.07, t + 0.004);
    gain2.gain.exponentialRampToValueAtTime(0.0001, t + 0.04);
    osc2.start(t);
    osc2.stop(t + 0.045);
  } catch {}
}

// Gentle fluid spring sound when notch expands/contracts
export function playNotchSpring(isExpanding = true) {
  try {
    const ac = ctx();
    const t = ac.currentTime;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.type = 'triangle';
    if (isExpanding) {
      osc.frequency.setValueAtTime(260, t);
      osc.frequency.exponentialRampToValueAtTime(520, t + 0.06);
    } else {
      osc.frequency.setValueAtTime(480, t);
      osc.frequency.exponentialRampToValueAtTime(240, t + 0.06);
    }
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(0.06, t + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
    osc.start(t);
    osc.stop(t + 0.07);
  } catch {}
}

// Curated list of ergonomic micro-habits and wellness reminders during breaks
const WELLNESS_PROMPTS = [
  '20-20-20 rule: Look 20ft away for 20 seconds',
  'Take a sip of water & hydrate',
  'Stand up, stretch your back & shoulders',
  'Roll your neck gently side to side',
  'Rest your eyes & take 3 slow belly breaths',
  'Shake out your wrists & relax your hands',
  'Step away from the screen for a minute',
];

export function getWellnessPrompt() {
  return WELLNESS_PROMPTS[Math.floor(Math.random() * WELLNESS_PROMPTS.length)];
}
