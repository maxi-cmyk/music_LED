import { parseSpectrumFrame, SerialLineBuffer } from './signal-analysis.mjs?v=analysis-lab-1';

export class Esp32SerialSource {
  constructor({ onFrame, onStatus }) {
    this.onFrame = onFrame;
    this.onStatus = onStatus;
    this.port = null;
    this.reader = null;
    this.readLoopPromise = null;
    this.disconnectRequested = false;
  }

  get supported() {
    return 'serial' in navigator;
  }

  get connected() {
    return this.port !== null && !this.disconnectRequested;
  }

  async connect() {
    if (!this.supported) throw new Error('Web Serial is not supported in this browser. Use desktop Chrome or Edge.');
    if (this.connected) return;

    this.onStatus('requesting', 'Choose the ESP32 serial port.');
    this.port = await navigator.serial.requestPort();
    await this.port.open({ baudRate: 115200 });
    this.disconnectRequested = false;
    this.onStatus('waiting', 'Connected. Waiting for the ESP32 startup calibration and spectrum frames…');
    this.readLoopPromise = this.readLoop();
  }

  async readLoop() {
    const decoder = new TextDecoder();
    const lineBuffer = new SerialLineBuffer((line) => {
      try {
        const frame = parseSpectrumFrame(line);
        if (frame) this.onFrame(frame);
      } catch (error) {
        this.onStatus('warning', `Skipped malformed telemetry: ${error.message}`);
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
      if (!this.disconnectRequested) this.onStatus('error', `Serial connection lost: ${error.message}`);
    } finally {
      if (!this.disconnectRequested) this.port = null;
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
    this.onStatus('disconnected', 'ESP32 disconnected. Select Connect ESP32 to resume live measurements.');
  }
}
