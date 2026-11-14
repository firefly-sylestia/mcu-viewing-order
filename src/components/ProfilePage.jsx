import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Play, Bookmark, RotateCcw, Clock, Check, X, Pencil, Trophy, LogIn, LogOut, Cloud, RefreshCw, Sun, Moon, Settings, Upload, Download, Clapperboard, Sparkles, LayoutGrid, Vibrate, ChevronDown, Maximize2, UserRound, } from 'lucide-react';
import { getHapticsEnabled, setHapticsEnabled, hapticsSupported, hapticTap, hapticSuccess } from '../utils/haptics';

Profile variant helperfunction applyBrowserTheme(theme) {
  const isDark = theme === 'dark';
  const color = isDark ? '#111318' : '#ffffff';
  document.documentElement.setAttribute('data-theme', theme);
  document.documentElement.style.colorScheme = theme;
  // Recreate the meta node instead of mutating it: Chromium-based installed
  // PWAs can miss runtime updates to an existing theme-color element.
  const previousMeta = document.querySelector('meta[name="theme-color"]');
  const themeMeta = document.createElement('meta');
  themeMeta.name = 'theme-color';
  themeMeta.content = color;
  if (previousMeta) previousMeta.replaceWith(themeMeta);
  else document.head.appendChild(themeMeta);
  // Keep the edge-to-edge system area backed by the exact same opaque color.
  document.documentElement.style.backgroundColor = color;
  document.body.style.backgroundColor = color;
  document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]')?.setAttribute('content', isDark ? 'black-translucent' : 'default');
}

function useAppTheme() {
  const [theme, setThemeState] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('theme');
      const resolved = stored || document.documentElement.getAttribute('data-theme') || 'light';
      applyBrowserTheme(resolved);
      return resolved;
    }
    return 'light';
  });

  const setTheme = (newTheme) => {
    applyBrowserTheme(newTheme);
    try { localStorage.setItem('theme', newTheme); } catch {}
    setThemeState(newTheme);
  };

  return { theme, setTheme };
}

const formatTimeAgo = (timestamp) => {
  if (!timestamp) return '';
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 10) return 'Synced now';
  if (seconds < 60) return 'Synced ' + seconds + 's ago';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return 'Synced ' + minutes + 'm ago';
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return 'Synced ' + hours + 'h ago';
  return 'Synced ' + Math.floor(hours / 24) + 'd ago';
};

function ProfilePage({ pageHeader, setActiveTab, installApp, installAvailable, appInstalled, stats, activeItems, universe, activeTab = 'insights', query = '', setSelected, cycleStatus, setStatus, toggleBookmark, playTrailer, profileName, setProfileName, user, configured, onLogin, onLogout, lastSynced, syncing, onSync, conflict, onResolveRemote, onResolveLocal, syncToast, nativePlayer, setNativePlayer, incursionAtmosphereOn = false, setIncursionAtmosphereOn, liquidGlassNavOn = false, setLiquidGlassNavOn, liquidGlassNavConfig, setLiquidGlassNavConfig }) {
  
  const savedItems = activeItems.filter(i => i.bookmarked);
  const inProgressItems = activeItems.filter(i => i.userStatus === 'watching');
  const watchedItems = activeItems.filter(i => i.userStatus === 'watched');
  const droppedItems = activeItems.filter(i => i.userStatus === 'dropped');

  return (
    <div className="profile-page">
      {pageHeader}
      <nav className="profile-page-tabs shared-switcher" role="tablist" aria-label="Profile sections">
        {['insights', 'saved', 'settings'].map(tab => <button key={tab} type="button" role="tab" aria-selected={activeTab === tab} className={activeTab === tab ? 'active' : ''} onClick={() => setActiveTab?.(tab)}>{tab === 'insights' ? 'Insights' : tab === 'saved' ? 'Saved' : 'Settings'}</button>)}
      </nav>
      {/* Sync Toast */}
      {syncToast?.type === 'error' && (
        <div className={`sync-toast ${syncToast.type === 'error' ? 'sync-toast-error' : ''}`}>
          {syncToast.type === 'error' ? '⚠️' : '✓'} {syncToast.message}
        </div>
      )}
      
      {/* Conflict Resolution */}
      {conflict && (
        <div className="sync-conflict-banner">
          <div className="sync-conflict-icon">⚠️</div>
          <div className="sync-conflict-body">
            <strong>Sync Conflict</strong>
            <p>Your data has changed on another device. Which version would you like to keep?</p>
          </div>
          <div className="sync-conflict-actions">
            <button className="sync-conflict-btn primary" onClick={onResolveRemote}>Use Cloud</button>
            <button className="sync-conflict-btn" onClick={onResolveLocal}>Keep Mine</button>
          </div>
        </div>
      )}
      
      {/* Tab Content */}
      <div className="profile-tab-content">
        {activeTab === 'insights' && (
          <div id="insights-panel" role="tabpanel" className="profile-panel insights-panel">
            <AnalyticsPanel stats={stats} activeItems={activeItems} inProgressItems={inProgressItems} profileName={profileName} user={user} />
            {inProgressItems.some(i => !query || i.title.toLowerCase().includes(query.toLowerCase())) && <MovieRail title="In progress" items={inProgressItems.filter(i => !query || i.title.toLowerCase().includes(query.toLowerCase()))} setSelected={setSelected} cycleStatus={cycleStatus} setStatus={setStatus} toggleBookmark={toggleBookmark} playTrailer={playTrailer} />}
            {watchedItems.some(i => !query || i.title.toLowerCase().includes(query.toLowerCase())) && <MovieRail title="Watched" items={watchedItems.filter(i => !query || i.title.toLowerCase().includes(query.toLowerCase()))} setSelected={setSelected} cycleStatus={cycleStatus} setStatus={setStatus} toggleBookmark={toggleBookmark} playTrailer={playTrailer} />}
            {droppedItems.some(i => !query || i.title.toLowerCase().includes(query.toLowerCase())) && <MovieRail title="Dropped" items={droppedItems.filter(i => !query || i.title.toLowerCase().includes(query.toLowerCase()))} setSelected={setSelected} cycleStatus={cycleStatus} setStatus={setStatus} toggleBookmark={toggleBookmark} playTrailer={playTrailer} />}
            {savedItems.some(i => !query || i.title.toLowerCase().includes(query.toLowerCase())) && <MovieRail title="Bookmarked" items={savedItems.filter(i => !query || i.title.toLowerCase().includes(query.toLowerCase()))} setSelected={setSelected} cycleStatus={cycleStatus} setStatus={setStatus} toggleBookmark={toggleBookmark} playTrailer={playTrailer} />}
          </div>
        )}

        {activeTab === 'saved' && (
          <div id="saved-panel" role="tabpanel" className="profile-panel saved-panel">
            <MovieRail
              title="Saved titles"
              items={savedItems.filter(i => !query || i.title.toLowerCase().includes(query.toLowerCase()))}
              setSelected={setSelected}
              cycleStatus={cycleStatus}
              setStatus={setStatus}
              toggleBookmark={toggleBookmark}
              playTrailer={playTrailer}
              empty="No saved titles yet. Tap bookmarks on any card."
            />
          </div>
        )}

        {activeTab === 'settings' && (
          <div id="settings-panel" role="tabpanel" className="profile-panel settings-panel">
            <SettingsPanel installApp={installApp} installAvailable={installAvailable} appInstalled={appInstalled} query={query} profileName={profileName} setProfileName={setProfileName} user={user} configured={configured} onLogin={onLogin} onLogout={onLogout} universe={universe} activeItems={activeItems} setStatus={setStatus} toggleBookmark={toggleBookmark} nativePlayer={nativePlayer} setNativePlayer={setNativePlayer} incursionAtmosphereOn={incursionAtmosphereOn} setIncursionAtmosphereOn={setIncursionAtmosphereOn} liquidGlassNavOn={liquidGlassNavOn} setLiquidGlassNavOn={setLiquidGlassNavOn} liquidGlassNavConfig={liquidGlassNavConfig} setLiquidGlassNavConfig={setLiquidGlassNavConfig} />
          </div>
        )}
      </div>
    </div>
  );
}

export function ProfileHeader({ universe, stats, profileName, setProfileName, user, onLogin, onLogout, watchingItem, nextUp, onSelectItem, syncing = false, lastSynced, onSync }) {
  const [confirmingLogout, setConfirmingLogout] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(profileName || user?.displayName || '');
  const [avatarDialogOpen, setAvatarDialogOpen] = useState(false);
  const [avatarFullscreen, setAvatarFullscreen] = useState(false);
  const [localAvatar, setLocalAvatar] = useState(() => { try { return localStorage.getItem('incursion-profile-avatar') || ''; } catch { return ''; } });
  const avatarInput = useRef(null);
  const universeName = universe === 'all' ? 'Multiverse' : universe === 'marvel' ? 'MCU' : universe === 'xmen' ? 'X-Men' : universe === 'sony' ? 'Sony' : 'DC';
  const displayName = (profileName || user?.displayName || user?.email?.split('@')[0] || `${universeName} Viewer`).trim();
  const avatarInitial = (displayName[0] || universeName[0]).toUpperCase();

  const handleAvatar = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { event.target.value = ''; return; }
    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        const canvas = document.createElement('canvas');
        const scale = Math.min(1, 384 / Math.max(image.width, image.height));
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
        const data = canvas.toDataURL('image/jpeg', 0.82);
        try { localStorage.setItem('incursion-profile-avatar', data); setLocalAvatar(data); }
        catch { window.alert('This image is too large for local browser storage. Try a smaller photo.'); }
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  const clearAvatar = () => {
    try { localStorage.removeItem('incursion-profile-avatar'); } catch {}
    setLocalAvatar('');
  };

  const saveDisplayName = () => {
    const nextName = nameDraft.trim().slice(0, 30);
    if (nextName) setProfileName?.(nextName);
    setNameDraft(nextName || displayName);
    setEditingName(false);
  };

  return (
    <div className={`profile-header profile-header-compact ${confirmingLogout ? "logout-confirming" : ""}`}>
      {(localAvatar || user?.photoURL) && <div className="profile-avatar-backdrop" aria-hidden="true"><img src={localAvatar || user.photoURL} alt="" /></div>}
      <button type="button" className="profile-avatar profile-avatar-edit" onClick={() => setAvatarDialogOpen(true)} aria-label="View profile picture" title="Profile picture">
        {localAvatar || user?.photoURL ? <img src={localAvatar || user.photoURL} alt="" referrerPolicy="no-referrer" /> : <span className="avatar-initials">{avatarInitial}</span>}
      </button>
      <input ref={avatarInput} className="profile-avatar-input" type="file" accept="image/*" onChange={handleAvatar} />
      {avatarDialogOpen && typeof document !== 'undefined' && createPortal((
        <div className="avatar-dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) { setAvatarDialogOpen(false); setAvatarFullscreen(false); } }}>
          <section className={`avatar-dialog ${avatarFullscreen ? 'avatar-dialog-fullscreen' : ''}`} role="dialog" aria-modal="true" aria-label="Profile picture">
            <button type="button" className="avatar-dialog-close" onClick={() => { setAvatarDialogOpen(false); setAvatarFullscreen(false); }} aria-label="Close profile picture dialog"><X size={18} /></button>
            <div className="avatar-dialog-preview">
              {localAvatar || user?.photoURL
                ? <img src={localAvatar || user.photoURL} alt="Profile" referrerPolicy="no-referrer" />
                : <span className="avatar-dialog-initial">{avatarInitial}</span>}
            </div>
            <div className="avatar-dialog-copy">
              {editingName ? (
                <form className="avatar-name-edit" onSubmit={(event) => { event.preventDefault(); saveDisplayName(); }}>
                  <input autoFocus value={nameDraft} onChange={(event) => setNameDraft(event.target.value)} maxLength={30} aria-label="Display name" placeholder="Your name" />
                  <button type="submit" disabled={!nameDraft.trim()}>Save</button>
                  <button type="button" className="avatar-name-cancel" onClick={() => { setNameDraft(displayName); setEditingName(false); }}>Cancel</button>
                </form>
              ) : (
                <><strong>{displayName}</strong><button type="button" className="avatar-name-edit-trigger" onClick={() => { setNameDraft(displayName); setEditingName(true); }}><Pencil size={13} /> Edit name</button></>
              )}
              <span>{localAvatar ? 'Saved on this device' : user?.photoURL ? 'Profile picture' : 'Choose a photo for your profile'}</span>
            </div>
            <div className="avatar-dialog-actions">
              <div className="avatar-photo-actions">
                <button type="button" onClick={() => avatarInput.current?.click()}><Pencil size={16} /><span>{localAvatar || user?.photoURL ? 'Edit photo' : 'Add photo'}</span></button>
                {localAvatar && <button type="button" className="avatar-dialog-remove" onClick={clearAvatar} aria-label="Remove profile picture" title="Remove profile picture"><X size={17} /></button>}
              </div>
              {(localAvatar || user?.photoURL) && <button type="button" onClick={() => setAvatarFullscreen(value => !value)}><Maximize2 size={16} /><span>{avatarFullscreen ? 'Fit preview' : 'Full screen'}</span></button>}
            </div>
          </section>
        </div>
      ), document.body)}
      <div className="profile-info">
        <span className="profile-brand-kicker">Incursion</span>
        <h1 className="profile-title">{displayName}</h1>
      </div>
      {(watchingItem || nextUp) && <button className={`profile-next-up ${watchingItem ? 'watching' : ''}`} onClick={() => onSelectItem?.(watchingItem || nextUp)} title={`Open ${watchingItem ? 'current' : 'next'}: ${(watchingItem || nextUp).title}`}>
        <span className="profile-next-up-art">{(watchingItem || nextUp).poster ? <img src={(watchingItem || nextUp).poster} alt="" loading="lazy" referrerPolicy="no-referrer" /> : <Play size={13} />}</span>
        <span className="profile-next-up-copy"><small>{watchingItem ? 'Watching now' : 'Up next'}</small><strong>{(watchingItem || nextUp).title}</strong></span>
      </button>}
      <div className="profile-auth">
        {user && <button className="sync-now-btn profile-sync-icon" onClick={onSync} disabled={syncing} aria-label={syncing ? 'Syncing progress' : 'Sync progress now'} title={lastSynced ? `Last synced ${formatTimeAgo(lastSynced)}` : 'Sync progress'}><RefreshCw size={16} className={syncing ? 'spinning' : ''} /></button>}
        {user ? (
          confirmingLogout ? (
            <div className="profile-auth-confirm" role="group" aria-label="Confirm sign out">
              <span>Sign out?</span>
              <button className="confirm-yes" onClick={() => { onLogout(); setConfirmingLogout(false); }}>Yes</button>
              <button className="confirm-no" onClick={() => setConfirmingLogout(false)}>No</button>
            </div>
          ) : (
            <button className="profile-auth-btn signed-in" onClick={() => setConfirmingLogout(true)} aria-label="Sign out" title="Sign out"><LogOut size={17} /></button>
          )
        ) : (
          <button className="profile-auth-btn sign-in" onClick={onLogin} aria-label="Sign in" title="Sign in"><LogIn size={17} /></button>
        )}
      </div>
    </div>
  );
}

function SettingsPanel({ installApp, installAvailable, appInstalled, query = '', profileName, setProfileName, user, configured, onLogin, onLogout, universe, activeItems, setStatus, toggleBookmark, nativePlayer, setNativePlayer, incursionAtmosphereOn = false, setIncursionAtmosphereOn, liquidGlassNavOn = false, setLiquidGlassNavOn, liquidGlassNavConfig = {}, setLiquidGlassNavConfig }) {
  const search = query.trim().toLowerCase();
  const showGroup = (terms) => !search || terms.includes(search);
  const { theme, setTheme } = useAppTheme();
  const [topAtmosphereOn, setTopAtmosphereOn] = useState(() => {
    try { return localStorage.getItem('top-atmosphere') !== '0'; } catch { return true; }
  });
  useEffect(() => {
    document.documentElement.setAttribute('data-top-atmosphere', topAtmosphereOn ? 'on' : 'off');
    try { localStorage.setItem('top-atmosphere', topAtmosphereOn ? '1' : '0'); } catch {}
  }, [topAtmosphereOn]);
  const [hapticsOn, setHapticsOn] = useState(() => getHapticsEnabled());
  const [performanceModeOn, setPerformanceModeOn] = useState(() => {
    try { return localStorage.getItem('performance-mode') === '1'; } catch { return false; }
  });
  const [mounted, setMounted] = useState(false);
  const [draft, setDraft] = useState(profileName);
  const [editing, setEditing] = useState(false);
  const inputRef = useRef(null);
  const [confirmingLogout, setConfirmingLogout] = useState(false);
  const [liquidGlassDialogOpen, setLiquidGlassDialogOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
    document.documentElement.classList.toggle('performance-mode', performanceModeOn);
  }, [performanceModeOn]);

  const updatePerformanceMode = (enabled) => {
    setPerformanceModeOn(enabled);
    document.documentElement.classList.toggle('performance-mode', enabled);
    try { localStorage.setItem('performance-mode', enabled ? '1' : '0'); } catch {}
  };

  const saveName = () => {
    const trimmed = draft.trim();
    if (trimmed) {
      setProfileName(trimmed);
      setDraft(trimmed);
    }
    setEditing(false);
  };

  if (!mounted) return null;

  return (
    <div className="settings-section">
      {/* Theme Toggle */}
      <div className="settings-group" hidden={!showGroup('appearance theme interface haptics dark light layout vibration liquid glass navigation reflection refraction')}>
        <h3 className="settings-group-title">Appearance</h3>
        <div className="settings-row">
          <div className="settings-row-label">
            <span className="settings-row-icon">{theme === 'dark' ? <Moon size={18} /> : <Sun size={18} />}</span>
            <div>
              <strong>Theme</strong>
              <small>{theme === 'dark' ? 'Dark mode' : 'Light mode'}</small>
            </div>
          </div>
          <button
            className="theme-toggle"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            <span className={`theme-toggle-track ${theme === 'dark' ? 'dark' : 'light'}`}>
              <span className="theme-toggle-thumb">
                {theme === 'dark' ? <Moon size={14} /> : <Sun size={14} />}
              </span>
            </span>
          </button>
        </div>
        <div className="settings-row">
          <div className="settings-row-label">
            <span className="settings-row-icon"><Sparkles size={18} /></span>
            <div>
              <strong>Top atmosphere</strong>
              <small>{topAtmosphereOn ? 'Blurred poster fade behind the header' : 'Standard page background'}</small>
            </div>
          </div>
          <button
            className="theme-toggle"
            role="switch"
            aria-checked={topAtmosphereOn}
            onClick={() => { hapticTap(); setTopAtmosphereOn(value => !value); }}
            aria-label={`Turn top atmosphere ${topAtmosphereOn ? 'off' : 'on'}`}
          >
            <span className={`theme-toggle-track ${topAtmosphereOn ? 'dark' : 'light'}`}>
              <span className="theme-toggle-thumb"><Sparkles size={14} /></span>
            </span>
          </button>
        </div>
        <div className="settings-row">
          <div className="settings-row-label">
            <span className="settings-row-icon"><Sparkles size={18} /></span>
            <div>
              <strong>Incursion atmosphere</strong>
              <small>{incursionAtmosphereOn ? 'Soft cinematic fade blended into the page background' : 'Off · clean, borderless header'}</small>
            </div>
          </div>
          <button
            className="theme-toggle"
            role="switch"
            aria-checked={incursionAtmosphereOn}
            onClick={() => { hapticTap(); setIncursionAtmosphereOn?.(value => !value); }}
            aria-label={`Turn Incursion atmosphere ${incursionAtmosphereOn ? 'off' : 'on'}`}
          >
            <span className={`theme-toggle-track ${incursionAtmosphereOn ? 'dark' : 'light'}`}>
              <span className="theme-toggle-thumb"><Sparkles size={14} /></span>
            </span>
          </button>
        </div>
        <div className="settings-row liquid-glass-settings-row">
          <div className="settings-row-label">
            <span className="settings-row-icon"><Sparkles size={18} /></span>
            <div>
              <strong>Liquid Glass navigation</strong>
              <small>{liquidGlassNavOn ? "Real-time refraction and elastic glass enabled" : "Your standard navigation stays unchanged"}</small>
            </div>
          </div>
          <div className="liquid-glass-row-actions">
            <button className="liquid-glass-customize" type="button" onClick={() => setLiquidGlassDialogOpen(true)}>Customize</button>
            <button className="theme-toggle" role="switch" aria-checked={liquidGlassNavOn}
              onClick={() => { hapticTap(); setLiquidGlassNavOn?.(value => !value); }}
              aria-label={"Turn Liquid Glass navigation " + (liquidGlassNavOn ? "off" : "on")}>
              <span className={"theme-toggle-track " + (liquidGlassNavOn ? "dark" : "light")}>
                <span className="theme-toggle-thumb"><Sparkles size={14} /></span>
              </span>
            </button>
          </div>
        </div>
        {liquidGlassDialogOpen && (
          <div className="liquid-glass-dialog-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setLiquidGlassDialogOpen(false); }}>
            <section className="liquid-glass-dialog" role="dialog" aria-modal="true" aria-labelledby="liquid-glass-dialog-title">
              <header className="liquid-glass-dialog-head">
                <div><span className="liquid-glass-dialog-kicker">Navigation appearance</span><h2 id="liquid-glass-dialog-title">Liquid Glass</h2><p>Shape the refraction, clarity and movement of your navigation.</p></div>
                <button type="button" className="liquid-glass-dialog-close" onClick={() => setLiquidGlassDialogOpen(false)} aria-label="Close"><X size={19} /></button>
              </header>
              <div className="liquid-glass-preview"><span className="liquid-glass-preview-shine" /><span className="liquid-glass-preview-icons">⌂　▤　▥　◉</span><small>{liquidGlassNavOn ? 'Live effect enabled' : 'Preview · enable to apply'}</small></div>
              <div className="liquid-glass-mode-picker" role="group" aria-label="Refraction style">
                {[{id:'clear',label:'Clear'},{id:'standard',label:'Classic'},{id:'polar',label:'Prismatic'},{id:'prominent',label:'Sculpted'}].map(option => <button type="button" key={option.id} className={liquidGlassNavConfig.mode === option.id ? 'active' : ''} onClick={() => setLiquidGlassNavConfig(current => option.id === 'clear' ? { ...current, mode:'clear', displacementScale:38, blurAmount:0.06, saturation:205, aberrationIntensity:0.8, elasticity:0.12 } : { ...current, mode:option.id })}>{option.label}</button>)}
              </div>
              <div className="liquid-glass-controls">
                <label><span><b>Refraction</b><output>{liquidGlassNavConfig.displacementScale}</output></span><input type="range" min="20" max="100" step="1" value={liquidGlassNavConfig.displacementScale} onChange={event => setLiquidGlassNavConfig(current => ({ ...current, displacementScale: Number(event.target.value) }))} /></label>
                <label><span><b>Frosted clarity</b><output>{Math.round(liquidGlassNavConfig.blurAmount * 100)}%</output></span><input type="range" min="0.03" max="0.3" step="0.01" value={liquidGlassNavConfig.blurAmount} onChange={event => setLiquidGlassNavConfig(current => ({ ...current, blurAmount: Number(event.target.value) }))} /></label>
                <label><span><b>Colour richness</b><output>{liquidGlassNavConfig.saturation}%</output></span><input type="range" min="110" max="240" step="5" value={liquidGlassNavConfig.saturation} onChange={event => setLiquidGlassNavConfig(current => ({ ...current, saturation: Number(event.target.value) }))} /></label>
                <label><span><b>Edge prism</b><output>{liquidGlassNavConfig.aberrationIntensity.toFixed(1)}</output></span><input type="range" min="0" max="4" step="0.1" value={liquidGlassNavConfig.aberrationIntensity} onChange={event => setLiquidGlassNavConfig(current => ({ ...current, aberrationIntensity: Number(event.target.value) }))} /></label>
                <label><span><b>Elastic movement</b><output>{liquidGlassNavConfig.elasticity.toFixed(2)}</output></span><input type="range" min="0" max="0.45" step="0.01" value={liquidGlassNavConfig.elasticity} onChange={event => setLiquidGlassNavConfig(current => ({ ...current, elasticity: Number(event.target.value) }))} /></label>
              </div>
              <footer className="liquid-glass-dialog-footer"><button type="button" className="liquid-glass-reset" onClick={() => setLiquidGlassNavConfig({ displacementScale: 58, blurAmount: 0.12, saturation: 175, aberrationIntensity: 1.8, elasticity: 0.18, mode: 'prominent' })}>Reset</button><button type="button" className="liquid-glass-done" onClick={() => { setLiquidGlassDialogOpen(false); if (!liquidGlassNavOn) setLiquidGlassNavOn?.(true); }}>Apply</button></footer>
            </section>
          </div>
        )}
        <div className="settings-row">
          <div className="settings-row-label">
            <span className="settings-row-icon"><Vibrate size={18} /></span>
            <div>
              <strong>Haptics</strong>
              <small>{hapticsSupported ? (hapticsOn ? 'Tap feedback on' : 'Tap feedback off') : 'Not available on this device'}</small>
            </div>
          </div>
          <button
            className="theme-toggle"
            onClick={() => setHapticsOn(setHapticsEnabled(!hapticsOn))}
            aria-label={`Turn haptics ${hapticsOn ? 'off' : 'on'}`}
            disabled={!hapticsSupported}
          >
            <span className={`theme-toggle-track ${hapticsOn ? 'dark' : 'light'}`}>
              <span className="theme-toggle-thumb">
                <Vibrate size={14} />
              </span>
            </span>
          </button>
        </div>

        <div className="settings-row">
          <div className="settings-row-label">
            <span className="settings-row-icon"><Sparkles size={18} /></span>
            <div>
              <strong>Performance mode</strong>
              <small>{performanceModeOn ? 'Reduced visual effects and animations' : 'Off · full animations and transitions enabled'}</small>
            </div>
          </div>
          <button
            className="theme-toggle"
            role="switch"
            aria-checked={performanceModeOn}
            onClick={() => updatePerformanceMode(!performanceModeOn)}
            aria-label={`Turn performance mode ${performanceModeOn ? 'off' : 'on'}`}
          >
            <span className={`theme-toggle-track ${performanceModeOn ? 'dark' : 'light'}`}>
              <span className="theme-toggle-thumb"><Sparkles size={14} /></span>
            </span>
          </button>
        </div>
      </div>

      {/* Installable app */}
      <div className="settings-group" hidden={!showGroup('install app download android apk offline browser add to home screen pwa')}>
        <h3 className="settings-group-title">App & Offline</h3>
        <div className="settings-row">
          <div className="settings-row-label">
            <span className="settings-row-icon"><Download size={18} /></span>
            <div><strong>{appInstalled ? 'App installed' : 'Install Incursion'}</strong><small>{appInstalled ? 'You are using the installed app' : 'Add it to your home screen for an app-like experience'}</small></div>
          </div>
          {!appInstalled && <button className="settings-btn primary" onClick={installApp}>{installAvailable ? 'Install app' : 'How to install'}</button>}
        </div>
        <div className="settings-row">
          <div className="settings-row-label">
            <span className="settings-row-icon"><Download size={18} /></span>
            <div><strong>Android APK</strong><small>Install the latest signed Android build from GitHub</small></div>
          </div>
          <a className="settings-btn" href="https://github.com/firefly-sylestia/mcu-viewing-order/releases/download/v10.2/MCU-Viewing-Order-10.2-signed.apk" target="_blank" rel="noreferrer">Download APK</a>
        </div>
        <div className="settings-release-link"><a href="https://github.com/firefly-sylestia/mcu-viewing-order/releases/latest" target="_blank" rel="noreferrer">View latest release and all versions ↗</a></div>
        <p className="settings-data-desc">Offline mode keeps the app shell and previously loaded images available. Live search, account sync and streaming still require an internet connection.</p>
      </div>

      {/* Player Mode */}
      <div className="settings-group" hidden={!showGroup('playback player native embedded video')}>
        <h3 className="settings-group-title">Playback</h3>
        <div className="settings-row">
          <div className="settings-row-label">
            <span className="settings-row-icon"><Play size={18} /></span>
            <div>
              <strong>Native player</strong>
              <small>{nativePlayer ? 'Opens in a new tab (bypasses iframe)' : 'Embedded player (default)'}</small>
            </div>
          </div>
          <button
            className="theme-toggle"
            onClick={() => {
              const next = !nativePlayer;
              setNativePlayer(next);
              localStorage.setItem('native-player', next ? '1' : '0');
            }}
            aria-label={`Switch to ${nativePlayer ? 'embedded' : 'native'} player`}
          >
            <span className={`theme-toggle-track ${nativePlayer ? 'dark' : 'light'}`}>
              <span className="theme-toggle-thumb">
                {nativePlayer ? <Play size={14} /> : <Play size={14} />}
              </span>
            </span>
          </button>
        </div>
      </div>

      {/* Profile Name */}
      <div className="settings-group" hidden={!showGroup('profile name display edit')}>
        <h3 className="settings-group-title">Profile</h3>
        <div className="settings-row">
          <div className="settings-row-label">
            <span className="settings-row-icon"><Pencil size={18} /></span>
            <div>
              <strong>Display name</strong>
              <small>{profileName || 'Not set'}</small>
            </div>
          </div>
          {editing ? (
            <div className="settings-name-edit">
              <input
                ref={inputRef}
                value={draft}
                onChange={e => setDraft(e.target.value)}
                onBlur={saveName}
                onKeyDown={e => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') { setDraft(profileName); setEditing(false); } }}
                placeholder="Your name"
                maxLength={30}
                className="settings-input"
              />
            </div>
          ) : (
            <button className="settings-edit-btn" onClick={() => { setDraft(profileName); setEditing(true); setTimeout(() => inputRef.current?.focus(), 0); }}>
              Edit
            </button>
          )}
        </div>
      </div>

      {/* Account */}
      {configured && (
        <div className="settings-group" hidden={!showGroup('account sign in sync cloud logout')}>
          <h3 className="settings-group-title">Account</h3>
          <div className="settings-row">
            <div className="settings-row-label">
              <span className="settings-row-icon"><Cloud size={18} /></span>
              <div>
                <strong>{user ? user.email || 'Signed in' : 'Cloud Sync'}</strong>
                <small>{user ? 'Your data syncs across devices' : 'Sign in to sync your progress'}</small>
              </div>
            </div>
            {user ? (
              confirmingLogout ? (
                <div className="settings-confirm">
                  <span>Sign out?</span>
                  <button className="settings-btn danger" onClick={() => { onLogout(); setConfirmingLogout(false); }}>Yes</button>
                  <button className="settings-btn" onClick={() => setConfirmingLogout(false)}>No</button>
                </div>
              ) : (
                <button className="settings-btn danger" onClick={() => setConfirmingLogout(true)}>
                  <LogOut size={14} />
                  Sign out
                </button>
              )
            ) : (
              <button className="settings-btn primary" onClick={onLogin}>
                <LogIn size={14} />
                Sign in
              </button>
            )}
          </div>
        </div>
      )}

      {/* Data Management */}
      <DataSection universe={universe} activeItems={activeItems} profileName={profileName} setStatus={setStatus} toggleBookmark={toggleBookmark} query={query} />
    </div>
  );
}

function AnalyticsPanel({ stats, activeItems, inProgressItems }) {
  return (
    <section className="analytics-panel profile-analytics">
      <div className="analytics-header">
        <p className="eyebrow">Your Progress</p>
        <h2>{stats.percent}% complete</h2>
        <div className="progress">
          <span style={{ width: `${stats.percent}%` }} />
        </div>
      </div>
      <div className="stat-grid">
        <div>
          <b>{stats.total}</b>
          <span>Total</span>
        </div>
        <div>
          <b>{stats.watched}</b>
          <span>Watched</span>
        </div>
        <div>
          <b>{stats.watching}</b>
          <span>Watching</span>
        </div>
        <div>
          <b>{stats.dropped}</b>
          <span>Dropped</span>
        </div>
        <div>
          <b>{stats.bookmarked}</b>
          <span>Saved</span>
        </div>
        <div>
          <b>{stats.watchedTime}</b>
          <span>Watch Time</span>
        </div>
        {stats.streak > 1 && (
          <div className="streak-stat">
            <b><Trophy size={16} /> {stats.streak}</b>
            <span>Best Streak</span>
          </div>
        )}
      </div>
    </section>
  );
}

function MovieRail({ title, items, setSelected, cycleStatus, setStatus, toggleBookmark, playTrailer, empty }) {
  return (
    <section className="rail-card profile-rail">
      <div className="section-title">
        <h2>{title}</h2>
        <button>{items.length} titles</button>
      </div>
      {items.length ? (
        <div className="movie-grid web-grid">
          {items.map(item => (
            <MovieCard
              key={item.id}
              item={item}
              setSelected={setSelected}
              cycleStatus={cycleStatus}
              setStatus={setStatus}
              toggleBookmark={toggleBookmark}
              playTrailer={playTrailer}
            />
          ))}
        </div>
      ) : (
        <p className="empty-state">{empty || 'No titles match these filters.'}</p>
      )}
    </section>
  );
}

function MovieCard({ item, setSelected, cycleStatus, setStatus, toggleBookmark, playTrailer }) {
  return (
    <article className="movie-card" style={{ '--accent': item.accent }}>
      <button className="poster-button" onClick={() => setSelected(item)}>
        <PosterArt item={item} />
      </button>
      <div className="card-body">
        <button className="title-button" onClick={() => setSelected(item)}>
          {item.title}
        </button>
        <span>{item.year} · {runtimeLabel(item.runtime, item.type)}</span>
      </div>
      <div className="card-actions">
        <button
          onClick={() => setStatus(item, item.userStatus === 'watched' ? 'unwatched' : 'watched')}
          className={`watch-chip ${item.userStatus === 'watched' ? 'watched' : ''}`}
          aria-label={item.userStatus === 'watched' ? `Mark ${item.title} as unwatched` : `Mark ${item.title} as watched`}
          aria-pressed={item.userStatus === 'watched'}
        >
          {item.userStatus === 'watched' ? <><Check size={16} /><span>Watched</span></> : <><Play size={16} /><span>Watch</span></>}
        </button>
        <button
          onClick={() => toggleBookmark(item)}
          className={`bookmark-chip ${item.bookmarked ? 'saved' : ''}`}
          aria-label={item.bookmarked ? 'Remove bookmark' : 'Bookmark title'}
        >
          <Bookmark size={18} fill={item.bookmarked ? 'currentColor' : 'none'} />
        </button>
      </div>
    </article>
  );
}

function PosterArt({ item }) {
  return item.poster ? (
    <>
      <img
        src={item.poster}
        alt={`${item.title} poster`}
        width="300"
        height="450"
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={e => {
          e.currentTarget.style.display = 'none';
          e.currentTarget.nextElementSibling?.removeAttribute('hidden');
        }}
      />
      <FallbackPoster item={item} hidden />
    </>
  ) : (
    <FallbackPoster item={item} />
  );
}

function FallbackPoster({ item, hidden = false }) {
  return (
    <div className="fallback-poster" hidden={hidden}>
      <strong>{item.title}</strong>
      <span>{item.year}</span>
    </div>
  );
}

function runtimeLabel(minutes = 0, type = 'film') {
  if (!minutes) return type === 'series' ? 'Series' : 'TBA';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h ? `${h}h ${m ? `${m}m` : ''}`.trim() : `${m}m`;
}

const STATUS = ['unwatched', 'watching', 'watched', 'dropped'];
const STATUS_LABELS = { unwatched: 'Unwatched', watching: 'Watching', watched: 'Watched', dropped: 'Dropped' };

const STATUS_META = {
  unwatched: { detail: 'Not started', icon: RotateCcw },
  watching: { detail: 'In progress', icon: Clock },
  watched: { detail: 'Completed', icon: Check },
  dropped: { detail: 'Stopped', icon: X },
};

function StatusSelect({ item, setStatus, compact = false }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);

  React.useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div className={`status-select ${item.userStatus} ${compact ? 'compact' : ''} ${open ? 'open' : ''}`} ref={ref}>
      <button
        className="status-trigger"
        onClick={() => { hapticTap(); setOpen(!open); }}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="status-dot" aria-hidden="true" />
        <span className="status-label">{STATUS_LABELS[item.userStatus]}</span>
        <ChevronDown size={13} className="status-chevron" aria-hidden="true" />
      </button>
      {open && (
        <div className="status-dropdown" role="listbox" aria-label={`Set status for ${item.title}`}>
          <p className="status-menu-title">Viewing status</p>
          {STATUS.map(status => {
            const Icon = STATUS_META[status].icon;
            return (
              <button
                key={status}
                className={`status-option ${status} ${item.userStatus === status ? 'active' : ''}`}
                role="option"
                aria-selected={item.userStatus === status}
                onClick={() => {
                  if (status === 'watched') hapticSuccess(); else hapticTap();
                  setStatus(item, status);
                  setOpen(false);
                }}
              >
                <span className="status-option-icon"><Icon size={15} /></span>
                <span className="status-option-copy">
                  <strong>{STATUS_LABELS[status]}</strong>
                  <small>{STATUS_META[status].detail}</small>
                </span>
                {item.userStatus === status && <Check size={14} className="status-option-check" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

const SCHEMA_VERSION = 2;

function DataSection({ universe, activeItems, profileName, setStatus, toggleBookmark, query = '' }) {
  const search = query.trim().toLowerCase();
  const showGroup = (terms) => !search || terms.includes(search);
  const fileRef = useRef(null);
  const [importMsg, setImportMsg] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [pendingImport, setPendingImport] = useState(null);
  const importTimer = useRef(null);
  const universeName = universe === 'all' ? 'All universes' : universe === 'marvel' ? 'Marvel' : universe === 'xmen' ? 'X-Men' : universe === 'sony' ? 'Sony' : 'DC';

  useEffect(() => {
    if (!importMsg) return;
    clearTimeout(importTimer.current);
    importTimer.current = setTimeout(() => setImportMsg(null), 5000);
    return () => clearTimeout(importTimer.current);
  }, [importMsg]);

  const handleExport = () => {
    setExporting(true);
    const items = activeItems.map(item => ({
      id: item.id,
      status: item.userStatus || 'unwatched',
      bookmarked: Boolean(item.bookmarked),
      watchedDuration: item.watchedDuration || 0,
      watchedEpisodes: item.watchedEpisodes || [],
    }));
    const payload = {
      schemaVersion: SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      universe,
      universeName,
      profileName: profileName || '',
      total: items.length,
      items,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${universe}-progress-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setExporting(false);
  };

  const applyImport = (data) => {
    let applied = 0;
    const itemMap = new Map(activeItems.map(i => [i.id, i]));
    data.items.forEach(entry => {
      const item = itemMap.get(entry.id);
      if (!item) return;
      if (entry.status && item.userStatus !== entry.status) {
        setStatus(item, entry.status);
        applied++;
      }
      if (entry.bookmarked !== item.bookmarked) {
        toggleBookmark(item);
        applied++;
      }
    });
    setImportMsg({ type: 'success', text: `Imported ${applied} changes from ${data.total || data.items.length} entries.` });
  };

  const handleImport = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        if (!data || !Array.isArray(data.items)) {
          setImportMsg({ type: 'error', text: 'Invalid file format — expected a progress backup with items array.' });
          return;
        }
        const importUniverse = data.universe || 'marvel';
        if (universe !== 'all' && importUniverse !== universe) {
          setImportMsg({ type: 'error', text: `This backup is for ${data.universeName || importUniverse}. Switch to that universe to import it.` });
          return;
        }
        // Show confirmation with preview before applying
        const watched = data.items.filter(e => e.status === 'watched').length;
        const bookmarked = data.items.filter(e => e.bookmarked).length;
        setPendingImport({ data, watched, bookmarked, total: data.total || data.items.length });
      } catch {
        setImportMsg({ type: 'error', text: 'Could not parse the file. Make sure it\'s a valid JSON backup.' });
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="settings-group" hidden={!showGroup('data management export import backup progress')}>
      <h3 className="settings-group-title">Data Management</h3>
      <p className="settings-data-desc">Export your {universeName} viewing progress as a JSON backup, or restore from a previous export.</p>
      {pendingImport ? (
        <div className="settings-data-confirm">
          <p><strong>Import progress backup?</strong></p>
          <p className="settings-data-preview">{pendingImport.watched} watched · {pendingImport.bookmarked} bookmarked · {pendingImport.total} entries</p>
          <div className="settings-data-confirm-actions">
            <button className="settings-btn" onClick={() => { applyImport(pendingImport.data); setPendingImport(null); }}>Apply</button>
            <button className="settings-btn" onClick={() => setPendingImport(null)}>Cancel</button>
          </div>
        </div>
      ) : (
        <>
          <div className="settings-data-actions">
            <button className="settings-btn" onClick={handleExport} disabled={exporting}>
              <Download size={15} />
              {exporting ? 'Exporting…' : 'Export Progress'}
            </button>
            <button className="settings-btn" onClick={() => fileRef.current?.click()}>
              <Upload size={15} />
              Import Progress
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".json"
              onChange={handleImport}
              style={{ display: 'none' }}
              aria-hidden="true"
            />
          </div>
          {importMsg && (
            <p className={`settings-data-msg ${importMsg.type === 'error' ? 'settings-data-msg-error' : ''}`}>
              {importMsg.type === 'error' ? '⚠️' : '✓'} {importMsg.text}
            </p>
          )}
        </>
      )}
    </div>
  );
}

export default ProfilePage;
