import { seg } from '../overview/ease.js';

export const STOPS = [1.4, 3.2, 5.2, 8.4];
const N = 128, K = 3, TAU = 2 * Math.PI; // the toy tone: 3 cycles per 128-sample frame (150 Hz)
const BLUE = '#5cbcff', ORANGE = '#e8a33d';
const CY = 170, GX = 40, GW = 420, GA = 60; // graph: left half, centred on CY, amplitude GA
const PX = 750, R = 95; // plane: right half
const line = (f) => Array.from({ length: 257 }, (_, i) => `${GX + (i / 256) * GW},${CY - GA * f(i / 256)}`).join(' ');
// score = sum over the frame of (tone x pattern); with the tone shifted by phi this is N/2 * cos(phi) for the cosine, N/2 * sin(phi) for the sine
const score = (phi, pat) => Array.from({ length: N }, (_, n) => Math.cos(TAU * K * n / N - phi) * pat(TAU * K * n / N)).reduce((a, b) => a + b, 0);

// a tone shifted in phase: the cosine score falls to zero, the sine score picks it up, and the point (cos score, sine score) just goes round a circle
export default function Phase({ t }) {
  const phi = (Math.PI / 2) * seg(t, 1.4, 3) + TAU * seg(t, 5.4, 8.2);
  const C = score(phi, Math.cos), S = score(phi, Math.sin), r = Math.hypot(C, S);
  const intro = seg(t, 0, 1), dot = seg(t, 0.8, 1.2), q = seg(t, 3.3, 4.3), dist = seg(t, 5.4, 6.2);
  const px = PX + R * C / (N / 2), py = CY - R * S / (N / 2);
  return (
    <svg className="frame" viewBox="0 0 1000 340" role="img" aria-label="A tone shifted in phase: the cosine score falls to zero while the sine score rises, and together they trace a circle whose radius, the strength, never changes">
      <line className="axis" x1={GX} x2={GX + GW} y1={CY} y2={CY} />
      <polyline points={line((u) => Math.cos(TAU * K * u - phi))} fill="none" stroke="var(--chalk)" strokeWidth="2" opacity={intro} />
      <polyline points={line((u) => Math.cos(TAU * K * u))} fill="none" stroke={BLUE} strokeWidth="2" strokeDasharray="6 6" opacity={intro * 0.9} />
      <polyline points={line((u) => Math.sin(TAU * K * u))} fill="none" stroke={ORANGE} strokeWidth="2" strokeDasharray="6 6" opacity={q * 0.9} />
      <g className="zone" fontSize="16" opacity={intro}>
        <text x={GX} y="300" fill="var(--chalk)">tone</text>
        <text x={GX + 90} y="300" fill={BLUE}>cosine pattern</text>
        <text x={GX + 250} y="300" fill={ORANGE} opacity={q}>sine pattern</text>
      </g>

      <g opacity={intro}>
        <line x1={PX - R - 20} x2={PX + R + 20} y1={CY} y2={CY} stroke="var(--dim)" />
        <text className="zone" x={PX + R + 24} y={CY + 5} fill="var(--dim)" fontSize="16">cos</text>
      </g>
      <g opacity={q}>
        <line x1={PX} x2={PX} y1={CY - R - 20} y2={CY + R + 20} stroke="var(--dim)" />
        <circle cx={PX} cy={CY} r={R} fill="none" stroke="var(--dim)" strokeDasharray="3 5" />
        <text className="zone" x={PX} y={CY - R - 26} textAnchor="middle" fill="var(--dim)" fontSize="16">sin</text>
      </g>
      <g opacity={q}>
        <line x1={PX} y1={CY} x2={px} y2={py} stroke="var(--chalk)" strokeWidth="1.5" />
        <line x1={px} y1={py} x2={px} y2={CY} stroke={BLUE} strokeDasharray="2 4" opacity="0.7" />
        <line x1={px} y1={py} x2={PX} y2={py} stroke={ORANGE} strokeDasharray="2 4" opacity="0.7" />
        <circle cx={PX} cy={py} r="4" fill={ORANGE} />
        <circle cx={px} cy={py} r="6" fill="var(--chalk)" />
      </g>
      <circle cx={px} cy={CY} r="5" fill={BLUE} opacity={dot * (1 - q * 0.4)} />

      <g className="zone" fontSize="16" textAnchor="middle" opacity={dot}>
        <text x={PX - 60} y="296" fill={BLUE}>cosine score {C.toFixed(0)}</text>
        <text x={PX + 80} y="296" fill={ORANGE} opacity={q}>sine score {S.toFixed(0)}</text>
        <text x={PX} y="320" fill="var(--chalk)" opacity={dist}>distance from centre {r.toFixed(0)}</text>
      </g>
    </svg>
  );
}
