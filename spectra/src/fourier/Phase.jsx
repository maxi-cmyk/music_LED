import { seg } from '../overview/ease.js';
import { W, H, N, wave } from '../overview/Frame.jsx';
import { BLUE, ORANGE, GX, GW, GA, MX, CX, ZY, MH, TOP, BOT, X, nums, poly } from './Score.jsx';
import { M, TG } from '../math/Tex.jsx';

export const STOPS = [5.4, 10, 14.4]; // delayed tone, one point, the circle
const DIM = '#6a6a64', GREEN = '#8fe36a';
const TAU = 2 * Math.PI;
const DELAY = 1 / (9 * Math.PI), PERIOD = 1 / 9; // how far the 450 Hz tone is slid right (as a fraction of the frame's width): the cosine score is zero there and the sine score at its peak; PERIOD: one cycle of 450 Hz
const PX = 430, PY = 312, R = 112, FULL = 30; // plane: centre, radius for a score of FULL
// the Overview's composite frame slid right by d (a delay), keeping its shape
const TONE = [9, 0.45, 2]; // the 450 Hz tone in the Overview's frame: [cycles per frame, strength, phase]
const others = (u) => wave(u) - TONE[1] * Math.sin(TAU * TONE[0] * u + TONE[2]); // everything else in the frame
// the frame with all but the 450 Hz tone faded out (m: 0 to 1) and the tone delayed by d. at m = 1 the tone sits exactly on the DFT's grid (n/N), so delaying it turns its answer without changing its length
const frame = (m, d) => (n) => (1 - m) * others(n / (N - 1)) + TONE[1] * Math.sin(TAU * TONE[0] * (n / (N - 1 + m) - d) + TONE[2]);
const score = (f, pat) => nums.reduce((s, n) => s + f(n) * pat(n), 0);
const fmt = (x) => String(Math.round(x) || 0);
const label = { fill: 'var(--dim)', fontSize: 16, className: 'zone' };

// opens where Score ends; the pattern stretches back to 450 Hz, the frame is slid right until the cosine score is zero, a sine pattern picks it up, and the two scores become a point that goes round a circle as the tone is delayed all the way round
export default function Phase({ t }) {
  const k = 5 + 4 * seg(t, 0.3, 2.1), psi = (Math.PI / 2) * seg(t, 5.7, 7.5), pl = seg(t, 8.7, 9.5), ring = seg(t, 10.3, 10.9);
  const phi = DELAY * seg(t, 2.9, 4.9) + PERIOD * seg(t, 11, 14);
  const f = frame(seg(t, 0.2, 1.4), phi), p = (n) => Math.cos(TAU * k * n / N - psi), r = (n) => f(n) * p(n);
  const C = score(f, (n) => Math.cos(TAU * 9 * n / N)), S = -score(f, (n) => Math.sin(TAU * 9 * n / N)), str = Math.hypot(C, S); // A and B as in the Fourier transform: B carries the minus sign
  const raw = score(f, p), sum = psi > Math.PI / 4 ? -raw : raw, g = Math.max(-1, Math.min(1, sum / 30)), px = PX + R * C / FULL, py = PY - R * S / FULL;
  const rebuilt = (n) => (2 / N) * (C * Math.cos(TAU * 9 * n / N) - S * Math.sin(TAU * 9 * n / N)); // the 450 Hz tone rebuilt from the point alone
  const swing = psi / (Math.PI / 2); // 0: cosine pattern, 1: sine pattern
  const mix = `color-mix(in srgb, ${BLUE}, ${ORANGE} ${100 * swing}%)`;
  return (
    <svg className="frame tall" viewBox={`0 0 ${W} 560`} role="img" aria-label="A delayed tone scores zero on the cosine pattern but is picked up by the sine pattern; plotting the cosine score across and the sine score up gives a point that goes round a circle as the tone is delayed, and its distance from the centre is the strength of the tone">
      <line className="axis" x1={GX} x2={GX + GW} y1={TOP} y2={TOP} />
      <polyline points={poly(f, TOP)} fill="none" stroke="var(--chalk)" strokeWidth="2" />
      <polyline points={poly(p, TOP)} fill="none" stroke={mix} strokeWidth="2" strokeDasharray="6 6" />
      <polyline points={poly((n) => Math.cos(TAU * 9 * n / N), TOP)} fill="none" stroke={BLUE} strokeWidth="2" strokeDasharray="6 6" opacity={pl} />
      <polyline points={poly(rebuilt, TOP)} fill="none" stroke={GREEN} strokeWidth="3" strokeDasharray="3 6" opacity={ring} />
      <M x={GX} y="22" fill={GREEN} fontSize="20" opacity={ring}>dashed: the tone rebuilt from Re and Im alone</M>
      <M x={GX - 12} y={TOP + 5} textAnchor="end" {...label} fill={mix}>{Math.round(50 * k)} Hz</M>

      <TG opacity={1 - pl}>
        <line className="axis" x1={GX} x2={GX + GW} y1={BOT} y2={BOT} />
        <polyline points={poly(r, BOT)} fill="none" stroke="var(--chalk)" strokeWidth="2" />
        {nums.map((n) => <line key={n} x1={X(n)} x2={X(n)} y1={BOT} y2={BOT - GA * r(n)} stroke={r(n) >= 0 ? BLUE : ORANGE} strokeWidth="4.5" />)}
        <TG className="zone">
          <rect x={MX} y={ZY - MH} width="28" height={2 * MH} rx="4" fill="none" stroke="var(--dim)" />
          <rect x={MX} y={Math.min(ZY, ZY - g * MH)} width="28" height={Math.abs(g) * MH} fill={g >= 0 ? BLUE : ORANGE} />
          <line x1={MX - 6} x2={MX + 34} y1={ZY} y2={ZY} stroke="var(--chalk)" />
          <M x={MX - 10} y={ZY + 5} textAnchor="end" {...label}>0</M>
          <M x={MX - 10} y={ZY - MH + 14} textAnchor="end" {...label}>$+$</M>
          <M x={MX - 10} y={ZY + MH - 2} textAnchor="end" {...label}>$-$</M>
          <M x={CX} y={ZY + 29} textAnchor="middle" fontSize="52" fill="var(--chalk)">{fmt(sum)}</M>
          <M x={CX} y={ZY - 17} textAnchor="middle" {...label}>{swing < 0.5 ? '$\\mathrm{Re}\\,X_9$' : '$\\mathrm{Im}\\,X_9$'}</M>
        </TG>
      </TG>

      <TG opacity={pl}>
        <line x1={PX - R - 20} x2={PX + R + 20} y1={PY} y2={PY} stroke="var(--dim)" />
        <line x1={PX} x2={PX} y1={PY - R - 20} y2={PY + R + 20} stroke="var(--dim)" />
        <M x={PX + R - 14} y={PY + 42} textAnchor="end" {...label} fontSize="20">$\cos$ (real)</M>
        <M x={PX + 18} y={PY - R + 52} {...label} fontSize="20">$\sin$ (imaginary)</M>
        <circle cx={PX} cy={PY} r={R * 28.8 / FULL} fill="none" stroke="var(--dim)" strokeDasharray="3 5" opacity={ring} />
        <line x1={PX} y1={PY} x2={px} y2={py} stroke="var(--chalk)" strokeWidth="1.5" />
        <line x1={px} y1={py} x2={px} y2={PY} stroke={BLUE} strokeDasharray="2 4" />
        <line x1={px} y1={py} x2={PX} y2={py} stroke={ORANGE} strokeDasharray="2 4" />
        <circle cx={px} cy={PY} r="4" fill={BLUE} />
        <circle cx={PX} cy={py} r="4" fill={ORANGE} />
        <circle cx={px} cy={py} r="6" fill="var(--chalk)" />
        <TG className="zone" textAnchor="middle" fontSize="32">
          <M x={CX} y="120" {...label}>{String.raw`$\mathrm{Re}\,X_9$ (cosine)`}</M>
          <M x={CX} y="152" fill={BLUE}>{fmt(C)}</M>
          <M x={CX} y="195" {...label}>{String.raw`$\mathrm{Im}\,X_9$ (sine)`}</M>
          <M x={CX} y="227" fill={ORANGE}>{fmt(S)}</M>
          <TG opacity={ring}>
            <M x={CX} y="270" {...label}>{'$|X_9|$'}</M>
            <M x={CX} y="302" fill="var(--chalk)">{fmt(str)}</M>
          </TG>
        </TG>
      </TG>

      {(() => { // the coefficients behind the picture
        const intro = seg(t, 1.0, 1.7), sineIn = seg(t, 5.7, 6.4), toPoint = seg(t, 8.7, 9.4), toStrength = seg(t, 10.3, 11.0);
        return (
          <TG>
            <M x="40" y="490" fontSize="30" opacity={intro * (1 - toPoint)}>{String.raw`$\mathrm{Re}\,X_{k} = \sum_{n} x[n]\cos\frac{2\pi kn}{N}$`}</M>
            <M x="520" y="490" fontSize="30" opacity={sineIn * (1 - toPoint)}>{String.raw`$\mathrm{Im}\,X_{k} = -\sum_{n} x[n]\sin\frac{2\pi kn}{N}$`}</M>
            <M x={PX} y="486" textAnchor="middle" fontSize="42" opacity={toPoint}>{String.raw`$X_{k} = \mathrm{Re}\,X_{k} + i\,\mathrm{Im}\,X_{k}$`}</M>
            <M x={PX} y="540" textAnchor="middle" fontSize="36" opacity={toStrength}>{String.raw`$|X_{k}| = \sqrt{(\mathrm{Re}\,X_{k})^{2} + (\mathrm{Im}\,X_{k})^{2}}$`}</M>
          </TG>
        );
      })()}
    </svg>
  );
}
