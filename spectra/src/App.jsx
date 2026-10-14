import Epicycles from './Epicycles.jsx';

const TOPICS = ['Project Overview', 'Fourier Analysis', 'Common Questions'];

export default function App() {
  return (
    <main>
      <section className="intro">
        <div className="kicker"><i></i><i></i><i></i><span>Live Fourier analysis</span></div>
        <h1>SPECTRA</h1>
        <p className="blurb">Explaining fourier transformation, simplified with visual diagrams</p>
        <ul className="topics">
          {TOPICS.map((t, i) => (
            <li key={t}><a href="#"><span>{String(i + 1).padStart(2, '0')}</span>{t}</a></li>
          ))}
        </ul>
      </section>
      <Epicycles />
    </main>
  );
}
