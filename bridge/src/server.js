const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

function sendJson(response, statusCode, body) {
  response.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  response.end(JSON.stringify(body));
}

function isLoopbackAddress(address) {
  return address === '127.0.0.1' || address === '::1' || address === '::ffff:127.0.0.1';
}

async function readJson(request) {
  let body = '';
  for await (const chunk of request) {
    body += chunk;
    if (body.length > 16_384) throw new Error('request body too large');
  }
  return body ? JSON.parse(body) : {};
}

function sendFile(response, filePath, contentType) {
  response.writeHead(200, { 'Content-Type': contentType, 'Cache-Control': 'no-store' });
  fs.createReadStream(filePath).pipe(response);
}

function createBridgeServer({
  bridgeKey,
  getPlayback,
  onLogin,
  onCallback,
  configStore,
  telemetryStore,
  frontendRoot,
  sceneStore,
  rgbTestStore,
  calibrate,
  getSystemHealth,
}) {
  return http.createServer(async (request, response) => {
    const url = new URL(request.url, 'http://localhost');
    const localRequest = isLoopbackAddress(request.socket.remoteAddress);
    try {
      if (request.method === 'GET' && url.pathname === '/health') {
        return sendJson(response, 200, { ok: true });
      }
      if (request.method === 'GET' && url.pathname === '/api/now-playing') {
        if (!bridgeKey || request.headers['x-bridge-key'] !== bridgeKey) {
          return sendJson(response, 401, { error: 'unauthorised' });
        }
        return sendJson(response, 200, await getPlayback());
      }
      if (request.method === 'POST' && url.pathname === '/api/telemetry' && telemetryStore) {
        if (!bridgeKey || request.headers['x-bridge-key'] !== bridgeKey) {
          return sendJson(response, 401, { error: 'unauthorised' });
        }
        telemetryStore.record(await readJson(request));
        return sendJson(response, 202, { ok: true });
      }
      if (url.pathname === '/api/config' && configStore) {
        if (!localRequest) return sendJson(response, 403, { error: 'local access only' });
        if (request.method === 'GET') return sendJson(response, 200, configStore.get());
        if (request.method === 'PUT') {
          return sendJson(response, 200, configStore.update(await readJson(request)));
        }
      }
      if (url.pathname === '/api/scenes' && sceneStore && configStore) {
        if (!localRequest) return sendJson(response, 403, { error: 'local access only' });
        if (request.method === 'GET') return sendJson(response, 200, sceneStore.list());
        if (request.method === 'POST') {
          const { name } = await readJson(request);
          return sendJson(response, 201, sceneStore.save(name, configStore.get()));
        }
      }
      const sceneMatch = url.pathname.match(/^\/api\/scenes\/([^/]+)(\/apply)?$/);
      if (sceneMatch && sceneStore && configStore) {
        if (!localRequest) return sendJson(response, 403, { error: 'local access only' });
        const id = decodeURIComponent(sceneMatch[1]);
        if (request.method === 'POST' && sceneMatch[2] === '/apply') {
          const scene = sceneStore.find(id);
          if (!scene) return sendJson(response, 404, { error: 'scene not found' });
          return sendJson(response, 200, configStore.update(scene.config));
        }
        if (request.method === 'DELETE' && !sceneMatch[2]) {
          return sceneStore.remove(id)
            ? sendJson(response, 200, { ok: true })
            : sendJson(response, 404, { error: 'scene not found' });
        }
      }
      if (url.pathname === '/api/rgb-test' && rgbTestStore) {
        if (!localRequest) return sendJson(response, 403, { error: 'local access only' });
        if (request.method === 'POST') {
          const { mode, durationMs } = await readJson(request);
          return sendJson(response, 200, rgbTestStore.start(mode, durationMs));
        }
        if (request.method === 'DELETE') return sendJson(response, 200, rgbTestStore.stop());
      }
      if (url.pathname === '/api/calibrate' && calibrate && configStore) {
        if (!localRequest) return sendJson(response, 403, { error: 'local access only' });
        if (request.method === 'POST') {
          const { samples } = await readJson(request);
          return sendJson(response, 200, configStore.update(calibrate(samples)));
        }
      }
      if (request.method === 'GET' && url.pathname === '/api/telemetry' && telemetryStore) {
        if (!localRequest) return sendJson(response, 403, { error: 'local access only' });
        return sendJson(response, 200, telemetryStore.get() || { waiting: true });
      }
      if (request.method === 'GET' && url.pathname === '/api/system' && getSystemHealth) {
        if (!localRequest) return sendJson(response, 403, { error: 'local access only' });
        return sendJson(response, 200, getSystemHealth());
      }
      if (request.method === 'GET' && url.pathname === '/login' && onLogin) {
        if (!localRequest) return sendJson(response, 403, { error: 'local access only' });
        response.writeHead(302, { Location: await onLogin() });
        return response.end();
      }
      if (request.method === 'GET' && url.pathname === '/callback' && onCallback) {
        if (!localRequest) return sendJson(response, 403, { error: 'local access only' });
        await onCallback({ code: url.searchParams.get('code'), state: url.searchParams.get('state'), error: url.searchParams.get('error') });
        response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        return response.end('<h1>Spotify linked.</h1><p>You can close this tab and start playback on your phone or any Spotify device.</p>');
      }
      if (request.method === 'GET' && frontendRoot && localRequest) {
        const assets = {
          '/': ['index.html', 'text/html; charset=utf-8'],
          '/app.js': ['app.js', 'text/javascript; charset=utf-8'],
          '/styles.css': ['styles.css', 'text/css; charset=utf-8'],
        };
        const asset = assets[url.pathname];
        if (asset) return sendFile(response, path.join(frontendRoot, asset[0]), asset[1]);
      }
      return sendJson(response, 404, { error: 'not found' });
    } catch (error) {
      return sendJson(response, 500, { error: error.message });
    }
  });
}

module.exports = { createBridgeServer, isLoopbackAddress };
