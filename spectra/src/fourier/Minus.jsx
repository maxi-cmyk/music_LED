import { seg } from '../overview/ease.js';
import { M, TG } from '../math/Tex.jsx';
import { BLUE, ORANGE, GREEN, Arrow } from './Grid.jsx';

export const STOPS = [2.55, 6.75, 11.55]; // tone against weights, the turns cancel, a plus would cancel the tone
const HALF = Math.PI / 2;
const RY = [150, 245, 340, 435]; // row centres
const CX = { tone: 185, weight: 365, prod: 545 }, R = 34; // mini circles
const U = 66, X0 = 650; // the running total: one unit of length, and where it starts

// a unit arrow on a small circle
function Dial({ cx, cy, ang, color, opacity = 1 }) {
  return (
    <g opacity={opacity}>
      <circle cx={cx} cy={cy} r={R} fill="none" stroke="var(--dim)" strokeWidth="1.5" opacity="0.6" />
      <Arrow x1={cx} y1={cy} x2={cx + R * Math.cos(ang)} y2={cy - R * Math.sin(ang)} color={color} width={4} head={6} />
    </g>
  );
}

// why the minus sign: test the tone e^{+i theta} (theta = n pi/2) against row 1 of F. With the minus the weights turn against the tone,
// so every product points the same way and the four add to 4. With a plus they would turn with it and the products would cancel to 0
export default function Minus({ t }) {
  const sigma = -1 + 2 * seg(t, 7.35, 9.35); // the sign of the weights' turn: -1 is the Fourier matrix, +1 is the "wrong" sign
  const rowIn = (n) => seg(t, 0.3 + 0.45 * n, 0.8 + 0.45 * n), prodIn = (n) => seg(t, 2.95 + 0.4 * n, 3.45 + 0.4 * n), chainIn = (n) => seg(t, 3.75 + 0.4 * n, 4.25 + 0.4 * n);
  const prodAng = (n) => HALF * n * (1 + sigma); // tone angle plus weight angle
  const xs = [X0];
  for (let n = 0; n < 4; n++) xs.push(xs[n] + U * Math.cos(prodAng(n)));
  const total = Math.round((xs[4] - X0) / U);
  const minusHead = 1 - seg(t, 7.35, 8.35);
  const flip = seg(t, 9.15, 9.95); // once the weights have turned round, the odd rows are the ones that differ
  return (
    <svg className="frame tall" viewBox="0 0 1000 560" role="img" aria-label="A tone that turns counterclockwise is tested against the weights of row 1 of the Fourier matrix. With the minus sign the weights turn clockwise, every product points the same way and the four products add up to 4. With a plus sign the products alternate and cancel to zero.">
      <TG fill="var(--dim)" fontSize="24" textAnchor="middle">
        <M x={CX.tone} y="68" opacity={seg(t, 0.2, 0.8)}>{String.raw`tone $e^{i\theta}$`}</M>
        <M x={CX.weight} y="68" opacity={seg(t, 0.4, 1) * minusHead}>{String.raw`weight $e^{-i\theta}$`}</M>
        <M x={CX.weight} y="68" fill={ORANGE} opacity={seg(t, 7.75, 8.75)}>{String.raw`weight $e^{+i\theta}$`}</M>
        <M x={CX.prod} y="68" opacity={prodIn(0)}>product</M>
        <M x="800" y="68" opacity={chainIn(0)}>add them up</M>
      </TG>

      {[1, 3].map((n) => ( // with a plus, these rows' products point the other way: they are the ones that cancel the rest
        <g key={n} opacity={flip}>
          <rect x="30" y={RY[n] - 46} width="940" height="92" rx="10" fill={ORANGE} fillOpacity="0.12" stroke={ORANGE} strokeWidth="1.5" />
          <M x="760" y={RY[n] + 7} fill={ORANGE} fontSize="20">points the other way</M>
        </g>
      ))}
      {[0, 1, 2, 3].map((n) => (
        <g key={n}>
          <M x="50" y={RY[n] + 8} fill="var(--dim)" fontSize="24" opacity={rowIn(n)}>{`$n=${n}$`}</M>
          <Dial cx={CX.tone} cy={RY[n]} ang={HALF * n} color={BLUE} opacity={rowIn(n)} />
          <M x={(CX.tone + CX.weight) / 2} y={RY[n] + 10} textAnchor="middle" fill="var(--dim)" fontSize="30" opacity={rowIn(n)}>{String.raw`$\times$`}</M>
          <Dial cx={CX.weight} cy={RY[n]} ang={sigma * HALF * n} color={ORANGE} opacity={rowIn(n)} />
          <M x={(CX.weight + CX.prod) / 2} y={RY[n] + 10} textAnchor="middle" fill="var(--dim)" fontSize="30" opacity={prodIn(n)}>{String.raw`$=$`}</M>
          <Dial cx={CX.prod} cy={RY[n]} ang={prodAng(n)} color={n % 2 && flip > 0.5 ? ORANGE : GREEN} opacity={prodIn(n)} />
        </g>
      ))}

      {[0, 1, 2, 3].map((n) => (
        <g key={n} opacity={chainIn(n)}>
          <Arrow x1={xs[n]} y1={RY[n]} x2={xs[n + 1]} y2={RY[n]} color={n % 2 && flip > 0.5 ? ORANGE : GREEN} width={5} head={7} />
          {n < 3 && <line x1={xs[n + 1]} x2={xs[n + 1]} y1={RY[n] + 8} y2={RY[n + 1] - 8} stroke="var(--dim)" strokeDasharray="3 5" opacity="0.7" />}
        </g>
      ))}
      <g opacity={chainIn(3)}>
        <line x1={X0} x2={X0} y1={RY[0] - 14} y2={RY[3] + 30} stroke="var(--dim)" strokeWidth="1.5" strokeDasharray="2 5" opacity="0.6" />
        <Arrow x1={X0} y1="506" x2={xs[4]} y2="506" color="var(--chalk)" width={6} head={8} />
      </g>
      <TG fill="var(--chalk)" fontSize="32">
        <M x={X0} y="548" opacity={seg(t, 5.75, 6.35) * (1 - seg(t, 7.15, 7.55))}>{`$X_1 = ${total}$`}</M>
        <M x={X0} y="548" fill={ORANGE} opacity={seg(t, 10.55, 11.15)}>{`$X_1 = ${total}$`}</M>
      </TG>
    </svg>
  );
}
