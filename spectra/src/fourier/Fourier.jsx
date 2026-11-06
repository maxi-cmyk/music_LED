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
    'Read the dots left to right and write each height into the next slot, so the $n$-th entry is $x_n$. The whole vector becomes one LED colour.',
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
  { name: 'Spaces', title: 'The four fundamental spaces', labels: ['F has full rank', 'If it were not full rank', 'Where a signal goes', 'Information is lost'], View: Spaces, stops: S7, fresh: true, speed: 1.0, why: [
    'Full column rank means the 4 columns are independent, so $r = 4 = N$. The dimensions always add up: $\\dim N(F) = 4 - r = 0$.',
    'For any matrix, $\\dim C(A^{T}) + \\dim N(A) = 4$, and likewise on the output side. Every dimension the rank loses becomes null space.',
    'The row space and the null space are perpendicular, so every signal splits cleanly into one part from each.',
    undefined,
  ], text: [
    '$F$ has full column rank, so its rank is $r = 4$. The row space and the column space are all of $\\mathbb{C}^4$, and both null spaces are just $\\{\\mathbf{0}\\}$: every signal has its own output.',
    'If a matrix $A$ were not full rank, say $r = 2$, its null spaces would grow to dimension $4 - r = 2$.',
    'Any signal is a row-space part plus a null-space part. The null part is sent to $\\mathbf{0}$, so only the row-space part reaches the output $\\mathbf{b}$.',
    'Add any null vector to a signal and the output does not change: different signals, one answer, so information is lost. Full rank is what rules this out.',
  ] },
  { name: 'Basis', title: 'Change of basis: time to frequency', labels: ['Time basis', 'Warp to the frequency basis', 'Same vector, new weights', 'Four samples'], View: Basis, stops: S8, fresh: true, speed: 1.0, why: [
    undefined,
    'Why does the second vector flip? $F$ reverses orientation: for two samples its determinant is $-2$. A smooth warp has to pass through a flat state to get there. $b_0$ and $b_1$ are the columns of $F^{-1}$.',
    undefined,
    undefined,
  ], text: [
    'Two-sample signals form a vector space: a plane. The vector $\\mathbf{x}$ is a combination of the time basis vectors: $3\\,e_0 + 1\\,e_1$.',
    'Now warp the basis. The grid turns and shrinks into the frequency basis $b_0, b_1$, and the second vector flips through zero. The vector $\\mathbf{x}$ does not move.',
    'The same vector, a new combination: $\\mathbf{x} = 4\\,b_0 + 2\\,b_1$. The weights $4$ and $2$ come from one product, $F\\mathbf{x}$.',
    'Four samples work the same way, in a four-dimensional space. $F\\mathbf{x}$ gives the weights $(0, 2, 0, 2)$: the frame is $2\\,b_1 + 2\\,b_3$, a pure tone that the raw samples hide.',
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
