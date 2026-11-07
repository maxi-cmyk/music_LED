import { seg } from '../overview/ease.js';
import { M, TG } from '../math/Tex.jsx';
import { BLUE, ORANGE, GREEN, DIMC } from '../fourier/Grid.jsx';

export const STOPS = [2.4, 13, 15.4]; // the product of blocks, all four result blocks, the factorisation

const PINK = '#f08ad0', LIME = '#d9ff52';
const BW = 112, BH = 80, Y0 = 130;
const AX = 52, BX = 332, CX = 612; // left edge of A, B and C
const COL = [BLUE, ORANGE, BLUE, PINK]; // result blocks C00, C01, C10, C11
const A_TXT = ['I', 'D', 'I', '-D'], B_TXT = ['F_{N/2}', '0', '0', 'F_{N/2}'];
const A_COL = [GREEN, ORANGE, GREEN, PINK];
const C_TXT = ['F_{N/2}', 'D F_{N/2}', 'F_{N/2}', '-D F_{N/2}'];
const brk = (x, w) => `M${x - 8 + 10} ${Y0 - 4} H${x - 8} V${Y0 + 2 * BH + 4} H${x - 8 + 10} M${x + w + 8 - 10} ${Y0 - 4} H${x + w + 8} V${Y0 + 2 * BH + 4} H${x + w + 8 - 10}`;
const EQ = [
  String.raw`$C_{00} = A_{00}B_{00} + A_{01}B_{10} = I\,F_{N/2} + D\,0 = F_{N/2}$`,
  String.raw`$C_{01} = A_{00}B_{01} + A_{01}B_{11} = I\,0 + D\,F_{N/2} = D F_{N/2}$`,
  String.raw`$C_{10} = A_{10}B_{00} + A_{11}B_{10} = I\,F_{N/2} + (-D)\,0 = F_{N/2}$`,
  String.raw`$C_{11} = A_{10}B_{01} + A_{11}B_{11} = I\,0 + (-D)\,F_{N/2} = -D F_{N/2}$`,
];

function Blocks({ x, texts, colours, tag, opacities }) {
  return (
    <g>
      <path d={brk(x, 2 * BW)} fill="none" stroke="var(--chalk)" strokeWidth="2" />
      {[0, 1, 2, 3].map((b) => {
        const bx = x + (b % 2) * BW, by = Y0 + Math.floor(b / 2) * BH, o = opacities?.[b] ?? 1, zero = texts[b] === '0';
        return (
          <g key={b}>
            <rect x={bx + 3} y={by + 3} width={BW - 6} height={BH - 6} rx="7" fill={colours[b]} fillOpacity={zero ? 0 : 0.12 * o} stroke={zero ? DIMC : colours[b]} strokeOpacity={zero ? 0.5 : o} strokeWidth="2" strokeDasharray={zero ? '5 5' : undefined} />
            <M x={bx + BW / 2} y={by + BH / 2 + 11} textAnchor="middle" fontSize="28" fill={zero ? DIMC : colours[b]} opacity={o} w={BW}>{`$${texts[b]}$`}</M>
            <M x={bx + 10} y={by + 24} fontSize="15" fill="var(--dim)" w={60}>{`$${tag}_{${Math.floor(b / 2)}${b % 2}}$`}</M>
          </g>
        );
      })}
    </g>
  );
}

// block-wise multiplication: C_ij is the sum over l of A_il B_lj, block by block
export default function BlockMul({ t }) {
  const show = seg(t, 0.2, 1);
  const step = [seg(t, 2.8, 3.8), seg(t, 5.4, 6.4), seg(t, 8, 9), seg(t, 10.6, 11.6)]; // each result block fills in
  const hot = [step[0] * (1 - seg(t, 5, 5.6)), step[1] * (1 - seg(t, 7.6, 8.2)), step[2] * (1 - seg(t, 10.2, 10.8)), step[3] * (1 - seg(t, 12.2, 12.8))];
  const eqs = [seg(t, 3.6, 4.8), seg(t, 6.2, 7.4), seg(t, 8.8, 10), seg(t, 11.4, 12.6)];
  const fin = seg(t, 14.2, 15), out = seg(t, 13.4, 14);
  const C_OP = step;
  return (
    <svg className="frame tall" viewBox="0 0 1000 560" role="img" aria-label="Block-wise multiplication of the four blocks. The left matrix has blocks I, D, I and minus D, the right matrix has blocks F of N over 2 on the diagonal and zeros elsewhere. Each block of the product is the sum over l of A sub i l times B sub l j. The four results are F of N over 2, D F of N over 2, F of N over 2 and minus D F of N over 2, exactly the four blocks of the Fourier matrix with its columns reordered. So F sub N equals the left matrix times the block diagonal matrix of two copies of F of N over 2, times the permutation matrix Pi.">
      <TG opacity={show}>
        <M x="500" y="70" textAnchor="middle" fontSize="26" w={900}>{'$F_N\\Pi_N^{\\mathsf T} = A\\,B$, each block $\\frac{N}{2}$ by $\\frac{N}{2}$'}</M>
        <Blocks x={AX} texts={A_TXT} colours={A_COL} tag="A" />
        <Blocks x={BX} texts={B_TXT} colours={[BLUE, DIMC, DIMC, BLUE]} tag="B" />
        <M x={BX + 2 * BW + 40} y={Y0 + BH + 10} textAnchor="middle" fontSize="28" w={60}>{'$=$'}</M>
        <path d={brk(CX, 2 * BW)} fill="none" stroke="var(--chalk)" strokeWidth="2" />
        {[0, 1, 2, 3].map((b) => {
          const bx = CX + (b % 2) * BW, by = Y0 + Math.floor(b / 2) * BH;
          return (
            <g key={b}>
              <rect x={bx + 3} y={by + 3} width={BW - 6} height={BH - 6} rx="7" fill={COL[b]} fillOpacity={0.12 * C_OP[b]} stroke={COL[b]} strokeOpacity={0.25 + 0.75 * C_OP[b]} strokeWidth="2" strokeDasharray={C_OP[b] < 0.05 ? '5 5' : undefined} />
              <M x={bx + BW / 2} y={by + BH / 2 + 11} textAnchor="middle" fontSize="28" fill="var(--dim)" opacity={1 - C_OP[b]} w={BW}>{'$?$'}</M>
              <M x={bx + BW / 2} y={by + BH / 2 + 11} textAnchor="middle" fontSize="28" fill={COL[b]} opacity={C_OP[b]} w={BW}>{`$${C_TXT[b]}$`}</M>
              <M x={bx + 10} y={by + 24} fontSize="15" fill="var(--dim)" w={60}>{`$C_{${Math.floor(b / 2)}${b % 2}}$`}</M>
            </g>
          );
        })}
        {[0, 1, 2, 3].map((b) => {
          const i = Math.floor(b / 2), j = b % 2;
          return (
            <g key={`band${b}`} opacity={hot[b]} fill="none" stroke={COL[b]} strokeWidth="3.5" strokeLinejoin="round">
              <rect x={AX - 2} y={Y0 + i * BH - 2} width={2 * BW + 4} height={BH + 4} rx="9" />
              <rect x={BX + j * BW - 2} y={Y0 - 2} width={BW + 4} height={2 * BH + 4} rx="9" />
              <rect x={CX + j * BW - 2} y={Y0 + i * BH - 2} width={BW + 4} height={BH + 4} rx="9" />
            </g>
          );
        })}
      </TG>

      <TG fill="var(--chalk)" opacity={1 - out}>
        {EQ.map((e, i) => <M key={i} x="60" y={338 + 46 * i} fontSize="23" fill={COL[i]} opacity={eqs[i]} w={900}>{e}</M>)}
        <M x="60" y="540" fill="var(--dim)" fontSize="20" opacity={seg(t, 1.2, 2) * (1 - seg(t, 2.7, 3.2))} w={900}>{'block row $i$ of $A$ times block column $j$ of $B$, added up: $C_{ij} = \\sum_l A_{il}B_{lj}$'}</M>
      </TG>

      <TG fill="var(--chalk)" opacity={fin}>
        <M x="60" y="334" fontSize="30" fill={LIME} w={900}>{'$F_N\\Pi_N^{\\mathsf T} = \\begin{bmatrix} I & D \\\\ I & -D \\end{bmatrix}\\begin{bmatrix} F_{N/2} & 0 \\\\ 0 & F_{N/2} \\end{bmatrix}$'}</M>
        <M x="60" y="440" fontSize="30" w={900}>{'$F_N = B_N\\begin{bmatrix} F_{N/2} & 0 \\\\ 0 & F_{N/2} \\end{bmatrix}\\Pi_N$'}</M>
        <M x="60" y="544" fill="var(--dim)" fontSize="20" w={900}>{'$B_N$ is the first factor: only identity and diagonal blocks'}</M>
      </TG>
    </svg>
  );
}
