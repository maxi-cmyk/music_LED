const defaults = {
  rgbEnabled: true,
  beatSensitivity: 1,
  noiseGateMultiplier: 1.3,
  tempoCorrection: 0.25,
  tempoHoldMs: 2500,
  flashDecay: 0.65,
  idleBrightness: 18,
  maxBrightness: 240,
  redGain: 1,
  greenGain: 1,
  blueGain: 1,
  gamma: 1.6,
  dancerSpeed: 1,
  dancerIntensity: 1,
  paletteMode: 'album',
  nightEnabled: false,
  nightStart: '23:00',
  nightEnd: '07:00',
  nightBrightness: 12,
};

const resetGroups = {
  pulse: ['beatSensitivity', 'noiseGateMultiplier', 'tempoCorrection', 'tempoHoldMs', 'flashDecay'],
  colour: ['rgbEnabled', 'idleBrightness', 'maxBrightness', 'redGain', 'greenGain', 'blueGain', 'gamma', 'paletteMode'],
  mascot: ['dancerSpeed', 'dancerIntensity'],
  automation: ['nightEnabled', 'nightStart', 'nightEnd', 'nightBrightness'],
};

const form = document.querySelector('#control-form');
const saveStatus = document.querySelector('#save-status');
const rgbToggle = document.querySelector('#rgb-toggle');
const nightToggle = document.querySelector('#night-toggle');
const calibrationStatus = document.querySelector('#calibration-status');

function updateRgbToggle(enabled) {
  const isEnabled = enabled !== false;
  rgbToggle.dataset.enabled = String(isEnabled);
  rgbToggle.setAttribute('aria-pressed', String(isEnabled));
  rgbToggle.querySelector('strong').textContent = isEnabled ? 'OUTPUT ON' : 'OUTPUT OFF';
  document.querySelectorAll('[data-rgb-test]').forEach((button) => {
    if (button.dataset.rgbTest !== 'off') button.disabled = !isEnabled;
  });
}

function updateNightToggle(enabled) {
  const isEnabled = enabled === true;
  nightToggle.dataset.enabled = String(isEnabled);
  nightToggle.setAttribute('aria-pressed', String(isEnabled));
  nightToggle.querySelector('strong').textContent = isEnabled ? 'ARMED' : 'OFF';
}

function formatValue(label, value) {
  const suffix = label.dataset.suffix || '';
  return `${Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 })}${suffix}`;
}

function hydrate(config) {
  const safe = { ...defaults, ...config };
  updateRgbToggle(safe.rgbEnabled);
  updateNightToggle(safe.nightEnabled);
  document.querySelector('#night-start').value = safe.nightStart;
  document.querySelector('#night-end').value = safe.nightEnd;
  document.querySelectorAll('[data-setting]').forEach((label) => {
    const input = label.querySelector('input');
    input.value = safe[label.dataset.setting];
    label.querySelector('output').textContent = formatValue(label, input.value);
  });
  const palette = document.querySelector(`input[name="paletteMode"][value="${safe.paletteMode}"]`);
  if (palette) palette.checked = true;
}

function values() {
  const result = {
    rgbEnabled: rgbToggle.dataset.enabled !== 'false',
    nightEnabled: nightToggle.dataset.enabled === 'true',
    nightStart: document.querySelector('#night-start').value,
    nightEnd: document.querySelector('#night-end').value,
  };
  document.querySelectorAll('[data-setting]').forEach((label) => {
    result[label.dataset.setting] = Number(label.querySelector('input').value);
  });
  result.paletteMode = form.elements.paletteMode.value;
  return result;
}

async function jsonRequest(url, options) {
  const response = await fetch(url, options);
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || 'Request failed');
  return body;
}

async function loadConfig() {
  hydrate(await jsonRequest('/api/config'));
}

async function saveConfig(config) {
  saveStatus.textContent = 'Sending configuration…';
  const saved = await jsonRequest('/api/config', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  });
  hydrate(saved);
  saveStatus.textContent = `Applied at ${new Date().toLocaleTimeString()}. ESP32 updates on its next poll.`;
  return saved;
}

async function resetGroup(group) {
  const keys = resetGroups[group];
  if (!keys) return;
  const config = values();
  keys.forEach((key) => { config[key] = defaults[key]; });
  await saveConfig(config);
}

function updateMeter(name, value) {
  const safeValue = Math.max(0, Math.min(255, Number(value) || 0));
  document.querySelector(`#${name}-meter`).style.width = `${(safeValue / 255) * 100}%`;
  document.querySelector(`#${name}-value`).textContent = Math.round(safeValue);
}

function duration(value) {
  const seconds = Math.max(0, Math.round(Number(value) / 1000));
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  return hours ? `${hours}h ${minutes % 60}m` : `${minutes}m`;
}

function age(value) {
  if (!value) return 'NEVER';
  const elapsed = Date.now() - value;
  return elapsed < 5000 ? 'JUST NOW' : `${duration(elapsed)} AGO`;
}

function renderHealth(telemetry, system) {
  const live = telemetry && !telemetry.waiting && Date.now() - telemetry.receivedAt < 7000;
  document.querySelector('#health-headline').textContent = live ? 'ALL SYSTEMS TALKING' : 'DEVICE SIGNAL LOST';
  document.querySelector('#health-firmware').textContent = telemetry?.firmwareVersion || '—';
  document.querySelector('#health-device-uptime').textContent = telemetry ? duration(telemetry.uptimeMs) : '—';
  document.querySelector('#health-bridge-uptime').textContent = duration(system.bridgeUptimeMs);
  document.querySelector('#health-latency').textContent = telemetry ? `${telemetry.bridgeLatencyMs} ms` : '—';
  document.querySelector('#health-heap').textContent = telemetry?.freeHeap ? `${Math.round(telemetry.freeHeap / 1024)} KB` : '—';
  document.querySelector('#health-sync').textContent = age(system.lastSpotifySyncAt);
  const fault = system.lastSpotifyError || telemetry?.bridgeError;
  document.querySelector('#health-error').textContent = fault || (system.nightActive ? 'Night limit is currently active.' : 'No fault reported.');
  document.querySelector('.health-console').classList.toggle('fault', Boolean(fault));
  document.querySelectorAll('[data-rgb-test]').forEach((button) => {
    button.classList.toggle('active', system.rgbTest?.mode !== 'off' && button.dataset.rgbTest === system.rgbTest?.mode);
  });
}

async function refreshTelemetry() {
  try {
    const [data, system] = await Promise.all([jsonRequest('/api/telemetry'), jsonRequest('/api/system')]);
    const live = !data.waiting && Date.now() - data.receivedAt < 7000;
    document.querySelector('.connection').classList.toggle('live', live);
    document.querySelector('#connection-copy').textContent = live ? 'ESP32 signal live' : 'Waiting for board';
    renderHealth(data, system);
    if (!live) return;
    document.querySelector('#bpm').textContent = data.bpm || '—';
    document.querySelector('#confidence').textContent = `${Math.round(data.beatConfidence)}% CONFIDENCE`;
    document.querySelector('#microphone').textContent = Math.round(data.microphoneLevel);
    document.querySelector('#noise-floor').textContent = `FLOOR ${Math.round(data.noiseFloor)}`;
    document.querySelector('#wifi').textContent = data.wifiRssi || '—';
    updateMeter('bass', data.bass);
    updateMeter('mid', data.mid);
    updateMeter('treble', data.treble);
  } catch {
    document.querySelector('.connection').classList.remove('live');
    document.querySelector('#connection-copy').textContent = 'Bridge unavailable';
  }
}

function renderScenes(scenes) {
  const list = document.querySelector('#scene-list');
  list.replaceChildren(...scenes.map((scene) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'scene-chip';
    const apply = document.createElement('button');
    apply.type = 'button';
    apply.dataset.sceneId = scene.id;
    const kind = document.createElement('span');
    kind.textContent = scene.builtIn ? 'FACTORY' : 'CUSTOM';
    const name = document.createElement('strong');
    name.textContent = scene.name;
    apply.append(kind, name);
    wrapper.append(apply);
    if (!scene.builtIn) {
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'scene-delete';
      remove.dataset.deleteScene = scene.id;
      remove.setAttribute('aria-label', `Delete ${scene.name}`);
      remove.textContent = '×';
      wrapper.append(remove);
    }
    return wrapper;
  }));
}

async function loadScenes() {
  renderScenes(await jsonRequest('/api/scenes'));
}

async function runCalibration(button) {
  button.disabled = true;
  const samples = [];
  try {
    for (let index = 0; index < 20; index += 1) {
      calibrationStatus.textContent = `Listening… ${10 - Math.floor(index / 2)} sec`;
      const sample = await jsonRequest('/api/telemetry');
      if (!sample.waiting && Date.now() - sample.receivedAt < 7000) samples.push(sample);
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    const calibrated = await jsonRequest('/api/calibrate', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ samples }),
    });
    hydrate(calibrated);
    calibrationStatus.textContent = 'Calibration applied. Keep the song playing to judge the result.';
    saveStatus.textContent = 'Beat engine calibrated and saved.';
  } catch (error) {
    calibrationStatus.textContent = error.message;
  } finally {
    button.disabled = false;
  }
}

document.querySelectorAll('[data-setting] input').forEach((input) => {
  input.addEventListener('input', () => {
    const label = input.closest('[data-setting]');
    label.querySelector('output').textContent = formatValue(label, input.value);
    saveStatus.textContent = 'Unsaved changes';
  });
});

document.querySelectorAll('input[type="time"], input[name="paletteMode"]').forEach((input) => {
  input.addEventListener('change', () => { saveStatus.textContent = 'Unsaved changes'; });
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  try { await saveConfig(values()); } catch (error) { saveStatus.textContent = error.message; }
});

document.querySelector('#reset-button').addEventListener('click', async () => {
  try { await saveConfig(defaults); } catch (error) { saveStatus.textContent = error.message; }
});

rgbToggle.addEventListener('click', async () => {
  const wasEnabled = rgbToggle.dataset.enabled !== 'false';
  const config = { ...values(), rgbEnabled: !wasEnabled };
  updateRgbToggle(config.rgbEnabled);
  rgbToggle.disabled = true;
  try {
    await saveConfig(config);
    saveStatus.textContent = `RGB output ${config.rgbEnabled ? 'enabled' : 'disabled'}. ESP32 updates on its next poll.`;
  } catch (error) {
    updateRgbToggle(wasEnabled);
    saveStatus.textContent = error.message;
  } finally {
    rgbToggle.disabled = false;
  }
});

nightToggle.addEventListener('click', () => {
  updateNightToggle(nightToggle.dataset.enabled !== 'true');
  saveStatus.textContent = 'Unsaved changes';
});

document.querySelectorAll('[data-rgb-test]').forEach((button) => {
  button.addEventListener('click', async () => {
    try {
      const mode = button.dataset.rgbTest;
      const options = mode === 'off'
        ? { method: 'DELETE' }
        : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mode }) };
      await jsonRequest('/api/rgb-test', options);
      saveStatus.textContent = mode === 'off' ? 'RGB test stopped.' : `${mode.toUpperCase()} test sent for 10 seconds.`;
      await refreshTelemetry();
    } catch (error) {
      saveStatus.textContent = error.message;
    }
  });
});

document.querySelector('#calibrate-button').addEventListener('click', (event) => runCalibration(event.currentTarget));

document.querySelector('#save-scene').addEventListener('click', async () => {
  const input = document.querySelector('#scene-name');
  try {
    await saveConfig(values());
    await jsonRequest('/api/scenes', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: input.value }),
    });
    input.value = '';
    await loadScenes();
    saveStatus.textContent = 'Custom scene captured.';
  } catch (error) {
    saveStatus.textContent = error.message;
  }
});

document.querySelector('#scene-list').addEventListener('click', async (event) => {
  const apply = event.target.closest('[data-scene-id]');
  const remove = event.target.closest('[data-delete-scene]');
  try {
    if (apply) {
      hydrate(await jsonRequest(`/api/scenes/${encodeURIComponent(apply.dataset.sceneId)}/apply`, { method: 'POST' }));
      saveStatus.textContent = `${apply.querySelector('strong').textContent} scene applied.`;
    } else if (remove) {
      await jsonRequest(`/api/scenes/${encodeURIComponent(remove.dataset.deleteScene)}`, { method: 'DELETE' });
      await loadScenes();
      saveStatus.textContent = 'Custom scene deleted.';
    }
  } catch (error) {
    saveStatus.textContent = error.message;
  }
});

document.querySelectorAll('[data-reset-group]').forEach((button) => {
  button.addEventListener('click', async () => {
    button.disabled = true;
    try {
      await resetGroup(button.dataset.resetGroup);
      saveStatus.textContent = `${button.dataset.resetGroup.toUpperCase()} defaults restored. ESP32 updates on its next poll.`;
    } catch (error) {
      saveStatus.textContent = error.message;
    } finally {
      button.disabled = false;
    }
  });
});

Promise.all([loadConfig(), loadScenes()]).catch((error) => { saveStatus.textContent = error.message; });
refreshTelemetry();
setInterval(refreshTelemetry, 1500);
