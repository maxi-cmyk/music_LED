const MAXIMUM_SIMULTANEOUS_TONES = 5;
const MAXIMUM_SUMMED_GAIN = 0.8;
const GAIN_RAMP_SECONDS = 0.035;

export class AudioController {
  constructor(store) {
    this.store = store;
    this.context = null;
    this.masterGain = null;
    this.oscillators = new Map();
  }

  async play() {
    if (this.store.get().isPlaying) return;
    this.context ??= new AudioContext();
    await this.context.resume();
    this.masterGain ??= this.createMasterGain();
    this.store.patch({ isPlaying: true, isMuted: false });
    this.applyMuteState(false);
    this.syncSelection();
    this.updateMessage();
  }

  stop() {
    if (!this.store.get().isPlaying) return;
    for (const frequencyHz of [...this.oscillators.keys()]) this.removeTone(frequencyHz);
    this.store.patch({
      isPlaying: false,
      isMuted: false,
      audioMessage: 'Stopped. Selections can change silently until Play is pressed again.',
    });
    this.applyMuteState(false);
  }

  setMuted(isMuted) {
    if (!this.store.get().isPlaying) return;
    this.store.patch({ isMuted });
    this.applyMuteState(isMuted);
    this.updateMessage();
  }

  setSelection(frequencies) {
    this.store.patch({ selectedFrequencies: [...frequencies] });
    if (this.store.get().isPlaying) {
      this.syncSelection();
      this.updateMessage();
    }
  }

  setVolume(volumePercent) {
    this.store.patch({ volumePercent });
    this.updateToneGains();
  }

  createMasterGain() {
    const gain = this.context.createGain();
    gain.gain.value = 1;
    gain.connect(this.context.destination);
    return gain;
  }

  applyMuteState(isMuted) {
    if (!this.context || !this.masterGain) return;
    this.masterGain.gain.cancelScheduledValues(this.context.currentTime);
    this.masterGain.gain.setTargetAtTime(isMuted ? 0 : 1, this.context.currentTime, 0.015);
  }

  targetToneGain() {
    const maximumPerToneGain = MAXIMUM_SUMMED_GAIN / MAXIMUM_SIMULTANEOUS_TONES;
    return maximumPerToneGain * (this.store.get().volumePercent / 100);
  }

  syncSelection() {
    const selected = new Set(this.store.get().selectedFrequencies);
    for (const frequencyHz of this.oscillators.keys()) {
      if (!selected.has(frequencyHz)) this.removeTone(frequencyHz);
    }
    for (const frequencyHz of selected) {
      if (!this.oscillators.has(frequencyHz)) this.addTone(frequencyHz);
    }
    this.updateToneGains();
  }

  addTone(frequencyHz) {
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(frequencyHz, this.context.currentTime);
    gain.gain.setValueAtTime(0, this.context.currentTime);
    oscillator.connect(gain);
    gain.connect(this.masterGain);
    oscillator.start();
    gain.gain.linearRampToValueAtTime(
      this.targetToneGain(),
      this.context.currentTime + GAIN_RAMP_SECONDS,
    );
    this.oscillators.set(frequencyHz, { oscillator, gain });
  }

  removeTone(frequencyHz) {
    const voice = this.oscillators.get(frequencyHz);
    if (!voice || !this.context) return;
    const stopAt = this.context.currentTime + GAIN_RAMP_SECONDS;
    voice.gain.gain.cancelScheduledValues(this.context.currentTime);
    voice.gain.gain.setValueAtTime(voice.gain.gain.value, this.context.currentTime);
    voice.gain.gain.linearRampToValueAtTime(0, stopAt);
    voice.oscillator.stop(stopAt + 0.01);
    this.oscillators.delete(frequencyHz);
  }

  updateToneGains() {
    if (!this.context) return;
    const target = this.targetToneGain();
    for (const { gain } of this.oscillators.values()) {
      gain.gain.cancelScheduledValues(this.context.currentTime);
      gain.gain.setTargetAtTime(target, this.context.currentTime, 0.02);
    }
  }

  updateMessage() {
    const { selectedFrequencies: frequencies, isMuted } = this.store.get();
    const audioMessage = isMuted
      ? 'Muted. Playback stays active, so frequency changes are ready when you unmute.'
      : frequencies.length
      ? `Playing ${frequencies.join(' + ')} Hz. Selection changes update the sound live.`
      : 'Playback is active but silent. Select a frequency to hear it immediately.';
    this.store.patch({ audioMessage });
  }
}
