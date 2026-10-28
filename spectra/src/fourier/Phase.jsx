import { seg } from '../overview/ease.js';
import { W, H, N, wave } from '../overview/Frame.jsx';
import { BLUE, ORANGE, GX, GW, GA, MX, CX, ZY, MH, TOP, BOT, X, nums, poly } from './Score.jsx';

export const STOPS = [0.1, 2.6, 5.4, 8.4, 10, 14.4];
const TAU = 2 * Math.PI;
const DELAY = 0.0389, PERIOD = 1 / 9; // how far the whole frame is slid right (as a fraction of its width): the cosine score is zero there and the sine score at its peak; PERIOD: one cycle of 450 Hz
const PX = 430, PY = 258, R = 68, FULL = 30; // plane: centre, radius for a score of FULL
// the Overview's composite frame slid right by d (a delay), keeping its shape
const frame = (d) => (n) => wave(n / (N - 1) - d);
const score = (f, pat) => nums.reduce((s, n) => s + f(n) * pat(n), 0);
const fmt = (x) => String(Math.round(x) || 0);
const label = { fill: 'var(--dim)', fontSize: 16, className: 'zone' };

// opens where Score ends; the pattern stretches back to 450 Hz, the frame is slid right until the cosine score is zero, a sine pattern picks it up, and the two scores become a point that goes round a circle as the tone is delayed all the way round
export default function Phase({ t }) {
  const k = 5 + 4 * seg(t, 0.3, 2.1), psi = (Math.PI / 2) * seg(t, 5.7, 7.5), pl = seg(t, 8.7, 9.5), ring = seg(t, 10.3, 10.9);
  const phi = DELAY * seg(t, 2.9, 4.9) + PERIOD * seg(t, 11, 14);
  const f = frame(phi), p = (n) => Math.cos(TAU * k * n / N - psi), r = (n) => f(n) * p(n);
  const C = score(f, (n) => Math.cos(TAU * 9 * n / N)), S = score(f, (n) => Math.sin(TAU * 9 * n / N)), str = Math.hypot(C, S);
  const sum = score(f, p), g = Math.max(-1, Math.min(1, sum / 30)), px = PX + R * C / FULL, py = PY - R * S / FULL;
  const swing = psi / (Math.PI / 2); // 0: cosine pattern, 1: sine pattern
  const mix = `color-mix(in srgb, ${BLUE}, ${ORANGE} ${100 * swing}%)`;
  return (
    <svg className="frame" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="A delayed tone scores zero on the cosine pattern but is picked up by the sine pattern; plotting the cosine score across and the sine score up gives a point that goes round a circle as the tone is delayed, and its distance from the centre is the strength of the tone">
      <line className="axis" x1={GX} x2={GX + GW} y1={TOP} y2={TOP} />
      <polyline points={poly(f, TOP)} fill="none" stroke="var(--chalk)" strokeWidth="2" />
      <polyline points={poly(p, TOP)} fill="none" stroke={mix} strokeWidth="2" strokeDasharray="6 6" />
      <polyline points={poly((n) => Math.cos(TAU * 9 * n / N), TOP)} fill="none" stroke={BLUE} strokeWidth="2" strokeDasharray="6 6" opacity={pl} />
      <text x={GX - 12} y={TOP + 5} textAnchor="end" {...label} fill={mix}>{Math.round(50 * k)} Hz</text>

      <g opacity={1 - pl}>
        <line className="axis" x1={GX} x2={GX + GW} y1={BOT} y2={BOT} />
        <polyline points={poly(r, BOT)} fill="none" stroke="var(--chalk)" strokeWidth="2" />
        {nums.map((n) => <line key={n} x1={X(n)} x2={X(n)} y1={BOT} y2={BOT - GA * r(n)} stroke={r(n) >= 0 ? BLUE : ORANGE} strokeWidth="4.5" />)}
        <g className="zone">
          <rect x={MX} y={ZY - MH} width="28" height={2 * MH} rx="4" fill="none" stroke="var(--dim)" />
          <rect x={MX} y={Math.min(ZY, ZY - g * MH)} width="28" height={Math.abs(g) * MH} fill={g >= 0 ? BLUE : ORANGE} />
          <line x1={MX - 6} x2={MX + 34} y1={ZY} y2={ZY} stroke="var(--chalk)" />
          <text x={MX - 10} y={ZY + 5} textAnchor="end" {...label}>0</text>
          <text x={MX - 10} y={ZY - MH + 14} textAnchor="end" {...label}>+</text>
          <text x={MX - 10} y={ZY + MH - 2} textAnchor="end" {...label}>−</text>
          <text x={CX} y={ZY + 29} textAnchor="middle" fontSize="52" fill="var(--chalk)">{fmt(sum)}</text>
          <text x={CX} y={ZY - 17} textAnchor="middle" {...label}>Score:</text>
        </g>
      </g>

      <g opacity={pl}>
        <line x1={PX - R - 20} x2={PX + R + 20} y1={PY} y2={PY} stroke="var(--dim)" />
        <line x1={PX} x2={PX} y1={PY - R - 20} y2={PY + R + 20} stroke="var(--dim)" />
        <text x={PX + R + 26} y={PY + 5} {...label}>cos (real)</text>
        <text x={PX} y={PY - R - 28} textAnchor="middle" {...label}>sin (imaginary)</text>
        <circle cx={PX} cy={PY} r={R * 28.5 / FULL} fill="none" stroke="var(--dim)" strokeDasharray="3 5" opacity={ring} />
        <line x1={PX} y1={PY} x2={px} y2={py} stroke="var(--chalk)" strokeWidth="1.5" />
        <line x1={px} y1={py} x2={px} y2={PY} stroke={BLUE} strokeDasharray="2 4" />
        <line x1={px} y1={py} x2={PX} y2={py} stroke={ORANGE} strokeDasharray="2 4" />
        <circle cx={px} cy={PY} r="4" fill={BLUE} />
        <circle cx={PX} cy={py} r="4" fill={ORANGE} />
        <circle cx={px} cy={py} r="6" fill="var(--chalk)" />
        <g className="zone" textAnchor="middle" fontSize="32">
          <text x={CX} y="120" {...label}>Cosine score</text>
          <text x={CX} y="152" fill={BLUE}>{fmt(C)}</text>
          <text x={CX} y="195" {...label}>Sine score</text>
          <text x={CX} y="227" fill={ORANGE}>{fmt(S)}</text>
          <g opacity={ring}>
            <text x={CX} y="270" {...label}>Strength</text>
            <text x={CX} y="302" fill="var(--chalk)">{fmt(str)}</text>
          </g>
        </g>
      </g>
    </svg>
  );
}
