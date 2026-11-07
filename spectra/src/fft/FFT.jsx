import Overview from '../overview/Overview.jsx';
import { BoldMatrices } from '../math/Tex.jsx';
import Derive, { STOPS as S1 } from './Derive.jsx';
import BitRev, { STOPS as S0 } from './BitRev.jsx';
import Code, { STOPS as S1c } from './Code.jsx';
import Signal, { STOPS as S6a, DIFF_EXP } from './Signal.jsx';
import Count, { STOPS as S6b } from './Count.jsx';
import Butterfly, { STOPS as S2 } from './Butterfly.jsx';
import Network, { STOPS as S3 } from './Network.jsx';
import Perm, { STOPS as S5a } from './Perm.jsx';
import Blocks, { STOPS as S5b } from './Blocks.jsx';
import BlockMul, { STOPS as S5c } from './BlockMul.jsx';
import Sparse, { STOPS as S5d } from './Sparse.jsx';

// the idea, the matrix way, the code, then the DFT and the FFT side by side on the hardware's own frame
const PAGES = [
  { name: 'Split', title: 'The idea: from the DFT to the FFT', labels: ['The DFT for N samples', 'Even and odd positions', 'Factor out the offset', 'Name the pieces'], View: Derive, stops: S1, fresh: true, speed: 1.8, why: [
    undefined,
    undefined,
    'The extra factor does not depend on $m$, so it comes outside the sum.',
    'Each half-size sum is itself a DFT, so the same split can be applied to it again, all the way down to single samples. That repeated split is the FFT, and it gives exactly the same answers as the direct method.',
  ], text: [
    'The DFT for $N$ samples: every bin $k$ multiplies all $N$ samples by their Fourier weights and adds. That is $N$ rows of $N$ products each.',
    'Separate the even and odd sample positions: $n = 2m$ and $n = 2m + 1$. Each group has $N/2$ samples.',
    'Factor out the odd samples\' extra offset, so both sums have the same half-size weights.',
    'Each sum is an $N/2$-point DFT. Name them $E_k$ and $O_k$, and the extra factor $W_N^{k}$: $X_k = E_k + W_N^{k}O_k$. Divide and conquer.',
  ] },
  { name: 'Blocks', title: 'The matrix way: the Fourier matrix in blocks', labels: ['The matrix $F_N$', 'Even columns first', 'Four blocks', 'Why these blocks'], View: Blocks, stops: S5b, fresh: true, speed: 1.2, why: [
    undefined,
    'Reordering the columns of $F_N$ is the same as reordering the samples in $\\mathbf{x}$: $F_N\\mathbf{x} = (F_N\\Pi_N^{\\mathsf T})(\\Pi_N\\mathbf{x})$.',
    'Rows $k$ and $k + N/2$ come out of the same two half-size matrices, which is why one block appears twice.',
    undefined,
  ], text: [
    'The same idea in matrix form. The Fourier matrix $\\boldsymbol{F}_N$ has $W_N^{kn}$ in row $k$, column $n$. Here $N = 4$, so the entries are $1, -i, -1, i$.',
    'Move the even columns to the front, then the odd ones. The matrix is now cut into four square blocks.',
    'Each block is $\\frac{N}{2}$ by $\\frac{N}{2}$ and has a name: $F_{N/2}$, $DF_{N/2}$, $F_{N/2}$ and $-DF_{N/2}$.',
    'Why: an odd column is the even one times $W_N^{k}$, and the lower rows flip that factor\'s sign. $D$ is the diagonal matrix of the $W_N^{k}$.',
  ] },
  { name: 'BlockMul', title: 'The matrix way: block-wise multiplication', labels: ['Two matrices of blocks', 'Block row 0', 'Block row 1', 'The factorisation'], View: BlockMul, stops: S5c, fresh: true, speed: 1.2, why: [
    'The blocks are conformant: every block is $\\frac{N}{2}$ by $\\frac{N}{2}$, so each product $A_{il}B_{lj}$ is defined.',
    undefined,
    undefined,
    undefined,
  ], text: [
    'The same four blocks are a product of two matrices of blocks: the first has blocks $I$, $D$, $I$ and $-D$, the second has $F_{N/2}$ on its diagonal and $0$ elsewhere.',
    'Multiply block-wise, $C_{ij} = \\sum_l A_{il}B_{lj}$. Block row 0 gives $C_{00} = I\\,F_{N/2} + D\\,0 = F_{N/2}$ and $C_{01} = I\\,0 + D\\,F_{N/2} = DF_{N/2}$.',
    'Block row 1 gives $C_{10} = I\\,F_{N/2} + (-D)\\,0 = F_{N/2}$ and $C_{11} = I\\,0 + (-D)\\,F_{N/2} = -DF_{N/2}$.',
    'All four blocks match. Undoing the column reordering gives a factorisation of $F_N$: one dense matrix becomes the sparse $B_N$ times two dense matrices of half the size.',
  ] },
  { name: 'Perm', title: 'The matrix way: the reordering is a permutation matrix', labels: ['The identity matrix', 'Exchange rows', 'P times x', 'Put in N = 128'], View: Perm, stops: S5a, fresh: true, speed: 1.2, why: [
    undefined,
    'The code exchanges $x_i$ with $x_{\\mathrm{rev}(i)}$ whenever $i < \\mathrm{rev}(i)$. Each of those swaps is a row exchange, the same operation as in Gaussian elimination.',
    'Row $i$ of $P$ has its single 1 in column $\\mathrm{rev}(i)$, so row $i$ of $P\\mathbf{x}$ is $x_{\\mathrm{rev}(i)}$.',
    undefined,
  ], text: [
    'Splitting again and again reorders the samples, and that reordering is a matrix. Start from the identity matrix $I_8$: a 1 in row $i$, column $i$. Rows are numbered from 0.',
    'Exchange row 1 with row 4, and row 3 with row 6. The result is a permutation matrix $P$.',
    'Multiplying $P$ by $\\mathbf{x}$ puts the samples in bit-reversed order: $x_0, x_4, x_2, x_6, x_1, x_5, x_3, x_7$. Row $i$ has its 1 in column $\\mathrm{rev}(i)$, the index $i$ with its bits reversed.',
    'For $N = 128$, $P$ is a $128$ by $128$ permutation matrix. The code makes its 56 row exchanges directly instead of building it.',
  ] },
  { name: 'Sparse', title: 'The matrix way: a product of sparse matrices', labels: ['Split again', 'All of $F_4$', 'Any $N$', 'Why sparse'], View: Sparse, stops: S5d, fresh: true, speed: 1.2, why: [
    undefined,
    undefined,
    'The reorderings, one for each split, multiply together into the single bit-reversal matrix $P$.',
    'Zeros cost nothing to multiply by. $F_N$ is full, but it is made of copies of smaller Fourier matrices, and pulling the repeated blocks out leaves factors that are almost all zeros.',
  ], text: [
    'Apply the same split to each half-size $F_2$, down to $F_1 = [1]$. For $N = 4$ that gives $F_4 = A_2A_1P_4$.',
    'Here are those matrices. The first two are made of the blocks $I$, $D$, $-D$ and $B_2$, and every row has two non-zero entries. $P_4$ has one, and their product is $F_4$.',
    'For any $N$: $F_N = A_m\\cdots A_2A_1P$ with $m = \\log_2 N$. Each $A_s$ repeats the block matrix $B_L$, with blocks $I$, $D$, $I$ and $-D$, along its diagonal.',
    'So each factor has about $2N$ non-zero entries where $F_N$ has $N^2$. A matrix-vector product costs about one multiplication per non-zero entry: $N^2$ falls to about $2N\\log_2 N$.',
  ] },
  { name: 'BitReversal', title: 'The code: bit reversal', labels: ['The index in bits', 'Reverse the bits', 'Move every sample', 'Put in N = 128'], View: BitRev, stops: S0, fresh: true, speed: 1.2, why: [
    undefined,
    'Splitting into even and odd looks at the lowest bit first, then the next bit, and so on. The first split fixes the top bit of the new position, so the bits come out in reverse order.',
    '$\\mathrm{rev}(\\mathrm{rev}(n)) = n$: positions $n$ and $\\mathrm{rev}(n)$ simply trade places, so the code swaps each pair once.',
    undefined,
  ], text: [
    'The even and odd split is repeated all the way down, so the samples must be reordered first. For $N = 2^m$ samples every index is $m$ bits: $n = (b_{m-1}\\dots b_1b_0)_2$. Drawn here for $N = 8$.',
    'Reverse the bits: $\\mathrm{rev}(n) = (b_0b_1\\dots b_{m-1})_2$. The lowest bit, the one that says even or odd, becomes the top bit.',
    'Put each sample $x_n$ at position $\\mathrm{rev}(n)$. The evens land in the first half, the odds in the second, and the next bit splits each half again.',
    'This project has $N = 128$, so $m = 7$ bits: $1 = 0000001_2$ goes to $1000000_2 = 64$, and $6 = 0000110_2$ goes to $0110000_2 = 48$.',
  ] },
  { name: 'Butterfly', title: 'The code: the butterfly', labels: ['Twist the odd one', 'Add', 'Subtract'], View: Butterfly, stops: S2, fresh: true, speed: 1.5, why: [
    undefined,
    undefined,
    'This is the same at every level of the FFT. A block of length $L$ is built from two halves of length $L/2$ the same way, with $W_L^{j}$ in place of $W_N^{k}$.',
  ], text: [
    'For $N$ samples, bins $k$ and $k + N/2$ share one $E_k$ and one $O_k$. Twist the odd answer by the extra step $W_N^{k}$.',
    'Add it to the even answer: that is bin $k$.',
    'Turn it half a turn (bin $k + N/2$ flips its sign) and add: that is bin $k + N/2$. One twist, two answers: a butterfly.',
  ] },
  { name: 'Network', title: 'The code: stacking the stages', labels: ['Stages of butterflies', 'Totals'], View: Network, stops: S3, fresh: true, speed: 1.5, why: [
    'A power of two halves evenly all the way down: 128, 64, 32, 16, 8, 4, 2, 1.',
  ], text: [
    'After the reordering, $\\log_2 N$ stages of butterflies rebuild the answer: blocks of 2 samples, then 4, 8, and so on up to $N$. Drawn for $N = 16$: four stages.',
    'Every stage has $N/2$ butterflies, so $\\frac{N}{2}\\log_2 N$ in all: 32 for 16 samples, and 448 for 128 samples.',
  ] },
  { name: 'Code', title: 'The code: the FFT in C++ on the ESP32', labels: ['Reorder the samples', 'Passes of block length L', 'The butterfly'], View: Code, stops: S1c, fresh: true, speed: 1.2, why: [
    'Reversing the bits is the even and odd split applied all the way down: the pairs that must be combined end up side by side.',
    'The firmware gets each twiddle factor $W_L^{j}$ by multiplying by $W_L$ once per step, instead of calling sine and cosine every time.',
    undefined,
  ], text: [
    'The firmware runs the FFT in three moves. First it reorders the samples by reversing the bits of each index.',
    'Then it makes $\\log_2 N$ passes. Pass $L$ combines neighbouring blocks of length $L/2$ into blocks of length $L$.',
    'Inside a block each pair is a butterfly: the top output is $u + W_L^{j}v$ and the bottom is $u - W_L^{j}v$. The outputs overwrite the inputs.',
  ] },
  { name: 'Signal', title: 'DFT versus FFT on the ESP32\'s frame', labels: ['The frame', 'The DFT route', 'The FFT route', 'Same answer'], View: Signal, stops: S6a, fresh: true, speed: 1.2, why: [
    'This is the same frame as in the Sampling and Splitting pages: 6,400 readings a second, 128 in a frame. The tones 75 and 225 Hz sit between the 50 Hz slots, so their strength spreads over two bars.',
    undefined,
    undefined,
    'Both routes spread 75 and 225 Hz the same way, because the spreading belongs to the transform, not to the algorithm.',
  ], text: [
    'This is the ESP32\'s own frame: 128 readings, 20 ms of sound, tapered at the edges. Hidden in it are four tones: 75, 225, 450 and 1,100 Hz.',
    'The DFT route multiplies the frame by the Fourier matrix, $\\boldsymbol{F}_{128}\\mathbf{x}$: 128 rows of 128 products, 16,384 in all. Out come the bars, one per 50 Hz.',
    'The FFT route reorders the frame with $\\boldsymbol{P}$, then applies seven sparse factors: 448 butterflies. The same bars appear.',
    `Laid over each other the two spectra are identical: the largest difference is below $10^{${DIFF_EXP}}$. Each peak is one of the four tones, and grouping them by band sets the LED colour.`,
  ] },
  { name: 'Count', title: 'Time complexity: counting the work', labels: ['The dense matrix', 'One split', 'All the splits'], View: Count, stops: S6b, fresh: true, speed: 1.2, why: [
    'A product is one multiplication. A matrix-vector product needs about one multiplication per non-zero entry, so counting non-zero entries counts the work.',
    undefined,
    'Each butterfly has 4 non-zero entries: the two 1s and the two $\\pm W$. So 448 butterflies are 1,792 entries. These are operation counts, not stopwatch times.',
  ], text: [
    'The DFT matrix $\\boldsymbol{F}_{128}$ has no zeros: $128^2 = 16{,}384$ non-zero entries, so 16,384 products for every frame.',
    'Splitting into blocks replaces one dense matrix by a sparse one and two dense ones of half the size. The dense work halves, and the sparse step adds only about $2N$.',
    'Repeating the split $\\log_2 N$ times gives 7 sparse factors of 256 non-zero entries: 1,792 against 16,384. In general the cost falls from $N^2$ to about $2N\\log_2 N$.',
  ] },
];

export default function FFT({ onHome, next }) {
  return <BoldMatrices.Provider value><Overview onHome={onHome} next={next} pages={PAGES} /></BoldMatrices.Provider>;
}
