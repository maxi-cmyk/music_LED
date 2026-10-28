import { useEffect, useRef, useState } from 'react';
import start from './circuit.js';
import { Rich } from '../math/Tex.jsx';

// one plain sentence per part: what it does in this project
const INFO = {
  'mic-capsule': ['Microphone', 'Turns the air pressure from the music into a tiny wobbling voltage.'],
  'mic-board': ['Sound sensor board (KY-037)', 'Boosts that tiny voltage so the ESP32 can read it.'],
  'wire-3v3': ['Power wire (3.3 V)', 'Powers the microphone board from the ESP32.'],
  'wire-a0': ['Sound wire', 'Carries the microphone voltage to pin GPIO 4, which measures it 6,400 times a second.'],
  'wire-gnd-mic': ['Ground wire', 'Gives the microphone board its 0 V return path.'],
  'wire-gnd-led': ['Ground wire', 'Gives the LED its 0 V return path, so current can flow through it.'],
  'wire-gnd-esp': ['Ground jumper', 'Ties the ESP32 ground to the rail that the microphone and LED share.'],
  'wire-r': ['Red wire (GPIO 19)', 'Sends the bass strength to the red LED as a brightness.'],
  'wire-g': ['Green wire (GPIO 18)', 'Sends the mids strength to the green LED as a brightness.'],
  'wire-b': ['Blue wire (GPIO 5)', 'Sends the treble strength to the blue LED as a brightness.'],
  'esp-chip': ['ESP32 processor', 'Takes 128 readings per frame, runs the FFT, and works out how strong bass, mids and treble are.'],
  'esp-board': ['ESP32 board', 'Carries the processor and the pins that everything else plugs into.'],
  rgb: ['RGB LED module (HW-479)', 'Holds red, green and blue LEDs in one bulb, so their three brightnesses blend into one colour.'],
  breadboard: ['Breadboard', 'A plug-in board that holds the ESP32 and joins the wires without soldering.'],
};

export const STOPS = [0, 1, 2, 3, 4]; // the clock t is the stop number: the camera glides between stops as t moves

// the circuit as the last page of the Hardware demo: the camera visits the microphone, the ESP32 and the LED, pulls back to the whole circuit, then the viewer can turn it freely
export default function Circuit({ t }) {
  const host = useRef(null);
  const scene = useRef(null);
  const [hover, setHover] = useState(null);
  const [pinned, setPinned] = useState(null); // a clicked part keeps its note on screen
  useEffect(() => {
    scene.current = start(host.current, (id, x, y) => setHover(id ? { id, x, y } : null), (id, x, y) => setPinned(id ? { id, x, y } : null));
    const onKey = (e) => { if (e.key === 'Escape') { scene.current.select(null); setPinned(null); } };
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('keydown', onKey); scene.current.stop(); };
  }, []);
  useEffect(() => { scene.current?.setClock(t); }, [t]);
  const shown = hover ?? pinned, info = shown && INFO[shown.id];
  return (
    <div className="circuit">
      <div className="stage" ref={host} />
      {info && (
        <div className="tip" style={{ transform: `translate(min(${shown.x + 18}px, calc(100vw - 22rem)), ${shown.y + 18}px)` }}>
          <Rich as="strong">{info[0]}</Rich>
          <Rich>{info[1]}</Rich>
        </div>
      )}
    </div>
  );
}
