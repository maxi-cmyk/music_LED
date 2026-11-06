import { seg } from '../overview/ease.js';
import { M, TG } from '../math/Tex.jsx';
import { BLUE, ORANGE, GREEN, ENTRY, POW, fz, Mat, Arrow } from './Grid.jsx';

export const STOPS = [4.6, 10.4, 15.6, 22.4]; // the time basis, the warp, the same vector in the new basis, four samples

// the vector space of two-sample signals is a plane. The vector x stays where it is; only the basis vectors change. The time basis e0, e1
// is carried to the frequency basis b0, b1 (the columns of F^{-1}) by one smooth warp: the grid turns 45 degrees, shrinks by sqrt(2), and the
// second basis vector flips through zero, because F reverses orientation
const S = 52, PX = 300, PY = 300; // pixels per unit, and where the zero vector sits
const P = ([a, b]) => [PX + S * a, PY - S * b];
const lerp = (a, b, k) => a + (b - a) * k;
const X2 = [3, 1], B0 = [0.5, 0.5], B1 = [0.5, -0.5];
const mix = (k) => `color-mix(in srgb, ${BLUE}, ${ORANGE} ${Math.round(100 * k)}%)`;

const X4 = [1, 0, -1, 0];
const Xs = Array.from({ length: 4 }, (_, k) => X4.reduce((s, v, n) => s + v * fz(k, n)[0], 0)); // (0, 2, 0, 2)

export default function Basis({ t }) {
  const w = seg(t, 5.6, 9.6); // the warp, 0 = time basis, 1 = frequency basis
  const sc = lerp(1, Math.SQRT1_2, w), th = (Math.PI / 4) * w;
  const u0 = [Math.cos(th), Math.sin(th)], u1 = [-Math.sin(th), Math.cos(th)];
  const l0 = sc, l1 = sc * Math.cos(Math.PI * w); // the lengths of the two basis vectors; l1 passes through zero
  const m0 = [l0 * u0[0], l0 * u0[1]], m1 = [l1 * u1[0], l1 * u1[1]];
  const colour = mix(w);
  const plane = 1 - seg(t, 15.8, 16.6), four = seg(t, 16.8, 17.6);
  const gridIn = seg(t, 0.2, 1.0), xIn = seg(t, 1.0, 1.8);
  const timeParts = seg(t, 2.0, 2.8), timeParts2 = seg(t, 2.8, 3.4), timeFade = 1 - seg(t, 4.8, 5.4);
  const freqParts = seg(t, 10.8, 11.8), freqParts2 = seg(t, 11.8, 12.6);
  const tip0 = P(m0), tip1 = P(m1), xp = P(X2);
  const eLab = 1 - seg(w, 0.35, 0.5), bLab = seg(w, 0.5, 0.65);
  const K = Array.from({ length: 25 }, (_, i) => i - 12);
  const line = (p, d) => { const a = P([p[0] - 30 * d[0], p[1] - 30 * d[1]]), b = P([p[0] + 30 * d[0], p[1] + 30 * d[1]]); return [a, b]; };
  return (
    <svg className="frame tall" viewBox="0 0 1000 560" role="img" aria-label="The plane of two-sample signals is a vector space. A vector x stays fixed while the basis vectors warp: the time basis e0, e1 turns and shrinks into the frequency basis b0, b1, with the second basis vector flipping through zero. The same vector x is 3 e0 plus 1 e1 in the time basis and 4 b0 plus 2 b1 in the frequency basis. For four samples, F x gives the weights 0, 2, 0, 2: x is 2 b1 plus 2 b3.">
      <defs><clipPath id="plane"><rect x="40" y="70" width="520" height="470" /></clipPath></defs>

      <g opacity={plane}>
        <g clipPath="url(#plane)" stroke={colour} strokeWidth="1" opacity={gridIn}>
          {K.map((k) => {
            const a = line([k * m1[0], k * m1[1]], u0), b = line([k * m0[0], k * m0[1]], u1);
            const strong = k === 0 ? 1 : 0.32;
            return (
              <g key={k} opacity={strong}>
                <line x1={a[0][0]} y1={a[0][1]} x2={a[1][0]} y2={a[1][1]} />
                <line x1={b[0][0]} y1={b[0][1]} x2={b[1][0]} y2={b[1][1]} />
              </g>
            );
          })}
        </g>

        <g opacity={gridIn}>
          <Arrow x1={PX} y1={PY} x2={tip0[0]} y2={tip0[1]} color={colour} width={5} head={7} />
          <Arrow x1={PX} y1={PY} x2={tip1[0]} y2={tip1[1]} color={colour} width={5} head={7} />
          <M x={tip0[0] + 4} y={tip0[1] - 16} fill={colour} fontSize="24" opacity={eLab} w={120}>{String.raw`$e_0$`}</M>
          <M x={tip1[0] - 18} y={tip1[1] + 4} textAnchor="end" fill={colour} fontSize="24" opacity={eLab} w={120}>{String.raw`$e_1$`}</M>
          <M x={tip0[0] - 16} y={tip0[1] - 12} textAnchor="end" fill={colour} fontSize="24" opacity={bLab} w={120}>{String.raw`$b_0$`}</M>
          <M x={tip1[0] + 14} y={tip1[1] + 30} fill={colour} fontSize="24" opacity={bLab} w={120}>{String.raw`$b_1$`}</M>
        </g>

        <g opacity={timeFade}>
          <Arrow x1={PX} y1={PY} x2={lerp(PX, P([3, 0])[0], timeParts)} y2={PY} color={BLUE} width={5} head={7} opacity={timeParts > 0 ? 1 : 0} />
          <Arrow x1={P([3, 0])[0]} y1={PY} x2={P([3, 0])[0]} y2={lerp(PY, P([3, 1])[1], timeParts2)} color={BLUE} width={5} head={7} opacity={timeParts2 > 0 ? 1 : 0} />
          <M x={P([1.5, 0])[0]} y={PY + 36} textAnchor="middle" fill={BLUE} fontSize="24" opacity={timeParts} w={160}>{String.raw`$3\,e_0$`}</M>
          <M x={P([3, 0.5])[0] + 16} y={P([3, 0.5])[1] + 8} fill={BLUE} fontSize="24" opacity={timeParts2} w={160}>{String.raw`$1\,e_1$`}</M>
        </g>
        <g opacity={seg(t, 10.6, 11.2)}>
          <Arrow x1={PX} y1={PY} x2={lerp(PX, P([2, 2])[0], freqParts)} y2={lerp(PY, P([2, 2])[1], freqParts)} color={ORANGE} width={5} head={7} opacity={freqParts > 0 ? 1 : 0} />
          <Arrow x1={P([2, 2])[0]} y1={P([2, 2])[1]} x2={lerp(P([2, 2])[0], xp[0], freqParts2)} y2={lerp(P([2, 2])[1], xp[1], freqParts2)} color={ORANGE} width={5} head={7} opacity={freqParts2 > 0 ? 1 : 0} />
          <M x={P([1, 1])[0] - 16} y={P([1, 1])[1] - 24} textAnchor="end" fill={ORANGE} fontSize="24" opacity={freqParts} w={160}>{String.raw`$4\,b_0$`}</M>
          <M x={P([2.5, 1.5])[0] + 12} y={P([2.5, 1.5])[1] - 14} fill={ORANGE} fontSize="24" opacity={freqParts2} w={160}>{String.raw`$2\,b_1$`}</M>
        </g>

        <Arrow x1={PX} y1={PY} x2={xp[0]} y2={xp[1]} color="var(--chalk)" width={6} head={9} opacity={xIn} />
        <M x={xp[0] + 16} y={xp[1] - 14} fill="var(--chalk)" fontSize="28" opacity={xIn} w={120}>{String.raw`$\mathbf{x}$`}</M>

        <TG fill="var(--chalk)" fontSize="28">
          <M x="610" y="116" opacity={seg(t, 3.4, 4.2) * (1 - seg(t, 5.0, 5.6))}>{String.raw`$\mathbf{x} = 3\,e_0 + 1\,e_1$`}</M>
          <M x="610" y="152" fill={BLUE} fontSize="22" opacity={seg(t, 3.6, 4.4) * (1 - seg(t, 5.0, 5.6))}>time basis: one vector per sample</M>
          <M x="610" y="116" fill="var(--dim)" fontSize="24" opacity={seg(t, 5.8, 6.4) * (1 - seg(t, 9.8, 10.2))}>{String.raw`the vector $\mathbf{x}$ does not move`}</M>
          <M x="610" y="116" fill={ORANGE} opacity={seg(t, 12.0, 12.8)}>{String.raw`$\mathbf{x} = 4\,b_0 + 2\,b_1$`}</M>
          <M x="610" y="152" fill={ORANGE} fontSize="22" opacity={seg(t, 12.2, 13.0)}>frequency basis: one vector per pitch</M>
          <M x="610" y="226" fill="var(--dim)" fontSize="21" opacity={seg(t, 9.0, 9.8)}>{String.raw`$b_0 = (\tfrac12, \tfrac12)$: constant`}</M>
          <M x="610" y="258" fill="var(--dim)" fontSize="21" opacity={seg(t, 9.3, 10.1)}>{String.raw`$b_1 = (\tfrac12, -\tfrac12)$: alternating`}</M>
          <g opacity={seg(t, 13.2, 14.2)}>
            <M x="610" y="330" fill="var(--dim)" fontSize="21">the weights come from one product:</M>
            <Mat x={622} y={356} rows={2} cols={2} cw={44} rh={38} fontSize={24} cell={(r, c) => ({ text: r === 1 && c === 1 ? '-1' : '1', fill: 'var(--chalk)' })} />
            <Mat x={742} y={356} rows={2} cols={1} cw={40} rh={38} fontSize={24} cell={(r) => ({ text: String(X2[r]) })} />
            <M x="805" y="404" textAnchor="middle" fontSize="28">{String.raw`$=$`}</M>
            <Mat x={850} y={356} rows={2} cols={1} cw={40} rh={38} fontSize={24} cell={(r) => ({ text: String([4, 2][r]), fill: ORANGE })} />
            <M x="610" y="474" fill="var(--dim)" fontSize="22">{String.raw`$F\mathbf{x} = $ the weights on $b_0, b_1$`}</M>
          </g>
        </TG>
      </g>

      <g opacity={four}>
        <TG fill="var(--chalk)" fontSize="26">
          <M x="130" y="92" fill="var(--dim)" fontSize="22" textAnchor="middle">{String.raw`$F$ ($4\times 4$)`}</M>
          <M x="418" y="92" fill="var(--dim)" fontSize="22" textAnchor="middle">{String.raw`$\mathbf{x}$`}</M>
          <M x="640" y="92" fill={ORANGE} fontSize="22" textAnchor="middle">{String.raw`$F\mathbf{x}$`}</M>
        </TG>
        <Mat x={40} y={120} rows={4} cols={4} cw={64} rh={52} fontSize={26} cell={(r, c) => ({ text: ENTRY[POW[r][c]], fill: 'var(--chalk)' })} />
        <Mat x={388} y={120} rows={4} cols={1} cw={60} rh={52} fontSize={26} cell={(r) => ({ text: String(X4[r]) })} />
        <M x="500" y="238" textAnchor="middle" fontSize="34">{String.raw`$=$`}</M>
        <Mat x={610} y={120} rows={4} cols={1} cw={60} rh={52} fontSize={26}
          cell={(r) => ({ text: String(Xs[r]), fill: ORANGE, opacity: seg(t, 18.0 + 0.6 * r, 18.6 + 0.6 * r) })} />
        <TG fill="var(--chalk)" fontSize="26">
          <M x="706" y="170" fontSize="24" opacity={seg(t, 17.8, 18.4)}>{String.raw`$\mathbf{x}$: one cycle of a cosine`}</M>
          <M x="706" y="268" fontSize="24" fill={ORANGE} opacity={seg(t, 20.0, 20.8)}>{String.raw`weights $(0, 2, 0, 2)$`}</M>
        </TG>
        <M x="40" y="400" fill="var(--chalk)" fontSize="32" opacity={seg(t, 20.4, 21.2)}>{String.raw`$\mathbf{x} = 0\,b_0 + 2\,b_1 + 0\,b_2 + 2\,b_3$`}</M>
        <M x="40" y="446" fill="var(--dim)" fontSize="23" opacity={seg(t, 20.8, 21.6)}>{String.raw`$b_k$ is column $k$ of $F^{-1}$: the pattern at frequency $k$`}</M>
        <M x="40" y="486" fill="var(--dim)" fontSize="23" opacity={seg(t, 21.2, 22.0)}>a pure tone is just two of the four basis vectors, with weight 2 on bin 1 and its mirror, bin 3</M>
      </g>
    </svg>
  );
}
