import { seg } from '../overview/ease.js';
import { M, TG } from '../math/Tex.jsx';

export const STOPS = [5.0, 10.0, 20.4]; // an angle becomes a weight, cosine and sine in one number, one weight per sample
const BLUE = '#5cbcff', ORANGE = '#e8a33d';
const PX = 300, PY = 290, R = 170;
const TH = Math.PI / 3; // the example angle for the first two steps: 60 degrees
const at = (a, r = R) => [PX + r * Math.cos(a), PY - r * Math.sin(a)];
const arc = (to, r) => Array.from({ length: 41 }, (_, i) => at(to * i / 40, r).join(',')).join(' ');

// the arrow behind every Fourier weight: an angle becomes a point on the circle (Euler's formula), its two shadows are the cosine and sine checks,
// and for N = 4, k = 1 it makes one quarter turn per sample, which gives the weights 1, -i, -1, i: row 1 of the Fourier matrix
export default function Weights({ t }) {
  const s1 = TH * seg(t, 0.4, 3.0), s2 = TH - 2 * TH * seg(t, 5.4, 7.6);
  const s3 = -TH * (1 - seg(t, 10.2, 11.2)) - (Math.PI / 2) * (seg(t, 12.0, 12.8) + seg(t, 14.0, 14.8) + seg(t, 16.0, 16.8));
  const angle = t < 5.2 ? s1 : t < 10.1 ? s2 : s3;
  const [x, y] = at(angle);
  const early = 1 - seg(t, 10.2, 10.8); // the shadows and the angle mark belong to the first two steps
  const one = 1 - seg(t, 5.2, 5.8), two = seg(t, 5.2, 5.8) * (1 - seg(t, 10.2, 10.8)), three = seg(t, 10.8, 11.6);
  const rows = [['0', '0', '1'], ['1', '\\pi/2', '-i'], ['2', '\\pi', '-1'], ['3', '3\\pi/2', 'i']];
  const landed = [seg(t, 11.4, 12.0), seg(t, 12.8, 13.4), seg(t, 14.8, 15.4), seg(t, 16.8, 17.4)];
  return (
    <svg className="frame tall" viewBox="0 0 1000 560" role="img" aria-label="A unit arrow turns round a circle: an angle theta gives the point cos theta plus i sin theta, whose two shadows are the cosine and the sine. For four samples and k equal to 1 the arrow turns a quarter turn per sample, giving the weights 1, minus i, minus 1, i: one row of the Fourier matrix.">
      <circle cx={PX} cy={PY} r={R} fill="none" stroke="var(--dim)" strokeWidth="1.5" opacity="0.6" />
      <line x1={PX - R - 24} x2={PX + R + 24} y1={PY} y2={PY} stroke="var(--dim)" strokeWidth="1.5" opacity="0.5" />
      <line x1={PX} x2={PX} y1={PY - R - 24} y2={PY + R + 24} stroke="var(--dim)" strokeWidth="1.5" opacity="0.5" />
      <M x={PX + R - 12} y={PY + 40} textAnchor="end" fill="var(--dim)" fontSize="22">{'$\\cos$ (real)'}</M>
      <M x={PX + 16} y={PY - R + 50} fill="var(--dim)" fontSize="22">{'$\\sin$ (imaginary)'}</M>

      <TG opacity={early * seg(t, 0.6, 1.4)}>
        <line x1={x} x2={x} y1={y} y2={PY} stroke={BLUE} strokeDasharray="4 5" strokeWidth="2.5" />
        <line x1={PX} x2={x} y1={y} y2={y} stroke={ORANGE} strokeDasharray="4 5" strokeWidth="2.5" />
        <circle cx={x} cy={PY} r="8" fill={BLUE} />
        <circle cx={PX} cy={y} r="8" fill={ORANGE} />
        <polyline points={arc(angle, R + 18)} fill="none" stroke="var(--chalk)" strokeWidth="2.5" opacity="0.7" />
        <M x={x} y={PY + (y < PY ? 36 : -20)} textAnchor="middle" fill={BLUE} fontSize="24">{String.raw`$\cos\theta$`}</M>
        <M x={PX - 16} y={y + 8} textAnchor="end" fill={ORANGE} fontSize="24" opacity={one}>{String.raw`$\sin\theta$`}</M>
        <M x={PX - 16} y={y + 8} textAnchor="end" fill={ORANGE} fontSize="24" opacity={two}>{String.raw`$-\sin\theta$`}</M>
        <M x={at(angle / 2, R + 46)[0]} y={at(angle / 2, R + 46)[1] + 8} textAnchor="middle" fill="var(--chalk)" fontSize="24" opacity={Math.min(1, Math.abs(angle) * 3)}>{String.raw`$\theta$`}</M>
      </TG>

      {[0, 1, 2, 3].map((p) => {
        const [dx, dy] = at(-(Math.PI / 2) * p);
        const [lx, ly, anchor] = [[dx + 22, dy + 8, 'start'], [dx, dy + 42, 'middle'], [dx - 22, dy + 8, 'end'], [dx, dy - 26, 'middle']][p];
        return (
          <g key={p} opacity={three * landed[p]}>
            <circle cx={dx} cy={dy} r="10" fill="var(--dim)" />
            <M x={lx} y={ly} textAnchor={anchor} fill="var(--chalk)" fontSize="26">{`$n=${rows[p][0]}:\\ ${rows[p][2]}$`}</M>
          </g>
        );
      })}
      <line x1={PX} y1={PY} x2={x} y2={y} stroke="var(--chalk)" strokeWidth="4.5" />
      <circle cx={x} cy={y} r="10" fill="var(--chalk)" />

      <TG fill="var(--chalk)" fontSize="38">
        <M x="610" y="190" opacity={seg(t, 1.0, 2.0) * one}>{String.raw`$e^{i\theta}$`}</M>
        <M x="610" y="245" opacity={seg(t, 1.4, 2.4) * one}>{String.raw`$= \cos\theta + i\sin\theta$`}</M>
        <M x="610" y="190" opacity={two}>{String.raw`$e^{-i\theta}$`}</M>
        <M x="610" y="245" opacity={two}>{String.raw`$= \cos\theta - i\sin\theta$`}</M>
      </TG>
      <TG fill="var(--dim)" fontSize="24">
        <M x="610" y="320" fill={BLUE} opacity={seg(t, 3.2, 4.0) * one}>across = cosine</M>
        <M x="610" y="358" fill={ORANGE} opacity={seg(t, 3.6, 4.4) * one}>up = sine</M>
        <M x="610" y="300" fill="var(--dim)" opacity={seg(t, 5.8, 6.6) * two * (1 - seg(t, 7.6, 8.0))}>the minus sign turns it clockwise</M>
        <M x="610" y="320" fill={BLUE} opacity={seg(t, 7.8, 8.6) * two}>{String.raw`$\cos\theta$: the cosine check`}</M>
        <M x="610" y="358" fill={ORANGE} opacity={seg(t, 8.4, 9.2) * two}>{String.raw`$-\sin\theta$: the sine check`}</M>
        <M x="610" y="410" fill="var(--chalk)" opacity={seg(t, 9.0, 9.8) * two}>one number holds both checks</M>
      </TG>

      <TG fill="var(--chalk)" opacity={three}>
        <M x="610" y="120" fontSize="34">{String.raw`$\theta = \dfrac{2\pi kn}{N}$`}</M>
        <M x="610" y="200" fill="var(--dim)" fontSize="24">{String.raw`$N = 4,\ k = 1$`}</M>
        {rows.map(([n, th, w], i) => (
          <M key={i} x="610" y={262 + 42 * i} fontSize="28" opacity={landed[i]}>{`$n=${n}:\\quad \\theta=${th}\\ \\Rightarrow\\ ${w}$`}</M>
        ))}
        <M x="610" y="446" fill={BLUE} fontSize="34" opacity={seg(t, 18.2, 19.0)}>{String.raw`$F[1,n] = [1,\ -i,\ -1,\ i]$`}</M>
        <M x="610" y="488" fill="var(--dim)" fontSize="23" opacity={seg(t, 18.8, 19.6)}>one row of the Fourier matrix</M>
      </TG>
    </svg>
  );
}
