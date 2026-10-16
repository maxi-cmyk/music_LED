import test from 'node:test';
import assert from 'node:assert/strict';
import { analyseSamples } from '../../webpage/scripts/signal-analysis.mjs';
import { createMicResponse, createFrameSampler } from '../src/mic-response.mjs';
import { createMicrophone } from '../src/microphone.mjs';

const tone = (frequencies, amplitude = 0.01, rate = 6400, length = 128) =>
  Float64Array.from({ length }, (_, n) => frequencies.reduce((sum, [hz, strength = 1]) =>
    sum + amplitude * strength * Math.sin(2 * Math.PI * hz * n / rate), 0));
const silence = new Float64Array(128);
function warmed(noise = silence, fps = 60) {
  const response = createMicResponse();
  for (let n = 0; n < fps; n++) response.update(noise, 1 / fps);
  return response;
}
function run(response, samples, seconds = 2, fps = 60) {
  let result;
  for (let n = 0; n < seconds * fps; n++) result = response.update(samples, 1 / fps);
  return result;
}

test('equal tones have equal response; shared gain preserves a bass-heavy mixture', () => {
  const equal = run(warmed(), tone([[200], [500], [2000]]));
  assert(Math.max(...equal.levels) - Math.min(...equal.levels) < 0.005);
  const mixed = run(warmed(), tone([[200, 1], [500, 0.5], [2000, 0.25]]));
  assert(Math.abs(mixed.levels[1] / mixed.levels[0] - 0.5) < 0.01);
  assert(Math.abs(mixed.levels[2] / mixed.levels[0] - 0.25) < 0.01);
});

test('microphone level differences of 100x settle to comparable movement', () => {
  const quiet = run(warmed(), tone([[500]], 0.0001));
  const loud = run(warmed(), tone([[500]], 0.01));
  assert(Math.abs(quiet.levels[1] - loud.levels[1]) < 0.005);
  assert(quiet.levels[1] > 0.65);
});

test('silence and calibrated room noise stay quiet; signal remains detectable', () => {
  const noise = tone([[200], [500], [2000]], 0.0001);
  const response = warmed(noise);
  const quiet = run(response, noise, 20);
  assert.equal(quiet.active, false);
  assert.deepEqual(quiet.levels, [0, 0, 0]);
  assert(run(response, tone([[500]], 0.005)).levels[1] > 0.65);
  assert(Math.max(...run(response, silence, 4).levels) < 1e-6);
  assert.deepEqual(run(warmed(), silence, 20).levels, [0, 0, 0]);
});

test('loud transients are bounded, gain recovers slowly, sustained input stays active', () => {
  const response = warmed();
  run(response, tone([[200]], 0.001));
  const burst = run(response, tone([[200]], 0.5), 0.1);
  assert(burst.levels.every((level) => Number.isFinite(level) && level >= 0 && level <= 1));
  const immediate = run(response, tone([[200]], 0.001), 0.5);
  const recovered = run(response, tone([[200]], 0.001), 15);
  assert(recovered.active);
  assert(recovered.levels[0] > immediate.levels[0]);
  assert(recovered.levels[0] > 0.65);
});

test('envelopes behave consistently at 30, 60 and 120 fps', () => {
  const results = [30, 60, 120].map((fps) => run(warmed(silence, fps), tone([[500]]), 0.5, fps).levels[1]);
  assert(Math.max(...results) - Math.min(...results) < 0.005);
});

test('resampling preserves band assignment at 6.4, 44.1, 48 and 96 kHz', () => {
  for (const rate of [6400, 44100, 48000, 96000]) {
    const sampler = createFrameSampler(rate);
    for (const [i, hz] of [200, 500, 2000].entries()) {
      const { bands, dominantHz } = analyseSamples(sampler.sample(tone([[hz]], 0.01, rate, sampler.fftSize)));
      assert.equal(dominantHz, hz);
      assert.equal(Object.values(bands).indexOf(Math.max(...Object.values(bands))), i);
    }
  }
});

test('downsampling rejects an 6 kHz tone that would alias into bass/mids', () => {
  const sampler = createFrameSampler(48000);
  const low = analyseSamples(sampler.sample(tone([[500]], 0.1, 48000, sampler.fftSize))).rms;
  const high = analyseSamples(sampler.sample(tone([[6000]], 0.1, 48000, sampler.fftSize))).rms;
  assert(high / low < 0.01);
});

function fakeEnvironment(getUserMedia, unsupported = false) {
  const contexts = [];
  class AudioContext {
    constructor(options) {
      if (unsupported && options) throw Object.assign(new Error(), { name: 'NotSupportedError' });
      this.sampleRate = options?.sampleRate ?? 48000;
      this.state = 'running';
      contexts.push(this);
    }
    async resume() {}
    async close() { this.state = 'closed'; }
    createAnalyser() { return { fftSize: 0, disconnect() {}, getFloatTimeDomainData(buffer) { buffer.fill(0); } }; }
    createMediaStreamSource() { return { connect() {}, disconnect() {} }; }
  }
  return { contexts, AudioContext, navigator: { mediaDevices: { getUserMedia } } };
}
function fakeStream() {
  const track = { stopped: false, stop() { this.stopped = true; },
    addEventListener(event, callback) { if (event === 'ended') this.onEnded = callback; } };
  return { track, getTracks: () => [track], getAudioTracks: () => [track] };
}

test('unsupported sample rate falls back and stopping releases resources', async () => {
  const stream = fakeStream();
  const environment = fakeEnvironment(async () => stream, true);
  const mic = createMicrophone(() => {}, environment);
  await mic.start();
  assert(mic.read(1 / 60).calibrating);
  mic.stop();
  assert(stream.track.stopped);
  assert.equal(environment.contexts[0].state, 'closed');
  assert.equal(mic.read(1 / 60), null);
});

test('cancelled permission request cannot activate mic; reconnect resets calibration', async () => {
  let resolve;
  const environment = fakeEnvironment(() => new Promise((r) => { resolve = r; }));
  const states = [];
  const mic = createMicrophone((status) => states.push(status), environment);
  const pending = mic.start();
  await Promise.resolve();
  mic.stop();
  assert.equal(environment.contexts[0].state, 'closed');
  const stream = fakeStream();
  resolve(stream);
  await pending;
  assert(stream.track.stopped);
  assert(!states.includes('live'));
  environment.navigator.mediaDevices.getUserMedia = async () => fakeStream();
  await mic.start();
  assert(mic.read(0.1).calibrating);
  mic.stop();
});

test('permission denial reports actionable error and closes audio context', async () => {
  const environment = fakeEnvironment(async () => { throw Object.assign(new Error(), { name: 'NotAllowedError' }); });
  let last;
  const mic = createMicrophone((...state) => { last = state; }, environment);
  await mic.start();
  assert.equal(last[0], 'error');
  assert.match(last[1], /browser settings/);
  assert.equal(environment.contexts[0].state, 'closed');
});


test('device disconnection stops analysis and reports a reconnect action', async () => {
  const stream = fakeStream();
  const environment = fakeEnvironment(async () => stream);
  let last;
  const mic = createMicrophone((...state) => { last = state; }, environment);
  await mic.start();
  stream.track.onEnded();
  assert.equal(last[0], 'error');
  assert.match(last[1], /Reconnect/);
  assert.equal(mic.read(0.1), null);
  assert.equal(environment.contexts[0].state, 'closed');
});
