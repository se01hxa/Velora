const { contextBridge, ipcRenderer } = require('electron');

// Only narrowly scoped desktop actions cross the isolated renderer boundary.
contextBridge.exposeInMainWorld('desktop', Object.freeze({
  saveProject: (content) => ipcRenderer.invoke('luma:save-project', content),
  openProject: () => ipcRenderer.invoke('luma:open-project'),
  exportFiles: (files) => ipcRenderer.invoke('luma:export-files', files),
  saveBinary: (name, data) => ipcRenderer.invoke('luma:save-binary', name, data),
  getAgentStatus: () => ipcRenderer.invoke('luma:agent-status'),
  setAgentOptions: (options) => ipcRenderer.invoke('luma:agent-options', options),
  agentReady: () => ipcRenderer.invoke('luma:agent-ready'),
  onAgentRequest: (handler) => {
    if (typeof handler !== 'function') throw new TypeError('Agent request listener must be a function.');
    const listener = (_event, request) => handler(request);
    ipcRenderer.on('luma:agent-request', listener);
    return () => ipcRenderer.removeListener('luma:agent-request', listener);
  },
  replyAgent: (reply) => ipcRenderer.send('luma:agent-reply', reply),
  onAgentStatus: (handler) => {
    if (typeof handler !== 'function') throw new TypeError('Agent status listener must be a function.');
    const listener = (_event, status) => handler(status);
    ipcRenderer.on('luma:agent-status', listener);
    return () => ipcRenderer.removeListener('luma:agent-status', listener);
  },
  minimize: () => ipcRenderer.send('luma:window-minimize'),
  maximize: () => ipcRenderer.send('luma:window-maximize'),
  close: () => ipcRenderer.send('luma:window-close'),
}));
