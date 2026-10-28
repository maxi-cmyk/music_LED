import { useState } from 'react';
import { M, TG, Rich } from '../math/Tex.jsx';

export const STOPS = [0];
const BLUE = '#5cbcff', ORANGE = '#e8a33d', BAR = 520, BX = 330;

// slide the sample count: the direct method's products grow with N x N, the FFT's butterflies with N/2 x log2 N
export default function Compare() {
  const [p, setP] = useState(7);
  const n = 2 ** p, direct = n * n, fast = (n / 2) * p, ratio = direct / fast;
  const fw = Math.max(3, BAR * fast / direct);
  return (
    <div className="frame trace">
      <svg viewBox="0 0 1000 380" role="img" aria-label={`For ${n} samples the direct method needs ${direct.toLocaleString('en-US')} products and the FFT needs ${fast.toLocaleString('en-US')} butterflies`}>
        <M x={BX - 22} y="92" textAnchor="end" fill={BLUE} fontSize="34">Direct</M>
        <M x={BX - 22} y="128" textAnchor="end" fill="var(--dim)" fontSize="24">{'$N \\times N$ products'}</M>
        <rect x={BX} y="52" width={BAR} height="96" fill={BLUE} opacity="0.85" />
        <M x={BX + BAR + 18} y="116" fill="var(--chalk)" fontSize="44">{direct.toLocaleString('en-US')}</M>
        <M x={BX - 22} y="256" textAnchor="end" fill={ORANGE} fontSize="34">FFT</M>
        <M x={BX - 22} y="292" textAnchor="end" fill="var(--dim)" fontSize="24">{'$\\tfrac{N}{2}\\log_2 N$ butterflies'}</M>
        <rect x={BX} y="216" width={fw} height="96" fill={ORANGE} opacity="0.9" />
        <M x={BX + fw + 18} y="280" fill="var(--chalk)" fontSize="44">{fast.toLocaleString('en-US')}</M>
      </svg>
      <p className="trace-note" style={{ textAlign: 'left' }}>
        <Rich>{`About ${Math.round(ratio)}$\\times$ fewer operations at $N = ${n}$. A product and a butterfly are different amounts of work, so this counts operations; it is not a stopwatch time.`}</Rich>
      </p>
      <div className="trace-controls">
        <label>
          <span><Rich>{'Number of samples $N =$ '}</Rich><b><Rich>{n}</Rich></b>{n === 128 ? ' · what the ESP32 uses' : ''}</span>
          <input type="range" min="2" max="9" step="1" value={p} onChange={(e) => setP(+e.target.value)} aria-label="Number of samples, as a power of two" />
        </label>
      </div>
    </div>
  );
}
