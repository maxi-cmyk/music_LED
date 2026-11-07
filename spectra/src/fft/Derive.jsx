import { seg } from '../overview/ease.js';
import { M } from '../math/Tex.jsx';

export const STOPS = [3.2, 7.6, 12.6, 18.0]; // the DFT for N samples, even and odd positions, the offset factored out, the named pieces

const LIME = '#d9ff52', BLUE = '#5cbcff', ORANGE = '#e8a33d';
const c = (colour, tex) => `\\textcolor{${colour}}{${tex}}`;

// DFT -> FFT as equations only. The general formula for N samples first, then the values for this project (N = 128)
const G1 = String.raw`X_k = \sum_{n=0}^{N-1} x_n\, e^{-i2\pi kn/N}`;
const G2 = String.raw`\begin{aligned} X_k &= ${c(BLUE, String.raw`\sum_{m=0}^{N/2-1} x_{2m}\, e^{-i2\pi k(2m)/N}`)} \\[10pt] &\quad + ${c(ORANGE, String.raw`\sum_{m=0}^{N/2-1} x_{2m+1}\, e^{-i2\pi k(2m+1)/N}`)} \end{aligned}`;
const G3a = String.raw`e^{-i2\pi k(2m+1)/N} = e^{-i2\pi km/(N/2)}\; ${c(ORANGE, String.raw`e^{-i2\pi k/N}`)}`;
const G3b = String.raw`\begin{aligned} X_k &= ${c(BLUE, String.raw`\sum_{m=0}^{N/2-1} x_{2m}\, e^{-i2\pi km/(N/2)}`)} \\[10pt] &\quad + ${c(ORANGE, String.raw`e^{-i2\pi k/N}`)} \sum_{m=0}^{N/2-1} x_{2m+1}\, e^{-i2\pi km/(N/2)} \end{aligned}`;
const G4 = String.raw`\begin{aligned} ${c(BLUE, 'E_k')} &= \sum_{m=0}^{N/2-1} x_{2m}\, e^{-i2\pi km/(N/2)} \\[10pt] ${c(ORANGE, 'O_k')} &= \sum_{m=0}^{N/2-1} x_{2m+1}\, e^{-i2\pi km/(N/2)} \\[10pt] ${c(ORANGE, 'W_{N}^{k}')} &= e^{-i2\pi k/N} \end{aligned}`;
const G5 = String.raw`${c(LIME, String.raw`X_k = ${c(BLUE, 'E_k')} + ${c(ORANGE, 'W_{N}^{k}')}\,${c(ORANGE, 'O_k')}`)}`;

export default function Derive({ t }) {
  const mv = seg(t, 3.9, 4.5); // the first equation moves up to make room
  const out2 = seg(t, 8.2, 8.8), out3 = seg(t, 13.2, 13.8);
  const s0 = seg(t, 0.3, 1.1) * (1 - 0.6 * mv) * (1 - out2);
  const s1 = seg(t, 4.2, 5.2) * (1 - out2);
  const s2a = seg(t, 8.6, 9.4) * (1 - out3), s2b = seg(t, 9.8, 10.8) * (1 - out3);
  const s3 = seg(t, 13.6, 14.6), s3r = seg(t, 16.0, 17.0);
  return (
    <svg className="frame tall" viewBox="0 0 1000 560" role="img" aria-label="From the DFT to the FFT as equations. The DFT for N samples is X sub k equals the sum of x sub n times e to the minus i 2 pi k n over N. Separate even and odd positions, factor the extra offset out of the odd sum, and name the two half-size sums E sub k and O sub k and the factor W: X sub k equals E sub k plus W to the k over N times O sub k.">
      <M display x="500" y={184 - 122 * mv} textAnchor="middle" fontSize={42 - 12 * mv} w={960} opacity={s0}>{G1}</M>
      <M x="500" y="338" textAnchor="middle" fontSize="24" fill="var(--dim)" w={700} opacity={seg(t, 1.6, 2.4) * (1 - seg(t, 3.6, 4.0))}>{String.raw`$k = 0, 1, \dots, N-1$: that is $N$ rows of $N$ products`}</M>
      <M display x="500" y="196" textAnchor="middle" fontSize="38" w={960} opacity={s1}>{G2}</M>

      <M display x="500" y="86" textAnchor="middle" fontSize="38" w={960} opacity={s2a}>{G3a}</M>
      <M display x="500" y="226" textAnchor="middle" fontSize="38" w={960} opacity={s2b}>{G3b}</M>

      <M display x="500" y="40" textAnchor="middle" fontSize="38" w={960} opacity={s3}>{G4}</M>
      <M display x="500" y="430" textAnchor="middle" fontSize="46" w={960} opacity={s3r}>{G5}</M>

    </svg>
  );
}
