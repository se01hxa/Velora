const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const { randomBytes, randomUUID, timingSafeEqual } = require('node:crypto');
const { validateCommand, writeCommands } = require('./schemas.cjs');
const MAX_BODY = 2_000_000;
const MAX_RESULT = 110_000_000;
const REQUEST_TIMEOUT = 45_000;

function safeError(error) {
  const message = typeof error?.message === 'string' ? error.message : String(error || 'Command failed.');
  return message.slice(0, 1000).replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, '');
}

async function createBridge({ descriptorPath, dispatch, onStatus = () => {} }) {
  const optionsPath = path.join(path.dirname(descriptorPath), 'mcp-options.json');
  let options = { enabled: true, readOnly: false };
  try {
    const saved = JSON.parse(await fs.readFile(optionsPath, 'utf8'));
    if (typeof saved.enabled === 'boolean') options.enabled = saved.enabled;
    if (typeof saved.readOnly === 'boolean') options.readOnly = saved.readOnly;
  } catch { /* Defaults are used until the user changes MCP settings. */ }
  let server = null, descriptor = null, working = false;
  let optionChanges = Promise.resolve();
  const queue = [], clients = new Map();
  const status = () => ({ ...options, port: descriptor?.port, endpoint: descriptor ? `http://127.0.0.1:${descriptor.port}` : undefined, clients: clients.size });
  const changed = () => onStatus(status());
  const prune = setInterval(() => {
    let removed = false;
    for (const [client, seen] of clients) if (Date.now() - seen > 60_000) { clients.delete(client); removed = true; }
    if (removed) changed();
  }, 15_000);
  prune.unref();

  async function processQueue() {
    if (working) return;
    working = true;
    while (queue.length) {
      const item = queue.shift();
      if (item.expired) continue;
      try {
        if (!options.enabled) throw new Error('BRIDGE_DISABLED: Enable MCP in Velora.');
        if (options.readOnly && writeCommands.has(item.command)) throw new Error('READ_ONLY: Document edits are disabled in Velora.');
        item.resolve(await dispatch(item.command, item.args));
      } catch (error) { item.reject(error); }
    }
    working = false;
  }
  function enqueue(command, args) {
    if (queue.length >= 32) return Promise.reject(new Error('BUSY: Too many queued requests. Try again later.'));
    return new Promise((resolve, reject) => {
      const item = { command, args, expired: false, resolve: null, reject: null };
      const timeout = setTimeout(() => { item.expired = true; reject(new Error('TIMEOUT: Velora did not finish this command. Inspect the document before retrying edits.')); }, REQUEST_TIMEOUT);
      item.resolve = (value) => { clearTimeout(timeout); if (!item.expired) resolve(value); };
      item.reject = (error) => { clearTimeout(timeout); if (!item.expired) reject(error); };
      queue.push(item);
      void processQueue();
    });
  }
  function reply(response, code, data) {
    if (response.destroyed || response.writableEnded) return;
    const body = JSON.stringify(data);
    if (Buffer.byteLength(body) > MAX_RESULT) return reply(response, 413, { ok: false, error: 'RESULT_TOO_LARGE: Reduce the requested document or render scale.' });
    response.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
    response.end(body);
  }
  async function incoming(request, response) {
    const current = descriptor;
    if (!current || !options.enabled) return reply(response, 503, { ok: false, error: 'BRIDGE_DISABLED' });
    const supplied = String(request.headers.authorization || '');
    const expected = `Bearer ${current.token}`;
    const suppliedBytes = Buffer.from(supplied), expectedBytes = Buffer.from(expected);
    const authenticated = suppliedBytes.length === expectedBytes.length && timingSafeEqual(suppliedBytes, expectedBytes);
    if (request.socket.remoteAddress !== '127.0.0.1' || request.headers.host !== `127.0.0.1:${current.port}` || Object.hasOwn(request.headers, 'origin') || !authenticated) {
      request.resume();
      return reply(response, 403, { ok: false, error: 'FORBIDDEN' });
    }
    if (request.method !== 'POST' || request.url !== '/rpc' || !/^application\/json(?:;|$)/i.test(String(request.headers['content-type'] || ''))) {
      request.resume();
      return reply(response, 400, { ok: false, error: 'INVALID_REQUEST' });
    }
    if (Number(request.headers['content-length'] || 0) > MAX_BODY) { request.resume(); return reply(response, 413, { ok: false, error: 'BODY_TOO_LARGE' }); }
    const parts = []; let length = 0, tooLarge = false;
    request.on('data', (part) => {
      length += part.length;
      if (length > MAX_BODY) { tooLarge = true; parts.length = 0; reply(response, 413, { ok: false, error: 'BODY_TOO_LARGE' }); }
      else if (!tooLarge) parts.push(part);
    });
    request.on('end', async () => {
      if (tooLarge) return;
      try {
        const payload = JSON.parse(Buffer.concat(parts).toString('utf8'));
        if (!payload || Array.isArray(payload) || typeof payload !== 'object' || Object.keys(payload).some(k => !['command', 'args', 'clientId'].includes(k)) || !/^[a-f0-9-]{36}$/i.test(payload.clientId || '')) throw new Error('INVALID_REQUEST: Invalid request envelope.');
        const wasNew = !clients.has(payload.clientId);
        if (payload.command === '__disconnect') { clients.delete(payload.clientId); changed(); return reply(response, 200, { ok: true, result: {} }); }
        if (wasNew && clients.size >= 128) throw new Error('BUSY: Too many active MCP clients.');
        clients.set(payload.clientId, Date.now());
        if (wasNew) changed();
        if (payload.command === '__connect' || payload.command === '__ping') return reply(response, 200, { ok: true, result: status() });
        const args = validateCommand(payload.command, payload.args);
        if (options.readOnly && writeCommands.has(payload.command)) throw new Error('READ_ONLY: Document edits are disabled in Velora.');
        const result = await enqueue(payload.command, args);
        reply(response, 200, { ok: true, result });
      } catch (error) { reply(response, 400, { ok: false, error: safeError(error) }); }
    });
    request.on('error', () => {});
  }
  async function start() {
    if (server || !options.enabled) return;
    const listener = http.createServer((request, response) => { void incoming(request, response).catch(() => reply(response, 500, { ok: false, error: 'BRIDGE_ERROR' })); });
    listener.requestTimeout = 10_000;
    listener.headersTimeout = 5_000;
    listener.keepAliveTimeout = 1000;
    listener.maxConnections = 24;
    await new Promise((resolve, reject) => { listener.once('error', reject); listener.listen(0, '127.0.0.1', resolve); });
    descriptor = { version: 1, host: '127.0.0.1', port: listener.address().port, token: randomBytes(32).toString('hex'), pid: process.pid, instanceId: randomUUID() };
    server = listener;
    const temporary = `${descriptorPath}.${randomUUID()}.tmp`;
    try {
      await fs.mkdir(path.dirname(descriptorPath), { recursive: true });
      await fs.writeFile(temporary, JSON.stringify(descriptor), { mode: 0o600 });
      await fs.rename(temporary, descriptorPath);
    } catch (error) {
      listener.close(); listener.closeAllConnections(); server = null; descriptor = null;
      await fs.unlink(temporary).catch(() => {});
      throw error;
    }
    changed();
  }
  async function stop() {
    const previous = descriptor;
    descriptor = null;
    clients.clear();
    for (const item of queue.splice(0)) item.reject(new Error('BRIDGE_DISABLED: MCP is turned off.'));
    const listener = server; server = null;
    if (listener) { listener.close(); listener.closeAllConnections(); }
    try {
      const saved = JSON.parse(await fs.readFile(descriptorPath, 'utf8'));
      if (saved.instanceId === previous?.instanceId) await fs.unlink(descriptorPath);
    } catch { /* An already removed descriptor needs no cleanup. */ }
    changed();
  }
  await start();
  return {
    status,
    setOptions(patch) {
      if (!patch || Array.isArray(patch) || typeof patch !== 'object' || Object.keys(patch).some(k => !['enabled', 'readOnly'].includes(k)) || Object.values(patch).some(v => typeof v !== 'boolean')) throw new Error('Invalid MCP options.');
      const change = async () => {
        options = { ...options, ...patch };
        await fs.writeFile(optionsPath, JSON.stringify(options), { mode: 0o600 });
        if (options.enabled) await start(); else await stop();
        changed();
        return status();
      };
      optionChanges = optionChanges.then(change, change);
      return optionChanges;
    },
    async close() { clearInterval(prune); await optionChanges.catch(() => {}); await stop(); },
  };
}
module.exports = { createBridge, safeError, MAX_BODY, MAX_RESULT };
