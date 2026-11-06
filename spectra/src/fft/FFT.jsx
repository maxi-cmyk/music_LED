import Overview from '../overview/Overview.jsx';
import Derive, { STOPS as S1 } from './Derive.jsx';
import Code, { STOPS as S1c } from './Code.jsx';
import Butterfly, { STOPS as S2 } from './Butterfly.jsx';
import Network, { STOPS as S3 } from './Network.jsx';
import Matrix, { STOPS as S3b } from './Matrix.jsx';
import Compare, { STOPS as S4 } from './Compare.jsx';

// the same route as the demo's derivation: split the sum, pull out the extra step, reuse the halves, repeat
const PAGES = [
  { name: 'Split', title: 'From the DFT to the FFT', labels: ['The DFT for N samples', 'Even and odd positions', 'Factor out the offset', 'Name the pieces', 'Put in N = 128'], View: Derive, stops: S1, fresh: true, speed: 1.8, why: [
    undefined,
    undefined,
    'The extra factor does not depend on $m$, so it comes outside the sum.',
    'Each half-size sum is itself a DFT, so the same split can be applied to it again, all the way down to single samples. That repeated split is the FFT.',
    'The FFT gives exactly the same answers as the direct method. It only reorganises the arithmetic to share work.',
  ], text: [
    'Start with the general DFT for $N$ samples: every bin $k$ multiplies all $N$ samples by their Fourier weights and adds, $N \\times N$ products in all.',
    'Separate the even and odd sample positions: $n = 2m$ and $n = 2m + 1$. Each group has $N/2$ samples.',
    'Factor out the odd samples\' extra offset, so both sums have the same half-size weights.',
    'Each sum is an $N/2$-point DFT. Name them $E_k$ and $O_k$, and the extra factor $W_N^{k}$: $X_k = E_k + W_N^{k}O_k$.',
    'Now put in this project\'s $N = 128$: two 64-point sums, and $X_k = E_k + W_{128}^{k}O_k$.',
  ] },
  { name: 'Code', title: 'The FFT in C++ on the ESP32', labels: ['Reorder the samples', 'Passes of block length L', 'The butterfly', 'In this project'], View: Code, stops: S1c, fresh: true, speed: 1.2, why: [
    'Reversing the bits is the even and odd split from the last page, applied all the way down: the pairs that must be combined end up side by side.',
    'The firmware gets each twiddle factor $W_L^{j}$ by multiplying by $W_L$ once per step, instead of calling sine and cosine every time.',
    undefined,
    undefined,
  ], text: [
    'The firmware runs the FFT in three moves. First it reorders the samples by reversing the bits of each index.',
    'Then it makes $\\log_2 N$ passes. Pass $L$ combines neighbouring blocks of length $L/2$ into blocks of length $L$.',
    'Inside a block each pair is a butterfly: the top output is $u + W_L^{j}v$ and the bottom is $u - W_L^{j}v$. The outputs overwrite the inputs.',
    'In this project $N = 128$ samples, 20 ms of sound: 7 passes of 64 butterflies, 448 in all, instead of 16,384 products.',
  ] },
  { name: 'Butterfly', title: 'The butterfly', labels: ['Twist the odd one', 'Add', 'Subtract'], View: Butterfly, stops: S2, fresh: true, speed: 1.5, text: [
    'Bins $k$ and $k+64$ share one $E_k$ and one $O_k$. Twist the odd answer by the extra step $W_{128}^{k}$.',
    'Add it to the even answer: that is bin $k$.',
    'Turn it half a turn (bin $k+64$ flips its sign) and add: that is bin $k+64$. One twist, two answers: a butterfly.',
  ] },
  { name: 'Network', title: 'Bit reversal and the stages', labels: ['Shuffle', 'Four stages', 'Totals'], View: Network, stops: S3, fresh: true, speed: 1.5, why: [
    'A power of two halves evenly all the way down: 128, 64, 32, 16, 8, 4, 2, 1.',
  ], text: [
    'Each half splits again, down to single samples. The ESP32 shuffles the samples into bit-reversed order so every split lines up.',
    'Then four stages of butterflies rebuild the answer: 2-sample results, then 4, 8 and 16.',
    'Every row joins one butterfly per stage: $4 \\times 8$ butterflies for 16 samples, and $7 \\times 64 = 448$ for 128.',
  ] },
  { name: 'Matrix', title: 'The FFT as sparse matrices: what the code does', labels: ['Reorder: P', 'One stage of butterflies', 'All the stages'], View: Matrix, stops: S3b, fresh: true, speed: 1.2, why: [
    'Reversing the bits puts every pair that must be combined side by side. It is the even and odd split from the last pages, applied all the way down.',
    '$B_L = \\begin{bmatrix} I & D \\\\ I & -D \\end{bmatrix}$ with $D = \\mathrm{diag}(1, W_L, \\dots, W_L^{L/2-1})$ and $W_L = e^{-i2\\pi/L}$. Its top half is $E_k + W^{k}O_k$ and its bottom half is $E_k - W^{k}O_k$.',
    'Each stage doubles the block size, 2, 4, up to $N$, so there are $\\log_2 N$ stages. The result matches the direct DFT.',
  ], text: [
    'The code first reorders the samples by reversing the bits of each index. That is a permutation matrix $P$: row $i$ picks sample $x_{\\mathrm{rev}(i)}$.',
    'Each stage then combines neighbouring blocks with butterflies, $u \\pm W^{j}v$. As a matrix that is sparse: $A_s = I \\otimes B_L$, two non-zeros per row.',
    'Run the stages in order and you have the whole FFT: $F_N\\mathbf{x} = A_{\\log_2 N}\\cdots A_2A_1P\\mathbf{x}$. The code applies each factor in place and never builds a matrix.',
  ] },
  { name: 'Compare', title: 'Complexity: $O(N^2)$ vs $O(N\\log N)$', labels: ['Slide the size'], View: Compare, stops: S4, hold: true, text: [
    'Slide the sample count. The direct method grows with $N^2$, the FFT only a little faster than $N$, and the answers are identical.',
  ] },
];

export default function FFT({ onHome, next }) {
  return <Overview onHome={onHome} next={next} pages={PAGES} />;
}
