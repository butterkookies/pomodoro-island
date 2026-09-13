/**
 * systemAudioListener.js
 *
 * Captures live Windows system audio output (WASAPI Loopback) using Electron's
 * desktopCapturer and Web Audio AnalyserNode. Provides high-sensitivity,
 * real-time 8-band frequency levels (1 to 7 segments) for the VFD Equalizer.
 */

let _audioCtx = null;
let _sourceNode = null;
let _analyser = null;
let _stream = null;
let _isCapturing = false;
let _initPromise = null;

// Frequency band bin ranges for 256-point FFT (128 bins @ 44.1/48kHz, ~187.5Hz/bin)
// Band 0: 63Hz (bins 0..1)
// Band 1: 160Hz (bins 1..2)
// Band 2: 400Hz (bins 2..4)
// Band 3: 1kHz (bins 5..8)
// Band 4: 2.5kHz (bins 9..16)
// Band 5: 6.3kHz (bins 17..32)
// Band 6: 10kHz (bins 33..56)
// Band 7: 16kHz (bins 57..95)
const BAND_RANGES = [
  [0, 1],
  [1, 2],
  [2, 4],
  [5, 8],
  [9, 16],
  [17, 32],
  [33, 56],
  [57, 95],
];

// Pre-emphasis acoustic compensation multipliers (Fletcher-Munson curve correction)
// Compensates for natural low-energy distribution in upper harmonics of recorded music
const BAND_WEIGHTS = [1.15, 1.05, 1.10, 1.25, 1.45, 1.65, 1.90, 2.20];

/**
 * Initializes desktop loopback audio capture.
 * Resolves to true on success, false if capture is unavailable.
 */
export async function initSystemAudio() {
  if (_isCapturing && _analyser) return true;
  if (_initPromise) return _initPromise;

  _initPromise = (async () => {
    try {
      let stream = null;

      // Primary method: Electron desktopCapturer with chromeMediaSourceId
      const sources = await window.electronAPI?.getDesktopSources?.();
      const primarySource = sources?.[0];

      if (primarySource?.id) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: {
              mandatory: {
                chromeMediaSource: 'desktop',
              },
            },
            video: {
              mandatory: {
                chromeMediaSource: 'desktop',
                chromeMediaSourceId: primarySource.id,
              },
            },
          });
        } catch (err) {
          console.warn('[SystemAudio] getUserMedia with sourceId error:', err);
        }
      }

      // Secondary fallback: getDisplayMedia (handled by main process setDisplayMediaRequestHandler)
      if (!stream && navigator.mediaDevices?.getDisplayMedia) {
        try {
          stream = await navigator.mediaDevices.getDisplayMedia({
            video: true,
            audio: true,
          });
        } catch (err) {
          console.warn('[SystemAudio] getDisplayMedia error:', err);
        }
      }

      if (!stream) {
        return false;
      }

      // Disable video track without stopping it — stopping video track in Electron
      // desktopCapturer can prematurely terminate the entire capture session / audio loopback.
      stream.getVideoTracks().forEach((track) => {
        track.enabled = false;
      });

      const audioTracks = stream.getAudioTracks();
      if (!audioTracks || audioTracks.length === 0) {
        return false;
      }

      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!_audioCtx || _audioCtx.state === 'closed') {
        _audioCtx = new AudioCtx();
      } else if (_audioCtx.state === 'suspended') {
        await _audioCtx.resume();
      }

      _sourceNode = _audioCtx.createMediaStreamSource(stream);
      _analyser = _audioCtx.createAnalyser();
      _analyser.fftSize = 256; // 128 bins for high resolution
      _analyser.smoothingTimeConstant = 0.25; // Snappy, rapid transient response

      _sourceNode.connect(_analyser);
      // NEVER connect _analyser to _audioCtx.destination (avoids audio echo!)

      _stream = stream;
      _isCapturing = true;

      // Handle stream end or user revoke — auto-reconnect so audio reactivity doesn't drop
      audioTracks[0].onended = () => {
        _isCapturing = false;
        if (_sourceNode) {
          try { _sourceNode.disconnect(); } catch (_) {}
          _sourceNode = null;
        }
        if (_analyser) {
          try { _analyser.disconnect(); } catch (_) {}
          _analyser = null;
        }
        _stream = null;
        setTimeout(() => {
          initSystemAudio().catch(() => {});
        }, 1000);
      };

      return true;
    } catch (err) {
      console.error('[SystemAudio] Failed to initialize audio capture:', err);
      return false;
    } finally {
      _initPromise = null;
    }
  })();

  return _initPromise;
}

/**
 * Returns true if system audio capture is currently active and listening.
 */
export function isSystemAudioActive() {
  return _isCapturing && Boolean(_analyser);
}

/**
 * Returns 8 frequency levels [1..7] sampled from live system audio.
 * Calibrated for high sensitivity with musical dynamic range:
 * - Idle/silence stays at segment 1
 * - Normal musical grooves dance vigorously between segments 2 and 5
 * - Segments 6 and 7 reserved for true transient peaks (never stuck on the roof)
 * Returns null if not capturing.
 */
export function getFrequencyLevels() {
  if (!_isCapturing || !_analyser) return null;

  const binCount = _analyser.frequencyBinCount; // 128 bins
  const data = new Uint8Array(binCount);
  _analyser.getByteFrequencyData(data);

  // Check overall energy across the audible spectrum
  let totalEnergy = 0;
  for (let i = 0; i < Math.min(binCount, 96); i++) {
    totalEnergy += data[i];
  }

  // If silent or below noise floor, return 1 (resting state)
  if (totalEnergy < 12) {
    return [1, 1, 1, 1, 1, 1, 1, 1];
  }

  // Balanced acoustic weighting multipliers
  const WEIGHTS = [1.05, 1.0, 1.05, 1.15, 1.25, 1.35, 1.45, 1.60];

  // Process 8 frequency bands
  const levels = BAND_RANGES.map(([start, end], idx) => {
    let sum = 0;
    const count = end - start + 1;
    for (let b = start; b <= end; b++) {
      sum += data[b] || 0;
    }
    const avg = sum / count; // 0 to 255

    // Subtract baseline noise floor
    const cleanVal = Math.max(0, avg - 6);

    if (cleanVal <= 1) {
      return 1;
    }

    // Apply balanced acoustic pre-emphasis
    const weightedVal = cleanVal * (WEIGHTS[idx] || 1.0);

    // Musical dynamic range curve:
    // Scale against 220 with 0.85 power curve so music bounces dynamically in mid-segments (2-5),
    // reserving segments 6-7 strictly for transient spikes (never stuck on the roof).
    const normalized = Math.min(1.0, weightedVal / 220);
    const boosted = Math.pow(normalized, 0.85);

    return Math.max(1, Math.min(7, 1 + Math.round(boosted * 6)));
  });

  return levels;
}

/**
 * Returns instantaneous audio energy metrics normalized [0..1].
 * Used by Island aura, moving shadows, and mini-equalizer bars.
 * Returns null if not capturing or silent.
 */
export function getAudioEnergy() {
  if (!_isCapturing || !_analyser) return null;

  const binCount = _analyser.frequencyBinCount;
  const data = new Uint8Array(binCount);
  _analyser.getByteFrequencyData(data);

  let bassSum = 0;
  for (let i = 0; i <= 4; i++) bassSum += data[i] || 0;
  const bass = Math.min(1.0, (bassSum / 5) / 160);

  let midSum = 0;
  for (let i = 5; i <= 24; i++) midSum += data[i] || 0;
  const mid = Math.min(1.0, (midSum / 20) / 150);

  let trebleSum = 0;
  for (let i = 25; i <= 70; i++) trebleSum += data[i] || 0;
  const treble = Math.min(1.0, (trebleSum / 46) / 130);

  const overall = Math.min(1.0, (bass * 0.52 + mid * 0.33 + treble * 0.15));

  return { overall, bass, mid, treble };
}

/**
 * Cleanly terminates system audio capture and frees resources.
 */
export function stopSystemAudio() {
  _isCapturing = false;
  if (_stream) {
    _stream.getTracks().forEach((t) => t.stop());
    _stream = null;
  }
  if (_sourceNode) {
    try {
      _sourceNode.disconnect();
    } catch (_) {}
    _sourceNode = null;
  }
  if (_analyser) {
    try {
      _analyser.disconnect();
    } catch (_) {}
    _analyser = null;
  }
  if (_audioCtx && _audioCtx.state !== 'closed') {
    try {
      _audioCtx.close();
    } catch (_) {}
    _audioCtx = null;
  }
}
