import { useState } from 'react';
import Epicycles from './home/Epicycles.jsx';
import Overview from './overview/Overview.jsx';
import Fourier from './fourier/Fourier.jsx';
import FFT from './fft/FFT.jsx';
import Sandbox from './sandbox/Sandbox.jsx';

const TOPICS = [['Fourier Analysis', 'fourier'], ['Hardware demo', 'overview'], ['Fast Fourier Transform', 'fft'], ['Sandbox', 'sandbox']];

export default function App() {
  const [view, setView] = useState('home');
  const at = TOPICS.findIndex(([, key]) => key === view); // the chapter after this one, offered under its last slide
  const next = at >= 0 && at < TOPICS.length - 1 ? { label: `Next chapter: ${TOPICS[at + 1][0]}`, go: () => setView(TOPICS[at + 1][1]) } : undefined;
  if (view === 'sandbox') return <Sandbox onHome={() => setView('home')} />;
  if (view === 'fft') return <FFT onHome={() => setView('home')} next={next} />;
  if (view === 'fourier') return <Fourier onHome={() => setView('home')} next={next} />;
  if (view === 'overview') return <Overview onHome={() => setView('home')} next={next} />;
  return (
    <main>
      <section className="intro">
        <div className="kicker"><i></i><i></i><i></i><span>Live Fourier analysis</span></div>
        <h1>SPECTRA</h1>
        <p className="blurb">Explaining fourier transformation, simplified with visual diagrams</p>
        <ul className="topics">
          {TOPICS.map(([name, key], i) => (
            <li key={name}><a href="#" onClick={(e) => { e.preventDefault(); if (key) setView(key); }}><span>{String(i + 1).padStart(2, '0')}</span>{name}</a></li>
          ))}
        </ul>
      </section>
      <Epicycles />
    </main>
  );
}
