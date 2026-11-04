import { FREQUENCIES, PRESETS, SIGNAL_CONFIG, bandRangeHz } from './config.mjs?release=20260924-distill-23';
import { selectionLabel } from './selection-label.mjs?release=20260924-distill-23';
import { drawWaveComposition } from './visualizations.mjs?release=20261009-demo-simplify-1';

function createPresetButtons(container, onSelect) {
  for (const preset of PRESETS) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `preset-button ${preset.colourClass}`;
    button.dataset.preset = preset.id;
    button.textContent = preset.label;
    button.addEventListener('click', () => onSelect(preset));
    container.append(button);
  }
}

function frequencyColour(detail) {
  return detail.band === 'leakage'
    ? '#d8ff52'
    : SIGNAL_CONFIG.bands[detail.band].colour;
}

function createFrequencyButtons(container, onToggle) {
  for (const detail of FREQUENCIES) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'frequency-button';
    button.dataset.frequencyHz = String(detail.frequencyHz);
    button.style.setProperty('--frequency-colour', frequencyColour(detail));
    const label = document.createElement('strong');
    label.textContent = detail.label;
    const frequency = document.createElement('span');
    frequency.textContent = `${detail.frequencyHz} Hz`;
    const range = document.createElement('small');
    if (detail.band === 'leakage') {
      const exactRow = detail.frequencyHz / SIGNAL_CONFIG.binSpacingHz;
      range.textContent = `Between rows ${Math.floor(exactRow)} and ${Math.ceil(exactRow)}`;
    } else {
      const { lowHz, highHz } = bandRangeHz(SIGNAL_CONFIG.bands[detail.band]);
      range.textContent = `Band ${lowHz}–${highHz} Hz`;
    }
    button.append(label, frequency, range);
    button.addEventListener('click', () => onToggle(detail.frequencyHz));
    container.append(button);
  }
}

function renderComposerLegend(container, frequencies) {
  const signature = frequencies.join(',');
  if (container.dataset.signature === signature) return;
  container.dataset.signature = signature;
  const entries = [{ label: 'Combined x[n]', colour: '#d8ff52' }];
  if (frequencies.length > 1) {
    for (const frequencyHz of frequencies) {
      const detail = FREQUENCIES.find((item) => item.frequencyHz === frequencyHz);
      entries.push({ label: `${frequencyHz} Hz`, colour: detail ? frequencyColour(detail) : '#d8ff52', isComponent: true });
    }
  }
  container.replaceChildren(...entries.map(({ label, colour, isComponent }) => {
    const entry = document.createElement('span');
    entry.className = isComponent ? 'legend-entry legend-component' : 'legend-entry';
    entry.style.setProperty('--legend-colour', colour);
    entry.textContent = label;
    return entry;
  }));
}

export function mount(root, { store, audioController }) {
  const frequencyList = root.querySelector('#frequency-list');
  const presetList = root.querySelector('#preset-list');
  const selectionSummary = root.querySelector('#selection-summary');
  const volumeControl = root.querySelector('#volume-control');
  const volumeReadout = root.querySelector('#volume-readout');
  const playButton = root.querySelector('#play-button');
  const stopButton = root.querySelector('#stop-button');
  const audioMessage = root.querySelector('#audio-message');
  const compositeCanvas = root.querySelector('#composite-canvas');
  const composerLegend = root.querySelector('#composer-legend');
  const drawComposition = () => {
    drawWaveComposition(compositeCanvas, store.get().selectedFrequencies);
  };

  const updateSelection = (frequencies, activePreset = null) => {
    store.patch({ selectedFrequencies: [...frequencies], activePreset });
    audioController.setSelection(frequencies);
  };

  createPresetButtons(presetList, (preset) => updateSelection(preset.frequencies, preset.id));
  createFrequencyButtons(frequencyList, (frequencyHz) => {
    const selected = new Set(store.get().selectedFrequencies);
    if (selected.has(frequencyHz)) selected.delete(frequencyHz);
    else selected.add(frequencyHz);
    const ordered = FREQUENCIES
      .map((detail) => detail.frequencyHz)
      .filter((candidate) => selected.has(candidate));
    updateSelection(ordered, null);
  });

  playButton.addEventListener('click', () => audioController.play());
  stopButton.addEventListener('click', () => audioController.stop());
  volumeControl.addEventListener('input', () => audioController.setVolume(Number(volumeControl.value)));
  const render = (state) => {
    selectionSummary.textContent = selectionLabel(state.selectedFrequencies);
    volumeControl.value = state.volumePercent;
    volumeReadout.textContent = `${state.volumePercent}%`;
    playButton.disabled = state.isPlaying;
    stopButton.disabled = !state.isPlaying;
    audioMessage.textContent = state.audioMessage;

    presetList.querySelectorAll('button').forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.preset === state.activePreset));
    });
    frequencyList.querySelectorAll('button').forEach((button) => {
      button.setAttribute(
        'aria-pressed',
        String(state.selectedFrequencies.includes(Number(button.dataset.frequencyHz))),
      );
    });

    renderComposerLegend(composerLegend, state.selectedFrequencies);
    drawComposition();
  };

  const unsubscribe = store.subscribe(render);
  const onResize = () => drawComposition();
  window.addEventListener('resize', onResize);
  return () => {
    unsubscribe();
    window.removeEventListener('resize', onResize);
  };
}
