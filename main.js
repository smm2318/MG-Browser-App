const { app, BrowserWindow, ipcMain, session, shell, Menu, clipboard, safeStorage } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('node:path');
const fs = require('node:fs');

const appRoot = __dirname;
const downloads = new Map();
let nextDownloadId = 1;

const passwordFile = () => path.join(app.getPath('userData'), 'mg-passwords.json');
function readPasswords() {
  try {
    const raw = fs.readFileSync(passwordFile(), 'utf8');
    if (!safeStorage.isEncryptionAvailable()) throw new Error('Secure password storage is unavailable on this computer.');
    return JSON.parse(safeStorage.decryptString(Buffer.from(raw, 'base64')));
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
}
function writePasswords(entries) {
  if (!safeStorage.isEncryptionAvailable()) throw new Error('Secure password storage is unavailable on this computer.');
  const encrypted = safeStorage.encryptString(JSON.stringify(entries)).toString('base64');
  fs.writeFileSync(passwordFile(), encrypted, { mode: 0o600 });
}
ipcMain.handle('passwords:list', () => readPasswords().map(({ id, site, username, createdAt }) => ({ id, site, username, createdAt })));
ipcMain.handle('passwords:save', (_event, entry) => {
  if (!entry || typeof entry.site !== 'string' || typeof entry.username !== 'string' || typeof entry.password !== 'string' || !entry.site.trim() || !entry.password) {
    throw new Error('Website and password are required.');
  }
  const entries = readPasswords();
  const normalizedSite = entry.site.trim().slice(0, 2048);
  const username = entry.username.trim().slice(0, 512);
  const password = entry.password.slice(0, 4096);
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  entries.push({ id, site: normalizedSite, username, password, createdAt: new Date().toISOString() });
  writePasswords(entries);
  return { id };
});
ipcMain.handle('passwords:get', (_event, id) => {
  const entry = readPasswords().find(item => item.id === String(id));
  if (!entry) return null;
  return { site: entry.site, username: entry.username, password: entry.password };
});
ipcMain.handle('passwords:delete', (_event, id) => {
  const entries = readPasswords();
  const next = entries.filter(item => item.id !== String(id));
  if (next.length === entries.length) return false;
  writePasswords(next);
  return true;
});


function publicDownloads() {
  return [...downloads.values()].map(({ item, ...record }) => ({ ...record }));
}
function broadcastDownloads() {
  const snapshot = publicDownloads();
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) win.webContents.send('downloads:changed', snapshot);
  }
}
ipcMain.handle('downloads:list', () => publicDownloads());
ipcMain.handle('downloads:cancel', (_event, id) => {
  const record = downloads.get(Number(id));
  if (record && record.state === 'progressing') record.item.cancel();
});
ipcMain.handle('downloads:open-file', async (_event, id) => {
  const record = downloads.get(Number(id));
  if (!record || record.state !== 'completed') return;
  return shell.openPath(record.path);
});
ipcMain.handle('downloads:show-in-folder', (_event, id) => {
  const record = downloads.get(Number(id));
  if (record && record.state === 'completed') shell.showItemInFolder(record.path);
});
const iconDir = path.join(appRoot, 'build', 'icons');

function appIcon() {
  const preferred = process.platform === 'win32' ? path.join(iconDir, 'icon.ico') : path.join(iconDir, 'icon.png');
  return fs.existsSync(preferred) ? preferred : path.join(appRoot, 'images', 'mg-browser-icon.svg');
}

function createWindow(startUrl) {
  const win = new BrowserWindow({
    width: 1440,
    height: 940,
    minWidth: 760,
    minHeight: 540,
    title: 'MG Browser',
    backgroundColor: '#101820',
    autoHideMenuBar: process.platform !== 'darwin',
    icon: appIcon(),
    webPreferences: {
      preload: path.join(appRoot, 'preload.js'),
      webviewTag: true,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  const query = startUrl ? { url: startUrl } : {};
  win.loadFile(path.join(appRoot, 'browser.html'), { query });
  return win;
}

app.setName('MG Browser');
if (process.platform === 'win32') app.setAppUserModelId('com.mgcompany.mgbrowser');

app.on('web-contents-created', (_event, contents) => {
  contents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) createWindow(url);
    return { action: 'deny' };
  });

  // Native right-click menu for pages opened inside the browser.
  contents.on('context-menu', (_event, params) => {
    if (contents.getType() !== 'webview') return;
    const template = [];
    const linkURL = params.linkURL || '';
    const srcURL = params.srcURL || '';
    const isImage = params.mediaType === 'image' && /^https?:\/\//i.test(srcURL);
    const isLink = /^https?:\/\//i.test(linkURL);

    if (params.isEditable) {
      template.push(
        { role: 'undo', label: 'Undo' }, { role: 'redo', label: 'Redo' },
        { type: 'separator' }, { role: 'cut', label: 'Cut' },
        { role: 'copy', label: 'Copy' }, { role: 'paste', label: 'Paste' },
        { role: 'selectAll', label: 'Select all' }
      );
    } else if (params.selectionText) {
      template.push({ role: 'copy', label: 'Copy selected text' });
    }

    if (isImage) {
      if (template.length) template.push({ type: 'separator' });
      template.push(
        { label: 'Download image', click: () => contents.downloadURL(srcURL) },
        { label: 'Copy image address', click: () => clipboard.writeText(srcURL) },
        { label: 'Open image in new window', click: () => createWindow(srcURL) }
      );
    }
    if (isLink) {
      if (template.length) template.push({ type: 'separator' });
      template.push(
        { label: 'Open link in new window', click: () => createWindow(linkURL) },
        { label: 'Download linked file', click: () => contents.downloadURL(linkURL) },
        { label: 'Copy link address', click: () => clipboard.writeText(linkURL) }
      );
    }
    if (!params.isEditable && !isImage && !isLink && !params.selectionText) {
      template.push(
        { label: 'Back', enabled: contents.canGoBack(), click: () => { if (contents.canGoBack()) contents.goBack(); } },
        { label: 'Reload', click: () => contents.reload() }
      );
    }
    if (template.length) template.push({ type: 'separator' });
    template.push({
      label: 'Inspect',
      click: () => {
        try {
          contents.inspectElement(params.x, params.y);
          const owner = BrowserWindow.fromWebContents(contents);
          if (owner && owner.isMinimized()) owner.restore();
          if (owner) owner.focus();
        } catch (error) {
          console.error('Unable to inspect element:', error);
        }
      }
    });
    Menu.buildFromTemplate(template).popup({ window: BrowserWindow.fromWebContents(contents) || undefined });
  });
});

app.whenReady().then(() => {
  session.defaultSession.on('will-download', (_event, item) => {
    const id = nextDownloadId++;
    const record = {
      id,
      item,
      filename: item.getFilename(),
      path: item.getSavePath(),
      state: 'progressing',
      receivedBytes: 0,
      totalBytes: item.getTotalBytes()
    };
    downloads.set(id, record);
    item.on('updated', (_event, state) => {
      record.filename = item.getFilename();
      record.path = item.getSavePath();
      record.receivedBytes = item.getReceivedBytes();
      record.totalBytes = item.getTotalBytes();
      if (state === 'interrupted') record.state = 'interrupted';
      else if (state === 'progressing') record.state = 'progressing';
      broadcastDownloads();
    });
    item.once('done', (_event, state) => {
      record.filename = item.getFilename();
      record.path = item.getSavePath();
      record.receivedBytes = item.getReceivedBytes();
      record.totalBytes = item.getTotalBytes();
      record.state = state === 'completed' ? 'completed' : state === 'cancelled' ? 'cancelled' : 'interrupted';
      broadcastDownloads();
    });
    broadcastDownloads();
  });
  createWindow();

  // Automatic updates are enabled for installed Windows builds only.
  if (app.isPackaged && process.platform === 'win32') {
    autoUpdater.autoDownload = true;
    autoUpdater.autoInstallOnAppQuit = true;
    autoUpdater.on('error', (error) => console.error('MG Browser update error:', error));
    autoUpdater.checkForUpdatesAndNotify().catch((error) => {
      console.error('MG Browser update check failed:', error);
    });
    setInterval(() => {
      autoUpdater.checkForUpdatesAndNotify().catch((error) => {
        console.error('MG Browser update check failed:', error);
      });
    }, 30 * 60 * 1000);
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
