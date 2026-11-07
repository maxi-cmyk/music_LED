import { seg } from '../overview/ease.js';
import { M, TG } from '../math/Tex.jsx';
import { Mat, BLUE, ORANGE, DIMC } from '../fourier/Grid.jsx';

export const STOPS = [2.8, 7.0, 12.0, 16.6]; // the identity, two row exchanges, P times x, N = 128

const LIME = '#d9ff52';
const N = 8, X0 = 78, Y0 = 112, CW = 42, FS = 27, VW = 54, RW = 66; // matrix cell, entry font, widths of the two vectors
const W = N * CW;
const rev = (i) => parseInt(i.toString(2).padStart(3, '0').split('').reverse().join(''), 2);
const SW = { 1: BLUE, 4: BLUE, 3: ORANGE, 6: ORANGE }; // rows the code exchanges: 1 with 4, 3 with 6
const lerp = (a, b, k) => a + (b - a) * k;
const cx = (c) => X0 + CW * (c + 0.5);
const cy = (r) => Y0 + CW * (r + 0.5) + 0.32 * FS;
const bracket = (x, y, w, h) => `M${x - 8 + 9} ${y - 4} H${x - 8} V${y + h + 4} H${x - 8 + 9} M${x + w + 8 - 9} ${y - 4} H${x + w + 8} V${y + h + 4} H${x + w + 8 - 9}`;

// P: the identity matrix with rows 1 and 4, and rows 3 and 6, exchanged. Row i of P has its 1 in column rev(i), the bit-reversed index
export default function Perm({ t }) {
  const show = seg(t, 0.2, 1.0), swap = seg(t, 3.2, 5.2), brk = seg(t, 5.0, 5.8) * (1 - seg(t, 7.4, 8.0));
  const prod = seg(t, 8.0, 9.6), res = seg(t, 9.4, 11.0), big = seg(t, 12.4, 13.2);
  const dim = 1 - 0.7 * big;
  const swapped = (r) => rev(r) !== r;
  const xr = X0 + W + 30; // the vectors to the right of the matrix
  const col = (r) => SW[r] ?? 'var(--chalk)';
  return (
    <svg className="frame tall" viewBox="0 0 1000 560" role="img" aria-label="Bit reversal as a permutation matrix for N equals 8. Start from the identity matrix I, then exchange row 1 with row 4 and row 3 with row 6. The result is the permutation matrix P, which has a single 1 in every row and column, in column rev of the row. Multiplying P by the vector x gives x0, x4, x2, x6, x1, x5, x3, x7. For N equals 128 the matrix has 128 ones and the code makes 56 swaps directly instead of building it.">
      <TG opacity={show * dim}>
        <M x={X0 + W / 2} y="86" textAnchor="middle" fontSize="28" w={200} opacity={1 - swap}>{'$I_8$'}</M>
        <M x={X0 + W / 2} y="86" textAnchor="middle" fontSize="28" w={200} opacity={swap}>{'$P$'}</M>
        {Array.from({ length: N }, (_, r) => (
          <M key={`l${r}`} x={X0 - 20} y={cy(r)} textAnchor="end" fontSize="20" w={40} fill={SW[r] && swap > 0.05 ? SW[r] : DIMC}>{`$${r}$`}</M>
        ))}
        <path d={bracket(X0, Y0, W, W)} fill="none" stroke="var(--chalk)" strokeWidth="2" />
        {Array.from({ length: N }, (_, r) => Array.from({ length: N }, (_, c) => {
          const moves = swapped(r);
          if (c === r && !moves) return <M key={`${r}.${c}`} x={cx(c)} y={cy(r)} textAnchor="middle" fontSize={FS} w={60}>$1$</M>;
          if (moves && c === r) return <M key={`${r}.${c}`} x={cx(c)} y={cy(r)} textAnchor="middle" fontSize={FS} w={60} fill={DIMC} opacity={swap}>$0$</M>;
          if (moves && c === rev(r)) return <M key={`${r}.${c}`} x={cx(c)} y={cy(r)} textAnchor="middle" fontSize={FS} w={60} fill={DIMC} opacity={1 - swap}>$0$</M>;
          return <M key={`${r}.${c}`} x={cx(c)} y={cy(r)} textAnchor="middle" fontSize={FS} w={60} fill={DIMC}>$0$</M>;
        }))}
        {Array.from({ length: N }, (_, r) => swapped(r) && (
          <M key={`m${r}`} x={lerp(cx(r), cx(rev(r)), swap)} y={cy(r)} textAnchor="middle" fontSize={FS} w={60} fill={swap > 0.05 ? col(r) : 'var(--chalk)'}>$1$</M>
        ))}
        <g opacity={brk} fill="none" strokeWidth="2.5" strokeLinecap="round">
          {[[1, 4, BLUE, 22], [3, 6, ORANGE, 40]].map(([a, b, colr, d]) => (
            <path key={a} stroke={colr} d={`M${X0 + W + d - 8} ${Y0 + CW * (a + 0.5)} H${X0 + W + d} V${Y0 + CW * (b + 0.5)} H${X0 + W + d - 8}`} />
          ))}
        </g>
      </TG>

      <TG opacity={prod * dim}>
        <Mat x={xr + 6} y={Y0} rows={N} cols={1} cw={VW} rh={CW} fontSize={FS} cell={(r) => ({ text: `x_{${r}}`, fill: SW[r] })} />
        <M x={xr + 6 + VW + 26} y={Y0 + W / 2 + 8} textAnchor="middle" fontSize="26" w={40}>{'$=$'}</M>
      </TG>
      <TG opacity={res * dim}>
        <Mat x={xr + 6 + VW + 52} y={Y0} rows={N} cols={1} cw={RW} rh={CW} fontSize={FS} cell={(r) => ({ text: `x_{${rev(r)}}`, fill: SW[r] })} />
      </TG>

      <TG fill="var(--chalk)" fontSize="22">
        <M x="706" y="130" fontSize="26" opacity={seg(t, 0.8, 1.6) * (1 - seg(t, 3.4, 4.0))} w={280}>identity matrix</M>
        <M x="706" y="172" fill="var(--dim)" fontSize="20" opacity={seg(t, 1.4, 2.2) * (1 - seg(t, 3.4, 4.0))} w={280}>{'a $1$ in row $i$, column $i$'}</M>

        <M x="706" y="130" fontSize="26" opacity={seg(t, 4.0, 4.8) * (1 - seg(t, 7.6, 8.2))} w={280}>exchange two rows</M>
        <M x="706" y="176" fill={BLUE} fontSize="24" opacity={seg(t, 4.6, 5.4) * (1 - seg(t, 7.6, 8.2))} w={280}>{'rows $1 \\leftrightarrow 4$'}</M>
        <M x="706" y="214" fill={ORANGE} fontSize="24" opacity={seg(t, 5.0, 5.8) * (1 - seg(t, 7.6, 8.2))} w={280}>{'rows $3 \\leftrightarrow 6$'}</M>
        <M x="706" y="268" fill="var(--dim)" fontSize="20" opacity={seg(t, 5.8, 6.6) * (1 - seg(t, 7.6, 8.2))} w={280}>the result is a permutation</M>
        <M x="706" y="294" fill="var(--dim)" fontSize="20" opacity={seg(t, 6.0, 6.8) * (1 - seg(t, 7.6, 8.2))} w={280}>{'matrix $P$'}</M>

        <M x="706" y="130" fill={LIME} fontSize="26" opacity={seg(t, 9.8, 10.6) * (1 - big)} w={280}>{'$P\\mathbf{x}$ reorders $\\mathbf{x}$'}</M>
        <M x="706" y="180" fontSize="24" opacity={seg(t, 10.4, 11.2) * (1 - big)} w={280}>{'$P_{ij} = 1$ when $j = \\mathrm{rev}(i)$'}</M>
        <M x="706" y="222" fill="var(--dim)" fontSize="20" opacity={seg(t, 11.0, 11.8) * (1 - big)} w={280}>one 1 in every row and column</M>

        <M x="706" y="130" fill={LIME} fontSize="26" opacity={seg(t, 13.2, 14.0)} w={280}>{'$N = 128$'}</M>
        <M x="706" y="176" fontSize="22" opacity={seg(t, 13.8, 14.6)} w={280}>{'$P$ is $128$ by $128$'}</M>
        <M x="706" y="212" fontSize="22" opacity={seg(t, 14.2, 15.0)} w={280}>{'with 128 ones'}</M>
        <M x="706" y="264" fontSize="22" opacity={seg(t, 14.8, 15.6)} w={280}>{'$56$ row exchanges'}</M>
        <M x="706" y="316" fill="var(--dim)" fontSize="20" opacity={seg(t, 15.4, 16.2)} w={280}>the code makes these swaps</M>
        <M x="706" y="342" fill="var(--dim)" fontSize="20" opacity={seg(t, 15.6, 16.4)} w={280}>directly; it never builds $P$</M>
      </TG>
    </svg>
  );
}
