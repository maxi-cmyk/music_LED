import { seg } from '../overview/ease.js';
import { M, TG } from '../math/Tex.jsx';

export const STOPS = [1.8, 3.8, 5.8]; // the twist, add, subtract
const BLUE = '#5cbcff', ORANGE = '#e8a33d', GREEN = '#8fe36a';
const U = 185, PX = 190, PY = 285; // pixels per unit, plane centre
const E = [0.6, -0.25], O = [0.35, 0.85], A = -Math.PI / 4; // the two half-answers for one bin k, and the twist for k = 16 of 128 (16/128 of a turn, clockwise)
const turn = ([x, y], a) => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)];
const add = (p, q) => [p[0] + q[0], p[1] + q[1]];
const sc = (p, k) => [p[0] * k, p[1] * k];
const lerp = (p, q, k) => [p[0] + (q[0] - p[0]) * k, p[1] + (q[1] - p[1]) * k];
const WO = turn(O, A), SUM = add(E, WO), DIFF = add(E, sc(WO, -1));
const px = ([x, y]) => [PX + U * x, PY - U * y];

function Arrow({ from, to, color, width = 4.5, dash, opacity = 1 }) {
  const [x1, y1] = px(from), [x2, y2] = px(to), a = Math.atan2(y2 - y1, x2 - x1), h = 16;
  if (Math.hypot(x2 - x1, y2 - y1) < 2) return null;
  return (
    <TG opacity={opacity} stroke={color} fill={color}>
      <line x1={x1} y1={y1} x2={x2 - h * 0.6 * Math.cos(a)} y2={y2 - h * 0.6 * Math.sin(a)} strokeWidth={width} strokeDasharray={dash} />
      <polygon stroke="none" points={`${x2},${y2} ${x2 - h * Math.cos(a - 0.4)},${y2 - h * Math.sin(a - 0.4)} ${x2 - h * Math.cos(a + 0.4)},${y2 - h * Math.sin(a + 0.4)}`} />
    </TG>
  );
}
const T = ({ at, children, ...p }) => { const [x, y] = px(at); return <M x={x + 12} y={y - 12} fontSize="28" {...p}>{children}</M>; };

// one butterfly: the odd half's answer is twisted by the bin's angle, then added to the even half's answer for bin k and subtracted for bin k + 64
export default function Butterfly({ t }) {
  const twist = seg(t, 0.2, 1.7), slide = seg(t, 2, 3.2), plus = seg(t, 3.2, 3.8), back = seg(t, 3.9, 4.4), minus = seg(t, 4.4, 5.4);
  const woTail = sc(E, slide), flip = 1 - back;
  const arc = Array.from({ length: 13 }, (_, i) => { const a = Math.atan2(O[1], O[0]) + A * twist * i / 12; return px([0.42 * Math.cos(a), 0.42 * Math.sin(a)]).join(','); }).join(' ');
  return (
    <svg className="frame tall" viewBox="0 0 1000 560" role="img" aria-label="A butterfly: the odd half's answer is twisted, then added to and subtracted from the even half's answer to give two final answers">
      <line x1={PX - 70} x2={PX + 300} y1={PY} y2={PY} stroke="var(--dim)" strokeWidth="1.5" opacity="0.5" />
      <line x1={PX} x2={PX} y1={PY - 230} y2={PY + 230} stroke="var(--dim)" strokeWidth="1.5" opacity="0.5" />
      <Arrow from={[0, 0]} to={E} color={BLUE} />
      <T at={E} fill={BLUE}>$E[k]$</T>
      <Arrow from={[0, 0]} to={O} color={ORANGE} dash={twist > 0 ? '6 7' : undefined} opacity={twist > 0 ? 0.4 : 1} />
      <T at={O} fill={ORANGE} opacity={1 - twist}>$O[k]$</T>
      <polyline points={arc} fill="none" stroke={ORANGE} strokeWidth="2.5" opacity={twist * 0.9} />
      <g opacity={slide < 0.01 ? 1 : flip}>
        <Arrow from={woTail} to={add(woTail, twist < 1 ? turn(O, A * twist) : WO)} color={ORANGE} opacity={twist > 0 ? 1 : 0} />
      </g>
      <T at={add(woTail, WO)} fill={ORANGE} opacity={seg(t, 1.4, 1.8) * flip}>{'$W^{k}\\!\\cdot\\!O[k]$'}</T>
      <g opacity={back}><Arrow from={E} to={DIFF} color={ORANGE} dash="6 7" /></g>
      <Arrow from={[0, 0]} to={lerp([0, 0], SUM, plus)} color="#f2f2ec" opacity={plus} />
      <T at={SUM} fill="var(--chalk)" opacity={plus}>$X[k]$</T>
      <Arrow from={[0, 0]} to={lerp([0, 0], DIFF, minus)} color={GREEN} opacity={minus} />
      <T at={DIFF} fill={GREEN} opacity={minus}>$X[k+64]$</T>
      <M x="40" y="40" fill="var(--dim)" fontSize="22" opacity={twist}>{'twist $= k/128$ of a turn, clockwise (here $k = 16$)'}</M>

      <TG textAnchor="middle">
        <M x="660" y="128" fill={BLUE} fontSize="30">$E[k]$</M>
        <M x="660" y="378" fill={ORANGE} fontSize="30">$O[k]$</M>
        <rect x="715" y="345" width="84" height="50" rx="7" fill="none" stroke={ORANGE} strokeWidth="2.5" />
        <M x="757" y="381" fill={ORANGE} fontSize="28">{'$\\times W$'}</M>
        <line x1="690" y1="368" x2="715" y2="368" stroke={ORANGE} strokeWidth="2.5" />
        <line x1="690" y1="120" x2="880" y2="120" stroke="var(--dim)" strokeWidth="2" opacity="0.5" />
        <line x1="690" y1="120" x2="880" y2="368" stroke="var(--dim)" strokeWidth="2" opacity="0.5" />
        <line x1="799" y1="368" x2="880" y2="120" stroke={ORANGE} strokeWidth="2" opacity="0.5" />
        <line x1="799" y1="368" x2="880" y2="368" stroke={ORANGE} strokeWidth="2" opacity="0.5" />
        <g opacity={plus}>
          <line x1="690" y1="120" x2="880" y2="120" stroke="var(--chalk)" strokeWidth="3.5" />
          <line x1="799" y1="368" x2="880" y2="120" stroke="var(--chalk)" strokeWidth="3.5" />
        </g>
        <g opacity={minus}>
          <line x1="690" y1="120" x2="880" y2="368" stroke={GREEN} strokeWidth="3.5" />
          <line x1="799" y1="368" x2="880" y2="368" stroke={GREEN} strokeWidth="3.5" />
        </g>
        <M x="955" y="128" fill="var(--chalk)" opacity={plus} fontSize="28">$X[k]$</M>
        <M x="950" y="376" fill={GREEN} opacity={minus} fontSize="26">$X[k+64]$</M>
        <M x="800" y="450" fill="var(--chalk)" opacity={plus} fontSize="30">{'$X[k] = E[k] + W^{k}O[k]$'}</M>
        <M x="800" y="498" fill={GREEN} opacity={minus} fontSize="30">{'$X[k+64] = E[k] - W^{k}O[k]$'}</M>
        <M x="800" y="540" fill="var(--dim)" opacity={minus} fontSize="22">{'because $W^{k+64} = -W^{k}$'}</M>
      </TG>
    </svg>
  );
}
