import { seg } from '../overview/ease.js';
import { M, TG } from '../math/Tex.jsx';

export const STOPS = [14.4]; // the DFT and the FFT side by side in big O

const BLUE = '#5cbcff', ORANGE = '#e8a33d', LIME = '#d9ff52';
const GX = 110, GY = 96, GS = 200, GN = 16; // the dense matrix, drawn with 16 rows
const LX = 520, TW = 300, LY = (r) => 96 + r * 66, BH = 34; // the splitting tree for N = 8

// time complexity of the DFT and the FFT, in big O
export default function Complexity({ t }) {
  const sweep = seg(t, 1.2, 4.8);
  const lv = [seg(t, 6.4, 7.4), seg(t, 7.6, 8.6), seg(t, 8.8, 9.8), seg(t, 10, 11)];
  const row = Math.min(GN, Math.floor(sweep * GN * 1.0001));
  const cell = GS / GN;
  return (
    <svg className="frame tall" viewBox="0 0 1000 560" role="img" aria-label="Time complexity. The DFT multiplies an N by N matrix by a vector: N outputs of N products each, N squared products, so the work is big O of N squared, 16,384 products for N equal 128. The FFT splits the problem in half log base 2 of N times, and each level does N over 2 butterflies, which is big O of N work, so the total is big O of N log N, 7 levels of 64 butterflies, 448, for N equal 128. These are operation counts, not stopwatch times.">
      <TG>
        <line x1="490" x2="490" y1="40" y2="500" stroke="var(--dim)" strokeWidth="1.5" opacity={0.4 * seg(t, 6, 6.6)} />

        <TG opacity={seg(t, 0.2, 1)}>
          <M x="250" y="56" textAnchor="middle" fontSize="28" fill={BLUE} w={300}>DFT</M>
          <rect x={GX} y={GY} width={GS} height={GS} fill={BLUE} fillOpacity="0.8" />
          {Array.from({ length: GN - 1 }, (_, i) => (
            <g key={i} stroke="#000" strokeOpacity="0.55" strokeWidth="1.5">
              <line x1={GX + (i + 1) * cell} x2={GX + (i + 1) * cell} y1={GY} y2={GY + GS} />
              <line x1={GX} x2={GX + GS} y1={GY + (i + 1) * cell} y2={GY + (i + 1) * cell} />
            </g>
          ))}
          {Array.from({ length: GN }, (_, r) => (
            <rect key={r} x={GX} y={GY + r * cell} width={GS} height={cell} fill={r < row ? ORANGE : 'none'} fillOpacity={r === row - 1 ? 0.95 : 0.55} />
          ))}
          <M x={GX - 12} y={GY + GS / 2 + 6} textAnchor="end" fontSize="18" fill="var(--dim)" w={100}>{'$N$ rows'}</M>
          <M x={GX + GS / 2} y={GY + GS + 30} textAnchor="middle" fontSize="18" fill="var(--dim)" w={300}>{'$N$ products in each'}</M>
        </TG>
        <M x="250" y="368" textAnchor="middle" fontSize="22" opacity={seg(t, 2, 2.8)} w={420}>{'$N^2$ products in all'}</M>
        <M x="250" y="440" textAnchor="middle" fontSize="56" fill={LIME} opacity={seg(t, 4, 5)} w={420}>{'$O(N^2)$'}</M>
        <M x="250" y="484" textAnchor="middle" fontSize="20" opacity={seg(t, 5, 6)} w={420}>{'$N = 128$: $16{,}384$ products'}</M>

        <M x="740" y="56" textAnchor="middle" fontSize="28" fill={ORANGE} opacity={seg(t, 6.2, 7)} w={300}>FFT</M>
        {[0, 1, 2, 3].map((r) => {
          const n = 2 ** r, w = TW / n, size = 8 / n;
          return (
            <g key={r} opacity={lv[r]}>
              {Array.from({ length: n }, (_, i) => (
                <g key={i}>
                  <rect x={LX + i * w + 3} y={LY(r)} width={w - 6} height={BH} rx="6" fill={r === 3 ? ORANGE : BLUE} fillOpacity={r === 3 ? 0.35 : 0.2} stroke={r === 3 ? ORANGE : BLUE} strokeWidth="2" />
                  <M x={LX + i * w + w / 2} y={LY(r) + 24} textAnchor="middle" fontSize="17" w={60}>{`$${size}$`}</M>
                </g>
              ))}
            </g>
          );
        })}
        {[0, 1, 2].map((r) => (
          <g key={r} opacity={seg(t, 10 + 0.7 * (2 - r), 11 + 0.7 * (2 - r))}>
            <path d={`M${LX + TW + 12} ${LY(r) + BH / 2} v${LY(r + 1) - LY(r)}`} stroke={ORANGE} strokeWidth="2.5" fill="none" />
            <M x={LX + TW + 22} y={(LY(r) + LY(r + 1) + BH) / 2 + 5} fontSize="15" fill={ORANGE} w={150}>{'$\\frac{N}{2}$ butterflies'}</M>
          </g>
        ))}
        <M x="740" y="372" textAnchor="middle" fontSize="20" opacity={seg(t, 11.6, 12.4)} w={440}>{'$\\log_2 N$ levels of $\\frac{N}{2}$ butterflies, $O(N)$ each'}</M>
        <M x="740" y="440" textAnchor="middle" fontSize="52" fill={LIME} opacity={seg(t, 12.4, 13.4)} w={440}>{'$O(N\\log N)$'}</M>
        <M x="740" y="484" textAnchor="middle" fontSize="20" opacity={seg(t, 13.2, 14.2)} w={440}>{'$N = 128$: 7 levels of 64: $448$'}</M>
      </TG>

    </svg>
  );
}
