export const normalizeSearchText = (value = '') => value
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9\s]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

export const fuzzyIncludes = (haystack, needle) => {
  if (!needle) return true;
  if (!haystack) return false;
  if (haystack.includes(needle)) return true;
  const parts = needle.split(' ').filter(Boolean);
  if (parts.length > 1) return parts.every(part => haystack.includes(part));
  const term = parts[0] || needle;
  if (term.length < 4) return false;
  for (const token of haystack.split(' ')) {
    if (!token) continue;
    if (Math.abs(token.length - term.length) > 1) continue;
    let edits = 0;
    let i = 0; let j = 0;
    while (i < token.length && j < term.length) {
      if (token[i] === term[j]) { i += 1; j += 1; continue; }
      edits += 1;
      if (edits > 1) break;
      if (token.length > term.length) i += 1;
      else if (term.length > token.length) j += 1;
      else { i += 1; j += 1; }
    }
    edits += (token.length - i) + (term.length - j);
    if (edits <= 1) return true;
  }
  return false;
};

export const matchesSearch = (item, query, extras = {}, options = {}) => {
  const q = normalizeSearchText(query);
  if (!q) return true;
  const searchIn = {
    title: true,
    description: false,
    director: false,
    actors: false,
    prerequisites: false,
    metadata: false,
    ...options,
  };
  const corpusParts = [];
  if (searchIn.title) corpusParts.push(item.title);
  if (searchIn.description) corpusParts.push(item.desc);
  if (searchIn.prerequisites) corpusParts.push(item.prereq);
  if (searchIn.metadata) {
    corpusParts.push(item.releaseDate, item.releaseStatus, item.type, item.status, item.phase ? `phase ${item.phase}` : '');
    corpusParts.push(...(extras.connectsTo || []), extras.timelineLabel || '');
  }
  if (searchIn.director) corpusParts.push(extras.director || '');
  if (searchIn.actors) corpusParts.push(extras.actors || '');
  const corpus = normalizeSearchText([
    ...corpusParts,
  ].filter(Boolean).join(' '));
  return fuzzyIncludes(corpus, q);
};
