import React, { useState, useRef } from 'react';
import { Play, Bookmark, RotateCcw, Clock, Check, X, Pencil, Trophy, LogIn, LogOut, Cloud, RefreshCw } from 'lucide-react';

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

function ProfilePage({ stats, activeItems, universe, setSelected, cycleStatus, setStatus, toggleBookmark, playTrailer, profileName, setProfileName, user, configured, onLogin, onLogout, lastSynced, syncing, onSync, conflict, onResolveRemote, onResolveLocal, syncToast }) {
  const [activeTab, setActiveTab] = useState('insights');
  
  const savedItems = activeItems.filter(i => i.bookmarked);
  const inProgressItems = activeItems.filter(i => i.userStatus === 'watching');
  const watchedItems = activeItems.filter(i => i.userStatus === 'watched');
  const droppedItems = activeItems.filter(i => i.userStatus === 'dropped');

  return (
    <div className="profile-page">
      {/* Sync Toast */}
      {syncToast && (
        <div className={`sync-toast ${syncToast.type === 'error' ? 'sync-toast-error' : ''}`}>
          {syncToast.type === 'error' ? '⚠️' : '✓'} {syncToast.message}
        </div>
      )}
      
      {/* Profile Header */}
      <ProfileHeader universe={universe} stats={stats} profileName={profileName} setProfileName={setProfileName} user={user} configured={configured} onLogin={onLogin} onLogout={onLogout} lastSynced={lastSynced} syncing={syncing} onSync={onSync} />
      
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
      
      {/* Tabs */}
      <div className="profile-tabs-container">
        <div className="profile-tabs" role="tablist">
          <button
            role="tab"
            aria-selected={activeTab === 'insights'}
            aria-controls="insights-panel"
            className={`profile-tab ${activeTab === 'insights' ? 'active' : ''}`}
            onClick={() => setActiveTab('insights')}
          >
            Insights
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'saved'}
            aria-controls="saved-panel"
            className={`profile-tab ${activeTab === 'saved' ? 'active' : ''}`}
            onClick={() => setActiveTab('saved')}
          >
            Saved
            {savedItems.length > 0 && <span className="tab-badge">{savedItems.length}</span>}
          </button>
        </div>
        <div className="profile-tab-indicator" />
      </div>

      {/* Tab Content */}
      <div className="profile-tab-content">
        {activeTab === 'insights' && (
          <div id="insights-panel" role="tabpanel" className="profile-panel insights-panel">
            <AnalyticsPanel stats={stats} activeItems={activeItems} inProgressItems={inProgressItems} />
            {inProgressItems.length > 0 && (
              <MovieRail title="In progress" items={inProgressItems} setSelected={setSelected} cycleStatus={cycleStatus} setStatus={setStatus} toggleBookmark={toggleBookmark} playTrailer={playTrailer} />
            )}
            {watchedItems.length > 0 && (
              <MovieRail title="Watched" items={watchedItems} setSelected={setSelected} cycleStatus={cycleStatus} setStatus={setStatus} toggleBookmark={toggleBookmark} playTrailer={playTrailer} />
            )}
            {droppedItems.length > 0 && (
              <MovieRail title="Dropped" items={droppedItems} setSelected={setSelected} cycleStatus={cycleStatus} setStatus={setStatus} toggleBookmark={toggleBookmark} playTrailer={playTrailer} />
            )}
            {savedItems.length > 0 && (
              <MovieRail title="Bookmarked" items={savedItems} setSelected={setSelected} cycleStatus={cycleStatus} setStatus={setStatus} toggleBookmark={toggleBookmark} playTrailer={playTrailer} />
            )}
          </div>
        )}

        {activeTab === 'saved' && (
          <div id="saved-panel" role="tabpanel" className="profile-panel saved-panel">
            <MovieRail
              title="Saved titles"
              items={savedItems}
              setSelected={setSelected}
              cycleStatus={cycleStatus}
              setStatus={setStatus}
              toggleBookmark={toggleBookmark}
              playTrailer={playTrailer}
              empty="No saved titles yet. Tap bookmarks on any card."
            />
          </div>
        )}
      </div>
    </div>
  );
}

function ProfileHeader({ universe, stats, profileName, setProfileName, user, configured, onLogin, onLogout, lastSynced, syncing, onSync }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(profileName);
  const [confirmingLogout, setConfirmingLogout] = useState(false);
  const inputRef = useRef(null);
  const universeName = universe === 'marvel' ? 'MCU' : 'DC';
  const universeAccent = universe === 'marvel' ? '#da1e37' : '#2f80ed';
  const displayName = profileName || `${universeName} Viewer`;
  const avatarInitial = (displayName.trim()[0] || universeName[0]).toUpperCase();

  const save = () => {
    const trimmed = draft.trim();
    setProfileName(trimmed);
    setDraft(trimmed);
    setEditing(false);
  };

  const startEdit = () => {
    setDraft(profileName);
    setEditing(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  return (
    <div className="profile-header" style={{ '--accent': universeAccent }}>
      <div className="profile-avatar">
        <span className="avatar-initials">{avatarInitial}</span>
      </div>
      <div className="profile-info">
        {editing ? (
          <div className="profile-name-edit">
            <input
              ref={inputRef}
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onBlur={save}
              onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') { setDraft(profileName); setEditing(false); } }}
              placeholder="Your name"
              maxLength={30}
            />
          </div>
        ) : (
          <h1 className="profile-title" onClick={startEdit} title="Click to edit">
            {displayName}
            <Pencil size={14} className="profile-edit-icon" />
          </h1>
        )}
        <p className="profile-subtitle">
          {stats.percent}% complete · {stats.total} titles tracked
        </p>
      </div>
      {configured && (
        <div className="profile-auth">
          {user ? (
            <>
              <div className="profile-sync-status" title={lastSynced ? new Date(lastSynced).toLocaleString() : ''}>
                {syncing && <span className="sync-spinner" />}
                {lastSynced && !syncing && <Cloud size={13} className="sync-ok" />}
                {lastSynced && !syncing && <span className="sync-label">{formatTimeAgo(lastSynced)}</span>}
                {!lastSynced && !syncing && <span className="sync-label">Not synced yet</span>}
              </div>
              <button className="sync-now-btn" onClick={onSync} disabled={syncing} title="Sync now">
                <RefreshCw size={14} className={syncing ? 'spinning' : ''} />
              </button>
              {confirmingLogout ? (
                <div className="profile-auth-confirm">
                  <span>Sign out?</span>
                  <button className="confirm-yes" onClick={() => { onLogout(); setConfirmingLogout(false); }}>Yes</button>
                  <button className="confirm-no" onClick={() => setConfirmingLogout(false)}>No</button>
                </div>
              ) : (
                <button className="profile-auth-btn signed-in" onClick={() => setConfirmingLogout(true)} title="Sign out">
                  <span className="auth-user-avatar">{avatarInitial}</span>
                  <LogOut size={14} />
                </button>
              )}
            </>
          ) : (
            <button className="profile-auth-btn sign-in" onClick={onLogin}>
              <LogIn size={18} />
              <span>Sign in to sync</span>
            </button>
          )}
        </div>
      )}
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
          onClick={() => playTrailer(item)}
          className="trailer-chip"
          aria-label={`Play ${item.title} trailer`}
        >
          <Play size={16} fill="currentColor" />
          <span>Trailer</span>
        </button>
        <StatusSelect item={item} setStatus={setStatus} compact />
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
        onClick={() => setOpen(!open)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="status-label">{STATUS_LABELS[item.userStatus]}</span>
      </button>
      {open && (
        <div className="status-dropdown" role="listbox" aria-label={`Set status for ${item.title}`}>
          <p className="status-menu-title">Viewing status</p>
          {STATUS.map(status => (
            <button
              key={status}
              className={`status-option ${status} ${item.userStatus === status ? 'active' : ''}`}
              role="option"
              aria-selected={item.userStatus === status}
              onClick={() => {
                setStatus(item, status);
                setOpen(false);
              }}
            >
              <span className="status-option-copy">
                <strong>{STATUS_LABELS[status]}</strong>
                <small>{STATUS_META[status].detail}</small>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default ProfilePage;
