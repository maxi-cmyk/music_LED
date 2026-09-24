import { updateMath } from './math-renderer.mjs?release=20260924-distill-23';

const FOUR_POINT_ROWS = Object.freeze([
  Object.freeze(['1', '1', '1', '1']),
  Object.freeze(['1', '-i', '-1', 'i']),
  Object.freeze(['1', '-1', '1', '-1']),
  Object.freeze(['1', 'i', '-1', '-i']),
]);
const FOUR_POINT_RESULTS = Object.freeze(['0', '2', '0', '2']);
const FOUR_POINT_PHASES = Object.freeze([
  Object.freeze(['0', '0', '0', '0']),
  Object.freeze(['0', '\\frac{\\pi}{2}', '\\pi', '\\frac{3\\pi}{2}']),
  Object.freeze(['0', '\\pi', '0', '\\pi']),
  Object.freeze(['0', '\\frac{3\\pi}{2}', '\\pi', '\\frac{\\pi}{2}']),
]);
const ROW_DESCRIPTIONS = Object.freeze([
  'Row 0 measures the constant, or zero-frequency, part of the samples.',
  'Row 1 measures the positive-frequency pattern in this example.',
  'Row 2 measures the alternating pattern at the Nyquist frequency.',
  'Row 3 is the negative-frequency partner of row 1 for real input.',
]);

function matrixLatex(selectedRow) {
  const rows = FOUR_POINT_ROWS.map((row, rowIndex) => {
    return row.map((cell) => (
      rowIndex === selectedRow ? `\\color{#d8ff52}{${cell}}` : cell
    )).join(' & ');
  }).join('\\\\');
  return String.raw`F_4=\begin{bmatrix}${rows}\end{bmatrix},\quad
    \mathbf{x}=\begin{bmatrix}1\\0\\-1\\0\end{bmatrix},\quad
    \mathbf{X}=\begin{bmatrix}0\\2\\0\\2\end{bmatrix}`;
}

function calculationLatex(rowIndex) {
  const row = FOUR_POINT_ROWS[rowIndex];
  const terms = row.map((weight, index) => `${weight === '-1' || weight === '-i' ? `(${weight})` : weight}(${[1, 0, -1, 0][index]})`);
  return String.raw`X[${rowIndex}]=${terms.join('+')}=${FOUR_POINT_RESULTS[rowIndex]}`;
}

function rowConstructionLatex(rowIndex) {
  const phases = FOUR_POINT_PHASES[rowIndex].join(',\\;');
  const weights = FOUR_POINT_ROWS[rowIndex].join(',\\;');
  return String.raw`\begin{aligned}
    \theta_{${rowIndex},n}\pmod{2\pi}&=\left[${phases}\right]\\
    F[${rowIndex},n]=e^{-i\theta_{${rowIndex},n}}&=\left[${weights}\right]
  \end{aligned}`;
}

export function mount(root) {
  const matrixEquation = root.querySelector('#matrix-equation');
  const matrixRowConstruction = root.querySelector('#matrix-row-construction');
  const rowCalculation = root.querySelector('#row-calculation');
  const rowExplanation = root.querySelector('#matrix-row-explanation');
  const rowButtons = [...root.querySelectorAll('[data-matrix-row]')];
  const sectionLinks = [...root.querySelectorAll('[data-section-link]')];

  let selectedRow = 1;

  sectionLinks.forEach((button) => button.addEventListener('click', () => {
    root.querySelector(`#${button.dataset.sectionLink}`)?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  }));

  const renderMatrix = () => {
    updateMath(matrixRowConstruction, rowConstructionLatex(selectedRow), true);
    updateMath(matrixEquation, matrixLatex(selectedRow), true);
    updateMath(rowCalculation, calculationLatex(selectedRow), true);
    rowExplanation.textContent = ROW_DESCRIPTIONS[selectedRow];
    rowButtons.forEach((button) => {
      button.setAttribute('aria-pressed', String(Number(button.dataset.matrixRow) === selectedRow));
    });
  };
  rowButtons.forEach((button) => button.addEventListener('click', () => {
    selectedRow = Number(button.dataset.matrixRow);
    renderMatrix();
  }));

  renderMatrix();
  return () => {};
}
