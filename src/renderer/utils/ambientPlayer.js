let _ctx = null;
let _masterGain = null;
let _analyser = null;
let _source = null;
let _currentSound = null;
let _volume = window.electronAPI?.store?.get('ambientVolume') ?? 0.5;

function ctx() {
  if (!_ctx) {
    _ctx = new AudioContext();
    _masterGain = _ctx.createGain();
    // Psychoacoustic logarithmic curve
    _masterGain.gain.value = _volume * _volume;
    _analyser = _ctx.createAnalyser();
    _analyser.fftSize = 64;
    _analyser.smoothingTimeConstant = 0.65;
    _masterGain.connect(_analyser);
    _analyser.connect(_ctx.destination);
  }
  if (_ctx.state === 'suspended') _ctx.resume();
  return _ctx;
}

// ── Noise buffer generators ──────────────────────────────

function whiteBuffer(ac) {
  const len = ac.sampleRate * 3;
  const buf = ac.createBuffer(1, len, ac.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  return buf;
}

function brownBuffer(ac) {
  const len = ac.sampleRate * 3;
  const buf = ac.createBuffer(1, len, ac.sampleRate);
  const d = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < len; i++) {
    const w = Math.random() * 2 - 1;
    d[i] = (last + 0.02 * w) / 1.02;
    last = d[i];
    d[i] *= 3.5;
  }
  return buf;
}

// ── Sound factory functions ──────────────────────────────

function makeWhite(ac, dest) {
  const src = ac.createBufferSource();
  src.buffer = whiteBuffer(ac);
  src.loop = true;
  src.connect(dest);
  return src;
}

function makeBrown(ac, dest) {
  const src = ac.createBufferSource();
  src.buffer = brownBuffer(ac);
  src.loop = true;
  src.connect(dest);
  return src;
}

// Rain: white noise through a bandpass filter
function makeRain(ac, dest) {
  const src = ac.createBufferSource();
  src.buffer = whiteBuffer(ac);
  src.loop = true;
  const filter = ac.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 1800;
  filter.Q.value = 0.5;
  src.connect(filter);
  filter.connect(dest);
  return src;
}

// Wind: brown noise through a low-pass filter with slow LFO on gain
function makeWind(ac, dest) {
  const src = ac.createBufferSource();
  src.buffer = brownBuffer(ac);
  src.loop = true;
  const filter = ac.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 500;
  const lfoGain = ac.createGain();
  const lfo = ac.createOscillator();
  lfo.frequency.value = 0.15;
  const lfoDepth = ac.createGain();
  lfoDepth.gain.value = 0.3;
  lfo.connect(lfoDepth);
  lfoDepth.connect(lfoGain.gain);
  lfoGain.gain.value = 0.7;
  src.connect(filter);
  filter.connect(lfoGain);
  lfoGain.connect(dest);
  lfo.start();
  // Store lfo reference so we can stop it
  src._lfo = lfo;
  return src;
}

// ── Public API ───────────────────────────────────────────

export const SOUND_LIST = [
  { id: 'white', label: 'White' },
  { id: 'brown', label: 'Brown' },
  { id: 'rain',  label: 'Rain'  },
  { id: 'wind',  label: 'Wind'  },
];

export function play(soundId) {
  stop();
  const ac = ctx();
  const makers = { white: makeWhite, brown: makeBrown, rain: makeRain, wind: makeWind };
  const make = makers[soundId];
  if (!make) return;
  _source = make(ac, _masterGain);
  _source.start();
  _currentSound = soundId;
}

export function stop() {
  if (_source) {
    try { _source._lfo?.stop(); } catch (_) {}
    try { _source.stop(); } catch (_) {}
    _source.disconnect();
    _source = null;
  }
  _currentSound = null;
}

export function setVolume(v) {
  _volume = Math.max(0, Math.min(1, v));
  if (_masterGain) {
    const logGain = _volume * _volume;
    _masterGain.gain.setTargetAtTime(logGain, ctx().currentTime, 0.05);
  }
  window.electronAPI?.store?.set('ambientVolume', _volume);
}

export function getCurrentSound() { return _currentSound; }
export function getVolume() { return _volume; }
export function isPlaying() { return Boolean(_currentSound); }

/**
 * Returns 8 normalized frequency levels [1..7] sampled from the active soundscape.
 * Returns null if no soundscape is currently playing.
 *
 * @returns {number[] | null} Array of 8 segment levels (1 to 7) or null
 */
export function getFrequencyLevels() {
  if (!_currentSound || !_analyser) return null;
  const binCount = _analyser.frequencyBinCount; // 32 bins for fftSize 64
  const data = new Uint8Array(binCount);
  _analyser.getByteFrequencyData(data);

  // Group 32 bins into 8 frequency bands:
  // Band 0 (63Hz): bins 0..1
  // Band 1 (160Hz): bins 2..3
  // Band 2 (400Hz): bins 4..5
  // Band 3 (1kHz): bins 6..8
  // Band 4 (2.5kHz): bins 9..12
  // Band 5 (6.3kHz): bins 13..17
  // Band 6 (10kHz): bins 18..23
  // Band 7 (16kHz): bins 24..31
  const bandRanges = [
    [0, 1],
    [2, 3],
    [4, 5],
    [6, 8],
    [9, 12],
    [13, 17],
    [18, 23],
    [24, 31],
  ];

  const levels = bandRanges.map(([start, end]) => {
    let sum = 0;
    const count = end - start + 1;
    for (let b = start; b <= end; b++) {
      sum += data[b] || 0;
    }
    const avg = sum / count; // 0 to 255
    const normalized = Math.min(1, Math.max(0, avg / 180));
    return Math.max(1, Math.min(7, Math.round(normalized * 7)));
  });

  return levels;
}
