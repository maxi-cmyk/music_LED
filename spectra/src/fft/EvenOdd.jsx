import { seg } from '../overview/ease.js';
import { M, TG } from '../math/Tex.jsx';

export const STOPS = [2.6, 5.6, 9.0, 13.1]; // even and odd, split the sum, pull out the extra step, two half-size DFTs
const BLUE = '#5cbcff', ORANGE = '#e8a33d';
const N = 16, K = 3, STEP = 2 * Math.PI * K / N; // a 16-sample DFT, bin 3: the arrow turns 67.5 degrees clockwise per sample
const lerp = (a, b, k) => a + (b - a) * k;
const mix = (c, p) => `color-mix(in srgb, var(--chalk), ${c} ${100 * p}%)`;

function Arrow({ x, y, a, len = 34, color, opacity = 1 }) {
  const x2 = x + len * Math.cos(a), y2 = y - len * Math.sin(a), h = 11;
  return (
    <TG opacity={opacity} stroke={color} fill={color}>
      <line x1={x} y1={y} x2={x2} y2={y2} strokeWidth="3.4" />
      <polygon stroke="none" points={`${x2},${y2} ${x2 - h * Math.cos(-a - 0.45)},${y2 - h * Math.sin(-a - 0.45)} ${x2 - h * Math.cos(-a + 0.45)},${y2 - h * Math.sin(-a + 0.45)}`} />
    </TG>
  );
}

// one bin of a 16-sample DFT: each sample gets a turning arrow; the odd samples' arrows are one step ahead. The algebra (n = 2m, n = 2m + 1, factor out W^k) shows why, then the arrows show it again
const T = (c, s) => String.raw`\textcolor{${c}}{${s}}`; // a coloured piece of a formula
export default function EvenOdd({ t }) {
  const intro = (n) => seg(t, 0.05 + n * 0.03, 0.3 + n * 0.03), tint = seg(t, 0.9, 1.2), move = seg(t, 1.3, 2.5), back = seg(t, 10.4, 11.3), names = seg(t, 12.0, 12.5), formula = seg(t, 12.3, 12.9);
  const vis = 1 - seg(t, 2.8, 3.3) + seg(t, 9.6, 10.2); // the dots and arrows step aside while the algebra is on screen
  const algebra = seg(t, 3.2, 3.8) * (1 - seg(t, 9.2, 9.8)), l1 = seg(t, 3.4, 4.0), l3 = seg(t, 4.4, 5.0), l4 = seg(t, 6.2, 6.8), l5 = seg(t, 7.6, 8.4), l6 = seg(t, 8.2, 8.8);
  return (
    <svg className="frame tall" viewBox="0 0 1000 560" role="img" aria-label="The sixteen samples are split into even and odd positions; the odd samples' arrows each have one extra step, which is taken out of the sum, leaving two half-size DFTs">
      <g opacity={vis}>
      {Array.from({ length: N }, (_, n) => {
        const m = Math.floor(n / 2), odd = n % 2, c = odd ? ORANGE : BLUE;
        const x = lerp(55 + n * 58, 85 + m * 100, move), y = lerp(130, odd ? 365 : 130, move), ay = y + 78;
        const angle = -(n - (odd ? back : 0)) * STEP;
        return (
          <g key={n} opacity={intro(n)}>
            <circle cx={x} cy={y} r="10" fill={mix(c, tint)} />
            <line x1={x} x2={x} y1={y + 12} y2={ay - 42} stroke="var(--dim)" strokeWidth="1.5" strokeDasharray="3 5" opacity="0.5" />
            <Arrow x={x} y={ay} a={angle} color={mix(c, tint)} />
            <M x={x} y={y - 20} textAnchor="middle" fill="var(--dim)" fontSize="18">{n}</M>
          </g>
        );
      })}
      <M x="40" y="40" fill="var(--dim)" fontSize="22" opacity={intro(15)}>sample number, and the arrow that multiplies it</M>
      <g opacity={move}>
        <M x="880" y="138" fill={BLUE} fontSize="24">{names < 0.5 ? 'even' : '$E[k]$'}</M>
        <M x="880" y="373" fill={ORANGE} fontSize="24">{names < 0.5 ? 'odd' : '$O[k]$'}</M>
        <M x="880" y="170" fill={BLUE} fontSize="20" opacity={names}>8-sample DFT</M>
        <M x="880" y="405" fill={ORANGE} fontSize="20" opacity={names}>8-sample DFT</M>
      </g>
      <g opacity={seg(t, 10.3, 10.9)}>
        <Arrow x={830} y={488} a={-STEP} len={48} color={ORANGE} />
        <M x="560" y="526" fill={ORANGE} fontSize="22">{'the extra step $W^{k}$'}</M>
      </g>
      <M x="40" y="528" fill="var(--chalk)" fontSize="36" opacity={formula}>{'$X[k] = E[k] + W^{k}\\,O[k]$'}</M>
      </g>

      <TG opacity={algebra}>
        <M x="40" y="62" fill="var(--chalk)" fontSize="32" opacity={l1 * (1 - 0.6 * l4)}>{String.raw`$X[k] = \sum_{n=0}^{N-1} x[n]\,W^{kn}$`}</M>
        <M x="560" y="62" fill="var(--dim)" fontSize="24" opacity={l1}>{String.raw`$W = e^{-i2\pi/N}$ is one step of the arrow`}</M>
        <M x="40" y="165" fill="var(--chalk)" fontSize="28" opacity={l3}>{String.raw`$X[k] = ${T(BLUE, String.raw`\sum_{m=0}^{N/2-1} x[2m]\,W^{k(2m)}`)} + ${T(ORANGE, String.raw`\sum_{m=0}^{N/2-1} x[2m+1]\,W^{k(2m+1)}`)}$`}</M>
        <M x="40" y="285" fill="var(--chalk)" fontSize="30" opacity={l4}>{String.raw`$W^{k(2m+1)} = ${T(ORANGE, 'W^{k}')}\,W^{2mk}$`}</M>
        <M x="470" y="285" fill={ORANGE} fontSize="24" opacity={l4}>the extra step, the same for every odd sample</M>
        <M x="40" y="400" fill="var(--chalk)" fontSize="28" opacity={l5}>{String.raw`$X[k] = ${T(BLUE, String.raw`\underbrace{\textstyle\sum_{m=0}^{N/2-1} x[2m]\,W^{2mk}}_{E[k]}`)} + ${T(ORANGE, 'W^{k}')}\,${T(ORANGE, String.raw`\underbrace{\textstyle\sum_{m=0}^{N/2-1} x[2m+1]\,W^{2mk}}_{O[k]}`)}$`}</M>
        <M x="40" y="500" fill="var(--dim)" fontSize="22" opacity={l6}>{String.raw`$W^{2} = e^{-i2\pi/(N/2)}$, so each sum is a DFT of half the length`}</M>
      </TG>
    </svg>
  );
}
