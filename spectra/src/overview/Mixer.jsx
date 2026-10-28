import { useEffect, useState } from 'react';
import { W, PAD } from './Frame.jsx';
import { seg } from './ease.js';
import { LEAK, END_Y, X0, LEN, NUM_X, BRACE_X, LED_X, SHIFT, groups } from './Light.jsx';
import { M, TG } from '../math/Tex.jsx';

const MAX = 0.4; // longest bar (and the strength that gives full brightness), as on page 4
export const STOPS = [1]; // one move: the bars leave page 4's values and start drifting on their own
const BEAT = 0.7; // seconds per beat

// smooth random wobble in 0..1: random values on a grid, blended with a cosine curve
const makeNoise = () => {
  const grid = Array.from({ length: 256 }, Math.random);
  return (x) => {
    const i = Math.floor(x), f = (1 - Math.cos((x - i) * Math.PI)) / 2;
    return grid[((i % 256) + 256) % 256] * (1 - f) + grid[(((i + 1) % 256) + 256) % 256] * f;
  };
};

// what the three bands might do over time in real music: bass thumps on every beat, mids swell and fade
// with the melody, treble flickers in short bursts. Each is scaled by its own slow wobble so phrases differ.
// Every few seconds the music changes character, so the LED visits every colour: which bands lead in each passage
// (bass, mids, treble) gives red, yellow, green, cyan, blue, magenta and white in turn.
const SCENES = [[1, 0.08, 0.06], [1, 1, 0.06], [0.1, 1, 0.08], [0.06, 1, 1], [0.08, 0.1, 1], [1, 0.08, 1], [1, 1, 1]];
const SCENE = 3.5, BLEND = 1; // seconds per passage; seconds spent blending into the next
const smooth = (x) => x * x * (3 - 2 * x);
const emphasis = (tau) => {
  const k = Math.floor(tau / SCENE), into = tau - k * SCENE - (SCENE - BLEND), m = smooth(Math.min(1, Math.max(0, into / BLEND)));
  const a = SCENES[k % SCENES.length], b = SCENES[(k + 1) % SCENES.length];
  return a.map((v, i) => v + (b[i] - v) * m);
};
const targets = (tau, [n1, n2, n3]) => {
  const kick = Math.exp(-((tau % BEAT) / BEAT) * 4);
  const hat = Math.exp(-(((tau + 0.35) % (2 * BEAT)) / (2 * BEAT)) * 10);
  const e = emphasis(tau);
  return [
    MAX * (0.3 + 0.7 * kick) * (0.75 + 0.25 * n1(tau * 0.12)) * 1.15 * e[0],
    MAX * (0.4 + 0.6 * Math.pow(n2(tau * 0.35), 1.3)) * 0.95 * e[1],
    MAX * (0.3 + 0.7 * hat) * (0.5 + 0.5 * n3(tau * 0.25)) * e[2],
  ].map((v) => Math.min(MAX, v));
};

// brightness of each channel for the three bar strengths: same maths as page 4, but absolute, so quiet bars give a dim LED
const toRgb = (w) => {
  const s = Math.max(...w);
  return w.map((v) => (v - LEAK * s > 0 ? Math.round(255 * Math.min(1, (v - LEAK * s) / (1 - LEAK) / MAX)) : 0));
};

// page 4's final picture, but the program changes the bar lengths to show how each band shifts the LED colour
export default function Mixer({ t }) {
  const top = Math.max(...groups.map((g) => g.weighted));
  const start = groups.map((g) => (g.weighted - LEAK * top > 0 ? g.weighted : 0)); // where page 4 ends: the switched-off band has no bar
  const [live, setLive] = useState(start);
  useEffect(() => {
    const noise = [makeNoise(), makeNoise(), makeNoise()];
    let tau = Math.random() * 100, v = start, last = performance.now(), raf;
    const tick = (now) => {
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      tau += dt * 0.7; // the same 0.7x pace as the player
      // bars jump up quickly and fall back slowly, like a level meter
      v = targets(tau, noise).map((target, i) => v[i] + (target - v[i]) * -Math.expm1(-dt * (target > v[i] ? 30 : 6)));
      setLive(v);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  const ramp = seg(t, 0, 1);
  const w = start.map((x, i) => x + (live[i] - x) * ramp);

  const rgb = toRgb(w), strongest = Math.max(...w), floor = LEAK * strongest;

  return (
    <svg className="frame" viewBox={`0 -100 ${W} 540`} role="img" aria-label="Bars for bass, mids and treble change, and the LED colour changes with them">
      <TG transform={`translate(${-SHIFT} 0)`}>
        {groups.map((g, b) => {
          const y = END_Y[b];
          return (
            <TG key={g.name}>
              <M className="zone" x={X0 - 16} y={y + 5} textAnchor="end" fill={g.color}>{g.name}</M>
              <rect x={X0} y={y - 13} width={w[b] * LEN} height="26" fill={g.color} opacity={w[b] > floor ? 1 : 0.4 * ramp} />
              <M className="zone" x={NUM_X} y={y + 6} fill={g.color}>{rgb[b]}</M>
            </TG>
          );
        })}
        {strongest > 0 && (
          <TG>
            <line className="avg" x1={X0 + floor * LEN} x2={X0 + floor * LEN} y1="90" y2="320" />
            <M className="zone" x={X0 + floor * LEN} y="75" textAnchor="middle" fill="var(--dim)">15% of the strongest</M>
          </TG>
        )}
        <path d={`M${BRACE_X} 105 q10 0 10 10 v80 q0 10 10 10 q-10 0 -10 10 v80 q0 10 -10 10`} fill="none" stroke="var(--chalk)" strokeWidth="1.5" />
        <circle cx={LED_X} cy="205" r="48" fill={`rgb(${rgb.join(',')})`} />
      </TG>
    </svg>
  );
}
