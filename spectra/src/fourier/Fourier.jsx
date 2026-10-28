import Overview from '../overview/Overview.jsx';
import Vector, { STOPS as S1 } from './Vector.jsx';
import Score, { STOPS as S2 } from './Score.jsx';
import Phase, { STOPS as S3 } from './Phase.jsx';
import Weights, { STOPS as S4 } from './Weights.jsx';
import Axes, { STOPS as S6 } from './Axes.jsx';
import Trace, { STOPS as S7 } from './Trace.jsx';

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
  { name: 'Weights', title: 'Fourier weights and Euler\'s formula', labels: ['Angle to weight', 'Cosine and sine together', 'One weight per sample'], View: Weights, stops: S4, fresh: true, speed: 1.0, why: [
    undefined,
    'Why the minus? The complex inner product conjugates the pattern, which flips the exponent: $X_{k} = \\sum_{n} x[n]\\,e^{-i2\\pi kn/N}$.',
    'Why a quarter turn? $\\theta = 2\\pi kn/N = n\\pi/2$ for $N = 4$ and $k = 1$. With larger $k$ the arrow turns $k$ times as fast, which is how the other rows differ.',
  ], text: [
    'An angle becomes a point on a circle: $e^{i\\theta} = \\cos\\theta + i\\sin\\theta$ (Euler\'s formula). Across is the cosine of the angle, up is its sine.',
    'Turn it clockwise instead: $e^{-i\\theta} = \\cos\\theta - i\\sin\\theta$. One complex weight holds a cosine check and a sine check together, so a tone can be measured whatever its starting phase.',
    'The angle for sample $n$ is $\\theta = 2\\pi kn/N$. For $N = 4$ and $k = 1$ the arrow turns a quarter turn per sample, giving the weights $1, -i, -1, i$. These weights are the entries of the Fourier matrix.',
  ] },
  { name: 'Axes', title: 'Change of basis: time to frequency', labels: ['The Fourier matrix', 'Perpendicular rows', 'Frequency basis', 'Same signal'], View: Axes, stops: S6, fresh: true, speed: 1.0, why: [
    ['Why $e^{-i\\theta}$? Euler\'s formula: $e^{-i\\theta} = \\cos\\theta - i\\sin\\theta$ is a point on the unit circle, and the minus sign makes it turn clockwise. $\\theta$ grows by $2\\pi k/N$ per sample, so row $k$ turns $k$ times round the frame.', 'What is the "time basis"? The frame $\\mathbf{x}$ is already a list of coordinates on the time axes (one axis per sample), and the identity matrix changes nothing: $I\\mathbf{x} = \\mathbf{x}$. The Fourier matrix describes the same frame on different axes.'],
    ['Why does it matter? If two axes overlapped, a tone in one would also register in the other. Perpendicular axes keep every coordinate independent, so each coordinate is just a dot product with its row.', 'For complex rows the dot product conjugates the second row. A row with itself gives $N$ (here 4), so $FF^{*} = NI$, and that is also why the transform can be undone: $\\mathbf{x} = \\tfrac{1}{N}F^{*}\\mathbf{X}$.'],
    'In the time basis a pure tone is a list of numbers rising and falling. In the frequency basis it is a few large coordinates, so finding the tone means reading off which ones are big.',
    'The squared length is preserved exactly only when the matrix is divided by $\\sqrt{N}$.',
  ], text: [
    'Change of basis, from time to frequency. The frame $\\mathbf{x} = (1, 0, -1, 0)$ is a $4\\times 1$ vector. The Fourier matrix comes from one formula, $F[k,n] = e^{-i\\theta_{k,n}}$ with $\\theta_{k,n} = 2\\pi kn/N$. For $N = 4$, $k = 1$ it gives $(1, -i, -1, i)$, and all four values of $k$ fill the $4\\times 4$ matrix.',
    'Good axes must not overlap, so every pair of rows must be perpendicular: $(1,-i,-1,i)\\cdot(1,-1,1,-1) = 0$. Each pair is a plane with its axes at $90^{\\circ}$, and the frame casts a shadow on it. All 6 pairs check out: an orthogonal basis.',
    'Multiply: $\\mathbf{X} = F\\mathbf{x}$, a $4\\times 4$ matrix times a $4\\times 1$ vector. Each coordinate is the frame\'s dot product with a row: $(0, 2, 0, 2)$. Two spikes: the frame is a pure tone (bin 1, and its mirror bin 3), which the raw samples hide.',
    'Same signal, new description. The squared length grows by $N = 4$ (divide $F$ by $\\sqrt{N}$ to keep it exact). The project does this with 128 samples, then reads off bass, mids and treble.',
  ] },
  { name: 'Trace', title: 'Putting it together: one bin\'s answer', labels: ['Trace a bin'], View: Trace, stops: S7, hold: true, why: [[
    'Only bins 0 to 64 are shown: bin $128-k$ mirrors bin $k$.',
    'The small bars at bins 1, 2, 4 and 5 are the frame\'s 75 and 225 Hz tones, which fall between slots and spread.',
  ]], text: [
    'Pick any bin. The 128 snapshots each add one small arrow, and where the chain ends is that bin\'s answer.',
  ] },
];

export default function Fourier({ onHome, next }) {
  return <Overview onHome={onHome} next={next} pages={PAGES} />;
}
