import { seg } from './ease.js';
import { M, TG } from '../math/Tex.jsx';

export const W = 1000, H = 340, MID = 190, PAD = 60, N = 128;
export const AMP = 100, OFF = 85; // OFF: raw readings sit above zero until they are centred
// the pure tones the frame is made of: [cycles per frame, strength, phase]; page 3 splits the wave back into these
export const TONES = [[1.5, 0.27, 0], [4.5, 0.13, 1], [9, 0.45, 2], [22, 0.03, 3]];
export const wave = (u) => TONES.reduce((sum, [cycles, amp, phase]) => sum + amp * Math.sin(2 * Math.PI * cycles * u + phase), 0);
export const X = (u) => PAD + u * (W - 2 * PAD);
const Y = (u) => MID - OFF - AMP * wave(u);

const line = Array.from({ length: 513 }, (_, i) => `${X(i / 512)},${Y(i / 512)}`).join(' ');
const STEP = 0.01; // seconds between dots appearing
const END = N * STEP;
export const STOPS = [END + 0.25, 2.8]; // times the page rests at; the arrow keys move between them. The page opens at t=0, so the dots play in by themselves to the first stop

// one frame: 128 snapshots of the sound wave, dropped onto it one by one
export default function Frame({ t }) {
  return (
    <svg className="frame" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="128 snapshots along a sound wave, covering 20 milliseconds">
      <line className="axis" x1={PAD} x2={W - PAD} y1={MID} y2={MID} />
      <polyline className="wave" points={line} />
      {Array.from({ length: N }, (_, i) => {
        const u = i / (N - 1), d = { animation: 'none', opacity: Math.min(1, Math.max(0, (t - i * STEP) / 0.25)) };
        return (
          <TG key={i} className="reading" style={d}>
            <line x1={X(u)} x2={X(u)} y1={MID} y2={Y(u)} />
            <circle cx={X(u)} cy={Y(u)} r="3.5" />
          </TG>
        );
      })}
      <TG className="bracket" style={{ animation: 'none', opacity: seg(t, END + 0.3, END + 1.1) }}>
        <path d={`M${PAD} 282 v8 H${W - PAD} v-8`} />
        <M x={W / 2} y="316" textAnchor="middle">128 snapshots $=$ 20 ms</M>
      </TG>
    </svg>
  );
}
