import { seg } from '../overview/ease.js';
import { M, TG } from '../math/Tex.jsx';

export const STOPS = [2.4, 5.0, 9.4, 14.0]; // the index in bits, the bits reversed, every sample moved, N = 128

const LIME = '#d9ff52', BLUE = '#5cbcff', ORANGE = '#e8a33d', GREEN = '#8fe36a';
const BIT = [ORANGE, BLUE, GREEN]; // b0, b1, b2
const N = 8, M_BITS = 3; // the picture shows N = 8; the rules on the right are for any N = 2^m
const Y = (r) => 92 + r * 50;
const rev = (i) => parseInt(i.toString(2).padStart(M_BITS, '0').split('').reverse().join(''), 2);
const lerp = (a, b, k) => a + (b - a) * k;
const bits = (i) => i.toString(2).padStart(M_BITS, '0').split('').map(Number); // [b2, b1, b0]
const tc = (colour, s) => `\\textcolor{${colour}}{${s}}`;
const pow = (i) => { const [b2, b1, b0] = bits(i); return `${tc(GREEN, b2)}\\,${tc(BLUE, b1)}\\,${tc(ORANGE, b0)}`; };
const rpow = (i) => { const [b2, b1, b0] = bits(i); return `${tc(ORANGE, b0)}\\,${tc(BLUE, b1)}\\,${tc(GREEN, b2)}`; };

// reordering the samples for an FFT of any size N = 2^m: write each index in bits, read them backwards, and the sample goes to that position
export default function BitRev({ t }) {
  const tab = seg(t, 0.2, 0.9), revCol = seg(t, 2.8, 3.6), move = seg(t, 5.4, 8.0), slots = seg(t, 5.0, 5.8), groups = seg(t, 8.0, 8.8);
  const toSmall = seg(t, 9.8, 10.4); // the N = 8 picture steps back when N = 128 comes in
  const outR = seg(t, 9.8, 10.4);
  return (
    <svg className="frame tall" viewBox="0 0 1000 560" role="img" aria-label="Bit reversal for N equals 2 to the m samples. Write each index n in m bits, b sub m minus 1 down to b sub 0, and read them backwards. Sample x sub n goes to position rev of n. Drawn for N equals 8: 0, 1, 2, 3, 4, 5, 6, 7 become 0, 4, 2, 6, 1, 5, 3, 7. The lowest bit, which decides even or odd, becomes the top bit of the position, so evens come first and odds second, and each half is split again by the next bit. For this project N is 128, 7 bits: 1 goes to 64 and 6 goes to 48.">
      <TG opacity={tab * (1 - 0.75 * toSmall)}>
        <M x="84" y="52" fill="var(--dim)" fontSize="20">sample</M>
        <M x="196" y="52" fill="var(--dim)" fontSize="20" textAnchor="middle" w={140}>{'$n$ in bits'}</M>
        <M x="350" y="52" fill="var(--dim)" fontSize="20" textAnchor="middle" w={160} opacity={revCol}>{'bits reversed'}</M>
        <M x="22" y="52" fill="var(--dim)" fontSize="18" opacity={slots}>pos.</M>

        {Array.from({ length: N }, (_, r) => <M key={`s${r}`} x="34" y={Y(r) + 8} fill="var(--dim)" fontSize="22" opacity={slots}>{`$${r}$`}</M>)}
        <line x1="62" x2="62" y1={Y(0) - 26} y2={Y(N - 1) + 18} stroke="var(--dim)" strokeWidth="1.5" opacity={0.5 * slots} />
        {Array.from({ length: N }, (_, i) => {
          const y = lerp(Y(i), Y(rev(i)), move);
          return (
            <TG key={i}>
              <M x="84" y={y + 9} fontSize="26">{`$x_{${i}}$`}</M>
              <M x="196" y={y + 9} fontSize="26" textAnchor="middle" w={140}>{`$${pow(i)}$`}</M>
              <M x="268" y={y + 9} fontSize="26" opacity={revCol}>{'$\\to$'}</M>
              <M x="350" y={y + 9} fontSize="26" textAnchor="middle" w={140} opacity={revCol}>{`$${rpow(i)}$`}</M>
              <M x="425" y={y + 9} fontSize="26" opacity={revCol}>{`$=${rev(i)}$`}</M>
            </TG>
          );
        })}
        <g opacity={groups}>
          <line x1="70" x2="500" y1={(Y(3) + Y(4)) / 2} y2={(Y(3) + Y(4)) / 2} stroke="var(--chalk)" strokeWidth="2" opacity="0.7" />
          <line x1="70" x2="500" y1={(Y(1) + Y(2)) / 2} y2={(Y(1) + Y(2)) / 2} stroke="var(--dim)" strokeWidth="1.5" strokeDasharray="5 6" />
          <line x1="70" x2="500" y1={(Y(5) + Y(6)) / 2} y2={(Y(5) + Y(6)) / 2} stroke="var(--dim)" strokeWidth="1.5" strokeDasharray="5 6" />
          <M x="505" y={(Y(0) + Y(3)) / 2 - 4} fill={ORANGE} fontSize="22">{'$b_0=0$'}</M>
          <M x="505" y={(Y(0) + Y(3)) / 2 + 22} fill={ORANGE} fontSize="20">even</M>
          <M x="505" y={(Y(4) + Y(7)) / 2 - 4} fill={ORANGE} fontSize="22">{'$b_0=1$'}</M>
          <M x="505" y={(Y(4) + Y(7)) / 2 + 22} fill={ORANGE} fontSize="20">odd</M>
        </g>
      </TG>

      <TG fill="var(--chalk)" fontSize="22">
        <M x="640" y="70" fontSize="30" opacity={seg(t, 0.5, 1.2) * (1 - outR)} w={340}>{'$N = 2^m$ samples'}</M>
        <M x="640" y="110" fill="var(--dim)" fontSize="20" opacity={seg(t, 0.8, 1.5) * (1 - outR)} w={340}>{'$m = \\log_2 N$ bits per index'}</M>
        <M x="640" y="172" fontSize="30" opacity={seg(t, 1.2, 2.0) * (1 - outR)} w={340}>{`$n = (${tc(GREEN, 'b_{m-1}')}\\dots ${tc(BLUE, 'b_1')}\\,${tc(ORANGE, 'b_0')})_2$`}</M>
        <M x="640" y="230" fill="var(--dim)" fontSize="20" opacity={seg(t, 1.6, 2.2) * (1 - outR)} w={340}>{'here $N = 8$, $m = 3$'}</M>

        <M x="640" y="296" fontSize="30" opacity={seg(t, 3.2, 4.0) * (1 - outR)} w={340}>{`$\\mathrm{rev}(n) = (${tc(ORANGE, 'b_0')}\\,${tc(BLUE, 'b_1')}\\dots ${tc(GREEN, 'b_{m-1}')})_2$`}</M>
        <M x="640" y="352" fontSize="26" opacity={seg(t, 4.0, 4.8) * (1 - outR)} w={340}>{'$= \\sum_{j=0}^{m-1} b_j\\,2^{\\,m-1-j}$'}</M>

        <M x="640" y="414" fill={LIME} fontSize="28" opacity={seg(t, 7.6, 8.4) * (1 - outR)} w={340}>{'$x_n$ goes to position $\\mathrm{rev}(n)$'}</M>
        <M x="640" y="452" fill="var(--dim)" fontSize="20" opacity={seg(t, 8.3, 9.0) * (1 - outR)} w={340}>{'$b_0$ picks the half, $b_1$ the quarter, …'}</M>

        <M x="640" y="70" fill={LIME} fontSize="30" opacity={seg(t, 10.4, 11.2)} w={340}>{'$N = 128 \\Rightarrow m = 7$'}</M>
        <M x="640" y="136" fontSize="26" opacity={seg(t, 11.2, 12.0)} w={350}>{'$1 = 0000001_2$'}</M>
        <M x="660" y="178" fontSize="26" opacity={seg(t, 11.4, 12.2)} w={330}>{'$\\to\\; 1000000_2 = 64$'}</M>
        <M x="640" y="248" fontSize="26" opacity={seg(t, 12.0, 12.8)} w={350}>{'$6 = 0000110_2$'}</M>
        <M x="660" y="290" fontSize="26" opacity={seg(t, 12.2, 13.0)} w={330}>{'$\\to\\; 0110000_2 = 48$'}</M>
        <M x="640" y="364" fill="var(--dim)" fontSize="20" opacity={seg(t, 12.8, 13.6)} w={340}>{'$\\mathrm{rev}(\\mathrm{rev}(n)) = n$, so the firmware'}</M>
        <M x="640" y="390" fill="var(--dim)" fontSize="20" opacity={seg(t, 13.0, 13.8)} w={340}>{'swaps $x_n$ and $x_{\\mathrm{rev}(n)}$ once, in place'}</M>
      </TG>
    </svg>
  );
}
