import { W, H, MID, PAD, N, AMP, OFF, wave, X } from './Frame.jsx';
import { ham, seg } from './ease.js';
import { M, TG } from '../math/Tex.jsx';

const A = AMP;
export const STOPS = [2.3, 4.9]; // centred, faded; the page opens on the frame the last page ended with

// the same frame as page 1, cleaned in two steps: centred on zero, then tapered at the edges
export default function Clean({ t }) {
  // starts exactly as page 1 ends (raw readings above zero), then: centred, then tapered
  const centre = seg(t, 0.5, 1.9), win = seg(t, 2.5, 3.1), m = seg(t, 3.1, 4.6);
  const off = OFF * (1 - centre);
  const Y = (u) => MID - off - A * wave(u) * (1 + (ham(u) - 1) * m);
  const avg = MID - off, avgOpacity = seg(t, 0, 0.5) * (1 - centre);

  return (
    <svg className="frame" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="The frame is shifted to swing around zero, then faded at both edges">
      <line className="axis" x1={PAD} x2={W - PAD} y1={MID} y2={MID} />
      <line className="avg" x1={PAD} x2={W - PAD} y1={avg} y2={avg} opacity={avgOpacity} />
      {[1, -1].map((s) => (
        <polyline key={s} className="window" opacity={win * 0.7} fill="none"
          points={Array.from({ length: 129 }, (_, i) => `${X(i / 128)},${MID - s * A * ham(i / 128)}`).join(' ')} />
      ))}
      <polyline className="wave" points={Array.from({ length: 513 }, (_, i) => `${X(i / 512)},${Y(i / 512)}`).join(' ')} />
      {Array.from({ length: N }, (_, i) => {
        const u = i / (N - 1);
        return (
          <TG key={i} className="reading" style={{ animation: 'none', opacity: 1 }}>
            <line x1={X(u)} x2={X(u)} y1={MID} y2={Y(u)} />
            <circle cx={X(u)} cy={Y(u)} r="3.5" />
          </TG>
        );
      })}
      <TG className="bracket" style={{ animation: 'none', opacity: 1 - seg(t, 0, 0.5) }}>
        <path d={`M${PAD} 282 v8 H${W - PAD} v-8`} />
        <M x={W / 2} y="316" textAnchor="middle">128 snapshots $=$ 20 ms</M>
      </TG>
    </svg>
  );
}
