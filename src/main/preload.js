const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  setClickThrough: (value) => ipcRenderer.send('set-click-through', value),
  setModalOpen: (value) => ipcRenderer.send('set-modal-open', value),
  updateIslandBounds: (bounds) => ipcRenderer.send('update-island-bounds', bounds),
  showNotification: (title, body) => ipcRenderer.send('show-notification', { title, body }),
  onTogglePause: (callback) => ipcRenderer.on('toggle-pause', (_event) => callback()),
  onSkipPhase: (callback) => ipcRenderer.on('skip-phase', (_event) => callback()),
  onMediaToggle: (callback) => ipcRenderer.on('media-toggle', (_event) => callback()),
  onToggleExpand: (callback) => ipcRenderer.on('toggle-expand', (_event) => callback()),
  onCursorEnterIsland: (callback) => ipcRenderer.on('cursor-enter-island', (_event) => callback()),
  getDisplays: () => ipcRenderer.invoke('get-displays'),
  setDisplay: (displayId) => ipcRenderer.send('set-display', displayId),
  toggleVisibility: () => ipcRenderer.send('toggle-visibility'),
  updateStatus: (status) => ipcRenderer.send('update-status', status),
  quitApp: () => ipcRenderer.send('quit-app'),
  setLoginItem: (openAtLogin) => ipcRenderer.send('set-login-item', openAtLogin),
  getLoginItem: () => ipcRenderer.invoke('get-login-item'),
  onNowPlaying: (callback) => {
    const subscription = (_event, data) => callback(data);
    ipcRenderer.on('now-playing-update', subscription);
    return () => ipcRenderer.removeListener('now-playing-update', subscription);
  },
  getNowPlaying: () => ipcRenderer.invoke('get-now-playing'),
  mediaControl: (action) => ipcRenderer.send('media-control', action),
  setTopMargin: (margin) => ipcRenderer.send('set-top-margin', margin),
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel),
  store: {
    get: (key, defaultValue) => ipcRenderer.sendSync('store-get', key, defaultValue),
    set: (key, value) => ipcRenderer.send('store-set', key, value),
  },
});
