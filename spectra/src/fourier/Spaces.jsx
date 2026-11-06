import { seg } from '../overview/ease.js';
import { M, TG } from '../math/Tex.jsx';
import { Mat, ENTRY, POW } from './Grid.jsx';

export const STOPS = [4.6, 10.0, 15.0, 21.0, 27.0]; // the four spaces, the map, rank 2 loses signals, rank grows to 4, the spaces of F

// the big picture of a matrix, after Strang: the signal space on the left holds the row space and the null space, the output space on the
// right holds the column space and the left null space. A vector x splits into a row-space part and a null-space part; the null part goes to 0
const ROW = '#8fe36a', NUL = '#b48cf0', COL = '#ff6b5a', LEF = '#5cbcff', ORANGE = '#e8a33d';
const ANGLE = (33 * Math.PI) / 180, U1 = [Math.cos(ANGLE), -Math.sin(ANGLE)], U2 = [-Math.sin(ANGLE), -Math.cos(ANGLE)]; // the two edge directions of every diamond
const OLX = 189, ORX = 735, TOP = 140, UNIT = 64, VX = 1.3833; // corner columns, top of the diagram, side per dimension, and a diamond's height per unit of side // the shared corners (the zero vectors) and the side length of one dimension
const add = (p, q) => [p[0] + q[0], p[1] + q[1]];
const sub = (p, q) => [p[0] - q[0], p[1] - q[1]];
const lerp = (p, q, k) => [p[0] + (q[0] - p[0]) * k, p[1] + (q[1] - p[1]) * k];
const clamp = (v) => Math.min(1, Math.max(0, v));
// a point inside a diamond of side s that hangs up (dir 1) or down (dir -1) from its corner O, at fractions a, b along its two edges
const at = (O, s, a, b, dir = 1) => [O[0] + dir * s * (a * U1[0] + b * U2[0]), O[1] + dir * s * (a * U1[1] + b * U2[1])];
const corners = (O, s, dir) => [O, at(O, s, 1, 0, dir), at(O, s, 1, 1, dir), at(O, s, 0, 1, dir)].map((p) => p.join(',')).join(' ');

function Diamond({ O, s, dir, colour, opacity, sym, name, dim }) {
  const c = at(O, s, 0.4, 0.6, dir), show = opacity * clamp((s - 70) / 20);
  return (
    <g>
      <polygon points={corners(O, Math.max(s, 0.01), dir)} fill={colour} fillOpacity={0.2 * opacity} stroke={colour} strokeWidth="2.5" strokeOpacity={opacity * clamp(s / 8)} strokeLinejoin="round" />
      <TG fill="var(--chalk)" textAnchor="middle" fontSize="21" opacity={show}>
        <M x={c[0]} y={c[1] - 13} w={260}>{sym}</M>
        <M x={c[0]} y={c[1] + 11} w={260}>{name}</M>
        <M x={c[0]} y={c[1] + 35} w={260} fill={colour}>{dim}</M>
      </TG>
    </g>
  );
}

// an arrow that draws itself from p to q (progress k), with its label
function Map({ p, q, k, label, colour = 'rgba(160,172,166,0.95)', f = 0.5, dy = -14, opacity = 1 }) {
  const tip = lerp(p, q, k), m = lerp(p, q, f);
  return (
    <g opacity={opacity}>
      <line x1={p[0]} y1={p[1]} x2={tip[0]} y2={tip[1]} stroke={colour} strokeWidth="4" strokeLinecap="round" />
      <polygon points="0,-9 20,0 0,9" fill={colour} transform={`translate(${tip[0]} ${tip[1]}) rotate(${(Math.atan2(q[1] - p[1], q[0] - p[0]) * 180) / Math.PI}) translate(-12 0)`} opacity={clamp((k - 0.9) * 10)} />
      <M x={m[0]} y={m[1] + dy} textAnchor="middle" fill="var(--chalk)" fontSize="22" w={340} opacity={clamp((k - 0.5) * 2)}>{label}</M>
    </g>
  );
}

function Dot({ p, label, dx = 0, dy = -12, anchor = 'middle', colour = 'var(--chalk)', opacity = 1 }) {
  return (
    <g opacity={opacity}>
      <circle cx={p[0]} cy={p[1]} r="6.5" fill={colour} />
      <M x={p[0] + dx} y={p[1] + dy} textAnchor={anchor} fill={colour} fontSize="22" w={120}>{label}</M>
    </g>
  );
}

export default function Spaces({ t }) {
  const r = 2 + 2 * seg(t, 15.8, 19.0), rr = Math.round(r), sR = UNIT * r, sN = UNIT * (4 - r), nf = clamp((4 - r) / 2); // nf: how much null space is left
  const OL = [OLX, TOP + VX * sR], OR = [ORX, TOP + VX * sR]; // the zero vectors: up + down always add to the same height
  const into = [seg(t, 0.3, 1.2), seg(t, 0.8, 1.6), seg(t, 1.2, 2.0), seg(t, 1.6, 2.4)];
  const fSw = seg(t, 19.2, 20.0); // the generic matrix A becomes the Fourier matrix F
  const xPar = at(OL, sR, 0.85, 0.65), xPerp = at(OL, sN, 0.12, 0.9, -1), xFull = add(xPar, sub(xPerp, OL)), b = at(OR, sR, 0.85, 0.65); // the points sit high in their diamonds, so the arrows pass above the labels
  const xPerp2 = at(OL, sN, 0.02, 0.45, -1), xFull2 = add(xPar, sub(xPerp2, OL));
  const pPar = seg(t, 5.2, 5.8), pPerp = seg(t, 5.8, 6.4) * nf, pFull = seg(t, 6.6, 7.4);
  const k1 = seg(t, 7.8, 8.6), k2 = seg(t, 8.4, 9.2), k4 = seg(t, 9.0, 9.8), k3 = seg(t, 9.4, 10.0);
  const second = seg(t, 10.6, 11.4) * nf, k5 = seg(t, 11.4, 12.2);
  const full = fSw > 0.5, dimR = full ? `$\\dim = 4$` : `$\\dim = r$`, dimN = full ? `$\\dim = 0$` : `$\\dim = 4 - r$`; // symbolic until the Fourier matrix, then its numbers
  const nm = fSw > 0.5 ? 'F' : 'A', out = fSw > 0.5 ? String.raw`\mathbf{X}` : String.raw`\mathbf{b}`; // the symbols follow the header: generic A, then the Fourier matrix F
  return (
    <svg className="frame tall" viewBox="0 0 1000 560" role="img" aria-label="The four fundamental spaces. The signal space holds the row space and the null space; the output space holds the column space and the left null space. Any signal is a row-space part plus a null-space part, and the null part is sent to zero. At rank 2 the null space is a plane, so different signals give the same output. As the rank grows to 4 the null spaces shrink to nothing. The Fourier matrix is 4 by 4 with four different frequencies as rows, so its rank is 4.">
      <TG fill="var(--chalk)">
        <M x="30" y="58" fontSize="26" fill={ROW} opacity={seg(t, 0.2, 0.9)}>{String.raw`$\mathbf{x}\in\mathbb{C}^{4}$ = all possible signals`}</M>
        <M x="970" y="58" fontSize="26" fill={COL} textAnchor="end" opacity={seg(t, 0.4, 1.1) * (1 - fSw)}>{String.raw`$\mathbf{b}\in\mathbb{C}^{4}$ = all possible outputs`}</M>
        <M x="970" y="58" fontSize="26" fill={COL} textAnchor="end" opacity={fSw}>{String.raw`$\mathbf{X}\in\mathbb{C}^{4}$ = all possible spectra`}</M>
        <M x="500" y="66" fontSize="36" textAnchor="middle" opacity={(1 - fSw) * seg(t, 0.2, 0.9)}>{String.raw`$A\mathbf{x} = \mathbf{b}$`}</M>
        <M x="500" y="66" fontSize="36" textAnchor="middle" opacity={fSw}>{String.raw`$F\mathbf{x} = \mathbf{X}$`}</M>
        <M x="500" y="108" fontSize="24" textAnchor="middle" fill="var(--dim)" opacity={(1 - fSw) * seg(t, 0.4, 1.1)}>{String.raw`$A:\ \mathbb{C}^{4} \to \mathbb{C}^{4}$`}</M>
        <M x="500" y="108" fontSize="24" textAnchor="middle" fill="var(--dim)" opacity={fSw}>time $\to$ frequency</M>
        <M x="30" y="531" fontSize="19" fill="var(--dim)" opacity={seg(t, 2.4, 3.2)}>{`$C(${nm}^{T}) \\perp N(${nm})$`}</M>
        <M x="30" y="556" fontSize="19" fill="var(--dim)" opacity={seg(t, 2.4, 3.2)}>{`$\\mathbb{C}^{4} = C(${nm}^{T}) + N(${nm})$`}</M>
        <M x="970" y="531" fontSize="19" fill="var(--dim)" textAnchor="end" opacity={seg(t, 2.6, 3.4)}>{`$C(${nm}) \\perp N(${nm}^{T})$`}</M>
        <M x="970" y="556" fontSize="19" fill="var(--dim)" textAnchor="end" opacity={seg(t, 2.6, 3.4)}>{`$\\mathbb{C}^{4} = C(${nm}) + N(${nm}^{T})$`}</M>
      </TG>

      <Diamond O={OL} s={sR} dir={1} colour={ROW} opacity={into[0]} sym={`$C(${nm}^{T})$`} name="Row space" dim={dimR} />
      <Diamond O={OL} s={sN} dir={-1} colour={NUL} opacity={into[1]} sym={`$N(${nm})$`} name="Null space" dim={dimN} />
      <Diamond O={OR} s={sR} dir={1} colour={COL} opacity={into[2]} sym={`$C(${nm})$`} name="Column space" dim={dimR} />
      <Diamond O={OR} s={sN} dir={-1} colour={LEF} opacity={into[3]} sym={`$N(${nm}^{T})$`} name="Left null space" dim={dimN} />

      <g opacity={seg(t, 2.2, 2.8)}>
        {[OL, OR].map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r="9" fill="#000" stroke="var(--chalk)" strokeWidth="3" />)}
      </g>

      <g opacity={pFull}>
        <line x1={xPar[0]} y1={xPar[1]} x2={xFull[0]} y2={xFull[1]} stroke="rgba(160,172,166,0.9)" strokeWidth="3.5" opacity={nf} />
        <line x1={xPerp[0]} y1={xPerp[1]} x2={xFull[0]} y2={xFull[1]} stroke="rgba(160,172,166,0.9)" strokeWidth="3.5" opacity={nf} />
      </g>
      <Map p={xPar} q={b} k={k1} label={`$${nm}\\mathbf{x}_{\\parallel} \\mapsto ${out}$`} f={0.62} dy={-16} />
      <Map p={xFull} q={b} k={k2} label={`$${nm}(\\mathbf{x}_{\\parallel}+\\mathbf{x}_{\\perp}) \\mapsto ${out}$`} f={0.2} dy={-14} opacity={nf} />
      <Map p={OL} q={OR} k={k3} label={String.raw`$A\mathbf{0} \mapsto \mathbf{0}$`} f={0.5} dy={26} opacity={1 - seg(t, 19.0, 20.0)} />
      <Map p={xPerp} q={OR} k={k4} label={`$${nm}\\mathbf{x}_{\\perp} \\mapsto \\mathbf{0}$`} f={0.3} dy={26} opacity={nf} />

      <g opacity={second}>
        <line x1={xPar[0]} y1={xPar[1]} x2={xFull2[0]} y2={xFull2[1]} stroke={ORANGE} strokeWidth="3" strokeDasharray="6 5" />
        <line x1={xPerp2[0]} y1={xPerp2[1]} x2={xFull2[0]} y2={xFull2[1]} stroke={ORANGE} strokeWidth="3" strokeDasharray="6 5" />
        <Dot p={xFull2} label={String.raw`$\mathbf{x}'$`} dx={-14} dy={-6} anchor="end" colour={ORANGE} />
      </g>
      <Map p={xFull2} q={b} k={k5} label="" colour={ORANGE} opacity={second} />

      <Dot p={xPar} label={String.raw`$\mathbf{x}_{\parallel}$`} dy={-14} opacity={pPar} />
      <Dot p={xPerp} label={String.raw`$\mathbf{x}_{\perp}$`} dx={14} dy={8} anchor="start" opacity={pPerp} />
      <Dot p={xFull} label={String.raw`$\mathbf{x}$`} dx={-14} dy={-6} anchor="end" opacity={pFull * nf} />
      <Dot p={b} label={`$${out}$`} dy={-14} colour={COL} opacity={pPar} />

      <TG fill="var(--chalk)" fontSize="22" textAnchor="middle">
        <M x="500" y="514" w={700} opacity={seg(t, 12.4, 13.2) * nf}>{String.raw`$\mathbf{x} \neq \mathbf{x}'$, yet $A\mathbf{x} = A\mathbf{x}' = \mathbf{b}$`}</M>
        <M x="500" y="544" w={700} fill="var(--dim)" opacity={seg(t, 13.0, 13.8) * nf}>{String.raw`e.g. $(3,1,2,2)$ and $(4,0,2,2)$ both give $(4,4,4,4)$`}</M>
        <M x="500" y="480" w={700} fill={ROW} fontSize="24" opacity={seg(t, 19.8, 20.6) * (1 - seg(t, 21.2, 21.8))}>each signal has its own output</M>
      </TG>

      <g opacity={seg(t, 21.6, 22.2)}>
        <Mat x={414} y={424} rows={4} cols={4} cw={50} rh={30} fontSize={20}
          cell={(rw, c) => ({ text: ENTRY[POW[rw][c]], opacity: seg(t, 22.2 + 0.5 * rw, 22.8 + 0.5 * rw) })} />
        {[0, 1, 2, 3].map((rw) => (
          <M key={rw} x={398} y={424 + 30 * rw + 22} textAnchor="end" fill="var(--dim)" fontSize="18" w={120} opacity={seg(t, 22.2 + 0.5 * rw, 22.8 + 0.5 * rw)}>{`$k=${rw}$`}</M>
        ))}
      </g>
    </svg>
  );
}
