import { seg } from '../overview/ease.js';
import { W, H, N, MID, OFF, AMP, X as OX, wave } from '../overview/Frame.jsx';
import { VectorBody, END, STOPS as VS } from './Vector.jsx';

export const STOPS = [0.1, 1.4, 2.8, 4.2, 5.6, 8.2, 10.4, 13.4];
const TAU = 2 * Math.PI;
export const BLUE = '#5cbcff', ORANGE = '#e8a33d';
export const GX = 90, GW = 660, GA = 40, MX = 835, CX = 917, ZY = 170, MH = 120; // graphs: left (room to their left for the pattern's label), amplitude GA; score meter: right, its left edge MX (the score block sits just right of it), zero line ZY, half-height MH; CX: centre of the "Score:" and number block, which is centred on ZY
export const TOP = 90, BOT = 250; // overlay row, resultant row
const SX = GW / (W - 120), SY = GA / AMP, EX = GX - 60 * SX, EY = TOP - SY * (MID - OFF); // the Overview's drawing, squeezed into the overlay row
const frame = (n) => wave(n / (N - 1)); // the Overview's composite frame; its loudest tone is 450 Hz (9 cycles per frame)
export const X = (n) => GX + (n / (N - 1)) * GW;
export const nums = Array.from({ length: N }, (_, n) => n);
export const poly = (f, y, m = N) => nums.slice(0, m).map((n) => `${X(n)},${y - GA * f(n)}`).join(' ');
const lerp = (a, b, k) => a + (b - a) * k;
const OY = (n) => MID - OFF - AMP * wave(n / (N - 1)); // a dot's height in the Overview's drawing

// opens where Vector ends (dots, stems and the vector x); the dots fade to leave a line, which moves up to make room; then the frame and a test pattern are overlaid, multiplied into a resultant wave, and its points added into the score
export default function Score({ t }) {
  const fade = seg(t, 0.3, 1.1), mv = seg(t, 1.6, 2.6), pat = seg(t, 3, 3.8), pm = seg(t, 4.4, 5.4), yP = BOT + (TOP - BOT) * pm;
  const res = seg(t, 5.6, 6), morph = seg(t, 10.6, 13), panel = seg(t, 8.2, 8.8);
  const k = 9 - 4 * morph; // the pattern stretches from 9 cycles per frame (450 Hz) to 5 (250 Hz)
  const sets = [{ k, hz: Math.round(50 * k), a: 1, mark: Math.round((N - 1) * seg(t, 5.8, 7.8)), sweep: Math.round(N * seg(t, 8.4, 10)) }];
  const label = { fill: 'var(--dim)', fontSize: 16, className: 'zone' };
  return (
    <svg className="frame" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="The frame and a test pattern are overlaid, multiplied point by point into a resultant wave, and the points of that wave are added into one score: large for 450 Hz, near zero for 250 Hz">
      <VectorBody t={VS.at(-1)} graph={false} fade={1 - fade} />
      <g transform={`matrix(${lerp(END.s, SX, mv)} 0 0 ${lerp(END.s, SY, mv)} ${lerp(END.tx, EX, mv)} ${lerp(END.ty, EY, mv)})`}>
        <line className="axis" x1={60} x2={W - 60} y1={MID - OFF * mv} y2={MID - OFF * mv} />
        <polyline points={nums.map((n) => `${OX(n / (N - 1))},${OY(n)}`).join(' ')} fill="none" stroke="var(--chalk)" strokeWidth="2" vectorEffect="non-scaling-stroke" opacity={fade} />
        {nums.map((n) => {
          const u = n / (N - 1);
          return (
            <g key={n} className="reading" style={{ animation: 'none', opacity: 1 - fade }}>
              <line x1={OX(u)} x2={OX(u)} y1={MID} y2={OY(n)} />
              <circle cx={OX(u)} cy={OY(n)} r={n === N - 1 ? 7 : 3.5} style={{ fill: BLUE }} />
            </g>
          );
        })}
      </g>
      <line className="axis" x1={GX} x2={GX + GW} y1={BOT} y2={BOT} opacity={Math.max(pat, res) * (1 - pm * (1 - res))} />
      {sets.map(({ k, hz, a, mark, sweep }) => {
        const p = (n) => Math.cos(TAU * k * n / N), r = (n) => frame(n) * p(n);
        const sum = nums.slice(0, sweep).reduce((s, n) => s + r(n), 0), g = Math.max(-1, Math.min(1, sum / 30));
        return (
          <g key="pattern" opacity={a}>
            <polyline points={poly(p, yP)} fill="none" stroke={BLUE} strokeWidth="2" strokeDasharray="6 6" opacity={pat} />
            <text x={GX - 12} y={yP + 5} textAnchor="end" {...label} fill={BLUE} opacity={pat}>{hz} Hz</text>
            <g opacity={res}>
              <polyline points={poly(r, BOT, mark + 1)} fill="none" stroke="var(--chalk)" strokeWidth="2" />
              {mark < N - 1 && mark > 0 && (
                <g>
                  <line x1={X(mark)} x2={X(mark)} y1={TOP - GA * frame(mark)} y2={BOT - GA * r(mark)} stroke="var(--dim)" strokeDasharray="3 5" />
                  <circle cx={X(mark)} cy={TOP - GA * frame(mark)} r="4" fill="var(--chalk)" />
                  <circle cx={X(mark)} cy={TOP - GA * p(mark)} r="4" fill={BLUE} />
                  <circle cx={X(mark)} cy={BOT - GA * r(mark)} r="5" fill="var(--chalk)" />
                </g>
              )}
            </g>
            {nums.slice(0, sweep).map((n) => (
              <line key={n} x1={X(n)} x2={X(n)} y1={BOT} y2={BOT - GA * r(n)} stroke={r(n) >= 0 ? BLUE : ORANGE} strokeWidth="4.5" />
            ))}
            <g className="zone" opacity={panel}>
              <rect x={MX} y={ZY - MH} width="28" height={2 * MH} rx="4" fill="none" stroke="var(--dim)" />
              <rect x={MX} y={Math.min(ZY, ZY - g * MH)} width="28" height={Math.abs(g) * MH} fill={g >= 0 ? BLUE : ORANGE} />
              <line x1={MX - 6} x2={MX + 34} y1={ZY} y2={ZY} stroke="var(--chalk)" />
              <text x={MX - 10} y={ZY + 5} textAnchor="end" {...label}>0</text>
              <text x={MX - 10} y={ZY - MH + 14} textAnchor="end" {...label}>+</text>
              <text x={MX - 10} y={ZY + MH - 2} textAnchor="end" {...label}>−</text>
              <text x={CX} y={ZY + 29} textAnchor="middle" fontSize="52" fill="var(--chalk)">{sum.toFixed(0)}</text>
              <text x={CX} y={ZY - 17} textAnchor="middle" {...label}>Score:</text>
            </g>
          </g>
        );
      })}
    </svg>
  );
}
