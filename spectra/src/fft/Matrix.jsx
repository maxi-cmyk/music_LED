import { seg } from '../overview/ease.js';
import { M, TG } from '../math/Tex.jsx';
import { Mat, BLUE, ORANGE, GREEN } from '../fourier/Grid.jsx';

export const STOPS = [6.4, 14.4, 22.0]; // the reordering P, one stage of butterflies, all the stages

// The firmware (FastFourierTransform.cpp) and the web page (signal-analysis.mjs) do the same three things for N samples:
//   1. reorder_bit_reversed_samples: P, a permutation
//   2. apply_fft_stages: for L = 2, 4, ..., N ...
//   3. combine_subtransforms: ... one butterfly u +- W^j v per pair in each block of L
// Written as matrices that is F_N = A_{log N} ... A_2 A_1 P, with A_s = I (x) B_L, L = 2^s and B_L = [I D; I -D], D = diag(1, W_L, ...).
// The code never builds these matrices: it applies each factor in place. Checked numerically against both implementations.
const N8 = 8;
const rev3 = (i) => parseInt(i.toString(2).padStart(3, '0').split('').reverse().join(''), 2);
const stagePattern = (m) => (r, c) => { // A_s: a butterfly joins rows b+j and b+j+m/2 inside each block of m
  const b = Math.floor(r / m) * m, h = m / 2, j = (r - b) % h;
  return Math.floor(c / m) * m === b && ((c - b) === j || (c - b) === j + h);
};
const PERM = (r, c) => c === rev3(r);

// an 8 x 8 sparsity pattern: a dot wherever the matrix is not zero
function Grid({ x, y, cell, pat, colour, opacity = 1, blocks = 0, hot = [], hotColour = GREEN, dots = 1 }) {
  const W = N8 * cell;
  return (
    <g opacity={opacity}>
      <rect x={x} y={y} width={W} height={W} fill="none" stroke="var(--dim)" strokeWidth="1.5" opacity="0.7" />
      {blocks > 0 && Array.from({ length: N8 / blocks }, (_, b) => (
        <rect key={b} x={x + b * blocks * cell} y={y + b * blocks * cell} width={blocks * cell} height={blocks * cell} fill="none" stroke="var(--chalk)" strokeWidth="1.5" strokeDasharray="5 5" opacity="0.5" />
      ))}
      {Array.from({ length: N8 * N8 }, (_, k) => {
        const r = Math.floor(k / N8), c = k % N8;
        if (!pat(r, c)) return null;
        const on = hot.some(([hr, hc]) => hr === r && hc === c), appear = typeof dots === 'function' ? dots(r) : dots;
        return <rect key={k} x={x + c * cell + cell * 0.2} y={y + r * cell + cell * 0.2} width={cell * 0.6} height={cell * 0.6} fill={on ? hotColour : colour} opacity={appear} />;
      })}
    </g>
  );
}

export default function Matrix({ t }) {
  const s0 = 1 - seg(t, 6.8, 7.4), s1 = seg(t, 7.2, 8.0) * (1 - seg(t, 14.8, 15.4)), s2 = seg(t, 15.2, 16.0);
  const C0 = 26; // stop 1 grid cell
  const row = (i) => seg(t, 1.6 + 0.35 * i, 2.1 + 0.35 * i);
  const pulse = seg(t, 10.6, 11.4);
  const CS = 18, GX = [90, 290, 490, 690], GY = 128; // stop 2: P, A_1, A_2, A_3 written in the order they act (right to left in the product)
  const gi = [seg(t, 16.4, 17.2), seg(t, 17.4, 18.2), seg(t, 18.4, 19.2), seg(t, 19.4, 20.2)]; // A_3 | A_2 | A_1 | P is drawn left to right; P first in time
  const order = [3, 2, 1, 0];
  return (
    <svg className="frame tall" viewBox="0 0 1000 560" role="img" aria-label="The FFT as sparse matrices, as the code does it. First the samples are reordered by reversing the bits of each index, a permutation matrix P. Then each stage combines blocks with butterflies, u plus or minus W to the j times v, a sparse matrix with two non-zeros per row. All the stages together give F N x equals A log N down to A 2 A 1 P x. For 128 samples that is 7 stages of 64 butterflies, 448 in all, instead of 16,384 products.">
      <TG opacity={s0}>
        <M x="150" y="102" textAnchor="middle" fill={ORANGE} fontSize="24" w={200} opacity={seg(t, 0.8, 1.6)}>{String.raw`$P\mathbf{x}$`}</M>
        <M x="334" y="102" textAnchor="middle" fill="var(--chalk)" fontSize="24" w={200} opacity={seg(t, 0.8, 1.6)}>{String.raw`$P$`}</M>
        <M x="545" y="102" textAnchor="middle" fill="var(--chalk)" fontSize="24" w={200} opacity={seg(t, 0.4, 1.0)}>{String.raw`$\mathbf{x}$`}</M>
        <Mat x={70} y={128} rows={8} cols={1} cw={90} rh={C0} fontSize={20}
          cell={(r) => ({ text: `x_{${rev3(r)}}`, fill: rev3(r) === r ? 'var(--dim)' : ORANGE, opacity: row(r) })} />
        <M x="205" y={128 + 4 * C0 + 8} textAnchor="middle" fontSize="30" w={80} opacity={seg(t, 1.0, 1.6)}>{String.raw`$=$`}</M>
        <Grid x={230} y={128} cell={C0} pat={PERM} colour={ORANGE} opacity={seg(t, 1.0, 1.8)} dots={(r) => row(r)} />
        <Mat x={500} y={128} rows={8} cols={1} cw={90} rh={C0} fontSize={20} opacity={seg(t, 0.4, 1.0)} cell={(r) => ({ text: `x_{${r}}` })} />
        <TG fill="var(--chalk)" fontSize="26">
          <M x="660" y="150" fill={ORANGE} fontSize="32" opacity={seg(t, 2.0, 2.8)}>bit reversal</M>
          <M x="660" y="198" opacity={seg(t, 3.2, 4.0)}>{String.raw`row $i$ picks $x_{\mathrm{rev}(i)}$`}</M>
          <M x="660" y="256" fill="var(--dim)" fontSize="24" opacity={seg(t, 4.2, 5.0)}>{String.raw`flip the 3 index bits:`}</M>
          <M x="660" y="296" fontSize="26" opacity={seg(t, 4.4, 5.2)}>{String.raw`$1 = 001_2 \;\to\; 100_2 = 4$`}</M>
          <M x="660" y="336" fontSize="26" opacity={seg(t, 4.8, 5.6)}>{String.raw`$3 = 011_2 \;\to\; 110_2 = 6$`}</M>
        </TG>
      </TG>

      <TG opacity={s1}>
        <M x="180" y="102" textAnchor="middle" fill={BLUE} fontSize="26" w={300} opacity={seg(t, 7.6, 8.4)}>{String.raw`$A_2 = I_2 \otimes B_4$`}</M>
        <Grid x={70} y={128} cell={C0} pat={stagePattern(4)} colour={BLUE} blocks={4} opacity={seg(t, 7.6, 8.6)}
          hot={pulse > 0.5 ? [[0, 0], [0, 2], [2, 0], [2, 2]] : []} dots={1} />
        <M x="180" y={128 + 8 * C0 + 40} textAnchor="middle" fill="var(--dim)" fontSize="21" w={300} opacity={seg(t, 8.8, 9.6)}>two blocks, applied independently</M>
        <TG fill="var(--chalk)" fontSize="26">
          <M x="370" y="150" fontSize="30" opacity={seg(t, 9.2, 10.0)}>{String.raw`$B_4 = \begin{bmatrix} I & D \\ I & -D \end{bmatrix}$`}</M>
          <M x="370" y="232" fontSize="28" opacity={seg(t, 9.8, 10.6)}>{String.raw`$D = \mathrm{diag}(1,\ W_4),\quad W_4 = e^{-i2\pi/4}$`}</M>
          <M x="370" y="292" fill={GREEN} fontSize="26" opacity={seg(t, 10.8, 11.6)}>{String.raw`one butterfly, rows $j$ and $j+2$:`}</M>
          <M x="370" y="336" fontSize="28" opacity={seg(t, 11.4, 12.2)}>{String.raw`$\text{top} = u + W_4^{\,j}\,v$`}</M>
          <M x="370" y="378" fontSize="28" opacity={seg(t, 12.0, 12.8)}>{String.raw`$\text{bottom} = u - W_4^{\,j}\,v$`}</M>
        </TG>
      </TG>

      <TG opacity={s2}>
        {[['A_3', 'L = 8', BLUE, stagePattern(8), 8], ['A_2', 'L = 4', BLUE, stagePattern(4), 4], ['A_1', 'L = 2', BLUE, stagePattern(2), 2], ['P', 'bit reversal', ORANGE, PERM, 0]].map(([name, note, colour, pat, blocks], i) => (
          <g key={name} opacity={gi[order.indexOf(i)]}>
            <M x={GX[i] + 4.5 * CS} y={GY - 22} textAnchor="middle" fill="var(--chalk)" fontSize="30" w={200}>{`$${name}$`}</M>
            <Grid x={GX[i]} y={GY} cell={CS} pat={pat} colour={colour} />
            <M x={GX[i] + 4.5 * CS} y={GY + 8 * CS + 34} textAnchor="middle" fill="var(--dim)" fontSize="20" w={200}>{note}</M>
          </g>
        ))}
        <M x="500" y="352" textAnchor="middle" fill="var(--chalk)" fontSize="34" w={900} opacity={seg(t, 20.4, 21.2)}>{String.raw`$F_N\mathbf{x} = A_{\log_2 N}\cdots A_2\,A_1\,P\,\mathbf{x}$`}</M>
        <M x="500" y="402" textAnchor="middle" fill="var(--dim)" fontSize="22" w={900} opacity={seg(t, 20.6, 21.4)}>the code never builds these matrices: it applies each factor in place</M>
        <M x="500" y="466" textAnchor="middle" fill="var(--chalk)" fontSize="26" w={900} opacity={seg(t, 20.8, 21.6)}>{String.raw`$N = 128$: direct, 128 × 128 = 16,384 products`}</M>
        <M x="500" y="506" textAnchor="middle" fill={ORANGE} fontSize="26" w={900} opacity={seg(t, 21.0, 21.8)}>{String.raw`7 stages × 64 butterflies = 448`}</M>
      </TG>
    </svg>
  );
}
