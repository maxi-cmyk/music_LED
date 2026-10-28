import { useEffect, useMemo, useRef, useState } from 'react';
import { W, H, N, wave } from '../overview/Frame.jsx';
import { ham } from '../overview/ease.js';
import { M, TG, Rich } from '../math/Tex.jsx';

export const STOPS = [0];
const TAU = 2 * Math.PI;
const RED = '#ff6b5a', GREEN = '#8fe36a', BLUE = '#5cbcff', GREY = '#9a9a94';
const PX = 270, PY = 240, R = 215; // plane centre and the radius the longest path fits into
const SECS = 3.7; // time to add all 128 arrows (0.7x pace)

// the Overview's frame, prepared like the firmware does: centred on zero, optionally faded at the edges by the Hamming window
const prepare = (windowed) => {
  const x = Array.from({ length: N }, (_, n) => wave(n / N));
  const mean = x.reduce((a, b) => a + b, 0) / N;
  return x.map((v, n) => (v - mean) * (windowed ? ham(n / (N - 1)) : 1));
};
// the arrows for bin k: sample n adds x[n] turned by -2*pi*k*n/N; running totals are the chain's corners
const chain = (x, k) => {
  let re = 0, im = 0;
  const pts = [[0, 0]];
  for (let n = 0; n < N; n++) {
    const a = -TAU * k * n / N;
    re += x[n] * Math.cos(a); im += x[n] * Math.sin(a);
    pts.push([re, im]);
  }
  return pts;
};
const bandOf = (k) => (k >= 1 && k <= 5 ? [RED, 'Bass'] : k >= 6 && k <= 20 ? [GREEN, 'Mids'] : k >= 21 && k <= 50 ? [BLUE, 'Treble'] : [GREY, 'Not used for colour']);
const note = (k, strength, top) => {
  if (k === 0) return 'Bin 0 is just the average level. The LED ignores it.';
  if (k === 64) return 'Bin 64 is the top, 3,200 Hz. Bins above it would only mirror these.';
  if (k > 50) return 'The LED stops listening above bin 50 (2,500 Hz).';
  if (strength > 0.5 * top) return 'The arrows keep turning the same way as the frame, so they stack up. This pitch is in the sound.';
  if (strength > 0.1 * top) return 'Only some of the arrows line up, so a small score is left.';
  return 'The arrows go round in circles and cancel. This pitch is not in the frame.';
};
const fmt = (v) => (Math.abs(v) < 0.05 ? 0 : v).toFixed(1);

// pick a bin and watch the 128 arrows chain together; where the chain ends is that bin's answer, X_k
export default function Trace() {
  const [k, setK] = useState(9);
  const [windowed, setWindowed] = useState(false);
  const [terms, setTerms] = useState(0);
  const run = useRef({ at: 0, playing: true });
  const x = useMemo(() => prepare(windowed), [windowed]);
  const all = useMemo(() => Array.from({ length: 65 }, (_, b) => chain(x, b)), [x]);
  const strength = all.map((c) => Math.hypot(...c[N]));
  const top = Math.max(...strength);
  const reach = all.map((c) => Math.max(...c.map(([re, im]) => Math.hypot(re, im))));
  const unit = R / Math.max(reach[k], 0.25 * Math.max(...reach)); // fit this bin's chain to the plane, but never blow a near-empty bin up to full size
  const replay = () => { run.current = { at: 0, playing: true }; setTerms(0); };
  useEffect(replay, [k, windowed]);
  useEffect(() => {
    let raf, last = performance.now();
    const tick = (now) => {
      const r = run.current;
      if (r.playing && r.at < N) {
        r.at = Math.min(N, r.at + Math.max(0, now - last) / 1000 * N / SECS); // a frame timestamp can precede `last` by a few ms
        setTerms(Math.round(r.at));
      }
      last = now;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const [color, band] = bandOf(k);
  const pts = all[k].slice(0, terms + 1), end = pts.at(-1);
  const P = ([re, im]) => `${PX + unit * re},${PY - unit * im}`;
  const done = terms === N;
  return (
    <div className="frame trace">
      <svg viewBox="0 0 1000 470" role="img" aria-label={`The 128 samples each add one small arrow for bin ${k}, and the chain of arrows ends at that bin's answer`}>
        <line x1={PX - R - 20} x2={PX + R + 20} y1={PY} y2={PY} stroke="var(--dim)" strokeWidth="1.5" opacity="0.6" />
        <line x1={PX} x2={PX} y1={PY - R - 20} y2={PY + R + 20} stroke="var(--dim)" strokeWidth="1.5" opacity="0.6" />
        <M x={PX + R + 20} y={PY - 12} fill="var(--dim)" fontSize="22" textAnchor="end">$\cos$ (real)</M>
        <M x={PX + 12} y={PY - R - 6} fill="var(--dim)" fontSize="22">$\sin$ (imaginary)</M>
        <polyline points={pts.map(P).join(' ')} fill="none" stroke={color} strokeWidth="2.6" strokeLinejoin="round" opacity="0.95" />
        {pts.length > 1 && <line x1={PX} y1={PY} x2={PX + unit * end[0]} y2={PY - unit * end[1]} stroke="var(--chalk)" strokeWidth="2.4" strokeDasharray="3 7" />}
        <circle cx={PX + unit * end[0]} cy={PY - unit * end[1]} r="10" fill="var(--chalk)" />

        <M x="580" y="46" fill={color} fontSize="28">{`Bin ${k} · ${50 * k} Hz · ${band}`}</M>
        <M x="580" y="108" fill="var(--chalk)" fontSize="46">{`$X_{${k}} = ${fmt(end[0])} ${end[1] < 0 ? '-' : '+'} ${fmt(Math.abs(end[1]))}i$`}</M>
        <M x="580" y="152" fill="var(--dim)" fontSize="26">{`Strength ${fmt(Math.hypot(...end))}${done ? '' : ' so far'}`}</M>

        <M x="580" y="222" fill="var(--dim)" fontSize="22">Every bin's answer (click a bar)</M>
        <TG>
          {strength.map((s, b) => {
            const h = Math.max(2, 170 * s / top), [c] = bandOf(b), on = b === k;
            return (
              <TG key={b} onClick={() => setK(b)} style={{ cursor: 'pointer' }}>
                <rect x={580 + b * 6.4} y={236} width="6.4" height="190" fill="transparent" />
                <rect x={580 + b * 6.4 + 0.6} y={426 - h} width="5.2" height={h} fill={c} opacity={on ? 1 : 0.4} />
              </TG>
            );
          })}
          <rect x={580 + k * 6.4 - 1} y={426 - Math.max(2, 170 * strength[k] / top) - 10} width="8.4" height="4" fill="var(--chalk)" />
        </TG>
        <M x="580" y="460" fill="var(--dim)" fontSize="20">0 Hz</M>
        <M x="996" y="460" fill="var(--dim)" fontSize="20" textAnchor="end">3,200 Hz</M>
      </svg>
      <Rich as="p" className="trace-note">{note(k, strength[k], top)}</Rich>
      <div className="trace-controls">
        <label>
          <span>Frequency bin <b style={{ color }}><Rich>{k}</Rich></b> · <Rich>{`${50 * k} Hz`}</Rich></span>
          <input type="range" min="0" max="64" step="1" value={k} onChange={(e) => setK(+e.target.value)} aria-label="Frequency bin" />
        </label>
        <label>
          <span>Arrows added <b><Rich>{terms}</Rich></b> of <Rich>{N}</Rich></span>
          <input type="range" min="0" max={N} step="1" value={terms}
            onChange={(e) => { run.current = { at: +e.target.value, playing: false }; setTerms(+e.target.value); }} aria-label="Arrows added" />
        </label>
        <button onClick={replay}>Replay</button>
        <button aria-pressed={windowed} onClick={() => setWindowed(!windowed)}>Fade the edges: {windowed ? 'on' : 'off'}</button>
      </div>
    </div>
  );
}
