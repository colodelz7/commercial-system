import { marked } from 'marked';
import DOMPurify from 'dompurify';

marked.use({ breaks: true });

export function renderMarkdown(texto) {
  try {
    return DOMPurify.sanitize(marked.parse(texto || ''));
  } catch {
    return String(texto || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
}
