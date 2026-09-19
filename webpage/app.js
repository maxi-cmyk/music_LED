import { AudioController } from './scripts/audio-controller.mjs';
import { renderMath } from './scripts/math-renderer.mjs';
import { createRouter } from './scripts/router.mjs';
import { Esp32SerialSource } from './scripts/serial-source.mjs';
import { createStore, initialState } from './scripts/shared-state.mjs';

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
  onStatus: (serialStatus, serialMessage) => store.patch({ serialStatus, serialMessage }),
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
