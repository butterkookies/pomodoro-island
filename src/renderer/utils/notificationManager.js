const PHASE_MESSAGES = {
  FOCUS:       { title: 'Focus Session Complete', body: 'Time for a break. You earned it!' },
  SHORT_BREAK: { title: 'Break Over',             body: 'Ready to focus again?' },
  LONG_BREAK:  { title: 'Long Break Over',        body: 'Back to work when you are ready.' },
};

export function notifyPhaseComplete(phase) {
  const { title, body } = PHASE_MESSAGES[phase] ?? { title: 'Timer Complete', body: '' };
  send(title, body);
}

export function notifyReminder(name) {
  send(`Reminder: ${name}`, 'Your timer is ready to start.');
}

function send(title, body) {
  window.electronAPI?.showNotification(title, body);
}
