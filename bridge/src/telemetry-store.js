class TelemetryStore {
  constructor() {
    this.latest = null;
  }

  record(values = {}) {
    this.latest = {
      bpm: Number(values.bpm) || 0,
      beatConfidence: Number(values.beatConfidence) || 0,
      microphoneLevel: Number(values.microphoneLevel) || 0,
      noiseFloor: Number(values.noiseFloor) || 0,
      bass: Number(values.bass) || 0,
      mid: Number(values.mid) || 0,
      treble: Number(values.treble) || 0,
      wifiRssi: Number(values.wifiRssi) || 0,
      receivedAt: Date.now(),
    };
    return this.get();
  }

  get() {
    return this.latest ? { ...this.latest } : null;
  }
}

module.exports = { TelemetryStore };
