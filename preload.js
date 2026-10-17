const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('mgDownloads', {
  list: () => ipcRenderer.invoke('downloads:list'),
  cancel: (id) => ipcRenderer.invoke('downloads:cancel', id),
  openFile: (id) => ipcRenderer.invoke('downloads:open-file', id),
  showInFolder: (id) => ipcRenderer.invoke('downloads:show-in-folder', id),
  onChanged: (callback) => {
    if (typeof callback !== 'function') return;
    ipcRenderer.on('downloads:changed', (_event, items) => callback(items));
  }
});
