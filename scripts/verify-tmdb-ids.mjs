import https from 'https';

const TOKEN = 'eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiI2NWVkYTQ4Y2Y1ODAzZjIyMzA0ZmQyMWY0ZjA2YTM1ZSIsIm5iZiI6MTc3ODY4NTg2My42ODcsInN1YiI6IjZhMDQ5N2E3N2IyZDk3NzQ2MDM3N2E1OSIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.XTD8e-B7awrTVIJd5WtD3vZ5FnWjE8sWkSjgYIeauAA';

function tmdbFetch(path) {
  return new Promise((resolve, reject) => {
    https.get(`https://api.themoviedb.org/3${path}`, {
      headers: { Authorization: `Bearer ${TOKEN}`, accept: 'application/json' }
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

async function verifyTmdbId(id, mediaType) {
  try {
    const path = `/${mediaType}/${id}?language=en-US`;
    const data = await tmdbFetch(path);
    const title = data.title || data.name || '';
    const year = (data.release_date || data.first_air_date || '').slice(0, 4);
    return { ok: true, title, year, mediaType, id };
  } catch (e) {
    return { ok: false, error: e.message, id, mediaType };
  }
}

function slugify(s) {
  return String(s || '').toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function titleMatch(dataTitle, tmdbTitle) {
  const d = slugify(dataTitle);
  const t = slugify(tmdbTitle);
  // Direct match
  if (d === t) return true;
  // Check if one contains the other (for subtitles / extended titles)
  if (d.includes(t) || t.includes(d)) return true;
  return false;
}

async function main() {
  // Load data
  const mcuModule = await import('../src/data/mcuData.js');
  const dcModule = await import('../src/data/dcData.js');
  
  const RAW = mcuModule.RAW || mcuModule.ESSENTIAL_LIST.concat(mcuModule.ADDITIONAL_LIST || []);
  const DC_RAW = dcModule.DC_RAW || [];

  // Collect all entries with tmdbId
  const entries = [];
  
  // MCU
  const mcuLists = [mcuModule.ESSENTIAL_LIST || [], mcuModule.ADDITIONAL_LIST || []];
  for (const list of mcuLists) {
    for (const item of list) {
      if (item.tmdbId) {
        const mediaType = item.type === 'series' ? 'tv' : 'movie';
        entries.push({ ...item, source: 'MCU', mediaType });
      }
    }
  }

  // DC
  for (const item of DC_RAW) {
    if (item.tmdbId) {
      const mediaType = item.type === 'series' ? 'tv' : 'movie';
      entries.push({ ...item, source: 'DC', mediaType });
    }
  }

  console.log(`Found ${entries.length} entries with tmdbId to verify\n`);

  let mismatchCount = 0;
  let okCount = 0;
  let failCount = 0;

  // Verify in batches of 5 to avoid rate limiting
  const batchSize = 5;
  for (let i = 0; i < entries.length; i += batchSize) {
    const batch = entries.slice(i, i + batchSize);
    const results = await Promise.all(batch.map(e => verifyTmdbId(e.tmdbId, e.mediaType)));
    
    for (let j = 0; j < results.length; j++) {
      const r = results[j];
      const e = batch[j];
      const idStr = String(e.id).padStart(4, ' ');
      
      if (!r.ok) {
        failCount++;
        console.log(`[${e.source}] id:${idStr}  ✗ API FAIL: ${r.error}`);
        console.log(`  Data: "${e.title}" (${e.year}) tmdbId=${e.tmdbId} [${r.mediaType}]`);
        console.log();
        continue;
      }

      const match = titleMatch(e.title, r.title);
      const yearMatch = String(e.year) === String(r.year);
      
      if (match && yearMatch) {
        okCount++;
        // console.log(`[${e.source}] id:${idStr}  ✓ "${e.title}" matches TMDB "${r.title}" (${r.year})`);
      } else {
        mismatchCount++;
        console.log(`[${e.source}] id:${idStr}  ✗ MISMATCH`);
        console.log(`  Data:  "${e.title}" (${e.year})  tmdbId=${e.tmdbId} [${e.type}]`);
        console.log(`  TMDB:  "${r.title}" (${r.year})  [${r.mediaType}]`);
        if (!match) console.log(`  → Title mismatch: slug comparison failed`);
        if (!yearMatch) console.log(`  → Year mismatch: data=${e.year} vs TMDB=${r.year}`);
        console.log();
      }
    }
    
    // Small delay between batches
    if (i + batchSize < entries.length) {
      await new Promise(r => setTimeout(r, 400));
    }
  }

  // Summary of entries WITHOUT tmdbId
  const allMcu = [...(mcuModule.ESSENTIAL_LIST || []), ...(mcuModule.ADDITIONAL_LIST || [])];
  const noTmdb = allMcu.filter(i => !i.tmdbId && i.type === 'film');
  
  console.log('═══════════════════════════════════════');
  console.log(`RESULTS: ${okCount} OK, ${mismatchCount} MISMATCHES, ${failCount} API FAILURES`);
  console.log(`Total verified: ${okCount + mismatchCount + failCount}/${entries.length}`);
  console.log();

  if (noTmdb.length > 0) {
    console.log(`Films WITHOUT tmdbId (${noTmdb.length}):`);
    noTmdb.forEach(f => console.log(`  - id:${String(f.id).padStart(4)} "${f.title}" (${f.year}) [${f.type}]`));
    console.log();
  }

  if (mismatchCount > 0 || failCount > 0) {
    process.exit(1);
  }
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
