import Overview from '../overview/Overview.jsx';
import Vector, { STOPS as S1 } from './Vector.jsx';
import Phase, { STOPS as S2 } from './Phase.jsx';

const PAGES = [
  { name: 'Vector', labels: ['The snapshots', 'An empty vector', 'Fill the slots'], View: Vector, stops: S1, text: [
    'Each dot is one snapshot: the height of the wave at one instant, which is just a number.',
    'Make room for a list to hold them: a vector with 128 empty slots, one per snapshot.',
    'Read the dots from left to right and write each height into the next slot. The full list is the vector x. The whole vector, not any one slot, ends up as one LED colour.',
  ] },
  { name: 'Phase', labels: ['Cosine check', 'Shifted tone', 'Add a sine', 'Strength stays put'], View: Phase, stops: S2, text: [
    'To test for 150 Hz, compare the frame with a cosine of the same frequency. Where the two rise and fall together, the score is large.',
    'But a frame can start at any point in the cycle. Shift the tone by a quarter of a cycle and the cosine score drops to zero. The tone is still there; the cosine just cannot see it.',
    'So check against a sine too, the same wave shifted a quarter cycle. Put the cosine score across and the sine score up, and the two scores become one point.',
    'Shift the tone through a whole cycle and the point goes round a circle. The cosine and sine scores trade off, but the distance from the centre never changes. That distance is the strength of the tone.',
  ] },
];


export default function Fourier({ onHome }) {
  return <Overview onHome={onHome} pages={PAGES} />;
}
