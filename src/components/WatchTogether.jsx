import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Copy, Check, Users, MessageCircle, Play, Pause, SkipBack, SkipForward, X, Link2, Radio, Crown, Send, LogOut, RefreshCw, Volume2, VolumeX, Clock3, ShieldCheck } from 'lucide-react';
import { supabasePublicRequest } from '../supabase';

const RPC = '/rest/v1/rpc/';
const randomHex = (bytes = 32) => {
  const data = new Uint8Array(bytes);
  crypto.getRandomValues(data);
  return Array.from(data, value => value.toString(16).padStart(2, '0')).join('');
};
const makeGuest = () => {
  const key = 'mcu-watch-together-guest-v1';
  try {
    const saved = JSON.parse(localStorage.getItem(key) || 'null');
    if (saved?.name && saved?.token && saved?.avatar) return saved;
    const a = ['Cosmic', 'Velvet', 'Starlit', 'Neon', 'Lunar', 'Silver', 'Crimson', 'Quiet', 'Golden', 'Midnight', 'Solar', 'Hidden'];
    const b = ['Ranger', 'Comet', 'Voyager', 'Fox', 'Phantom', 'Pilot', 'Wanderer', 'Nova', 'Sparrow', 'Orbit', 'Echo', 'Sentinel'];
    const pick = list => list[crypto.getRandomValues(new Uint32Array(1))[0] % list.length];
    const name = `${pick(a)}${pick(b)}${100 + (crypto.getRandomValues(new Uint32Array(1))[0] % 900)}`;
    const guest = { name, token: randomHex(), avatar: `https://blobatar.dev/avatar/${encodeURIComponent(name)}?size=96&background=squircle&gen=2` };
    localStorage.setItem(key, JSON.stringify(guest));
    return guest;
  } catch {
    const name = 'StarlitVoyager';
    return { name, token: randomHex(), avatar: `https://blobatar.dev/avatar/${name}?size=96&background=squircle&gen=2` };
  }
};
const timeText = seconds => {
  const n = Math.max(0, Math.floor(Number(seconds) || 0));
  return `${Math.floor(n / 3600)}:${String(Math.floor((n % 3600) / 60)).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`;
};
const roomCode = () => {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from(crypto.getRandomValues(new Uint8Array(8)), n => alphabet[n % alphabet.length]).join('');
};
const blobatar = name => `https://blobatar.dev/avatar/${encodeURIComponent(name || 'Viewer')}?size=96&background=squircle&gen=2`;

export default function WatchTogether({ item, tmdbId, mediaType, season = 1, episode = 1, playerUrl, onEpisodeChange }) {
  const guest = useMemo(makeGuest, []);
  const [open, setOpen] = useState(false);
  const [room, setRoom] = useState(null);
  const [participant, setParticipant] = useState(null);
  const [members, setMembers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [playerReady, setPlayerReady] = useState(false);
  const [paused, setPaused] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [muted, setMuted] = useState(false);
  const [roomLink, setRoomLink] = useState('');
  const iframeRef = useRef(null);
  const pollRef = useRef(null);
  const heartbeatRef = useRef(null);
  const lastVersionRef = useRef(0);
  const applyingRemoteRef = useRef(false);
  const lastHostTimePushRef = useRef(0);
  const lastMessageIdRef = useRef(0);
  const roomRef = useRef(room);
  const participantRef = useRef(participant);
  const currentTimeRef = useRef(0);
  const pausedRef = useRef(true);
  const playerReadyRef = useRef(false);
  const itemMedia = useMemo(() => ({
    title: item?.title || 'Untitled',
    poster: item?.poster || '',
    tmdbId: Number(tmdbId || item?.tmdbId || 0),
    mediaType: mediaType || (item?.type === 'series' ? 'tv' : 'movie'),
    season: Number(season || 1),
    episode: Number(episode || 1),
    accent: item?.accent || '#da1e37',
  }), [item?.title, item?.poster, item?.tmdbId, item?.type, item?.accent, tmdbId, mediaType, season, episode]);
  useEffect(() => { roomRef.current = room; }, [room]);
  useEffect(() => { participantRef.current = participant; }, [participant]);
  useEffect(() => { currentTimeRef.current = currentTime; }, [currentTime]);
  useEffect(() => { pausedRef.current = paused; }, [paused]);
  useEffect(() => { playerReadyRef.current = playerReady; }, [playerReady]);

  const rpc = useCallback(async (name, args) => {
    return supabasePublicRequest(`${RPC}${name}`, { method: 'POST', body: JSON.stringify(args) });
  }, []);

  const applyRoomSnapshot = useCallback((snapshot) => {
    if (!snapshot?.room) return;
    const nextRoom = snapshot.room;
    setRoom(nextRoom);
    setMembers(snapshot.participants || []);
    const nextMessages = snapshot.messages || [];
    setMessages(nextMessages);
    if (nextMessages.length) lastMessageIdRef.current = Math.max(lastMessageIdRef.current, ...nextMessages.map(m => Number(m.id) || 0));
    const version = Number(nextRoom.state_version || 0);
    if (version > lastVersionRef.current) {
      lastVersionRef.current = version;
      const playback = nextRoom.playback || {};
      setPaused(Boolean(playback.paused));
      if (Number.isFinite(Number(playback.position))) {
        const target = Math.max(0, Number(playback.position) + (playback.paused ? 0 : Math.max(0, (Date.now() - Date.parse(playback.updated_at || nextRoom.updated_at || new Date().toISOString())) / 1000)));
        setCurrentTime(target);
        if (playerReadyRef.current && !applyingRemoteRef.current) {
          applyingRemoteRef.current = true;
          const frame = iframeRef.current;
          const send = (command, args = []) => frame?.contentWindow?.postMessage({ type: 'cinesrc:command', command, args }, 'https://cinesrc.st');
          if (Math.abs(currentTimeRef.current - target) > 2.25) send('seek', [target]);
          if (playback.paused) { send('pause'); setPaused(true); }
          else { send('play'); setPaused(false); }
          window.setTimeout(() => { applyingRemoteRef.current = false; }, 900);
        }
      }
    }
  }, []);

  const joinExisting = useCallback(async (code, identity = guest) => {
    setBusy(true); setError('');
    try {
      const result = await rpc('join_watch_room', {
        p_code: code.trim().toUpperCase(),
        p_token: identity.token,
        p_name: identity.name,
        p_avatar: identity.avatar,
      });
      setParticipant(result.participant);
      applyRoomSnapshot(result);
      setOpen(true);
      const url = new URL(window.location.href);
      url.searchParams.set('room', code.trim().toUpperCase());
      setRoomLink(url.toString());
    } catch (e) { setError(e.message || 'Could not join this room.'); }
    finally { setBusy(false); }
  }, [rpc, guest, applyRoomSnapshot]);

  const createRoom = useCallback(async () => {
    if (!itemMedia.tmdbId) { setError('This title does not have a TMDB ID, so a shared player cannot be created.'); return; }
    setBusy(true); setError('');
    try {
      const code = roomCode();
      const result = await rpc('create_watch_room', {
        p_code: code,
        p_token: guest.token,
        p_name: guest.name,
        p_avatar: guest.avatar,
        p_media: itemMedia,
      });
      setParticipant(result.participant);
      applyRoomSnapshot(result);
      const url = new URL(window.location.href);
      url.searchParams.set('room', code);
      const link = url.toString();
      setRoomLink(link);
      setOpen(true);
      try { await navigator.clipboard.writeText(link); setCopied(true); window.setTimeout(() => setCopied(false), 2200); } catch {}
    } catch (e) { setError(e.message || 'Could not create the room.'); }
    finally { setBusy(false); }
  }, [rpc, guest, itemMedia, applyRoomSnapshot]);

  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get('room');
    if (code && !roomRef.current) {
      setOpen(true);
      joinExisting(code);
    }
  }, [joinExisting]);

  const refreshRoom = useCallback(async () => {
    const activeRoom = roomRef.current;
    const activeParticipant = participantRef.current;
    if (!activeRoom?.code || !activeParticipant?.token) return;
    try {
      const result = await rpc('watch_room_snapshot', { p_code: activeRoom.code, p_token: activeParticipant.token });
      applyRoomSnapshot(result);
    } catch (e) {
      if (/expired|closed|not found|not a member/i.test(e.message || '')) {
        setError('This room has ended or expired.');
        window.clearInterval(pollRef.current);
        window.clearInterval(heartbeatRef.current);
      }
    }
  }, [rpc, applyRoomSnapshot]);

  useEffect(() => {
    if (!room || !participant) return undefined;
    refreshRoom();
    pollRef.current = window.setInterval(refreshRoom, 1800);
    heartbeatRef.current = window.setInterval(() => {
      const r = roomRef.current, p = participantRef.current;
      if (r && p) rpc('watch_room_heartbeat', { p_code: r.code, p_token: p.token }).catch(() => {});
    }, 12000);
    return () => { window.clearInterval(pollRef.current); window.clearInterval(heartbeatRef.current); };
  }, [room?.id, participant?.id, refreshRoom, rpc]);

  const publishPlayback = useCallback(async (next, force = false) => {
    const r = roomRef.current, p = participantRef.current;
    if (!r || !p || applyingRemoteRef.current) return;
    const payload = {
      position: Math.max(0, Number(next.position ?? currentTimeRef.current) || 0),
      paused: next.paused ?? pausedRef.current,
      season: Number(next.season || r.media?.season || season),
      episode: Number(next.episode || r.media?.episode || episode),
      updated_at: new Date().toISOString(),
      actor: p.id,
    };
    try {
      const result = await rpc('set_watch_room_playback', { p_code: r.code, p_token: p.token, p_playback: payload });
      if (result?.state_version) lastVersionRef.current = Math.max(lastVersionRef.current, Number(result.state_version));
    } catch (e) { if (force) setError(e.message || 'Could not sync playback.'); }
  }, [rpc, season, episode]);

  const sendPlayerCommand = useCallback((command, args = []) => {
    iframeRef.current?.contentWindow?.postMessage({ type: 'cinesrc:command', command, args }, 'https://cinesrc.st');
    if (command === 'play') { setPaused(false); publishPlayback({ position: currentTimeRef.current, paused: false }); }
    if (command === 'pause') { setPaused(true); publishPlayback({ position: currentTimeRef.current, paused: true }); }
    if (command === 'seek') { const position = Math.max(0, Number(args[0]) || 0); setCurrentTime(position); publishPlayback({ position, paused: pausedRef.current }, true); }
  }, [publishPlayback]);

  const sendChat = async (event) => {
    event?.preventDefault();
    const body = draft.trim();
    if (!body || !room || !participant || busy) return;
    setBusy(true);
    try {
      const message = await rpc('send_watch_room_message', { p_code: room.code, p_token: participant.token, p_body: body });
      if (message?.id) {
        setMessages(previous => [...previous.filter(m => m.id !== message.id), message].slice(-100));
        lastMessageIdRef.current = Math.max(lastMessageIdRef.current, Number(message.id));
      }
      setDraft('');
    } catch (e) { setError(e.message || 'Message could not be sent.'); }
    finally { setBusy(false); }
  };

  const copyLink = async () => {
    if (!roomLink) return;
    try { await navigator.clipboard.writeText(roomLink); setCopied(true); window.setTimeout(() => setCopied(false), 2200); }
    catch { setError('Copy was blocked by your browser. Copy the room link from the address bar.'); }
  };

  const leaveRoom = async () => {
    const r = roomRef.current, p = participantRef.current;
    if (r && p) await rpc('leave_watch_room', { p_code: r.code, p_token: p.token }).catch(() => {});
    window.clearInterval(pollRef.current); window.clearInterval(heartbeatRef.current);
    setRoom(null); setParticipant(null); setMembers([]); setMessages([]); setPlayerReady(false); setOpen(false);
    const url = new URL(window.location.href); url.searchParams.delete('room'); window.history.replaceState({}, '', url.toString());
  };

  useEffect(() => {
    if (!open || !room || !participant) return undefined;
    const onMessage = event => {
      if (event.origin !== 'https://cinesrc.st' || event.source !== iframeRef.current?.contentWindow) return;
      const data = event.data;
      if (!data || typeof data !== 'object') return;
      if (data.type === 'cinesrc:ready') {
        setPlayerReady(true);
        sendPlayerCommand('getCurrentTime');
        sendPlayerCommand('getDuration');
      }
      if (data.type === 'cinesrc:timeupdate' && Number.isFinite(Number(data.currentTime))) {
        const time = Math.max(0, Number(data.currentTime));
        setCurrentTime(time);
        if (participant.is_host && Date.now() - lastHostTimePushRef.current > 4500) {
          lastHostTimePushRef.current = Date.now();
          publishPlayback({ position: time, paused: pausedRef.current });
        }
      }
      if (data.type === 'cinesrc:loadedmetadata' && Number.isFinite(Number(data.duration))) setDuration(Number(data.duration));
      if (data.type === 'cinesrc:response' && data.command === 'getDuration' && Number.isFinite(Number(data.result))) setDuration(Number(data.result));
      if (data.type === 'cinesrc:response' && data.command === 'getCurrentTime' && Number.isFinite(Number(data.result))) setCurrentTime(Number(data.result));
      if (data.type === 'cinesrc:play') {
        setPaused(false);
        if (!applyingRemoteRef.current) publishPlayback({ position: currentTimeRef.current, paused: false });
      }
      if (data.type === 'cinesrc:pause') {
        setPaused(true);
        if (!applyingRemoteRef.current) publishPlayback({ position: currentTimeRef.current, paused: true });
      }
      if (data.type === 'cinesrc:seeked' && !applyingRemoteRef.current) publishPlayback({ position: Number(data.currentTime) || currentTimeRef.current, paused: pausedRef.current }, true);
      if (data.type === 'cinesrc:nextepisode') {
        const next = Number(data.episode);
        if (Number.isInteger(next) && next > 0) {
          onEpisodeChange?.(next);
          publishPlayback({ position: 0, paused: false, season: Number(data.season) || season, episode: next }, true);
        }
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [open, room?.id, participant?.id, participant?.is_host, publishPlayback, sendPlayerCommand, onEpisodeChange, season]);

  useEffect(() => {
    if (!room || !participant || !room.media) return;
    const roomEpisode = Number(room.playback?.episode || room.media.episode || episode);
    if (roomEpisode > 0 && roomEpisode !== Number(episode)) onEpisodeChange?.(roomEpisode);
  }, [room?.state_version, room?.media?.episode, room?.playback?.episode, episode, onEpisodeChange]);

  const sharedPlayerUrl = useMemo(() => {
    if (!room?.media) return playerUrl;
    const media = room.media;
    const params = new URLSearchParams({ autoplay: 'false', controls: 'true', back: 'close', autonext: 'false', color: media.accent || '#da1e14' });
    return media.mediaType === 'tv'
      ? `https://cinesrc.st/embed/tv/${media.tmdbId}?s=${room.playback?.season || media.season || 1}&e=${room.playback?.episode || media.episode || 1}&${params.toString()}`
      : `https://cinesrc.st/embed/movie/${media.tmdbId}?${params.toString()}`;
  }, [room?.media, room?.playback?.season, room?.playback?.episode, playerUrl]);

  const [joinCode, setJoinCode] = useState('');
  const openJoin = () => { setOpen(true); setRoom(null); setParticipant(null); setError(''); };
  const progressPercent = duration ? Math.min(100, (currentTime / duration) * 100) : 0;

  return <>
    <button type="button" className="watch-together-launch" onClick={() => { setOpen(true); setError(''); }}><Users size={16} /><span>Watch together</span></button>
    {open && createPortal(
      <div className="wt-overlay" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget && !room) setOpen(false); }}>
        <section className={`wt-modal${room ? ' wt-room-active' : ''}`} role="dialog" aria-modal="true" aria-label="Watch together">
          <header className="wt-topbar">
            <div className="wt-brand"><span className="wt-brand-mark"><Radio size={18} /></span><div><small>INCursion · PRIVATE SCREENING</small><strong>{room ? room.code : 'Watch together'}</strong></div></div>
            <button className="wt-close" onClick={() => room ? leaveRoom() : setOpen(false)} aria-label="Close"><X size={19} /></button>
          </header>
          {!room ? <div className="wt-entry">
            <div className="wt-entry-art"><img src={itemMedia.poster || blobatar(guest.name)} alt="" /><div><span>YOUR SCREENING ROOM</span><h2>Good stories are better shared.</h2><p>Watch in sync, chat live, and invite anyone with one private link. No account required.</p></div></div>
            <div className="wt-identity"><img src={guest.avatar} alt="" /><div><small>YOU'RE JOINING AS</small><strong>{guest.name}</strong><span>Guest · ready to watch</span></div><button onClick={() => { localStorage.removeItem('mcu-watch-together-guest-v1'); window.location.reload(); }} title="Generate another guest name"><RefreshCw size={16} /></button></div>
            <button className="wt-create" disabled={busy} onClick={createRoom}>{busy ? 'Creating room…' : 'Create a screening room'}<Link2 size={17} /></button>
            <div className="wt-or"><span />OR JOIN A FRIEND<span /></div>
            <form className="wt-join-form" onSubmit={e => { e.preventDefault(); joinExisting(joinCode); }}><input value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8))} placeholder="Enter 8-character room code" maxLength={8} autoComplete="off" /><button disabled={busy || joinCode.length !== 8}>{busy ? 'Joining…' : 'Join room'}</button></form>
            {error && <p className="wt-error">{error}</p>}
            <p className="wt-privacy"><ShieldCheck size={14} /> Private room links are hard to guess. Guests can join without signing in.</p>
          </div> : <div className="wt-content">
            <div className="wt-main">
              <div className="wt-room-title"><div><span>NOW SCREENING</span><h2>{room.media?.title || itemMedia.title}</h2><small>{members.length} {members.length === 1 ? 'viewer' : 'viewers'} · {participant.is_host ? 'You are hosting' : 'Hosted by another viewer'}</small></div><button className="wt-copy" onClick={copyLink}>{copied ? <Check size={15} /> : <Copy size={15} />}{copied ? 'Copied' : 'Invite'}</button></div>
              <div className="wt-player"><iframe ref={iframeRef} src={sharedPlayerUrl} title={`Watch together: ${room.media?.title || itemMedia.title}`} allow="autoplay; fullscreen; picture-in-picture; encrypted-media" allowFullScreen onLoad={() => setPlayerReady(true)} /></div>
              <div className="wt-controls">
                <button onClick={() => sendPlayerCommand('seek', [Math.max(0, currentTimeRef.current - 10)])} aria-label="Back 10 seconds"><SkipBack size={17} /><small>10</small></button>
                <button className="wt-play" onClick={() => sendPlayerCommand(paused ? 'play' : 'pause')} aria-label={paused ? 'Play for everyone' : 'Pause for everyone'}>{paused ? <Play size={19} fill="currentColor" /> : <Pause size={19} fill="currentColor" />}</button>
                <button onClick={() => sendPlayerCommand('seek', [Math.min(duration || Infinity, currentTimeRef.current + 10)])} aria-label="Forward 10 seconds"><SkipForward size={17} /><small>10</small></button>
                <span className="wt-time">{timeText(currentTime)} / {timeText(duration)}</span>
                <button className="wt-mute" onClick={() => { sendPlayerCommand('setMuted', [!muted]); setMuted(!muted); }} aria-label={muted ? 'Unmute' : 'Mute'}>{muted ? <VolumeX size={17} /> : <Volume2 size={17} />}</button>
              </div>
              <div className="wt-seek"><span style={{ width: `${progressPercent}%` }} /><input type="range" min="0" max={Math.max(1, duration || 1)} step="1" value={Math.min(currentTime, duration || currentTime)} onChange={e => setCurrentTime(Number(e.target.value))} onPointerUp={e => { const time = Number(e.currentTarget.value); sendPlayerCommand('seek', [time]); publishPlayback({ position: time, paused: pausedRef.current }, true); }} onKeyUp={e => { if (e.key.startsWith('Arrow')) { const time = Number(e.currentTarget.value); sendPlayerCommand('seek', [time]); publishPlayback({ position: time, paused: pausedRef.current }, true); } }} aria-label="Seek shared playback" /></div>
              <div className="wt-members">{members.map(member => <div className="wt-member" key={member.id}><span className="wt-member-avatar"><img src={member.avatar_url || blobatar(member.display_name)} alt="" /></span><span>{member.display_name}</span>{member.is_host && <Crown size={13} />}</div>)}</div>
            </div>
            <aside className="wt-chat">
              <div className="wt-chat-head"><div><MessageCircle size={17} /><strong>Room chat</strong></div><span>{members.length} online</span></div>
              <div className="wt-chat-messages">{messages.map(message => <article className={message.participant_id === participant.id ? 'mine' : ''} key={message.id}><img src={message.avatar_url || blobatar(message.display_name)} alt="" /><div><div className="wt-message-meta"><b>{message.display_name}</b><time>{new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time></div><p>{message.body}</p></div></article>)}</div>
              <form className="wt-chat-form" onSubmit={sendChat}><input value={draft} onChange={e => setDraft(e.target.value.slice(0, 500))} placeholder="Say something…" maxLength={500} /><button disabled={!draft.trim() || busy} aria-label="Send message"><Send size={17} /></button></form>
              {error && <p className="wt-error wt-chat-error">{error}</p>}
              <div className="wt-chat-foot"><Clock3 size={13} /> Chat and room expire automatically after inactivity.</div>
            </aside>
          </div>}
        </section>
      </div>, document.body
    )}
  </>;
}
