import { seg, ham } from '../overview/ease.js';
import { M, TG } from '../math/Tex.jsx';
import { N, TONES, wave, X, W, PAD } from '../overview/Frame.jsx';
import { BANDS, tone, pts } from '../overview/Split.jsx';

export const STOPS = [3.8, 9.6, 16.2, 23.0]; // the frame, the DFT route, the FFT route, both side by side

const ORANGE = '#e8a33d', BLUE = '#5cbcff', LIME = '#d9ff52';
const KMAX = 32, SB = 518, SH = 160; // spectrum: bins 1 to 32 (50 Hz to 1,600 Hz), baseline, tallest bar
const BX = (k) => PAD + (k / KMAX) * (W - 2 * PAD);

// the ESP32's frame, tapered as the firmware does it
const samples = Array.from({ length: N }, (_, i) => { const u = i / (N - 1); return wave(u) * ham(u); });

// route 1, the DFT: one matrix-vector product, X = F x, with F[k][n] = W_N^{kn}: N times N products
const dft = (x) => Array.from({ length: x.length }, (_, k) => {
  let re = 0, im = 0;
  for (let n = 0; n < x.length; n++) { const a = (-2 * Math.PI * ((k * n) % x.length)) / x.length; re += x[n] * Math.cos(a); im += x[n] * Math.sin(a); }
  return [re, im];
});

// route 2, the FFT: reorder with P, then the stages A_1 ... A_log N, each one a sparse matrix applied in place
const rev = (i, bits) => parseInt(i.toString(2).padStart(bits, '0').split('').reverse().join(''), 2);
const fft = (x) => {
  const n = x.length, bits = Math.log2(n);
  let v = Array.from({ length: n }, (_, i) => [x[rev(i, bits)], 0]);
  for (let L = 2; L <= n; L *= 2) {
    const h = L / 2, out = v.map((z) => [...z]);
    for (let b = 0; b < n; b += L) {
      for (let j = 0; j < h; j++) {
        const a = (-2 * Math.PI * j) / L, wr = Math.cos(a), wi = Math.sin(a), [br, bi] = v[b + j + h];
        const tr = wr * br - wi * bi, ti = wr * bi + wi * br; // W_L^j times the odd one
        out[b + j] = [v[b + j][0] + tr, v[b + j][1] + ti];
        out[b + j + h] = [v[b + j][0] - tr, v[b + j][1] - ti];
      }
    }
    v = out;
  }
  return v;
};

const D = dft(samples), F = fft(samples);
const magD = D.map(([re, im]) => Math.hypot(re, im)), magF = F.map(([re, im]) => Math.hypot(re, im));
const MAXM = Math.max(...magD.slice(1, KMAX + 1));
const barH = (m) => (SH * m) / MAXM;
const diff = Math.max(...D.map(([re, im], k) => Math.hypot(re - F[k][0], im - F[k][1])));
export const DIFF_EXP = Math.ceil(Math.log10(Math.max(diff, 1e-300))); // the two answers differ by less than 10^DIFF_EXP
const bandColour = (k) => BANDS.find(([, hi]) => k * 50 <= hi + 25)?.[2] ?? BANDS[2][2];
const COMPONENT_Y = [262, 322, 382, 442];
const CX0 = PAD + 150;
const cpts = (fn) => Array.from({ length: 513 }, (_, i) => `${CX0 + (i / 512) * (W - PAD - CX0)},${fn(i / 512)}`).join(' '); // a tone drawn in the area right of its label
const TOP = 120, AMP = 52;
const fmt = (v) => Math.round(v).toLocaleString('en-US');

export default function Signal({ t }) {
  const frame = seg(t, 0.2, 1.0), comps = seg(t, 1.2, 3.0) * (1 - seg(t, 4.0, 4.6)), names = seg(t, 2.6, 3.4);
  const p1 = seg(t, 4.8, 9.0), ghost = seg(t, 10.2, 10.8), p2 = seg(t, 11.0, 15.4);
  const f1 = seg(t, 4.4, 5.2) * (1 - seg(t, 10.2, 10.8)), f2 = seg(t, 10.6, 11.4) * (1 - seg(t, 16.4, 17.0));
  const match = seg(t, 17.2, 18.6), diffIn = seg(t, 18.4, 19.6), peaks = seg(t, 19.6, 20.6), tint = seg(t, 20.8, 22.0);
  const bars = (k, p) => Math.min(1, Math.max(0, p * 1.5 - (k / KMAX) * 0.5));
  const stage = Math.min(7, Math.max(1, Math.ceil(7 * p2)));
  return (
    <svg className="frame tall" viewBox="0 0 1000 560" role="img" aria-label={`The ESP32's own frame: 128 samples, 20 milliseconds, hiding four tones at 75, 225, 450 and 1100 hertz. The DFT route multiplies the frame by the Fourier matrix, 128 by 128 or 16,384 products. The FFT route reorders the samples and applies seven sparse factors, 448 butterflies. Both give the same spectrum, with a largest difference below 10 to the ${DIFF_EXP}. Each peak is one of the four tones; grouped by band they set the LED colour.`}>
      <g opacity={frame}>
        <line className="axis" x1={PAD} x2={W - PAD} y1={TOP} y2={TOP} />
        <polyline className="wave" points={pts((u) => TOP - AMP * wave(u) * ham(u) / 0.9)} style={{ opacity: 1 - 0.35 * seg(t, 4.4, 5.2) }} />
        <M x={PAD} y="40" fill="var(--dim)" fontSize="20">{'the frame $\\mathbf{x}$: 128 samples, 20 ms'}</M>
      </g>

      <TG opacity={comps}>
        {TONES.map((tn, k) => (
          <g key={k}>
            <line className="axis" x1={CX0} x2={W - PAD} y1={COMPONENT_Y[k]} y2={COMPONENT_Y[k]} opacity="0.5" />
            <polyline className="tone" fill="none" points={cpts((u) => COMPONENT_Y[k] - 30 * tone(tn, u) / 0.45)} />
            <M x={PAD} y={COMPONENT_Y[k] + 7} fontSize="22" fill="var(--chalk)" opacity={names} w={150}>{`${tn[0] * 50} Hz`}</M>
          </g>
        ))}
        <M x={PAD} y="226" fill="var(--dim)" fontSize="20" opacity={names} w={600}>four tones hidden in the frame</M>
      </TG>

      <TG>
        <M x={PAD} y="262" fontSize="26" opacity={f1} w={500}>{'$\\mathbf{X} = \\boldsymbol{F}_{128}\\,\\mathbf{x}$'}</M>
        <M x={W - PAD} y="262" textAnchor="end" fontSize="30" fill={BLUE} opacity={f1} w={420}>{`${fmt(16384 * p1)} products`}</M>
        <M x={PAD} y="262" fontSize="26" opacity={f2} w={560}>{'$\\mathbf{X} = \\boldsymbol{A}_7 \\cdots \\boldsymbol{A}_1\\,\\boldsymbol{P}\\,\\mathbf{x}$'}</M>
        <M x={W - PAD} y="262" textAnchor="end" fontSize="30" fill={ORANGE} opacity={f2} w={520}>{`stage ${stage} of 7: ${fmt(448 * p2)} butterflies`}</M>
        <M x={PAD} y="262" fontSize="26" opacity={match} w={420}>{'$\\mathbf{X}$ from both routes'}</M>
        <M x={W - PAD} y="262" textAnchor="end" fontSize="26" fill="var(--chalk)" opacity={match} w={520}>
          {'16,384 products against 448 butterflies'}
        </M>
        <M x={PAD} y="300" fontSize="24" fill={LIME} opacity={diffIn} w={720}>{`largest difference between the two: below $10^{${DIFF_EXP}}$`}</M>
      </TG>

      <TG>
        <line x1={PAD} x2={W - PAD} y1={SB} y2={SB} stroke="var(--dim)" strokeWidth="1.5" opacity={0.6 * Math.max(f1, ghost)} />
        {Array.from({ length: KMAX }, (_, i) => i + 1).map((k) => {
          const hd = barH(magD[k]) * bars(k, p1), hf = barH(magF[k]) * bars(k, p2);
          const col = tint > 0 ? bandColour(k) : BLUE;
          return (
            <g key={k}>
              <rect x={BX(k) - 7} y={SB - hd} width="14" height={Math.max(0, hd)} fill={col} opacity={0.85} />
              <rect x={BX(k) - 7} y={SB - hf} width="14" height={Math.max(0, hf)} fill="none" stroke={ORANGE} strokeWidth="2.5" opacity={ghost} />
            </g>
          );
        })}
        {[0, 10, 20, 30].map((k) => <M key={k} x={BX(k)} y={SB + 28} textAnchor="middle" fill="var(--dim)" fontSize="18" opacity={Math.max(f1, ghost)}>{`${k * 50} Hz`}</M>)}
        {TONES.map(([cycles], i) => (
          <M key={i} x={BX(cycles)} y={SB - barH(magD[Math.round(cycles)]) - 14} textAnchor="middle" fill="var(--chalk)" fontSize="19" opacity={peaks} w={120}>{`${cycles * 50} Hz`}</M>
        ))}
        <g opacity={tint}>
          {BANDS.map(([name, , c], i) => <M key={name} x={W - PAD - 130 * (2 - i)} y="40" textAnchor="end" fill={c} fontSize="20" w={120}>{name}</M>)}
        </g>
      </TG>
    </svg>
  );
}
