import { marked } from 'marked';
import DOMPurify from 'dompurify';

marked.use({
  gfm: true,
  breaks: true,
});

const SANITIZE = {
  ALLOWED_TAGS: [
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'p',
    'br',
    'hr',
    'strong',
    'b',
    'em',
    'i',
    'u',
    's',
    'strike',
    'del',
    'ul',
    'ol',
    'li',
    'blockquote',
    'a',
    'pre',
    'code',
    'span',
  ],
  ALLOWED_ATTR: ['href', 'title', 'target', 'rel', 'class'],
  ALLOW_DATA_ATTR: false,
};

/** Recorre documento ProseMirror / bloques Strapi y devuelve texto plano (sin sintaxis md). */
function extractTextFromStrapiRichBlocks(node: unknown): string {
  if (node == null) return '';
  if (typeof node === 'string') return node;
  if (Array.isArray(node)) {
    return node.map((n) => extractTextFromStrapiRichBlocks(n)).filter(Boolean).join('\n\n');
  }
  if (typeof node !== 'object') return '';
  const o = node as Record<string, unknown>;
  if (o.type === 'text' && typeof o.text === 'string') return o.text;
  if (o.type === 'hardBreak' || o.type === 'hard_break') return '\n';
  if (Array.isArray(o.content)) {
    const inner = o.content.map((c) => extractTextFromStrapiRichBlocks(c)).join('');
    if (o.type === 'paragraph' || o.type === 'heading') return inner;
    if (o.type === 'bulletList' || o.type === 'orderedList') {
      return o.content.map((c) => extractTextFromStrapiRichBlocks(c)).join('\n');
    }
    if (o.type === 'listItem') return inner;
    if (o.type === 'blockquote') return inner;
    return inner;
  }
  return '';
}

function extractFromStrapiRichRoot(raw: Record<string, unknown>): string {
  if (raw.type === 'doc' && Array.isArray(raw.content)) {
    return extractTextFromStrapiRichBlocks(raw.content);
  }
  if (Array.isArray(raw.content) && raw.type !== 'text') {
    return extractTextFromStrapiRichBlocks(raw.content);
  }
  return '';
}

/** Acepta Markdown plano o envoltorios habituales del CMS (Strapi v5). */
export function extractProductDescriptionMarkdown(raw: unknown): string {
  if (raw == null) return '';
  if (typeof raw === 'string') return raw;
  if (typeof raw === 'object') {
    const o = raw as Record<string, unknown>;
    if (typeof o.markdown === 'string') return o.markdown;
    if (typeof o.body === 'string') return o.body;
    if (typeof o.text === 'string') return o.text;
    if (typeof o.content === 'string') return o.content;
    if (o.data && typeof o.data === 'object') {
      const d = o.data as Record<string, unknown>;
      if (typeof d.markdown === 'string') return d.markdown;
      if (typeof d.body === 'string') return d.body;
      if (typeof d.text === 'string') return d.text;
    }
    const fromBlocks = extractFromStrapiRichRoot(o);
    if (fromBlocks.trim()) return fromBlocks;
  }
  return '';
}

export function renderProductDescriptionMarkdown(input: unknown): string {
  const raw = extractProductDescriptionMarkdown(input).trim();
  if (!raw) {
    return '<p class="product-markdown-empty">Sin descripción.</p>';
  }

  const html = marked.parse(raw, { async: false }) as string;
  return String(DOMPurify.sanitize(html, SANITIZE));
}

function htmlToPlainText(html: string): string {
  if (typeof document !== 'undefined') {
    const el = document.createElement('div');
    el.innerHTML = html;
    return (el.textContent || el.innerText || '').replace(/\s+/g, ' ').trim();
  }
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&(?:amp|#38);/g, '&')
    .replace(/&(?:lt|#60);/g, '<')
    .replace(/&(?:gt|#62);/g, '>')
    .replace(/&(?:quot|#34);/g, '"')
    .replace(/&(?:#39|apos);/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Texto plano para listados: mismo Markdown que la ficha, renderizado y recortado.
 * @param maxChars Por defecto 120.
 */
export function getProductDescriptionPlainExcerpt(
  input: unknown,
  maxChars = 120
): string {
  const md = extractProductDescriptionMarkdown(input).trim();
  if (!md) return 'No description added';

  const html = marked.parse(md, { async: false }) as string;
  const safe = String(DOMPurify.sanitize(html, SANITIZE));
  const plain = htmlToPlainText(safe);
  const oneLine = plain.replace(/\s+/g, ' ').trim();
  if (!oneLine) return 'No description added';
  const chars = [...oneLine];
  if (chars.length <= maxChars) return oneLine;
  return chars.slice(0, maxChars).join('').trimEnd() + '…';
}

function removeFollowingSiblings(node: ChildNode): void {
  let n = node.nextSibling;
  while (n) {
    const next = n.nextSibling;
    n.remove();
    n = next;
  }
}

/** Elimina nodos hermanos posteriores y sube hasta `stopAt` (excl.). */
function removeAfterInAncestors(from: ChildNode, stopAt: HTMLElement): void {
  removeFollowingSiblings(from);
  let parent: Node | null = from.parentNode;
  while (parent && parent !== stopAt) {
    removeFollowingSiblings(parent as unknown as ChildNode);
    parent = parent.parentNode;
  }
}

/**
 * Recorta el HTML por cantidad de caracteres de texto visibles (conserva negrita, cursiva, etc.).
 */
function truncateHtmlByTextBudget(root: HTMLElement, maxChars: number): boolean {
  let budget = maxChars;
  let truncated = false;

  function walk(parent: HTMLElement): void {
    const children = [...parent.childNodes];
    for (const node of children) {
      if (budget <= 0) {
        node.remove();
        truncated = true;
        continue;
      }
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent ?? '';
        const g = [...text];
        if (g.length === 0) continue;
        if (g.length <= budget) {
          budget -= g.length;
          continue;
        }
        node.textContent = g.slice(0, budget).join('');
        budget = 0;
        truncated = true;
        removeAfterInAncestors(node, root);
        return;
      }
      if (node.nodeType === Node.ELEMENT_NODE) {
        walk(node as HTMLElement);
        if (budget <= 0) {
          truncated = true;
          removeAfterInAncestors(node as ChildNode, root);
          return;
        }
      }
    }
  }

  walk(root);
  return truncated;
}

/**
 * Listados: Markdown → HTML (como la ficha), sanitizado y recortado a N caracteres de texto con formato.
 */
export function getProductDescriptionHtmlExcerpt(
  input: unknown,
  maxChars = 120
): string {
  const md = extractProductDescriptionMarkdown(input).trim();
  if (!md) {
    return '<span class="text-on-surface-variant">No description added</span>';
  }

  const html = marked.parse(md, { async: false }) as string;
  const safe = String(DOMPurify.sanitize(html, SANITIZE));

  if (typeof document === 'undefined') {
    return `<span class="text-on-surface-variant">${DOMPurify.sanitize(
      getProductDescriptionPlainExcerpt(input, maxChars)
    )}</span>`;
  }

  const wrap = document.createElement('div');
  wrap.innerHTML = safe;

  const textLen = (wrap.textContent ?? '').length;
  if (textLen <= maxChars) {
    return DOMPurify.sanitize(wrap.innerHTML, SANITIZE);
  }

  const cut = truncateHtmlByTextBudget(wrap, maxChars);
  let out = wrap.innerHTML;
  if (cut) {
    out += '<span aria-hidden="true">…</span>';
  }
  return DOMPurify.sanitize(out, SANITIZE);
}
