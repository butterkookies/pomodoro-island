let origin = null;
let duration = 25 * 60 * 1000;
let intervalId = null;

self.onmessage = ({ data }) => {
  if (data.type === 'START') {
    clearInterval(intervalId);
    if (data.duration && data.duration > 0) duration = data.duration;
    origin = performance.now();
    tick();
  }
  if (data.type === 'PAUSE') {
    clearInterval(intervalId);
  }
  if (data.type === 'RESUME') {
    clearInterval(intervalId);
    if (data.duration && data.duration > 0) duration = data.duration;
    if (!duration || duration <= 0) duration = 25 * 60 * 1000;
    const remaining = typeof data.remaining === 'number' ? data.remaining : duration;
    origin = performance.now() - (duration - remaining);
    tick();
  }
  if (data.type === 'SET' || data.type === 'RESET') {
    clearInterval(intervalId);
    if (data.duration && data.duration > 0) duration = data.duration;
    origin = null;
  }
};

function tick() {
  clearInterval(intervalId);
  intervalId = setInterval(() => {
    if (!duration || duration <= 0) return;
    const elapsed = performance.now() - origin;
    const remaining = Math.max(0, duration - elapsed);
    const percent = Math.max(0, Math.min(1, remaining / duration));

    self.postMessage({ type: 'TICK', remaining, percent, duration });

    if (remaining <= 0) {
      clearInterval(intervalId);
      self.postMessage({ type: 'COMPLETE' });
    }
  }, 100);
}
