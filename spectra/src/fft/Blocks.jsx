import { seg } from '../overview/ease.js';
import { M, TG } from '../math/Tex.jsx';
import { BLUE, ORANGE, DIMC } from '../fourier/Grid.jsx';

export const STOPS = [4.6, 9.4, 14.6, 22.0]; // the matrix F_N, evens first, four blocks, why these blocks

const PINK = '#f08ad0', LIME = '#d9ff52';
const X0 = 84, Y0 = 150, CW = 64, RH = 54, FS = 28; // the numeric 4 x 4 matrix
const SX = 560, SY = 150, BW = 176, BH = 108; // the matrix of blocks, for any N
const FZ = [['1', '1', '1', '1'], ['1', '-i', '-1', 'i'], ['1', '-1', '1', '-1'], ['1', 'i', '-1', '-i']]; // F_4: entry (k, n) is (-i)^{kn}
const POS = [0, 2, 1, 3]; // where column n ends up: even n first, then odd n
const lerp = (a, b, k) => a + (b - a) * k;
const blockOf = (k, n) => (k < 2 ? 0 : 2) + (POS[n] < 2 ? 0 : 1); // 0 top-left, 1 top-right, 2 bottom-left, 3 bottom-right
const BLOCK_COLOUR = [BLUE, ORANGE, BLUE, PINK];
const BLOCK_NAME = ['F_{N/2}', 'D F_{N/2}', 'F_{N/2}', '-D F_{N/2}'];
const IDX = ['A_{00}', 'A_{01}', 'A_{10}', 'A_{11}'];
const brk = (x, y, w, h) => `M${x - 8 + 10} ${y - 4} H${x - 8} V${y + h + 4} H${x - 8 + 10} M${x + w + 8 - 10} ${y - 4} H${x + w + 8} V${y + h + 4} H${x + w + 8 - 10}`;

// F_N split into blocks: reorder the columns (even samples first), and the matrix falls into four blocks. Drawn for N = 4, then for any N
export default function Blocks({ t }) {
  const show = seg(t, 0.2, 1.2), move = seg(t, 5.2, 7.2), lines = seg(t, 7.0, 7.8), paint = seg(t, 9.8, 10.6);
  const blk = [seg(t, 10.6, 11.4), seg(t, 11.4, 12.2), seg(t, 12.2, 13.0), seg(t, 13.0, 13.8)];
  const label = seg(t, 13.6, 14.4);
  const num = 1 - 0.55 * seg(t, 15.0, 15.8); // the numbers step back while the reasons are shown
  const sym = 1 - 0.35 * seg(t, 15.0, 15.8);
  const x = (c) => X0 + CW * (c + 0.5), y = (r) => Y0 + RH * (r + 0.5) + 0.32 * FS;
  return (
    <svg className="frame tall" viewBox="0 0 1000 560" role="img" aria-label="Splitting the Fourier matrix into blocks. Reorder the columns so the even columns come first, then the odd ones. The matrix falls into four blocks: top left F of N over 2, top right D times F of N over 2, bottom left F of N over 2, bottom right minus D times F of N over 2. The top right block has each odd column equal to the matching even column times W to the k, the bottom half has W to the k plus N over 2 equal to minus W to the k.">
      <TG opacity={show * num}>
        <M x={X0 + 2 * CW} y="70" textAnchor="middle" fontSize="28" w={300}>{'$F_4$'}</M>
        <path d={brk(X0, Y0, 4 * CW, 4 * RH)} fill="none" stroke="var(--chalk)" strokeWidth="2" />
        {Array.from({ length: 4 }, (_, n) => (
          <M key={`h${n}`} x={x(lerp(n, POS[n], move))} y={Y0 - 16} textAnchor="middle" fontSize="18" w={60} fill={n % 2 ? ORANGE : BLUE}>{`$n=${n}$`}</M>
        ))}
        {Array.from({ length: 4 }, (_, k) => (
          <M key={`r${k}`} x={X0 - 22} y={y(k)} textAnchor="end" fontSize="18" w={70} fill={DIMC}>{`$k=${k}$`}</M>
        ))}
        {Array.from({ length: 4 }, (_, k) => Array.from({ length: 4 }, (_, n) => {
          const cxn = x(lerp(n, POS[n], move)), tx = `$${FZ[k][n]}$`;
          return (
            <g key={`${k}.${n}`}>
              <M x={cxn} y={y(k)} textAnchor="middle" fontSize={FS} w={80} fill={n % 2 ? ORANGE : BLUE} opacity={1 - paint}>{tx}</M>
              <M x={cxn} y={y(k)} textAnchor="middle" fontSize={FS} w={80} fill={BLOCK_COLOUR[blockOf(k, n)]} opacity={paint}>{tx}</M>
            </g>
          );
        }))}
        <g opacity={lines} stroke="var(--chalk)" strokeWidth="2" strokeDasharray="7 6" fill="none">
          <line x1={X0 + 2 * CW} x2={X0 + 2 * CW} y1={Y0 - 6} y2={Y0 + 4 * RH + 6} />
          <line x1={X0 - 4} x2={X0 + 4 * CW + 4} y1={Y0 + 2 * RH} y2={Y0 + 2 * RH} />
        </g>
      </TG>

      <TG fill="var(--chalk)">
        <M x="560" y="158" fontSize="24" opacity={seg(t, 1.4, 2.2) * (1 - seg(t, 4.9, 5.5))} w={400}>{'entry $(k, n)$ is $W_N^{kn}$'}</M>
        <M x="560" y="198" fill="var(--dim)" fontSize="20" opacity={seg(t, 2.2, 3.0) * (1 - seg(t, 4.9, 5.5))} w={400}>{'shown for $N = 4$, where $W_4 = -i$'}</M>
        <M x="560" y="258" fill={BLUE} fontSize="20" opacity={seg(t, 3.0, 3.8) * (1 - seg(t, 4.9, 5.5))} w={400}>{'even $n$ (blue) and'}</M>
        <M x="560" y="286" fill={ORANGE} fontSize="20" opacity={seg(t, 3.4, 4.2) * (1 - seg(t, 4.9, 5.5))} w={400}>{'odd $n$ (orange) columns'}</M>

        <M x="560" y="158" fontSize="24" opacity={seg(t, 7.2, 8.0) * (1 - seg(t, 9.6, 10.2))} w={400}>{'move the even columns first'}</M>
        <M x="560" y="198" fill="var(--dim)" fontSize="20" opacity={seg(t, 7.8, 8.6) * (1 - seg(t, 9.6, 10.2))} w={400}>{'that is $F_N \\Pi_N^{\\mathsf T}$, where $\\Pi_N$'}</M>
        <M x="560" y="226" fill="var(--dim)" fontSize="20" opacity={seg(t, 8.0, 8.8) * (1 - seg(t, 9.6, 10.2))} w={400}>{'puts the even samples of $\\mathbf{x}$ first'}</M>
        <M x="560" y="272" fill="var(--dim)" fontSize="20" opacity={seg(t, 8.4, 9.2) * (1 - seg(t, 9.6, 10.2))} w={400}>{'so $F_N = (F_N \\Pi_N^{\\mathsf T})\\,\\Pi_N$'}</M>
      </TG>

      <TG opacity={sym}>
        <M x={SX + BW} y="70" textAnchor="middle" fontSize="28" opacity={blk[0]} w={360}>{'$F_N \\Pi_N^{\\mathsf T}$ in blocks'}</M>
        <M x={SX + BW / 2} y={SY - 16} textAnchor="middle" fontSize="18" fill="var(--dim)" opacity={label} w={200}>even samples</M>
        <M x={SX + 1.5 * BW} y={SY - 16} textAnchor="middle" fontSize="18" fill="var(--dim)" opacity={label} w={200}>odd samples</M>
        <M x={SX - 18} y={SY + BH / 2 + 6} textAnchor="end" fontSize="18" fill="var(--dim)" opacity={label} w={140}>{'bins $k < \\frac{N}{2}$'}</M>
        <M x={SX - 18} y={SY + 1.5 * BH + 6} textAnchor="end" fontSize="18" fill="var(--dim)" opacity={label} w={140}>{'bins $k \\geq \\frac{N}{2}$'}</M>
        <path d={brk(SX, SY, 2 * BW, 2 * BH)} fill="none" stroke="var(--chalk)" strokeWidth="2" opacity={blk[0]} />
        {[0, 1, 2, 3].map((b) => {
          const bx = SX + (b % 2) * BW, by = SY + Math.floor(b / 2) * BH;
          return (
            <g key={b} opacity={blk[b]}>
              <rect x={bx + 4} y={by + 4} width={BW - 8} height={BH - 8} rx="8" fill={BLOCK_COLOUR[b]} fillOpacity="0.14" stroke={BLOCK_COLOUR[b]} strokeWidth="2.5" />
              <M x={bx + BW / 2} y={by + BH / 2 + 12} textAnchor="middle" fontSize="32" fill={BLOCK_COLOUR[b]} w={BW}>{`$${BLOCK_NAME[b]}$`}</M>
              <M x={bx + 14} y={by + 28} fontSize="16" fill="var(--dim)" w={70}>{`$${IDX[b]}$`}</M>
            </g>
          );
        })}
      </TG>

      <TG fill="var(--chalk)">
        <M x="60" y="452" fontSize="24" opacity={seg(t, 15.2, 16.0)} w={900}>{'$W_N^{k(2m+1)} = W_N^{k}\\,W_{N/2}^{km}$'}</M>
        <M x="470" y="452" fill={ORANGE} fontSize="22" opacity={seg(t, 15.8, 16.6)} w={500}>{'odd columns: row $k$ times $W_N^{k}$, so $D F_{N/2}$'}</M>
        <M x="60" y="494" fontSize="24" opacity={seg(t, 17.0, 17.8)} w={900}>{'$W_N^{k + N/2} = -W_N^{k}$'}</M>
        <M x="470" y="494" fill={PINK} fontSize="22" opacity={seg(t, 17.6, 18.4)} w={500}>{'lower rows: the factor flips sign, so $-D F_{N/2}$'}</M>
        <M x="60" y="536" fontSize="24" opacity={seg(t, 18.8, 19.6)} w={900}>{'$W_{N/2}^{(k + N/2)m} = W_{N/2}^{km}$'}</M>
        <M x="470" y="536" fill={BLUE} fontSize="22" opacity={seg(t, 19.4, 20.2)} w={500}>{'even columns repeat: $F_{N/2}$ again'}</M>
        <M x="60" y="412" fill="var(--dim)" fontSize="20" opacity={seg(t, 14.9, 15.7)} w={900}>{'$D = \\mathrm{diag}(W_N^{0}, W_N^{1}, \\dots, W_N^{N/2-1})$, here $\\mathrm{diag}(1, -i)$'}</M>
      </TG>
    </svg>
  );
}
