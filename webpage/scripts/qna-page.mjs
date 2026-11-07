// Q&A page: grouped, expandable answers with a filter. #qna/12 opens answer 12.
import { QNA_GROUPS } from './qna-data.mjs?release=20261107-qna-5';
import { appendInline, plainText } from './qna-render.mjs?release=20261107-qna-5';
import { renderMath } from './math-renderer.mjs?release=20260924-distill-23';

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function buildItem({ id, question, answer }) {
  const details = element('details', 'qna-item');
  details.id = `qna-${id}`;
  const summary = element('summary');
  appendInline(summary, question);
  const body = element('div', 'qna-answer');
  const paragraph = element('p');
  appendInline(paragraph, answer);
  body.append(paragraph);
  details.append(summary, body);
  details.dataset.search = plainText(`${question} ${answer}`).toLowerCase();
  return details;
}

export function mount(root) {
  const list = root.querySelector('#qna-list');
  const filter = root.querySelector('#qna-filter');
  const collapse = root.querySelector('#qna-collapse');
  const empty = root.querySelector('#qna-empty');
  const sections = [];

  for (const group of QNA_GROUPS) {
    const section = element('section', 'qna-group');
    section.setAttribute('aria-labelledby', `qna-group-${group.id}`);
    const heading = element('h2', 'qna-group-title', group.title);
    heading.id = `qna-group-${group.id}`;
    const items = group.items.map(buildItem);
    section.append(heading, ...items);
    list.append(section);
    sections.push({ section, items });
  }
  renderMath(list);

  function applyFilter() {
    const words = filter.value.toLowerCase().split(/\s+/).filter(Boolean);
    let shown = 0;
    for (const { section, items } of sections) {
      let groupShown = 0;
      for (const item of items) {
        const match = words.every((word) => item.dataset.search.includes(word));
        item.hidden = !match;
        if (match) groupShown += 1;
      }
      section.hidden = groupShown === 0;
      shown += groupShown;
    }
    empty.hidden = shown !== 0;
  }
  const onFilter = () => applyFilter();
  const onCollapse = () => list.querySelectorAll('details[open]').forEach((item) => { item.open = false; });
  filter.addEventListener('input', onFilter);
  collapse.addEventListener('click', onCollapse);

  const target = Number(location.hash.split('/')[1]);
  if (target) {
    const item = root.querySelector(`#qna-${target}`);
    if (item) {
      item.open = true;
      const jump = () => item.scrollIntoView({ block: 'start', behavior: 'instant' });
      window.setTimeout(jump, 0); // after the router has scrolled to the top
      window.setTimeout(() => { if (window.scrollY < 5) jump(); }, 300); // and again if the browser restored the top once the page finished loading
    }
  }

  return () => {
    filter.removeEventListener('input', onFilter);
    collapse.removeEventListener('click', onCollapse);
  };
}
