import Overview from '../overview/Overview.jsx';
import EvenOdd, { STOPS as S1 } from './EvenOdd.jsx';
import Butterfly, { STOPS as S2 } from './Butterfly.jsx';
import Network, { STOPS as S3 } from './Network.jsx';
import Compare, { STOPS as S4 } from './Compare.jsx';

// the same route as the demo's derivation: split the sum, pull out the extra step, reuse the halves, repeat
const PAGES = [
  { name: 'Split', title: 'Divide and conquer: even and odd samples', labels: ['Even and odd', 'Split the sum', 'Pull out the extra step', 'Two half-size DFTs'], View: EvenOdd, stops: S1, fresh: true, speed: 1.5, why: [
    'The FFT gives exactly the same answers as the direct method. It only reorganises the arithmetic to share work.',
    undefined,
    'Why $2m$? Stepping through every other sample is the arrow of a half-size DFT, because $W^{2} = e^{-i2\\pi/(N/2)}$.',
  ], text: [
    'A DFT bin multiplies every sample by a turning arrow and adds. Split the samples into even and odd positions.',
    'Write the sum as two: the even samples $x[2m]$ and the odd samples $x[2m+1]$, with $m$ running over the $N/2$ pairs.',
    'An odd sample\'s arrow has one more step: $W^{k(2m+1)} = W^{k}\\,W^{2mk}$. Factor $W^{k}$ out and each sum is a half-size DFT: $X[k] = E[k] + W^{k}O[k]$.',
    'The same thing as arrows. The odd samples are one step ahead, so take that step out and both groups share the same arrows; $W^{k}$ is applied once.',
  ] },
  { name: 'Butterfly', title: 'The butterfly', labels: ['Twist the odd one', 'Add', 'Subtract'], View: Butterfly, stops: S2, fresh: true, speed: 1.5, text: [
    'Bins $k$ and $k+64$ share one $E[k]$ and one $O[k]$. Twist the odd answer by the extra step $W^{k}$.',
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
  { name: 'Compare', title: 'Complexity: $O(N^2)$ vs $O(N\\log N)$', labels: ['Slide the size'], View: Compare, stops: S4, hold: true, text: [
    'Slide the sample count. The direct method grows with $N^2$, the FFT only a little faster than $N$, and the answers are identical.',
  ] },
];

export default function FFT({ onHome, next }) {
  return <Overview onHome={onHome} next={next} pages={PAGES} />;
}
