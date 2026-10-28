import { seg } from '../overview/ease.js';
import { M, TG } from '../math/Tex.jsx';

export const STOPS = [4.4, 17.0, 23.2, 27.2]; // the Fourier matrix, perpendicular rows, frequency basis, same signal
const BLUE = '#5cbcff', ORANGE = '#e8a33d', GREEN = '#8fe36a', CHALK = '#f1f2ea', DIMC = '#6a6a64', ROWC = '#9a9a94';
const col = (c, s) => `\\textcolor{${c}}{${s}}`;
const TAU = 2 * Math.PI;

// a 4-sample frame, the 4x4 Fourier matrix and their product: the same example as the Fourier-matrix slide
const N = 4;
const x = [1, 0, -1, 0];
const F = Array.from({ length: N }, (_, k) => Array.from({ length: N }, (_, n) => (k * n) % N)); // entry (k, n) = e^{-i 2 pi k n / 4} = (-i)^(kn mod 4); stored as the power of -i
const ENTRY = ['1', '-i', '-1', 'i'];
const ENTRY_P = ['1', '(-i)', '(-1)', 'i']; // with brackets, for products
const round = (v) => Math.round(v * 1000) / 1000;
const coord = (k) => { // X[k] = sum of F[k][n] * x[n], as the length of the complex number
  let re = 0, im = 0;
  for (let n = 0; n < N; n++) { const a = -TAU * F[k][n] / N; re += Math.cos(a) * x[n]; im += Math.sin(a) * x[n]; }
  return round(Math.hypot(re, im));
};
const X = Array.from({ length: N }, (_, k) => coord(k)); // (0, 2, 0, 2)
const inner = (a, b) => { // <row a, row b> = sum of a[n] * conj(b[n])
  let re = 0, im = 0;
  for (let n = 0; n < N; n++) {
    const ta = -TAU * F[a][n] / N, tb = -TAU * F[b][n] / N;
    re += Math.cos(ta) * Math.cos(tb) + Math.sin(ta) * Math.sin(tb);
    im += Math.sin(ta) * Math.cos(tb) - Math.cos(ta) * Math.sin(tb);
  }
  return round(Math.hypot(re, im));
};
const PAIRS = [[0, 1], [0, 2], [0, 3], [1, 2], [1, 3], [2, 3]];
const PAIR0 = 9.8, PAIR_STEP = 1.6; // when the first pair is checked, and how long each pair takes
const SLOW = 4.2; // the pair checks run slower than they once did, so everything after them is this much later

// left half: sample n sits at the same x in the frequency bars
const SX = (n) => 90 + 100 * n;
const Q0 = 478, QU = 40; // frequency bars: baseline and height of one unit
const PX = 250, PY = 330, PU = 64; // the plane of one pair of rows: centre and height of one unit
const lerp = (a, b, k) => a + (b - a) * k;

// the Fourier matrix from its formula, its rows as perpendicular axes, then the frame described on those axes
export default function Axes({ t: T }) {
  const t = T + 3.2; // the steps are written on a clock that starts at the formula (3.2); u is the clock after the slower pair checks
  const u = t - SLOW;
  const note = seg(t, 6.9, 7.4), note2 = seg(t, 7.1, 7.6);
  const fade1 = 1 - seg(t, 7.8, 8.3); // the matrix notes step aside
  const perp = seg(t, 7.8, 8.2) * (1 - seg(u, 15.8, 16.2)), eqVis = 1 - seg(t, 7.8, 8.3) + seg(u, 16.0, 16.4);
  const idx = Math.floor((t - PAIR0) / PAIR_STEP), active = idx >= 0 && idx < PAIRS.length ? PAIRS[idx] : null;
  // the plane of the pair being checked: the two rows are the axes (always at a right angle) and the frame's shadow on them is its two coordinates
  const pi = Math.max(0, Math.min(PAIRS.length - 1, idx)), pf = Math.max(0, Math.min(1, (t - PAIR0) / PAIR_STEP - pi)), move = seg(pf, 0, 0.5);
  const pt = (i) => [X[PAIRS[i][0]], X[PAIRS[i][1]]], from = pi > 0 ? pt(pi - 1) : [0, 0], to = pt(pi);
  const tipP = [lerp(from[0], to[0], move), lerp(from[1], to[1], move)], [pa, pb] = PAIRS[pi];
  const planeOp = seg(t, 8.2, 9.0) * (1 - seg(u, 16.0, 16.5)), shadow = seg(t, PAIR0 - 0.4, PAIR0 + 0.2);
  const Q = ([a, b]) => [PX + PU * a, PY - PU * b];
  const rowColour = (r) => (active ? (r === active[0] ? BLUE : r === active[1] ? ORANGE : DIMC) : ROWC);
  const f4 = F.map((row, k) => row.map((m) => col(active ? rowColour(k) : CHALK, ENTRY[m])).join(' & ')).join(' \\\\[4pt] ');
  const f4build = F.map((row, k) => row.map((m) => col(k === 1 ? BLUE : t < 6.6 ? DIMC : CHALK, ENTRY[m])).join(' & ')).join(' \\\\[4pt] '); // row 1 is the worked example; the other rows join once it is done
  const freqIn = seg(u, 16.4, 17.0), mult = seg(u, 16.4, 17.0);
  const work = (k) => seg(u, 17.6 + 1.0 * k, 18.2 + 1.0 * k), bar = (k) => seg(u, 17.8 + 1.0 * k, 18.6 + 1.0 * k), res = seg(u, 21.6, 22.2);
  const fade2 = 1 - seg(u, 22.8, 23.3), len = seg(u, 23.4, 24.2), eq = seg(u, 25.0, 25.8);
  const sumT = x.reduce((s, v) => s + v * v, 0), sumF = X.reduce((s, v) => s + v * v, 0);
  const neg = (v) => (v < 0 ? `(${v})` : `${v}`);
  return (
    <svg className="frame tall" viewBox="0 0 1000 560" role="img" aria-label="A 4-sample frame x = (1, 0, -1, 0) is a 4 by 1 vector. The 4 by 4 Fourier matrix comes from the formula e to the minus i theta; every pair of its rows is perpendicular. Multiplying gives the same frame described by four coordinates on those rows: (0, 2, 0, 2), two spikes, so the frame is a pure tone.">
      <TG fill="var(--chalk)" opacity={1 - seg(t, 7.8, 8.3)}>
        <M x="40" y="150" fontSize="28" opacity={seg(t, 3.5, 4.0)}>{String.raw`$F[k,n] = e^{-i\theta_{k,n}}$`}</M>
        <M x="40" y="196" fontSize="28" opacity={seg(t, 3.9, 4.4)}>{String.raw`$= \cos\theta_{k,n} - i\sin\theta_{k,n}$`}</M>
        <M x="40" y="262" fontSize="28" fill={ORANGE} opacity={seg(t, 4.5, 5.0)}>{String.raw`$\theta_{k,n} = \dfrac{2\pi kn}{N}$`}</M>
        <M x="40" y="340" fontSize="28" opacity={seg(t, 5.1, 5.5)}>{String.raw`$N = 4,\quad k = 1:$`}</M>
        <M x="40" y="384" fontSize="28" fill={ORANGE} opacity={seg(t, 5.4, 5.9)}>{String.raw`$\theta_{1,n} = [0,\ \pi/2,\ \pi,\ 3\pi/2]$`}</M>
        <M x="40" y="440" fontSize="28" fill={BLUE} opacity={seg(t, 5.9, 6.4)}>{String.raw`$F[1,n] = [1,\ -i,\ -1,\ i]$`}</M>
        <M x="40" y="500" fontSize="24" fill="var(--dim)" opacity={seg(t, 6.6, 7.1)}>{String.raw`the same for $k = 0, 1, 2, 3$: the 4 rows of $F$`}</M>
      </TG>

      <TG opacity={planeOp}>
        <M x="40" y="130" fill="var(--dim)" fontSize="22">the frame's shadow on each pair of rows</M>
        <line x1={Q([-2.7, 0])[0]} x2={Q([2.7, 0])[0]} y1={PY} y2={PY} stroke={BLUE} strokeWidth="2.5" />
        <line x1={PX} x2={PX} y1={Q([0, -2.7])[1]} y2={Q([0, 2.7])[1]} stroke={ORANGE} strokeWidth="2.5" />
        <M x={Q([2.7, 0])[0] - 6} y={PY - 14} textAnchor="end" fill={BLUE} fontSize="24">{`row ${pa}`}</M>
        <M x={PX + 14} y={Q([0, 2.7])[1] + 4} fill={ORANGE} fontSize="24">{`row ${pb}`}</M>
        <path d={`M${PX - 26} ${PY} V${PY + 26} H${PX}`} fill="none" stroke="var(--chalk)" strokeWidth="2.5" />
        <M x={PX - 34} y={PY + 52} textAnchor="end" fill="var(--chalk)" fontSize="22">{String.raw`$90^{\circ}$`}</M>
        <g opacity={shadow}>
          <line x1={Q([tipP[0], 0])[0]} x2={Q(tipP)[0]} y1={Q([tipP[0], 0])[1]} y2={Q(tipP)[1]} stroke={ORANGE} strokeWidth="2.5" strokeDasharray="4 5" />
          <line x1={Q([0, tipP[1]])[0]} x2={Q(tipP)[0]} y1={Q([0, tipP[1]])[1]} y2={Q(tipP)[1]} stroke={BLUE} strokeWidth="2.5" strokeDasharray="4 5" />
          <line x1={PX} y1={PY} x2={Q(tipP)[0]} y2={Q(tipP)[1]} stroke="var(--chalk)" strokeWidth="5" />
          <circle cx={Q(tipP)[0]} cy={Q(tipP)[1]} r="9" fill="var(--chalk)" />
          <M x={PX} y={PY + 205} textAnchor="middle" fill="var(--chalk)" fontSize="24">{`$(X[${pa}],\\ X[${pb}]) = (${X[pa]},\\ ${X[pb]})$`}</M>
        </g>
      </TG>

      <TG opacity={freqIn}>
        <M x="40" y="332" fill="var(--dim)" fontSize="22">frequency basis: coordinate on each row</M>
        <line x1="40" x2="440" y1={Q0} y2={Q0} stroke="var(--dim)" strokeWidth="1.5" opacity="0.6" />
        {X.map((v, k) => (
          <g key={k}>
            <line x1={SX(k)} x2={SX(k)} y1={Q0} y2={Q0 - QU * v * bar(k)} stroke={BLUE} strokeWidth="14" />
            <M x={SX(k)} y={Q0 + 38} textAnchor="middle" fill={BLUE} fontSize="21" opacity={bar(k)}>{String.raw`$X[${k}]=${v}$`}</M>
          </g>
        ))}
      </TG>

      <TG fill="var(--chalk)">
        <M x="545" y="95" fontSize="36" opacity={seg(t, 3.2, 3.6) * (1 - seg(t, 7.6, 8.0))}>The Fourier matrix</M>
        <M x="545" y="95" fontSize="36" opacity={seg(t, 7.6, 8.0) * (1 - seg(u, 16.0, 16.4))}>Perpendicular rows</M>
        <M x="545" y="95" fontSize="36" opacity={seg(u, 16.0, 16.4)}>Frequency basis</M>
        <M x="545" y="140" fill="var(--dim)" fontSize="23" opacity={seg(t, 3.2, 3.6) * (1 - seg(t, 7.6, 8.0))}>a frame of 4 samples, and its matrix</M>
        <M x="545" y="140" fill="var(--dim)" fontSize="23" opacity={seg(t, 7.6, 8.0) * (1 - seg(u, 16.0, 16.4))}>good axes do not overlap</M>
        <M x="545" y="140" fill="var(--dim)" fontSize="23" opacity={seg(u, 16.0, 16.4)}>how much of each row is in the frame</M>
      </TG>

      <TG fill="var(--chalk)" opacity={eqVis}>
        <M x="545" y="170" fill="var(--dim)" fontSize="22" opacity={seg(t, 5.9, 6.5)}>{String.raw`$F\ (4\times 4)$`}</M>
        <M x="800" y="170" fill="var(--dim)" fontSize="22" opacity={seg(t, 3.4, 4.0)}>{String.raw`$\mathbf{x}\ (4\times 1)$`}</M>
        <M x="545" y="232" fontSize="26" opacity={seg(t, 5.9, 6.5)}>{`$\\begin{bmatrix} ${f4build} \\end{bmatrix}$`}</M>
        <M x="800" y="232" fontSize="26" opacity={seg(t, 3.4, 4.0)}>{String.raw`$\begin{bmatrix} 1 \\[4pt] 0 \\[4pt] -1 \\[4pt] 0 \end{bmatrix}$`}</M>
        <M x="892" y="294" fontSize="26" opacity={mult}>{String.raw`$=$`}</M>
        <M x="928" y="170" fill="var(--dim)" fontSize="22" opacity={res}>{String.raw`$\mathbf{X}$`}</M>
        <M x="928" y="232" fontSize="26" opacity={res}>{`$\\begin{bmatrix} ${X.map((v) => col(BLUE, String(v))).join(' \\\\[4pt] ')} \\end{bmatrix}$`}</M>
      </TG>

      <TG opacity={fade1}>
        <M x="545" y="428" fill="var(--chalk)" fontSize="24" opacity={note}>{String.raw`row $0$: $\theta = 0$, all ones: the average`}</M>
        <M x="545" y="468" fill="var(--dim)" fontSize="22" opacity={note2}>{String.raw`row $2$: $\theta = \pi n$, so $1, -1, 1, -1$:`}</M>
        <M x="545" y="502" fill="var(--dim)" fontSize="22" opacity={note2}>{String.raw`the fastest wiggle`}</M>
      </TG>

      <TG opacity={perp}>
        <M x="545" y="200" fill="var(--chalk)" fontSize="25" opacity={seg(t, 8.4, 9.2)}>{`$${col(BLUE, '(1,\\,-i,\\,-1,\\,i)')}\\cdot ${col(ORANGE, '(1,\\,-1,\\,1,\\,-1)')}$`}</M>
        <M x="545" y="238" fill="var(--chalk)" fontSize="25" opacity={seg(t, 9.0, 9.8)}>{String.raw`$= 1 + i - 1 - i = 0$`}</M>
        <M x="545" y="282" fill="var(--dim)" fontSize="22" opacity={seg(t, 9.6, 10.2)}>every pair of rows:</M>
        <M x="545" y="316" fontSize="26" opacity={seg(t, 9.8, 10.4)}>{`$\\begin{bmatrix} ${f4} \\end{bmatrix}$`}</M>
        {PAIRS.map(([a, b], i) => (
          <M key={i} x="790" y={322 + 32 * i} fill={GREEN} fontSize="22" opacity={seg(t, PAIR0 + PAIR_STEP * (i + 0.5), PAIR0 + PAIR_STEP * (i + 0.7))}>{`row ${a} $\\cdot$ row ${b} $= ${inner(a, b)}$`}</M>
        ))}
        <M x="790" y="526" fill="var(--dim)" fontSize="22" opacity={seg(t, PAIR0 + PAIR_STEP * 6, PAIR0 + PAIR_STEP * 6 + 0.6)}>{`a row with itself $= ${inner(1, 1)}$`}</M>
      </TG>

      <TG opacity={fade2}>
        {X.map((v, k) => (
          <M key={k} x="545" y={418 + 32 * k} fill={BLUE} fontSize="20" opacity={work(k)}>{`$X_{${k}} = ${F[k].map((m, n) => `${ENTRY_P[m]}\\cdot ${neg(x[n])}`).join(' + ')} = ${v}$`}</M>
        ))}
        <M x="545" y="548" fill="var(--dim)" fontSize="22" opacity={work(3)}>each is the frame's dot product with a row</M>
      </TG>
      <TG opacity={len}>
        <M x="545" y="420" fill="var(--chalk)" fontSize="26">{`time: $${x.map((v) => `${neg(v)}^2`).join(' + ')} = ${sumT}$`}</M>
        <M x="545" y="456" fill="var(--chalk)" fontSize="26">{`frequency: $${X.map((v) => `${v}^2`).join(' + ')} = ${sumF}$`}</M>
        <M x="545" y="490" fill="var(--dim)" fontSize="22">{`squared length: ${sumF} = ${N} \u00d7 ${sumT}, scaled by N`}</M>
      </TG>
      <TG opacity={eq}>
        <M x="545" y="536" fill="var(--chalk)" fontSize="28">Same signal, new description.</M>
      </TG>
    </svg>
  );
}
