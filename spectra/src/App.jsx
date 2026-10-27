import { useState } from 'react';
import Epicycles from './home/Epicycles.jsx';
import Overview from './overview/Overview.jsx';
import Fourier from './fourier/Fourier.jsx';

const TOPICS = ['Project Overview', 'Fourier Analysis', 'Sandbox'];

export default function App() {
  const [view, setView] = useState('home');
  if (view === 'fourier') return <Fourier onHome={() => setView('home')} />;
  if (view === 'overview') return <Overview onHome={() => setView('home')} />;
  return (
    <main>
      <section className="intro">
        <div className="kicker"><i></i><i></i><i></i><span>Live Fourier analysis</span></div>
        <h1>SPECTRA</h1>
        <p className="blurb">Explaining fourier transformation, simplified with visual diagrams</p>
        <ul className="topics">
          {TOPICS.map((t, i) => (
            <li key={t}><a href="#" onClick={(e) => { e.preventDefault(); if (i === 0) setView('overview'); if (i === 1) setView('fourier'); }}><span>{String(i + 1).padStart(2, '0')}</span>{t}</a></li>
          ))}
        </ul>
      </section>
      <Epicycles />
    </main>
  );
}
