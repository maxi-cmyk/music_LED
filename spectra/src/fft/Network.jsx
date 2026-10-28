import { seg } from '../overview/ease.js';
import { M, TG } from '../math/Tex.jsx';

const T = [0, 1.8, 3.4, 5.0, 6.6, 8.2, 9.6]; // when each part of the animation rests
export const STOPS = [1.8, 8.2, 9.6]; // shuffle done, all four stages done, totals
const BLUE = '#5cbcff';
const N = 16, X0 = 175, DX = 170, Y = (r) => 40 + r * 31;
const rev = (i) => parseInt(i.toString(2).padStart(4, '0').split('').reverse().join(''), 2);
const lerp = (a, b, k) => a + (b - a) * k;
// stage s joins row a with row a + 2^(s-1), inside blocks of 2^s rows
const stages = [1, 2, 3, 4].map((s) => {
  const half = 2 ** (s - 1), pairs = [];
  for (let b = 0; b < N; b += 2 * half) for (let j = 0; j < half; j++) pairs.push([b + j, b + j + half]);
  return pairs;
});

// a 16-sample FFT drawn out: shuffle the samples, then four stages of eight butterflies each
export default function Network({ t }) {
  const shuffle = seg(t, 0.2, 1.7);
  return (
    <svg className="frame tall" viewBox="0 0 1000 560" role="img" aria-label="A 16-sample FFT: the samples are shuffled, then four stages of eight butterflies combine them into 16 answers">
      {stages.map((pairs, i) => {
        const s = i + 1, p = seg(t, T[s] + 0.1, T[s + 1] - 0.25);
        const dim = s < 4 ? seg(t, T[s + 1] + 0.1, T[s + 1] + 0.6) : 0; // fades once the next stage starts drawing
        const live = p > 0 && dim < 1;
        const colour = dim < 0.5 ? BLUE : 'var(--chalk)';
        const xa = X0 + (s - 1) * DX, xb = X0 + s * DX;
        return (
          <TG key={s} opacity={p * (1 - 0.65 * dim)}>
            {pairs.flatMap(([a, b]) => [[a, a], [a, b], [b, a], [b, b]].map(([from, to]) => (
              <line key={`${from}-${to}`} x1={xa} y1={Y(from)} x2={xb} y2={Y(to)} stroke={colour} strokeWidth={live ? 2.6 : 1.6} />
            )))}
            {Array.from({ length: N }, (_, r) => <circle key={r} cx={xb} cy={Y(r)} r="5.5" fill={colour} />)}
          </TG>
        );
      })}
      {Array.from({ length: N }, (_, i) => {
        const y = lerp(Y(i), Y(rev(i)), shuffle);
        return (
          <TG key={i}>
            <M x={X0 - 16} y={y + 7} textAnchor="end" fill="var(--chalk)" fontSize="20">{`$x[${i}]$`}</M>
            <circle cx={X0} cy={y} r="5.5" fill="var(--chalk)" />
          </TG>
        );
      })}
      <TG opacity={seg(t, 8.0, 8.6)}>
        {Array.from({ length: N }, (_, r) => <M key={r} x={X0 + 4 * DX + 16} y={Y(r) + 7} fill="var(--chalk)" fontSize="20">{`$X[${r}]$`}</M>)}
      </TG>
      {[1, 2, 3, 4].map((s) => (
        <M key={s} x={X0 + (s - 0.5) * DX} y="548" textAnchor="middle" fill="var(--dim)" fontSize="22" opacity={seg(t, T[s] + 0.1, T[s] + 0.6)}>stage {s}</M>
      ))}
    </svg>
  );
}
