const defaults = {
  beatSensitivity: 1,
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
};

const form = document.querySelector('#control-form');
const saveStatus = document.querySelector('#save-status');

function formatValue(label, value) {
  const suffix = label.dataset.suffix || '';
  return `${Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 })}${suffix}`;
}

function hydrate(config) {
  document.querySelectorAll('[data-setting]').forEach((label) => {
    const input = label.querySelector('input');
    input.value = config[label.dataset.setting];
    label.querySelector('output').textContent = formatValue(label, input.value);
  });
  const palette = document.querySelector(`input[name="paletteMode"][value="${config.paletteMode}"]`);
  if (palette) palette.checked = true;
}

function values() {
  const result = {};
  document.querySelectorAll('[data-setting]').forEach((label) => {
    result[label.dataset.setting] = Number(label.querySelector('input').value);
  });
  result.paletteMode = form.elements.paletteMode.value;
  return result;
}

async function loadConfig() {
  const response = await fetch('/api/config');
  if (!response.ok) throw new Error('Could not load controls');
  hydrate(await response.json());
}

async function saveConfig(config) {
  saveStatus.textContent = 'Sending configuration…';
  const response = await fetch('/api/config', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  });
  if (!response.ok) throw new Error('Could not save controls');
  hydrate(await response.json());
  saveStatus.textContent = `Applied at ${new Date().toLocaleTimeString()}. ESP32 updates on its next poll.`;
}

function updateMeter(name, value) {
  const safeValue = Math.max(0, Math.min(255, Number(value) || 0));
  document.querySelector(`#${name}-meter`).style.width = `${(safeValue / 255) * 100}%`;
  document.querySelector(`#${name}-value`).textContent = Math.round(safeValue);
}

async function refreshTelemetry() {
  try {
    const response = await fetch('/api/telemetry');
    const data = await response.json();
    const live = !data.waiting && Date.now() - data.receivedAt < 7000;
    document.querySelector('.connection').classList.toggle('live', live);
    document.querySelector('#connection-copy').textContent = live ? 'ESP32 signal live' : 'Waiting for board';
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

document.querySelectorAll('[data-setting] input').forEach((input) => {
  input.addEventListener('input', () => {
    const label = input.closest('[data-setting]');
    label.querySelector('output').textContent = formatValue(label, input.value);
    saveStatus.textContent = 'Unsaved changes';
  });
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  try { await saveConfig(values()); } catch (error) { saveStatus.textContent = error.message; }
});

document.querySelector('#reset-button').addEventListener('click', async () => {
  try { await saveConfig(defaults); } catch (error) { saveStatus.textContent = error.message; }
});

loadConfig().catch((error) => { saveStatus.textContent = error.message; });
refreshTelemetry();
setInterval(refreshTelemetry, 1500);
