let origin = null;
let duration = null;
let intervalId = null;

self.onmessage = ({ data }) => {
  if (data.type === 'START') {
    clearInterval(intervalId);
    origin = performance.now();
    duration = data.duration;
    tick();
  }
  if (data.type === 'PAUSE') clearInterval(intervalId);
  if (data.type === 'RESUME') {
    origin = performance.now() - (duration - data.remaining);
    tick();
  }
  if (data.type === 'RESET') {
    clearInterval(intervalId);
    origin = null;
  }
};

function tick() {
  intervalId = setInterval(() => {
    const elapsed = performance.now() - origin;
    const remaining = Math.max(0, duration - elapsed);
    const percent = remaining / duration;

    self.postMessage({ type: 'TICK', remaining, percent });

    if (remaining <= 0) {
      clearInterval(intervalId);
      self.postMessage({ type: 'COMPLETE' });
    }
  }, 100);
}
