import { seg } from '../overview/ease.js';
import { W, H, N, MID, OFF, AMP, X as OX, wave } from '../overview/Frame.jsx';
import { VectorBody, END, STOPS as VS } from './Vector.jsx';
import { M, TG } from '../math/Tex.jsx';

export const STOPS = [4.2, 7.9, 10.4, 13.4]; // the integral, multiply, area becomes a sum, 250 Hz
const DIM = '#6a6a64', CHALK = '#f2f2ec';
const TAU = 2 * Math.PI;
export const BLUE = '#5cbcff', ORANGE = '#e8a33d';
export const GX = 90, GW = 660, GA = 68, MX = 835, CX = 917, ZY = 170, MH = 120; // graphs: left (room to their left for the pattern's label), amplitude GA; score meter: right, its left edge MX (the score block sits just right of it), zero line ZY, half-height MH; CX: centre of the "Score:" and number block, which is centred on ZY
export const TOP = 102, BOT = 302; // overlay row, resultant row
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
    <svg className="frame tall" viewBox={`0 0 ${W} 510`} role="img" aria-label="The frame and a cosine test wave are multiplied; the area under the product is the integral, which for 128 samples is the sum X_k: large for 450 Hz, near zero for 250 Hz">
      <VectorBody t={VS.at(-1)} graph={false} fade={1 - fade} />
      <TG transform={`matrix(${lerp(END.s, SX, mv)} 0 0 ${lerp(END.s, SY, mv)} ${lerp(END.tx, EX, mv)} ${lerp(END.ty, EY, mv)})`}>
        <line className="axis" x1={60} x2={W - 60} y1={MID - OFF * mv} y2={MID - OFF * mv} />
        <polyline points={nums.map((n) => `${OX(n / (N - 1))},${OY(n)}`).join(' ')} fill="none" stroke="var(--chalk)" strokeWidth="2" vectorEffect="non-scaling-stroke" opacity={fade} />
        {nums.map((n) => {
          const u = n / (N - 1);
          return (
            <TG key={n} className="reading" style={{ animation: 'none', opacity: 1 - fade }}>
              <line x1={OX(u)} x2={OX(u)} y1={MID} y2={OY(n)} />
              <circle cx={OX(u)} cy={OY(n)} r={n === N - 1 ? 7 : 3.5} style={{ fill: BLUE }} />
            </TG>
          );
        })}
      </TG>
      <line className="axis" x1={GX} x2={GX + GW} y1={BOT} y2={BOT} opacity={Math.max(pat, res) * (1 - pm * (1 - res))} />
      {sets.map(({ k, hz, a, mark, sweep }) => {
        const p = (n) => Math.cos(TAU * k * n / N), r = (n) => frame(n) * p(n);
        const sum = nums.slice(0, sweep).reduce((s, n) => s + r(n), 0), g = Math.max(-1, Math.min(1, sum / 30));
        return (
          <TG key="pattern" opacity={a}>
            <polyline points={poly(p, yP)} fill="none" stroke={BLUE} strokeWidth="2" strokeDasharray="6 6" opacity={pat} />
            <M x={GX - 12} y={yP + 5} textAnchor="end" {...label} fill={BLUE} opacity={pat}>{hz} Hz</M>
            <TG opacity={res}>
              <polyline points={poly(r, BOT, mark + 1)} fill="none" stroke="var(--chalk)" strokeWidth="2" />
              {mark < N - 1 && mark > 0 && (
                <TG>
                  <line x1={X(mark)} x2={X(mark)} y1={TOP - GA * frame(mark)} y2={BOT - GA * r(mark)} stroke="var(--dim)" strokeDasharray="3 5" />
                  <circle cx={X(mark)} cy={TOP - GA * frame(mark)} r="4" fill="var(--chalk)" />
                  <circle cx={X(mark)} cy={TOP - GA * p(mark)} r="4" fill={BLUE} />
                  <circle cx={X(mark)} cy={BOT - GA * r(mark)} r="5" fill="var(--chalk)" />
                </TG>
              )}
            </TG>
            <polygon points={`${X(0)},${BOT} ${nums.map((n) => `${X(n)},${BOT - GA * r(n)}`).join(' ')} ${X(N - 1)},${BOT}`} fill={BLUE} opacity={0.22 * seg(t, 7.9, 8.4) * (1 - seg(t, 9.0, 10.0))} />
            {nums.slice(0, sweep).map((n) => (
              <line key={n} x1={X(n)} x2={X(n)} y1={BOT} y2={BOT - GA * r(n)} stroke={r(n) >= 0 ? BLUE : ORANGE} strokeWidth="4.5" />
            ))}
            <TG className="zone" opacity={panel}>
              <rect x={MX} y={ZY - MH} width="28" height={2 * MH} rx="4" fill="none" stroke="var(--dim)" />
              <rect x={MX} y={Math.min(ZY, ZY - g * MH)} width="28" height={Math.abs(g) * MH} fill={g >= 0 ? BLUE : ORANGE} />
              <line x1={MX - 6} x2={MX + 34} y1={ZY} y2={ZY} stroke="var(--chalk)" />
              <M x={MX - 10} y={ZY + 5} textAnchor="end" {...label}>0</M>
              <M x={MX - 10} y={ZY - MH + 14} textAnchor="end" {...label}>$+$</M>
              <M x={MX - 10} y={ZY + MH - 2} textAnchor="end" {...label}>$-$</M>
              <M x={CX} y={ZY + 29} textAnchor="middle" fontSize="52" fill="var(--chalk)">{sum.toFixed(0)}</M>
              <M x={CX} y={ZY - 17} textAnchor="middle" {...label}>{`$X_{${Math.round(k)}}$`}</M>
            </TG>
          </TG>
        );
      })}

      {(() => { // the formula the picture is building, one piece lit at a time
        const lit = (on, c) => (on ? c : DIM);
        const kk = Math.round(k), hz = 50 * kk;
        const integral = `X(f) = \\textcolor{${lit(t >= 7.9, CHALK)}}{\\int}\\,\\textcolor{${lit(t >= 1.3, CHALK)}}{x(t)}\\,\\textcolor{${lit(pat > 0.4, BLUE)}}{\\cos(2\\pi f t)}\\,\\textcolor{${lit(t >= 7.9, CHALK)}}{dt}`;
        const sum = `X_{k} = \\textcolor{${lit(t >= 8.7, CHALK)}}{\\sum_{n=0}^{N-1}}\\,\\textcolor{${CHALK}}{x[n]}\\,\\textcolor{${BLUE}}{\\cos\\frac{2\\pi kn}{N}}`;
        const toSum = seg(t, 8.5, 9.1), intro = seg(t, 1.3, 2.0);
        return (
          <TG>
            <M x={W / 2} y="436" textAnchor="middle" fontSize="36" opacity={intro * (1 - toSum)}>{`$${integral}$`}</M>
            <M x={W / 2} y="488" textAnchor="middle" fill="var(--dim)" fontSize="22" opacity={intro * (1 - toSum)}>{`$x(t)$: the frame · $f$: the pitch being tested ($${hz}\\,\\mathrm{Hz}$) · the area is the integral`}</M>
            <M x={W / 2} y="436" textAnchor="middle" fontSize="36" opacity={toSum}>{`$${sum}$`}</M>
            <M x={W / 2} y="488" textAnchor="middle" fill="var(--dim)" fontSize="22" opacity={toSum}>{`$n$: sample number (0 to 127) · $N = 128$ samples · $k = ${kk}$: ${hz} Hz`}</M>
          </TG>
        );
      })()}
    </svg>
  );
}
