import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Copy, Check, Users, MessageCircle, Play, Pause, SkipBack, SkipForward, X, Link2, Radio, Crown, Send, LogOut, RefreshCw, Volume2, VolumeX, Clock3, ShieldCheck, Search, ChevronRight } from 'lucide-react';
import { supabasePublicRequest, supabaseDataRequest } from '../supabase';

const RPC = '/rest/v1/rpc/';
const HISTORY_KEY = 'mcu-watch-together-history-v1';
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

const makeAccountIdentity = (user, profileName, profileAvatar) => {
  const displayName = String(profileName || user?.user_metadata?.display_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Viewer').trim().slice(0,32);
  const key = `mcu-watch-account-token-v1:${user.id}`;
  let token = '';
  try { token = localStorage.getItem(key) || ''; if (!token) { token = randomHex(); localStorage.setItem(key, token); } } catch { token = randomHex(); }
  const avatar = profileAvatar?.startsWith('http') ? profileAvatar : (user?.user_metadata?.avatar_url || user?.user_metadata?.picture || blobatar(displayName));
  return { name: displayName, token, avatar, isGuest: false };
};


export default function WatchTogether({ item, tmdbId, mediaType, season = 1, episode = 1, playerUrl, onEpisodeChange, onBeforeOpen, onWatchTogether, onClose, startOpen = false, launchOnly = false, user, profileName, profileAvatar, selectableItems = [], requireMediaSelection = false }) {
  const [guestNameOverride, setGuestNameOverride] = useState('');
  const guest = useMemo(() => { const identity=user?.id?makeAccountIdentity(user,profileName,profileAvatar):{...makeGuest(),isGuest:true}; if(!user?.id&&guestNameOverride){identity.name=guestNameOverride;identity.avatar=blobatar(guestNameOverride);} return identity; }, [user?.id,user?.displayName,user?.email,user?.user_metadata?.display_name,user?.user_metadata?.full_name,user?.user_metadata?.avatar_url,user?.user_metadata?.picture,profileName,profileAvatar,guestNameOverride]);
  const [open, setOpen] = useState(startOpen);
  const [showPlaybackNotice, setShowPlaybackNotice] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState(item || null);
  const [mediaQuery, setMediaQuery] = useState('');
  const [setupDialog, setSetupDialog] = useState(false);
  const [room, setRoom] = useState(null);
  const [participant, setParticipant] = useState(null);
  const [members, setMembers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [requests, setRequests] = useState([]);
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
  const [guestNameDraft, setGuestNameDraft] = useState('');
  const [editingGuestName, setEditingGuestName] = useState(false);
  const watchSecondsRef = useRef(0);
  const localHistoryFlushRef = useRef(0);
  const remoteHistoryFlushRef = useRef(0);
  const iframeRef = useRef(null);
  const pollRef = useRef(null);
  const playbackPollRef = useRef(null);
  const pollInFlightRef = useRef(false);
  const playbackPollInFlightRef = useRef(false);
  const heartbeatRef = useRef(null);
  const lastVersionRef = useRef(0);
  const applyingRemoteRef = useRef(false);
  const lastHostTimePushRef = useRef(0);
  const lastMessageIdRef = useRef(0);
  const roomRef = useRef(room);
  const onBeforeOpenRef = useRef(onBeforeOpen);
  const onEpisodeChangeRef = useRef(onEpisodeChange);
  const participantRef = useRef(participant);
  const currentTimeRef = useRef(0);
  const pausedRef = useRef(true);
  const playerReadyRef = useRef(false);
  useEffect(() => { if (item) setSelectedMedia(item); }, [item]);
  useEffect(() => { setGuestNameDraft(guest.name); }, [guest.name]);
  const itemMedia = useMemo(() => ({
    title: selectedMedia?.title || 'Untitled',
    poster: selectedMedia?.poster || '',
    tmdbId: Number(tmdbId || selectedMedia?.tmdbId || 0),
    mediaType: mediaType || selectedMedia?.mediaType || (selectedMedia?.type === 'series' ? 'tv' : 'movie'),
    season: Number(selectedMedia?.season || season || 1),
    episode: Number(selectedMedia?.epStart || selectedMedia?.episode || episode || 1),
    accent: selectedMedia?.accent || '#da1e37',
  }), [selectedMedia, tmdbId, mediaType, season, episode]);
  const filteredMediaItems = useMemo(() => {
    const term = mediaQuery.trim().toLowerCase();
    return selectableItems.filter(candidate => Number(candidate.tmdbId) > 0 && (!term || `${candidate.title || ''} ${candidate.year || ''} ${candidate.type || ''}`.toLowerCase().includes(term))).slice(0, 36);
  }, [selectableItems, mediaQuery]);
  useEffect(() => { roomRef.current = room; }, [room]);
  useEffect(() => { onBeforeOpenRef.current = onBeforeOpen; }, [onBeforeOpen]);
  useEffect(() => { onEpisodeChangeRef.current = onEpisodeChange; }, [onEpisodeChange]);
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
    setRequests(snapshot.requests || []);
    if (snapshot.participant) setParticipant(previous => previous ? { ...previous, ...snapshot.participant, token: previous.token } : previous);
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


  const updateGuestName = useCallback(async (value) => {
    if (!guest.isGuest) return;
    const name=String(value||'').trim().replace(/\s+/g,' ').slice(0,32);
    if(!name){setError('Choose a name between 1 and 32 characters.');return;}
    setBusy(true);setError('');
    try{
      const avatar=blobatar(name);
      if(roomRef.current&&participantRef.current) await rpc('rename_watch_room_participant',{p_code:roomRef.current.code,p_token:participantRef.current.token,p_name:name,p_avatar:avatar});
      try{localStorage.setItem('mcu-watch-together-guest-v1',JSON.stringify({name,token:guest.token,avatar}));}catch{}
      setGuestNameOverride(name);setGuestNameDraft(name);setEditingGuestName(false);
      setParticipant(previous=>previous?{...previous,display_name:name,avatar_url:avatar}:previous);
      setMembers(previous=>previous.map(member=>member.id===participantRef.current?.id?{...member,display_name:name,avatar_url:avatar}:member));
      setMessages(previous=>previous.map(message=>message.participant_id===participantRef.current?.id?{...message,display_name:name,avatar_url:avatar}:message));
    }catch(error){setError(error.message||'Could not update your guest name.');}
    finally{setBusy(false);}
  },[guest,rpc]);

  const joinExisting = useCallback(async (code, identity = guest) => {
    setBusy(true); setError(''); lastVersionRef.current = 0; watchSecondsRef.current=0; localHistoryFlushRef.current=0; remoteHistoryFlushRef.current=0;
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
      setShowPlaybackNotice(true);
      const url = new URL(window.location.href);
      url.hash = 'watch-together';
      url.searchParams.set('room', code.trim().toUpperCase());
      setRoomLink(url.toString());
      window.history.replaceState(null, '', url.toString());
    } catch (e) { setError(e.message || 'Could not join this room.'); }
    finally { setBusy(false); }
  }, [rpc, guest, applyRoomSnapshot]);

  const createRoom = useCallback(async () => {
    if (!itemMedia.tmdbId) { setError('This title does not have a TMDB ID, so a shared player cannot be created.'); return; }
    setBusy(true); setError(''); lastVersionRef.current = 0; watchSecondsRef.current=0; localHistoryFlushRef.current=0; remoteHistoryFlushRef.current=0;
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
      url.hash = 'watch-together';
      url.searchParams.set('room', code);
      const link = url.toString();
      setRoomLink(link);
      window.history.replaceState(null, '', link);
      setOpen(true);
      setShowPlaybackNotice(true);
      try { await navigator.clipboard.writeText(link); setCopied(true); window.setTimeout(() => setCopied(false), 2200); } catch {}
    } catch (e) { setError(e.message || 'Could not create the room.'); }
    finally { setBusy(false); }
  }, [rpc, guest, itemMedia, applyRoomSnapshot]);

  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get('room');
    if (code && !roomRef.current) {
      onBeforeOpenRef.current?.();
      setOpen(true);
      joinExisting(code);
    }
  }, [joinExisting]);

  const refreshRoom = useCallback(async () => {
    const activeRoom = roomRef.current;
    const activeParticipant = participantRef.current;
    if (!activeRoom?.code || !activeParticipant?.token || pollInFlightRef.current) return;
    pollInFlightRef.current = true;
    try {
      const result = await rpc('watch_room_snapshot', { p_code: activeRoom.code, p_token: activeParticipant.token });
      applyRoomSnapshot(result);
    } catch (e) {
      if (/expired|closed|not found|not a member/i.test(e.message || '')) {
        setError('This room has ended or expired.');
        window.clearInterval(pollRef.current);
        window.clearInterval(heartbeatRef.current);
      }
    } finally { pollInFlightRef.current = false; }
  }, [rpc, applyRoomSnapshot]);

  const refreshPlayback = useCallback(async () => {
    const activeRoom = roomRef.current;
    const activeParticipant = participantRef.current;
    if (!activeRoom?.code || !activeParticipant?.token || playbackPollInFlightRef.current) return;
    playbackPollInFlightRef.current = true;
    try {
      const state = await rpc('watch_room_playback_snapshot', { p_code: activeRoom.code, p_token: activeParticipant.token });
      const version = Number(state?.state_version || 0);
      const playback = state?.playback || {};
      if (version > lastVersionRef.current) {
        lastVersionRef.current = version;
        setPaused(Boolean(playback.paused));
        const target = Math.max(0, Number(playback.position) + (playback.paused ? 0 : Math.max(0, (Date.now() - Date.parse(playback.updated_at || state.updated_at || new Date().toISOString())) / 1000)));
        setCurrentTime(target);
        if (playback.actor !== activeParticipant.id && playerReadyRef.current && !applyingRemoteRef.current) {
          applyingRemoteRef.current = true;
          const frame = iframeRef.current;
          const send = (command, args = []) => frame?.contentWindow?.postMessage({ type: 'cinesrc:command', command, args }, 'https://cinesrc.st');
          if (Math.abs(currentTimeRef.current - target) > 1.25) send('seek', [target]);
          send(playback.paused ? 'pause' : 'play');
          setTimeout(() => { applyingRemoteRef.current = false; }, 550);
        }
      }
    } catch (error) {
      if (/expired|closed|not found|not a member/i.test(error.message || '')) setError('This room has ended or expired.');
    } finally { playbackPollInFlightRef.current = false; }
  }, [rpc]);
  useEffect(() => {
    if (!room || !participant) return undefined;
    refreshRoom();
    refreshPlayback();
    pollRef.current = window.setInterval(refreshRoom, 4200);
    playbackPollRef.current = window.setInterval(refreshPlayback, 450);
    heartbeatRef.current = window.setInterval(() => {
      const r = roomRef.current, p = participantRef.current;
      if (r && p) rpc('watch_room_heartbeat', { p_code: r.code, p_token: p.token }).catch(() => {});
    }, 12000);
    return () => { window.clearInterval(pollRef.current); window.clearInterval(playbackPollRef.current); window.clearInterval(heartbeatRef.current); };
  }, [room?.id, participant?.id, refreshRoom, refreshPlayback, rpc]);

  const publishPlayback = useCallback(async (next, force = false) => {
    const r = roomRef.current, p = participantRef.current;
    if (!r || !p || !['host','operator'].includes(p.role || (p.is_host ? 'host' : 'viewer')) || applyingRemoteRef.current) return;
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

  const canControl = Boolean(participant?.is_host || participant?.role === 'host' || participant?.role === 'operator');
  const requestAccess = async (type, payload = {}) => {
    if (!room || !participant || busy) return;
    setBusy(true); setError('');
    try { await rpc('request_watch_room_access', { p_code: room.code, p_token: participant.token, p_request_type: type, p_payload: payload }); await refreshRoom(); }
    catch (e) { setError(e.message || 'Could not send request.'); }
    finally { setBusy(false); }
  };
  const resolveRequest = async (requestId, approve) => {
    if (!room || !participant || !participant.is_host || busy) return;
    setBusy(true); setError('');
    try { await rpc('resolve_watch_room_request', { p_code: room.code, p_token: participant.token, p_request_id: Number(requestId), p_approve: approve }); await refreshRoom(); }
    catch (e) { setError(e.message || 'Could not update request.'); }
    finally { setBusy(false); }
  };
  const sendPlayerCommand = useCallback((command, args = []) => {
    if (!canControl && !applyingRemoteRef.current && !['getCurrentTime','getDuration'].includes(command)) { setError('Request Operator access from the host to control playback.'); return; }
    // Apply locally first; the RPC is only the shared state announcement.
    iframeRef.current?.contentWindow?.postMessage({ type: 'cinesrc:command', command, args }, 'https://cinesrc.st');
    if (command === 'play') { setPaused(false); pausedRef.current = false; publishPlayback({ position: currentTimeRef.current, paused: false }); }
    if (command === 'pause') { setPaused(true); pausedRef.current = true; publishPlayback({ position: currentTimeRef.current, paused: true }); }
    if (command === 'seek') { const position = Math.max(0, Number(args[0]) || 0); setCurrentTime(position); currentTimeRef.current = position; publishPlayback({ position, paused: pausedRef.current }, true); }
  }, [publishPlayback, canControl]);

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


  const flushWatchHistory = useCallback(async () => {
    const activeRoom=roomRef.current, activeParticipant=participantRef.current;
    if(!activeRoom||!activeParticipant)return;
    const total=watchSecondsRef.current, localDelta=total-localHistoryFlushRef.current;
    if(localDelta>0){
      localHistoryFlushRef.current=total;
      try{
        const rows=JSON.parse(localStorage.getItem(HISTORY_KEY)||'[]');
        const index=rows.findIndex(entry=>entry.room_code===activeRoom.code);
        const old=index>=0?rows[index]:null;
        const entry={room_code:activeRoom.code,title:activeRoom.media?.title||'Untitled screening',media:activeRoom.media||{},duration_seconds:Number(old?.duration_seconds||0)+localDelta,watched_at:old?.watched_at||new Date().toISOString(),last_watched_at:new Date().toISOString()};
        if(index>=0)rows[index]=entry;else rows.unshift(entry);
        localStorage.setItem(HISTORY_KEY,JSON.stringify(rows.slice(0,100)));
      }catch{}
    }
    const remoteDelta=total-remoteHistoryFlushRef.current;
    if(user?.id&&remoteDelta>0){
      try{
        await supabaseDataRequest(`${RPC}record_watch_together_history`,{method:'POST',body:JSON.stringify({p_code:activeRoom.code,p_token:activeParticipant.token,p_duration_seconds:remoteDelta})});
        remoteHistoryFlushRef.current=total;
      }catch{}
    }
  },[user?.id]);
  useEffect(()=>{
    if(!room||!participant)return undefined;
    const timer=window.setInterval(()=>{
      if(!pausedRef.current&&playerReadyRef.current)watchSecondsRef.current+=15;
      if(watchSecondsRef.current-localHistoryFlushRef.current>=30||watchSecondsRef.current-remoteHistoryFlushRef.current>=30)flushWatchHistory();
    },15000);
    return()=>window.clearInterval(timer);
  },[room?.id,participant?.id,flushWatchHistory]);

  const leaveRoom = async () => {
    await flushWatchHistory();
    const r = roomRef.current, p = participantRef.current;
    if (r && p) {
      if (p.is_host) await rpc('close_watch_room', { p_code: r.code, p_token: p.token }).catch(() => {});
      else await rpc('leave_watch_room', { p_code: r.code, p_token: p.token }).catch(() => {});
    }
    window.clearInterval(pollRef.current); window.clearInterval(playbackPollRef.current); window.clearInterval(heartbeatRef.current);
    setRoom(null); setParticipant(null); setMembers([]); setMessages([]); setRequests([]); setPlayerReady(false); lastVersionRef.current = 0; setOpen(false); setSetupDialog(false); onClose?.();
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
        if (canControl && Date.now() - lastHostTimePushRef.current > 4500) {
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
          const nextSeason = Number(data.season) || season;
          onEpisodeChangeRef.current?.(next);
          setRoom(previous => previous ? { ...previous, playback: { ...(previous.playback || {}), position: 0, paused: false, season: nextSeason, episode: next } } : previous);
          publishPlayback({ position: 0, paused: false, season: nextSeason, episode: next }, true);
        }
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [open, room?.id, participant?.id, canControl, publishPlayback, sendPlayerCommand, onEpisodeChange, season]);

  useEffect(() => {
    if (!room || !participant || !room.media) return;
    const roomEpisode = Number(room.playback?.episode || room.media.episode || episode);
    if (roomEpisode > 0 && roomEpisode !== Number(episode)) onEpisodeChangeRef.current?.(roomEpisode);
  }, [room?.state_version, room?.media?.episode, room?.playback?.episode, episode]);

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
  useEffect(() => { setPlayerReady(false); }, [sharedPlayerUrl]);
  useEffect(() => {
    if (!playerReady || !room?.playback) return;
    const playback = room.playback;
    const target = Math.max(0, Number(playback.position) || 0);
    applyingRemoteRef.current = true;
    sendPlayerCommand('seek', [target]);
    sendPlayerCommand(playback.paused ? 'pause' : 'play');
    setPaused(Boolean(playback.paused));
    window.setTimeout(() => { applyingRemoteRef.current = false; }, 1000);
  }, [playerReady, room?.id, sendPlayerCommand]);

  if (launchOnly) return <button type="button" className="watch-together-launch" onClick={() => { onBeforeOpenRef.current?.(); onWatchTogether?.(); }}><Users size={16} /><span>Watch together</span></button>;
  return <>
    {open && <section className={`wt-page${room ? ' wt-room-active' : ''}`} aria-label="Watch together">
          <header className="wt-topbar">
            <div className="wt-brand"><span className="wt-brand-mark"><Radio size={18} /></span><div><small>MCU VIEWING ORDER · WATCH TOGETHER</small><strong>{room ? `ROOM ${room.code}` : 'Watch together'}</strong></div></div>
            <button className="wt-close" onClick={() => room ? leaveRoom() : (setOpen(false), onClose?.())} aria-label="Back to watch page"><X size={19} /></button>
          </header>
          {!room ? <div className="wt-entry wt-connect-page">
            <div className="wt-entry-art wt-connect-hero"><div><span>PRIVATE SCREENING ROOM</span><h2>Watch together.</h2><p>Enter a room code to join your friends, or create a new room and invite them with a private link.</p></div></div>
            <div className="wt-connect-card">
              <div className="wt-picker-heading"><span>JOIN A SCREENING</span><h2>Have a room code?</h2><p>Enter the 8-character code shared by your host.</p></div>
              <form className="wt-join-form wt-code-form" onSubmit={e => { e.preventDefault(); joinExisting(joinCode); }}>
                <input value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8))} placeholder="ROOM CODE" maxLength={8} autoComplete="off" aria-label="Room code" />
                <button disabled={busy || joinCode.length !== 8}>{busy ? 'Joining…' : 'Join room'}<ChevronRight size={16}/></button>
              </form>
              <div className="wt-or"><span />OR<span /></div>
              <button type="button" className="wt-create" onClick={() => { setSetupDialog(true); setSelectedMedia(item || null); setError(''); }}><span><strong>Create a new room</strong><small>Choose a movie or series for your screening</small></span><Link2 size={18}/></button>
              <div className="wt-identity"><img src={guest.avatar} alt="" /><div><small>YOU'RE JOINING AS</small><strong>{guest.name}</strong><span>{guest.isGuest ? 'Guest · no account needed' : 'Signed in · profile identity'}</span></div>{guest.isGuest&&<button type="button" onClick={()=>setEditingGuestName(value=>!value)} title="Change guest name"><Pencil size={16}/></button>}</div>
              {guest.isGuest&&editingGuestName&&<form className="wt-guest-name-form" onSubmit={event=>{event.preventDefault();updateGuestName(guestNameDraft);}}><input value={guestNameDraft} onChange={event=>setGuestNameDraft(event.target.value)} maxLength={32} placeholder="Choose a guest name" aria-label="Guest name"/><button type="submit" disabled={busy||!guestNameDraft.trim()}>Save name</button></form>}
              {error && <p className="wt-error">{error}</p>}
              <p className="wt-privacy"><ShieldCheck size={14}/> Private room links are hard to guess. Guests can join without signing in.</p>
            </div>
          </div> : <div className="wt-content">
            <div className="wt-main">
              <div className="wt-room-title"><div><span>NOW SCREENING</span><h2>{room.media?.title || itemMedia.title}</h2><small>{members.length} {members.length === 1 ? 'viewer' : 'viewers'} · {participant.is_host ? 'Host' : (participant.role || 'viewer').replace(/^./, c => c.toUpperCase())}</small></div><div className="wt-room-actions">{guest.isGuest&&<button type="button" className="wt-copy" onClick={()=>setEditingGuestName(value=>!value)}><Pencil size={14}/> Name</button>}<button className="wt-copy" onClick={copyLink}>{copied ? <Check size={15}/> : <Copy size={15}/ >}{copied ? 'Copied' : 'Invite'}</button></div></div>
              {guest.isGuest&&editingGuestName&&<form className="wt-guest-name-form wt-room-rename" onSubmit={event=>{event.preventDefault();updateGuestName(guestNameDraft);}}><input value={guestNameDraft} onChange={event=>setGuestNameDraft(event.target.value)} maxLength={32} aria-label="Guest name"/><button type="submit" disabled={busy||!guestNameDraft.trim()}>Save name</button></form>}
              {showPlaybackNotice && <div className="wt-playback-tip" role="status"><span><strong>Playback tip</strong> If autoplay is blocked, tap Play once. A reputable ad blocker can help reduce pop-ups and redirects.</span><button type="button" onClick={() => setShowPlaybackNotice(false)} aria-label="Dismiss playback tip"><X size={15}/></button></div>}
              <div className="wt-player"><iframe ref={iframeRef} src={sharedPlayerUrl} title={`Watch together: ${room.media?.title || itemMedia.title}`} allow="autoplay; fullscreen; picture-in-picture; encrypted-media" allowFullScreen /></div>
              {!canControl && <div className="wt-role-banner"><ShieldCheck size={16}/><span>You’re a Viewer. Request Operator access to control playback, or ask for individual skips.</span><button type="button" onClick={() => requestAccess('operator')} disabled={busy}>Request Operator</button></div>}
              <div className="wt-controls">
                <button disabled={!canControl} onClick={() => sendPlayerCommand('seek', [Math.max(0, currentTimeRef.current - 10)])} aria-label="Back 10 seconds"><SkipBack size={17}/><small>10</small></button>
                <button className="wt-play" disabled={!canControl} onClick={() => sendPlayerCommand(paused ? 'play' : 'pause')} aria-label={paused ? 'Play for everyone' : 'Pause for everyone'}>{paused ? <Play size={19} fill="currentColor"/> : <Pause size={19} fill="currentColor"/>}</button>
                <button disabled={!canControl} onClick={() => sendPlayerCommand('seek', [Math.min(duration || Infinity, currentTimeRef.current + 10)])} aria-label="Forward 10 seconds"><SkipForward size={17}/><small>10</small></button>
                <span className="wt-time">{timeText(currentTime)} / {timeText(duration)}</span>
                <button className="wt-mute" disabled={!canControl} onClick={() => { sendPlayerCommand('setMuted', [!muted]); setMuted(!muted); }} aria-label={muted ? 'Unmute' : 'Mute'}>{muted ? <VolumeX size={17}/> : <Volume2 size={17}/>}</button>
              </div>
              <div className="wt-seek"><span style={{width:`${progressPercent}%`}}/><input type="range" disabled={!canControl} min="0" max={Math.max(1,duration || 1)} step="1" value={Math.min(currentTime,duration || currentTime)} onChange={e=>setCurrentTime(Number(e.target.value))} onPointerUp={e=>{const time=Number(e.currentTarget.value);sendPlayerCommand('seek',[time]);publishPlayback({position:time,paused:pausedRef.current},true);}} onKeyUp={e=>{if(e.key.startsWith('Arrow')){const time=Number(e.currentTarget.value);sendPlayerCommand('seek',[time]);publishPlayback({position:time,paused:pausedRef.current},true);}}} aria-label="Seek shared playback"/></div>
              {!canControl && <div className="wt-request-actions"><button onClick={()=>requestAccess('skip_back')} disabled={busy}>Request −10 sec</button><button onClick={()=>requestAccess('skip_forward')} disabled={busy}>Request +10 sec</button></div>}
              <div className="wt-members">{members.map(member=><div className="wt-member" key={member.id}><span className="wt-member-avatar"><img src={member.avatar_url || blobatar(member.display_name)} alt=""/></span><span>{member.display_name}</span>{(member.role==='host'||member.is_host)?<Crown size={13}/>:member.role==='operator'?<ShieldCheck size={13}/>:null}</div>)}</div>
            </div>
            <aside className="wt-chat">
              <div className="wt-chat-head"><div><MessageCircle size={17}/><strong>Room chat</strong></div><span>{members.length} online</span></div>
              <div className="wt-role-legend"><span><Crown size={12}/> Host</span><span><ShieldCheck size={12}/> Operator</span><span><Users size={12}/> Viewer</span></div>
              {participant?.is_host && requests.length>0 && <div className="wt-requests"><strong>Access requests <small>{requests.length}</small></strong>{requests.map(req=><div className="wt-request" key={req.id}><span><b>{req.display_name}</b><small>{({operator:'Operator access',skip_forward:'Skip forward 10s',skip_back:'Skip back 10s',seek:'Seek request'})[req.request_type] || req.request_type}</small></span><button onClick={()=>resolveRequest(req.id,true)} disabled={busy}>Allow</button><button onClick={()=>resolveRequest(req.id,false)} disabled={busy}>Deny</button></div>)}</div>}
              <div className="wt-chat-messages">{messages.map(message=><article className={message.participant_id===participant.id?'mine':''} key={message.id}><img src={message.avatar_url || blobatar(message.display_name)} alt=""/><div><div className="wt-message-meta"><b>{message.display_name}</b><time>{new Date(message.created_at).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</time></div><p>{message.body}</p></div></article>)}</div>
              <form className="wt-chat-form" onSubmit={sendChat}><input value={draft} onChange={e=>setDraft(e.target.value.slice(0,500))} placeholder="Say something…" maxLength={500}/><button disabled={!draft.trim()||busy} aria-label="Send message"><Send size={17}/></button></form>
              {error && <p className="wt-error wt-chat-error">{error}</p>}
              <div className="wt-chat-foot"><Clock3 size={13}/> Chat and room expire automatically after inactivity.</div>
            </aside>
          </div>}
          {setupDialog && <div className="wt-create-backdrop" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)setSetupDialog(false);}}>
            <section className="wt-create-dialog" role="dialog" aria-modal="true" aria-label="Create a screening room">
              <header><div><span>NEW SCREENING</span><h2>Choose your title</h2><p>Everyone joining this room will open this movie or series.</p></div><button type="button" onClick={()=>setSetupDialog(false)} aria-label="Close"><X size={18}/></button></header>
              <label className="wt-picker-search"><Search size={16}/><input value={mediaQuery} onChange={event=>setMediaQuery(event.target.value)} placeholder="Search your titles…"/></label>
              <div className="wt-picker-list">{filteredMediaItems.length?filteredMediaItems.map((candidate,index)=><button type="button" key={`${candidate.tmdbId || candidate.id}-${index}`} onClick={()=>{setSelectedMedia(candidate);setError('');}} className={selectedMedia?.tmdbId===candidate.tmdbId?'selected':''}><img src={candidate.poster || guest.avatar} alt=""/><span><strong>{candidate.title}</strong><small>{candidate.year || '—'} · {candidate.type==='series'||candidate.mediaType==='tv'?'Series':'Movie'}</small></span>{selectedMedia?.tmdbId===candidate.tmdbId?<Check size={17}/>:<ChevronRight size={16}/>}</button>):<p className="wt-picker-empty">No matching titles. Search for a title in Watch Browser first.</p>}</div>
              {selectedMedia && <div className="wt-dialog-selected"><img src={selectedMedia.poster || guest.avatar} alt=""/><span><strong>{selectedMedia.title}</strong><small>{selectedMedia.year || '—'} · {selectedMedia.type==='series'||selectedMedia.mediaType==='tv'?'Series':'Movie'}</small></span></div>}
              {error && <p className="wt-error">{error}</p>}
              <button className="wt-create" disabled={busy || !selectedMedia || !Number(selectedMedia.tmdbId)} onClick={async()=>{await createRoom();setSetupDialog(false);}}>{busy?'Creating room…':'Create screening room'}<Link2 size={17}/></button>
            </section>
          </div>}


    </section>}
  </>;
}
