const AUTHORISE_URL = 'https://accounts.spotify.com/authorize';
const TOKEN_URL = 'https://accounts.spotify.com/api/token';

function buildAuthoriseUrl({ clientId, redirectUri, state }) {
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: redirectUri,
    scope: 'user-read-currently-playing',
    state,
  });
  return `${AUTHORISE_URL}?${params}`;
}

async function exchangeCode({ clientId, clientSecret, redirectUri, code, fetchImplementation = fetch }) {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
  });
  const response = await fetchImplementation(TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error_description || data.error || 'Spotify token exchange failed');
  }
  return data;
}

async function refreshAccessToken({ clientId, clientSecret, refreshToken, fetchImplementation = fetch }) {
  const body = new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refreshToken });
  const response = await fetchImplementation(TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error_description || data.error || 'Spotify token refresh failed');
  }
  return data;
}

async function fetchCurrentlyPlaying({ accessToken, fetchImplementation = fetch }) {
  const response = await fetchImplementation('https://api.spotify.com/v1/me/player/currently-playing', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (response.status === 204) {
    return null;
  }
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error?.message || 'Spotify playback request failed');
  }
  return data;
}

module.exports = { buildAuthoriseUrl, exchangeCode, refreshAccessToken, fetchCurrentlyPlaying };
