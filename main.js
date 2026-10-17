const { app, BrowserWindow, ipcMain, session, shell } = require('electron');
const path = require('node:path');
const fs = require('node:fs');

const appRoot = __dirname;
const downloads = new Map();
let nextDownloadId = 1;

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
    if (/^https?:\/\//i.test(url)) {
      createWindow(url);
    }
    return { action: 'deny' };
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
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
