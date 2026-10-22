import { analyseSamples, SIGNAL_CONFIG } from '../../../webpage/scripts/signal-analysis.mjs';

export const CHANNELS = ['red', 'green', 'blue'];
export const REST_RADIUS = 0.35;
export const RADIUS_RANGE = 1.8;
const follow = (value, target, dt, seconds) => value + (target - value) * -Math.expm1(-dt / seconds);

// Snapshot resampling with a windowed-sinc low-pass filter prevents high-frequency
// microphone input from aliasing into the firmware's bass/mid/treble bands.
export function createFrameSampler(sampleRate) {
  const ratio = sampleRate / SIGNAL_CONFIG.sampleRateHz;
  if (!Number.isFinite(ratio) || ratio < 1) throw new RangeError('Unsupported microphone sample rate');
  const half = Math.ceil(16 * ratio);
  const required = Math.ceil((SIGNAL_CONFIG.sampleCount - 1) * ratio) + 2 * half + 2;
  const fftSize = 2 ** Math.ceil(Math.log2(required));
  if (fftSize > 32768) throw new RangeError('Unsupported microphone sample rate');
  const cutoff = 0.45 / ratio;
  const kernels = Array.from({ length: SIGNAL_CONFIG.sampleCount }, (_, n) => {
    const position = half + n * ratio;
    const first = Math.ceil(position - half);
    const weights = [];
    let total = 0;
    for (let j = first; j <= Math.floor(position + half); j++) {
      const distance = j - position;
      const x = 2 * cutoff * distance;
      const sinc = Math.abs(x) < 1e-10 ? 1 : Math.sin(Math.PI * x) / (Math.PI * x);
      const weight = 2 * cutoff * sinc * (0.5 + 0.5 * Math.cos(Math.PI * distance / half));
      weights.push(weight);
      total += weight;
    }
    return { first, weights: weights.map((weight) => weight / total) };
  });
  const frame = new Float64Array(SIGNAL_CONFIG.sampleCount);
  return {
    fftSize,
    sample(snapshot) {
      const offset = snapshot.length - required;
      if (offset < 0) throw new RangeError('Microphone snapshot is too short');
      kernels.forEach(({ first, weights }, n) => {
        frame[n] = weights.reduce((sum, weight, k) => sum + weight * snapshot[offset + first + k], 0);
      });
      return frame;
    },
  };
}

export function createMicResponse() {
  let elapsed = 0, quietest = Infinity, floor = 1e-5, open = false, gain = null;
  let levels = [0, 0, 0];
  return {
    update(samples, dt) {
      dt = Math.max(0, Math.min(dt, 0.1));
      const { bands, rms } = analyseSamples(samples);
      elapsed += dt;
      if (elapsed <= 0.75) {
        quietest = Math.min(quietest, rms);
        floor = Math.max(1e-5, Math.min(0.003, quietest));
        return { levels: [...levels], calibrating: true, active: false };
      }
      open = rms > floor * (open ? 1.6 : 2.5);
      // Track a changing quiet room only while the gate is shut. Never learn
      // sustained music as the noise floor or increase gain during silence.
      if (!open) floor = follow(floor, Math.max(1e-5, rms), dt, rms < floor ? 0.5 : 5);
      const strengths = CHANNELS.map((channel) => bands[channel]);
      const strongest = Math.max(...strengths);
      if (open && strongest > 0) {
        const desired = Math.max(0.01, Math.min(20000, 0.7 / strongest));
        gain = gain === null ? desired : follow(gain, desired, dt, desired < gain ? 0.08 : 3);
      }
      // One gain for the entire spectrum, without the LED-specific gains,
      // cross-band suppression, 8-bit quantisation, or brightness clipping.
      levels = strengths.map((strength, i) => {
        const target = open ? Math.min(1, strength * (gain ?? 0)) : 0;
        return follow(levels[i], target, dt, target > levels[i] ? 0.09 : 0.25);
      });
      return { levels: [...levels], calibrating: false, active: open };
    },
  };
}
