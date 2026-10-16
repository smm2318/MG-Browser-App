const { app, BrowserWindow } = require('electron');
const path = require('node:path');
const fs = require('node:fs');

const appRoot = __dirname;
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
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
