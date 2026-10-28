import Overview from '../overview/Overview.jsx';
import Vector, { STOPS as S1 } from './Vector.jsx';
import Score, { STOPS as S2 } from './Score.jsx';
import Phase, { STOPS as S3 } from './Phase.jsx';

const PAGES = [
  { name: 'Vector', labels: ['The snapshots', 'An empty vector', 'Fill the slots'], View: Vector, stops: S1, text: [
    'Each dot is one snapshot: the height of the wave at one instant, which is just a number.',
    'Make room for a list to hold them: a vector with 128 empty slots, one per snapshot.',
    'Read the dots from left to right and write each height into the next slot. The full list is the vector x. The whole vector, not any one slot, ends up as one LED colour.',
  ] },
  { name: 'Score', labels: ['The audio frame', 'Keep the line', 'Make room', 'A test pattern', 'Overlay the pattern', 'The resultant wave', 'Add up the points', 'Stretch to 250 Hz'], View: Score, stops: S2, text: [
    'The 128 heights are now a vector, and we have the frame as a wave again. The question for this part: how much of one pitch is in it?',
    'The individual dots have done their job. Fade them out and keep only the wave they trace.',
    'Move the wave up to make room for what comes next.',
    'Make a test pattern: a pure 450 Hz wave sampled at the same 128 instants.',
    'Lay the pattern over the frame so the two line up instant by instant.',
    'At every instant, multiply the frame by the pattern. The new heights trace out a resultant wave. Where the two agree it sits above the line; where they clash it dips below.',
    'Now add up the points of the resultant wave, one after another. It sits mostly above the line, so the running total climbs to one big score.',
    'Now stretch the pattern out to 250 Hz, fewer cycles per frame. It clashes with the frame as often as it agrees, so the resultant wave spends as long below the line as above it. The points cancel and the score falls to about zero.',
  ] },
  { name: 'Phase', labels: ['Zero, or hidden?', 'Back to 450 Hz', 'Delay the tone', 'Add a sine', 'Two scores, one point', 'Strength stays put'], View: Phase, stops: S3, text: [
    'A score near zero looks like "that pitch is not here". But a tone can also score zero while it is right there.',
    'Stretch the pattern back to 450 Hz, which is in the frame. The score is large again.',
    'Now suppose the 450 Hz tone arrives later in its cycle. The cosine pattern is out of step with it, the up and down bars cancel, and the score drops to zero. The tone is still there; the cosine just cannot see it.',
    'So check against a sine as well: the same pattern shifted by a quarter of a cycle. Where the cosine sees nothing, the sine picks the tone up, and the score is large again.',
    'Put the cosine score across and the sine score up, and the two scores become one point. This is a plane with a real axis and an imaginary axis, so the point is one complex number.',
    'Delay the tone all the way round and the point travels a circle. The cosine and sine scores trade off, but the distance from the centre never changes. That distance, the square root of cosine squared plus sine squared, is the strength of the tone, whatever its timing.',
  ] },
];


export default function Fourier({ onHome }) {
  return <Overview onHome={onHome} pages={PAGES} />;
}
