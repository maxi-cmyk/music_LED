import { seg } from '../overview/ease.js';
import { M, TG } from '../math/Tex.jsx';

export const STOPS = [4.4, 7.2, 10.9, 13.1]; // F has full rank, a matrix that is not full rank, where a signal goes, information is lost

// the big picture of a matrix, after Strang: the signal space on the left holds the row space and the null space, the output space on the
// right holds the column space and the left null space. A vector x splits into a row-space part and a null-space part; the null part goes to 0
const ROW = '#8fe36a', NUL = '#b48cf0', COL = '#ff6b5a', LEF = '#5cbcff', ORANGE = '#e8a33d';
const ANGLE = (33 * Math.PI) / 180, U1 = [Math.cos(ANGLE), -Math.sin(ANGLE)], U2 = [-Math.sin(ANGLE), -Math.cos(ANGLE)]; // the two edge directions of every diamond
const OLX = 189, ORX = 735, TOP = 126, UNIT = 71, VX = 1.3833; // corner columns, top of the diagram, side per dimension, and a diamond's height per unit of side // the shared corners (the zero vectors) and the side length of one dimension
const add = (p, q) => [p[0] + q[0], p[1] + q[1]];
const sub = (p, q) => [p[0] - q[0], p[1] - q[1]];
const lerp = (p, q, k) => [p[0] + (q[0] - p[0]) * k, p[1] + (q[1] - p[1]) * k];
const clamp = (v) => Math.min(1, Math.max(0, v));
// a point inside a diamond of side s that hangs up (dir 1) or down (dir -1) from its corner O, at fractions a, b along its two edges
const at = (O, s, a, b, dir = 1) => [O[0] + dir * s * (a * U1[0] + b * U2[0]), O[1] + dir * s * (a * U1[1] + b * U2[1])];
const corners = (O, s, dir) => [O, at(O, s, 1, 0, dir), at(O, s, 1, 1, dir), at(O, s, 0, 1, dir)].map((p) => p.join(',')).join(' ');

function Diamond({ O, s, dir, colour, opacity, sym, name, dim }) {
  const c = at(O, s, 0.5, 0.5, dir), show = opacity * clamp((s - 100) / 20);
  return (
    <g>
      <polygon points={corners(O, Math.max(s, 0.01), dir)} fill={colour} fillOpacity={0.2 * opacity} stroke={colour} strokeWidth="2.5" strokeOpacity={opacity * clamp(s / 8)} strokeLinejoin="round" />
      <TG fill="var(--chalk)" textAnchor="middle" fontSize="19" opacity={show}>
        <M x={c[0]} y={c[1] - 20} w={260}>{sym}</M>
        <M x={c[0]} y={c[1] + 8} w={260}>{name}</M>
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
  // F first: full column rank, so r = 4 and nothing hides. Then a matrix A that is not full rank: r drops to 2 and the null spaces appear
  const r = 4 - 2 * seg(t, 4.6, 6.8), sR = UNIT * r, sN = UNIT * (4 - r), nf = clamp((4 - r) / 2); // nf: how much null space there is
  const OL = [OLX, TOP + VX * sR], OR = [ORX, TOP + VX * sR]; // the zero vectors: up + down always add to the same height
  const into = [seg(t, 0.3, 1.2), seg(t, 0.8, 1.6), seg(t, 1.2, 2), seg(t, 1.6, 2.4)];
  const fw = 1 - seg(t, 4.8, 5.4); // 1 while we look at the Fourier matrix F, 0 for the generic matrix A
  const isF = fw > 0.5, nm = isF ? 'F' : 'A', out = isF ? String.raw`\mathbf{X}` : String.raw`\mathbf{b}`;
  const dimR = isF ? `$\\dim = 4$` : `$\\dim = r$`, dimN = isF ? `$\\dim = 0$` : `$\\dim = 4 - r$`; // numbers for F, symbols for A
  const xPar = at(OL, sR, 0.95, 0.5), xPerp = at(OL, sN, 0.12, 0.9, -1), xFull = add(xPar, sub(xPerp, OL)), b = at(OR, sR, 0.4, 0.9); // the points sit high in their diamonds, so the arrows pass above the labels
  const xPerp2 = at(OL, sN, 0.04, 0.55, -1), xFull2 = add(xPar, sub(xPerp2, OL));
  const pPar = seg(t, 2.8, 3.4), pPerp = seg(t, 7.4, 7.9) * nf, pFull = seg(t, 8.1, 8.8);
  const k1 = seg(t, 3.2, 4), k2 = seg(t, 9.1, 9.8), k4 = seg(t, 9.6, 10.2), k3 = seg(t, 9.9, 10.5);
  const second = seg(t, 11.1, 11.9) * nf, k5 = seg(t, 11.9, 12.7);
  const zero = seg(t, 2.6, 3.4) * (1 - clamp(nf * 5)) * fw; // at full rank the null spaces are just the zero vector
  return (
    <svg className="frame tall" viewBox="0 0 1000 560" role="img" aria-label="The four fundamental spaces. The Fourier matrix F has full column rank, so its rank is 4: the row space and column space are all of C to the 4 and both null spaces are just zero, so every signal maps to its own output. A matrix of rank 2 instead has null spaces of dimension 2: any signal is a row-space part plus a null-space part, the null part is sent to zero, and different signals can give the same output, so information is lost.">
      <TG fill="var(--chalk)">
        <M x="30" y="58" fontSize="26" fill={ROW} opacity={seg(t, 0.2, 0.9)}>{String.raw`$\mathbf{x}\in\mathbb{C}^{4}$ = all possible signals`}</M>
        <M x="970" y="58" fontSize="26" fill={COL} textAnchor="end" opacity={seg(t, 0.4, 1.1) * (1 - fw)}>{String.raw`$\mathbf{b}\in\mathbb{C}^{4}$ = all possible outputs`}</M>
        <M x="970" y="58" fontSize="26" fill={COL} textAnchor="end" opacity={seg(t, 0.4, 1.1) * fw}>{String.raw`$\mathbf{X}\in\mathbb{C}^{4}$ = all possible spectra`}</M>
        <M x="500" y="66" fontSize="36" textAnchor="middle" opacity={(1 - fw)}>{String.raw`$A\mathbf{x} = \mathbf{b}$`}</M>
        <M x="500" y="66" fontSize="36" textAnchor="middle" opacity={fw * seg(t, 0.2, 0.9)}>{String.raw`$F\mathbf{x} = \mathbf{X}$`}</M>
        <M x="500" y="108" fontSize="24" textAnchor="middle" fill="var(--dim)" opacity={1 - fw}>{String.raw`$A:\ \mathbb{C}^{4} \to \mathbb{C}^{4}$`}</M>
        <M x="500" y="108" fontSize="24" textAnchor="middle" fill="var(--dim)" opacity={fw * seg(t, 0.4, 1.1)}>time $\to$ frequency</M>
        <M x="30" y="550" fontSize="19" fill="var(--dim)" opacity={seg(t, 2.4, 3.2)}>{`$\\mathbb{C}^{4} = C(${nm}^{T}) + N(${nm}),\\ C(${nm}^{T}) \\perp N(${nm})$`}</M>
        <M x="970" y="550" fontSize="19" fill="var(--dim)" textAnchor="end" opacity={seg(t, 2.6, 3.4)}>{`$\\mathbb{C}^{4} = C(${nm}) + N(${nm}^{T}),\\ C(${nm}) \\perp N(${nm}^{T})$`}</M>
      </TG>

      <Diamond O={OL} s={sR} dir={1} colour={ROW} opacity={into[0]} sym={`$C(${nm}^{T})$`} name="Row space" dim={dimR} />
      <Diamond O={OL} s={sN} dir={-1} colour={NUL} opacity={into[1]} sym={`$N(${nm})$`} name="Null space" dim={dimN} />
      <Diamond O={OR} s={sR} dir={1} colour={COL} opacity={into[2]} sym={`$C(${nm})$`} name="Column space" dim={dimR} />
      <Diamond O={OR} s={sN} dir={-1} colour={LEF} opacity={into[3]} sym={`$N(${nm}^{T})$`} name="Left null space" dim={dimN} />

      <g opacity={seg(t, 2.2, 2.8)}>
        {[OL, OR].map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r="9" fill="#000" stroke="var(--chalk)" strokeWidth="3" />)}
      </g>
      <g opacity={zero}>
        <M x={OL[0] + 22} y={OL[1] - 2} fill={NUL} fontSize="20" w={300}>{String.raw`$N(F) = \{\mathbf{0}\}$`}</M>
        <M x={OR[0] - 22} y={OR[1] - 2} textAnchor="end" fill={LEF} fontSize="20" w={300}>{String.raw`$N(F^{T}) = \{\mathbf{0}\}$`}</M>
      </g>

      <g opacity={pFull}>
        <line x1={xPar[0]} y1={xPar[1]} x2={xFull[0]} y2={xFull[1]} stroke="rgba(160,172,166,0.9)" strokeWidth="3.5" opacity={nf} />
        <line x1={xPerp[0]} y1={xPerp[1]} x2={xFull[0]} y2={xFull[1]} stroke="rgba(160,172,166,0.9)" strokeWidth="3.5" opacity={nf} />
      </g>
      <Map p={xPar} q={b} k={k1} label={isF ? String.raw`$F\mathbf{x} \mapsto \mathbf{X}$` : String.raw`$A\mathbf{x}_{\parallel} \mapsto \mathbf{b}$`} f={0.62} dy={-16} />
      <Map p={xFull} q={b} k={k2} label={`$${nm}(\\mathbf{x}_{\\parallel}+\\mathbf{x}_{\\perp}) \\mapsto ${out}$`} f={0.5} dy={28} opacity={nf} />
      <Map p={OL} q={OR} k={k3} label={String.raw`$A\mathbf{0} \mapsto \mathbf{0}$`} f={0.5} dy={26} />
      <Map p={xPerp} q={OR} k={k4} label={`$${nm}\\mathbf{x}_{\\perp} \\mapsto \\mathbf{0}$`} f={0.3} dy={26} opacity={nf} />

      <g opacity={second}>
        <line x1={xPar[0]} y1={xPar[1]} x2={xFull2[0]} y2={xFull2[1]} stroke={ORANGE} strokeWidth="3" strokeDasharray="6 5" />
        <line x1={xPerp2[0]} y1={xPerp2[1]} x2={xFull2[0]} y2={xFull2[1]} stroke={ORANGE} strokeWidth="3" strokeDasharray="6 5" />
        <Dot p={xFull2} label={String.raw`$\mathbf{x}'$`} dx={14} dy={-8} anchor="start" colour={ORANGE} />
      </g>
      <Map p={xFull2} q={b} k={k5} label="" colour={ORANGE} opacity={second} />

      <Dot p={xPar} label={isF ? String.raw`$\mathbf{x}$` : String.raw`$\mathbf{x}_{\parallel}$`} dy={-14} opacity={pPar} />
      <Dot p={xPerp} label={String.raw`$\mathbf{x}_{\perp}$`} dx={14} dy={8} anchor="start" opacity={pPerp} />
      <Dot p={xFull} label={String.raw`$\mathbf{x}$`} dx={-14} dy={-6} anchor="end" opacity={pFull * nf} />
      <Dot p={b} label={`$${out}$`} dy={-14} colour={COL} opacity={pPar} />

    </svg>
  );
}
