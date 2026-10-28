import { W, MID, PAD, TONES } from './Frame.jsx';
import { seg, easeCubic } from './ease.js';
import { CENTRE, DOWN, BAR, BANDS, bandOf, tone, pts, lerp } from './Split.jsx';
import { M, TG } from '../math/Tex.jsx';

export const GAIN = [1, 0.82, 0.92]; // firmware's per-channel balance: red, green, blue
export const LEAK = 0.15; // anything under 15% of the strongest channel is switched off
export const END_Y = [285, 205, 125]; // bass, mids, treble rows once laid out as bars
export const X0 = 309, LEN = 1000; // where the bars start; length of a strength-1 bar (the strongest bar is 400 long)
// names + bars + numbers are centred on x=500 until the LED appears; then everything shifts left by SHIFT so all four are centred
export const NUM_X = 729, BRACE_X = 772, LED_X = 860, SHIFT = 75;
export const STOPS = [0, 2.3, 4.3, 6.6];

const AMP = 100; // keep equal to Frame.jsx's AMP
export const groups = BANDS.map(([name, , color], b) => {
  const idx = TONES.map((_, k) => k).filter((k) => bandOf(TONES[k]) === b);
  const total = idx.reduce((sum, k) => sum + TONES[k][1], 0);
  const start = CENTRE[b] + DOWN; // where page 3 left this band's wave
  return { name, color, idx, total, start, weighted: total * GAIN[b] };
});
const strongest = Math.max(...groups.map((g) => g.weighted));
const brightness = groups.map((g) => (g.weighted - LEAK * strongest > 0 ? ((g.weighted - LEAK * strongest) / (1 - LEAK)) / strongest : 0));
const rgb = brightness.map((v) => Math.round(255 * v));

// starts exactly as page 3 ends, then: bars lay out, weak ones switch off, the rest scale to 0-255, the LED lights
export default function Light({ t }) {
  const wavesOut = seg(t, 0, 0.6), bracketsOut = seg(t, 0, 0.4), move = seg(t, 0, 1.4);
  const line = seg(t, 1.5, 2), cut = seg(t, 2.5, 3.3), nums = seg(t, 3.4, 4), shift = easeCubic((t - 4.5) / 1.2), led = seg(t, 5.6, 6.3);
  const ledColor = `rgb(${rgb.join(',')})`;
  const cap = LEAK * strongest * LEN;

  return (
    <svg className="frame" viewBox={`0 -100 ${W} 540`} role="img" aria-label="The three band strengths become red, green and blue brightness, which mix into the LED colour">
      <TG transform={`translate(${-SHIFT * shift} 0)`}>
      {groups.map((g, b) => {
        const y = lerp(g.start, END_Y[b], move), x = lerp(W - PAD + 14, X0, move), thick = lerp(14, 26, move);
        const len = lerp(g.total * BAR, g.weighted * LEN, move) * (brightness[b] === 0 ? 1 - cut : 1);
        return (
          <TG key={g.name} >
            <TG opacity={1 - wavesOut}>
              <polyline className="tone" stroke={g.color}
                points={pts((u) => g.start - AMP * g.idx.reduce((sum, k) => sum + tone(TONES[k], u), 0))} />
            </TG>
            <path opacity={1 - bracketsOut} d={`M${PAD - 14} ${g.start - 24} h-6 V${g.start + 24} h6`} fill="none" stroke={g.color} strokeWidth="1.5" />
            <M className="zone" x={lerp(PAD - 30, X0 - 16, move)} y={y + 5} textAnchor="end" fill={g.color}>{g.name}</M>
            <rect x={x} y={y - thick / 2} width={len} height={thick} fill={g.color} />
            <M className="zone" x={NUM_X} y={y + 6} fill={g.color} opacity={nums}>{rgb[b]}</M>
          </TG>
        );
      })}
      <TG opacity={line}>
        <line className="avg" x1={X0 + cap} x2={X0 + cap} y1="90" y2="320" />
        <M className="zone" x={X0 + cap} y="75" textAnchor="middle" fill="var(--dim)">15% of the strongest</M>
      </TG>
      <TG opacity={led}>
        <path d={`M${BRACE_X} 105 q10 0 10 10 v80 q0 10 10 10 q-10 0 -10 10 v80 q0 10 -10 10`} fill="none" stroke="var(--chalk)" strokeWidth="1.5" />
        <circle cx={LED_X} cy="205" r="48" fill={ledColor} />
      </TG>
      </TG>
    </svg>
  );
}
