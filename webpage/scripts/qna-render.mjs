// Turns an answer string into tokens: plain text, $maths$, `code`, and [text](#qna/ID) links.
const TOKEN = /\$([^$]+)\$|`([^`]+)`|\[([^\]]+)\]\(#qna\/(\d+)\)/g;

export function parseInline(text) {
  const tokens = [];
  let last = 0;
  for (const match of text.matchAll(TOKEN)) {
    if (match.index > last) tokens.push({ type: 'text', value: text.slice(last, match.index) });
    if (match[1] !== undefined) tokens.push({ type: 'math', value: match[1] });
    else if (match[2] !== undefined) tokens.push({ type: 'code', value: match[2] });
    else tokens.push({ type: 'link', value: match[3], id: Number(match[4]) });
    last = match.index + match[0].length;
  }
  if (last < text.length) tokens.push({ type: 'text', value: text.slice(last) });
  return tokens;
}

// the same text without markup, for searching
export function plainText(text) {
  return parseInline(text).map((token) => token.value).join('');
}

// appends the tokens to a parent as DOM nodes: nothing from the data is ever parsed as HTML
export function appendInline(parent, text) {
  for (const token of parseInline(text)) {
    if (token.type === 'text') {
      parent.append(document.createTextNode(token.value));
    } else if (token.type === 'math') {
      const span = document.createElement('span');
      span.className = 'math';
      span.dataset.latex = token.value;
      parent.append(span);
    } else if (token.type === 'code') {
      const code = document.createElement('code');
      code.textContent = token.value;
      parent.append(code);
    } else {
      const link = document.createElement('a');
      link.href = `#qna/${token.id}`;
      link.textContent = token.value;
      parent.append(link);
    }
  }
}
