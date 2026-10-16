import { SIGNAL_CONFIG } from '../../webpage/scripts/signal-analysis.mjs';
import { createFrameSampler, createMicResponse } from './mic-response.mjs';

export function createMicrophone(onState = () => {}, environment = globalThis) {
  let current = null, pending = null, generation = 0;
  const release = (session) => {
    session.source?.disconnect();
    session.analyser?.disconnect();
    session.stream?.getTracks().forEach((track) => track.stop());
    if (session.context && session.context.state !== 'closed') void session.context.close().catch(() => {});
  };
  const stop = () => {
    generation++;
    if (current) release(current);
    if (pending) release(pending);
    current = null;
    pending = null;
  };
  return {
    async start() {
      stop();
      const token = generation;
      const session = {};
      pending = session;
      onState('pending', 'Allow microphone access to start.');
      try {
        if (!environment.navigator?.mediaDevices?.getUserMedia || !environment.AudioContext) {
          throw new Error('Microphone access needs a supported browser on HTTPS or localhost.');
        }
        // Create/resume during the button gesture, before the permission await.
        try { session.context = new environment.AudioContext({ sampleRate: SIGNAL_CONFIG.sampleRateHz }); }
        catch (error) {
          if (error.name !== 'NotSupportedError') throw error;
          session.context = new environment.AudioContext();
        }
        await session.context.resume();
        if (token !== generation) { release(session); return; }
        session.stream = await environment.navigator.mediaDevices.getUserMedia({ audio: {
          echoCancellation: { ideal: false }, noiseSuppression: { ideal: false },
          autoGainControl: { ideal: false }, channelCount: { ideal: 1 },
        } });
        if (token !== generation) { release(session); return; }
        session.sampler = createFrameSampler(session.context.sampleRate);
        session.response = createMicResponse();
        session.analyser = session.context.createAnalyser();
        session.analyser.fftSize = session.sampler.fftSize;
        session.snapshot = new Float32Array(session.analyser.fftSize);
        session.source = session.context.createMediaStreamSource(session.stream);
        session.source.connect(session.analyser);
        session.stream.getAudioTracks().forEach((track) => track.addEventListener('ended', () => {
          if (current !== session) return;
          stop();
          onState('error', 'Microphone disconnected. Reconnect it and try again.');
        }, { once: true }));
        current = session;
        pending = null;
        onState('live', 'Keep quiet briefly while the microphone adjusts.');
      } catch (error) {
        release(session);
        if (token !== generation) return;
        pending = null;
        const messages = {
          NotAllowedError: 'Microphone access was blocked. Allow it in browser settings and try again.',
          NotFoundError: 'No microphone found. Connect one and try again.',
          NotReadableError: 'Microphone unavailable. Check whether another app is using it and try again.',
        };
        onState('error', messages[error.name] ?? error.message ?? 'Could not start the microphone. Try again.');
      }
    },
    stop,
    read(dt) {
      if (!current) return null;
      current.analyser.getFloatTimeDomainData(current.snapshot);
      return current.response.update(current.sampler.sample(current.snapshot), dt);
    },
  };
}
