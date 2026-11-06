import Overview from '../overview/Overview.jsx';
import Vector, { STOPS as S1 } from './Vector.jsx';
import Score, { STOPS as S2 } from './Score.jsx';
import Phase, { STOPS as S3 } from './Phase.jsx';
import Weights, { STOPS as S4 } from './Weights.jsx';
import Minus, { STOPS as S5 } from './Minus.jsx';
import Spaces, { STOPS as S7 } from './Spaces.jsx';
import Basis, { STOPS as S8 } from './Basis.jsx';
import Trace, { STOPS as S9 } from './Trace.jsx';

// short on purpose: one sentence per step, with the extra detail behind "Why?"; fresh pages play their opening animation on entry
const PAGES = [
  { name: 'Vector', title: 'Samples as a vector', labels: ['The snapshots', 'Frame to vector', 'Fill the slots'], View: Vector, stops: S1, speed: 1.2, text: [
    'Each dot is one snapshot: the height of the wave at one instant, just a number.',
    'Move the frame aside to make room for a list with $N = 128$ slots, one per snapshot: the vector $\\mathbf{x}$.',
    'Read the dots left to right and write each height into the next slot, so the $n$-th entry is $x[n]$. The whole vector becomes one LED colour.',
  ] },
  { name: 'Score', title: 'The Fourier transform: inner product and projection', labels: ['The integral', 'Multiply', 'Area becomes a sum', 'Same formula, 250 Hz'], View: Score, stops: S2, fresh: true, speed: 1.8, text: [
    'How much 450 Hz is in this frame? Test it with a 450 Hz cosine wave.',
    'Multiply the frame by the test wave at every instant. Agreement sits above the line, clashes dip below.',
    'The integral is the area under that product. With 128 snapshots it becomes a sum, the coefficient $X_9$. It is big, so 450 Hz is in the frame.',
    'The same formula at 250 Hz ($k = 5$): the area cancels, $X_5 \\approx 0$, so there is no 250 Hz.',
  ] },
  { name: 'Phase', title: 'Phase and the complex plane', labels: ['Delay the tone', 'Two coefficients, one point', 'Strength stays put'], View: Phase, stops: S3, fresh: true, speed: 1.8, pause: [1.5], why: [
    undefined,
    undefined,
    'Why is it lossless? One real score loses the delay: a cosine score of $0$ could mean no tone, or a tone a quarter-turn late. The two numbers $\\mathrm{Re}\\,X_9$ and $\\mathrm{Im}\\,X_9$ fix the strength ($2|X_9|/N$) and the delay (the point\'s angle), which is everything a tone has.',
  ], text: [
    'Take just the 450 Hz tone from the frame. A near-zero cosine score can also mean the tone is out of step: delay it and the cosine part, $\\mathrm{Re}\\,X_9$, drops to zero, but a sine pattern picks it up: $\\mathrm{Im}\\,X_9$.',
    'Plot $\\mathrm{Re}\\,X_9$ across and $\\mathrm{Im}\\,X_9$ up: one point on a plane, the complex number $X_9 = \\mathrm{Re}\\,X_9 + i\\,\\mathrm{Im}\\,X_9$.',
    'Delay the tone all the way round and the point circles, but its distance from the centre, $|X_9|$, never changes: the strength. The point keeps both strength and delay, so the tone can be rebuilt exactly (dashed). Nothing is lost.',
  ] },
  { name: 'Weights', title: 'Fourier weights: the entries of the matrix', labels: ['One row of weights'], View: Weights, stops: S4, fresh: true, speed: 1.0, text: [
    'The weight for sample $n$ is $e^{-i\\theta}$, a point on the unit circle, with $\\theta = 2\\pi kn/N$. For $N = 4$ and $k = 1$ the arrow turns a quarter turn clockwise per sample, giving $1, -i, -1, i$: row 1 of the Fourier matrix.',
  ] },
  { name: 'Minus', title: 'Why the minus sign', labels: ['Tone against weights', 'The turns cancel', 'A plus would cancel'], View: Minus, stops: S5, fresh: true, speed: 1.0, why: [
    undefined,
    'A real cosine is half of this tone plus half of its mirror, $e^{-i\\theta}$. That mirror is why a single cosine lights up two bins.',
    'Why this sign? The complex inner product conjugates the pattern being tested: $\\overline{e^{i\\theta}} = e^{-i\\theta}$. Either sign gives a valid transform, but with a plus every tone would be reported at its mirrored bin.',
  ], text: [
    'Test a tone that turns counterclockwise, $e^{i\\theta}$ with $\\theta = n\\pi/2$, against row 1. The minus sign makes the weights turn clockwise, against the tone.',
    'Multiply each sample by its weight. The two turns cancel, so every product points the same way and the four add up to $4$: a big answer, so the tone is there.',
    'With a plus sign the weights would turn with the tone. The products alternate and cancel to $0$, so bin 1 would miss the tone. The highlighted rows point the other way and cancel the rest. The minus matches each tone to its detector.',
  ] },
  { name: 'Spaces', title: 'The four fundamental spaces', labels: ['The four spaces', 'Where a signal goes', 'Rank 2 loses signals', 'Rank grows to 4', 'The spaces of F'], View: Spaces, stops: S7, fresh: true, speed: 1.0, why: [
    'Every matrix has these four. Their dimensions are fixed by the rank $r$: the row and column spaces have dimension $r$, and the two null spaces have dimension $4 - r$.',
    'The row space and the null space are perpendicular, so every signal splits cleanly into one part from each.',
    undefined,
    'The null spaces shrink because their dimension is $4 - r$, which reaches $0$ at $r = 4$.',
    'This is what we asked of $F$: nothing lost (the null space is just $\\{\\mathbf{0}\\}$), and the frequency rows form a basis of the whole signal space.',
  ], text: [
    'Every matrix splits both spaces in two. Signals: the row space, with dimension $r$, and the null space, with dimension $4 - r$. Outputs: the column space ($r$) and the left null space ($4 - r$).',
    'Any signal is a row-space part plus a null-space part. The null part is sent to $\\mathbf{0}$, so only the row-space part reaches the output $\\mathbf{b}$.',
    'At rank 2 the null space is a plane. Add any null vector to a signal and the output does not change: different signals, one answer, so information is lost.',
    'As the rank grows to 4 the null spaces shrink to a point, and the row and column spaces fill everything. Every signal now has its own output.',
    '$F$ is $4 \\times 4$: four samples in, four frequencies out. Its 4 rows are 4 different frequencies, so $r = 4$ and $\\dim N(F) = 4 - 4 = 0$. Nothing is lost.',
  ] },
  { name: 'Basis', title: 'Change of basis: time to frequency', labels: ['Time axes', 'Frequency axes', 'Same signal, new coordinates', 'Four samples'], View: Basis, stops: S8, fresh: true, speed: 1.0, why: [
    undefined,
    'Why these axes? They are the columns of $F^{-1}$: the pattern at each frequency, written in time coordinates. For $N = 2$ that is $(\\tfrac12, \\tfrac12)$ and $(\\tfrac12, -\\tfrac12)$.',
    undefined,
    undefined,
  ], text: [
    'Take two samples, $x = (3, 1)$: a point in the plane. On the time axes, one per sample, its coordinates are $3$ and $1$.',
    'Now use the frequency axes instead: the constant pattern and the alternating pattern. The same point is reached by $4$ steps along the first and $2$ along the second.',
    'The point never moved, only the axes did. $\\mathbf{X} = F\\mathbf{x}$ is the translation: $X_0 = x_0 + x_1$ and $X_1 = x_0 - x_1$.',
    'Four samples work the same way, in four dimensions. The frame $(1, 0, -1, 0)$ becomes $(0, 2, 0, 2)$: two spikes, a pure tone that the raw samples hide.',
  ] },
  { name: 'Trace', title: 'Putting it together: one bin\'s answer', labels: ['Trace a bin'], View: Trace, stops: S9, hold: true, why: [[
    'Only bins 0 to 64 are shown: bin $128-k$ mirrors bin $k$.',
    'The small bars at bins 1, 2, 4 and 5 are the frame\'s 75 and 225 Hz tones, which fall between slots and spread.',
  ]], text: [
    'Pick any bin. The 128 snapshots each add one small arrow, and where the chain ends is that bin\'s answer.',
  ] },
];

export default function Fourier({ onHome, next }) {
  return <Overview onHome={onHome} next={next} pages={PAGES} />;
}
