import { M } from '../math/Tex.jsx';

export const BLUE = '#5cbcff', ORANGE = '#e8a33d', GREEN = '#8fe36a', DIMC = '#6a6a64';

// the 4x4 Fourier matrix used across the pages: F[k][n] = e^{-i 2 pi k n / 4} = (-i)^(kn mod 4)
export const N = 4;
export const POW = Array.from({ length: N }, (_, k) => Array.from({ length: N }, (_, n) => (k * n) % N)); // power of -i
export const ENTRY = ['1', '-i', '-1', 'i'];
export const CONJ = ['1', 'i', '-1', '-i'];
// F[k][n] as a complex number [re, im]
export const fz = (k, n) => { const a = (-2 * Math.PI * POW[k][n]) / N; return [Math.round(Math.cos(a)), Math.round(Math.sin(a))]; };

// a matrix drawn cell by cell, so every entry can fade in or change colour on its own.
// cell(r, c) returns { text, fill, opacity } (text is TeX without the dollar signs) or nothing
export function Mat({ x, y, rows, cols, cw = 60, rh = 46, fontSize = 26, opacity = 1, cell }) {
  const W = cols * cw, H = rows * rh;
  const bracket = (side) => {
    const bx = side < 0 ? x - 8 : x + W + 8, d = side < 0 ? 9 : -9;
    return `M${bx + d} ${y - 4} H${bx} V${y + H + 4} H${bx + d}`;
  };
  return (
    <g opacity={opacity}>
      <path d={bracket(-1)} fill="none" stroke="var(--chalk)" strokeWidth="2" />
      <path d={bracket(1)} fill="none" stroke="var(--chalk)" strokeWidth="2" />
      {Array.from({ length: rows }, (_, r) => Array.from({ length: cols }, (_, c) => {
        const v = cell(r, c);
        if (!v || v.opacity === 0) return null;
        return (
          <M key={`${r}.${c}`} x={x + cw * (c + 0.5)} y={y + rh * (r + 0.5) + 0.32 * fontSize} fontSize={fontSize} textAnchor="middle"
            fill={v.fill ?? 'var(--chalk)'} opacity={v.opacity ?? 1} w={cw * 2}>{`$${v.text}$`}</M>
        );
      }))}
    </g>
  );
}

// an arrow from (x1, y1) to (x2, y2) with a round head
export function Arrow({ x1, y1, x2, y2, color = 'var(--chalk)', width = 3.5, head = 6, opacity = 1, dash }) {
  return (
    <g opacity={opacity}>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={width} strokeLinecap="round" strokeDasharray={dash} />
      <circle cx={x2} cy={y2} r={head} fill={color} />
    </g>
  );
}
