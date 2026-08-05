const VALID_MODES = new Set(['red', 'green', 'blue', 'white', 'sweep']);

class RgbTestStore {
  constructor(now = () => Date.now()) {
    this.now = now;
    this.mode = 'off';
    this.expiresAt = 0;
  }

  start(mode, durationMs = 10_000) {
    if (!VALID_MODES.has(mode)) throw new Error('invalid RGB test mode');
    this.mode = mode;
    this.expiresAt = this.now() + Math.min(15_000, Math.max(1_000, Number(durationMs) || 10_000));
    return this.get();
  }

  stop() {
    this.mode = 'off';
    this.expiresAt = 0;
    return this.get();
  }

  get() {
    const remainingMs = Math.max(0, this.expiresAt - this.now());
    if (remainingMs === 0) return { mode: 'off', remainingMs: 0 };
    return { mode: this.mode, remainingMs };
  }
}

module.exports = { RgbTestStore, VALID_MODES };
