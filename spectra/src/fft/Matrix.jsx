import { seg } from '../overview/ease.js';
import { M, TG } from '../math/Tex.jsx';
import { Mat, Arrow, BLUE, ORANGE, GREEN, DIMC } from '../fourier/Grid.jsx';

export const STOPS = [5.4, 11.8, 20.0]; // one split as matrices, worked for N = 4, every stage is a sparse factor

// ---- stop 1: the split worked through for N = 4 on the toy example, in complex arithmetic
const x4 = [1, 0, -1, 0];
const px = [x4[0], x4[2], x4[1], x4[3]]; // P: even samples first
const half = (a, b) => [a + b, a - b]; // F_2
const E = half(px[0], px[1]), O = half(px[2], px[3]);
const halves = [...E, ...O];
const D = [[1, 0], [0, -1]]; // diag(1, -i) as [re, im]
const cmul = ([a, b], [c, d]) => [a * c - b * d, a * d + b * c];
const X4 = [0, 1, 2, 3].map((k) => { const w = cmul(D[k % 2], [O[k % 2], 0]), s = k < 2 ? 1 : -1; return [E[k % 2] + s * w[0], s * w[1]]; });
const real = (z) => String(Math.round(z[0]));

// ---- stop 2: the factors of F_8 as sparsity patterns
const N8 = 8, CELL = 16, GY = 140, GX = [110, 274, 438, 602, 766]; // F, A3, A2, A1, P
const rev3 = (i) => parseInt(i.toString(2).padStart(3, '0').split('').reverse().join(''), 2);
const stagePattern = (m) => (r, c) => { // A_s = I_{N/m} (x) B_m: a butterfly joins rows b+j and b+j+m/2
  const b = Math.floor(r / m) * m, h = m / 2, j = (r - b) % h;
  return Math.floor(c / m) * m === b && ((c - b) === j || (c - b) === j + h);
};
const GRIDS = [
  { name: 'F_8', pat: () => true, note: '8 per row', colour: 'var(--dim)' },
  { name: 'A_3', pat: stagePattern(8), note: '2 per row', colour: BLUE },
  { name: 'A_2', pat: stagePattern(4), note: '2 per row', colour: BLUE },
  { name: 'A_1', pat: stagePattern(2), note: '2 per row', colour: BLUE },
  { name: 'P', pat: (r, c) => c === rev3(r), note: '1 per row', colour: ORANGE },
];

// a square block matrix drawn as four labelled quadrants
function Blocks({ x, y, s = 180, cells, opacity = 1 }) {
  const q = s / 2;
  return (
    <g opacity={opacity}>
      <path d={`M${x + 9 - 8} ${y - 4} H${x - 8} V${y + s + 4} H${x + 1}`} fill="none" stroke="var(--chalk)" strokeWidth="2" />
      <path d={`M${x + s + 8 - 9} ${y - 4} H${x + s + 8} V${y + s + 4} H${x + s - 1}`} fill="none" stroke="var(--chalk)" strokeWidth="2" />
      {cells.map(([text, colour], i) => (
        <g key={i}>
          <rect x={x + (i % 2) * q + 3} y={y + Math.floor(i / 2) * q + 3} width={q - 6} height={q - 6} fill={colour} opacity={colour === 'none' ? 0 : 0.14} />
          <M x={x + (i % 2) * q + q / 2} y={y + Math.floor(i / 2) * q + q / 2 + 13} textAnchor="middle" fill={colour === 'none' ? DIMC : colour} fontSize="38" w={q * 2}>{`$${text}$`}</M>
        </g>
      ))}
    </g>
  );
}

// the FFT as linear algebra: one split is F_N = [I D; I -D] diag(F_{N/2}, F_{N/2}) P. Repeating it down to F_2 turns F_N into log2(N) sparse
// factors (two non-zeros per row) and one reordering P: N/2 butterflies per stage instead of N x N products
export default function Matrix({ t }) {
  const g0 = 1 - seg(t, 5.9, 6.5), g1 = seg(t, 6.6, 7.2) * (1 - seg(t, 12.4, 13.0)), g2 = seg(t, 12.8, 13.4);
  const xc = seg(t, 0.2, 0.8), pIn = seg(t, 0.8, 1.5), mid = seg(t, 1.8, 2.5), left = seg(t, 2.8, 3.5);
  const col = (i) => 80 + 240 * i, show = (i) => seg(t, 7.0 + 1.4 * i, 7.6 + 1.4 * i);
  const gridIn = [seg(t, 17.6, 18.2), seg(t, 16.6, 17.2), seg(t, 15.6, 16.2), seg(t, 14.6, 15.2), seg(t, 13.6, 14.2)];
  const vecs = [x4, px, halves, X4.map(real).map(Number)];
  const names = ['\\mathbf{x}', 'P\\mathbf{x}', '\\mathrm{diag}(F_2, F_2)\\,P\\mathbf{x}', '\\mathbf{X}'];
  const ops = ['shuffle', 'two $F_2$ blocks', 'butterflies'];
  return (
    <svg className="frame tall" viewBox="0 0 1000 560" role="img" aria-label="The FFT as matrices. One split gives F_N equal to the matrix I, D, I, minus D times the block matrix F of N over 2 twice times the even-odd shuffle P. For four samples this takes x equals (1, 0, minus 1, 0) to (0, 2, 0, 2). Repeating the split gives log N sparse factors, each with two non-zero entries per row, times a reordering.">
      <TG opacity={g0}>
        <M x="20" y="258" fill="var(--chalk)" fontSize="44" opacity={seg(t, 3.6, 4.2)}>{String.raw`$F_N =$`}</M>
        <Blocks x={150} y={160} opacity={left} cells={[['I', BLUE], ['D', ORANGE], ['I', BLUE], ['-D', ORANGE]]} />
        <Blocks x={380} y={160} opacity={mid} cells={[['F_{N/2}', 'var(--chalk)'], ['0', 'none'], ['0', 'none'], ['F_{N/2}', 'var(--chalk)']]} />
        <g opacity={pIn}>
          <path d="M618 156 H610 V344 H618" fill="none" stroke="var(--chalk)" strokeWidth="2" />
          <path d="M702 156 H710 V344 H702" fill="none" stroke="var(--chalk)" strokeWidth="2" />
          <rect x="616" y="160" width="88" height="180" fill={ORANGE} opacity="0.14" />
          <M x="660" y="262" textAnchor="middle" fill={ORANGE} fontSize="38" w={180}>{String.raw`$P$`}</M>
        </g>
        <g opacity={xc}>
          <path d="M758 156 H750 V344 H758" fill="none" stroke="var(--chalk)" strokeWidth="2" />
          <path d="M806 156 H814 V344 H806" fill="none" stroke="var(--chalk)" strokeWidth="2" />
          <M x="782" y="262" textAnchor="middle" fill="var(--chalk)" fontSize="38" w={120}>{String.raw`$\mathbf{x}$`}</M>
        </g>
        {[['3', 240, left], ['2', 470, mid], ['1', 660, pIn]].map(([n, cx, o]) => (
          <g key={n} opacity={o}>
            <circle cx={cx} cy="128" r="15" fill="none" stroke="var(--dim)" strokeWidth="1.5" />
            <M x={cx} y="135" textAnchor="middle" fill="var(--dim)" fontSize="20" w={60}>{n}</M>
          </g>
        ))}
        <TG fill="var(--dim)" fontSize="22" textAnchor="middle">
          <M x="240" y="388" w={300} opacity={left}>butterflies</M>
          <M x="470" y="388" w={300} opacity={mid}>two half-size DFTs</M>
          <M x="660" y="388" w={300} opacity={pIn}>shuffle</M>
        </TG>
        <M x="80" y="468" fill="var(--chalk)" fontSize="30" opacity={seg(t, 4.2, 5.0)}>{String.raw`$D = \mathrm{diag}(1, W, W^{2}, \dots, W^{N/2-1}),\quad W = e^{-i2\pi/N}$`}</M>
        <M x="80" y="512" fill="var(--dim)" fontSize="22" opacity={seg(t, 4.6, 5.2)}>{String.raw`$P$ puts the even samples first. $I$ is the identity and $0$ a block of zeros.`}</M>
      </TG>

      <TG opacity={g1}>
        {vecs.map((v, i) => (
          <g key={i} opacity={show(i)}>
            <M x={col(i) + 35} y="112" textAnchor="middle" fill={i === 3 ? ORANGE : 'var(--chalk)'} fontSize="22" w={300}>{`$${names[i]}$`}</M>
            <Mat x={col(i)} y={130} rows={4} cols={1} cw={70} rh={52} fontSize={28} cell={(r) => ({ text: String(v[r]), fill: i === 3 ? ORANGE : 'var(--chalk)' })} />
            {i > 0 && <Arrow x1={col(i - 1) + 70 + 26} y1={234} x2={col(i) - 28} y2={234} color={GREEN} width={3.5} head={6} />}
            {i > 0 && <M x={(col(i - 1) + 70 + col(i)) / 2} y="268" textAnchor="middle" fill="var(--dim)" fontSize="20" w={220}>{ops[i - 1]}</M>}
          </g>
        ))}
        <M x="80" y="400" fill="var(--chalk)" fontSize="26" opacity={seg(t, 10.2, 10.8)}>{String.raw`$E = (0, 2),\ O = (0, 0),\ D = \mathrm{diag}(1, -i)$`}</M>
        <M x="80" y="446" fill="var(--chalk)" fontSize="26" opacity={seg(t, 10.6, 11.2)}>{String.raw`$X_k = E_k + D_kO_k,\quad X_{k+2} = E_k - D_kO_k$`}</M>
        <M x="80" y="498" fill="var(--dim)" fontSize="22" opacity={seg(t, 11.2, 11.8)}>{String.raw`the same $(0, 2, 0, 2)$ as the toy example, $F\mathbf{x}$`}</M>
      </TG>

      <TG opacity={g2}>
        {GRIDS.map((g, i) => (
          <g key={g.name} opacity={gridIn[i]}>
            <M x={GX[i] + 64} y={GY - 26} textAnchor="middle" fill="var(--chalk)" fontSize="30" w={200}>{`$${g.name}$`}</M>
            <rect x={GX[i]} y={GY} width={N8 * CELL} height={N8 * CELL} fill="none" stroke="var(--dim)" strokeWidth="1.5" opacity="0.7" />
            {Array.from({ length: N8 * N8 }, (_, k) => {
              const r = Math.floor(k / N8), c = k % N8;
              return g.pat(r, c) ? <rect key={k} x={GX[i] + c * CELL + 3} y={GY + r * CELL + 3} width={CELL - 6} height={CELL - 6} fill={g.colour} opacity={i === 0 ? 0.55 : 1} /> : null;
            })}
            <M x={GX[i] + 64} y={GY + N8 * CELL + 34} textAnchor="middle" fill="var(--dim)" fontSize="20" w={200}>{g.note}</M>
          </g>
        ))}
        <M x={(GX[0] + N8 * CELL + GX[1]) / 2} y={GY + 76} textAnchor="middle" fill="var(--chalk)" fontSize="34" w={120} opacity={gridIn[0]}>{String.raw`$=$`}</M>
        <M x="500" y="372" textAnchor="middle" fill="var(--chalk)" fontSize="34" w={900} opacity={seg(t, 18.0, 18.8)}>{String.raw`$F_N = A_{\log_2 N}\cdots A_2\,A_1\,P$`}</M>
        <M x="500" y="422" textAnchor="middle" fill="var(--dim)" fontSize="23" w={900} opacity={seg(t, 18.4, 19.0)}>{String.raw`each $A_s$ is $N/2$ butterflies: two non-zeros per row, and $P$ only reorders`}</M>
        <M x="500" y="480" textAnchor="middle" fill="var(--chalk)" fontSize="26" w={900} opacity={seg(t, 18.8, 19.4)}>{String.raw`$N = 128$: direct, 128 × 128 = 16,384 products`}</M>
        <M x="500" y="520" textAnchor="middle" fill={ORANGE} fontSize="26" w={900} opacity={seg(t, 19.2, 19.8)}>{String.raw`factored, 7 × 64 = 448 butterflies`}</M>
      </TG>
    </svg>
  );
}
