export function createStore(initialState) {
  let state = structuredClone(initialState);
  const subscribers = new Set();

  return {
    get() {
      return state;
    },
    patch(changes) {
      state = { ...state, ...changes };
      subscribers.forEach((subscriber) => subscriber(state));
    },
    subscribe(subscriber, emitImmediately = true) {
      subscribers.add(subscriber);
      if (emitImmediately) subscriber(state);
      return () => subscribers.delete(subscriber);
    },
  };
}

export const initialState = Object.freeze({
  route: 'demo',
  selectedFrequencies: [200],
  activePreset: null,
  volumePercent: 20,
  isPlaying: false,
  isMuted: false,
  audioMessage: 'Ready. Playback starts only when you press Play.',
  serialStatus: 'disconnected',
  serialMessage: 'Close Arduino Serial Monitor, then connect the board.',
  analysisFrame: null,
  frozenFrame: null,
  isFrozen: false,
  scaleMode: 'auto',
  scaleMaximum: 1,
  benchmarks: [],
  liveComparison: null,
  capturedSamples: null,
  capturedEvidence: null,
  captureStatus: 'disconnected',
  captureMessage: 'Connect ESP32 for measured data, or press Shift+E to load a seeded demo frame.',
  captureStage: 0,
  selectedCaptureBin: 4,
});
