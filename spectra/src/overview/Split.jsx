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

// starts exactly as page 2 ends (tapered frame), then: scan every pitch to find the tones (the Fourier transform at work), split into tones,
// label, group by band, add up each band
const SCAN = 8.0; // the scan takes the first 8 seconds; the original split-and-group timeline runs on a clock that starts there
export const STOPS = [7.6, SCAN + 2.4, SCAN + 3.7, SCAN + 6.2]; // scanned, split, grouped, added up

// the scan: the tapered frame's real DFT, one bar per 50 Hz bin. Bars grow as the test wave sweeps past their pitch
const KMAX = 32, SB = 400, SH = 90, SCAN_BLUE = '#5cbcff', SCAN_ORANGE = '#e8a33d';
const samples = Array.from({ length: N }, (_, i) => { const u = i / (N - 1); return wave(u) * ham(u); });
const mags = Array.from({ length: KMAX + 1 }, (_, k) => {
  let re = 0, im = 0;
  for (let n = 0; n < N; n++) { const a = (-2 * Math.PI * k * n) / N; re += samples[n] * Math.cos(a); im += samples[n] * Math.sin(a); }
  return Math.hypot(re, im);
});
const MAXM = Math.max(...mags.slice(1));
const BX = (k) => PAD + (k / KMAX) * (W - 2 * PAD);
const barH = (k) => (SH * mags[k]) / MAXM;

export default function Split({ t: clock }) {
  const t = clock - SCAN; // the original timeline
  const kf = 1 + (KMAX - 1) * seg(clock, 0.7, 6.7); // the pitch being tested, in bins of 50 Hz
  const scanIn = seg(clock, 0.2, 0.8) * (1 - seg(clock, SCAN, SCAN + 0.5)), peaks = seg(clock, 6.9, 7.5);
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
      <TG opacity={scanIn}>
        <polyline fill="none" stroke={SCAN_BLUE} strokeWidth="2" strokeDasharray="6 6" opacity={1 - peaks} points={pts((u) => MID - 46 * Math.cos(2 * Math.PI * kf * u))} />
        <line x1={PAD} x2={W - PAD} y1={SB} y2={SB} stroke="var(--dim)" strokeWidth="1.5" opacity="0.6" />
        {[0, 10, 20, 30].map((k) => <M key={k} x={BX(k)} y={SB + 28} textAnchor="middle" fill="var(--dim)" fontSize="18">{`${k * 50} Hz`}</M>)}
        {Array.from({ length: KMAX }, (_, i) => i + 1).map((k) => {
          const grow = Math.min(1, Math.max(0, kf - k + 0.5)), now = Math.abs(kf - k) < 0.5 && clock < 6.75;
          return <rect key={k} x={BX(k) - 6} y={SB - barH(k) * grow} width="12" height={Math.max(0, barH(k) * grow)} fill={now ? SCAN_ORANGE : SCAN_BLUE} opacity={now ? 1 : 0.85} />;
        })}
        <line x1={BX(kf)} x2={BX(kf)} y1={SB - SH - 6} y2={SB} stroke={SCAN_ORANGE} strokeWidth="1.5" strokeDasharray="3 5" opacity={1 - peaks} />
        <M x={W - PAD} y={SB - SH - 14} textAnchor="end" fill={SCAN_ORANGE} fontSize="22" opacity={1 - peaks}>{`testing ${Math.round(kf * 50)} Hz`}</M>
        {TONES.map(([cycles], i) => (
          <M key={i} x={BX(cycles)} y={SB - barH(Math.round(cycles)) - 14} textAnchor="middle" fill="var(--chalk)" fontSize="19" opacity={peaks}>{`${cycles * 50} Hz`}</M>
        ))}
      </TG>
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
