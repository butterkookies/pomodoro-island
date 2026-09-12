const { app, BrowserWindow, globalShortcut, ipcMain, Notification, screen, Menu, Tray, nativeImage } = require('electron');
const path = require('node:path');
const Store = require('electron-store');

const store = new Store();

if (require('electron-squirrel-startup')) {
  app.quit();
}

const OVERLAY_WIDTH = 560;
const OVERLAY_HEIGHT = 460;

// Hover zone: top portion of the window where the island lives.
// Covers idle (28px) + compact (58px) with comfortable vertical padding.
const HOVER_ZONE_HEIGHT = 65;

let win = null;
let tray = null;
let isIdle = false;       // starts non-idle (compact)
let isOverIsland = true;  // cursor initial state
let isNotchVisible = true;
let currentStatus = { text: 'Focus', time: '25:00' };
let islandBounds = null;  // { left, top, right, bottom } in window-relative CSS px, from renderer

function getTargetDisplay() {
  const displays = screen.getAllDisplays();
  const savedId = store.get('selectedDisplayId');
  if (savedId) {
    const found = displays.find(d => d.id === savedId);
    if (found) return found;
  }
  return screen.getPrimaryDisplay();
}

function setDisplay(displayId) {
  const displays = screen.getAllDisplays();
  const target = displays.find(d => d.id === displayId) || screen.getPrimaryDisplay();
  store.set('selectedDisplayId', target.id);
  if (win && !win.isDestroyed()) {
    const x = Math.floor(target.bounds.x + target.bounds.width / 2 - OVERLAY_WIDTH / 2);
    const y = target.bounds.y;
    win.setBounds({ x, y, width: OVERLAY_WIDTH, height: OVERLAY_HEIGHT });
  }
  updateTray();
}

function toggleNotchVisibility() {
  if (!win || win.isDestroyed()) return;
  isNotchVisible = !isNotchVisible;
  if (isNotchVisible) {
    win.show();
    win.setAlwaysOnTop(true, 'screen-saver');
  } else {
    win.hide();
  }
  updateTray();
}

function updateTray() {
  if (!tray || tray.isDestroyed()) return;
  tray.setToolTip(`Pomodoro Island • ${currentStatus.time} (${currentStatus.text})`);

  const displays = screen.getAllDisplays();
  const currentDisplayId = store.get('selectedDisplayId', screen.getPrimaryDisplay().id);

  const displaySubmenu = displays.map((disp, idx) => ({
    label: `Display ${idx + 1} (${disp.bounds.width}x${disp.bounds.height})${disp.id === screen.getPrimaryDisplay().id ? ' (Primary)' : ''}`,
    type: 'radio',
    checked: disp.id === currentDisplayId,
    click: () => setDisplay(disp.id),
  }));

  const contextMenu = Menu.buildFromTemplate([
    { label: `● ${currentStatus.text} — ${currentStatus.time}`, enabled: false },
    { type: 'separator' },
    {
      label: 'Toggle Expand / Collapse (Ctrl+Shift+E)',
      click: () => {
        if (win && !win.isDestroyed()) {
          if (!isNotchVisible) toggleNotchVisibility();
          win.webContents.send('toggle-expand');
        }
      },
    },
    {
      label: 'Pause / Resume (Ctrl+Shift+Space)',
      click: () => win?.webContents?.send('toggle-pause'),
    },
    {
      label: 'Skip Phase (Ctrl+Shift+S)',
      click: () => win?.webContents?.send('skip-phase'),
    },
    { type: 'separator' },
    {
      label: isNotchVisible ? 'Hide Notch' : 'Show Notch',
      click: toggleNotchVisibility,
    },
    {
      label: 'Select Display Monitor',
      submenu: displaySubmenu,
    },
    { type: 'separator' },
    {
      label: 'Quit Pomodoro Island',
      click: () => {
        app.isQuitting = true;
        app.quit();
      },
    },
  ]);
  tray.setContextMenu(contextMenu);
}

function createWindow() {
  const display = getTargetDisplay();
  const x = Math.floor(display.bounds.x + display.bounds.width / 2 - OVERLAY_WIDTH / 2);
  const y = display.bounds.y;

  const winInstance = new BrowserWindow({
    x,
    y,
    width: OVERLAY_WIDTH,
    height: OVERLAY_HEIGHT,
    transparent: true,
    frame: false,
    show: false,
    skipTaskbar: true, // taskbar icon handled via System Tray
    resizable: false,
    hasShadow: false,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
    },
  });

  winInstance.once('ready-to-show', () => {
    winInstance.show();
    winInstance.setAlwaysOnTop(true, 'screen-saver');
    winInstance.focus();
    console.log('[Main] ready-to-show: window shown and focused. Bounds:', winInstance.getBounds());
  });

  winInstance.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  // Start with click-through OFF so the initial compact view is visible and interactive
  winInstance.setIgnoreMouseEvents(false);

  return winInstance;
}

app.whenReady().then(() => {
  win = createWindow();

  win.webContents.on('did-fail-load', (e, code, desc, url) => {
    console.error('[Main WebContents] did-fail-load:', code, desc, url);
  });
  win.webContents.on('did-finish-load', async () => {
    console.log('[Main WebContents] did-finish-load successfully');
    try {
      const html = await win.webContents.executeJavaScript('document.getElementById("root")?.innerHTML');
      console.log('[Main WebContents] root rendered length:', html ? html.length : 0);
      console.log('[Main WebContents] root snippet:', html ? html.slice(0, 150) : 'null');
    } catch (err) {
      console.error('[Main WebContents] executeJavaScript error:', err);
    }
  });
  win.webContents.on('console-message', (e, level, msg, line, src) => {
    console.log(`[Renderer Log L${level}]: ${msg} (${src}:${line})`);
  });

  const indexPath = path.join(__dirname, '../dist/index.html');
  console.log('[Main] Loading index from:', indexPath);

  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(indexPath);
  }

  // ── Cursor polling ─────────────────────────────────
  // In idle state: broad hover-zone detection (same as before).
  // In non-idle state: precise hit-test against the island element bounds
  // so clicks outside the pill pass through to whatever is underneath.
  setInterval(() => {
    if (!win) return;

    const cursor = screen.getCursorScreenPoint();
    const bounds = win.getBounds();
    const relX = cursor.x - bounds.x;
    const relY = cursor.y - bounds.y;

    if (isIdle) {
      const inHoverZone =
        relX >= 0 &&
        relX <= bounds.width &&
        relY >= 0 &&
        relY <= HOVER_ZONE_HEIGHT;

      if (inHoverZone && !isOverIsland) {
        isOverIsland = true;
        win.setIgnoreMouseEvents(false);
        win.webContents.send('cursor-enter-island');
      }
      return;
    }

    // Non-idle: precise island-element hit-test
    if (!islandBounds) return;

    const pad = 8;
    const overIsland =
      relX >= islandBounds.left - pad &&
      relX <= islandBounds.right + pad &&
      relY >= islandBounds.top - pad &&
      relY <= islandBounds.bottom + pad;

    if (overIsland && !isOverIsland) {
      isOverIsland = true;
      win.setIgnoreMouseEvents(false);
    } else if (!overIsland && isOverIsland) {
      isOverIsland = false;
      // { forward: true } keeps mousemove flowing to the renderer so the
      // leave-to-idle timer still works, but clicks fall through to the browser.
      win.setIgnoreMouseEvents(true, { forward: true });
    }
  }, 30);

  // ── System Tray Setup ─────────────────────────────
  const iconPath = path.join(__dirname, '../src/assets/tray-icon.png');
  const trayIcon = nativeImage.createFromPath(iconPath);
  tray = new Tray(trayIcon);
  updateTray();

  tray.on('click', () => {
    if (!isNotchVisible) {
      toggleNotchVisibility();
    } else if (win && !win.isDestroyed()) {
      win.webContents.send('toggle-expand');
    }
  });

  // ── Hotkeys ────────────────────────────────────────
  globalShortcut.register('CommandOrControl+Shift+Space', () => {
    win.webContents.send('toggle-pause');
  });

  globalShortcut.register('CommandOrControl+Shift+S', () => {
    win.webContents.send('skip-phase');
  });

  globalShortcut.register('CommandOrControl+Shift+M', () => {
    win.webContents.send('media-toggle');
  });

  globalShortcut.register('CommandOrControl+Shift+E', () => {
    if (win && !win.isDestroyed()) {
      if (!isNotchVisible) toggleNotchVisibility();
      win.webContents.send('toggle-expand');
    }
  });

  // ── IPC handlers ───────────────────────────────────
  ipcMain.on('store-get', (event, key, defaultValue) => {
    event.returnValue = store.get(key, defaultValue);
  });

  ipcMain.on('store-set', (_event, key, value) => {
    store.set(key, value);
  });

  ipcMain.on('set-click-through', (_event, value) => {
    isIdle = value;
    if (value) {
      // Transitioning to idle: fully click-through, reset tracking
      isOverIsland = false;
      win.setIgnoreMouseEvents(true);
    }
    // Non-idle: polling handles setIgnoreMouseEvents based on cursor position
  });

  ipcMain.on('update-island-bounds', (_event, bounds) => {
    islandBounds = bounds;
  });

  ipcMain.handle('get-displays', () => {
    const displays = screen.getAllDisplays();
    const primaryId = screen.getPrimaryDisplay().id;
    const selectedId = store.get('selectedDisplayId', primaryId);
    return displays.map((d, i) => ({
      id: d.id,
      label: `Display ${i + 1} (${d.bounds.width}x${d.bounds.height})`,
      isPrimary: d.id === primaryId,
      isSelected: d.id === selectedId,
    }));
  });

  ipcMain.on('set-display', (_event, displayId) => {
    setDisplay(displayId);
  });

  ipcMain.on('toggle-visibility', () => {
    toggleNotchVisibility();
  });

  ipcMain.on('update-status', (_event, { text, time }) => {
    if (text) currentStatus.text = text;
    if (time) currentStatus.time = time;
    updateTray();
  });

  ipcMain.on('quit-app', () => {
    app.isQuitting = true;
    app.quit();
  });

  ipcMain.on('show-notification', (_event, { title, body }) => {
    if (!Notification.isSupported()) return;
    const notification = new Notification({ title, body, silent: true });
    notification.on('click', () => {
      if (win) win.focus();
    });
    notification.show();
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      win = createWindow();
      if (process.env.VITE_DEV_SERVER_URL) {
        win.loadURL(process.env.VITE_DEV_SERVER_URL);
      } else {
        win.loadFile(path.join(__dirname, '../dist/index.html'));
      }
    }
  });
});

app.on('before-quit', () => {
  if (tray && !tray.isDestroyed()) {
    tray.destroy();
  }
});

app.on('window-all-closed', () => {
  globalShortcut.unregisterAll();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
