export function renderMath(root = document) {
  if (!window.katex) {
    window.setTimeout(() => renderMath(root), 25);
    return;
  }

  root.querySelectorAll('.math[data-latex]').forEach((element) => {
    const expression = element.dataset.latex;
    if (!expression) return;
    try {
      window.katex.render(expression, element, {
        displayMode: element.dataset.display === 'true',
        throwOnError: false,
        strict: 'warn',
        output: 'htmlAndMathml',
      });
    } catch (error) {
      element.textContent = expression;
      element.classList.add('math-error');
    }
  });
}

export function updateMath(element, expression, displayMode = false) {
  const nextDisplayMode = String(displayMode);
  const alreadyRendered = element.querySelector('.katex');
  if (
    alreadyRendered
    && element.dataset.latex === expression
    && element.dataset.display === nextDisplayMode
  ) return;

  element.dataset.latex = expression;
  element.dataset.display = nextDisplayMode;
  renderMath(element.parentElement ?? document);
}
