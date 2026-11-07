import { seg } from '../overview/ease.js';
import { M, TG } from '../math/Tex.jsx';
import { Mat, BLUE, ORANGE, GREEN, DIMC } from '../fourier/Grid.jsx';

export const STOPS = [6.6, 13.0, 21.0, 29.0]; // shift the index bits, the same move as a matrix, every level and the product P, a 128 by 128 example

const LIME = '#d9ff52';
const rotr = (n, m) => (n >> 1) | ((n & 1) << (m - 1)); // rotate an m-bit index right by one: what one even/odd split does to the index
const rotl = (r, m) => ((r << 1) & ((1 << m) - 1)) | (r >> (m - 1));
const rev = (i, m) => parseInt(i.toString(2).padStart(m, '0').split('').reverse().join(''), 2);
const tc = (c, s) => `\\textcolor{${c}}{${s}}`;
const lerp = (a, b, k) => a + (b - a) * k;
const bits = (n) => [(n >> 2) & 1, (n >> 1) & 1, n & 1]; // b2 b1 b0 of a 3-bit index
const nBits = (n) => { const [b2, b1, b0] = bits(n); return `${tc(GREEN, b2)}\\,${tc(BLUE, b1)}\\,${tc(ORANGE, b0)}`; };
const pBits = (n) => { const [b2, b1, b0] = bits(n); return `${tc(ORANGE, b0)}\\,${tc(GREEN, b2)}\\,${tc(BLUE, b1)}`; }; // the position: b0 now leads
const SW = { 1: BLUE, 4: BLUE, 3: ORANGE, 6: ORANGE }; // rows the code exchanges: 1 with 4, 3 with 6

// N = 8 pictures of the general rule
const pi8 = (r, c) => (rotr(c, 3) === r ? 1 : 0);
const pi4block = (r, c) => ((r >> 2) === (c >> 2) && rotr(c & 3, 2) === (r & 3) ? 1 : 0); // blockdiag(Pi_4, Pi_4)
const p8 = (r, c) => (rev(r, 3) === c ? 1 : 0);

// the strip: 8 samples, top row the indices, bottom row the positions after one split
const SX = 60, CELL = 66, TOPY = 128, BOTY = 308, CH = 60;
const cxOf = (i) => SX + CELL * (i + 0.5);

// the 128 by 128 permutation: most of it hidden by ellipses, a few rows and columns shown
const ROWS = [0, 1, 2, 3, 'v', 64, 'v', 127], COLS = [0, 1, 'h', 32, 'h', 64, 'h', 96, 'h', 127];

export default function Perm({ t }) {
  const sA = seg(t, 0.2, 1.0), slots = seg(t, 1.0, 1.8), move = seg(t, 2.4, 5.0), grp = seg(t, 4.8, 5.8), outA = seg(t, 7.0, 7.6);
  const mB = seg(t, 7.6, 8.6), ones = seg(t, 8.4, 9.6), vecIn = seg(t, 9.4, 10.4), vecOut = seg(t, 10.2, 11.4), hi = seg(t, 11.4, 12.4), outB = seg(t, 13.4, 14.0);
  const cA = seg(t, 14.0, 15.0), cB = seg(t, 14.6, 15.6), cC = seg(t, 15.6, 16.8), brk = seg(t, 17.4, 18.2), outC = seg(t, 21.4, 22.0);
  const d = seg(t, 22.0, 23.2);
  const MX = 78, MY = 138, CW = 40; // the 8 by 8 matrix and its vectors
  const xr = MX + 8 * CW + 36;
  const hl = hi > 0.5;
  return (
    <svg className="frame tall" viewBox="0 0 1000 560" role="img" aria-label="Bit shifting is multiplying by a permutation matrix. For N equal 2 to the m, the index is an m-bit number whose lowest bit says even or odd. One even-odd split rotates the index right by one bit, and that move is the permutation matrix Pi sub N, with a 1 at row r, column n exactly when r is the rotated index. Splitting each half again is another permutation matrix, and the product of all the levels is P, whose entry i, j is 1 exactly when j is the bit reversal of i. Drawn for N equal 8, where P is the identity with rows 1 and 4, and rows 3 and 6, exchanged. For N equal 128, P has 128 ones, row 1 has its 1 in column 64 and row 3 in column 96, and the code makes 56 swaps instead of 16,384 multiply-adds.">
      <TG opacity={sA * (1 - outA)}>
        <M x={SX} y="100" fontSize="20" fill="var(--dim)" w={300}>{'index $n$'}</M>
        <M x={SX} y="286" fontSize="20" fill="var(--dim)" opacity={slots} w={300}>{'position after one split'}</M>
        {Array.from({ length: 8 }, (_, i) => (
          <g key={`t${i}`}>
            <rect x={SX + CELL * i + 3} y={TOPY} width={CELL - 6} height={CH} rx="7" fill="none" stroke="var(--dim)" strokeWidth="1.5" opacity="0.7" />
            <M x={cxOf(i)} y={TOPY + 26} textAnchor="middle" fontSize="22" w={60}>{`$x_{${i}}$`}</M>
            <M x={cxOf(i)} y={TOPY + 50} textAnchor="middle" fontSize="17" w={60}>{`$${nBits(i)}$`}</M>
          </g>
        ))}
        {Array.from({ length: 8 }, (_, p) => (
          <g key={`b${p}`} opacity={slots}>
            <rect x={SX + CELL * p + 3} y={BOTY} width={CELL - 6} height={CH} rx="7" fill="none" stroke="var(--dim)" strokeWidth="1.5" opacity="0.7" />
          </g>
        ))}
        {Array.from({ length: 8 }, (_, i) => {
          const p = rotr(i, 3), col = i % 2 ? ORANGE : BLUE;
          return (
            <g key={`m${i}`}>
              <line x1={cxOf(i)} y1={TOPY + CH + 2} x2={lerp(cxOf(i), cxOf(p), move)} y2={lerp(TOPY + CH + 2, BOTY - 2, move)} stroke={col} strokeWidth="2.5" opacity={0.7 * move} />
              <M x={cxOf(p)} y={BOTY + 26} textAnchor="middle" fontSize="22" fill={col} opacity={move} w={60}>{`$x_{${i}}$`}</M>
              <M x={cxOf(p)} y={BOTY + 50} textAnchor="middle" fontSize="17" opacity={move} w={60}>{`$${pBits(i)}$`}</M>
            </g>
          );
        })}
        <g opacity={grp}>
          <path d={`M${SX + 6} ${BOTY + CH + 14} v8 H${SX + 4 * CELL - 6} v-8`} stroke={BLUE} strokeWidth="2.5" fill="none" />
          <path d={`M${SX + 4 * CELL + 6} ${BOTY + CH + 14} v8 H${SX + 8 * CELL - 6} v-8`} stroke={ORANGE} strokeWidth="2.5" fill="none" />
          <M x={SX + 2 * CELL} y={BOTY + CH + 48} textAnchor="middle" fontSize="20" fill={BLUE} w={260}>{'even samples, $b_0 = 0$'}</M>
          <M x={SX + 6 * CELL} y={BOTY + CH + 48} textAnchor="middle" fontSize="20" fill={ORANGE} w={260}>{'odd samples, $b_0 = 1$'}</M>
        </g>
        <M x="500" y="506" textAnchor="middle" fontSize="28" opacity={seg(t, 5.2, 6.2)} w={900}>{'$(b_{m-1}\\dots b_1b_0)_2 \\;\\to\\; (b_0b_{m-1}\\dots b_1)_2$'}</M>

        <M x="640" y="150" fontSize="26" opacity={seg(t, 0.8, 1.6)} w={340}>{'$N = 2^m$ samples'}</M>
        <M x="640" y="196" fontSize="22" opacity={seg(t, 1.4, 2.2)} w={340}>{'$n = (b_{m-1}\\dots b_0)_2$'}</M>
        <M x="640" y="256" fontSize="22" fill={ORANGE} opacity={seg(t, 2.2, 3.0)} w={340}>{'lowest bit $b_0$: even or odd'}</M>
        <M x="640" y="296" fontSize="20" fill="var(--dim)" opacity={seg(t, 2.8, 3.6)} w={340}>{'in code: n & 1 and n >> 1'}</M>
        <M x="640" y="360" fontSize="22" fill={LIME} opacity={seg(t, 4.2, 5.2)} w={340}>{'one split rotates the'}</M>
        <M x="640" y="392" fontSize="22" fill={LIME} opacity={seg(t, 4.4, 5.4)} w={340}>{'index right by one bit'}</M>
      </TG>

      <TG opacity={mB * (1 - outB)}>
        <M x={MX + 4 * CW} y={MY - 40} textAnchor="middle" fontSize="26" w={200}>{'$\\Pi_8$'}</M>
        {Array.from({ length: 8 }, (_, c) => (
          <M key={`c${c}`} x={MX + CW * (c + 0.5)} y={MY - 8} textAnchor="middle" fontSize="16" fill={hl && c === 3 ? ORANGE : DIMC} w={40}>{`$${c}$`}</M>
        ))}
        {Array.from({ length: 8 }, (_, r) => (
          <M key={`r${r}`} x={MX - 16} y={MY + CW * (r + 0.5) + 6} textAnchor="end" fontSize="16" fill={hl && r === 5 ? ORANGE : DIMC} w={40}>{`$${r}$`}</M>
        ))}
        <Mat x={MX} y={MY} rows={8} cols={8} cw={CW} rh={CW} fontSize={24} cell={(r, c) => {
          const one = pi8(r, c) === 1;
          return { text: one ? '1' : '0', fill: one ? (hl && r === 5 && c === 3 ? ORANGE : undefined) : DIMC, opacity: one ? ones : 1 };
        }} />
        <g opacity={vecIn}>
          <M x={xr + 27} y={MY - 40} textAnchor="middle" fontSize="26" w={100}>{'$\\mathbf{x}$'}</M>
          <Mat x={xr} y={MY} rows={8} cols={1} cw={54} rh={CW} fontSize={22} cell={(r) => ({ text: `x_{${r}}`, fill: hl && r === 3 ? ORANGE : undefined })} />
          <M x={xr + 54 + 28} y={MY + 4 * CW + 8} textAnchor="middle" fontSize="26" w={40}>$=$</M>
        </g>
        <g opacity={vecOut}>
          <M x={xr + 54 + 56 + 34} y={MY - 40} textAnchor="middle" fontSize="26" w={140}>{'$\\Pi_8\\mathbf{x}$'}</M>
          <Mat x={xr + 54 + 56} y={MY} rows={8} cols={1} cw={68} rh={CW} fontSize={22} cell={(r) => ({ text: `x_{${rotl(r, 3)}}`, fill: hl && r === 5 ? ORANGE : undefined })} />
        </g>

        <M x="690" y="170" fontSize="22" opacity={seg(t, 8.4, 9.2) * (1 - outB)} w={300}>{'the same move as a matrix'}</M>
        <M x="690" y="222" fontSize="22" opacity={seg(t, 9.2, 10.0)} w={300}>{'$(\\Pi_N)_{r,n} = 1$'}</M>
        <M x="690" y="256" fontSize="20" fill="var(--dim)" opacity={seg(t, 9.6, 10.4)} w={300}>{'exactly when $r$ is $n$ rotated'}</M>
        <M x="690" y="312" fontSize="20" opacity={seg(t, 10.8, 11.6)} w={300}>{'one 1 in every row and column:'}</M>
        <M x="690" y="340" fontSize="20" opacity={seg(t, 10.9, 11.7)} w={300}>{'a permutation matrix'}</M>
        <M x="690" y="396" fontSize="20" fill={ORANGE} opacity={hi} w={300}>{'sample 3: $011 \\to 101 = 5$,'}</M>
        <M x="690" y="424" fontSize="20" fill={ORANGE} opacity={hi} w={300}>{'the 1 at row 5, column 3'}</M>
      </TG>

      <TG opacity={cA * (1 - outC)}>
        <M x={64 + 104} y="112" textAnchor="middle" fontSize="20" w={300} opacity={cA}>{'$\\mathrm{blockdiag}(\\Pi_4, \\Pi_4)$'}</M>
        <Mat x={64} y={130} rows={8} cols={8} cw={26} rh={26} fontSize={16} opacity={cA} cell={(r, c) => ({ text: String(pi4block(r, c)), fill: pi4block(r, c) ? undefined : DIMC })} />
        <M x={352 + 104} y="112" textAnchor="middle" fontSize="20" opacity={cB} w={300}>{'$\\Pi_8$'}</M>
        <Mat x={352} y={130} rows={8} cols={8} cw={26} rh={26} fontSize={16} opacity={cB} cell={(r, c) => ({ text: String(pi8(r, c)), fill: pi8(r, c) ? undefined : DIMC })} />
        <M x="598" y="248" textAnchor="middle" fontSize="28" opacity={cC} w={40}>$=$</M>
        <M x={640 + 104} y="112" textAnchor="middle" fontSize="20" opacity={cC} w={300}>{'$P_8$'}</M>
        <Mat x={640} y={130} rows={8} cols={8} cw={26} rh={26} fontSize={16} opacity={cC} cell={(r, c) => ({ text: String(p8(r, c)), fill: p8(r, c) ? (brk > 0.3 ? SW[r] : undefined) : DIMC })} />
        <g opacity={brk} fill="none" strokeWidth="2.5" strokeLinecap="round">
          {[[1, 4, BLUE, 22], [3, 6, ORANGE, 38]].map(([a, b, colr, dd]) => (
            <path key={a} stroke={colr} d={`M${640 + 208 + dd - 8} ${130 + 26 * (a + 0.5)} H${640 + 208 + dd} V${130 + 26 * (b + 0.5)} H${640 + 208 + dd - 8}`} />
          ))}
        </g>
        <M x={640 + 104} y="372" textAnchor="middle" fontSize="18" fill="var(--dim)" opacity={brk} w={330}>{'the identity with rows $1 \\leftrightarrow 4$,'}</M>
        <M x={640 + 104} y="396" textAnchor="middle" fontSize="18" fill="var(--dim)" opacity={brk} w={330}>{'$3 \\leftrightarrow 6$ exchanged'}</M>
        <M x="500" y="452" textAnchor="middle" fontSize="24" opacity={seg(t, 18.2, 19.2)} w={960}>{'$P_N = \\mathrm{blockdiag}(\\Pi_2,\\dots)\\cdots\\mathrm{blockdiag}(\\Pi_{N/2}, \\Pi_{N/2})\\,\\Pi_N$'}</M>
        <M x="500" y="496" textAnchor="middle" fontSize="22" fill={LIME} opacity={seg(t, 19.2, 20.2)} w={900}>{'$(P_N)_{ij} = 1$ exactly when $j = \\mathrm{rev}(i)$'}</M>
        <M x="500" y="538" textAnchor="middle" fontSize="18" fill="var(--dim)" opacity={seg(t, 19.6, 20.6)} w={900}>{'each level rotates fewer bits: $m$, then $m-1$, then $m-2$, down to 1'}</M>
      </TG>

      <TG opacity={d}>
        <M x="300" y="82" textAnchor="middle" fontSize="26" w={400}>{'$P$ for $N = 128$'}</M>
        {COLS.map((c, k) => (
          <M key={`cc${k}`} x={100 + 44 * (k + 0.5)} y={128} textAnchor="middle" fontSize="16" fill={c === 'h' ? 'var(--dim)' : DIMC} w={44}>{c === 'h' ? '$\\cdots$' : `$${c}$`}</M>
        ))}
        {ROWS.map((r, k) => (
          <M key={`rr${k}`} x={86} y={142 + 40 * (k + 0.5) + 6} textAnchor="end" fontSize="16" fill={DIMC} w={60}>{r === 'v' ? '$\\vdots$' : `$${r}$`}</M>
        ))}
        <Mat x={100} y={142} rows={8} cols={10} cw={44} rh={40} fontSize={22} cell={(rk, ck) => {
          const r = ROWS[rk], c = COLS[ck];
          if (r === 'v') return { text: c === 'h' ? '\\ddots' : '\\vdots', fill: 'var(--dim)' };
          if (c === 'h') return { text: '\\cdots', fill: 'var(--dim)' };
          const one = rev(r, 7) === c;
          return { text: one ? '1' : '0', fill: one ? ((r === 1 && c === 64) || (r === 64 && c === 1) ? BLUE : undefined) : DIMC };
        }} />
        <M x="590" y="150" fontSize="24" fill={LIME} opacity={seg(t, 23.0, 23.8)} w={390}>{'$N = 128$, $m = 7$'}</M>
        <M x="590" y="190" fontSize="20" opacity={seg(t, 23.4, 24.2)} w={390}>{'$P$ is $128$ by $128$ with 128 ones'}</M>
        <M x="590" y="224" fontSize="20" opacity={seg(t, 23.8, 24.6)} w={390}>{'row $i$ has its 1 in column $\\mathrm{rev}(i)$'}</M>
        <M x="590" y="278" fontSize="19" fill={BLUE} opacity={seg(t, 24.4, 25.2)} w={390}>{'$1 = 0000001_2 \\to 1000000_2 = 64$'}</M>
        <M x="590" y="308" fontSize="19" fill={ORANGE} opacity={seg(t, 24.8, 25.6)} w={390}>{'$3 = 0000011_2 \\to 1100000_2 = 96$'}</M>
        <M x="590" y="352" fontSize="18" fill="var(--dim)" opacity={seg(t, 25.4, 26.2)} w={390}>{'16 rows stay put, 56 pairs of rows exchange'}</M>
        <M x="590" y="394" fontSize="20" opacity={seg(t, 25.8, 26.6)} w={390}>{'as a matrix product: $16{,}384$ multiply-adds'}</M>
        <M x="590" y="426" fontSize="20" fill={LIME} opacity={seg(t, 26.4, 27.2)} w={390}>{'by shifting the index bits: 56 swaps'}</M>
        <M x="500" y="512" textAnchor="middle" fontSize="28" opacity={seg(t, 27.0, 28.0)} w={900}>{'$F_N = A_m \\cdots A_2\\,A_1\\,P$'}</M>
        <M x="500" y="544" textAnchor="middle" fontSize="18" fill="var(--dim)" opacity={seg(t, 27.6, 28.6)} w={900}>{'every $A_s$ is a pass of butterflies, $P$ is the reordering'}</M>
      </TG>
    </svg>
  );
}
