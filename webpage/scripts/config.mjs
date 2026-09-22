export const SIGNAL_CONFIG = Object.freeze({
  sampleCount: 128,
  sampleRateHz: 6400,
  binSpacingHz: 50,
  nyquistBin: 64,
  generatedPeakAmplitude: 72,
  perToneHeadroomDivisor: 3,
  brightnessPerMagnitudeUnit: 0.12,
  crossBandLeakageRatio: 0.15,
  maximumBrightness: 255,
  bands: Object.freeze({
    red: Object.freeze({ name: 'Bass', firstBin: 1, lastBin: 5, gain: 1.0, colour: '#ff5b45' }),
    green: Object.freeze({ name: 'Mids', firstBin: 6, lastBin: 20, gain: 0.82, colour: '#91e75c' }),
    blue: Object.freeze({ name: 'Treble', firstBin: 21, lastBin: 50, gain: 0.92, colour: '#5cbcff' }),
  }),
});

export const FREQUENCIES = Object.freeze([
  Object.freeze({ frequencyHz: 200, label: 'Bass', detail: 'Red · low sound', band: 'red' }),
  Object.freeze({ frequencyHz: 500, label: 'Mids', detail: 'Green · voice range', band: 'green' }),
  Object.freeze({ frequencyHz: 1000, label: 'Upper mids', detail: 'Green · brighter mids', band: 'green' }),
  Object.freeze({ frequencyHz: 2000, label: 'Treble', detail: 'Blue · high sound', band: 'blue' }),
  Object.freeze({ frequencyHz: 225, label: 'Leakage', detail: 'Between two measured frequencies', band: 'leakage' }),
]);

export const PRESETS = Object.freeze([
  Object.freeze({ id: 'bass', label: 'Bass', frequencies: [200], colourClass: 'red-preset' }),
  Object.freeze({ id: 'mids', label: 'Mids', frequencies: [500], colourClass: 'green-preset' }),
  Object.freeze({ id: 'treble', label: 'Treble', frequencies: [2000], colourClass: 'blue-preset' }),
  Object.freeze({ id: 'yellow', label: 'Bass + Mids', frequencies: [200, 500], colourClass: 'yellow-preset' }),
  Object.freeze({ id: 'magenta', label: 'Bass + Treble', frequencies: [200, 2000], colourClass: 'magenta-preset' }),
  Object.freeze({ id: 'cyan', label: 'Mids + Treble', frequencies: [500, 2000], colourClass: 'cyan-preset' }),
  Object.freeze({ id: 'white', label: 'All bands', frequencies: [200, 500, 2000], colourClass: 'white-preset' }),
  Object.freeze({ id: 'leakage', label: 'Leakage example', frequencies: [225], colourClass: 'signal-preset' }),
  Object.freeze({ id: 'silence', label: 'Silence', frequencies: [], colourClass: 'silence-preset' }),
]);
