const { app, BrowserWindow, dialog, ipcMain, session } = require('electron');
const fs = require('node:fs/promises');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { randomUUID } = require('node:crypto');
const MCP_MODE = (process.argv || []).includes('--mcp');
// Retain the original profile so the Velora rename preserves all local projects and MCP discovery.
app.setName('Velora');
app.setPath('userData', path.join(app.getPath('appData'), 'luma-studio'));
// A separate profile is useful for isolated testing and independent design workspaces.
if (process.env.LUMA_PROFILE_DIR) app.setPath('userData', path.resolve(process.env.LUMA_PROFILE_DIR));

const PROJECT_LIMIT = 30_000_000;
const FILE_LIMIT = 30_000_000;
const EXPORT_LIMIT = 60_000_000;
const EXPORT_FILE_COUNT_LIMIT = 2500;
const BINARY_LIMIT = 80_000_000;
let mainWindow = null;
let dialogBusy = false;
let agentBridge = null;
let rendererAgentReady = false;
const agentRequests = new Map();
const productionPage = path.join(__dirname, '..', 'dist', 'index.html');
let developmentUrl = null;

// Development may load only an explicit loopback address. Installed builds always load local files.
if (!app.isPackaged && process.env.LUMA_DEV_URL) {
  const candidate = new URL(process.env.LUMA_DEV_URL);
  if (['http:', 'https:'].includes(candidate.protocol) && ['localhost', '127.0.0.1', '[::1]'].includes(candidate.hostname)) {
    developmentUrl = candidate;
  } else {
    throw new Error('LUMA_DEV_URL must use a local loopback address.');
  }
}

function trustedLocation(value) {
  try {
    const location = new URL(value);
    if (developmentUrl) return location.origin === developmentUrl.origin;
    return location.protocol === 'file:' && location.pathname === new URL(pathToFileURL(productionPage).href).pathname;
  } catch {
    return false;
  }
}

function assertSender(event) {
  if (!mainWindow || mainWindow.isDestroyed() || event.sender !== mainWindow.webContents ||
      event.senderFrame !== mainWindow.webContents.mainFrame || !trustedLocation(event.senderFrame.url)) {
    throw new Error('This request is not permitted.');
  }
}

function agentLaunchConfig() {
  const command = process.execPath;
  // Electron's bundled Node mode preserves Windows stdio handles; a GUI-mode --mcp launch does not.
  const args = [path.join(app.getAppPath(), 'mcp', 'server.cjs')];
  const env = { ELECTRON_RUN_AS_NODE: '1', LUMA_BRIDGE_FILE: process.env.LUMA_BRIDGE_FILE || path.join(app.getPath('userData'), 'mcp-bridge.json') };
  const entry = { command, args, env };
  return {
    claude: JSON.stringify({ mcpServers: { 'luma-studio': entry } }, null, 2),
    claudeCode: JSON.stringify({ mcpServers: { 'luma-studio': { type: 'stdio', ...entry } } }, null, 2),
    codex: `[mcp_servers.luma-studio]\ncommand = ${JSON.stringify(command)}\nargs = ${JSON.stringify(args)}\nstartup_timeout_sec = 20\ntool_timeout_sec = 60\n\n[mcp_servers.luma-studio.env]\nELECTRON_RUN_AS_NODE = "1"\nLUMA_BRIDGE_FILE = ${JSON.stringify(env.LUMA_BRIDGE_FILE)}\n`,
    antigravity: JSON.stringify({ mcpServers: { 'luma-studio': entry } }, null, 2),
  };
}

function agentStatus() {
  return { ...(agentBridge?.status() || { enabled: false, readOnly: false, clients: 0 }), config: agentLaunchConfig() };
}

function broadcastAgentStatus(status) {
  if (mainWindow && !mainWindow.isDestroyed() && !mainWindow.webContents.isDestroyed()) {
    try { mainWindow.webContents.send('luma:agent-status', { ...status, config: agentLaunchConfig() }); } catch { /* The window may close during a status change. */ }
  }
}

function rejectAgentRequests(message) {
  rendererAgentReady = false;
  for (const pending of agentRequests.values()) { clearTimeout(pending.timer); pending.reject(new Error(message)); }
  agentRequests.clear();
}

async function dispatchAgentCommand(command, args) {
  if (!mainWindow || mainWindow.isDestroyed() || !rendererAgentReady) throw new Error('DOCUMENT_NOT_READY: Open Velora and wait for the design document to load.');
  return new Promise((resolve, reject) => {
    const requestId = randomUUID();
    const timer = setTimeout(() => { agentRequests.delete(requestId); reject(new Error('RENDERER_TIMEOUT: Inspect the document before retrying edits.')); }, 40_000);
    agentRequests.set(requestId, { resolve, reject, timer });
    try { mainWindow.webContents.send('luma:agent-request', { requestId, command, args }); }
    catch { clearTimeout(timer); agentRequests.delete(requestId); reject(new Error('APP_CLOSED: The design window closed.')); }
  });
}

function limitedText(value, limit = FILE_LIMIT) {
  if (typeof value !== 'string' || Buffer.byteLength(value, 'utf8') > limit) throw new Error('Invalid or oversized file.');
  return value;
}

function projectContent(value) {
  limitedText(value, PROJECT_LIMIT);
  const parsed = JSON.parse(value);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Invalid project document.');
  return value;
}

function safeRelativeName(value) {
  if (typeof value !== 'string' || !value || value.length > 240 || /[\x00-\x1f<>:"|?*]/.test(value) || path.isAbsolute(value)) {
    throw new Error('Invalid export filename.');
  }
  const normalized = value.replace(/\\/g, '/');
  const segments = normalized.split('/');
  if (segments.some((segment) => !segment || segment === '.' || segment === '..' || segment.length > 120 ||
      /[. ]$/.test(segment) || /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(?:\.|$)/i.test(segment))) {
    throw new Error('Invalid export filename.');
  }
  return segments.join(path.sep);
}

function validateExportFiles(files) {
  if (!Array.isArray(files) || !files.length || files.length > EXPORT_FILE_COUNT_LIMIT) throw new Error('Invalid export bundle.');
  let size = 0;
  const names = new Set();
  return files.map((file) => {
    if (!file || typeof file !== 'object') throw new Error('Invalid export entry.');
    const name = safeRelativeName(file.name);
    const content = limitedText(file.content);
    size += Buffer.byteLength(content, 'utf8');
    if (size > EXPORT_LIMIT || names.has(name.toLowerCase())) throw new Error('Oversized or duplicate export bundle.');
    names.add(name.toLowerCase());
    return { name, content };
  });
}

function validateBinary(name, data) {
  const filename = safeRelativeName(name);
  if (filename.includes(path.sep) || !Array.isArray(data) || !data.length || data.length > BINARY_LIMIT ||
      !data.every((value) => Number.isInteger(value) && value >= 0 && value <= 255)) {
    throw new Error('Invalid binary export.');
  }
  return filename;
}

async function atomicWrite(destination, content) {
  const temporary = path.join(path.dirname(destination), `.luma-${randomUUID()}.tmp`);
  let handle;
  try {
    handle = await fs.open(temporary, 'wx');
    await handle.writeFile(content);
    await handle.sync();
    await handle.close();
    handle = null;
    await fs.rename(temporary, destination);
  } finally {
    if (handle) await handle.close().catch(() => {});
    await fs.unlink(temporary).catch(() => {});
  }
}

async function safeExportDestination(root, relativeName) {
  const destination = path.resolve(root, relativeName);
  const relation = path.relative(root, destination);
  if (!relation || relation.startsWith(`..${path.sep}`) || relation === '..' || path.isAbsolute(relation)) {
    throw new Error('Export path leaves the selected folder.');
  }
  let parent = root;
  for (const segment of path.dirname(relativeName).split(path.sep).filter((part) => part && part !== '.')) {
    parent = path.join(parent, segment);
    try {
      const info = await fs.lstat(parent);
      if (info.isSymbolicLink() || !info.isDirectory()) throw new Error('Export folders must be ordinary directories.');
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      await fs.mkdir(parent);
    }
  }
  return destination;
}

async function withDialog(callback) {
  if (dialogBusy) return { ok: false };
  dialogBusy = true;
  try {
    return await callback();
  } finally {
    dialogBusy = false;
  }
}

function registerHandlers() {
  ipcMain.handle('luma:agent-status', (event) => { assertSender(event); return agentStatus(); });
  ipcMain.handle('luma:agent-options', async (event, options) => {
    assertSender(event);
    if (!agentBridge) throw new Error('MCP bridge is unavailable. Restart Velora.');
    await agentBridge.setOptions(options);
    return agentStatus();
  });
  ipcMain.handle('luma:agent-ready', (event) => { assertSender(event); rendererAgentReady = true; return agentStatus(); });
  ipcMain.on('luma:agent-reply', (event, payload) => {
    try {
      assertSender(event);
      if (!payload || typeof payload !== 'object' || typeof payload.requestId !== 'string' || typeof payload.ok !== 'boolean') return;
      const pending = agentRequests.get(payload.requestId);
      if (!pending) return;
      agentRequests.delete(payload.requestId);
      clearTimeout(pending.timer);
      if (payload.ok) pending.resolve(payload.result);
      else pending.reject(new Error(typeof payload.error === 'string' ? payload.error.slice(0, 1000) : 'RENDERER_ERROR: The command failed.'));
    } catch { /* Replies from unknown or navigated frames are ignored. */ }
  });
  const handle = (channel, callback) => ipcMain.handle(channel, async (event, ...args) => {
    assertSender(event);
    try {
      return await withDialog(() => callback(...args));
    } catch (error) {
      console.error(`[${channel}]`, error.message);
      if (mainWindow && !mainWindow.isDestroyed()) {
        await dialog.showMessageBox(mainWindow, {
          type: 'error', title: 'Velora', message: '파일을 처리하지 못했습니다.',
          detail: '파일 형식, 크기 또는 저장 폴더 권한을 확인한 뒤 다시 시도해 주세요.',
        });
      }
      return { ok: false };
    }
  });

  handle('luma:save-project', async (content) => {
    const validated = projectContent(content);
    const selected = await dialog.showSaveDialog(mainWindow, {
      title: 'Velora 프로젝트 저장', defaultPath: 'Untitled.luma.json',
      filters: [{ name: 'Velora 프로젝트', extensions: ['luma.json'] }],
      properties: ['showOverwriteConfirmation', 'createDirectory'],
    });
    if (selected.canceled || !selected.filePath) return { ok: false };
    const destination = /\.luma\.json$/i.test(selected.filePath) ? selected.filePath : `${selected.filePath}.luma.json`;
    await atomicWrite(destination, validated);
    return { ok: true, path: destination };
  });

  handle('luma:open-project', async () => {
    const selected = await dialog.showOpenDialog(mainWindow, {
      title: 'Velora 프로젝트 열기', properties: ['openFile'],
      filters: [{ name: 'Velora 프로젝트', extensions: ['json'] }],
    });
    if (selected.canceled || !selected.filePaths.length) return { ok: false };
    const source = selected.filePaths[0];
    const info = await fs.stat(source);
    if (!info.isFile() || info.size > PROJECT_LIMIT) throw new Error('Project file exceeds the size limit.');
    const content = projectContent(await fs.readFile(source, 'utf8'));
    return { ok: true, path: source, content };
  });

  handle('luma:export-files', async (files) => {
    const validated = validateExportFiles(files);
    const selected = await dialog.showOpenDialog(mainWindow, {
      title: '코드 내보내기 폴더 선택', buttonLabel: '여기에 내보내기', properties: ['openDirectory', 'createDirectory'],
    });
    if (selected.canceled || !selected.filePaths.length) return { ok: false };
    const root = await fs.realpath(selected.filePaths[0]);
    const destinations = [];
    const existing = [];
    for (const file of validated) {
      const destination = await safeExportDestination(root, file.name);
      destinations.push({ ...file, destination });
      try {
        await fs.lstat(destination);
        existing.push(file.name);
      } catch (error) {
        if (error.code !== 'ENOENT') throw error;
      }
    }
    if (existing.length) {
      const choice = await dialog.showMessageBox(mainWindow, {
        type: 'question', title: '기존 파일 바꾸기', message: `${existing.length}개의 기존 파일을 바꾸시겠습니까?`,
        detail: existing.slice(0, 12).join('\n'), buttons: ['취소', '파일 바꾸기'], defaultId: 0, cancelId: 0,
      });
      if (choice.response !== 1) return { ok: false };
    }
    for (const file of destinations) await atomicWrite(file.destination, file.content);
    return { ok: true, path: root };
  });

  handle('luma:save-binary', async (name, data) => {
    const filename = validateBinary(name, data);
    const extension = path.extname(filename).slice(1);
    const selected = await dialog.showSaveDialog(mainWindow, {
      title: '파일 내보내기', defaultPath: filename,
      ...(extension ? { filters: [{ name: extension.toUpperCase(), extensions: [extension] }] } : {}),
      properties: ['showOverwriteConfirmation', 'createDirectory'],
    });
    if (selected.canceled || !selected.filePath) return { ok: false };
    await atomicWrite(selected.filePath, Buffer.from(data));
    return { ok: true, path: selected.filePath };
  });

  for (const [channel, action] of [
    ['luma:window-minimize', () => mainWindow.minimize()],
    ['luma:window-maximize', () => mainWindow.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize()],
    ['luma:window-close', () => mainWindow.close()],
  ]) ipcMain.on(channel, (event) => {
    try { assertSender(event); action(); } catch { /* Ignore messages from untrusted frames. */ }
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1600, height: 1000, minWidth: 1100, minHeight: 720,
    title: 'Velora', backgroundColor: '#0b0d10', frame: false, show: false,
    icon: path.join(__dirname, '..', 'build', 'icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, sandbox: true,
      nodeIntegration: false, webSecurity: true, allowRunningInsecureContent: false,
      spellcheck: false, devTools: !app.isPackaged,
    },
  });
  mainWindow.setMenuBarVisibility(false);
  mainWindow.once('ready-to-show', () => mainWindow.show());
  mainWindow.on('closed', () => { rejectAgentRequests('APP_CLOSED: The design window closed.'); mainWindow = null; });
  mainWindow.webContents.on('did-start-navigation', (_event, _url, inPlace, isMainFrame) => { if (isMainFrame && !inPlace) rejectAgentRequests('DOCUMENT_NOT_READY: The design document is loading.'); });
  mainWindow.webContents.on('render-process-gone', () => rejectAgentRequests('RENDERER_CLOSED: Restart Velora.'));
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  mainWindow.webContents.on('will-navigate', (event, destination) => { if (!trustedLocation(destination)) event.preventDefault(); });
  mainWindow.webContents.on('will-attach-webview', (event) => event.preventDefault());
  if (developmentUrl) mainWindow.loadURL(developmentUrl.href);
  else mainWindow.loadFile(productionPage);
}

if (MCP_MODE) {
  // This branch precedes the GUI single-instance lock: each MCP client gets an independent stdio process.
  // No BrowserWindow, dialogs, console output, or external Node installation are needed.
  app.whenReady().then(() => require('../mcp/server.cjs').startServer({
    descriptorPath: process.env.LUMA_BRIDGE_FILE || path.join(app.getPath('userData'), 'mcp-bridge.json'),
    version: app.getVersion(), onExit: (code) => app.exit(code),
  })).catch((error) => { process.stderr.write(`[Velora MCP] ${String(error.message).slice(0, 500)}\n`); app.exit(1); });
} else if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });
  app.whenReady().then(async () => {
    const devOrigin = developmentUrl ? developmentUrl.origin : '';
    const devSocket = developmentUrl ? developmentUrl.origin.replace(/^http/, 'ws') : '';
    const policy = `default-src 'self'; script-src 'self'${developmentUrl ? " 'unsafe-eval'" : ''}; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'${developmentUrl ? ` ${devOrigin} ${devSocket}` : ''}; object-src 'none'; base-uri 'self'; form-action 'none'; frame-src 'self' blob: about:`;
    session.defaultSession.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
    session.defaultSession.setPermissionCheckHandler(() => false);
    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
      callback({ responseHeaders: { ...details.responseHeaders, 'Content-Security-Policy': [policy] } });
    });
    try {
      agentBridge = await require('../mcp/bridge.cjs').createBridge({
        descriptorPath: process.env.LUMA_BRIDGE_FILE || path.join(app.getPath('userData'), 'mcp-bridge.json'),
        dispatch: dispatchAgentCommand, onStatus: broadcastAgentStatus,
      });
    } catch (error) { console.error('[Velora MCP bridge]', error.message); }
    registerHandlers();
    createWindow();
    app.on('activate', () => { if (!BrowserWindow.getAllWindows().length) createWindow(); });
  });
  let bridgeClosing = false;
  app.on('before-quit', (event) => {
    if (!agentBridge || bridgeClosing) return;
    event.preventDefault();
    bridgeClosing = true;
    rejectAgentRequests('APP_CLOSED: Velora is closing.');
    agentBridge.close().finally(() => app.quit());
  });
  app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
}
