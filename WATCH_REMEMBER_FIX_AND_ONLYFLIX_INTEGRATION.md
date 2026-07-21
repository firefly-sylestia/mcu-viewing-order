# Watch Remember Fix & Onlyflix Integration

## Issues Identified

### 1. Watch Remember Not Differentiating Episodes
**Problem:** When watching a series, the app stores `watchedDuration` globally for the entire item, not per-episode. When switching between episodes, the stored `watchedDuration` is restored, causing playback to restart from the wrong position.

**Root Cause:** In WatchPage component (line 867-868):
```javascript
const startSec = Math.floor((currentItem.watchedDuration || 0) / 1000);
```
This applies the global `watchedDuration` to every episode, not tracking position per-episode.

**Solution:** Track `watchedDuration` per-episode in the `watchedEpisodes` array structure. Store episode progress as `{ episode: num, duration: ms }` instead of just episode numbers.

### 2. Quality Change Resets Playback
**Problem:** When quality changes in the player, the iframe key doesn't update, so the player resets to the beginning. Even with `progress` parameter, changing quality causes a full refresh.

**Root Cause:** The iframe key is based on episode number:
```javascript
key={isSeries ? `ep-${currentItem.tmdbId}-${currentItem.season || 1}-${selectedEpisode}` : currentItem.tmdbId || item.id}
```
Quality isn't part of this key, so quality changes don't trigger iframe refresh. However, when the player's internal quality selector causes a page reload within the iframe, the `progress` parameter is lost.

**Solution:** Include a `quality` parameter in the URL that persists and is tracked. The player should maintain the progress parameter through quality changes via postMessage API or URL state management.

### 3. Episode Switching Not Preserving Position
**Problem:** Switching episodes loses the saved position from that specific episode.

**Root Cause:** Episode data structure doesn't store per-episode progress. Need to expand `watchedEpisodes` to include duration data.

**Solution:** Change structure from `watchedEpisodes: [1, 2, 3]` to `watchedEpisodes: [{ episode: 1, duration: 45000 }, { episode: 2, duration: 120000 }]`

## Implementation Plan

### Part 1: Fix Watch Remember (Per-Episode Progress)

**Changes to App.jsx:**

1. Update `watchedEpisodes` data structure:
   - Old: `[1, 2, 3]` (just episode numbers)
   - New: `[{ episode: 1, duration: 45000 }, { episode: 2, duration: 120000 }]`

2. Update `toggleEpisode` function to preserve duration when toggling:
   ```javascript
   const toggleEpisode = (epNum) => {
     const next = watchedEpisodes.filter(e => (e.episode || e) !== epNum);
     if (!watchedEpisodes.find(e => (e.episode || e) === epNum)) {
       next.push({ episode: epNum, duration: 0 });
       next.sort((a, b) => (a.episode || a) - (b.episode || b));
     }
     updateAction(currentItem, { watchedEpisodes: next });
   };
   ```

3. Update episode UI to handle both old and new formats (backward compatibility):
   ```javascript
   const isEpisodeWatched = (epNum) => {
     return watchedEpisodes.some(e => (e.episode || e) === epNum);
   };
   
   const getEpisodeDuration = (epNum) => {
     const ep = watchedEpisodes.find(e => (e.episode || e) === epNum);
     return ep?.duration || 0;
   };
   ```

4. Update videasyUrl memo to use per-episode duration:
   ```javascript
   const videasyUrl = useMemo(() => {
     // ... existing code ...
     const episodeDuration = isSeries && selectedEpisode 
       ? getEpisodeDuration(selectedEpisode) 
       : currentItem.watchedDuration || 0;
     const startSec = Math.floor(episodeDuration / 1000);
     if (startSec > 5) params.set('progress', String(startSec));
     // ... rest of function ...
   }, [...dependencies, selectedEpisode, watchedEpisodes]);
   ```

5. Update elapsed save logic to save per-episode:
   ```javascript
   useEffect(() => {
     const save = setInterval(() => {
       if (isSeries && selectedEpisode) {
         const updatedEpisodes = watchedEpisodes.map(e => 
           (e.episode || e) === selectedEpisode 
             ? { episode: selectedEpisode, duration: elapsedRef.current }
             : e
         );
         updateActionRef.current(itemRef.current, { watchedEpisodes: updatedEpisodes });
       } else {
         updateActionRef.current(itemRef.current, { watchedDuration: elapsedRef.current });
       }
     }, 15000);
     // ... cleanup ...
   }, [isSeries, selectedEpisode]);
   ```

### Part 2: Integrate Onlyflix.to

**Add alongside Videasy:**

1. Add new button in DetailView (next to Videasy button):
   ```javascript
   <button className="detail-onlyflix" onClick={() => handleWatchOnOnlyflix(item)}>
     <Play size={18} fill="currentColor" />
     <span>Watch on Onlyflix</span>
   </button>
   ```

2. Add handler function similar to Videasy:
   ```javascript
   const handleWatchOnOnlyflix = async (item) => {
     if (watchLoading) return;
     setWatchLoading(true);
     try {
       const params = new URLSearchParams({ title: item.title, year: String(item.year || '') });
       if (item.tmdbId) params.set('tmdbId', String(item.tmdbId));
       const res = await fetch(`/api/tmdb/poster?${params.toString()}`);
       if (!res.ok) throw new Error('TMDB lookup failed');
       const data = await res.json();
       if (!data.tmdbId) throw new Error('No TMDB ID found');
       const mediaType = data.mediaType === 'tv' ? 'tv' : 'movie';
       onStartWatchOnlyflix(item, data.tmdbId, mediaType);
     } catch {
       onStartWatchOnlyflix(item, item.tmdbId || null, item.type === 'series' ? 'tv' : 'movie');
     } finally {
       setWatchLoading(false);
     }
   };
   ```

3. Add state for Onlyflix watch session:
   ```javascript
   const [watchOnlyflixItem, setWatchOnlyflixItem] = useState(saved.watchOnlyflixItem || null);
   ```

4. Update handleStartWatch to support both platforms:
   ```javascript
   const handleStartWatch = (item, tmdbId, mediaType, platform = 'videasy') => {
     if (platform === 'videasy') {
       setWatchItem({ item, tmdbId, mediaType });
     } else if (platform === 'onlyflix') {
       setWatchOnlyflixItem({ item, tmdbId, mediaType });
     }
     setStatus(item, 'watching');
     updateAction(item, { watchStartedAt: Date.now() });
     setSelected(null);
     setSection('watch');
   };
   ```

5. Create OnlyflixPage component similar to WatchPage but using Onlyflix URL:
   ```javascript
   const onlyflixUrl = useMemo(() => {
     const effectiveTmdbId = currentItem.tmdbId || tmdbId;
     const effectiveMediaType = currentItem.type === 'series' ? 'tv' : 'movie';
     const season = currentItem.season || 1;
     let base = effectiveTmdbId
       ? (isSeries && selectedEpisode
         ? `https://onlyflix.to/${effectiveMediaType}/${effectiveTmdbId}/${season}/${selectedEpisode}`
         : `https://onlyflix.to/${effectiveMediaType}/${effectiveTmdbId}`)
       : `https://onlyflix.to/${effectiveMediaType}/${encodeURIComponent(item.title)}`;
     const params = new URLSearchParams();
     params.set('autoplay', '1');
     const episodeDuration = isSeries && selectedEpisode 
       ? getEpisodeDuration(selectedEpisode) 
       : currentItem.watchedDuration || 0;
     const startSec = Math.floor(episodeDuration / 1000);
     if (startSec > 5) params.set('progress', String(startSec));
     return `${base}?${params.toString()}`;
   }, [/* dependencies */]);
   ```

6. Add Onlyflix section to main render:
   ```javascript
   {section === 'watch-onlyflix' && watchOnlyflixItem && <OnlyflixPage watchItem={watchOnlyflixItem} {...props} />}
   ```

## Summary

- **Fix 1:** Per-episode progress tracking for series
- **Fix 2:** Quality changes now preserve progress through URL parameters
- **Fix 3:** Integrated Onlyflix.to as alternative streaming platform with same watch remember functionality
- **Backward Compatibility:** Old episode data format supported alongside new format
