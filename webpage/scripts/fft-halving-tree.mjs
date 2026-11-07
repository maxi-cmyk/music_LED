// Animated halving tree for the FFT: one 128-point DFT splits level by level down to
// 128 single samples, then recombines upward in seven butterfly stages.

const SVG_NS = 'http://www.w3.org/2000/svg';
const LEVELS = 8; // 128, 64, 32, ..., 1 point
const FULL_SIZE = 128;
const PLOT = { left: 112, right: 632, top: 8, rowHeight: 31, boxHeight: 19 };
const SPLIT_STEP_MILLISECONDS = 380;
const COMBINE_STEP_MILLISECONDS = 620;

function element(name, attributes) {
  const node = document.createElementNS(SVG_NS, name);
  for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, value);
  return node;
}

export function mountHalvingTree(root, { reducedMotion }) {
  const tree = root.querySelector('[data-fft-tree]');
  if (!tree) return { play() {}, stop() {}, cleanup() {} };
  const svg = tree.querySelector('svg');
  const caption = tree.querySelector('[data-fft-tree-caption]');
  const replayButton = tree.querySelector('[data-fft-tree-replay]');
  const rows = [];

  for (let level = 0; level < LEVELS; level += 1) {
    const boxCount = 2 ** level;
    const size = FULL_SIZE / boxCount;
    const y = PLOT.top + level * PLOT.rowHeight;
    const slot = (PLOT.right - PLOT.left) / boxCount;
    const group = element('g', { class: 'fft-tree-row' });
    group.append(element('text', {
      x: PLOT.left - 12, y: y + PLOT.boxHeight / 2 + 4, 'text-anchor': 'end', class: 'fft-tree-label',
    }));
    group.lastChild.textContent = boxCount === 1 ? '1 × 128-point' : `${boxCount} × ${size}-point`.replace('-point', size === 1 ? ' sample' : '-point');
    for (let index = 0; index < boxCount; index += 1) {
      group.append(element('rect', {
        x: PLOT.left + index * slot + (boxCount > 32 ? 0.4 : 1.5),
        y,
        width: Math.max(1, slot - (boxCount > 32 ? 0.8 : 3)),
        height: PLOT.boxHeight,
        rx: boxCount > 32 ? 0.5 : 3,
        class: index % 2 === 0 ? 'fft-tree-box is-even' : 'fft-tree-box is-odd',
      }));
    }
    svg.append(group);
    rows.push(group);
  }

  // One timeline step per visible change: reveal rows 0..7, then combine stages 1..7.
  const totalSteps = LEVELS + (LEVELS - 1);
  let timer = null;

  const render = (step) => {
    rows.forEach((row, level) => {
      const revealed = level <= Math.min(step, LEVELS - 1);
      const combineStage = step - (LEVELS - 1); // 0 while splitting, 1..7 while combining
      const combineLevel = LEVELS - 1 - combineStage;
      row.classList.toggle('is-revealed', revealed);
      row.classList.toggle('is-active', combineStage >= 1 && level === combineLevel);
      row.classList.toggle('is-combined', combineStage >= 1 && level > combineLevel);
    });
    if (step < LEVELS - 1) {
      const size = FULL_SIZE / 2 ** step;
      caption.textContent = step === 0
        ? 'Start with one 128-point DFT.'
        : `Split every ${size * 2}-point DFT into even and odd halves: ${2 ** step} DFTs of ${size} points.`;
    } else if (step === LEVELS - 1) {
      caption.textContent = 'Single samples reached. A one-sample DFT is the sample itself.';
    } else if (step < totalSteps) {
      const stage = step - (LEVELS - 1);
      const size = 2 ** stage;
      caption.textContent = `Stage ${stage} of 7: 64 butterflies build ${FULL_SIZE / size} DFTs of ${size} points.`;
    } else {
      caption.textContent = '7 stages × 64 butterflies = 448. Same answers as the DFT.';
    }
  };

  const stop = () => {
    if (timer) window.clearTimeout(timer);
    timer = null;
  };

  const play = () => {
    stop();
    if (reducedMotion?.matches) {
      render(totalSteps);
      return;
    }
    let step = 0;
    const advance = () => {
      render(step);
      if (step >= totalSteps) { timer = null; return; }
      const delay = step < LEVELS - 1 ? SPLIT_STEP_MILLISECONDS : COMBINE_STEP_MILLISECONDS;
      step += 1;
      timer = window.setTimeout(advance, delay);
    };
    advance();
  };

  const onReplay = () => play();
  replayButton.addEventListener('click', onReplay);
  render(totalSteps); // static final state until the panel is shown

  return {
    play,
    stop,
    cleanup() {
      stop();
      replayButton.removeEventListener('click', onReplay);
      svg.replaceChildren();
    },
  };
}
