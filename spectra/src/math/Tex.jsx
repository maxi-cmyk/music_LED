import { createContext, useContext } from 'react';
import katex from 'katex';

// Every number and operation in the prose is set by KaTeX. Write $...$ for a formula; bare numbers, units and
// sums such as "128 × 128" or "450 Hz" are typeset automatically.
const UNIT = String.raw`(?:\s?(?:kHz|Hz|ms|V|%|°))?`;
const NUM = String.raw`\d[\d,]*(?:\.\d+)?`;
const TERM = `${NUM}${UNIT}`;
const EXPR = new RegExp(String.raw`(?<![A-Za-z\d.,-])[-−]?${TERM}(?:\s*[×÷+−=≈/–→]\s*${TERM})*(?![A-Za-z])`, 'g');
const OPS = { '→': String.raw`\to`, '×': String.raw`\times`, '÷': String.raw`\div`, '−': '-', '≈': String.raw`\approx`, '·': String.raw`\cdot`, '–': String.raw`\text{–}` };
const UNITS = { kHz: String.raw`\mathrm{kHz}`, Hz: String.raw`\mathrm{Hz}`, ms: String.raw`\mathrm{ms}`, V: String.raw`\mathrm{V}`, '%': String.raw`\%`, '°': String.raw`^{\circ}` };

const cache = new Map();
const render = (tex, display = false) => {
  const key = (display ? 'D' : 'I') + tex;
  if (!cache.has(key)) cache.set(key, katex.renderToString(tex, { throwOnError: false, strict: 'ignore', displayMode: display }));
  return cache.get(key);
};
const escapeHtml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// turns a matched run of numbers, units and operators into TeX
const toTex = (run) => run
  .replace(/(kHz|Hz|ms|V|%|°)/g, (u, _, offset, whole) => (u === '°' || u === '%' ? '' : '\\,') + UNITS[u] + (u === '°' || u === '%' ? '' : ''))
  .replace(/(\d),(\d)/g, '$1{,}$2')
  .replace(/\s*([×÷−≈·–→])\s*/g, (_, o) => (o === '–' ? OPS[o] : ` ${OPS[o]} `))
  .replace(/\s*([+=/])\s*/g, ' $1 ');

export function richHtml(text) {
  const items = []; // { html, math }: plain text or one typeset piece
  String(text).split(/(\$[^$]+\$)/).forEach((part) => {
    if (part.length > 1 && part.startsWith('$') && part.endsWith('$')) { items.push({ html: render(part.slice(1, -1)), math: true }); return; }
    let last = 0;
    for (const m of part.matchAll(EXPR)) {
      if (m.index > last) items.push({ html: escapeHtml(part.slice(last, m.index)), math: false });
      items.push({ html: render(toTex(m[0])), math: true });
      last = m.index + m[0].length;
    }
    if (last < part.length) items.push({ html: escapeHtml(part.slice(last)), math: false });
  });
  // punctuation straight after a formula stays on its line: the pair is one unbreakable unit
  return items.map((it, i) => {
    if (!it.math) return it.html;
    const next = items[i + 1];
    if (next && !next.math && /^[.,;:!?)]/.test(next.html)) {
      const punct = next.html.match(/^[.,;:!?)]+/)[0];
      next.html = next.html.slice(punct.length);
      return `<span class="nw">${it.html}${punct}</span>`;
    }
    return it.html;
  }).join('');
}

// inline prose
export function Rich({ children, as: Tag = 'span', ...props }) {
  return <Tag {...props} dangerouslySetInnerHTML={{ __html: richHtml([].concat(children).flat(Infinity).join('')) }} />;
}

// SVG text replacement: same props as <text>, set by KaTeX inside a foreignObject
const Ctx = createContext({});
export function TG({ children, ...props }) { // a <g> whose font size, anchor and colour reach the labels inside it
  const parent = useContext(Ctx), { fontSize, textAnchor, fill } = props;
  return <g {...props}><Ctx.Provider value={{ ...parent, ...(fontSize && { fontSize }), ...(textAnchor && { textAnchor }), ...(fill && { fill }) }}>{children}</Ctx.Provider></g>;
}
export function M({ x = 0, y = 0, fontSize, textAnchor, fill, opacity, transform, display, children, w = 640 }) {
  const c = useContext(Ctx);
  const size = +(fontSize ?? c.fontSize ?? 16), anchor = textAnchor ?? c.textAnchor ?? 'start', colour = fill ?? c.fill ?? 'var(--chalk)';
  const text = [].concat(children).flat(Infinity).filter((v) => v !== false && v != null).join('');
  const left = anchor === 'end' ? x - w : anchor === 'middle' ? x - w / 2 : x;
  return (
    <foreignObject x={left} y={y - 0.86 * size} width={w} height={size * 1.4} opacity={opacity} transform={transform} style={{ overflow: 'visible', pointerEvents: 'none' }}>
      <div className="mtext" style={{ fontSize: size, color: colour, textAlign: anchor === 'end' ? 'right' : anchor === 'middle' ? 'center' : 'left' }}
        dangerouslySetInnerHTML={{ __html: display ? render(text, true) : richHtml(text) }} />
    </foreignObject>
  );
}
