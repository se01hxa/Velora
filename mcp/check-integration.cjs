// Separate Node integration runner; intentionally outside Vitest's *.test.* discovery.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const http = require('node:http');
const { randomUUID } = require('node:crypto');
const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { StdioClientTransport } = require('@modelcontextprotocol/sdk/client/stdio.js');
const { createBridge } = require('./bridge.cjs');
const { bridgeClient } = require('./server.cjs');
const { validateCommand } = require('./schemas.cjs');
const PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j9XkAAAAASUVORK5CYII=';

test('authenticated live bridge and official MCP stdio client', async (t) => {
  const directory = path.resolve(__dirname, '../../../work/qa/mcp', randomUUID());
  await fs.mkdir(directory, { recursive: true });
  const descriptorPath = path.join(directory, 'mcp-bridge.json');
  const calls = []; let revision = 1, activeCommands = 0, maxActiveCommands = 0;
  const bridge = await createBridge({ descriptorPath, dispatch: async (command, args) => {
    calls.push({ command, args });
    activeCommands++;
    maxActiveCommands = Math.max(maxActiveCommands, activeCommands);
    await new Promise(resolve => setTimeout(resolve, 5));
    activeCommands--;
    if (command === 'render') return { data: PNG, mimeType: 'image/png', width: 1, height: 1 };
    if (command === 'batch_edit' || command === 'create_page') revision++;
    return { revision, project: { name: 'Integration test', pages: [] }, command };
  } });
  const rpc = bridgeClient(descriptorPath);
  try {
    await t.test('strict operation schemas and revision input', () => {
      assert.throws(() => validateCommand('batch_edit', { operations: [{ type: 'execute', script: 'x' }] }));
      assert.throws(() => validateCommand('get_document', { detail: 'full', shell: 'x' }));
      assert.throws(() => validateCommand('get_document', null));
      assert.throws(() => validateCommand('render', { scale: 2.1 }));
      assert.throws(() => validateCommand('batch_edit', { operations: Array(101).fill({ type: 'delete', ids: ['one'] }) }));
      assert.throws(() => validateCommand('batch_edit', { operations: [{ type: 'update', ids: ['one'], patch: { unexpected: true } }] }));
      assert.equal(validateCommand('batch_edit', { expectedRevision: 1, operations: [{ type: 'create', node: { type: 'frame', name: 'Card', radius: 20 } }] }).operations.length, 1);
    });
    await t.test('rejects browser origins, bad host and invalid token', async () => {
      const descriptor = JSON.parse(await fs.readFile(descriptorPath, 'utf8'));
      const post = (extraHeaders) => new Promise((resolve, reject) => {
        const body = JSON.stringify({ command: 'get_document', args: {}, clientId: randomUUID() });
        const request = http.request({ hostname: '127.0.0.1', port: descriptor.port, path: '/rpc', method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${descriptor.token}`, ...extraHeaders } }, response => { response.resume(); response.on('end', () => resolve(response.statusCode)); });
        request.on('error', reject); request.end(body);
      });
      assert.equal(await post({ Origin: 'http://localhost' }), 403);
      assert.equal(await post({ Origin: 'null' }), 403);
      assert.equal(await post({ Host: 'evil.example' }), 403);
      assert.equal(await post({ Authorization: 'Bearer wrong' }), 403);
      assert.equal(await post({ 'Content-Length': '2000001' }), 413);
      assert.equal((await rpc('get_document', { detail: 'summary' })).revision, 1);
    });
    await t.test('serial edits, read-only enforcement and fresh descriptor on restart', async () => {
      const results = await Promise.all([rpc('create_page', { kind: 'web' }), rpc('create_page', { kind: 'mobile' })]);
      // HTTP arrival order is independent of Promise creation order; dispatch must still be serial.
      assert.deepEqual(results.map(r => r.revision).sort(), [2, 3]);
      assert.equal(maxActiveCommands, 1);
      await bridge.setOptions({ readOnly: true });
      await assert.rejects(rpc('create_page', { kind: 'web' }), /READ_ONLY/);
      assert.equal((await rpc('get_document')).revision, 3);
      await rpc('set_selection', { nodeIds: [] });
      const original = JSON.parse(await fs.readFile(descriptorPath, 'utf8'));
      await bridge.setOptions({ enabled: false });
      await assert.rejects(fs.stat(descriptorPath));
      await assert.rejects(rpc('get_document'), /APP_NOT_RUNNING/);
      await bridge.setOptions({ enabled: true, readOnly: false });
      const restarted = JSON.parse(await fs.readFile(descriptorPath, 'utf8'));
      assert.notEqual(original.token, restarted.token);
      assert.equal((await rpc('get_document')).revision, 3);
      await Promise.all([bridge.setOptions({ enabled: false }), bridge.setOptions({ enabled: true }), bridge.setOptions({ readOnly: false })]);
      assert.equal(bridge.status().enabled, true);
      assert.equal((await rpc('get_document')).revision, 3);
    });
    async function checkClient(command, args, label, extraEnv = {}) {
      const env = Object.fromEntries(Object.entries(process.env).filter(([key, value]) => key !== 'ELECTRON_RUN_AS_NODE' && value !== undefined));
      env.LUMA_BRIDGE_FILE = descriptorPath;
      Object.assign(env, extraEnv);
      const transport = new StdioClientTransport({ command, args, env, stderr: 'pipe' });
      let errors = '';
      transport.stderr?.on('data', chunk => { errors += chunk.toString(); });
      const client = new Client({ name: 'luma-test', version: '1.0.0' });
      try {
        await client.connect(transport);
        const tools = await client.listTools();
        assert.equal(tools.tools.length, 11);
        const read = await client.callTool({ name: 'luma_get_document', arguments: { detail: 'summary' } });
        assert.equal(read.isError, undefined);
        assert.equal(read.structuredContent.project.name, 'Integration test');
        const wrong = await client.callTool({ name: 'luma_render', arguments: { scale: 9 } });
        assert.equal(wrong.isError, true);
        const image = await client.callTool({ name: 'luma_render', arguments: { scale: 1 } });
        assert.equal(image.content[0].type, 'image');
        assert.equal(image.content[0].data, PNG);
        const resources = await client.listResources();
        assert.equal(resources.resources[0].uri, 'luma://document');
        assert.equal(JSON.parse((await client.readResource({ uri: 'luma://document' })).contents[0].text).project.name, 'Integration test');
        assert.equal((await client.listPrompts()).prompts[0].name, 'luma_design_workflow');
        assert.equal((await client.getPrompt({ name: 'luma_design_workflow', arguments: { task: 'Make a card' } })).messages.length, 1);
      } catch (error) { throw new Error(`${label}: ${error.message}\n${errors}`); }
      finally { await client.close(); }
    }
    await t.test('Node stdio initialize, tools, image, resource and prompt', () => checkClient(process.execPath, [path.join(__dirname, 'server.cjs')], 'Node stdio'));
    await t.test('Electron bundled Node has real JSON stdio without a GUI', { timeout: 30_000 }, () => checkClient(require('electron'), [path.join(__dirname, 'server.cjs')], 'Electron bundled Node stdio', { ELECTRON_RUN_AS_NODE: '1' }));
  } finally { await bridge.close(); }
});
