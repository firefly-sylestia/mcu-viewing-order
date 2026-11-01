#!/usr/bin/env node
/**
 * Fills in local posters for every title that has no image yet, and refreshes
 * multi-season shows so each season gets its own artwork.
 *
 * Source: the TMDB public title page for the season (or the film/show) already
 * recorded in the data. The page's og:image is the officially chosen poster, and
 * we request it at /original/ so the saved file is the highest resolution TMDB
 * serves.
 *
 * Usage: node scripts/fetch-posters.mjs [--force] [--only=<substring>]
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';

const ROOT = process.cwd();
const POSTER_DIR = path.join(ROOT, 'public', 'posters');
const MANIFEST = path.join(POSTER_DIR, 'posters.json');
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';
const args = process.argv.slice(2);
const FORCE = args.includes('--force');
const ONLY = args.find((arg) => arg.startsWith('--only='))?.slice('--only='.length).toLowerCase() || null;

const { RAW } = await import('../src/data/mcuData.js');
const { DC_RAW } = await import('../src/data/dcData.js');
const { XMEN_RAW } = await import('../src/data/xmenData.js');
const { SONY_RAW } = await import('../src/data/sonyData.js');

const all = [
  ...RAW.map((item) => ({ ...item, universe: 'marvel' })),
  ...DC_RAW.map((item) => ({ ...item, universe: 'dc' })),
  ...XMEN_RAW.map((item) => ({ ...item, universe: 'xmen' })),
  ...SONY_RAW.map((item) => ({ ...item, universe: 'sony' })),
];

const manifest = JSON.parse(await fs.readFile(MANIFEST, 'utf8'));
manifest.byId ??= {};
manifest.byTitle ??= {};
const files = new Set(await fs.readdir(POSTER_DIR));

const idCounts = new Map();
all.forEach((item) => idCounts.set(String(item.id), (idCounts.get(String(item.id)) || 0) + 1));

const slug = (value) => String(value)
  .toLowerCase()
  .replace(/&/g, ' and ')
  .replace(/['’.:,!/]/g, '')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')
  .slice(0, 64) || 'poster';

const existingFile = (item) => {
  const ref = manifest.byTitle?.[item.title] || manifest.byId?.[String(item.id)];
  if (!ref || /^https?:/.test(ref)) return null;
  return files.has(ref) ? ref : null;
};

const pageUrl = (item) => {
  if (!item.tmdbId) return null;
  const title = String(item.title).toLowerCase();
  if (item.type === 'series') {
    // Slingshot is a web spinoff with no season artwork of its own.
    if (title.includes('slingshot')) return `https://www.themoviedb.org/tv/${item.tmdbId}`;
    return item.season
      ? `https://www.themoviedb.org/tv/${item.tmdbId}/season/${item.season}`
      : `https://www.themoviedb.org/tv/${item.tmdbId}`;
  }
  return `https://www.themoviedb.org/movie/${item.tmdbId}`;
};

const extractPoster = (html) => {
  const og = html.match(/<meta[^>]+(?:property|name)=["']og:image["'][^>]+content=["']([^"']+)["']/i)
    || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']og:image["']/i);
  let url = og?.[1] || null;
  if (!url) {
    const found = [...html.matchAll(/https:\/\/(?:image|media)\.themoviedb\.org\/t\/p\/[^"'\s\\]+\.(?:jpg|jpeg|png|webp)/gi)].map((m) => m[0]);
    url = found.find((candidate) => !/logo|backdrop/i.test(candidate)) || found[0] || null;
  }
  if (!url) return null;
  return url.replace(/\/t\/p\/[^/]+\//, '/t/p/original/');
};

const looksLikeImage = (buffer) => {
  const hex = buffer.subarray(0, 12).toString('hex');
  return hex.startsWith('ffd8ff') // jpeg
    || hex.startsWith('89504e470d0a1a0a') // png
    || buffer.subarray(0, 4).toString() === 'RIFF' && buffer.subarray(8, 12).toString() === 'WEBP';
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/* TMDB sits behind a bot filter that rejects Node's fetch fingerprint, so every
   request goes through curl with a normal browser header set. */
const curlFetch = (url, outFile) => new Promise((resolve) => {
  const args = ['-sL', '--max-time', '45', '-A', UA, '-H', 'Accept: text/html,application/xhtml+xml,*/*;q=0.8'];
  if (outFile) args.push('-o', outFile);
  args.push('-w', '%{http_code}', url);
  execFile('curl', args, { maxBuffer: 32 * 1024 * 1024, encoding: 'utf8' }, (error, stdout) => {
    if (error) return resolve({ status: 0, body: '', error: error.message });
    resolve({ status: Number(stdout.trim().slice(-3)) || 0, body: outFile ? '' : stdout });
  });
});

const tempFile = (name) => path.join(POSTER_DIR, `.tmp-${process.pid}-${name}`);

const cleanTitle = (value) => String(value)
  .replace(/\bS\d+\s*(?:&|and)\s*S\d+\b/gi, ' ')
  .replace(/\bS\d+\b/gi, ' ')
  .replace(/\bSeason\s*\d+\b/gi, ' ')
  .replace(/\bEps?\b[\s\S]*$/i, ' ')
  .replace(/\s{2,}/g, ' ')
  .trim();

/* When the recorded TMDB id no longer resolves, look the title up on the site
   and take the first hit that actually has a poster. */
async function searchCandidates(item) {
  const kind = item.type === 'series' ? 'tv' : 'movie';
  const query = encodeURIComponent(cleanTitle(item.title));
  const result = await curlFetch(`https://www.themoviedb.org/search/${kind}?query=${query}`);
  if (result.status !== 200) return [];
  const ids = [...result.body.matchAll(/href="\/(?:tv|movie)\/(\d+)(?:-[^"?#]*)?"/g)].map((m) => m[1]);
  const unique = [...new Set(ids)];
  return unique.slice(0, 4);
}

const pageYear = (html) => Number(html.match(/release_date">\((\d{4})\)/)?.[1] || html.match(/first_air_date">\((\d{4})\)/)?.[1] || 0);

/* Announced films have no id in the data, so they are matched by title and only
   accepted when the page's release year agrees with the entry. */
async function fetchBySearch(item) {
  const kind = item.type === 'series' ? 'tv' : 'movie';
  for (const candidate of await searchCandidates(item)) {
    const candidatePage = `https://www.themoviedb.org/${kind}/${candidate}`;
    const result = await curlFetch(candidatePage);
    if (result.status !== 200) continue;
    const year = pageYear(result.body);
    if (!year || Math.abs(year - Number(item.year || year)) > 1) continue;
    const imageUrl = extractPoster(result.body);
    if (!imageUrl) continue;
    return { imageUrl, page: candidatePage };
  }
  return null;
}

async function fetchPoster(item, attempt = 1) {
  const page = pageUrl(item);
  if (!page) {
    const found = await fetchBySearch(item);
    if (!found) return { skipped: 'no matching page' };
    return savePoster(item, found.imageUrl, found.page);
  }
  const pageResult = await curlFetch(page);
  let imageUrl = pageResult.status === 200 ? extractPoster(pageResult.body) : null;
  let resolvedFrom = page;
  if (!imageUrl) {
    if (pageResult.status === 0 && attempt < 3) { await sleep(900 * attempt); return fetchPoster(item, attempt + 1); }
    const kind = item.type === 'series' ? 'tv' : 'movie';
    for (const candidate of await searchCandidates(item)) {
      const candidatePage = item.type === 'series' && item.season && !String(item.title).toLowerCase().includes('slingshot')
        ? `https://www.themoviedb.org/${kind}/${candidate}/season/${item.season}`
        : `https://www.themoviedb.org/${kind}/${candidate}`;
      const candidateResult = await curlFetch(candidatePage);
      if (candidateResult.status !== 200) continue;
      imageUrl = extractPoster(candidateResult.body);
      if (imageUrl) { resolvedFrom = candidatePage; break; }
    }
    if (!imageUrl) return { skipped: pageResult.status === 200 ? 'no poster in page' : `page ${pageResult.status}` };
  }

  return savePoster(item, imageUrl, resolvedFrom);
}

async function savePoster(item, imageUrl, resolvedFrom) {
  const ext = imageUrl.toLowerCase().endsWith('.png') ? 'png' : imageUrl.toLowerCase().endsWith('.webp') ? 'webp' : 'jpg';
  const fileName = existingFile(item) || `${String(item.id).padStart(3, '0')}-${slug(item.title)}.${ext}`;
  const tmp = tempFile(fileName);
  const imageResult = await curlFetch(imageUrl, tmp);
  if (imageResult.status !== 200) { await fs.rm(tmp, { force: true }); return { skipped: `image ${imageResult.status}` }; }
  const buffer = await fs.readFile(tmp);
  if (!looksLikeImage(buffer) || buffer.length < 5000) { await fs.rm(tmp, { force: true }); return { skipped: 'not an image' }; }
  await fs.rename(tmp, path.join(POSTER_DIR, fileName));
  files.add(fileName);

  const idKey = String(item.id);
  if (idCounts.get(idKey) === 1) manifest.byId[idKey] = fileName;
  manifest.byTitle[item.title] = fileName;
  return { fileName, bytes: buffer.length, page: resolvedFrom };
}

const tasks = all.filter((item) => {
  if (ONLY && !String(item.title).toLowerCase().includes(ONLY)) return false;
  if (FORCE) return Boolean(item.tmdbId) || Boolean(item.year);
  const isShield = String(item.title).toLowerCase().startsWith('agents of shield');
  if (isShield) return true; // seasons were all sharing one image
  return !existingFile(item);
});

console.log(`${tasks.length} posters to fetch${FORCE ? ' (forced)' : ''}`);

const queue = [...tasks];
let done = 0;
let failed = 0;
const failures = [];

async function worker() {
  while (queue.length) {
    const item = queue.shift();
    const label = `${item.universe}/${item.type} ${item.title}${item.season ? ` S${item.season}` : ''}`;
    try {
      const result = await fetchPoster(item);
      done += 1;
      if (result.fileName) console.log(`ok   ${label} -> ${result.fileName} (${Math.round(result.bytes / 1024)} KB)`);
      else { failed += 1; failures.push(`${label}: ${result.skipped}`); console.log(`skip ${label} (${result.skipped})`); }
    } catch (error) {
      failed += 1;
      failures.push(`${label}: ${error.message}`);
      console.log(`fail ${label} (${error.message})`);
    }
    await sleep(120);
  }
}

await Promise.all(Array.from({ length: 3 }, worker));

await fs.writeFile(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`\nfinished: ${done} fetched, ${failed} skipped/failed`);
if (failures.length) console.log(failures.join('\n'));
