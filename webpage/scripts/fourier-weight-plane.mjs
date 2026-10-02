const SVG_NS = 'http://www.w3.org/2000/svg';
const MODES = Object.freeze({
  four: Object.freeze({ size: 4, row: 1, label: 'F₄', delayMilliseconds: 600,
    note: 'Four samples give four quarter-turn positions: 1, −i, −1, i.' }),
  fine: Object.freeze({ size: 128, row: 1, label: 'F₁₂₈', delayMilliseconds: 90,
    note: 'This row visits 128 positions. Most weights lie between the four F₄ values.' }),
  quarter: Object.freeze({ size: 128, row: 32, label: 'F₁₂₈', delayMilliseconds: 600,
    note: 'The four familiar values also occur in F₁₂₈: row 32 repeats them 32 times.' }),
});

function greatestCommonDivisor(left, right) {
  while (right !== 0) [left, right] = [right, left % right];
  return left;
}

export function distinctWeightCount(size, row) {
  return size / greatestCommonDivisor(size, row);
}

export function fourierWeight(size, row, sampleIndex) {
  const turns = ((row * sampleIndex) % size) / size;
  const angle = -2 * Math.PI * turns;
  return { real: Math.cos(angle), imaginary: Math.sin(angle), clockwiseDegrees: 360 * turns };
}

function formatPart(value) {
  if (Math.abs(value) < 0.0005) return '0';
  if (Math.abs(value - 1) < 0.0005) return '1';
  if (Math.abs(value + 1) < 0.0005) return '−1';
  return value.toFixed(3).replace('-', '−');
}

function formatWeight({ real, imaginary }) {
  if (Math.abs(imaginary) < 0.0005) return formatPart(real);
  if (Math.abs(real) < 0.0005) {
    if (Math.abs(imaginary - 1) < 0.0005) return 'i';
    if (Math.abs(imaginary + 1) < 0.0005) return '−i';
  }
  return `${formatPart(real)} ${imaginary < 0 ? '−' : '+'} ${formatPart(Math.abs(imaginary))}i`;
}

function pointFor(weight) {
  return { x: 200 + 142 * weight.real, y: 200 - 142 * weight.imaginary };
}

export function mountFourierWeightPlane(root, { sampleControl, reducedMotion, onSampleChange }) {
  const graphic = root.querySelector('#weight-plane-graphic');
  const pointsGroup = root.querySelector('#weight-plane-points');
  const arrow = root.querySelector('#weight-plane-arrow');
  const arrowhead = root.querySelector('#weight-plane-arrowhead');
  const value = root.querySelector('#weight-plane-value');
  const angle = root.querySelector('#weight-plane-angle');
  const note = root.querySelector('#weight-plane-note');
  const slider = root.querySelector('#weight-plane-index');
  const sliderLabel = root.querySelector('#weight-plane-index-label');
  const playButton = root.querySelector('#weight-plane-play');
  const modeButtons = [...root.querySelectorAll('[data-weight-mode]')];
  let modeName = 'fine';
  let timer = null;
  let pointElements = [];
  let animationFrame = null;
  let displayedAngle = null;

  const positionArrow = (angleRadians) => {
    displayedAngle = angleRadians;
    const horizontal = Math.cos(angleRadians);
    const vertical = -Math.sin(angleRadians);
    const point = (radius, side = 0) => [
      (200 + radius * horizontal - side * vertical).toFixed(3),
      (200 + radius * vertical + side * horizontal).toFixed(3),
    ];
    const [shaftX, shaftY] = point(128);
    arrow.setAttribute('x2', shaftX);
    arrow.setAttribute('y2', shaftY);
    arrowhead.setAttribute('points', [point(142), point(126, -7), point(126, 7)].map((coordinates) => coordinates.join(',')).join(' '));
  };

  const stopArrowAnimation = () => {
    if (animationFrame !== null) window.cancelAnimationFrame(animationFrame);
    animationFrame = null;
  };

  const pause = () => {
    if (timer !== null) window.clearInterval(timer);
    timer = null;
    stopArrowAnimation();
    playButton.textContent = reducedMotion.matches ? 'Use slider to step' : 'Play rotation';
    playButton.setAttribute('aria-pressed', 'false');
  };

  const buildPoints = () => {
    const mode = MODES[modeName];
    const count = distinctWeightCount(mode.size, mode.row);
    pointElements = Array.from({ length: count }, (_, index) => {
      const position = pointFor(fourierWeight(mode.size, mode.row, index));
      const circle = document.createElementNS(SVG_NS, 'circle');
      circle.setAttribute('class', 'weight-point');
      circle.setAttribute('cx', position.x.toFixed(3));
      circle.setAttribute('cy', position.y.toFixed(3));
      circle.setAttribute('r', count > 4 ? '2.4' : '5');
      return circle;
    });
    pointsGroup.replaceChildren(...pointElements);
  };

  const render = (inputSampleIndex) => {
    const mode = MODES[modeName];
    const sampleIndex = inputSampleIndex % mode.size;
    const weight = fourierWeight(mode.size, mode.row, sampleIndex);
    const activePoint = sampleIndex % pointElements.length;
    pointElements.forEach((point, index) => {
      point.classList.toggle('weight-point-passed', index <= activePoint);
      point.classList.toggle('weight-point-current', index === activePoint);
    });
    if (animationFrame === null) {
      positionArrow(-2 * Math.PI * weight.clockwiseDegrees / 360);
    }
    slider.value = String(sampleIndex);
    sliderLabel.textContent = `n = ${sampleIndex}`;
    slider.setAttribute('aria-valuetext', `sample ${sampleIndex}, weight ${formatWeight(weight)}`);
    value.textContent = `${mode.label}[${mode.row},${sampleIndex}] = ${formatWeight(weight)}`;
    angle.textContent = `Clockwise from 1: ${Number(weight.clockwiseDegrees.toFixed(2))}°`;
    note.textContent = mode.note;
    graphic.setAttribute('aria-label', `${mode.label} row ${mode.row}, sample ${sampleIndex}: a unit-length arrow at ${formatWeight(weight)} on the complex plane`);
  };

  const setSample = (sampleIndex) => {
    sampleControl.value = String(sampleIndex);
    onSampleChange();
  };

  const selectMode = (nextMode) => {
    if (nextMode === modeName) return;
    pause();
    modeName = nextMode;
    const mode = MODES[modeName];
    slider.max = String(mode.size - 1);
    modeButtons.forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.weightMode === modeName)));
    buildPoints();
    setSample(Number(sampleControl.value) % mode.size);
  };

  const play = () => {
    if (timer !== null) {
      pause();
      render(Number(sampleControl.value));
      return;
    }
    if (reducedMotion.matches) return;
    const mode = MODES[modeName];
    playButton.textContent = 'Pause rotation';
    playButton.setAttribute('aria-pressed', 'true');
    timer = window.setInterval(() => {
      if (animationFrame !== null) return;
      const nextSample = (Number(slider.value) + 1) % mode.size;
      const startAngle = displayedAngle;
      const endAngle = startAngle - 2 * Math.PI * mode.row / mode.size;
      const duration = mode.delayMilliseconds - 20;
      let startedAt = null;
      const advance = (timestamp) => {
        startedAt ??= timestamp;
        const fraction = Math.min(1, (timestamp - startedAt) / duration);
        positionArrow(startAngle + (endAngle - startAngle) * fraction);
        if (fraction < 1) {
          animationFrame = window.requestAnimationFrame(advance);
        } else {
          animationFrame = null;
          setSample(nextSample);
        }
      };
      animationFrame = window.requestAnimationFrame(advance);
    }, mode.delayMilliseconds);
  };

  const onSliderInput = () => {
    pause();
    setSample(Number(slider.value));
  };
  const onMotionChange = () => {
    pause();
    playButton.disabled = reducedMotion.matches;
    render(Number(sampleControl.value));
  };
  const onModeClicks = modeButtons.map((button) => {
    const handler = () => selectMode(button.dataset.weightMode);
    button.addEventListener('click', handler);
    return [button, handler];
  });

  slider.addEventListener('input', onSliderInput);
  playButton.addEventListener('click', play);
  reducedMotion.addEventListener('change', onMotionChange);
  playButton.disabled = reducedMotion.matches;
  buildPoints();

  return {
    render,
    pause,
    cleanup() {
      pause();
      slider.removeEventListener('input', onSliderInput);
      playButton.removeEventListener('click', play);
      reducedMotion.removeEventListener('change', onMotionChange);
      onModeClicks.forEach(([button, handler]) => button.removeEventListener('click', handler));
    },
  };
}
