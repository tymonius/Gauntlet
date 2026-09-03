export function esc(value) {
  return String(value ?? '').replace(/[&<>'"]/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;',
  })[character]);
}

export function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function elementFromMarkup(markup) {
  const template = document.createElement('template');
  template.innerHTML = String(markup || '').trim();
  const element = template.content.firstElementChild;
  if (!(element instanceof HTMLElement)) throw new Error('Face template produced no root element.');
  return element;
}

export function ruleSection(label, text) {
  if (!text) return '';
  return `<section class="rule-section"><h4>${esc(label)}</h4><p>${esc(text)}</p></section>`;
}
