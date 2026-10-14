import { useEffect, useRef, useState } from 'react';
import start from './draw.js';

export default function Epicycles() {
  const ref = useRef(null);
  const scene = useRef(null);
  const [mic, setMic] = useState(false);
  useEffect(() => {
    scene.current = start(ref.current);
    return () => scene.current.stop();
  }, []);
  return (
    <div id="epicycles" ref={ref}>
      <button
        className={mic ? 'live' : ''}
        aria-label={mic ? 'Stop microphone' : 'Use microphone'}
        aria-pressed={mic}
        onClick={() => {
          if (mic) { scene.current.disableMic(); setMic(false); }
          else scene.current.enableMic().then(() => setMic(true)).catch(console.error);
        }}
      >
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
          {mic ? null : <path d="M3 3l18 18" />}
        </svg>
      </button>
    </div>
  );
}
