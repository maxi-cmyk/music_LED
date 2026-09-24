import { SIGNAL_CONFIG } from './config.mjs?release=20260924-distill-23';

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

function parseCaptureChunk(line, prefix) {
  if (!line.startsWith(`${prefix},`)) return null;
  const fields = fieldsFromLine(line);
  return {
    id: finiteNumber(fields.id, 'capture ID'),
    start: finiteNumber(fields.start, 'capture chunk start'),
    values: parseNumberList(fields.values, `${prefix} value`, Number(fields.count)),
  };
}

function writeCaptureChunk(target, receivedIndices, chunk, expectedLength, fieldName) {
  if (!Number.isInteger(chunk.start) || chunk.start < 0
      || chunk.start + chunk.values.length > expectedLength) {
    throw new TypeError(`Invalid ${fieldName} chunk range`);
  }
  chunk.values.forEach((value, offset) => {
    const index = chunk.start + offset;
    if (receivedIndices.has(index)) throw new TypeError(`Duplicate ${fieldName} value ${index}`);
    target[index] = value;
    receivedIndices.add(index);
  });
}

export class CaptureTransactionAssembler {
  constructor(onCapture) {
    this.onCapture = onCapture;
    this.transaction = null;
  }

  reset() {
    this.transaction = null;
  }

  handleLine(line) {
    if (line.startsWith('CAPTURE_BEGIN,')) {
      const fields = fieldsFromLine(line);
      const id = finiteNumber(fields.id, 'capture ID');
      const sampleCount = finiteNumber(fields.n, 'sample count');
      if (!Number.isInteger(sampleCount) || sampleCount !== SIGNAL_CONFIG.sampleCount) {
        throw new TypeError(`Unsupported capture sample count ${sampleCount}`);
      }
      const binCount = SIGNAL_CONFIG.nyquistBin + 1;
      this.transaction = {
        id,
        sampleCount,
        sampleRateHz: finiteNumber(fields.sample_rate_hz, 'sample rate'),
        sampleSpanMicroseconds: finiteNumber(fields.sample_span_us, 'sample span'),
        mean: finiteNumber(fields.mean, 'frame mean'),
        rms: finiteNumber(fields.rms, 'RMS'),
        noiseFloor: finiteNumber(fields.noise_floor, 'noise floor'),
        silenceThreshold: finiteNumber(fields.silence_threshold, 'silence threshold'),
        aboveSilenceThreshold: finiteNumber(fields.above_silence, 'silence state') === 1,
        raw: new Array(sampleCount),
        prepared: new Array(sampleCount),
        real: new Array(binCount),
        imaginary: new Array(binCount),
        magnitudes: new Array(binCount),
        received: {
          raw: new Set(), prepared: new Set(), real: new Set(), imaginary: new Set(), magnitudes: new Set(),
        },
        output: null,
      };
      return true;
    }

    const prefixes = {
      CAPTURE_RAW: ['raw', SIGNAL_CONFIG.sampleCount],
      CAPTURE_PREPARED: ['prepared', SIGNAL_CONFIG.sampleCount],
      CAPTURE_REAL: ['real', SIGNAL_CONFIG.nyquistBin + 1],
      CAPTURE_IMAGINARY: ['imaginary', SIGNAL_CONFIG.nyquistBin + 1],
      CAPTURE_MAGNITUDES: ['magnitudes', SIGNAL_CONFIG.nyquistBin + 1],
    };
    for (const [prefix, [fieldName, expectedLength]] of Object.entries(prefixes)) {
      const chunk = parseCaptureChunk(line, prefix);
      if (!chunk) continue;
      if (!this.transaction || chunk.id !== this.transaction.id) {
        throw new TypeError(`Unexpected capture ID ${chunk.id}`);
      }
      writeCaptureChunk(
        this.transaction[fieldName],
        this.transaction.received[fieldName],
        chunk,
        expectedLength,
        fieldName,
      );
      return true;
    }

    if (line.startsWith('CAPTURE_OUTPUT,')) {
      const fields = fieldsFromLine(line);
      const id = finiteNumber(fields.id, 'capture ID');
      if (!this.transaction || id !== this.transaction.id) throw new TypeError(`Unexpected capture ID ${id}`);
      this.transaction.output = {
        dominantBin: finiteNumber(fields.dominant_bin, 'dominant bin'),
        dominantHz: finiteNumber(fields.dominant_hz, 'dominant frequency'),
        bands: {
          red: finiteNumber(fields.bass, 'bass strength'),
          green: finiteNumber(fields.mid, 'midrange strength'),
          blue: finiteNumber(fields.treble, 'treble strength'),
        },
        rgb: parseRgb(fields.rgb ?? ''),
      };
      return true;
    }

    if (!line.startsWith('CAPTURE_END,')) return false;
    const fields = fieldsFromLine(line);
    const id = finiteNumber(fields.id, 'capture ID');
    if (!this.transaction || id !== this.transaction.id) throw new TypeError(`Unexpected capture ID ${id}`);
    const transaction = this.transaction;
    const incompleteField = Object.entries(transaction.received)
      .find(([fieldName, indices]) => indices.size !== transaction[fieldName].length);
    if (incompleteField || !transaction.output) {
      this.reset();
      throw new TypeError(`Incomplete capture${incompleteField ? ` ${incompleteField[0]}` : ' output'}`);
    }
    for (let binIndex = 0; binIndex < transaction.magnitudes.length; binIndex += 1) {
      const coefficientMagnitude = Math.hypot(
        transaction.real[binIndex],
        transaction.imaginary[binIndex],
      );
      const allowedDifference = Math.max(0.02, transaction.magnitudes[binIndex] * 0.001);
      if (Math.abs(coefficientMagnitude - transaction.magnitudes[binIndex]) > allowedDifference) {
        this.reset();
        throw new TypeError(`Capture coefficient and magnitude disagree at bin ${binIndex}`);
      }
    }

    const frame = {
      source: 'esp32',
      sequence: transaction.id,
      sampleRateHz: transaction.sampleRateHz,
      rms: transaction.rms,
      noiseFloor: transaction.noiseFloor,
      silenceThreshold: transaction.silenceThreshold,
      dominantBin: transaction.output.dominantBin,
      dominantHz: transaction.output.dominantHz,
      bands: transaction.output.bands,
      rgb: transaction.output.rgb,
      magnitudes: transaction.magnitudes,
      receivedAt: performance.now(),
    };
    const capture = {
      id: `ESP32-${String(transaction.id).padStart(3, '0')}`,
      captureId: transaction.id,
      source: 'esp32',
      sourceLabel: 'Captured from one synchronized ESP32 sampling window',
      raw: transaction.raw,
      prepared: transaction.prepared,
      mean: transaction.mean,
      coefficients: { real: transaction.real, imaginary: transaction.imaginary },
      frame,
      sampleSpanMicroseconds: transaction.sampleSpanMicroseconds,
      aboveSilenceThreshold: transaction.aboveSilenceThreshold,
    };
    this.reset();
    this.onCapture(capture);
    return true;
  }
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
  constructor({ onFrame, onSampleFrame, onCapture, onBenchmark, onLiveComparison, onStatus }) {
    this.callbacks = { onFrame, onSampleFrame, onCapture, onBenchmark, onLiveComparison, onStatus };
    this.port = null;
    this.reader = null;
    this.readLoopPromise = null;
    this.disconnectRequested = false;
    this.collectingBenchmark = false;
    this.benchmarkRows = [];
    this.pendingCapture = null;
    this.captureAssembler = new CaptureTransactionAssembler((capture) => {
      this.callbacks.onCapture?.(capture);
      if (this.pendingCapture) {
        clearTimeout(this.pendingCapture.timeoutId);
        this.pendingCapture.resolve(capture);
        this.pendingCapture = null;
      }
    });
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
    if (this.captureAssembler.handleLine(line)) return;
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
        if (line.startsWith('CAPTURE_') && this.pendingCapture) {
          clearTimeout(this.pendingCapture.timeoutId);
          this.pendingCapture.reject(new Error(`Invalid capture telemetry: ${error.message}`));
          this.pendingCapture = null;
          this.captureAssembler.reset();
        }
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
      if (!this.disconnectRequested) {
        this.port = null;
        if (this.pendingCapture) {
          clearTimeout(this.pendingCapture.timeoutId);
          this.pendingCapture.reject(new Error('The serial connection ended before the capture completed.'));
          this.pendingCapture = null;
          this.captureAssembler.reset();
        }
      }
    }
  }

  async requestSampleCapture() {
    return this.requestCapture();
  }

  async requestCapture() {
    if (!this.connected || !this.port.writable) throw new Error('Connect the ESP32 first.');
    if (this.pendingCapture) throw new Error('A frame capture is already in progress.');
    this.captureAssembler.reset();
    let resolveCapture;
    let rejectCapture;
    const capturePromise = new Promise((resolve, reject) => {
      resolveCapture = resolve;
      rejectCapture = reject;
    });
    const timeoutId = setTimeout(() => {
      if (!this.pendingCapture) return;
      this.captureAssembler.reset();
      this.pendingCapture = null;
      rejectCapture(new Error('The ESP32 capture timed out. Try again.'));
    }, 8000);
    this.pendingCapture = { resolve: resolveCapture, reject: rejectCapture, timeoutId };
    const writer = this.port.writable.getWriter();
    try {
      await writer.write(new TextEncoder().encode('CAPTURE_FRAME\n'));
    } catch (error) {
      clearTimeout(timeoutId);
      this.pendingCapture = null;
      throw error;
    } finally {
      writer.releaseLock();
    }
    return capturePromise;
  }

  async disconnect() {
    if (!this.port) return;
    this.disconnectRequested = true;
    if (this.pendingCapture) {
      clearTimeout(this.pendingCapture.timeoutId);
      this.pendingCapture.reject(new Error('The ESP32 disconnected before the capture completed.'));
      this.pendingCapture = null;
      this.captureAssembler.reset();
    }
    await this.reader?.cancel().catch(() => {});
    await this.readLoopPromise?.catch(() => {});
    await this.port.close().catch(() => {});
    this.port = null;
    this.readLoopPromise = null;
    this.callbacks.onStatus('disconnected', 'ESP32 disconnected. Connect again to resume measurements.');
  }
}
