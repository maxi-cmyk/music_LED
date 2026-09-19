import { SIGNAL_CONFIG } from './config.mjs';

function finiteNumber(value, fieldName) {
  const parsedValue = Number(value);
  if (!Number.isFinite(parsedValue)) throw new TypeError(`Invalid ${fieldName}`);
  return parsedValue;
}

function fieldsFromLine(line) {
  const fields = {};
  for (const token of line.split(',').slice(1)) {
    const separatorIndex = token.indexOf('=');
    if (separatorIndex <= 0) continue;
    fields[token.slice(0, separatorIndex)] = token.slice(separatorIndex + 1);
  }
  return fields;
}

function parseNumberList(value, fieldName, expectedLength) {
  const values = (value ?? '').split('|').map((item) => finiteNumber(item, fieldName));
  if (values.length !== expectedLength) {
    throw new TypeError(`Expected ${expectedLength} ${fieldName} values`);
  }
  return values;
}

function parseRgb(value) {
  const channels = parseNumberList(value, 'RGB channel', 3);
  if (channels.some((channel) => channel < 0 || channel > 255)) {
    throw new TypeError('Invalid RGB value');
  }
  return { red: channels[0], green: channels[1], blue: channels[2] };
}

export function parseSpectrumFrame(line) {
  if (!line.startsWith('SPECTRUM_FRAME,')) return null;
  const fields = fieldsFromLine(line);
  return {
    source: 'esp32',
    sequence: finiteNumber(fields.sequence, 'sequence'),
    sampleRateHz: finiteNumber(fields.sample_rate_hz, 'sample rate'),
    rms: finiteNumber(fields.rms, 'RMS'),
    noiseFloor: finiteNumber(fields.noise_floor, 'noise floor'),
    silenceThreshold: finiteNumber(fields.silence_threshold, 'silence threshold'),
    dominantBin: finiteNumber(fields.dominant_bin, 'dominant bin'),
    dominantHz: finiteNumber(fields.dominant_hz, 'dominant frequency'),
    bands: {
      red: finiteNumber(fields.bass, 'bass strength'),
      green: finiteNumber(fields.mid, 'midrange strength'),
      blue: finiteNumber(fields.treble, 'treble strength'),
    },
    rgb: parseRgb(fields.rgb ?? ''),
    magnitudes: parseNumberList(fields.bins, 'spectrum bin', SIGNAL_CONFIG.nyquistBin + 1),
    receivedAt: performance.now(),
  };
}

export function parseSampleFrame(line) {
  if (!line.startsWith('SAMPLE_FRAME,')) return null;
  const fields = fieldsFromLine(line);
  return {
    sequence: finiteNumber(fields.sequence, 'capture sequence'),
    raw: parseNumberList(fields.raw, 'raw sample', SIGNAL_CONFIG.sampleCount),
    prepared: parseNumberList(fields.prepared, 'prepared sample', SIGNAL_CONFIG.sampleCount),
    receivedAt: performance.now(),
  };
}

export function parseLiveComparison(line) {
  if (!line.startsWith('LIVE_TRANSFORM_COMPARISON,')) return null;
  const fields = fieldsFromLine(line);
  return {
    maximumComplexError: finiteNumber(fields.max_complex_error, 'maximum complex error'),
    directMicroseconds: finiteNumber(fields.dft_us, 'DFT duration'),
    fastMicroseconds: finiteNumber(fields.fft_us, 'FFT duration'),
  };
}

function parseBenchmarkRow(line) {
  const values = line.split(',').map(Number);
  if (values.length !== 9 || values.some((value) => !Number.isFinite(value))) return null;
  return {
    sampleCount: values[0],
    maximumComplexError: values[1],
    directMedianMicroseconds: values[2],
    directMinimumMicroseconds: values[3],
    directMaximumMicroseconds: values[4],
    fastMedianMicroseconds: values[5],
    fastMinimumMicroseconds: values[6],
    fastMaximumMicroseconds: values[7],
    speedup: values[8],
  };
}

export class SerialLineBuffer {
  constructor(onLine) {
    this.onLine = onLine;
    this.pendingText = '';
  }

  push(textChunk) {
    this.pendingText += textChunk;
    const lines = this.pendingText.split(/\r?\n/);
    this.pendingText = lines.pop() ?? '';
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine) this.onLine(trimmedLine);
    }
  }

  flush() {
    const remainingLine = this.pendingText.trim();
    this.pendingText = '';
    if (remainingLine) this.onLine(remainingLine);
  }
}

export class Esp32SerialSource {
  constructor({ onFrame, onSampleFrame, onBenchmark, onLiveComparison, onStatus }) {
    this.callbacks = { onFrame, onSampleFrame, onBenchmark, onLiveComparison, onStatus };
    this.port = null;
    this.reader = null;
    this.readLoopPromise = null;
    this.disconnectRequested = false;
    this.collectingBenchmark = false;
    this.benchmarkRows = [];
  }

  get supported() {
    return 'serial' in navigator;
  }

  get connected() {
    return this.port !== null && !this.disconnectRequested;
  }

  async connect() {
    if (!this.supported) throw new Error('Web Serial is not supported. Use desktop Chrome or Edge.');
    if (this.connected) return;
    this.callbacks.onStatus('requesting', 'Choose the ESP32 serial port.');
    this.port = await navigator.serial.requestPort();
    await this.port.open({ baudRate: 115200 });
    this.disconnectRequested = false;
    this.benchmarkRows = [];
    this.callbacks.onBenchmark([]);
    this.callbacks.onStatus('waiting', 'Connected. Waiting for ESP32 spectrum frames…');
    this.readLoopPromise = this.readLoop();
  }

  handleLine(line) {
    if (line === 'FOURIER_BENCHMARK_BEGIN') {
      this.collectingBenchmark = true;
      this.benchmarkRows = [];
      return;
    }
    if (line === 'FOURIER_BENCHMARK_END') {
      this.collectingBenchmark = false;
      this.callbacks.onBenchmark([...this.benchmarkRows]);
      return;
    }
    if (this.collectingBenchmark) {
      const row = parseBenchmarkRow(line);
      if (row) this.benchmarkRows.push(row);
      return;
    }

    const frame = parseSpectrumFrame(line);
    if (frame) return this.callbacks.onFrame(frame);
    const sampleFrame = parseSampleFrame(line);
    if (sampleFrame) return this.callbacks.onSampleFrame(sampleFrame);
    const comparison = parseLiveComparison(line);
    if (comparison) this.callbacks.onLiveComparison(comparison);
  }

  async readLoop() {
    const decoder = new TextDecoder();
    const lineBuffer = new SerialLineBuffer((line) => {
      try {
        this.handleLine(line);
      } catch (error) {
        this.callbacks.onStatus('warning', `Skipped malformed telemetry: ${error.message}`);
      }
    });

    try {
      while (this.port?.readable && !this.disconnectRequested) {
        this.reader = this.port.readable.getReader();
        try {
          while (!this.disconnectRequested) {
            const { value, done } = await this.reader.read();
            if (done) break;
            lineBuffer.push(decoder.decode(value, { stream: true }));
          }
        } finally {
          this.reader.releaseLock();
          this.reader = null;
        }
      }
      lineBuffer.push(decoder.decode());
      lineBuffer.flush();
    } catch (error) {
      if (!this.disconnectRequested) {
        this.callbacks.onStatus('error', `Serial connection lost: ${error.message}`);
      }
    } finally {
      if (!this.disconnectRequested) this.port = null;
    }
  }

  async requestSampleCapture() {
    if (!this.connected || !this.port.writable) throw new Error('Connect the ESP32 first.');
    const writer = this.port.writable.getWriter();
    try {
      await writer.write(new TextEncoder().encode('CAPTURE_FRAME\n'));
    } finally {
      writer.releaseLock();
    }
  }

  async disconnect() {
    if (!this.port) return;
    this.disconnectRequested = true;
    await this.reader?.cancel().catch(() => {});
    await this.readLoopPromise?.catch(() => {});
    await this.port.close().catch(() => {});
    this.port = null;
    this.readLoopPromise = null;
    this.callbacks.onStatus('disconnected', 'ESP32 disconnected. Connect again to resume measurements.');
  }
}
