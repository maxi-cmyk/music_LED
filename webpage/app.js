import { AudioController } from './scripts/audio-controller.mjs?release=20260922-capture-3';
import { renderMath } from './scripts/math-renderer.mjs?release=20260922-capture-3';
import { createRouter } from './scripts/router.mjs?release=20260922-capture-3';
import { Esp32SerialSource } from './scripts/serial-source.mjs?release=20260922-capture-3';
import { createStore, initialState } from './scripts/shared-state.mjs?release=20260922-capture-3';

const store = createStore(initialState);
const audioController = new AudioController(store);
const serialSource = new Esp32SerialSource({
  onFrame: (frame) => store.patch({
    analysisFrame: frame,
    serialStatus: 'live',
    serialMessage: `Live ESP32 frame ${frame.sequence}.`,
  }),
  onSampleFrame: (capturedSamples) => store.patch({ capturedSamples }),
  onBenchmark: (benchmarks) => store.patch({ benchmarks }),
  onLiveComparison: (liveComparison) => store.patch({ liveComparison }),
  onStatus: (serialStatus, serialMessage) => store.patch({
    serialStatus,
    serialMessage,
    captureStatus: ['waiting', 'live', 'warning'].includes(serialStatus)
      ? store.get().captureStatus === 'capturing' ? 'capturing' : 'ready'
      : store.get().captureStatus === 'captured' ? 'captured' : 'disconnected',
    captureMessage: ['waiting', 'live', 'warning'].includes(serialStatus)
      ? 'Ready to capture one measured ESP32 frame.'
      : store.get().captureStatus === 'captured'
        ? store.get().captureMessage
        : 'Connect ESP32 to capture a measured frame.',
  }),
});

const outlet = document.querySelector('#page-outlet');
const audioStatus = document.querySelector('#global-audio-status');
const serialStatus = document.querySelector('#global-serial-status');
const routeLinks = [...document.querySelectorAll('[data-route-link]')];

store.subscribe((state) => {
  audioStatus.textContent = state.isPlaying
    ? state.selectedFrequencies.length
      ? `Playing ${state.selectedFrequencies.join(' + ')} Hz`
      : 'Playing silence'
    : 'Audio stopped';
  audioStatus.dataset.active = String(state.isPlaying);
  serialStatus.textContent = ['live', 'waiting', 'requesting', 'warning'].includes(state.serialStatus)
    ? state.serialStatus === 'live' ? 'ESP32 live' : 'ESP32 connected'
    : 'ESP32 disconnected';
  serialStatus.dataset.active = String(['live', 'waiting', 'warning'].includes(state.serialStatus));
});

createRouter({
  outlet,
  context: { store, audioController, serialSource },
  onRouteChange: (route, pageRoot) => {
    store.patch({ route });
    document.title = `${route === 'demo' ? 'Demo' : 'Presenter'} · Fourier Signal Bench`;
    routeLinks.forEach((link) => {
      if (link.dataset.routeLink === route) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
    renderMath(pageRoot);
  },
});

window.addEventListener('pagehide', () => {
  audioController.stop();
  serialSource.disconnect();
});

if (!serialSource.supported) {
  store.patch({
    serialStatus: 'error',
    serialMessage: 'Web Serial is unavailable. Use desktop Chrome or Edge on localhost.',
  });
}
