const http = require('node:http');

function sendJson(response, statusCode, body) {
  response.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  response.end(JSON.stringify(body));
}

function createBridgeServer({ bridgeKey, getPlayback, onLogin, onCallback }) {
  return http.createServer(async (request, response) => {
    const url = new URL(request.url, 'http://localhost');
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
      if (request.method === 'GET' && url.pathname === '/login' && onLogin) {
        response.writeHead(302, { Location: await onLogin() });
        return response.end();
      }
      if (request.method === 'GET' && url.pathname === '/callback' && onCallback) {
        await onCallback({ code: url.searchParams.get('code'), state: url.searchParams.get('state'), error: url.searchParams.get('error') });
        response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        return response.end('<h1>Spotify linked.</h1><p>You can close this tab and start playback on your phone or any Spotify device.</p>');
      }
      return sendJson(response, 404, { error: 'not found' });
    } catch (error) {
      return sendJson(response, 500, { error: error.message });
    }
  });
}

module.exports = { createBridgeServer };
