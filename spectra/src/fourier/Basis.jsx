import { seg } from '../overview/ease.js';
import { M, TG } from '../math/Tex.jsx';
import { BLUE, ORANGE, GREEN, ENTRY, POW, fz, Mat, Arrow } from './Grid.jsx';

export const STOPS = [4.4, 9.8, 14.6, 21.0]; // time axes, frequency axes, same signal, four samples

// the plane for N = 2: F = [[1, 1], [1, -1]], so X0 = x0 + x1 and X1 = x0 - x1. The signal x = (3, 1) never moves; only the axes change
const S = 52, PX = 300, PY = 300; // pixels per unit, and the origin
const P = ([a, b]) => [PX + S * a, PY - S * b];
const B0 = [0.5, 0.5], B1 = [0.5, -0.5]; // columns of F^{-1} = F/2: the frequency axes written in time coordinates
const XT = [3, 1], XF2 = [4, 2];
const lerp = (a, b, k) => a + (b - a) * k;
const TIME_ROUTE = [[0, 0], [3, 0], [3, 1]], FREQ_ROUTE = [[0, 0], [2, 2], [3, 1]];
const TIME_TICKS = [[1, 0], [2, 0], [3, 0], [3, 1]], FREQ_TICKS = [[0.5, 0.5], [1, 1], [1.5, 1.5], [2, 2], [2.5, 1.5], [3, 1]];

// the first p of a path of straight pieces, as an SVG points string
function walk(route, p) {
  const len = route.slice(1).map((q, i) => Math.hypot(q[0] - route[i][0], q[1] - route[i][1]));
  let left = p * len.reduce((a, b) => a + b, 0);
  const pts = [P(route[0])];
  for (let i = 0; i < len.length && left > 0; i++) {
    const f = Math.min(1, left / len[i]);
    pts.push(P([lerp(route[i][0], route[i + 1][0], f), lerp(route[i][1], route[i + 1][1], f)]));
    left -= len[i];
  }
  return pts.map((q) => q.join(',')).join(' ');
}
const along = (pts, p, k) => seg(p, (k + 0.4) / pts.length, (k + 1) / pts.length); // tick k appears as the walk reaches it

const X4 = [1, 0, -1, 0];
const Xs = Array.from({ length: 4 }, (_, k) => X4.reduce((s, v, n) => s + v * fz(k, n)[0], 0)); // (0, 2, 0, 2)

export default function Basis({ t }) {
  const time = seg(t, 0.2, 1.0), pointIn = seg(t, 1.0, 1.6), pT = seg(t, 1.8, 3.8);
  const freq = seg(t, 4.8, 5.8), pF = seg(t, 6.6, 9.2);
  const plane = 1 - seg(t, 15.0, 15.8), four = seg(t, 15.8, 16.6);
  const dimTime = 1 - 0.65 * seg(t, 4.8, 5.8); // the time grid steps back while the frequency grid arrives
  const tp = P(XT);
  const tr = walk(TIME_ROUTE, pT), fr = walk(FREQ_ROUTE, pF);
  const ring = seg(t, 11.0, 11.8) * (1 - seg(t, 14.8, 15.4));
  return (
    <svg className="frame tall" viewBox="0 0 1000 560" role="img" aria-label="A signal of two samples, x equals (3, 1), is a point in the plane. On the time axes its coordinates are 3 and 1. On the frequency axes, which are the diagonal directions (1, 1) and (1, minus 1), the same point has coordinates 4 and 2. The point does not move; only the axes change. For four samples the same idea applies: x equals (1, 0, minus 1, 0) has frequency coordinates (0, 2, 0, 2).">
      <defs><clipPath id="plane"><rect x="40" y="70" width="520" height="470" /></clipPath></defs>

      <g opacity={plane}>
        <g clipPath="url(#plane)">
          <g opacity={time * dimTime} stroke={BLUE} strokeWidth="1">
            {Array.from({ length: 11 }, (_, i) => i - 5).map((k) => (
              <g key={k} opacity={k === 0 ? 1 : 0.35}>
                <line x1={P([k, 0])[0]} x2={P([k, 0])[0]} y1="70" y2="540" />
                <line x1="40" x2="560" y1={P([0, k])[1]} y2={P([0, k])[1]} />
              </g>
            ))}
          </g>
          <g opacity={freq} stroke={ORANGE} strokeWidth="1">
            {Array.from({ length: 21 }, (_, i) => i - 10).map((k) => {
              const [ax, ay] = P([k * B1[0] - 14 * B0[0], k * B1[1] - 14 * B0[1]]), [bx, by] = P([k * B1[0] + 14 * B0[0], k * B1[1] + 14 * B0[1]]);
              const [cx, cy] = P([k * B0[0] - 14 * B1[0], k * B0[1] - 14 * B1[1]]), [dx, dy] = P([k * B0[0] + 14 * B1[0], k * B0[1] + 14 * B1[1]]);
              return (
                <g key={k} opacity={k === 0 ? 1 : 0.35}>
                  <line x1={ax} y1={ay} x2={bx} y2={by} />
                  <line x1={cx} y1={cy} x2={dx} y2={dy} />
                </g>
              );
            })}
          </g>
        </g>

        <g opacity={time}>
          <Arrow x1={PX} y1={PY} x2={P([1, 0])[0]} y2={P([1, 0])[1]} color={BLUE} width={4.5} head={7} />
          <Arrow x1={PX} y1={PY} x2={P([0, 1])[0]} y2={P([0, 1])[1]} color={BLUE} width={4.5} head={7} />
          <M x={P([1, 0])[0]} y={P([1, 0])[1] - 16} textAnchor="middle" fill={BLUE} fontSize="22">{String.raw`$e_0$`}</M>
          <M x={P([0, 1])[0] - 18} y={P([0, 1])[1] + 8} textAnchor="end" fill={BLUE} fontSize="22">{String.raw`$e_1$`}</M>
        </g>
        <g opacity={freq}>
          <Arrow x1={PX} y1={PY} x2={P(B0)[0]} y2={P(B0)[1]} color={ORANGE} width={4.5} head={7} />
          <Arrow x1={PX} y1={PY} x2={P(B1)[0]} y2={P(B1)[1]} color={ORANGE} width={4.5} head={7} />
          <M x={P(B0)[0] - 16} y={P(B0)[1] - 10} textAnchor="end" fill={ORANGE} fontSize="22">{String.raw`$b_0$`}</M>
          <M x={P(B1)[0] + 14} y={P(B1)[1] + 26} fill={ORANGE} fontSize="22">{String.raw`$b_1$`}</M>
        </g>

        <polyline points={tr} fill="none" stroke={BLUE} strokeWidth="5" strokeLinejoin="round" strokeLinecap="round" opacity="0.95" />
        {TIME_TICKS.map(([a, b], k) => <circle key={k} cx={P([a, b])[0]} cy={P([a, b])[1]} r="5" fill={BLUE} opacity={along(TIME_TICKS, pT, k)} />)}
        <polyline points={fr} fill="none" stroke={ORANGE} strokeWidth="5" strokeLinejoin="round" strokeLinecap="round" opacity="0.95" />
        {FREQ_TICKS.map(([a, b], k) => <circle key={k} cx={P([a, b])[0]} cy={P([a, b])[1]} r="5" fill={ORANGE} opacity={along(FREQ_TICKS, pF, k)} />)}
        <M x={P([1.5, 0])[0]} y={P([1.5, 0])[1] + 34} textAnchor="middle" fill={BLUE} fontSize="24" opacity={seg(t, 3.0, 3.6)}>{String.raw`$x_0 = 3$`}</M>
        <M x={P([3, 0.5])[0] + 14} y={P([3, 0.5])[1] + 8} fill={BLUE} fontSize="24" opacity={seg(t, 3.4, 4.0)}>{String.raw`$x_1 = 1$`}</M>
        <M x={P([1, 1])[0] - 14} y={P([1, 1])[1] - 30} textAnchor="end" fill={ORANGE} fontSize="24" opacity={seg(t, 7.8, 8.4)}>{String.raw`$X_0 = 4$`}</M>
        <M x={P([2.5, 1.5])[0] + 10} y={P([2.5, 1.5])[1] - 14} fill={ORANGE} fontSize="24" opacity={seg(t, 8.6, 9.2)}>{String.raw`$X_1 = 2$`}</M>

        <circle cx={tp[0]} cy={tp[1]} r={16 + 8 * Math.sin(6 * t)} fill="none" stroke={GREEN} strokeWidth="2.5" opacity={ring} />
        <circle cx={tp[0]} cy={tp[1]} r="9" fill="var(--chalk)" opacity={pointIn} />
        <M x={tp[0] + 16} y={tp[1] - 14} fill="var(--chalk)" fontSize="26" opacity={pointIn}>{String.raw`$\mathbf{x}$`}</M>

        <TG fill="var(--chalk)" fontSize="28">
          <M x="610" y="110" opacity={seg(t, 2.0, 2.8) * (1 - seg(t, 15.0, 15.8))}>{String.raw`$\mathbf{x} = (x_0, x_1) = (3, 1)$`}</M>
          <M x="610" y="146" fill={BLUE} fontSize="22" opacity={seg(t, 3.8, 4.4)}>coordinates in the time basis</M>
          <M x="610" y="210" fill={ORANGE} opacity={seg(t, 8.4, 9.0)}>{String.raw`$\mathbf{X} = (X_0, X_1) = (4, 2)$`}</M>
          <M x="610" y="246" fill={ORANGE} fontSize="22" opacity={seg(t, 9.0, 9.6)}>coordinates in the frequency basis</M>
          <M x="610" y="300" fill="var(--dim)" fontSize="21" opacity={seg(t, 5.6, 6.4)}>{String.raw`$b_0 = (\tfrac12, \tfrac12)$: constant`}</M>
          <M x="610" y="332" fill="var(--dim)" fontSize="21" opacity={seg(t, 5.9, 6.7)}>{String.raw`$b_1 = (\tfrac12, -\tfrac12)$: alternating`}</M>
          <M x="610" y="376" fill="var(--chalk)" fontSize="26" opacity={seg(t, 11.0, 11.8)}>{String.raw`$\mathbf{x} = 4\,b_0 + 2\,b_1$`}</M>
          <g opacity={seg(t, 11.8, 12.6)}>
            <Mat x={622} y={404} rows={2} cols={2} cw={44} rh={38} fontSize={24} cell={(r, c) => ({ text: r === 1 && c === 1 ? '-1' : '1', fill: BLUE })} />
            <Mat x={742} y={404} rows={2} cols={1} cw={40} rh={38} fontSize={24} cell={(r) => ({ text: String(XT[r]) })} />
            <M x="805" y="452" textAnchor="middle" fontSize="28">{String.raw`$=$`}</M>
            <Mat x={850} y={404} rows={2} cols={1} cw={40} rh={38} fontSize={24} cell={(r) => ({ text: String(XF2[r]), fill: ORANGE })} />
          </g>
          <M x="610" y="498" fill="var(--dim)" fontSize="22" opacity={seg(t, 12.8, 13.6)}>{String.raw`$X_0 = x_0 + x_1$ (sum)`}</M>
          <M x="610" y="530" fill="var(--dim)" fontSize="22" opacity={seg(t, 13.2, 14.0)}>{String.raw`$X_1 = x_0 - x_1$ (difference)`}</M>
        </TG>
      </g>

      <g opacity={four}>
        <TG fill="var(--chalk)" fontSize="26">
          <M x="130" y="92" fill={BLUE} fontSize="22" textAnchor="middle">{String.raw`$F$ ($4\times 4$)`}</M>
          <M x="418" y="92" fill="var(--dim)" fontSize="22" textAnchor="middle">{String.raw`$\mathbf{x}$ (time)`}</M>
          <M x="640" y="92" fill={ORANGE} fontSize="22" textAnchor="middle">{String.raw`$\mathbf{X}$ (frequency)`}</M>
        </TG>
        <Mat x={40} y={120} rows={4} cols={4} cw={64} rh={52} fontSize={26} cell={(r, c) => ({ text: ENTRY[POW[r][c]], fill: BLUE })} />
        <Mat x={388} y={120} rows={4} cols={1} cw={60} rh={52} fontSize={26} cell={(r) => ({ text: String(X4[r]) })} />
        <M x="500" y="238" textAnchor="middle" fontSize="34">{String.raw`$=$`}</M>
        <Mat x={610} y={120} rows={4} cols={1} cw={60} rh={52} fontSize={26}
          cell={(r) => ({ text: String(Xs[r]), fill: ORANGE, opacity: seg(t, 17.0 + 0.7 * r, 17.7 + 0.7 * r) })} />
        <TG fill="var(--chalk)" fontSize="26">
          <M x="706" y="170" fontSize="24" opacity={seg(t, 17.2, 18.0)}>{String.raw`$\mathbf{x} = (1, 0, -1, 0)$`}</M>
          <M x="706" y="204" fill="var(--dim)" fontSize="21" opacity={seg(t, 17.2, 18.0)}>one cycle of a cosine</M>
          <M x="706" y="264" fontSize="24" fill={ORANGE} opacity={seg(t, 19.2, 20.0)}>{String.raw`$\mathbf{X} = (0, 2, 0, 2)$`}</M>
          <M x="706" y="298" fill="var(--dim)" fontSize="21" opacity={seg(t, 19.4, 20.2)}>two spikes: bins 1 and 3</M>
        </TG>
        <M x="40" y="400" fontSize="28" opacity={seg(t, 19.8, 20.6)}>Same signal, new coordinates: the frame is a pure tone,</M>
        <M x="40" y="440" fontSize="28" opacity={seg(t, 19.8, 20.6)}>which the raw samples hide.</M>
      </g>
    </svg>
  );
}
