import { useEffect, useRef, useState } from 'react';
import { useWheel } from '@use-gesture/react';
import { animated, useSpring } from '@react-spring/web';
import { Rich } from '../math/Tex.jsx';
import Frame, { STOPS as S1 } from './Frame.jsx';
import Clean, { STOPS as S2 } from './Clean.jsx';
import Split, { STOPS as S3 } from './Split.jsx';
import Light, { STOPS as S4 } from './Light.jsx';
import Mixer, { STOPS as S5 } from './Mixer.jsx';
import Circuit, { STOPS as S6 } from '../hardware/Circuit.jsx';

// text[k] appears as soon as the page starts moving to stop k, so the words change together with the picture
const SPLIT = 'The cleaned frame is split into pure tones of different pitch, much like how colors can be split into red, green and blue. This split is the Fourier transform.';

const TAPER = "Then it is faded at the edges so that sharp cut-offs don't smear the result.";

const OVERVIEW = [
  { name: 'Frames', title: 'Sampling the sound', labels: ['Snapshots', 'One frame'], View: Frame, stops: S1, speed: 1.4, why: ['Why 6,400? The ESP32 reads its microphone that fast. Half of it, 3,200 Hz, is the highest pitch it can catch.', 'Why 128? 20 ms is short enough to follow music, and each slot comes out 50 Hz wide (6,400 ÷ 128).'], text: [
    'The microphone takes 6,400 snapshots every second. Each point records the amplitude for the soundwave.',
    '128 in a row make 1 frame.',
  ] },
  { name: 'Cleaning', title: 'Preparing each frame', labels: ['Centre on zero', 'Fade the edges'], View: Clean, stops: S2, fresh: true, speed: 1.4, why: ['The microphone rests at a middle voltage. Left in, that constant offset would swamp everything else.', 'Sharp cut-offs smear one tone across many pitches. The fade (a Hamming window) reduces that.'], text: [
    'Each frame is cleaned first. It is shifted to be centred around zero.',
    TAPER,
  ] },
  { name: 'Splitting', title: 'The Fourier transform: splitting into pitches', labels: ['Split into tones', 'Group by pitch', 'Add up each band'], View: Split, stops: S3, fresh: true, speed: 1.4, why: ['Bin 0 is just the average level, and the code ignores everything above bin 50 (2,500 Hz).'], text: [
    SPLIT,
    'The tones are then grouped by pitch into bass, mids and treble.',
    'Add up the strength in each band.',
  ] },
  { name: 'Brightness', title: 'From band strength to brightness', labels: ['Strength to colour', 'Noise floor', 'Scale to 0–255', 'Mix the channels'], View: Light, stops: S4, speed: 1.4, why: [undefined, 'A pitch between two slots, like 225 Hz, spills into its neighbours. Cutting weak channels stops that tinting the LED.', 'The factor 0.12 was tuned by hand for the demo speaker volume.'], text: [
    "Each band's strength sets how bright its colour channel is: bass for red, mids for green, treble for blue.",
    'Pure tones can still bleed into adjacent frequencies. For example, a perfect bass tone can produce faint mids and trebles. To fix this, any color channel with less than 15% of the main signal is cut off.',
    'The rest is scaled to a brightness from 0 to 255.',
    'The three channels mix in the eye, so bass and mids together look yellow, and all three look white.',
  ] },
  { name: 'Colour', title: 'Mixing the colour', labels: ['Live LED colour'], View: Mixer, stops: S5, fresh: true, speed: 1.4, text: [
    'Bass, mids and treble set the red, green and blue of the LED. As the music changes, the bars change, and so does the colour.',
  ] },
  { name: 'Circuit', title: 'The hardware', labels: ['The circuit', 'Microphone', 'ESP32', 'RGB LED', 'Whole circuit'], View: Circuit, stops: S6, speed: 0.8, text: [
    'Here is the same pipeline as hardware: sound in, analysis, colour out.',
    'The microphone turns sound into a voltage, which the ESP32 reads 6,400 times a second.',
    'The ESP32 cleans each frame, splits it into pitches, and works out the three brightnesses.',
    'Three wires carry them to the LED.',
    'Sound in, light out. Turn the circuit, and click any part to see what it does.',
  ] },
];
const holdFor = (caption) => 800 + 18 * caption.length; // autoplay waits long enough to read the caption (ms, at 1x)
// a page may add a fixed pause (seconds, the same at every speed) after a stop: pause[i] for stop i
const BASE = 0.7; // the pace that counts as 1x
const RATES = [1, 1.5, 2]; // playback speeds the viewer can cycle through

export default function Overview({ onHome, next, pages: PAGES = OVERVIEW }) { // pages: the same player also runs the Fourier page
  // p: page index, i: stop being moved to, t: seconds into the page's animation, rest: when t last reached a stop
  const s = useRef({ p: 0, i: 0, t: 0, rest: performance.now(), auto: true, rate: RATES[0], reading: false }); // i: stop being moved to
  const [view, setView] = useState({ p: 0, t: 0, shown: 0, end: false });
  const [auto, setAuto] = useState(true); // plays on its own; pause stops it
  const [rate, setRate] = useState(RATES[0]);
  const [open, setOpen] = useState(false); // showing the page's "why?" note in place of the caption
  const nav = useRef();

  useEffect(() => {
    const st = s.current;
    const stops = () => PAGES[st.p].stops;
    const settle = () => { st.t = stops()[st.i]; st.segTo = null; };
    const draw = () => setView({ p: st.p, t: st.t, shown: st.i, end: st.p === PAGES.length - 1 && st.t === stops().at(-1) });
    const next = () => {
      st.rest = performance.now();
      const at = stops();
      if (st.t !== at[st.i]) {
        if (st.t > at[st.i]) st.i = Math.min(st.i + 1, at.length - 1); // moving back: head forward again
        else settle(); // moving forward: finish the move
      } else if (st.i < at.length - 1) st.i++;
      else if (st.p < PAGES.length - 1) { st.p++; st.i = 0; if (PAGES[st.p].fresh) st.t = 0; else settle(); } // a fresh page plays its opening animation from t=0 // next page starts where this one ends
      draw();
    };
    const prev = () => {
      st.rest = performance.now();
      const at = stops();
      if (st.t !== at[st.i]) {
        if (st.t < at[st.i]) st.i--; // moving forward: head back to where it started
        else settle(); // moving back: finish the move
      } else if (st.i > 0) st.i--;
      else if (st.p > 0) { st.p--; st.i = stops().length - 1; settle(); } // back to where the previous page ended
      draw();
    };
    const onKey = (e) => {
      if (e.target.closest?.('input')) return; // a focused slider keeps its own arrow keys
      if (e.key === 'ArrowRight') next();
      if (e.key === 'ArrowLeft') prev();
    };
    window.addEventListener('keydown', onKey);
    s.current.next = next; s.current.prev = prev; // the Previous / Next slide buttons
    s.current.jump = (p, i) => { st.p = p; st.i = i; settle(); st.rest = performance.now(); draw(); }; // rail click: go straight to stop i of page p

    let raf, last = performance.now();
    const tick = (now) => {
      const dt = (now - last) / 1000;
      last = now;
      const target = stops()[st.i];
      if (st.t !== target) {
        if (st.segTo !== target) { st.segFrom = st.t; st.segTo = target; } // a new move: remember where it began
        const dir = Math.sign(target - st.t);
        const run = Math.min(1, Math.max(0, (st.t - st.segFrom) / (target - st.segFrom)));
        const ease = 1.34 * (0.3 + 0.7 * Math.sin(Math.PI * run)); // eases in and out of each move; averages to 1 so the pace is unchanged
        st.t += dir * dt * (PAGES[st.p].speed ?? 1) * st.rate * BASE * ease; // a page may ask for its own pace (speed), on top of the viewer's
        if (Math.sign(target - st.t) !== dir) { settle(); st.rest = now; }
        draw();
      } else if (st.auto && !st.reading && !PAGES[st.p].hold && now - st.rest > holdFor(PAGES[st.p].text[st.i]) / (st.rate * BASE) + 1000 * (PAGES[st.p].pause?.[st.i] ?? 0) && !(st.p === PAGES.length - 1 && st.i === stops().length - 1)) next(); // pages with controls (hold) wait for the viewer; an open "why?" note is being read
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { window.removeEventListener('keydown', onKey); cancelAnimationFrame(raf); };
  }, []);

  // y = how far the list is scrolled (px). use-gesture normalises the wheel into deltas; the position is hard-clamped LIMIT px past each end;
  // the part past the end is shown through Apple's rubber-band curve (so it can never stretch more than ~D px), and react-spring
  // springs y back inside the bounds 30ms after the last wheel event, or on a step change.
  const [{ y }, api] = useSpring(() => ({ y: 0 }));
  const max = () => nav.current.firstChild.offsetHeight; // the rail's padding makes the scroll range exactly the list's height
  const clamp = (v) => Math.min(Math.max(v, 0), max());
  const settle = { tension: 200, friction: 25 };
  const LIMIT = 200, D = 100, C = 0.55; // raw px allowed past an end; stretch asymptote; Apple's constant
  const rb = (e) => (1 - 1 / ((e * C) / D + 1)) * D;
  const rbInv = (r) => (D / C) * (r / (D - r));
  const show = (raw) => (raw < 0 ? -rb(-raw) : raw > max() ? max() + rb(raw - max()) : raw);
  const unshow = (v) => (v < 0 ? -rbInv(Math.min(-v, D - 1)) : v > max() ? max() + rbInv(Math.min(v - max(), D - 1)) : v);
  const release = useRef(0), locked = useRef(0); // locked: +1/-1 = sprang back from the top/bottom limit; ignore pushing further that way
  useWheel(({ delta: [, dy], last }) => {
    if (last) return; // use-gesture's own "wheel ended" call lands ~180ms after the last tick: it would freeze a recentre already under way
    clearTimeout(release.current);
    release.current = setTimeout(() => { locked.current = 0; api.start({ y: clamp(y.get()), config: settle }); }, 30); // let go short of the limit
    if (locked.current && Math.sign(dy) === locked.current) return; // still pushing the way we were just stopped
    locked.current = 0;
    const raw = unshow(y.get()) + dy; // continue from wherever the list is now
    if (raw <= -LIMIT || raw >= max() + LIMIT) { // pulled too far: snap back right now
      locked.current = Math.sign(dy);
      api.start({ y: clamp(raw), config: settle });
    } else api.start({ y: show(raw), immediate: true });
  }, { target: nav, eventOptions: { passive: false } });
  const recentre = () => {
    clearTimeout(release.current); // a pending wheel-release would otherwise overwrite this with the scrolled position
    locked.current = 0;
    const btn = nav.current.querySelector('.on');
    api.start({ y: clamp(btn.offsetTop + btn.offsetHeight / 2), config: settle }); // centre the current step
  };
  useEffect(recentre, [view.p, view.shown]);
  useEffect(() => setOpen(false), [view.p, view.shown]);
  useEffect(() => { s.current.reading = open; s.current.rest = performance.now(); }, [open]);

  const { View, text } = PAGES[view.p];
  const caption = text[view.shown], note = PAGES[view.p].why?.[view.shown];
  return (
    <div className="overview">
      <div className="edge" />
      <nav className="rail" ref={nav} onMouseLeave={recentre}>
        <animated.div className="ticks" style={{ y: y.to((v) => -v) }}>
          {PAGES.flatMap((pg, p) => [
            <div key={`g${p}`} className="group"><Rich>{pg.title ?? pg.name}</Rich></div>,
            ...pg.stops.map((_, i) => (
              <button key={`${p}.${i}`} className={`${i === 0 ? 'first ' : ''}${p === view.p && i === view.shown ? 'on' : ''}`}
                onClick={() => s.current.jump(p, i)}>{pg.labels[i]}</button>
            )),
          ])}
        </animated.div>
      </nav>
      <div className="kicker section-title" key={`title${view.p}`}><i></i><i></i><i></i><span><Rich>{PAGES[view.p].title ?? PAGES[view.p].name}</Rich></span></div>
      <div className="page" key={`page${view.p}`}><View t={view.t} /></div>
      <div className={`caption${open ? ' why' : ''}`} key={`${open}${caption}`} style={{ animationDelay: '0s' }}>
        {open ? <><span className="why-tag">Why?</span>{[].concat(note).map((x, i) => <Rich as="p" key={i}>{x}</Rich>)}</> : <Rich as="p">{caption}</Rich>}
      </div>
      {view.end && next && <button className="next" key="next" onClick={next.go}>{next.label}<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg></button>}
      <div className="nav">
        <button aria-label="Previous slide" disabled={view.p === 0 && view.shown === 0} onClick={() => s.current.prev()}>
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M11 6l-6 6 6 6" /></svg>Previous
        </button>
        <button aria-label="Next slide" disabled={view.end} onClick={() => s.current.next()}>
          Next<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
        </button>
      </div>
      <div className="controls">
        {note && <button className={`rate${open ? ' on' : ''}`} aria-pressed={open} aria-label="Why? Show the extra explanation" onClick={() => setOpen(!open)}>Why?</button>}
        <button className="rate" aria-label={`Playback speed ${rate} times. Change speed`}
          onClick={() => { const r = RATES[(RATES.indexOf(rate) + 1) % RATES.length]; s.current.rate = r; setRate(r); }}>
          <Rich>{`${rate}$\\times$`}</Rich>
        </button>
        <button aria-label={auto ? 'Pause auto mode' : 'Play auto mode'} aria-pressed={auto}
          onClick={() => { s.current.auto = !auto; s.current.rest = performance.now(); setAuto(!auto); }}>
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            {auto ? <path d="M8 5v14M16 5v14" /> : <path d="M7 4.5v15l12-7.5z" />}
          </svg>
        </button>
        <button aria-label="Home" onClick={onHome}>
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 11l9-7.5 9 7.5M5.5 9.5V20h13V9.5M10 20v-6h4v6" />
          </svg>
        </button>
      </div>
    </div>
  );
}
