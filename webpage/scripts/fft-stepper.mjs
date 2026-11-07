// Turns the FFT derivation list into one-step-at-a-time panels with
// Previous / Next buttons and ← → keys. Without JS every step stays visible.

function isTypingTarget(target) {
  return Boolean(target?.isContentEditable)
    || ['INPUT', 'SELECT', 'TEXTAREA'].includes(target?.tagName)
    || Boolean(target?.closest?.('[role="tablist"], .capture-stage-tabs'));
}

export function mountFftStepper(root, { onShow = () => {} } = {}) {
  const section = root.querySelector('.fft-derivation');
  const panel = root.querySelector('#capture-panel-fft');
  const list = section?.querySelector('[data-fft-panels]');
  if (!section || !panel || !list) return () => {};

  const steps = [...list.children];
  // Deep-dive sections stay out of the way until the last panel.
  const finalPanelOnly = [...panel.querySelectorAll('.fft-full-derivation, .fft-capture-details')];
  // CSS counters skip hidden items, so number each heading explicitly.
  steps.forEach((step, stepIndex) => {
    const heading = step.querySelector('h5');
    if (heading) heading.dataset.step = String(stepIndex + 1);
  });
  const controls = document.createElement('div');
  controls.className = 'fft-stepper';
  controls.innerHTML = `
    <button type="button" class="secondary-button" data-fft-previous>Previous</button>
    <div class="fft-stepper-status">
      <span class="fft-stepper-count" aria-live="polite"></span>
      <span class="fft-stepper-bar" aria-hidden="true"><span></span></span>
      <span class="fft-stepper-hint">Use ← → keys</span>
    </div>
    <button type="button" class="primary-button" data-fft-next>Next</button>`;
  list.before(controls);

  const previousButton = controls.querySelector('[data-fft-previous]');
  const nextButton = controls.querySelector('[data-fft-next]');
  const count = controls.querySelector('.fft-stepper-count');
  const bar = controls.querySelector('.fft-stepper-bar span');
  let index = 0;

  const show = (requestedIndex) => {
    index = Math.min(Math.max(requestedIndex, 0), steps.length - 1);
    steps.forEach((step, stepIndex) => { step.hidden = stepIndex !== index; });
    finalPanelOnly.forEach((section) => { section.hidden = index !== steps.length - 1; });
    count.textContent = `Step ${index + 1} of ${steps.length}`;
    bar.style.width = `${((index + 1) / steps.length) * 100}%`;
    previousButton.disabled = index === 0;
    nextButton.disabled = index === steps.length - 1;
    onShow(index);
  };

  const onPrevious = () => show(index - 1);
  const onNext = () => show(index + 1);
  const onKeydown = (event) => {
    if (panel.hidden || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    if (isTypingTarget(event.target)) return;
    if (event.key === 'ArrowRight') { event.preventDefault(); show(index + 1); }
    else if (event.key === 'ArrowLeft') { event.preventDefault(); show(index - 1); }
  };

  previousButton.addEventListener('click', onPrevious);
  nextButton.addEventListener('click', onNext);
  window.addEventListener('keydown', onKeydown);
  show(0);

  return () => {
    window.removeEventListener('keydown', onKeydown);
    controls.remove();
    steps.forEach((step) => { step.hidden = false; });
    finalPanelOnly.forEach((section) => { section.hidden = false; });
  };
}
