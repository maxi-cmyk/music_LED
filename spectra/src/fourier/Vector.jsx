import { seg } from '../overview/ease.js';
import { wave, X, W, H, MID, AMP, OFF, N } from '../overview/Frame.jsx';

const STEP = 0.01, FILL = 0.04, FILL_AT = 2.6; // dots appear 0.01 s apart; the scan starts at FILL_AT
// seconds spent on dot n: 1 s at either end, each step in 35% shorter (50% at the end), down to FILL, so the scan speeds up and slows down smoothly
const GAP = (n) => Math.max(FILL, 0.65 ** n, 0.5 ** (N - 1 - n));
const AT = [0]; // AT[n]: when dot n is first read
for (let n = 0; n < N; n++) AT.push(AT[n] + GAP(n));
export const STOPS = [N * STEP + 0.25, 2.5, FILL_AT + AT[N] + 0.15];
// index of the dot being read dt seconds into the scan (-1: not started)
const reading = (dt) => { if (dt < 0) return -1; let n = 0; while (n < N - 1 && AT[n + 1] <= dt) n++; return n; };

const Y = (u) => MID - OFF - AMP * wave(u);
const CY = 170, RH = 44, K = 7, HALF = 50, VY = CY - (K * RH) / 2; // both halves are centred on CY; K slots show at once, the brackets sit HALF either side of the numbers
const S = 0.8; // size of the graph once it has moved aside (1 = as wide as the Overview's)
// graph + gap + vector ("x =", brackets and numbers) are one block, centred side to side
const GRAPH_W = S * (W - 120), SPACE = 60, VEC_W = 174, LEFT = (W - (GRAPH_W + SPACE + VEC_W)) / 2;
const GX = LEFT + GRAPH_W / 2; // centre of the graph
const MIDX = LEFT + GRAPH_W + SPACE + 112; // centre of the numbers: "x =" and the left bracket take 112 to its left, the right bracket 62 to its right
const TOP = Math.min(...Array.from({ length: N }, (_, i) => Y(i / (N - 1)))); // highest dot: the graph's drawing runs from TOP down to the axis at MID
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
// first visible slot (fractional) dt seconds into the scan: the one being read sits in the middle, except near the ends of the vector
const scrollAt = (dt) => {
  const c = reading(dt), p = c <= 0 ? 0 : c - 1 + clamp((dt - AT[c]) / Math.min(0.3, GAP(c)), 0, 1);
  return clamp(p - (K - 1) / 2, 0, N - K);
};
const value = (i) => (MID - Y(i / (N - 1))) / AMP; // height above the zero line, as drawn on the Overview

// the Overview's frame of dots slides left; then each dot in turn lights up and writes its height into its slot of the vector x, which scrolls (with motion blur) to keep that slot centred
export default function Vector({ t }) {
  const sh = seg(t, STOPS[0] + 0.05, STOPS[1]), s = 1 - (1 - S) * sh, tx = (GX - S * 500) * sh, ty = (CY - S * (TOP + MID) / 2) * sh; // the graph shrinks to scale S, its drawing centred at (GX, CY)
  const dt = t - FILL_AT, c = reading(dt), pos = scrollAt(dt);
  const blur = Math.min(5, (Math.abs(pos - scrollAt(dt - 0.05)) / 0.05) * RH * 0.001); // blur follows scroll speed
  const bot = VY + K * RH;
  return (
    <svg className="frame" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Each of the 128 snapshots writes its height into its slot of the vector x">
      <g transform={`translate(${tx} ${ty}) scale(${s})`}>
        <line className="axis" x1={60} x2={W - 60} y1={MID} y2={MID} />
        {Array.from({ length: N }, (_, i) => {
          const u = i / (N - 1), o = Math.min(1, Math.max(0, (t - i * STEP) / 0.25)), on = i <= c;
          return (
            <g key={i} className="reading" style={{ animation: 'none', opacity: o }}>
              <line x1={X(u)} x2={X(u)} y1={MID} y2={Y(u)} />
              <circle cx={X(u)} cy={Y(u)} r={i === c ? 7 : 3.5} style={on ? { fill: '#5cbcff' } : undefined} />
            </g>
          );
        })}
      </g>
      <g opacity={sh}>
        <clipPath id="vec"><rect x={MIDX - HALF - 10} y={VY} width={2 * HALF + 20} height={K * RH} /></clipPath>
        <filter id="vblur"><feGaussianBlur stdDeviation={`0 ${blur}`} /></filter>
        <text x={MIDX - HALF - 22} y={VY + K * RH / 2 + 8} textAnchor="end" fill="var(--chalk)" fontSize="22">x =</text>
        <path d={`M${MIDX - HALF} ${VY - 6} h-12 V${bot + 6} h12`} fill="none" stroke="var(--chalk)" />
        <path d={`M${MIDX + HALF} ${VY - 6} h12 V${bot + 6} h-12`} fill="none" stroke="var(--chalk)" />
        <g clipPath="url(#vec)">
          <g filter={blur > 0.05 ? 'url(#vblur)' : undefined}>
            {Array.from({ length: K + 2 }, (_, j) => {
              const n = Math.floor(pos) + j - 1;
              if (n < 0 || n >= N) return null;
              const y = VY + (n - pos) * RH + RH / 2, f = seg(dt, AT[n], AT[n] + Math.min(0.4, GAP(n) * 0.6)), w = n === c ? 1 : 0; // f: fade-in of this number; w: blue only while it is the one being read
              return (
                <g key={n}>
                  <text x={MIDX} y={y + 6} textAnchor="middle" fill="var(--chalk)" fontSize="20" opacity={f}>{value(n).toFixed(2)}</text>
                  <text x={MIDX} y={y + 6} textAnchor="middle" fill="#5cbcff" fontSize="20" opacity={f * w}>{value(n).toFixed(2)}</text>
                </g>
              );
            })}
          </g>
        </g>
      </g>
    </svg>
  );
}
