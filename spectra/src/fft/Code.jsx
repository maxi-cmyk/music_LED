import { seg } from '../overview/ease.js';
import { M, TG } from '../math/Tex.jsx';

export const STOPS = [5.0, 11.0, 17.0, 24.0]; // reorder, the passes, the butterfly, this project

const BLUE = '#5cbcff', ORANGE = '#e8a33d', GREEN = '#8fe36a', LIME = '#d9ff52', CMT = '#7fae6c';
const MONO = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
const LY = 112, LH = 24; // first baseline and line height

// the FFT as the ESP32 firmware runs it (firmware/music_LED/src/fourier/FastFourierTransform.cpp): names shortened, complex numbers written as one value.
// g: which move the line belongs to (0 reorder, 1 passes, 2 butterfly)
const CODE = [
  { g: -1, parts: [['// FastFourierTransform.cpp, shortened', CMT]] },
  { g: 0, parts: [['reorder_bit_reversed_samples(spectrum);']] },
  { g: 1, parts: [['for (L = 2; L <= N; L <<= 1) {', null]] },
  { g: 1, parts: [['    step = e^(-2*pi*i / L);', null], ['     // W_L', CMT]] },
  { g: 1, parts: [['    for (start = 0; start < N; start += L)']] },
  { g: 1, parts: [['        combine_subtransforms(spectrum, start, L, step);']] },
  { g: 1, parts: [['}']] },
  { g: -1, parts: [['']] },
  { g: 2, parts: [['twiddle = 1;']] },
  { g: 2, parts: [['for (j = 0; j < L / 2; ++j) {']] },
  { g: 2, parts: [['    even = start + j;   odd = even + L / 2;']] },
  { g: 2, parts: [['    u = spectrum[even];']] },
  { g: 2, parts: [['    rotated = spectrum[odd] * twiddle;', null], ['   // W_L^j * v', CMT]] },
  { g: 2, parts: [['    spectrum[even] = u + rotated;', null], ['         // u + W v', CMT]] },
  { g: 2, parts: [['    spectrum[odd]  = u - rotated;', null], ['         // u - W v', CMT]] },
  { g: 2, parts: [['    twiddle *= step;', null], ['      // next W_L power', CMT]] },
  { g: 2, parts: [['}']] },
];
const GROUP_COLOUR = [ORANGE, BLUE, GREEN];
const GROUP_LINES = [[1, 1], [2, 6], [8, 16]]; // first and last line of each move

export default function Code({ t }) {
  const hl = [seg(t, 0.8, 1.4) * (1 - seg(t, 5.6, 6.2)), seg(t, 6.0, 6.8) * (1 - seg(t, 11.6, 12.2)), seg(t, 12.0, 12.8) * (1 - seg(t, 17.6, 18.2))];
  const code = seg(t, 0.2, 0.8) * (1 - 0.7 * seg(t, 17.8, 18.6));
  const lineOp = (g) => (g < 0 ? 0.45 : 0.32 + 0.68 * hl[g]);
  return (
    <svg className="frame tall" viewBox="0 0 1000 560" role="img" aria-label="The FFT as the ESP32 firmware runs it, in three moves. First reorder the samples by reversing the bits of each index. Then make passes of block length L equals 2, 4, up to N. Inside each block, every pair is a butterfly: the top output is u plus W to the j times v and the bottom output is u minus W to the j times v, written over the inputs. In this project N is 128 samples, 20 milliseconds of sound: 7 passes of 64 butterflies, 448 in all, instead of 16,384 products.">
      <g opacity={code}>
        <rect x="24" y="78" width="570" height={LH * CODE.length + 22} rx="10" fill="#0c0d0b" stroke="var(--dim)" strokeOpacity="0.5" />
        {GROUP_LINES.map(([a, b], g) => (
          <rect key={g} x="34" y={LY + LH * a - 18} width="4" height={LH * (b - a + 1)} rx="2" fill={GROUP_COLOUR[g]} opacity={hl[g]} />
        ))}
        {CODE.map((ln, i) => (
          <text key={i} x="52" y={LY + LH * i} fontFamily={MONO} fontSize="15" style={{ whiteSpace: 'pre' }} opacity={lineOp(ln.g)} xmlSpace="preserve">
            {ln.parts.map(([text, colour], k) => <tspan key={k} fill={colour ?? 'var(--chalk)'}>{text}</tspan>)}
          </text>
        ))}
      </g>

      <TG fill="var(--chalk)" fontSize="22">
        <M x="620" y="124" fill={ORANGE} fontSize="32" opacity={seg(t, 1.2, 2.0) * (1 - seg(t, 5.6, 6.2))}>reorder</M>
        <M x="620" y="168" opacity={seg(t, 2.0, 2.8) * (1 - seg(t, 5.6, 6.2))}>reverse the bits of each index:</M>
        <M x="620" y="212" fontSize="24" opacity={seg(t, 2.8, 3.6) * (1 - seg(t, 5.6, 6.2))}>{String.raw`$1 = 001_2 \to 100_2 = 4$`}</M>
        <M x="620" y="262" fill="var(--dim)" fontSize="20" opacity={seg(t, 3.6, 4.4) * (1 - seg(t, 5.6, 6.2))}>so the pairs to combine end up</M>
        <M x="620" y="288" fill="var(--dim)" fontSize="20" opacity={seg(t, 3.8, 4.6) * (1 - seg(t, 5.6, 6.2))}>{String.raw`side by side: the matrix $P$`}</M>

        <M x="620" y="124" fill={BLUE} fontSize="32" opacity={seg(t, 6.4, 7.2) * (1 - seg(t, 11.6, 12.2))}>passes</M>
        <M x="620" y="168" opacity={seg(t, 7.2, 8.0) * (1 - seg(t, 11.6, 12.2))}>{String.raw`block length $L = 2, 4, \dots, N$`}</M>
        <M x="620" y="212" fontSize="24" opacity={seg(t, 8.0, 8.8) * (1 - seg(t, 11.6, 12.2))}>{String.raw`$W_L = e^{-i2\pi/L}$`}</M>
        <M x="620" y="262" fill="var(--dim)" fontSize="20" opacity={seg(t, 8.8, 9.6) * (1 - seg(t, 11.6, 12.2))}>{String.raw`$\log_2 N$ passes, each one`}</M>
        <M x="620" y="288" fill="var(--dim)" fontSize="20" opacity={seg(t, 9.0, 9.8) * (1 - seg(t, 11.6, 12.2))}>{String.raw`a sparse matrix $A_s$`}</M>

        <M x="620" y="124" fill={GREEN} fontSize="32" opacity={seg(t, 12.4, 13.2) * (1 - seg(t, 17.6, 18.2))}>butterfly</M>
        <M x="620" y="172" fontSize="26" opacity={seg(t, 13.2, 14.0) * (1 - seg(t, 17.6, 18.2))}>{String.raw`$\text{top} = u + W_L^{\,j}\,v$`}</M>
        <M x="620" y="214" fontSize="26" opacity={seg(t, 13.8, 14.6) * (1 - seg(t, 17.6, 18.2))}>{String.raw`$\text{bottom} = u - W_L^{\,j}\,v$`}</M>
        <M x="620" y="264" fill="var(--dim)" fontSize="20" opacity={seg(t, 14.6, 15.4) * (1 - seg(t, 17.6, 18.2))}>{String.raw`this is $E_k \pm W^{k}O_k$`}</M>
        <M x="620" y="290" fill="var(--dim)" fontSize="20" opacity={seg(t, 14.8, 15.6) * (1 - seg(t, 17.6, 18.2))}>from the derivation</M>
        <M x="620" y="332" fill="var(--dim)" fontSize="20" opacity={seg(t, 15.4, 16.2) * (1 - seg(t, 17.6, 18.2))}>the outputs overwrite the inputs:</M>
        <M x="620" y="358" fill="var(--dim)" fontSize="20" opacity={seg(t, 15.6, 16.4) * (1 - seg(t, 17.6, 18.2))}>no extra memory</M>

        <M x="620" y="124" fill={LIME} fontSize="32" opacity={seg(t, 18.4, 19.2)}>in this project</M>
        <M x="620" y="170" opacity={seg(t, 19.2, 20.0)}>{String.raw`$N = 128$ samples, a power of two`}</M>
        <M x="620" y="210" opacity={seg(t, 19.8, 20.6)}>6,400 samples/s: 20 ms of sound</M>
        <M x="620" y="250" opacity={seg(t, 20.4, 21.2)}>{String.raw`7 passes: $L = 2, 4, \dots, 128$`}</M>
        <M x="620" y="302" fill={LIME} fontSize="24" opacity={seg(t, 21.0, 21.8)}>7 × 64 = 448 butterflies</M>
        <M x="620" y="338" fill="var(--dim)" fontSize="21" opacity={seg(t, 21.4, 22.2)}>not 128 × 128 = 16,384 products</M>
        <M x="620" y="388" fill="var(--dim)" fontSize="20" opacity={seg(t, 22.2, 23.0)}>32-bit floats on the ESP32,</M>
        <M x="620" y="414" fill="var(--dim)" fontSize="20" opacity={seg(t, 22.4, 23.2)}>computed in place</M>
      </TG>
    </svg>
  );
}
