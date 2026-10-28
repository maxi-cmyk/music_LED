import { W, MID, PAD, N, AMP, TONES, wave, X } from './Frame.jsx';
import { ham, seg } from './ease.js';
import { M, TG } from '../math/Tex.jsx';

export const ROWS = [285, 190, 105, 20]; // where each tone slides to, grouped so each band's tones are neighbours
const HZ_PER_CYCLE = 50; // 128 readings at 6400/s: one cycle per frame = 50 Hz
export const BANDS = [['Bass', 250, '#ff6b5a'], ['Mids', 1000, '#8fe36a'], ['Treble', 2500, '#5cbcff']];
export const CENTRE = [190, 105, 20]; // where each band's row ends up once its tones merge: evenly spaced (the bass lands on the row its upper tone was on)
export const DOWN = 85; // once the bass waves merge there are only 3 rows; shift them down to centre the graph on MID
export const BAR = 80; // bar length per unit of total strength
const END = 13.2;

const hzOf = ([cycles]) => cycles * HZ_PER_CYCLE;
export const bandOf = (tn) => BANDS.findIndex(([, hi]) => hzOf(tn) <= hi + 25);
export const tone = ([cycles, amp, phase], u) => amp * Math.sin(2 * Math.PI * cycles * u + phase) * ham(u);
export const pts = (fn) => Array.from({ length: 513 }, (_, i) => `${X(i / 512)},${fn(i / 512)}`).join(' ');
export const lerp = (a, b, k) => a + (b - a) * k;

// starts exactly as page 2 ends (tapered frame), then: split into tones, label, group by band, add up each band
export const STOPS = [2.4, 3.7, 6.2]; // split, grouped, added up

export default function Split({ t }) {
  const f1 = seg(t, 0, 0.6), emerge = seg(t, 0.3, 0.7), sumFade = seg(t, 0.3, 0.7), move = seg(t, 0.8, 1.9);
  const hzIn = seg(t, 2, 2.4) * (1 - seg(t, 2.6, 3)), colour = seg(t, 2.5, 3.3), names = seg(t, 2.8, 3.4);
  const merge = seg(t, 3.9, 4.9), sumIn = seg(t, 4.3, 4.9), grow = seg(t, 5.1, 5.9);

  const groups = BANDS.map(([name, , color], b) => {
    const idx = TONES.map((tn, k) => k).filter((k) => bandOf(TONES[k]) === b);
    const centre = CENTRE[b];
    const y = (k) => lerp(MID + (ROWS[k] - MID) * move, centre, merge) + DOWN * merge; // a band's tones converge on its centre row
    const ys = idx.map(y);
    return { name, color, idx, y, centre: lerp(MID, centre, move) + DOWN * merge, lo: Math.min(...ys), hi: Math.max(...ys), total: idx.reduce((sum, k) => sum + TONES[k][1], 0) };
  });

  return (
    <svg className="frame" viewBox={`0 -100 ${W} 540`} role="img" aria-label="The frame splits into pure tones, which are grouped into bass, mids and treble and added up">
      <line className="axis" x1={PAD} x2={W - PAD} y1={MID} y2={MID} opacity={1 - f1} />
      {[1, -1].map((s) => (
        <polyline key={s} className="window" fill="none" opacity={0.7 * (1 - f1)}
          points={Array.from({ length: 129 }, (_, i) => `${X(i / 128)},${MID - s * AMP * ham(i / 128)}`).join(' ')} />
      ))}
      <polyline className="wave" style={{ opacity: 0.5 * (1 - sumFade) }} points={pts((u) => MID - AMP * wave(u) * ham(u))} />
      {Array.from({ length: N }, (_, i) => {
        const u = i / (N - 1), y = MID - AMP * wave(u) * ham(u);
        return (
          <TG key={i} className="reading" style={{ animation: 'none', opacity: 1 - f1 }}>
            <line x1={X(u)} x2={X(u)} y1={MID} y2={y} />
            <circle cx={X(u)} cy={y} r="3.5" />
          </TG>
        );
      })}
      {groups.map((g) => (
        <TG key={g.name}>
          {g.idx.map((k) => {
            const p = pts((u) => g.y(k) - AMP * tone(TONES[k], u));
            const sep = emerge * (1 - (g.idx.length > 1 ? sumIn : 0));
            return (
              <TG key={k} opacity={sep}>
                <polyline className="tone" points={p} />
                <polyline className="tone" stroke={g.color} opacity={colour} points={p} />
                <M className="zone" x={PAD - 10} y={g.y(k) + 5} textAnchor="end" opacity={hzIn}>{hzOf(TONES[k])} Hz</M>
              </TG>
            );
          })}
          {g.idx.length > 1 && (
            <polyline className="tone" stroke={g.color} opacity={sumIn}
              points={pts((u) => g.centre - AMP * g.idx.reduce((sum, k) => sum + tone(TONES[k], u), 0))} />
          )}
          <TG opacity={names}>
            <path d={`M${PAD - 14} ${g.lo - 24} h-6 V${g.hi + 24} h6`} fill="none" stroke={g.color} strokeWidth="1.5" />
            <M className="zone" x={PAD - 30} y={(g.lo + g.hi) / 2 + 5} textAnchor="end" fill={g.color}>{g.name}</M>
          </TG>
          <rect x={W - PAD + 14} y={(g.lo + g.hi) / 2 - 7} width={g.total * BAR * grow} height="14" fill={g.color} />
        </TG>
      ))}
    </svg>
  );
}
