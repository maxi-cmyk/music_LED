import { useEffect, useRef, useState } from 'react';
import start from './draw.js';

export default function Epicycles() {
  const ref = useRef(null);
  const scene = useRef(null);
  const [{ status, message }, setMicState] = useState({ status: 'off', message: '' });
  const mic = status === 'live';
  const pending = status === 'pending';
  useEffect(() => {
    let mounted = true;
    scene.current = start(ref.current, (status, message) => {
      if (mounted) setMicState((previous) => previous.status === status && previous.message === message
        ? previous : { status, message });
    });
    return () => { mounted = false; scene.current.stop(); };
  }, []);
  return (
    <div id="epicycles" ref={ref}>
      <button
        className={mic ? 'live' : ''}
        aria-label={mic || pending ? 'Stop microphone' : 'Use microphone'}
        aria-describedby={message ? 'mic-status' : undefined}
        aria-busy={pending}
        aria-pressed={mic}
        onClick={() => {
          if (mic || pending) {
            scene.current.disableMic();
            setMicState({ status: 'off', message: '' });
          } else void scene.current.enableMic();
        }}
      >
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
          {mic ? null : <path d="M3 3l18 18" />}
        </svg>
      </button>
      <p id="mic-status" className="mic-status" role="status">{message}</p>
    </div>
  );
}
