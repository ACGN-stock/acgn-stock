import removeMd from 'remove-markdown';

export function removeMarkdown(text) {
  return removeMd(text).replace(/"/g, `''`);
}
