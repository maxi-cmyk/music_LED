import { useEffect, useRef, useState } from 'react';
import { useWheel } from '@use-gesture/react';
import { animated, useSpring } from '@react-spring/web';
import Frame, { STOPS as S1 } from './Frame.jsx';
import Clean, { STOPS as S2 } from './Clean.jsx';
import Split, { STOPS as S3 } from './Split.jsx';
import Light, { STOPS as S4 } from './Light.jsx';
import Mixer, { STOPS as S5 } from './Mixer.jsx';

// text[k] appears as soon as the page starts moving to stop k, so the words change together with the picture
const SPLIT = 'The cleaned frame is split into pure tones of different pitch, much like how colors can be split into red, green and blue. This split is the Fourier transform.';

const TAPER = "Then it is faded at the edges so that sharp cut-offs don't smear the result.";

const PAGES = [
  { name: 'Frames', labels: ['Snapshots', 'One frame'], View: Frame, stops: S1, text: [
    'The microphone takes 6,400 snapshots every second. Each point records the amplitude for the soundwave.',
    '128 in a row make 1 frame.',
  ] },
  { name: 'Cleaning', labels: ['Tidy up', 'Centre on zero', 'Fade the edges'], View: Clean, stops: S2, text: [
    'Each frame is cleaned before analysis.',
    'First it is shifted to be centered around zero.',
    TAPER,
  ] },
  { name: 'Splitting', labels: ['Cleaned frame', 'Split into tones', 'Group by pitch', 'Add up each band'], View: Split, stops: S3, text: [
    TAPER, // the frame hasn't split yet, so this page opens with the previous caption
    SPLIT,
    'The tones are then grouped by pitch into bass, mids and treble.',
    'Add up the strength in each band.',
  ] },
  { name: 'Brightness', labels: ['Strength to colour', 'Noise floor', 'Scale to 0–255', 'Mix the channels'], View: Light, stops: S4, text: [
    "Each band's strength sets how bright its colour channel is: bass for red, mids for green, treble for blue.",
    'Pure tones can still bleed into adjacent frequencies. For example, a perfect bass tone can produce faint mids and trebles. To fix this, any color channel with less than 15% of the main signal is cut off.',
    'The rest is scaled to a brightness from 0 to 255.',
    'The three channels mix in the eye, so bass and mids together look yellow, and all three look white.',
  ] },
  { name: 'Colour', labels: ['Bass, mids, treble', 'Live LED colour'], View: Mixer, stops: S5, text: [
    'Bass, mids and treble set the red, green and blue of the LED.',
    'As the music changes, the bars change, and so does the LED colour.',
  ] },
];
const HOLD = 3500; // auto mode waits this long (ms) at each stop before moving on

export default function Overview({ onHome }) {
  // p: page index, i: stop being moved to, t: seconds into the page's animation, rest: when t last reached a stop
  const s = useRef({ p: 0, i: 0, t: 0, rest: performance.now(), auto: false }); // i: stop being moved to
  const [view, setView] = useState({ p: 0, t: 0, shown: 0, end: false });
  const nav = useRef();

  useEffect(() => {
    const st = s.current;
    const stops = () => PAGES[st.p].stops;
    const settle = () => { st.t = stops()[st.i]; };
    const draw = () => setView({ p: st.p, t: st.t, shown: st.i, end: st.p === PAGES.length - 1 && st.t === stops().at(-1) });
    const next = () => {
      st.rest = performance.now();
      const at = stops();
      if (st.t !== at[st.i]) {
        if (st.t > at[st.i]) st.i = Math.min(st.i + 1, at.length - 1); // moving back: head forward again
        else settle(); // moving forward: finish the move
      } else if (st.i < at.length - 1) st.i++;
      else if (st.p < PAGES.length - 1) { st.p++; st.i = 0; settle(); } // next page starts where this one ends
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
      if (e.key === 'ArrowRight') next();
      if (e.key === 'ArrowLeft') prev();
    };
    window.addEventListener('keydown', onKey);
    s.current.jump = (p, i) => { st.p = p; st.i = i; settle(); st.rest = performance.now(); draw(); }; // rail click: go straight to stop i of page p

    let raf, last = performance.now();
    const tick = (now) => {
      const dt = (now - last) / 1000;
      last = now;
      const target = stops()[st.i];
      if (st.t !== target) {
        const dir = Math.sign(target - st.t);
        st.t += dir * dt;
        if (Math.sign(target - st.t) !== dir) { settle(); st.rest = now; }
        draw();
      } else if (st.auto && now - st.rest > HOLD && !(st.p === PAGES.length - 1 && st.i === stops().length - 1)) next();
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
  useWheel(({ delta: [, dy] }) => {
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
  useEffect(() => {
    const btn = nav.current.querySelector('.on');
    api.start({ y: clamp(btn.offsetTop + btn.offsetHeight / 2), config: settle }); // centre the current step
  }, [view.p, view.shown]);

  const { View, text } = PAGES[view.p];
  const caption = text[view.shown];
  return (
    <div className="overview">
      <div className="edge" />
      <nav className="rail" ref={nav}>
        <animated.div className="ticks" style={{ y: y.to((v) => -v) }}>
          {PAGES.flatMap((pg, p) => pg.stops.map((_, i) => (
            <button key={`${p}.${i}`} className={`${i === 0 ? 'first ' : ''}${p === view.p && i === view.shown ? 'on' : ''}`}
              onClick={() => s.current.jump(p, i)}>{pg.labels[i]}</button>
          )))}
        </animated.div>
      </nav>
      <View t={view.t} />
      <div className="caption" key={caption} style={{ animationDelay: '0s' }}>
        <p>{caption}</p>
      </div>
      {view.end && <button className="home" onClick={onHome}>Return home</button>}
    </div>
  );
}
