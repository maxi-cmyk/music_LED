import Overview from '../overview/Overview.jsx';
import { BoldMatrices } from '../math/Tex.jsx';
import Derive, { STOPS as S1 } from './Derive.jsx';
import Butterfly, { STOPS as S2 } from './Butterfly.jsx';
import Blocks, { STOPS as S5b } from './Blocks.jsx';
import BlockMul, { STOPS as S5c } from './BlockMul.jsx';
import Perm, { STOPS as S5a } from './Perm.jsx';
import Code, { STOPS as S1c } from './Code.jsx';
import Complexity, { STOPS as S6 } from './Complexity.jsx';

// the idea, the butterfly, the same pieces as matrices, the code, then the time complexity
const PAGES = [
  { name: 'Split', title: 'The idea: from the DFT to the FFT', labels: ['The DFT, then even and odd', 'Factor out the offset', 'Name the pieces'], View: Derive, stops: S1, fresh: true, speed: 1.8, why: [
    undefined,
    'The extra factor does not depend on $m$, so it comes outside the sum.',
    'Each half-size sum is itself a DFT, so the same split can be applied to it again, all the way down to single samples. That repeated split is the FFT, and it gives exactly the same answers as the direct method.',
  ], text: [
    'The DFT: $N$ rows of $N$ products. Split the sum into even and odd positions, $n = 2m$ and $n = 2m + 1$: $N/2$ samples each.',
    'Factor out the odd samples\' extra offset, so both sums have the same half-size weights.',
    'Each sum is an $N/2$-point DFT. Name them $E_k$ and $O_k$, and the extra factor $W_N^{k}$: $X_k = E_k + W_N^{k}O_k$. Divide and conquer.',
  ] },
  { name: 'Butterfly', title: 'The idea: the butterfly', labels: ['Twist the odd one', 'Add', 'Subtract'], View: Butterfly, stops: S2, fresh: true, speed: 1.5, why: [
    undefined,
    undefined,
    'This is the same at every level of the FFT. A block of length $L$ is built from two halves of length $L/2$ the same way, with $W_L^{j}$ in place of $W_N^{k}$.',
  ], text: [
    'For $N$ samples, bins $k$ and $k + N/2$ share one $E_k$ and one $O_k$. Twist the odd answer by the extra step $W_N^{k}$.',
    'Add it to the even answer: that is bin $k$.',
    'Turn it half a turn (bin $k + N/2$ flips its sign) and add: that is bin $k + N/2$. One twist, two answers: a butterfly.',
  ] },
  { name: 'Blocks', title: 'The matrix way: the Fourier matrix in blocks', labels: ['The matrix $F_N$', 'Even columns first', 'Four blocks'], View: Blocks, stops: S5b, fresh: true, speed: 1.2, why: [
    undefined,
    'Reordering the columns of $F_N$ is the same as reordering the samples in $\\mathbf{x}$: $F_N\\mathbf{x} = (F_N\\Pi_N^{\\mathsf T})(\\Pi_N\\mathbf{x})$.',
    'Rows $k$ and $k + N/2$ come out of the same two half-size matrices, which is why one block appears twice. An odd column is the even one times $W_N^{k}$, and the lower rows flip that factor\'s sign: the same step as in the butterfly.',
  ], text: [
    'The same idea as matrices. The Fourier matrix $F_N$ has $W_N^{kn}$ in row $k$, column $n$. Here $N = 4$, so the entries are $1, -i, -1, i$.',
    'Move the even columns to the front, then the odd ones. The matrix is now cut into four square blocks.',
    'Each block is $\\frac{N}{2}$ by $\\frac{N}{2}$ and has a name: $F_{N/2}$, $DF_{N/2}$, $F_{N/2}$ and $-DF_{N/2}$. $D$ is the diagonal matrix of the $W_N^{k}$ from the first page.',
  ] },
  { name: 'BlockMul', title: 'The matrix way: block-wise multiplication', labels: ['Two matrices of blocks', 'Multiply block-wise', 'The factorisation'], View: BlockMul, stops: S5c, fresh: true, speed: 1.2, why: [
    'The blocks are conformant: every block is $\\frac{N}{2}$ by $\\frac{N}{2}$, so each product $A_{il}B_{lj}$ is defined.',
    undefined,
    'Each of the four sums is one half of a butterfly: $F_{N/2}$ is $E_k$, and $DF_{N/2}$ is the twisted $W_N^{k}O_k$.',
  ], text: [
    'The same four blocks are a product of two matrices of blocks: the first has blocks $I$, $D$, $I$ and $-D$, the second has $F_{N/2}$ on its diagonal and $0$ elsewhere.',
    'Multiply block-wise, $C_{ij} = \\sum_l A_{il}B_{lj}$. The four results are $F_{N/2}$, $DF_{N/2}$, $F_{N/2}$ and $-DF_{N/2}$: exactly the four blocks of the Fourier matrix.',
    'Undoing the column reordering gives a factorisation of $F_N$: the butterfly matrix $B_N$ times two half-size Fourier matrices, times the reordering $\\Pi_N$. Next: what $\\Pi_N$ does to the bits of the index.',
  ] },
  { name: 'Perm', title: 'The matrix way: bit shifting is multiplying by P', labels: ['Shift the index bits', 'The same move is a matrix', 'Every level is a matrix', 'A 128 by 128 example'], View: Perm, stops: S5a, fresh: true, speed: 1.2, why: [
    'A split looks at one bit of the index: the lowest bit picks the half, and the rest is the position inside it. In code that is $n \\,\\&\\, 1$ and $n \\gg 1$, the shifts and masks the firmware uses. It works because $N$ is a power of two, so every half is again a power of two.',
    undefined,
    'Repeating the split on each half gives one permutation matrix for each level, and they multiply together into the bit-reversal matrix $P$. The code makes the same swaps directly, whenever $i < \\mathrm{rev}(i)$.',
    'The saving in operations from $N^2$ to $N\\log N$ comes from reusing the half-size blocks. The bit tricks make the reordering free of arithmetic and in place.',
  ], text: [
    'On a binary computer the split is cheap. For $N = 2^m$ samples the index is an $m$-bit number, and its lowest bit says even or odd. One split rotates the index right by one bit: even samples first, then odd. Drawn for $N = 8$.',
    'That move is a matrix: $\\Pi_N$ has a 1 at row $r$, column $n$ exactly when $r$ is $n$ rotated. It is a permutation matrix, so shifting the index bits is the same as multiplying by it: $\\Pi_N\\mathbf{x}$ is the even samples, then the odd.',
    'The next split rotates the lower bits inside each half, another permutation matrix. All the levels multiplied together give $P_N$, whose entry $(i, j)$ is 1 exactly when $j = \\mathrm{rev}(i)$. For $N = 8$ it is the identity with rows 1 and 4, and 3 and 6, exchanged.',
    'For $N = 128$, $P$ is $128$ by $128$ with 128 ones: row 1 has its 1 in column 64, row 3 in column 96. As a matrix product it would cost 16,384 multiply-adds; shifting the index bits does it with 56 swaps. Then $F_N = A_m\\cdots A_2A_1P$.',
  ] },
  { name: 'Code', title: 'The code: the FFT in C++ on the ESP32', labels: ['The whole function', 'Into reorder', 'Into apply the stages', 'Into combine'], View: Code, stops: S1c, fresh: true, speed: 1.2, why: [
    undefined,
    'Reversing the bits is the even and odd split applied all the way down: the pairs that must be combined end up side by side. The code gets $\\mathrm{rev}(i)$ by counting up in reversed bits, with shifts and masks.',
    undefined,
    'The firmware gets each twiddle factor $W_L^{j}$ by multiplying by $W_L$ once per step (the line twiddle *= step), instead of calling sine and cosine every time.',
  ], text: [
    'The whole FFT is one function: it copies the samples into the spectrum arrays, then makes two calls, reorder the samples and apply the stages.',
    'Step into the first call, reorder_bit_reversed_samples. It counts $j$ up in reversed bits and swaps sample $i$ with sample $j$ once: the matrix $P$.',
    'The second call is apply_fft_stages. It makes $\\log_2 N$ passes of block length $L = 2, 4, \\dots, N$; one pass is the matrix $A_s$.',
    'Inside it, each block calls combine_subtransforms: the butterflies. The top output is $u + W_L^{j}v$ and the bottom is $u - W_L^{j}v$, a block of $B_L$.',
  ] },
  { name: 'Complexity', title: 'Time complexity: DFT versus FFT', labels: ['DFT and FFT in big O'], View: Complexity, stops: S6, fresh: true, speed: 1.2, why: [
    'Big O describes how the number of operations grows as $N$ grows, ignoring constants: $N^2 + 5N$ and $3N^2$ are both $O(N^2)$. For the FFT, splitting in half $\\log_2 N$ times is the recursion $T(N) = 2\\,T(N/2) + O(N)$: two half-size problems, plus a combining step that touches every sample once. These are operation counts, not stopwatch times: a butterfly and a product are different amounts of work.',
  ], text: [
    '',
  ] },
];

export default function FFT({ onHome, next }) {
  return <BoldMatrices.Provider value><Overview onHome={onHome} next={next} pages={PAGES} /></BoldMatrices.Provider>;
}
