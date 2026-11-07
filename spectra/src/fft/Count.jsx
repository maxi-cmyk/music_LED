import { seg } from '../overview/ease.js';
import { M, TG } from '../math/Tex.jsx';

export const STOPS = [6.0, 14.0, 23.0]; // the dense matrix, one split, all the splits

const BLUE = '#5cbcff', ORANGE = '#e8a33d', LIME = '#d9ff52';
const BAR = 640, BX = 250; // the length of the bar for 16,384, and where bars start

function Grid({ x, y, s, n = 8, colour = BLUE, opacity = 1 }) { // a dense matrix: every cell used
  const c = s / n;
  return (
    <g opacity={opacity}>
      <rect x={x} y={y} width={s} height={s} fill={colour} fillOpacity="0.8" />
      {Array.from({ length: n - 1 }, (_, i) => (
        <g key={i} stroke="#000" strokeOpacity="0.55" strokeWidth="1.5">
          <line x1={x + (i + 1) * c} x2={x + (i + 1) * c} y1={y} y2={y + s} />
          <line x1={x} x2={x + s} y1={y + (i + 1) * c} y2={y + (i + 1) * c} />
        </g>
      ))}
    </g>
  );
}

// the cost of the DFT and the FFT in matrix terms: a dense matrix has N^2 entries; splitting it into blocks trades it for a sparse matrix and two half-size dense ones
export default function Count({ t }) {
  const a = seg(t, 0.3, 1.2), out0 = seg(t, 6.4, 7.0), b = seg(t, 7.2, 8.4), out1 = seg(t, 14.4, 15.0), c = seg(t, 15.2, 16.4);
  const grow = seg(t, 16.6, 19.0), seven = seg(t, 17.0, 20.0);
  const S = 150, Y1 = 150;
  return (
    <svg className="frame tall" viewBox="0 0 1000 560" role="img" aria-label="Counting the work. A dense Fourier matrix for 128 samples has 128 squared, 16,384, non-zero entries, so the DFT needs 16,384 products. Splitting into blocks replaces it with a sparse matrix of about 2 N non-zero entries and two dense matrices of half the size, which halves the dense work. Repeating the split log base 2 of N times, 7 times, gives 7 factors of 256 non-zero entries, 1,792 in all, which is 448 butterflies. The cost falls from N squared to about 2 N log base 2 of N. These are operation counts, not stopwatch times.">
      <TG opacity={a * (1 - out0)}>
        <Grid x={90} y={130} s={250} n={8} />
        <M x={215} y={265} textAnchor="middle" fontSize="40" fill="#000" w={200}>{'$\\boldsymbol{F}_{128}$'}</M>
        <M x="400" y="168" fontSize="26" opacity={seg(t, 0.8, 1.6)} w={560}>{'$\\boldsymbol{F}_{128}$ has no zeros'}</M>
        <M x="400" y="228" fontSize="32" fill={LIME} opacity={seg(t, 1.8, 2.8)} w={560}>{'$128^2 = 16{,}384$ non-zero entries'}</M>
        <M x="400" y="284" fontSize="24" opacity={seg(t, 3.0, 4.0)} w={560}>{'one product each: the DFT needs $N^2$ products'}</M>
        <M x="400" y="340" fontSize="20" fill="var(--dim)" opacity={seg(t, 4.2, 5.2)} w={560}>{'stored, that is 16,384 complex numbers: 128 KiB'}</M>
      </TG>

      <TG opacity={b * (1 - out1)}>
        <M x="500" y="76" textAnchor="middle" fontSize="26" w={900}>{'one split, in blocks'}</M>
        <Grid x={60} y={Y1} s={S} n={4} />
        <M x={60 + S / 2} y={Y1 + S / 2 + 12} textAnchor="middle" fontSize="30" fill="#000" w={140}>{'$\\boldsymbol{F}_N$'}</M>
        <M x={60 + S + 40} y={Y1 + S / 2 + 12} textAnchor="middle" fontSize="40" w={60}>$=$</M>
        <g transform={`translate(${60 + S + 80} ${Y1})`}>
          <rect width={S} height={S} fill="none" stroke="var(--dim)" strokeWidth="2" strokeDasharray="6 6" />
          {Array.from({ length: 8 }, (_, i) => (
            <g key={i} fill={ORANGE}>
              <rect x={i * S / 8} y={i * S / 8} width={S / 8} height={S / 8} />
              <rect x={((i + 4) % 8) * S / 8} y={i * S / 8} width={S / 8} height={S / 8} />
            </g>
          ))}
          <M x={S / 2} y={S + 30} textAnchor="middle" fontSize="24" fill={ORANGE} w={200}>{'$\\boldsymbol{B}_N$'}</M>
        </g>
        <g transform={`translate(${60 + 2 * S + 130} ${Y1})`}>
          <rect width={S} height={S} fill="none" stroke="var(--dim)" strokeWidth="2" strokeDasharray="6 6" />
          <Grid x={0} y={0} s={S / 2} n={2} />
          <Grid x={S / 2} y={S / 2} s={S / 2} n={2} />
          <M x={S / 4} y={S / 4 + 10} textAnchor="middle" fontSize="22" fill="#000" w={80}>{'$\\boldsymbol{F}_{N/2}$'}</M>
          <M x={3 * S / 4} y={3 * S / 4 + 10} textAnchor="middle" fontSize="22" fill="#000" w={80}>{'$\\boldsymbol{F}_{N/2}$'}</M>
        </g>
        <M x={60 + S / 2} y={Y1 + S + 36} textAnchor="middle" fontSize="26" w={200}>{'$N^2$'}</M>
        <M x={60 + S + 80 + S / 2} y={Y1 + S + 70} textAnchor="middle" fontSize="26" fill={ORANGE} w={200}>{'$2N$'}</M>
        <M x={60 + 2 * S + 130 + S / 2} y={Y1 + S + 36} textAnchor="middle" fontSize="26" w={260}>{'$2\\left(\\frac{N}{2}\\right)^2 = \\frac{N^2}{2}$'}</M>
        <M x="760" y="190" fontSize="26" fill={LIME} opacity={seg(t, 10.4, 11.4)} w={230}>{'dense work'}</M>
        <M x="760" y="226" fontSize="26" fill={LIME} opacity={seg(t, 10.4, 11.4)} w={230}>{'halves'}</M>
        <M x="760" y="290" fontSize="20" fill="var(--dim)" opacity={seg(t, 11.6, 12.6)} w={230}>{'and the sparse'}</M>
        <M x="760" y="316" fontSize="20" fill="var(--dim)" opacity={seg(t, 11.8, 12.8)} w={230}>{'$\\boldsymbol{B}_N$ has only $2N$'}</M>
        <M x="760" y="342" fontSize="20" fill="var(--dim)" opacity={seg(t, 12.0, 13.0)} w={230}>{'non-zero entries'}</M>
      </TG>

      <TG opacity={c}>
        <M x="60" y="80" fontSize="24" fill="var(--dim)" w={880}>{'non-zero entries, for $N = 128$'}</M>
        <M x={BX - 20} y="164" textAnchor="end" fontSize="30" fill={BLUE} w={220}>DFT</M>
        <rect x={BX} y="128" width={BAR * grow} height="52" fill={BLUE} fillOpacity="0.85" />
        <M x={BX + BAR + 16} y="166" fontSize="32" opacity={grow} w={260}>{'$16{,}384$'}</M>
        <M x={BX - 20} y="274" textAnchor="end" fontSize="30" fill={ORANGE} w={220}>FFT</M>
        {Array.from({ length: 7 }, (_, i) => {
          const w = (BAR * 256) / 16384, k = Math.min(1, Math.max(0, seven * 7 - i));
          return <rect key={i} x={BX + i * (w + 4)} y="238" width={w * k} height="52" fill={ORANGE} fillOpacity="0.9" />;
        })}
        <M x={BX + 7 * ((BAR * 256) / 16384 + 4) + 12} y="278" fontSize="32" opacity={seven} w={420}>{'$7$ factors of $256$ = $1{,}792$'}</M>
        <M x={BX} y="336" fontSize="20" fill="var(--dim)" opacity={seg(t, 19.4, 20.2)} w={700}>{'4 entries per butterfly, so 1,792 entries are 448 butterflies'}</M>
        <M x="60" y="420" fontSize="34" fill={LIME} opacity={seg(t, 20.2, 21.2)} w={880}>{'$N^2 \\;\\to\\; 2N\\log_2 N$'}</M>
        <M x="60" y="470" fontSize="22" opacity={seg(t, 20.8, 21.8)} w={880}>{'$\\log_2 N$ factors, each with about $2N$ non-zero entries'}</M>
        <M x="60" y="512" fontSize="20" fill="var(--dim)" opacity={seg(t, 21.6, 22.6)} w={880}>{'operation counts, not stopwatch times; the FFT also works in place on the 128 samples'}</M>
      </TG>
    </svg>
  );
}
