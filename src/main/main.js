const { app, BrowserWindow, globalShortcut, ipcMain, Notification, screen, Menu, Tray, nativeImage } = require('electron');
const path = require('node:path');
const { exec } = require('node:child_process');
const Store = require('electron-store');

const store = new Store();

if (require('electron-squirrel-startup')) {
  app.quit();
}

// Ensure only a single instance of Pomodoro Island runs
const gotSingleInstanceLock = app.requestSingleInstanceLock();
if (!gotSingleInstanceLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });
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
let isModalOpen = false;   // when a dev feedback popover, drawer, or modal is open
let currentStatus = { text: 'Focus', time: '25:00' };
let islandBounds = null;  // { left, top, right, bottom } in window-relative CSS px, from renderer
let hoverDwellTimer = null; // Intent buffer timer for anti-swipe dwell delay
let includeInRecordings = store.get('includeInRecordings', true);
let includeInScreenshots = store.get('includeInScreenshots', true);

function updateContentProtection() {
  if (!win || win.isDestroyed()) return;
  // If either screen recording or screenshots are excluded by the user,
  // setContentProtection(true) sets WDA_EXCLUDEFROMCAPTURE in Windows
  // so the island is excluded from screen recordings, OBS, Discord, and screenshots.
  const shouldProtect = !includeInRecordings || !includeInScreenshots;
  try {
    win.setContentProtection(shouldProtect);
    console.log('[Main] Content protection set to:', shouldProtect ? 'EXCLUDED from capture' : 'INCLUDED in capture');
  } catch (err) {
    console.error('[Main] setContentProtection error:', err);
  }
}

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
  const topMargin = store.get('topMargin', 0);
  if (win && !win.isDestroyed()) {
    win.setBounds({
      x: target.bounds.x,
      y: target.bounds.y + topMargin,
      width: target.bounds.width,
      height: OVERLAY_HEIGHT,
    });
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
  const topMargin = store.get('topMargin', 0);
  const x = display.bounds.x;
  const y = display.bounds.y + topMargin;

  const winInstance = new BrowserWindow({
    x,
    y,
    width: display.bounds.width,
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
    updateContentProtection();
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
  win.webContents.on('console-message', (event) => {
    const level = event.level ?? 0;
    const msg = event.message ?? '';
    const src = event.sourceId ?? '';
    const line = event.lineNumber ?? '';
    console.log(`[Renderer Log L${level}]: ${msg} (${src}:${line})`);
  });

  const indexPath = path.join(__dirname, '../dist/index.html');
  console.log('[Main] Loading index from:', indexPath);

  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(indexPath);
  }

  screen.on('display-metrics-changed', () => {
    const target = getTargetDisplay();
    const topMargin = store.get('topMargin', 0);
    if (win && !win.isDestroyed()) {
      win.setBounds({
        x: target.bounds.x,
        y: target.bounds.y + topMargin,
        width: target.bounds.width,
        height: OVERLAY_HEIGHT,
      });
    }
  });

  // ── Cursor polling ─────────────────────────────────
  // In idle state: hover-zone detection with 180ms dwell delay to avoid accidental triggers
  // when moving mouse across browser tabs.
  // In non-idle state: precise hit-test against live island element bounds
  // so clicks outside the pill pass through cleanly to whatever is underneath.
  setInterval(() => {
    if (!win) return;

    const cursor = screen.getCursorScreenPoint();
    const bounds = win.getBounds();
    const relX = cursor.x - bounds.x;
    const relY = cursor.y - bounds.y;

    // While a modal or feedback popover/drawer is open, ensure mouse events are interactive
    if (isModalOpen) {
      if (hoverDwellTimer) {
        clearTimeout(hoverDwellTimer);
        hoverDwellTimer = null;
      }
      if (!isOverIsland) {
        isOverIsland = true;
        win.setIgnoreMouseEvents(false);
      }
      return;
    }

    // Determine if cursor is currently within the active island area (strictly the physical pill)
    let inIslandZone = false;
    if (islandBounds) {
      inIslandZone =
        relX >= islandBounds.left &&
        relX <= islandBounds.right &&
        relY >= (islandBounds.top || 0) &&
        relY <= islandBounds.bottom;
    } else {
      // Initial fallback before first bounds report
      const idleCorridorMin = (bounds.width - 184) / 2;
      const idleCorridorMax = (bounds.width + 184) / 2;
      inIslandZone =
        relX >= idleCorridorMin &&
        relX <= idleCorridorMax &&
        relY >= 0 &&
        relY <= (isIdle ? 32 : 52);
    }

    if (isIdle) {
      if (inIslandZone) {
        // Cursor entered hover zone: initiate dwell delay buffer (180ms)
        if (!isOverIsland && !hoverDwellTimer) {
          hoverDwellTimer = setTimeout(() => {
            hoverDwellTimer = null;
            if (!win || win.isDestroyed()) return;
            isOverIsland = true;
            win.setIgnoreMouseEvents(false);
            win.webContents.send('cursor-enter-island');
          }, 180);
        }
      } else {
        // Cursor left hover zone: cancel any pending dwell timer
        if (hoverDwellTimer) {
          clearTimeout(hoverDwellTimer);
          hoverDwellTimer = null;
        }
        if (isOverIsland) {
          isOverIsland = false;
          win.setIgnoreMouseEvents(true, { forward: true });
        }
      }
      return;
    }

    // Non-idle: precise island-element hit-test
    if (inIslandZone && !isOverIsland) {
      isOverIsland = true;
      win.setIgnoreMouseEvents(false);
    } else if (!inIslandZone && isOverIsland) {
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

  // ── Collision-Safe Hotkeys ─────────────────────────
  // Primary safe shortcuts using Ctrl+Alt (avoids hijacking Ctrl+Shift+S Save As)
  globalShortcut.register('CommandOrControl+Alt+P', () => {
    win?.webContents?.send('toggle-pause');
  });

  globalShortcut.register('CommandOrControl+Alt+S', () => {
    win?.webContents?.send('skip-phase');
  });

  globalShortcut.register('CommandOrControl+Alt+M', () => {
    win?.webContents?.send('media-toggle');
  });

  globalShortcut.register('CommandOrControl+Alt+I', () => {
    if (win && !win.isDestroyed()) {
      if (!isNotchVisible) toggleNotchVisibility();
      win.webContents.send('toggle-expand');
    }
  });

  // Legacy fallback shortcuts for backward compatibility
  globalShortcut.register('CommandOrControl+Shift+Space', () => {
    win?.webContents?.send('toggle-pause');
  });

  globalShortcut.register('CommandOrControl+Shift+E', () => {
    if (win && !win.isDestroyed()) {
      if (!isNotchVisible) toggleNotchVisibility();
      win.webContents.send('toggle-expand');
    }
  });

  // ── IPC handlers ───────────────────────────────────
  ipcMain.handle('get-login-item', () => {
    return app.getLoginItemSettings().openAtLogin;
  });

  ipcMain.on('set-login-item', (_event, openAtLogin) => {
    app.setLoginItemSettings({ openAtLogin });
    store.set('openAtLogin', openAtLogin);
  });

  ipcMain.on('set-top-margin', (_event, margin) => {
    const val = Math.max(0, Math.min(24, parseInt(margin, 10) || 0));
    store.set('topMargin', val);
    const target = getTargetDisplay();
    if (win && !win.isDestroyed()) {
      win.setBounds({
        x: target.bounds.x,
        y: target.bounds.y + val,
        width: target.bounds.width,
        height: OVERLAY_HEIGHT,
      });
    }
  });

  ipcMain.on('store-get', (event, key, defaultValue) => {
    event.returnValue = store.get(key, defaultValue);
  });

  ipcMain.on('store-set', (_event, key, value) => {
    store.set(key, value);
  });

  ipcMain.on('set-click-through', (_event, value) => {
    isIdle = value;
    if (hoverDwellTimer) {
      clearTimeout(hoverDwellTimer);
      hoverDwellTimer = null;
    }
    if (value) {
      // Transitioning to idle: click-through on transparent, track mousemove
      isOverIsland = false;
      win.setIgnoreMouseEvents(true, { forward: true });
    }
    // Non-idle: polling handles setIgnoreMouseEvents based on cursor position
  });

  ipcMain.on('set-modal-open', (_event, value) => {
    isModalOpen = Boolean(value);
    if (win && !win.isDestroyed()) {
      if (isModalOpen) {
        isOverIsland = true;
        win.setIgnoreMouseEvents(false);
      }
    }
  });

  ipcMain.on('update-island-bounds', (_event, bounds) => {
    islandBounds = bounds;
  });

  ipcMain.on('set-capture-visibility', (_event, { type, value }) => {
    if (type === 'recordings') {
      includeInRecordings = Boolean(value);
      store.set('includeInRecordings', includeInRecordings);
    } else if (type === 'screenshots') {
      includeInScreenshots = Boolean(value);
      store.set('includeInScreenshots', includeInScreenshots);
    } else if (type === 'both') {
      includeInRecordings = Boolean(value);
      includeInScreenshots = Boolean(value);
      store.set('includeInRecordings', includeInRecordings);
      store.set('includeInScreenshots', includeInScreenshots);
    }
    updateContentProtection();
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

  // ── Spotify (Web & Desktop) & System Media Detection ─────────────────
  const MEDIA_QUERY_SCRIPT = `
$ProgressPreference = 'SilentlyContinue'
Add-Type -AssemblyName System.Runtime.WindowsRuntime
$asTaskGeneric = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name.StartsWith('IAsyncOperation') })[0]

function Await($op, $t) {
  $asTask = $asTaskGeneric.MakeGenericMethod($t)
  $netTask = $asTask.Invoke($null, @($op))
  $netTask.Wait(-1) | Out-Null
  return $netTask.Result
}

try {
  [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager, Windows.Media.Control, ContentType = WindowsRuntime] | Out-Null
  $mgrOp = [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager]::RequestAsync()
  $mgr = Await $mgrOp ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager])
  $session = $mgr.GetCurrentSession()
  $isPlaying = $false
  if ($session) {
    $playback = $session.GetPlaybackInfo()
    $isPlaying = ($playback.PlaybackStatus -eq 4 -or $playback.PlaybackStatus -eq 'Playing')
  }

  if (-not $isPlaying) {
    $sessions = $mgr.GetSessions()
    foreach ($s in $sessions) {
      $pb = $s.GetPlaybackInfo()
      if ($pb.PlaybackStatus -eq 4 -or $pb.PlaybackStatus -eq 'Playing') {
        $session = $s
        $isPlaying = $true
        break
      }
    }
  }

  if ($session) {
    $propOp = $session.TryGetMediaPropertiesAsync()
    $props = Await $propOp ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionMediaProperties])
    if ($props.Title -or $props.Artist) {
      [PSCustomObject]@{
        isPlaying = $isPlaying
        title     = $props.Title
        artist    = $props.Artist
        app       = $session.SourceAppUserModelId
      } | ConvertTo-Json -Compress
      exit 0
    }
  }
} catch {}

try {
  $p = Get-Process spotify -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowTitle -and $_.MainWindowTitle -ne 'Spotify' -and $_.MainWindowTitle -ne 'Spotify Free' -and $_.MainWindowTitle -ne 'Spotify Premium' }
  if ($p) {
    $raw = $p[0].MainWindowTitle
    if ($raw -match '^(.*?)\\s+-\\s+(.*)$') {
      [PSCustomObject]@{
        isPlaying = $true
        title     = $matches[2].Trim()
        artist    = $matches[1].Trim()
        app       = 'SpotifyDesktop'
      } | ConvertTo-Json -Compress
      exit 0
    }
  }
} catch {}

Write-Output '{}'
`;

  const artworkCache = new Map();

  async function getArtwork(artist, title) {
    if (!artist && !title) return '';
    const key = `${artist || ''} - ${title || ''}`.toLowerCase().trim();
    if (artworkCache.has(key)) return artworkCache.get(key);

    // Clean title for higher iTunes match rate (strip (Official Video), [HQ], feat, etc.)
    const cleanTitle = (title || '')
      .replace(/[\(\[\{].*?[\)\]\}]/g, '')
      .replace(/ft\..*|feat\..*/i, '')
      .replace(/official\s+audio|official\s+video|official\s+music\s+video/gi, '')
      .trim();
    const cleanArtist = (artist || '').replace(/,\s*.*/, '').trim();

    try {
      const searchTerm = `${cleanArtist} ${cleanTitle}`.trim() || `${artist} ${title}`.trim();
      const query = encodeURIComponent(searchTerm);
      const res = await fetch(`https://itunes.apple.com/search?term=${query}&entity=song&limit=1`, {
        signal: AbortSignal.timeout(2500),
      });
      if (res.ok) {
        const json = await res.json();
        const rawUrl = json?.results?.[0]?.artworkUrl100;
        if (rawUrl) {
          const hiResUrl = rawUrl.replace('100x100bb', '300x300bb');
          artworkCache.set(key, hiResUrl);
          return hiResUrl;
        }
      }
    } catch {}
    artworkCache.set(key, '');
    return '';
  }

  const MEDIA_QUERY_B64 = Buffer.from(MEDIA_QUERY_SCRIPT, 'utf16le').toString('base64');
  let lastMediaState = { isPlaying: false, title: '', artist: '', artwork: '', source: 'none' };
  let isMediaPolling = false;

  function pollMedia() {
    if (isMediaPolling) return;
    isMediaPolling = true;

    exec(`powershell -NoProfile -NonInteractive -EncodedCommand ${MEDIA_QUERY_B64}`, { timeout: 3500, windowsHide: true }, async (err, stdout) => {
      isMediaPolling = false;
      if (err) {
        if (lastMediaState.isPlaying || lastMediaState.title) {
          lastMediaState = { isPlaying: false, title: '', artist: '', artwork: '', source: 'none' };
          if (win && !win.isDestroyed()) {
            win.webContents.send('now-playing-update', lastMediaState);
          }
        }
        return;
      }
      try {
        const raw = (stdout || '').trim();
        const data = JSON.parse(raw || '{}');
        const isPlaying = Boolean(data && data.title && data.isPlaying);

        if (isPlaying) {
          const title = data.title;
          const artist = data.artist || '';
          const source = data.app || 'media';
          const artwork = await getArtwork(artist, title);

          const newState = {
            isPlaying: true,
            title,
            artist,
            artwork: artwork || '',
            source,
          };

          if (
            newState.title !== lastMediaState.title ||
            newState.artist !== lastMediaState.artist ||
            newState.isPlaying !== lastMediaState.isPlaying ||
            newState.artwork !== lastMediaState.artwork
          ) {
            lastMediaState = newState;
            if (win && !win.isDestroyed()) {
              win.webContents.send('now-playing-update', lastMediaState);
            }
          }
        } else {
          // When webpage closed, paused, or stopped: immediately clear song from island
          if (lastMediaState.isPlaying || lastMediaState.title) {
            lastMediaState = { isPlaying: false, title: '', artist: '', artwork: '', source: 'none' };
            if (win && !win.isDestroyed()) {
              win.webContents.send('now-playing-update', lastMediaState);
            }
          }
        }
      } catch {
        if (lastMediaState.isPlaying || lastMediaState.title) {
          lastMediaState = { isPlaying: false, title: '', artist: '', artwork: '', source: 'none' };
          if (win && !win.isDestroyed()) {
            win.webContents.send('now-playing-update', lastMediaState);
          }
        }
      }
    });
  }

  function sendMediaKey(action) {
    // 0xB3 = 179 (Play/Pause), 0xB0 = 176 (Next), 0xB1 = 177 (Prev)
    const vk = action === 'next' ? '0xB0' : action === 'prev' ? '0xB1' : '0xB3';
    const ps = `powershell -NoProfile -NonInteractive -Command "$w = Add-Type -MemberDefinition '[DllImport(\\\"user32.dll\\\")] public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, System.UIntPtr dwExtraInfo);' -Name 'K' -Namespace 'U' -PassThru; $w::keybd_event(${vk}, 0, 0, [System.UIntPtr]::Zero); $w::keybd_event(${vk}, 0, 2, [System.UIntPtr]::Zero)"`;
    exec(ps, { timeout: 2000, windowsHide: true });
  }

  // Start media polling loop every 1.5s
  setInterval(pollMedia, 1500);
  pollMedia();

  ipcMain.handle('get-now-playing', () => lastMediaState);

  ipcMain.on('media-control', (_event, action) => {
    sendMediaKey(action);
    setTimeout(pollMedia, 350);
  });

  // ── Windows Media Volume Controller (Core Audio PowerShell) ─────────
  let currentMediaVolume = 0.70;
  let lastVolumeExecTime = 0;
  let volumeThrottleTimer = null;
  let isSettingVolume = false;
  let latestQueuedVolume = null;

  function executeVolumeChange(vol) {
    if (process.platform !== 'win32') {
      isSettingVolume = false;
      return;
    }

    isSettingVolume = true;
    lastVolumeExecTime = Date.now();
    const execVol = vol;
    const volStr = execVol.toFixed(3);

    const psScript = `
$ProgressPreference = 'SilentlyContinue'
$def = @'
using System.Runtime.InteropServices;
[Guid("5CDF2C82-841E-4546-9722-0CF74078229A"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
public interface IAudioEndpointVolume {
    int f(); int g(); int h(); int j();
    int SetMasterVolumeLevelScalar(float fLevel, System.Guid pguidEventContext);
    int k();
    int GetMasterVolumeLevelScalar(out float pfLevel);
}
[Guid("D666063F-1587-4E43-81F1-B948E807363F"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
public interface IMMDevice {
    int Activate(ref System.Guid id, int clsCtx, int activationParams, out IAudioEndpointVolume aev);
}
[Guid("A95664D2-9614-4F35-A746-DE8DB63617E6"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
public interface IMMDeviceEnumerator {
    int f();
    int GetDefaultAudioEndpoint(int dataFlow, int role, out IMMDevice endpoint);
}
[ComImport, Guid("BCDE0395-E52F-467C-8E3D-C4579291692E")] public class MMDeviceEnumeratorComObject { }
public class AudioVol {
    public static void SetVolume(float vol) {
        try {
            var enumerator = new MMDeviceEnumeratorComObject() as IMMDeviceEnumerator;
            IMMDevice dev = null;
            enumerator.GetDefaultAudioEndpoint(0, 1, out dev);
            var epId = new System.Guid("5CDF2C82-841E-4546-9722-0CF74078229A");
            IAudioEndpointVolume ep = null;
            dev.Activate(ref epId, 23, 0, out ep);
            ep.SetMasterVolumeLevelScalar(vol, System.Guid.Empty);
        } catch {}
    }
}
'@
Add-Type -TypeDefinition $def
[AudioVol]::SetVolume(${volStr})
`;
    const b64 = Buffer.from(psScript, 'utf16le').toString('base64');
    exec(`powershell -NoProfile -NonInteractive -EncodedCommand ${b64}`, { timeout: 2500, windowsHide: true }, (_err) => {
      isSettingVolume = false;
      if (latestQueuedVolume !== null && Math.abs(latestQueuedVolume - execVol) > 0.001) {
        const remaining = Math.max(0, 60 - (Date.now() - lastVolumeExecTime));
        if (remaining > 0) {
          if (!volumeThrottleTimer) {
            volumeThrottleTimer = setTimeout(() => {
              volumeThrottleTimer = null;
              if (latestQueuedVolume !== null && !isSettingVolume) {
                const next = latestQueuedVolume;
                executeVolumeChange(next);
              }
            }, remaining);
          }
        } else {
          const next = latestQueuedVolume;
          executeVolumeChange(next);
        }
      }
    });
  }

  function setSystemVolume(vol) {
    const targetVol = Math.max(0, Math.min(1, Number(vol) || 0));
    latestQueuedVolume = targetVol;

    const now = Date.now();
    const elapsed = now - lastVolumeExecTime;

    if (isSettingVolume) {
      return;
    }

    if (elapsed >= 60) {
      executeVolumeChange(targetVol);
    } else if (!volumeThrottleTimer) {
      volumeThrottleTimer = setTimeout(() => {
        volumeThrottleTimer = null;
        if (latestQueuedVolume !== null && !isSettingVolume) {
          const nextVol = latestQueuedVolume;
          executeVolumeChange(nextVol);
        }
      }, 60 - elapsed);
    }
  }

  ipcMain.handle('get-media-volume', () => currentMediaVolume);

  ipcMain.on('set-media-volume', (_event, vol) => {
    const numericVol = Number(vol);
    if (!Number.isFinite(numericVol)) return;
    const clamped = Math.max(0, Math.min(1, numericVol));
    currentMediaVolume = clamped;
    setSystemVolume(clamped);
    if (win && !win.isDestroyed()) {
      win.webContents.send('media-volume-update', clamped);
    }
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
