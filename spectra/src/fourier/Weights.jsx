import { seg } from '../overview/ease.js';
import { M, TG } from '../math/Tex.jsx';
import { BLUE } from './Grid.jsx';

export const STOPS = [9.4]; // one row of weights: a quarter turn per sample
const PX = 270, PY = 290, R = 170;
const at = (a, r = R) => [PX + r * Math.cos(a), PY - r * Math.sin(a)];
const arc = (to, r) => Array.from({ length: 41 }, (_, i) => at(to * i / 40, r).join(',')).join(' ');
const ROWS = [['0', '0', '1'], ['1', '\\pi/2', '-i'], ['2', '\\pi', '-1'], ['3', '3\\pi/2', 'i']]; // n, theta, weight

// the entries of the Fourier matrix. e^{-i theta} is taken as known (a point on the unit circle); for N = 4 and k = 1 the arrow turns
// a quarter turn clockwise per sample and lands on the weights 1, -i, -1, i: row 1 of the matrix
export default function Weights({ t }) {
  const turn = seg(t, 2.6, 3.4) + seg(t, 4.6, 5.4) + seg(t, 6.6, 7.4);
  const angle = -(Math.PI / 2) * turn;
  const [x, y] = at(angle);
  const landed = [seg(t, 1.6, 2.2), seg(t, 3.4, 4.0), seg(t, 5.4, 6.0), seg(t, 7.4, 8.0)];
  return (
    <svg className="frame tall" viewBox="0 0 1000 560" role="img" aria-label="An arrow of length one turns clockwise round a circle by a quarter turn for each sample. For four samples and k equal to 1 it lands on the weights 1, minus i, minus 1, i: one row of the Fourier matrix.">
      <circle cx={PX} cy={PY} r={R} fill="none" stroke="var(--dim)" strokeWidth="1.5" opacity="0.6" />
      <line x1={PX - R - 24} x2={PX + R + 24} y1={PY} y2={PY} stroke="var(--dim)" strokeWidth="1.5" opacity="0.5" />
      <line x1={PX} x2={PX} y1={PY - R - 24} y2={PY + R + 24} stroke="var(--dim)" strokeWidth="1.5" opacity="0.5" />
      <M x={PX + R - 12} y={PY - 14} textAnchor="end" fill="var(--dim)" fontSize="22">real</M>
      <M x={PX + 16} y={PY - R + 50} fill="var(--dim)" fontSize="22">imaginary</M>
      <polyline points={arc(angle, R + 18)} fill="none" stroke="var(--chalk)" strokeWidth="2.5" opacity={0.7 * seg(t, 2.6, 3.0)} />

      {[0, 1, 2, 3].map((p) => {
        const [dx, dy] = at(-(Math.PI / 2) * p);
        const [lx, ly, anchor] = [[dx + 22, dy + 8, 'start'], [dx, dy + 42, 'middle'], [dx - 22, dy + 8, 'end'], [dx, dy - 26, 'middle']][p];
        return (
          <g key={p} opacity={landed[p]}>
            <circle cx={dx} cy={dy} r="10" fill="var(--dim)" />
            <M x={lx} y={ly} textAnchor={anchor} fill="var(--chalk)" fontSize="26">{`$n=${ROWS[p][0]}:\\ ${ROWS[p][2]}$`}</M>
          </g>
        );
      })}
      <line x1={PX} y1={PY} x2={x} y2={y} stroke="var(--chalk)" strokeWidth="4.5" />
      <circle cx={x} cy={y} r="10" fill="var(--chalk)" />

      <TG fill="var(--chalk)">
        <M x="610" y="110" fontSize="36" opacity={seg(t, 0.3, 1.1)}>{String.raw`$F_{k,n} = e^{-i\theta_{k,n}}$`}</M>
        <M x="610" y="170" fontSize="32" opacity={seg(t, 0.6, 1.4)}>{String.raw`$\theta_{k,n} = \dfrac{2\pi kn}{N}$`}</M>
        <M x="610" y="236" fill="var(--dim)" fontSize="24" opacity={seg(t, 1.0, 1.6)}>{String.raw`$N = 4,\ k = 1$`}</M>
        {ROWS.map(([n, th, w], i) => (
          <M key={i} x="610" y={290 + 42 * i} fontSize="28" opacity={landed[i]}>{`$n=${n}:\\quad \\theta=${th}\\ \\Rightarrow\\ ${w}$`}</M>
        ))}
        <M x="610" y="496" fill={BLUE} fontSize="34" opacity={seg(t, 8.2, 9.0)}>{String.raw`$F_{1,n} = [1,\ -i,\ -1,\ i]$`}</M>
        <M x="610" y="534" fill="var(--dim)" fontSize="22" opacity={seg(t, 8.6, 9.4)}>one row of the Fourier matrix</M>
      </TG>
    </svg>
  );
}
