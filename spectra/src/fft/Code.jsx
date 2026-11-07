import { seg } from '../overview/ease.js';
import { M, TG } from '../math/Tex.jsx';

export const STOPS = [1.4, 4.6, 7, 10.2]; // the whole function, into reorder, into apply, into combine

const BLUE = '#5cbcff', ORANGE = '#e8a33d', GREEN = '#8fe36a', CMT = '#7fae6c';
const MONO = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
const LH = 26, PAD = 14, W = 560, TOP = 84, BASE = 1.15, E = 1.12, CX = 360; // line height, padding, box width, top edge, the zoom of the whole function, of a function being read, and where it sits
const lerp = (a, b, k) => a + (b - a) * k;
const K = (text) => [text, CMT]; // a comment

// FastFourierTransform.cpp, shortened: names shortened, complex numbers written as one value. Each function is a box of lines; `call` marks the lines that call the next function
const MAIN = { call: [7, 8], lines: [
  [K('// FastFourierTransform.cpp, shortened')],
  [['bool compute_fast_fourier_transform(samples, spectrum) {']],
  [['  N = samples.count;']],
  [['  if (!is_power_of_two(N)) return false;']],
  [['  for (i = 0; i < N; ++i) {']],
  [['    spectrum.real[i] = samples.amplitude[i];']],
  [['    spectrum.imag[i] = 0;  }']],
  [['  reorder_bit_reversed_samples(spectrum);']],
  [['  apply_fft_stages(spectrum);']],
  [['  return true;']],
  [['}']],
] };
const REORDER = { lines: [
  [['void reorder_bit_reversed_samples(spectrum) {']],
  [['  j = 0;'], K('                     // j will be rev(i)')],
  [['  for (i = 1; i < N; ++i) {']],
  [['    bit = N >> 1;']],
  [['    while (j & bit) { j ^= bit; bit >>= 1; }']],
  [['    j ^= bit;'], K('                // j is now rev(i)')],
  [['    if (i < j) swap(spectrum[i], spectrum[j]);']],
  [['  }']],
  [['}']],
] };
const APPLY = { call: [4], lines: [
  [['void apply_fft_stages(spectrum) {']],
  [['  for (L = 2; L <= N; L <<= 1) {']],
  [['    step = e^(-2*pi*i / L);'], K('    // W_L')],
  [['    for (start = 0; start < N; start += L)']],
  [['      combine_subtransforms(spectrum, start, L, step);']],
  [['  }']],
  [['}']],
] };
const COMBINE = { lines: [
  [['void combine_subtransforms(spectrum, start, L, step) {']],
  [['  twiddle = 1;']],
  [['  for (j = 0; j < L / 2; ++j) {']],
  [['    even = start + j;  odd = even + L / 2;']],
  [['    u = spectrum[even];']],
  [['    rotated = spectrum[odd] * twiddle;'], K('  // W_L^j v')],
  [['    spectrum[even] = u + rotated;'], K('   // u + W v')],
  [['    spectrum[odd]  = u - rotated;'], K('   // u - W v')],
  [['    twiddle *= step;'], K('  // next W_L power')],
  [['  }']],
  [['}']],
] };
const heightOf = (fn) => fn.lines.length * LH + 2 * PAD;

// one function as a box of code, placed with translate and scale. `dim` softens every line but the highlighted one
function Func({ fn, x, y, s, opacity = 1, hot = -1, hotAmount = 0, colour = ORANGE, dim = 0 }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} opacity={opacity}>
      <rect width={W} height={heightOf(fn)} rx="12" fill="#0c0d0b" stroke="var(--dim)" strokeOpacity="0.5" strokeWidth={1.5 / s} />
      {hot >= 0 && <rect x="8" y={PAD + LH * hot - 2} width={W - 16} height={LH} rx="5" fill={colour} fillOpacity={0.28 * hotAmount} stroke={colour} strokeOpacity={hotAmount} strokeWidth={1.5 / s} />}
      {fn.lines.map((parts, i) => (
        <text key={i} x="22" y={PAD + LH * i + 19} fontFamily={MONO} fontSize="15.4" style={{ whiteSpace: 'pre' }} opacity={i === hot ? 1 : 1 - 0.55 * dim} xmlSpace="preserve">
          {parts.map(([text, c], k) => <tspan key={k} fill={c ?? 'var(--chalk)'}>{text}</tspan>)}
        </text>
      ))}
    </g>
  );
}

// where we are in the calls: compute_fast_fourier_transform > apply_fft_stages > combine_subtransforms
function Crumbs({ items, opacity }) {
  return (
    <text x={CX} y={TOP - 14} fontFamily={MONO} fontSize="13" opacity={opacity} xmlSpace="preserve" style={{ whiteSpace: 'pre' }}>
      {items.map(([name, colour, lit], i) => (
        <tspan key={name}>
          {i > 0 && <tspan fill="var(--dim)">{'  >  '}</tspan>}
          <tspan fill={lit ? colour : 'var(--dim)'}>{name}</tspan>
        </tspan>
      ))}
    </text>
  );
}

export default function Code({ t }) {
  const zin = seg(t, 1.4, 2.6), sw1 = seg(t, 4.6, 5.4), pre2 = seg(t, 7, 7.4), sw2 = seg(t, 7.4, 8.2);
  const intro = seg(t, 0.2, 1);
  const reOp = zin * (1 - sw1), apOp = sw1 * (1 - sw2), coOp = sw2; // the pane on the right changes: reorder, then apply, then combine
  const sMain = BASE * (1 - 0.5 * zin); // the whole function zooms out by half once, when the first call is read
  const mainHot = sw1 > 0.5 ? MAIN.call[1] : MAIN.call[0];
  const mainAmount = sw1 > 0.5 ? Math.max(sw1 * 2 - 1, 0.0) * (1 - 0) : zin * (1 - sw1 * 2);
  const note = (a, b, c, d) => seg(t, a, b) * (1 - seg(t, c, d));
  return (
    <svg className="frame tall" viewBox="0 0 1000 560" role="img" aria-label="The FFT as the ESP32 firmware runs it, traced through its calls. The whole function copies the samples into the spectrum arrays, then calls reorder_bit_reversed_samples and apply_fft_stages. Stepping into reorder_bit_reversed_samples: j counts up as the bit-reversed index and sample i is swapped with sample j once, which is the matrix P. Stepping into apply_fft_stages: it makes passes of block length L equals 2, 4, up to N, each pass a matrix A sub s, and calls combine_subtransforms on each block. Stepping into combine_subtransforms: the butterflies, top output u plus W to the j times v and bottom output u minus W to the j times v, written over the inputs, a block of B sub L.">
      <g opacity={intro}>
        <Func fn={MAIN} x={24} y={TOP} s={sMain} dim={zin} hot={zin > 0 ? mainHot : -1} hotAmount={mainAmount} colour={sw1 > 0.5 ? BLUE : ORANGE} />
      </g>

      <Crumbs opacity={zin} items={[
        ['compute_fast_fourier_transform', 'var(--chalk)', false],
        ...(reOp > 0.01 && sw1 < 0.5 ? [['reorder_bit_reversed_samples', ORANGE, true]] : []),
        ...(sw1 >= 0.5 ? [['apply_fft_stages', BLUE, sw2 < 0.5]] : []),
        ...(sw2 >= 0.5 ? [['combine_subtransforms', GREEN, true]] : []),
      ]} />

      {reOp > 0 && <Func fn={REORDER} x={CX} y={TOP} s={lerp(0.92 * E, E, zin)} opacity={reOp} hot={6} hotAmount={seg(t, 2.8, 3.6)} colour={ORANGE} />}
      {apOp > 0 && <Func fn={APPLY} x={CX} y={TOP} s={lerp(0.92 * E, E, sw1)} opacity={apOp} hot={APPLY.call[0]} hotAmount={pre2 * (1 - sw2)} colour={GREEN} />}
      {coOp > 0 && <Func fn={COMBINE} x={CX} y={TOP} s={lerp(0.92 * E, 1.08, sw2)} opacity={coOp} hot={7} hotAmount={seg(t, 8.8, 9.6)} colour={GREEN} />}

      <TG fill="var(--chalk)">
        <M x={CX} y="420" fontSize="22" opacity={note(3.2, 4, 4.6, 5)} w={620}>{'swaps $i$ with $j = \\mathrm{rev}(i)$ once: the matrix $\\boldsymbol{P}$'}</M>
        <M x={CX} y="372" fontSize="22" opacity={note(5.8, 6.6, 7.4, 7.8)} w={620}>{'$\\log_2 N$ passes, each one a matrix $\\boldsymbol{A}_s$'}</M>
        <M x={CX} y="468" fontSize="22" opacity={seg(t, 9, 9.8)} w={620}>{'$u \\pm W_L^{j}v$: a block $\\boldsymbol{B}_L$ of $\\boldsymbol{A}_s$'}</M>
      </TG>
    </svg>
  );
}
