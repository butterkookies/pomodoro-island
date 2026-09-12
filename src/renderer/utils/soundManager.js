let _ctx = null;

function ctx() {
  if (!_ctx) _ctx = new AudioContext();
  if (_ctx.state === 'suspended') _ctx.resume();
  return _ctx;
}

function tone(freq, start, dur, vol = 0.25, type = 'sine') {
  const ac = ctx();
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.connect(gain);
  gain.connect(ac.destination);
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(vol, start + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  osc.start(start);
  osc.stop(start + dur + 0.05);
}

// Three-note ascending chime played on pomodoro phase completion
export function playPhaseComplete() {
  const ac = ctx();
  const t = ac.currentTime;
  tone(523.25, t, 0.45);
  tone(659.25, t + 0.15, 0.45);
  tone(783.99, t + 0.30, 0.65);
}

// Two-note alert played when a reminder fires
export function playReminder() {
  const ac = ctx();
  const t = ac.currentTime;
  tone(880, t, 0.12);
  tone(1046.5, t + 0.18, 0.18);
}

// Soft single chime played when a custom timer completes
export function playCustomTimerComplete() {
  const ac = ctx();
  const t = ac.currentTime;
  tone(698.46, t, 0.55, 0.2, 'triangle');
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
