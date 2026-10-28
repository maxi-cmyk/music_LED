import { useEffect, useMemo, useRef, useState } from 'react';
import { analyseGeneratedFrequencies, SIGNAL_CONFIG } from '../../../webpage/scripts/signal-analysis.mjs';
import { M, TG, Rich } from '../math/Tex.jsx';

const TONES = [100, 200, 225, 300, 500, 800, 1000, 1500, 2000, 2500, 3500];
const RED = '#ff6b5a', GREEN = '#8fe36a', BLUE = '#5cbcff', GREY = '#6a6a64';
const bandColour = (bin) => (bin >= 1 && bin <= 5 ? RED : bin >= 6 && bin <= 20 ? GREEN : bin >= 21 && bin <= 50 ? BLUE : GREY);
const toneNote = (hz) => (hz === 225 ? 'between two slots' : hz > 3200 ? 'above the limit' : hz <= 250 ? 'bass' : hz <= 1000 ? 'mids' : 'treble');
const BX = 40, PITCH = 12, BASE = 330, TOP = 150; // spectrum: left edge, bar pitch, baseline, height of a full-scale bar
const FULL = 1000;

// pick tones, hear them, and watch the same analysis the ESP32 runs: waveform, spectrum, LED colour
export default function Sandbox({ onHome }) {
  const [tones, setTones] = useState([200]);
  const [volume, setVolume] = useState(20);
  const [playing, setPlaying] = useState(false);
  const audio = useRef(null);
  const result = useMemo(() => analyseGeneratedFrequencies(tones, volume), [tones, volume]);
  const { magnitudes, preparedSamples, rgb } = result;

  // rebuild the oscillators whenever the tones, volume or play state change
  useEffect(() => {
    if (!playing || !tones.length) return undefined;
    const context = audio.current ??= new AudioContext();
    context.resume();
    const master = context.createGain();
    master.gain.value = (volume / 100) * 0.6 / tones.length;
    master.connect(context.destination);
    const oscillators = tones.map((hz) => { const o = context.createOscillator(); o.frequency.value = hz; o.connect(master); o.start(); return o; });
    return () => { oscillators.forEach((o) => { o.stop(); o.disconnect(); }); master.disconnect(); };
  }, [playing, tones, volume]);
  useEffect(() => () => { audio.current?.close(); }, []);

  const toggle = (hz) => setTones((cur) => (cur.includes(hz) ? cur.filter((x) => x !== hz) : [...cur, hz]));
  const peak = Math.max(60, ...preparedSamples.map(Math.abs));
  const wave = preparedSamples.map((v, n) => `${BX + n * (65 * PITCH) / 127},${55 - 45 * v / peak}`).join(' ');
  const led = `rgb(${rgb.red},${rgb.green},${rgb.blue})`;
  const shown = (hz) => (hz > 3200 ? `${hz} Hz shows up as ${6400 - hz} Hz` : null);
  const folded = tones.filter((hz) => hz > 3200);

  return (
    <div className="sandbox">
      <div className="kicker"><i></i><i></i><i></i><span>Sandbox</span></div>
      <div className="stage">
        <svg viewBox="0 0 1000 400" role="img" aria-label="Waveform, spectrum and LED colour for the selected tones">
          <M x={BX} y="12" fill="var(--dim)" fontSize="18">One 20 ms frame, centred and faded at the edges</M>
          <polyline points={wave} fill="none" stroke="var(--chalk)" strokeWidth="1.6" />
          <line x1={BX} x2={BX + 65 * PITCH} y1="55" y2="55" stroke="var(--dim)" strokeDasharray="3 6" opacity="0.5" />
          <M x={BX} y="140" fill="var(--dim)" fontSize="18">Strength at each frequency (50 Hz slots)</M>
          {magnitudes.map((m, b) => (
            <rect key={b} x={BX + b * PITCH + 1} y={BASE - Math.max(1.5, Math.min(TOP, TOP * m / FULL))} width={PITCH - 2} height={Math.max(1.5, Math.min(TOP, TOP * m / FULL))} fill={bandColour(b)} opacity={m > 4 ? 1 : 0.35} />
          ))}
          <line x1={BX} x2={BX + 65 * PITCH} y1={BASE + 2} y2={BASE + 2} stroke="var(--dim)" opacity="0.5" />
          {[['Bass', 1, 5, RED], ['Mids', 6, 20, GREEN], ['Treble', 21, 50, BLUE]].map(([name, a, z, c]) => (
            <TG key={name}>
              <path d={`M${BX + a * PITCH} ${BASE + 12} v5 H${BX + (z + 1) * PITCH} v-5`} fill="none" stroke={c} />
              <M x={BX + (a + z + 1) * PITCH / 2} y={BASE + 36} textAnchor="middle" fill={c} fontSize="18">{name}</M>
            </TG>
          ))}
          <M x={BX} y={BASE + 62} fill="var(--dim)" fontSize="17">0 Hz</M>
          <M x={BX + 65 * PITCH} y={BASE + 62} fill="var(--dim)" fontSize="17" textAnchor="end">3,200 Hz</M>
          <circle cx="905" cy="205" r="62" fill={led} />
          <circle cx="905" cy="205" r="62" fill="none" stroke="var(--dim)" opacity="0.4" />
          <M x="905" y="300" textAnchor="middle" fill="var(--chalk)" fontSize="20">{`R ${rgb.red}  G ${rgb.green}  B ${rgb.blue}`}</M>
          <M x="905" y="322" textAnchor="middle" fill="var(--dim)" fontSize="17">the LED colour</M>
        </svg>
        <Rich as="p" className="note">
          {folded.length ? `${folded.map(shown).join('; ')}: the ESP32 cannot tell them apart, so it folds back.` : tones.includes(225) ? '225 Hz falls between the 200 Hz and 250 Hz slots, so its strength spreads over both.' : tones.length ? 'Add or remove tones to change the colour.' : 'Pick a tone to begin.'}
        </Rich>
      </div>
      <div className="tones" role="group" aria-label="Tones">
        {TONES.map((hz) => (
          <button key={hz} aria-pressed={tones.includes(hz)} onClick={() => toggle(hz)}>
            <strong><Rich>{`${hz} Hz`}</Rich></strong><span>{toneNote(hz)}</span>
          </button>
        ))}
        <button className="clear" onClick={() => setTones([])}>Clear</button>
      </div>
      <div className="sound">
        <button className="play" onClick={() => setPlaying(!playing)} aria-pressed={playing}>{playing ? 'Stop sound' : 'Play sound'}</button>
        <label>Volume <b><Rich>{`${volume}%`}</Rich></b>
          <input type="range" min="5" max="100" step="5" value={volume} onChange={(e) => setVolume(+e.target.value)} aria-label="Volume" />
        </label>
      </div>
      <div className="controls">
        <button aria-label="Home" onClick={onHome}>
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 11l9-7.5 9 7.5M5.5 9.5V20h13V9.5M10 20v-6h4v6" />
          </svg>
        </button>
      </div>
    </div>
  );
}
