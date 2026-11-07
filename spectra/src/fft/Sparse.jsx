import { seg } from '../overview/ease.js';
import { M, TG } from '../math/Tex.jsx';
import { Mat, BLUE, ORANGE, GREEN, DIMC } from '../fourier/Grid.jsx';

export const STOPS = [6.4, 13.2, 20.4, 28.0]; // repeat the split, the real matrices for N = 4, the factors for any N, why they are sparse

const PINK = '#f08ad0', LIME = '#d9ff52';
const CW = 46, RH = 54, FS = 23, Y0 = 150;
const XS = [44, 292, 540, 788]; // A_2, A_1, P_4, F_4
const A2 = [['1', '0', '1', '0'], ['0', '1', '0', '-i'], ['1', '0', '-1', '0'], ['0', '1', '0', 'i']];
const A1 = [['1', '1', '0', '0'], ['1', '-1', '0', '0'], ['0', '0', '1', '1'], ['0', '0', '1', '-1']];
const P4 = [['1', '0', '0', '0'], ['0', '0', '1', '0'], ['0', '1', '0', '0'], ['0', '0', '0', '1']];
const F4 = [['1', '1', '1', '1'], ['1', '-i', '-1', 'i'], ['1', '-1', '1', '-1'], ['1', 'i', '-1', '-i']];
const cellOf = (M4) => (r, c) => ({ text: M4[r][c], fill: M4[r][c] === '0' ? DIMC : undefined });
const nnz = (M4) => M4.flat().filter((v) => v !== '0').length;

function Tint({ x, bx, by, bw, bh, colour, label, opacity = 1 }) {
  const tx = x + bx * CW + 8, ty = Y0 + by * RH; // the name sits on the top edge of its block, on a black tag
  return (
    <g opacity={opacity}>
      <rect x={x + bx * CW + 2} y={ty + 2} width={bw * CW - 4} height={bh * RH - 4} rx="6" fill={colour} fillOpacity="0.15" stroke={colour} strokeWidth="2" />
      <rect x={tx - 3} y={ty - 6} width={label.length * 9 + 12} height="16" rx="4" fill="#000" />
      <M x={tx} y={ty + 7} fontSize="15" fill={colour} w={50}>{`$${label}$`}</M>
    </g>
  );
}

export default function Sparse({ t }) {
  const e = [seg(t, 0.4, 1.4), seg(t, 1.8, 2.8), seg(t, 3.2, 4.2), seg(t, 4.6, 5.6)]; // the four lines of the repeated split
  const outA = seg(t, 6.8, 7.4);
  const num = seg(t, 7.2, 8.4) * (1 - seg(t, 13.6, 14.2));
  const tint = seg(t, 9.0, 10.0), counts = seg(t, 10.4, 11.4), words = seg(t, 11.6, 12.6);
  const gen = [seg(t, 14.4, 15.4), seg(t, 15.8, 17.0), seg(t, 17.4, 18.6), seg(t, 19.0, 20.0)] ;
  const outG = seg(t, 20.8, 21.4);
  const sp = [seg(t, 21.6, 22.4), seg(t, 22.4, 23.2), seg(t, 23.4, 24.2), seg(t, 24.4, 25.2), seg(t, 25.4, 26.2), seg(t, 26.4, 27.2)];
  return (
    <svg className="frame tall" viewBox="0 0 1000 560" role="img" aria-label="Repeating the split gives the FFT as a product of sparse matrices. For N equals 4: F sub 4 equals A sub 2 times A sub 1 times P sub 4, where A sub 2 is the block matrix I, D, I, minus D, A sub 1 is two copies of the 2 by 2 matrix B sub 2 along the diagonal, and P sub 4 swaps rows 1 and 2. In general F sub N is A sub m through A sub 1 times P, with m equal to log base 2 of N. Each row of every A has only two non-zero entries and each row of P has one, so the factors have about 2 N non-zero entries each, where F sub N has N squared. For N equals 128 that is 7 times 256, which is 1,792 against 16,384.">
      <TG fill="var(--chalk)" opacity={1 - outA}>
        <M display x="500" y="76" textAnchor="middle" fontSize="36" w={940} opacity={e[0]}>{String.raw`F_4 = B_4 \begin{bmatrix} F_2 & 0 \\ 0 & F_2 \end{bmatrix} P_4`}</M>
        <M display x="500" y="196" textAnchor="middle" fontSize="32" w={940} opacity={e[1]}>{String.raw`F_2 = B_2 \begin{bmatrix} F_1 & 0 \\ 0 & F_1 \end{bmatrix} \Pi_2 = B_2 \quad \text{since } F_1 = [1],\ \Pi_2 = I`}</M>
        <M display x="500" y="296" textAnchor="middle" fontSize="32" w={940} opacity={e[2]}>{String.raw`\begin{bmatrix} F_2 & 0 \\ 0 & F_2 \end{bmatrix} = \begin{bmatrix} B_2 & 0 \\ 0 & B_2 \end{bmatrix} = A_1`}</M>
        <M display x="500" y="420" textAnchor="middle" fontSize="42" fill={LIME} w={940} opacity={e[3]}>{String.raw`F_4 = A_2\,A_1\,P_4 \qquad (A_2 = B_4)`}</M>
      </TG>

      <TG opacity={num}>
        {[['A_2', 0], ['A_1', 1], ['P_4', 2], ['F_4', 3]].map(([name, i]) => (
          <M key={name} x={XS[i] + 2 * CW} y="104" textAnchor="middle" fontSize="28" w={200}>{`$${name}$`}</M>
        ))}
        <Mat x={XS[0]} y={Y0} rows={4} cols={4} cw={CW} rh={RH} fontSize={FS} cell={cellOf(A2)} />
        <Mat x={XS[1]} y={Y0} rows={4} cols={4} cw={CW} rh={RH} fontSize={FS} cell={cellOf(A1)} />
        <Mat x={XS[2]} y={Y0} rows={4} cols={4} cw={CW} rh={RH} fontSize={FS} cell={cellOf(P4)} />
        <Mat x={XS[3]} y={Y0} rows={4} cols={4} cw={CW} rh={RH} fontSize={FS} cell={cellOf(F4)} />
                <M x="756" y={Y0 + 2 * RH + 10} textAnchor="middle" fontSize="28" w={40}>{'$=$'}</M>

        <g opacity={tint}>
          <Tint x={XS[0]} bx={0} by={0} bw={2} bh={2} colour={GREEN} label="I" />
          <Tint x={XS[0]} bx={2} by={0} bw={2} bh={2} colour={ORANGE} label="D" />
          <Tint x={XS[0]} bx={0} by={2} bw={2} bh={2} colour={GREEN} label="I" />
          <Tint x={XS[0]} bx={2} by={2} bw={2} bh={2} colour={PINK} label="-D" />
          <Tint x={XS[1]} bx={0} by={0} bw={2} bh={2} colour={BLUE} label="B_2" />
          <Tint x={XS[1]} bx={2} by={2} bw={2} bh={2} colour={BLUE} label="B_2" />
        </g>

        <g opacity={counts}>
          {[[A2, 0], [A1, 1], [P4, 2], [F4, 3]].map(([m, i]) => (
            <M key={i} x={XS[i] + 2 * CW} y={Y0 + 4 * RH + 44} textAnchor="middle" fontSize="20" fill={i === 3 ? 'var(--dim)' : LIME} w={220}>{`$${nnz(m)}$ non-zeros`}</M>
          ))}
        </g>
        <M x="500" y="486" textAnchor="middle" fontSize="22" w={900} opacity={words}>{'two non-zero entries in every row of $A_2$ and $A_1$, one in every row of $P_4$'}</M>
        <M x="500" y="522" textAnchor="middle" fontSize="22" fill="var(--dim)" w={900} opacity={words}>{'and none of the entries of $F_4$ is zero'}</M>
      </TG>

      <TG fill="var(--chalk)" opacity={1 - outG}>
        <M display x="500" y="70" textAnchor="middle" fontSize="46" fill={LIME} w={940} opacity={gen[0]}>{String.raw`F_N = A_m \cdots A_2\,A_1\,P`}</M>
        <M x="500" y="196" textAnchor="middle" fontSize="22" fill="var(--dim)" w={940} opacity={gen[0]}>{'$m = \\log_2 N$ factors, all the reorderings together make the bit reversal $P$'}</M>
        <M display x="500" y="230" textAnchor="middle" fontSize="34" w={940} opacity={gen[1]}>{String.raw`A_s = \begin{bmatrix} B_L & & \\ & \ddots & \\ & & B_L \end{bmatrix}, \quad L = 2^s`}</M>
        <M x="500" y="378" textAnchor="middle" fontSize="22" fill="var(--dim)" w={940} opacity={gen[1]}>{'$N/L$ copies of $B_L$ along the diagonal'}</M>
        <M display x="500" y="414" textAnchor="middle" fontSize="34" w={940} opacity={gen[2]}>{String.raw`B_L = \begin{bmatrix} I & D \\ I & -D \end{bmatrix}`}</M>
        <M x="500" y="548" textAnchor="middle" fontSize="22" fill="var(--dim)" w={940} opacity={gen[3]}>{'$D = \\mathrm{diag}(1, W_L, \\dots, W_L^{L/2-1})$: identity and diagonal blocks only'}</M>
      </TG>

      <TG fill="var(--chalk)">
        <M x="70" y="84" fontSize="28" w={860} opacity={sp[0]}>{'$F_N$ has no zeros: $N^2$ non-zero entries'}</M>
        <M x="70" y="124" fontSize="22" fill="var(--dim)" w={860} opacity={sp[0]}>{'for $N = 128$ that is $16{,}384$'}</M>
        <M x="70" y="196" fontSize="28" w={860} opacity={sp[1]}>{'$B_L$ is made of $I$ and $D$, both diagonal: two non-zeros per row'}</M>
        <M x="70" y="236" fontSize="22" fill="var(--dim)" w={860} opacity={sp[1]}>{'so each $A_s$ has $2N$ non-zero entries ($256$ for $N = 128$)'}</M>
        <M x="70" y="308" fontSize="28" fill={LIME} w={860} opacity={sp[2]}>{'$m = 7$ factors of $256$: $1{,}792$ non-zero entries'}</M>
        <M x="70" y="348" fontSize="22" fill="var(--dim)" w={860} opacity={sp[2]}>{'plus $P$, which only moves the samples around: one $1$ per row'}</M>
        <M x="70" y="420" fontSize="26" w={860} opacity={sp[3]}>{'a matrix times a vector costs about one multiplication per non-zero entry'}</M>
        <M x="70" y="486" fontSize="34" fill={LIME} w={860} opacity={sp[4]}>{'$N^2 \\;\\to\\; 2N\\log_2 N$'}</M>
        <M x="70" y="528" fontSize="20" fill="var(--dim)" w={860} opacity={sp[5]}>{'the block structure of $F_N$, half-size copies of itself, is what makes its factors sparse'}</M>
      </TG>
    </svg>
  );
}
