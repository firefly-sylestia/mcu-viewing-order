import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, ChevronUp, Copy, Check, Users, MessageCircle, Play, Pause, SkipBack, SkipForward, X, Link2, Radio, Crown, Send, LogOut, RefreshCw, Volume2, VolumeX, Clock3, ShieldCheck, Search, ChevronRight, Pencil, PanelRightClose, PanelRightOpen, ArrowLeft, Settings2, UserMinus, Lock, Unlock, QrCode, Theater, Wifi, WifiOff, ArrowRightLeft, Timer, Smile, Mic, MicOff, Headphones } from 'lucide-react';
import { supabasePublicRequest, supabaseDataRequest } from '../supabase';

const RPC = '/rest/v1/rpc/';
const HISTORY_KEY = 'mcu-watch-together-history-v1';
const ACTIVE_ROOM_KEY = 'mcu-watch-together-active-room-v1';
const saveActiveRoom = (code, identity, media) => {
  try { localStorage.setItem(ACTIVE_ROOM_KEY, JSON.stringify({ code, identity: { token: identity.token, name: identity.name, avatar: identity.avatar, isGuest: Boolean(identity.isGuest) }, media, savedAt: new Date().toISOString() })); } catch {}
};
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

const getVoiceIceServers = () => {
  const fallback = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun.cloudflare.com:3478' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ];
  try {
    const configured = import.meta.env?.VITE_WEBRTC_ICE_SERVERS;
    if (!configured) return fallback;
    const parsed = JSON.parse(configured);
    return Array.isArray(parsed) && parsed.length ? parsed : fallback;
  } catch {
    return fallback;
  }
};

const makeAccountIdentity = (user, profileName, profileAvatar) => {
  const displayName = String(profileName || user?.user_metadata?.display_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Viewer').trim().slice(0,32);
  const key = `mcu-watch-account-token-v1:${user.id}`;
  let token = '';
  try { token = localStorage.getItem(key) || ''; if (!token) { token = randomHex(); localStorage.setItem(key, token); } } catch { token = randomHex(); }
  const avatar = profileAvatar?.startsWith('http') ? profileAvatar : (user?.user_metadata?.avatar_url || user?.user_metadata?.picture || blobatar(displayName));
  return { name: displayName, token, avatar, isGuest: false };
};


export default function WatchTogether({ item, tmdbId, mediaType, season = 1, episode = 1, playerUrl, onEpisodeChange, onBeforeOpen, onWatchTogether, onRoomStateChange, onClose, startOpen = false, launchOnly = false, user, profileName, profileAvatar, selectableItems = [], requireMediaSelection = false }) {
  const [guestNameOverride, setGuestNameOverride] = useState('');
  const guest = useMemo(() => { const identity=user?.id?makeAccountIdentity(user,profileName,profileAvatar):{...makeGuest(),isGuest:true}; if(!user?.id&&guestNameOverride){identity.name=guestNameOverride;identity.avatar=blobatar(guestNameOverride);} return identity; }, [user?.id,user?.displayName,user?.email,user?.user_metadata?.display_name,user?.user_metadata?.full_name,user?.user_metadata?.avatar_url,user?.user_metadata?.picture,profileName,profileAvatar,guestNameOverride]);
  const [open, setOpen] = useState(startOpen);
  useEffect(() => { setOpen(Boolean(startOpen)); }, [startOpen]);
  const [showPlaybackNotice, setShowPlaybackNotice] = useState(false);
  const [hostPanelOpen, setHostPanelOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [theatreMode, setTheatreMode] = useState(false);
  const [networkState, setNetworkState] = useState(typeof navigator !== 'undefined' && navigator.onLine ? 'online' : 'offline');
  const [networkLatency, setNetworkLatency] = useState(null);
  const [pendingEpisode, setPendingEpisode] = useState(null);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [controlsExpanded, setControlsExpanded] = useState(false);
  const [voiceMuted, setVoiceMuted] = useState(false);
  const [voiceError, setVoiceError] = useState('');
  const [voicePeerCount, setVoicePeerCount] = useState(0);
  const voiceStreamRef = useRef(null);
  const voicePeersRef = useRef(new Map());
  const voiceAudioRef = useRef(new Map());
  const voiceAudioContextRef = useRef(null);
  const voiceAudioNodesRef = useRef(new Map());
  const voiceMixersRef = useRef(new Map());
  const voiceRemoteSourcesRef = useRef(new Map());
  const voiceSignalCursorRef = useRef(0);
  const voiceMembersRef = useRef([]);
  const [ownedRooms, setOwnedRooms] = useState([]);
  const [roomsLoading, setRoomsLoading] = useState(false);
  const [localPlaybackOverride, setLocalPlaybackOverride] = useState(false);
  const [savedLocalPosition, setSavedLocalPosition] = useState(null);
  const [savedLocalPaused, setSavedLocalPaused] = useState(true);
  const [canReturnLocal, setCanReturnLocal] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState(item || null);
  const [mediaQuery, setMediaQuery] = useState('');
  const [tmdbMediaItems, setTmdbMediaItems] = useState([]);
  const [tmdbSearchLoading, setTmdbSearchLoading] = useState(false);
  const [availableSeasons, setAvailableSeasons] = useState([]);
  const [availableEpisodes, setAvailableEpisodes] = useState([]);
  const [seasonLoading, setSeasonLoading] = useState(false);
  const [episodeLoading, setEpisodeLoading] = useState(false);
  const [setupDialog, setSetupDialog] = useState(false);
  const [room, setRoom] = useState(null);
  useEffect(() => { onRoomStateChange?.(Boolean(room)); }, [room?.id, onRoomStateChange]);
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
  const [chatCollapsed, setChatCollapsed] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const compact = window.matchMedia('(max-width: 760px)');
    const syncChatDefault = () => setChatCollapsed(true);
    syncChatDefault();
    compact.addEventListener?.('change', syncChatDefault);
    return () => compact.removeEventListener?.('change', syncChatDefault);
  }, []);
  const [roomLink, setRoomLink] = useState('');
  const restoreAttemptedRef = useRef(false);
  const [guestNameDraft, setGuestNameDraft] = useState('');
  const [editingGuestName, setEditingGuestName] = useState(false);
  const watchSecondsRef = useRef(0);
  const localHistoryFlushRef = useRef(0);
  const remoteHistoryFlushRef = useRef(0);
  const iframeRef = useRef(null);
  const pendingPlayerCommandsRef = useRef([]);
  const durationRef = useRef(0);
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
  const localPlaybackOverrideRef = useRef(false);
  useEffect(() => { localPlaybackOverrideRef.current = localPlaybackOverride; }, [localPlaybackOverride]);
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
  useEffect(() => { const term=mediaQuery.trim(); if(term.length<2){setTmdbMediaItems([]);setTmdbSearchLoading(false);return undefined;} let active=true;
    const timer=window.setTimeout(async()=>{setTmdbSearchLoading(true);try{const response=await fetch('/api/tmdb/search?q='+encodeURIComponent(term));const data=await response.json();if(!response.ok)throw new Error(data.error||'TMDB search failed.');
      if(active)setTmdbMediaItems((data.results||[]).map(result=>({id:'tmdb-'+result.type+'-'+result.id,tmdbId:result.id,title:result.title,type:result.type==='tv'?'series':'film',mediaType:result.type,poster:result.poster,year:result.year,accent:'#da1e37',overview:result.overview,rating:result.rating})));
    }catch{if(active)setTmdbMediaItems([]);}finally{if(active)setTmdbSearchLoading(false);}},280);
    return()=>{active=false;window.clearTimeout(timer);};
  },[mediaQuery]);
  const filteredMediaItems=useMemo(()=>{const term=mediaQuery.trim().toLowerCase(),seen=new Set();return [...selectableItems,...tmdbMediaItems].filter(candidate=>{const id=Number(candidate.tmdbId),key=(candidate.mediaType||candidate.type)+':'+id;if(!id||seen.has(key))return false;seen.add(key);return !term||(candidate.title+' '+(candidate.year||'')+' '+(candidate.type||'')).toLowerCase().includes(term);}).slice(0,36);},[selectableItems,tmdbMediaItems,mediaQuery]);
  useEffect(() => { roomRef.current = room; }, [room]);
  useEffect(() => { onBeforeOpenRef.current = onBeforeOpen; }, [onBeforeOpen]);
  useEffect(() => { onEpisodeChangeRef.current = onEpisodeChange; }, [onEpisodeChange]);
  useEffect(() => { participantRef.current = participant; }, [participant]);
  useEffect(() => { currentTimeRef.current = currentTime; }, [currentTime]);
  useEffect(() => { pausedRef.current = paused; }, [paused]);
  useEffect(() => { playerReadyRef.current = playerReady; }, [playerReady]);
  useEffect(() => { durationRef.current = duration; }, [duration]);
  useEffect(() => { const online=()=>setNetworkState('online'),offline=()=>setNetworkState('offline'); window.addEventListener('online',online);window.addEventListener('offline',offline);return()=>{window.removeEventListener('online',online);window.removeEventListener('offline',offline);}; }, []);

  const rpc = useCallback(async (name, args) => {
    const options = { method: 'POST', body: JSON.stringify(args) };
    if (user?.id) return supabaseDataRequest(`${RPC}${name}`, options);
    return supabasePublicRequest(`${RPC}${name}`, options);
  }, [user?.id]);

  useEffect(()=>{voiceMembersRef.current=members;},[members]);
  const sendVoiceSignal=useCallback(async(to,payload)=>{const r=roomRef.current,p=participantRef.current;if(!r||!p)return;try{await rpc('send_watch_room_voice_signal',{p_code:r.code,p_token:p.token,p_to_participant_id:to,p_payload:payload});}catch(e){setVoiceError(e.message||'Voice connection signalling failed.');}},[rpc]);
  const startVoice=async()=>{
    if(voiceEnabled){setVoiceEnabled(false);setVoiceMuted(false);return;}
    setVoiceError('');
    try{
      if(!navigator.mediaDevices?.getUserMedia)throw new Error('Microphone access is not available in this browser.');
      const AudioContextClass=window.AudioContext||window.webkitAudioContext;
      if(!AudioContextClass)throw new Error('This browser does not support the audio mixing needed for host voice rooms.');
      let context=voiceAudioContextRef.current;
      if(!context||context.state==='closed'){context=new AudioContextClass();voiceAudioContextRef.current=context;}
      await context.resume();
      const stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true},video:false});
      voiceStreamRef.current=stream;
      setVoiceEnabled(true);
      setVoiceMuted(false);
    }catch(e){setVoiceError(e.name==='NotAllowedError'?'Allow microphone access to join voice chat.':e.message||'Could not start voice chat.');}
  };
  useEffect(()=>{
    if(!voiceEnabled||!room||!participant)return undefined;
    let active=true,polling=false;
    const peers=voicePeersRef.current;
    const isHost=Boolean(participant.is_host||participant.role==='host');
    const context=voiceAudioContextRef.current;
    const cleanupAudio=(remoteId)=>{
      const audio=voiceAudioRef.current.get(remoteId);
      if(audio){audio.pause();audio.srcObject=null;voiceAudioRef.current.delete(remoteId);}
      const node=voiceAudioNodesRef.current.get(remoteId);
      try{node?.source?.disconnect();node?.gain?.disconnect();}catch{}
      voiceAudioNodesRef.current.delete(remoteId);
    };
    const removePeer=(remoteId)=>{
      const pc=peers.get(remoteId);
      if(pc){peers.delete(remoteId);pc.onconnectionstatechange=null;pc.close();}
      cleanupAudio(remoteId);
      if(isHost){
        const remote=voiceRemoteSourcesRef.current.get(remoteId);
        try{remote?.source?.disconnect();}catch{}
        voiceRemoteSourcesRef.current.delete(remoteId);
        const mixer=voiceMixersRef.current.get(remoteId);
        try{mixer?.micSource?.disconnect();mixer?.destination?.disconnect?.();}catch{}
        voiceMixersRef.current.delete(remoteId);
      }
      setVoicePeerCount([...peers.values()].filter(peer=>peer.connectionState==='connected').length);
    };
    const createHostMixer=(remoteId)=>{
      if(voiceMixersRef.current.has(remoteId))return voiceMixersRef.current.get(remoteId);
      if(!context||context.state!=='running'||!voiceStreamRef.current)throw new Error('Audio mixer is not ready. Rejoin voice chat.');
      const destination=context.createMediaStreamDestination();
      const micSource=context.createMediaStreamSource(voiceStreamRef.current);
      micSource.connect(destination);
      for(const [sourceId,remote] of voiceRemoteSourcesRef.current){if(sourceId!==remoteId)remote.source.connect(destination);}
      const mixer={destination,micSource};
      voiceMixersRef.current.set(remoteId,mixer);
      return mixer;
    };
    const playIncoming=(remoteId,stream)=>{
      if(context&&context.state==='running'){
        try{
          const source=context.createMediaStreamSource(stream);
          const gain=context.createGain();
          gain.gain.value=1;
          source.connect(gain);
          gain.connect(context.destination);
          voiceAudioNodesRef.current.set(remoteId,{source,gain});
          return source;
        }catch{}
      }
      let audio=voiceAudioRef.current.get(remoteId);
      if(!audio){audio=new Audio();audio.autoplay=true;audio.playsInline=true;audio.setAttribute('playsinline','');audio.volume=1;voiceAudioRef.current.set(remoteId,audio);}
      audio.srcObject=stream;
      audio.play().catch(()=>setVoiceError('Audio playback is blocked. Tap Voice chat again and check your media volume.'));
      return null;
    };
    const makePeer=(remoteId)=>{
      if(peers.has(remoteId))return peers.get(remoteId);
      const pc=new RTCPeerConnection({iceServers:getVoiceIceServers(),iceTransportPolicy:'all',bundlePolicy:'max-bundle'});
      if(isHost){
        const mixer=createHostMixer(remoteId);
        const mixedTrack=mixer.destination.stream.getAudioTracks()[0];
        if(mixedTrack)pc.addTrack(mixedTrack,mixer.destination.stream);
      }else{
        voiceStreamRef.current?.getAudioTracks().forEach(track=>pc.addTrack(track,voiceStreamRef.current));
      }
      pc.__pendingIce=[];
      pc.__queuedIce=[];
      pc.__localDescriptionSent=false;
      pc.onicecandidate=e=>{if(!e.candidate)return;const candidate=e.candidate.toJSON();if(!pc.__localDescriptionSent)pc.__queuedIce.push(candidate);else sendVoiceSignal(remoteId,{type:'ice',candidate});};
      pc.ontrack=async e=>{
        const stream=e.streams?.[0]||(e.track?new MediaStream([e.track]):null);
        if(!stream||!context)return;
        if(context.state!=='running'){try{await context.resume();}catch{}}
        const old=voiceRemoteSourcesRef.current.get(remoteId);
        if(isHost&&old?.stream===stream)return;
        if(old){try{old.source.disconnect();}catch{}}
        const source=playIncoming(remoteId,stream);
        if(isHost&&source){
          voiceRemoteSourcesRef.current.set(remoteId,{source,stream});
          for(const [targetId,mixer] of voiceMixersRef.current){if(targetId!==remoteId){try{source.connect(mixer.destination);}catch{}}}
        }
      };
      pc.onconnectionstatechange=()=>{
        const connected=[...peers.values()].filter(peer=>peer.connectionState==='connected').length;
        setVoicePeerCount(connected);
        if(pc.connectionState==='failed')setVoiceError('Direct voice connection failed. This network may require a TURN relay.');
        if(['failed','closed'].includes(pc.connectionState))removePeer(remoteId);
      };
      peers.set(remoteId,pc);
      return pc;
    };
    const createOffers=async()=>{
      if(!isHost)return;
      for(const member of voiceMembersRef.current){
        if(!active)break;
        if(!member?.id||member.id===participant.id||peers.has(member.id))continue;
        try{
          const pc=makePeer(member.id);
          const offer=await pc.createOffer();
          await pc.setLocalDescription(offer);
          await sendVoiceSignal(member.id,{type:'offer',description:pc.localDescription.toJSON()});
          pc.__localDescriptionSent=true;
          for(const candidate of pc.__queuedIce.splice(0))await sendVoiceSignal(member.id,{type:'ice',candidate});
        }catch(e){removePeer(member.id);setVoiceError(e.message||'Could not connect a voice participant.');}
      }
    };
    const poll=async()=>{
      if(!active||polling)return;
      polling=true;
      try{
        const rows=await rpc('poll_watch_room_voice_signals',{p_code:room.code,p_token:participant.token,p_after_id:voiceSignalCursorRef.current});
        const signals=Array.isArray(rows)?rows:[];
        for(const signal of signals){
          if(!active)break;
          voiceSignalCursorRef.current=Math.max(voiceSignalCursorRef.current,Number(signal.id)||0);
          const sender=signal.sender_id,payload=signal.payload||{};
          if(!sender||sender===participant.id)continue;
          try{
            if(payload.type==='offer'){
              if(isHost)continue;
              const hostMember=voiceMembersRef.current.find(member=>member.is_host||member.role==='host');
              if(hostMember?.id&&sender!==hostMember.id)continue;
              const pc=makePeer(sender);
              await pc.setRemoteDescription(new RTCSessionDescription(payload.description));
              for(const candidate of pc.__pendingIce.splice(0))await pc.addIceCandidate(new RTCIceCandidate(candidate));
              const answer=await pc.createAnswer();
              await pc.setLocalDescription(answer);
              await sendVoiceSignal(sender,{type:'answer',description:pc.localDescription.toJSON()});
              pc.__localDescriptionSent=true;
              for(const candidate of pc.__queuedIce.splice(0))await sendVoiceSignal(sender,{type:'ice',candidate});
            }else if(payload.type==='answer'&&isHost){
              const pc=peers.get(sender);
              if(pc&&pc.signalingState!=='stable'){
                await pc.setRemoteDescription(new RTCSessionDescription(payload.description));
                for(const candidate of pc.__pendingIce.splice(0))await pc.addIceCandidate(new RTCIceCandidate(candidate));
              }
            }else if(payload.type==='ice'&&payload.candidate){
              const pc=peers.get(sender);
              if(!pc)continue;
              if(pc.remoteDescription)await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
              else pc.__pendingIce.push(payload.candidate);
            }else if(payload.type==='bye'){
              removePeer(sender);
            }
          }catch(e){setVoiceError(e.message||'Voice connection could not be established.');}
        }
      }catch(e){if(active)setVoiceError(e.message||'Voice signalling temporarily unavailable.');}
      finally{polling=false;}
    };
    createOffers();
    const timer=window.setInterval(()=>{createOffers();poll();},700);
    poll();
    return()=>{
      active=false;
      window.clearInterval(timer);
      for(const remoteId of peers.keys())sendVoiceSignal(remoteId,{type:'bye'});
      peers.forEach(pc=>pc.close());
      peers.clear();
      voiceMixersRef.current.forEach(mixer=>{try{mixer.micSource?.disconnect();mixer.destination?.disconnect?.();}catch{}});
      voiceMixersRef.current.clear();
      voiceRemoteSourcesRef.current.forEach(remote=>{try{remote.source?.disconnect();}catch{}});
      voiceRemoteSourcesRef.current.clear();
      voiceAudioNodesRef.current.forEach(node=>{try{node.source?.disconnect();node.gain?.disconnect();}catch{}});
      voiceAudioNodesRef.current.clear();
      voiceAudioRef.current.forEach(audio=>{audio.pause();audio.srcObject=null;});
      voiceAudioRef.current.clear();
      setVoicePeerCount(0);
    };
  },[voiceEnabled,room?.id,participant?.id,participant?.is_host,participant?.role,rpc,sendVoiceSignal]);
  useEffect(()=>{
    if(!voiceEnabled){
      voiceStreamRef.current?.getTracks().forEach(track=>track.stop());
      voiceStreamRef.current=null;
      voicePeersRef.current.forEach(pc=>pc.close());
      voicePeersRef.current.clear();
      voiceMixersRef.current.forEach(mixer=>{try{mixer.micSource?.disconnect();mixer.destination?.disconnect?.();}catch{}});
      voiceMixersRef.current.clear();
      voiceRemoteSourcesRef.current.forEach(remote=>{try{remote.source?.disconnect();}catch{}});
      voiceRemoteSourcesRef.current.clear();
      voiceAudioNodesRef.current.forEach(node=>{try{node.source?.disconnect();node.gain?.disconnect();}catch{}});
      voiceAudioNodesRef.current.clear();
      voiceAudioRef.current.forEach(audio=>{audio.pause();audio.srcObject=null;});
      voiceAudioRef.current.clear();
      if(voiceAudioContextRef.current&&voiceAudioContextRef.current.state!=='closed')voiceAudioContextRef.current.close().catch(()=>{});
      voiceAudioContextRef.current=null;
      setVoicePeerCount(0);
      return;
    }
    if(voiceStreamRef.current)voiceStreamRef.current.getAudioTracks().forEach(track=>{track.enabled=!voiceMuted;});
  },[voiceEnabled,voiceMuted]);

  useEffect(() => { if(!room||!participant)return;let active=true;const ping=async()=>{if(!navigator.onLine){setNetworkState('offline');return;}const start=performance.now();try{await rpc('watch_room_playback_snapshot',{p_code:room.code,p_token:participant.token});if(active){setNetworkLatency(Math.round(performance.now()-start));setNetworkState('online');}}catch{if(active)setNetworkState('reconnecting');}};ping();const timer=window.setInterval(ping,15000);return()=>{active=false;window.clearInterval(timer);};},[room?.id,participant?.id,rpc]);

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
      const previousTime = currentTimeRef.current;
      const previousPaused = pausedRef.current;
      if (!localPlaybackOverrideRef.current) { setPaused(Boolean(playback.paused)); pausedRef.current=Boolean(playback.paused); }
      if (Number.isFinite(Number(playback.position))) {
        const target = Math.max(0, Number(playback.position) + (playback.paused ? 0 : Math.max(0, (Date.now() - Date.parse(playback.updated_at || nextRoom.updated_at || new Date().toISOString())) / 1000)));
        if (!localPlaybackOverrideRef.current) { setCurrentTime(target); currentTimeRef.current=target; }
        if (playerReadyRef.current && !applyingRemoteRef.current) {
          const operatorSkip = Math.abs(previousTime - target) > 2.5;
          applyingRemoteRef.current = true;
          const frame = iframeRef.current;
          const send = (command, args = []) => frame?.contentWindow?.postMessage({ type: 'cinesrc:command', command, args }, 'https://cinesrc.st');
          if (!localPlaybackOverrideRef.current) {
            if (operatorSkip) send('seek', [target]);
            if (previousPaused !== Boolean(playback.paused)) send(playback.paused ? 'pause' : 'play');
            setPaused(Boolean(playback.paused)); pausedRef.current = Boolean(playback.paused);
          }
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

  const loadOwnedRooms = useCallback(async () => {
    if (!guest?.token) return;
    setRoomsLoading(true);
    try { const rows = await rpc('list_watch_rooms', { p_token: guest.token }); setOwnedRooms(Array.isArray(rows) ? rows : []); }
    catch (e) { setError(e.message || 'Could not load your screening rooms.'); }
    finally { setRoomsLoading(false); }
  }, [guest?.token, rpc]);

  const deleteOwnedRoom = useCallback(async (code) => {
    if (!code || busy) return;
    setBusy(true); setError('');
    try { await rpc('delete_watch_room', { p_code: code, p_token: guest.token }); setOwnedRooms(rows => rows.filter(row => row.code !== code)); }
    catch (e) { setError(e.message || 'Could not delete this room.'); }
    finally { setBusy(false); }
  }, [busy, guest?.token, rpc]);

  useEffect(() => {
    if (!open || room) return undefined;
    loadOwnedRooms();
    const timer=window.setInterval(loadOwnedRooms,30000);
    return()=>window.clearInterval(timer);
  }, [open, room?.id, loadOwnedRooms]);

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
      if (identity?.token) saveActiveRoom(code.trim().toUpperCase(), identity, result.room?.media || null);
      setOpen(true);
      setRoomLink(window.location.origin + '/watch-room/' + code.trim().toUpperCase());
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
      saveActiveRoom(code, guest, itemMedia);
      await loadOwnedRooms();
      const link = window.location.origin + '/watch-room/' + code;
      setRoomLink(link);
      setOpen(true);
      setShowPlaybackNotice(true);
      try { await navigator.clipboard.writeText(link); setCopied(true); window.setTimeout(() => setCopied(false), 2200); } catch {}
    } catch (e) { setError(e.message || 'Could not create the room.'); }
    finally { setBusy(false); }
  }, [rpc, guest, itemMedia, applyRoomSnapshot, loadOwnedRooms]);

  useEffect(() => {
    if (restoreAttemptedRef.current || roomRef.current) return;
    const pathCode = window.location.pathname.split('/').filter(Boolean);
    const sharePathCode = pathCode[0] === 'watch-room' ? pathCode[1] : null;
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem(ACTIVE_ROOM_KEY) || 'null'); } catch {}
    const code = new URLSearchParams(window.location.search).get('room') || sharePathCode || saved?.code;
    if (!code) return;
    restoreAttemptedRef.current = true;
    onBeforeOpenRef.current?.();
    setOpen(true);
    const identity = saved?.code === code.trim().toUpperCase() && saved.identity?.token ? saved.identity : guest;
    joinExisting(code, identity);
  }, [joinExisting, guest]);

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
        setRoom(previous => previous ? { ...previous, state_version: version, playback } : previous);
        if (!localPlaybackOverrideRef.current) { setPaused(Boolean(playback.paused)); pausedRef.current=Boolean(playback.paused); }
        const previousTime = currentTimeRef.current;
        const previousPaused = pausedRef.current;
        const target = Math.max(0, Number(playback.position) + (playback.paused ? 0 : Math.max(0, (Date.now() - Date.parse(playback.updated_at || state.updated_at || new Date().toISOString())) / 1000)));
        if (!localPlaybackOverrideRef.current) { setCurrentTime(target); currentTimeRef.current=target; }
        if (playback.actor !== activeParticipant.id && playerReadyRef.current && !applyingRemoteRef.current && !localPlaybackOverrideRef.current) {
          const operatorSkip = Math.abs(previousTime - target) > 2.5;
          applyingRemoteRef.current = true;
          const frame = iframeRef.current;
          const send = (command, args = []) => frame?.contentWindow?.postMessage({ type: 'cinesrc:command', command, args }, 'https://cinesrc.st');
          if (operatorSkip) send('seek', [target]);
          if (previousPaused !== Boolean(playback.paused)) send(playback.paused ? 'pause' : 'play');
          setTimeout(() => { applyingRemoteRef.current = false; }, 900);
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
    playbackPollRef.current = window.setInterval(refreshPlayback, 350);
    heartbeatRef.current = window.setInterval(() => {
      const r = roomRef.current, p = participantRef.current;
      if (r && p) rpc('watch_room_heartbeat', { p_code: r.code, p_token: p.token, p_position: currentTimeRef.current, p_duration: durationRef.current }).catch(() => {});
    }, 4000);
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
  const grantOperator = async (member) => {
    if (!room || !participant?.is_host || !member || member.is_host || member.role==='operator' || busy) return;
    setBusy(true); setError('');
    try { await rpc('grant_watch_room_operator',{p_code:room.code,p_token:participant.token,p_participant_id:member.id}); await refreshRoom(); }
    catch(e){setError(e.message||'Could not grant Operator access.');} finally{setBusy(false);}
  };
  const resolveRequest = async (requestId, approve) => {
    if (!room || !participant || !participant.is_host || busy) return;
    setBusy(true); setError('');
    try { await rpc('resolve_watch_room_request', { p_code: room.code, p_token: participant.token, p_request_id: Number(requestId), p_approve: approve }); await refreshRoom(); }
    catch (e) { setError(e.message || 'Could not update request.'); }
    finally { setBusy(false); }
  };
  const postPlayerCommand = useCallback((command, args = []) => {
    const message = { type: 'cinesrc:command', command, args };
    if (!playerReadyRef.current || !iframeRef.current?.contentWindow) {
      pendingPlayerCommandsRef.current = [...pendingPlayerCommandsRef.current, message].slice(-12);
      return false;
    }
    iframeRef.current.contentWindow.postMessage(message, 'https://cinesrc.st');
    return true;
  }, []);

  const sendPlayerCommand = useCallback((command, args = []) => {
    if (!canControl && !applyingRemoteRef.current && !['getCurrentTime','getDuration'].includes(command)) {
      if (['play','pause','seek'].includes(command)) {
        setLocalPlaybackOverride(true); localPlaybackOverrideRef.current = true;
        postPlayerCommand(command,args);
        if (command === 'play') { setPaused(false); pausedRef.current = false; }
        if (command === 'pause') { setPaused(true); pausedRef.current = true; }
        if (command === 'seek') { const position=Math.max(0,Number(args[0])||0);setCurrentTime(position);currentTimeRef.current=position; }
        return;
      }
      setError('Request Operator access from the host to control shared playback.'); return;
    }
    // Apply locally first; the RPC is only the shared state announcement.
    iframeRef.current?.contentWindow?.postMessage({ type: 'cinesrc:command', command, args }, 'https://cinesrc.st');
    if (command === 'play') { setPaused(false); pausedRef.current = false; publishPlayback({ position: currentTimeRef.current, paused: false }); }
    if (command === 'pause') { setPaused(true); pausedRef.current = true; publishPlayback({ position: currentTimeRef.current, paused: true }); }
    if (command === 'seek') { const position = Math.max(0, Number(args[0]) || 0); setCurrentTime(position); currentTimeRef.current = position; publishPlayback({ position, paused: pausedRef.current }, true); }
  }, [publishPlayback, canControl, postPlayerCommand]);

  const syncToRoom = useCallback(() => {
    if (!room?.playback || !playerReadyRef.current) return;
    setSavedLocalPosition(currentTimeRef.current); setSavedLocalPaused(pausedRef.current); setCanReturnLocal(true);
    const playback=room.playback;
    const target=Math.max(0,Number(playback.position)||0)+(playback.paused?0:Math.max(0,(Date.now()-Date.parse(playback.updated_at||room.updated_at||new Date().toISOString()))/1000));
    applyingRemoteRef.current=true; postPlayerCommand('seek',[target]);
    postPlayerCommand(playback.paused?'pause':'play',[]);
    setCurrentTime(target);currentTimeRef.current=target;setPaused(Boolean(playback.paused));pausedRef.current=Boolean(playback.paused);
    setLocalPlaybackOverride(false);localPlaybackOverrideRef.current=false;window.setTimeout(()=>{applyingRemoteRef.current=false;},900);
  }, [room, postPlayerCommand]);
  const returnToLocalPosition = useCallback(() => {
    if (savedLocalPosition == null || !playerReadyRef.current) return;
    applyingRemoteRef.current=true;postPlayerCommand('seek',[savedLocalPosition]);
    postPlayerCommand(savedLocalPaused?'pause':'play',[]);
    setCurrentTime(savedLocalPosition);currentTimeRef.current=savedLocalPosition;setPaused(savedLocalPaused);pausedRef.current=savedLocalPaused;setLocalPlaybackOverride(true);localPlaybackOverrideRef.current=true;setCanReturnLocal(false);
    window.setTimeout(()=>{applyingRemoteRef.current=false;},900);
  }, [savedLocalPosition, savedLocalPaused, postPlayerCommand]);

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

  const copyTimestamp = async () => { try { await navigator.clipboard.writeText(`${room?.media?.title || 'Watch Together'} · ${timeText(currentTimeRef.current)} · ${roomLink}`); setCopied(true); window.setTimeout(()=>setCopied(false),1800); } catch { setError('Could not copy timestamp.'); } };
  const updateRoomSettings = async (patch) => { if(!room||!participant?.is_host||busy)return;setBusy(true);setError('');try{await rpc('update_watch_room_settings',{p_code:room.code,p_token:participant.token,p_settings:patch});await refreshRoom();}catch(e){setError(e.message||'Could not update room settings.');}finally{setBusy(false);}};
  const transferHost = async (member) => {if(!member||!room||!participant?.is_host||busy)return;setBusy(true);setError('');try{await rpc('transfer_watch_room_host',{p_code:room.code,p_token:participant.token,p_participant_id:member.id});setHostPanelOpen(false);await refreshRoom();}catch(e){setError(e.message||'Could not transfer host privileges.');}finally{setBusy(false);}};
  const removeMember = async (member) => {if(!member||!room||!participant?.is_host||busy)return;setBusy(true);setError('');try{await rpc('remove_watch_room_participant',{p_code:room.code,p_token:participant.token,p_participant_id:member.id});setMembers(list=>list.filter(m=>m.id!==member.id));setConfirmAction(null);}catch(e){setError(e.message||'Could not remove participant.');}finally{setBusy(false);}};
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

  const minimizeRoom = async () => {
    await flushWatchHistory();
    setOpen(false);
    setSetupDialog(false);
    onClose?.();
  };

  const leaveRoom = async () => {
    await flushWatchHistory();
    const r = roomRef.current, p = participantRef.current;
    if (r && p) {
      if (p.is_host) await rpc('close_watch_room', { p_code: r.code, p_token: p.token }).catch(() => {});
      else await rpc('leave_watch_room', { p_code: r.code, p_token: p.token }).catch(() => {});
    }
    try { const saved = JSON.parse(localStorage.getItem(ACTIVE_ROOM_KEY) || 'null'); if (saved?.code === r?.code) localStorage.removeItem(ACTIVE_ROOM_KEY); } catch {}
    window.clearInterval(pollRef.current); window.clearInterval(playbackPollRef.current); window.clearInterval(heartbeatRef.current);
    setRoom(null); setParticipant(null); setMembers([]); setMessages([]); setRequests([]); setPlayerReady(false); lastVersionRef.current = 0; setLocalPlaybackOverride(false);localPlaybackOverrideRef.current=false;setCanReturnLocal(false);setOpen(false);setSetupDialog(false); onClose?.();
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
        playerReadyRef.current = true;
        const queued = pendingPlayerCommandsRef.current.splice(0);
        queued.forEach(command => iframeRef.current?.contentWindow?.postMessage(command, 'https://cinesrc.st'));
        sendPlayerCommand('getCurrentTime');
        sendPlayerCommand('getDuration');
      }
      if (data.type === 'cinesrc:timeupdate' && Number.isFinite(Number(data.currentTime))) {
        const time = Math.max(0, Number(data.currentTime));
        setCurrentTime(time);
        currentTimeRef.current = time;
        if (canControl && Date.now() - lastHostTimePushRef.current > 4500) {
          lastHostTimePushRef.current = Date.now();
          publishPlayback({ position: time, paused: pausedRef.current });
        }
      }
      if (data.type === 'cinesrc:loadedmetadata' && Number.isFinite(Number(data.duration))) { setDuration(Number(data.duration)); durationRef.current = Number(data.duration); }
      if (data.type === 'cinesrc:response' && data.command === 'getDuration' && Number.isFinite(Number(data.result))) { setDuration(Number(data.result)); durationRef.current = Number(data.result); }
      if (data.type === 'cinesrc:response' && data.command === 'getCurrentTime' && Number.isFinite(Number(data.result))) setCurrentTime(Number(data.result));
      if (data.type === 'cinesrc:play') {
        setPaused(false); pausedRef.current=false;
        if (!canControl && !applyingRemoteRef.current) { setLocalPlaybackOverride(true); localPlaybackOverrideRef.current=true; }
        if (!applyingRemoteRef.current && canControl) publishPlayback({ position: currentTimeRef.current, paused: false });
      }
      if (data.type === 'cinesrc:pause') {
        setPaused(true); pausedRef.current=true;
        if (!applyingRemoteRef.current && canControl) publishPlayback({ position: currentTimeRef.current, paused: true });
        else if (!canControl && !applyingRemoteRef.current) { setLocalPlaybackOverride(true); localPlaybackOverrideRef.current=true; }
      }
      if (data.type === 'cinesrc:seeked' && !applyingRemoteRef.current) {
        if (canControl) publishPlayback({ position: Number(data.currentTime) || currentTimeRef.current, paused: pausedRef.current }, true);
        else { setLocalPlaybackOverride(true); localPlaybackOverrideRef.current=true; }
      }
      if (data.type === 'cinesrc:nextepisode') {
        const next = Number(data.episode);
        if (Number.isInteger(next) && next > 0) {
          const nextSeason = Number(data.season) || season;
          if (canControl) setPendingEpisode({ season: nextSeason, episode: next, title: data.title || `Episode ${next}` });
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

  const activeSeason=Number(room?.playback?.season||room?.media?.season||1), activeEpisode=Number(room?.playback?.episode||room?.media?.episode||1);
  useEffect(()=>{if(!room?.media||room.media.mediaType!=='tv'){setAvailableSeasons([]);setAvailableEpisodes([]);return;}let active=true;setSeasonLoading(true);
    fetch('/api/tmdb/seasons?tmdbId='+encodeURIComponent(room.media.tmdbId)).then(r=>r.json().then(data=>({r,data}))).then(({r,data})=>{if(!r.ok)throw new Error();if(active)setAvailableSeasons(data.seasons||[]);}).catch(()=>{if(active)setAvailableSeasons([]);}).finally(()=>{if(active)setSeasonLoading(false);});
    return()=>{active=false;};},[room?.media?.tmdbId,room?.media?.mediaType]);
  useEffect(()=>{if(!room?.media||room.media.mediaType!=='tv')return;let active=true;setEpisodeLoading(true);
    fetch('/api/tmdb/episodes?tmdbId='+encodeURIComponent(room.media.tmdbId)+'&season='+activeSeason).then(r=>r.json().then(data=>({r,data}))).then(({r,data})=>{if(!r.ok)throw new Error();if(active)setAvailableEpisodes(data.episodes||[]);}).catch(()=>{if(active)setAvailableEpisodes([]);}).finally(()=>{if(active)setEpisodeLoading(false);});
    return()=>{active=false;};},[room?.media?.tmdbId,room?.media?.mediaType,activeSeason]);
  const changeRoomEpisode=async(s,e)=>{if((!canControl&&!room?.settings?.guests_can_change_episode)||!room)return;s=Number(s);e=Number(e);if(!canControl){try{await rpc('change_watch_room_episode',{p_code:room.code,p_token:participant.token,p_season:s,p_episode:e});await refreshRoom();}catch(err){setError(err.message||'Episode change was blocked.');}return;}setRoom(old=>old?{...old,playback:{...(old.playback||{}),season:s,episode:e,position:0,paused:false}}:old);setCurrentTime(0);currentTimeRef.current=0;setPaused(false);pausedRef.current=false;publishPlayback({season:s,episode:e,position:0,paused:false},true);};
  const [joinCode, setJoinCode] = useState('');
  const openJoin = () => { setOpen(true); setRoom(null); setParticipant(null); setError(''); };
  const progressPercent = duration ? Math.min(100, (currentTime / duration) * 100) : 0;
  useEffect(() => { setPlayerReady(false); }, [sharedPlayerUrl]);
  useEffect(() => {
    if (!playerReady || !room?.playback || localPlaybackOverrideRef.current) return;
    const playback = room.playback;
    const target = Math.max(0, Number(playback.position) + (playback.paused ? 0 : Math.max(0, (Date.now() - Date.parse(playback.updated_at || room.updated_at || new Date().toISOString())) / 1000)));
    applyingRemoteRef.current = true;
    postPlayerCommand('seek', [target]);
    postPlayerCommand(playback.paused ? 'pause' : 'play');
    setCurrentTime(target); currentTimeRef.current = target;
    setPaused(Boolean(playback.paused)); pausedRef.current = Boolean(playback.paused);
    window.setTimeout(() => { applyingRemoteRef.current = false; }, 900);
  }, [playerReady, room?.id, postPlayerCommand]);

  if (launchOnly) return <button type="button" className="watch-together-launch" onClick={() => { onBeforeOpenRef.current?.(); onWatchTogether?.(); }}><Users size={16} /><span>Watch together</span></button>;
  return <>
    {(open || room) && <section className={`wt-page${room ? ' wt-room-active' : ''}${theatreMode ? ' wt-theatre-mode' : ''}${!open ? ' wt-minimized' : ''}`} aria-label="Watch together">
          {!theatreMode && <button type="button" className="wt-page-back" onClick={minimizeRoom} aria-label="Go back"><ArrowLeft size={18}/><span>Back</span></button>}
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
              <section className="wt-owned-rooms">
                <header><div><small>ROOM MANAGEMENT</small><strong>Your created rooms</strong></div><button type="button" onClick={loadOwnedRooms} disabled={roomsLoading} aria-label="Refresh rooms"><RefreshCw size={14}/></button></header>
                {roomsLoading ? <p className="wt-owned-empty">Loading your rooms…</p> : ownedRooms.length ? <div className="wt-owned-list">{ownedRooms.map(saved=><article className="wt-owned-room" key={saved.id}><div className="wt-owned-poster">{saved.media?.poster?<img src={saved.media.poster} alt=""/>:<Radio size={17}/>}</div><div className="wt-owned-copy"><strong>{saved.media?.title || 'Screening room'}</strong><small>{saved.code} · {saved.is_active ? `${saved.viewer_count || 0} online` : 'Inactive'}</small><small>{saved.is_active ? 'Active now' : `Auto-delete in ${Math.max(0,Math.ceil((Date.parse(saved.expires_at)-Date.now())/60000))} min`}</small></div><button type="button" className="wt-owned-open" onClick={()=>joinExisting(saved.code,guest)} disabled={busy} aria-label={`Open room ${saved.code}`}><Play size={13}/><span>Open</span></button><button type="button" className="wt-owned-delete" onClick={()=>deleteOwnedRoom(saved.code)} disabled={busy} aria-label={`Delete room ${saved.code}`}><X size={16}/></button></article>)}</div> : <p className="wt-owned-empty">No rooms created with this identity yet.</p>}
              </section>
            </div>
          </div> : <div className="wt-content">
            <div className="wt-main">
              <div className="wt-room-title"><div><span>NOW SCREENING</span><h2>{room.media?.title || itemMedia.title}</h2><small>{members.length} {members.length === 1 ? 'viewer' : 'viewers'} · {participant.is_host ? 'Host' : (participant.role || 'viewer').replace(/^./, c => c.toUpperCase())}</small></div><div className="wt-room-actions">{room.settings?.voice_enabled===true&&<><button type="button" className={`wt-copy wt-voice-toggle${voiceEnabled?' active':''}`} onClick={startVoice} title={voiceEnabled?'Leave voice chat':'Join voice chat'}>{voiceEnabled?<Mic size={14}/>:<Headphones size={14}/>} {voiceEnabled?`Voice · ${voicePeerCount} connected`:'Join voice'}</button>{voiceEnabled&&<button type="button" className="wt-copy" onClick={()=>setVoiceMuted(v=>!v)} title={voiceMuted?'Unmute microphone':'Mute microphone'}>{voiceMuted?<MicOff size={14}/>:<Mic size={14}/>} {voiceMuted?'Muted':'Mic on'}</button>}</>}{guest.isGuest&&<button type="button" className="wt-copy" onClick={()=>setEditingGuestName(value=>!value)}><Pencil size={14}/> Name</button>}{participant.is_host&&<button type="button" className="wt-copy" onClick={()=>setHostPanelOpen(true)}><Settings2 size={14}/> Host controls</button>}{participant.is_host&&<button type="button" className="wt-copy wt-end-room" onClick={()=>setConfirmAction({type:'close'})}>End room</button>}<button className="wt-copy" onClick={copyLink}>{copied ? <Check size={15}/> : <Copy size={15}/ >}{copied ? 'Copied' : 'Invite'}</button></div></div>
              {guest.isGuest&&editingGuestName&&<form className="wt-guest-name-form wt-room-rename" onSubmit={event=>{event.preventDefault();updateGuestName(guestNameDraft);}}><input value={guestNameDraft} onChange={event=>setGuestNameDraft(event.target.value)} maxLength={32} aria-label="Guest name"/><button type="submit" disabled={busy||!guestNameDraft.trim()}>Save name</button></form>}
              {showPlaybackNotice && <div className="wt-playback-tip" role="status"><span><strong>Playback tip</strong> If autoplay is blocked, tap Play once. A reputable ad blocker can help reduce pop-ups and redirects.</span><button type="button" onClick={() => setShowPlaybackNotice(false)} aria-label="Dismiss playback tip"><X size={15}/></button></div>}
              <div className="wt-room-tools" aria-label="Room tools"><span className={`wt-network ${networkState}`} title={networkState==='online'?'Room connection is active':networkState==='offline'?'You are offline':'Trying to reconnect'}><i/><span>{networkState==='online'?'Connected':networkState==='offline'?'Offline':'Reconnecting'}</span>{networkLatency!=null&&networkState==='online'&&<small>{networkLatency} ms</small>}</span>{voiceError&&<span className="wt-voice-error" role="status">{voiceError}</span>}<div className="wt-room-tool-actions"><button type="button" onClick={()=>refreshRoom()} title="Reconnect to room" aria-label="Reconnect to room"><RefreshCw size={16}/></button><button type="button" onClick={copyTimestamp} title="Copy current timestamp" aria-label="Copy current timestamp"><Clock3 size={16}/></button><button type="button" onClick={()=>setTheatreMode(v=>!v)} title={theatreMode?'Exit theatre mode':'Theatre mode'} aria-label={theatreMode?'Exit theatre mode':'Theatre mode'}><Theater size={16}/></button><button type="button" onClick={()=>window.open(`https://quickchart.io/qr?size=220&text=${encodeURIComponent(roomLink)}`,'_blank','noopener,noreferrer')} title="Open room QR code" aria-label="Open room QR code"><QrCode size={16}/></button></div></div>
              {(localPlaybackOverride || canReturnLocal) && <div className="wt-local-playback wt-playback-actions"><span>{localPlaybackOverride ? 'Independent playback' : 'Room playback'}</span>{localPlaybackOverride&&<button type="button" onClick={syncToRoom} disabled={!playerReady} title="Sync your player with the room">Sync with room</button>}{canReturnLocal&&<button type="button" onClick={returnToLocalPosition} disabled={!playerReady} title="Return to your saved playback position">Return to my spot</button>}</div>}
              {room.media?.mediaType === "tv" && <section className="wt-episode-picker" aria-label="Choose season and episode">
                <div className="wt-episode-picker-head"><strong>SEASONS</strong><small>{seasonLoading ? "Loading seasons…" : availableSeasons.length + " available"}</small></div>
                <div className="wt-season-row">{availableSeasons.map(s=><button type="button" key={s.season_number} disabled={!canControl&&!room.settings?.guests_can_change_episode} className={activeSeason===Number(s.season_number)?"active":""} onClick={()=>changeRoomEpisode(s.season_number,1)}>{s.season_number===0?"Specials":"S"+s.season_number}</button>)}</div>
                <div className="wt-episode-picker-head wt-episode-heading"><strong>EPISODES</strong><small>{episodeLoading ? "Loading…" : availableEpisodes.length + " episodes"}</small></div>
                <div className="wt-episode-row">{availableEpisodes.map(ep=><button type="button" key={ep.episode_number} disabled={!canControl&&!room.settings?.guests_can_change_episode} className={activeEpisode===Number(ep.episode_number)?"active":""} onClick={()=>changeRoomEpisode(activeSeason,ep.episode_number)}><b>EP {ep.episode_number}</b><span>{ep.name || "Episode "+ep.episode_number}</span></button>)}</div>
                {!canControl && !room.settings?.guests_can_change_episode && <small className="wt-episode-lock">Only the host or an operator can change the room episode.</small>}
              </section>}
              <div className="wt-user-progress" aria-label="Participant playback progress">{members.map(member=>{const pct=Number(member.playback_duration)>0?Math.max(0,Math.min(100,Math.round(Number(member.playback_position||0)/Number(member.playback_duration)*100))):0;const pausedHere=Boolean(room.playback?.paused&&room.playback?.actor===member.id);return <span className="wt-progress-pill" key={member.id}><img src={member.avatar_url||blobatar(member.display_name)} alt=""/><b>{member.display_name}</b><i>{Number(member.playback_duration)>0?pct+"%":timeText(member.playback_position||0)}</i>{pausedHere&&<Pause className="wt-progress-paused" size={11} aria-label="Paused here"/>}</span>;})}</div>
              {pendingEpisode && <div className="wt-episode-transition"><div><strong>Next episode is ready</strong><span>Everyone can move to S{pendingEpisode.season} · E{pendingEpisode.episode}. Viewers who are behind can finish first.</span></div><button type="button" onClick={()=>setPendingEpisode(null)}>Finish current</button><button type="button" onClick={()=>{const next=pendingEpisode;setPendingEpisode(null);onEpisodeChangeRef.current?.(next.episode);setRoom(old=>old?{...old,playback:{...(old.playback||{}),position:0,paused:false,season:next.season,episode:next.episode}}:old);publishPlayback({position:0,paused:false,season:next.season,episode:next.episode},true);}}>Go now</button></div>}
              <div className="wt-player"><iframe ref={iframeRef} src={sharedPlayerUrl} title={`Watch together: ${room.media?.title || itemMedia.title}`} allow="autoplay; fullscreen; encrypted-media" allowFullScreen disablePictureInPicture /></div>
              {!canControl && <div className="wt-role-banner"><ShieldCheck size={16}/><span>You’re a Viewer. Request Operator access to control playback, or ask for individual skips.</span><button type="button" onClick={() => requestAccess('operator')} disabled={busy}>Request Operator</button></div>}
              <div className="wt-control-dock">
                <button type="button" className="wt-control-toggle" onClick={()=>setControlsExpanded(value=>!value)} aria-expanded={controlsExpanded}>
                  <span><Settings2 size={15}/><b>Playback controls</b><small>{timeText(currentTime)} / {timeText(duration)}</small></span>
                  {controlsExpanded?<ChevronUp size={17}/>:<ChevronDown size={17}/>}
                </button>
                {controlsExpanded&&<div className="wt-control-panel">
                  <div className="wt-controls"><button type="button" onClick={copyTimestamp} title="Copy timestamp"><Copy size={15}/></button>
                    <button disabled={!room || !playerReady} onClick={() => sendPlayerCommand('seek', [Math.max(0, currentTimeRef.current - 10)])} aria-label="Back 10 seconds"><SkipBack size={17}/><small>10</small></button>
                    <button className="wt-play" disabled={!room || !playerReady} onClick={() => sendPlayerCommand(paused ? 'play' : 'pause')} aria-label={paused ? 'Play for everyone' : 'Pause for everyone'}>{paused ? <Play size={19} fill="currentColor"/> : <Pause size={19} fill="currentColor"/>}</button>
                    <button disabled={!canControl && !room} onClick={() => sendPlayerCommand('seek', [Math.min(duration || Infinity, currentTimeRef.current + 10)])} aria-label="Forward 10 seconds"><SkipForward size={17}/><small>10</small></button>
                    <span className="wt-time">{timeText(currentTime)} / {timeText(duration)}</span>
                    <button className="wt-mute" disabled={!canControl} onClick={() => { sendPlayerCommand('setMuted', [!muted]); setMuted(!muted); }} aria-label={muted ? 'Unmute' : 'Mute'}>{muted ? <VolumeX size={17}/> : <Volume2 size={17}/>}</button>
                  </div>
                  <div className="wt-seek"><span style={{width:`${progressPercent}%`}}/><input type="range" disabled={!room || !playerReady} min="0" max={Math.max(1,duration || 1)} step="1" value={Math.min(currentTime,duration || currentTime)} onChange={e=>setCurrentTime(Number(e.target.value))} onPointerUp={e=>{const time=Number(e.currentTarget.value);sendPlayerCommand('seek',[time]);}} onKeyUp={e=>{if(e.key.startsWith('Arrow')){const time=Number(e.currentTarget.value);sendPlayerCommand('seek',[time]);}}} aria-label="Seek shared playback"/></div>
                  {!canControl && <div className="wt-request-actions"><button onClick={()=>requestAccess('skip_back')} disabled={busy}>Request −10 sec</button><button onClick={()=>requestAccess('skip_forward')} disabled={busy}>Request +10 sec</button></div>}
                </div>}
              </div>
              <div className="wt-members">{members.map(member=><button type="button" className={"wt-member"+(participant?.is_host&&!member.is_host?" wt-member-manage":"")} key={member.id} onClick={()=>participant?.is_host&&!member.is_host&&grantOperator(member)} disabled={!participant?.is_host||member.is_host||member.role==="operator"||busy} title={member.is_host?"Room host":member.role==="operator"?"Already an operator":participant?.is_host?"Make this participant an operator":"Room participant"}><span className="wt-member-avatar"><img src={member.avatar_url||blobatar(member.display_name)} alt=""/></span><span>{member.display_name}</span>{(member.role==="host"||member.is_host)?<Crown size={13}/>:member.role==="operator"?<ShieldCheck size={13}/>:participant?.is_host?<span className="wt-promote-hint">+ Operator</span>:null}</button>)}</div>
            </div>
            <aside className={"wt-chat"+(chatCollapsed?" is-collapsed":"")}>
              <div className="wt-chat-head"><div><MessageCircle size={17}/><strong>Room chat</strong></div><span>{members.length} online</span><button type="button" className="wt-chat-toggle" onClick={()=>setChatCollapsed(value=>!value)} aria-label={chatCollapsed?"Expand room chat":"Collapse room chat"} title={chatCollapsed?"Expand chat":"Collapse chat"}>{chatCollapsed?<PanelRightOpen size={17}/>:<PanelRightClose size={17}/>}</button></div>
              <div className="wt-role-legend"><span><Crown size={12}/> Host</span><span><ShieldCheck size={12}/> Operator</span><span><Users size={12}/> Viewer</span></div>
              {participant?.is_host && requests.length>0 && <div className="wt-requests"><strong>Access requests <small>{requests.length}</small></strong>{requests.map(req=><div className="wt-request" key={req.id}><span><b>{req.display_name}</b><small>{({operator:'Operator access',skip_forward:'Skip forward 10s',skip_back:'Skip back 10s',seek:'Seek request'})[req.request_type] || req.request_type}</small></span><button onClick={()=>resolveRequest(req.id,true)} disabled={busy}>Allow</button><button onClick={()=>resolveRequest(req.id,false)} disabled={busy}>Deny</button></div>)}</div>}
              <div className="wt-chat-messages">{messages.map(message=><article className={message.participant_id===participant.id?'mine':''} key={message.id}><img src={message.avatar_url || blobatar(message.display_name)} alt=""/><div><div className="wt-message-meta"><b>{message.display_name}</b><time>{new Date(message.created_at).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</time></div><p>{message.body}</p></div></article>)}</div>
              {room.settings?.reactions_enabled !== false && <div className="wt-reactions">{['❤️','😂','😮','👏','🔥'].map(emoji=><button type="button" key={emoji} disabled={busy||room.settings?.chat_enabled===false} onClick={()=>{setDraft(emoji);setTimeout(()=>{const form=document.querySelector('.wt-chat-form');form?.requestSubmit();},0);}}>{emoji}</button>)}</div>}
              {room.settings?.chat_enabled !== false ? <form className="wt-chat-form" onSubmit={sendChat}><input value={draft} onChange={e=>setDraft(e.target.value.slice(0,500))} placeholder="Say something…" maxLength={500}/><button disabled={!draft.trim()||busy} aria-label="Send message"><Send size={17}/></button></form> : <div className="wt-chat-disabled">The host has disabled room chat.</div>}
              {error && <p className="wt-error wt-chat-error">{error}</p>}
              <div className="wt-chat-foot"><Clock3 size={13}/> Chat and room expire automatically after inactivity.</div>
            </aside>
          </div>}
          {hostPanelOpen && typeof document !== 'undefined' && createPortal(<div className="wt-create-backdrop" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)setHostPanelOpen(false);}}><section className="wt-create-dialog wt-host-panel" role="dialog" aria-modal="true" aria-label="Host control panel"><header><div><span>ROOM MANAGEMENT</span><h2>Host control panel</h2><p>Manage access, permissions and your screening.</p></div><button type="button" onClick={()=>setHostPanelOpen(false)} aria-label="Close"><X size={18}/></button></header><div className="wt-host-settings"><label><span><b>Voice chat</b><small>Allow participants to start host-relayed voice chat.</small></span><input type="checkbox" checked={room.settings?.voice_enabled===true} onChange={e=>{if(!e.target.checked&&voiceEnabled){setVoiceEnabled(false);setVoiceMuted(false);}updateRoomSettings({voice_enabled:e.target.checked});}}/></label><label><span><b>Lock room</b><small>Only current participants can stay. New joins are blocked.</small></span><input type="checkbox" checked={Boolean(room.settings?.locked)} onChange={e=>updateRoomSettings({locked:e.target.checked})}/></label><label><span><b>Reactions</b><small>Allow quick emoji reactions in chat.</small></span><input type="checkbox" checked={room.settings?.reactions_enabled!==false} onChange={e=>updateRoomSettings({reactions_enabled:e.target.checked})}/></label><label><span><b>Room chat</b><small>Allow participants to send messages.</small></span><input type="checkbox" checked={room.settings?.chat_enabled!==false} onChange={e=>updateRoomSettings({chat_enabled:e.target.checked})}/></label><label><span><b>Guest episode changes</b><small>Let viewers change the shared episode.</small></span><input type="checkbox" checked={Boolean(room.settings?.guests_can_change_episode)} onChange={e=>updateRoomSettings({guests_can_change_episode:e.target.checked})}/></label><label><span><b>Room expiry</b><small>Choose how long the room can remain active.</small></span><select value={room.settings?.expiry_minutes||30} onChange={e=>updateRoomSettings({expiry_minutes:Number(e.target.value)})}><option value="30">30 minutes inactive</option><option value="60">1 hour inactive</option><option value="180">3 hours inactive</option><option value="480">8 hours inactive</option><option value="1440">24 hours inactive</option></select></label></div><div className="wt-host-people"><strong>Participants</strong>{members.filter(m=>!m.is_host).map(member=><div key={member.id}><span><b>{member.display_name}</b><small>{member.role==='operator'?'Operator':'Viewer'}</small></span><button type="button" disabled={busy||member.role==='operator'} onClick={()=>grantOperator(member)}>Make operator</button><button type="button" disabled={busy} onClick={()=>setConfirmAction({type:'remove',member})}><UserMinus size={14}/></button><button type="button" disabled={busy} onClick={()=>setConfirmAction({type:'transfer',member})}><ArrowRightLeft size={14}/></button></div>)}</div><div className="wt-host-danger"><button type="button" onClick={()=>setConfirmAction({type:'close'})}>Close screening room</button></div></section></div>,document.body)}
          {confirmAction && typeof document !== 'undefined' && createPortal(<div className="wt-create-backdrop" role="presentation"><section className="wt-create-dialog wt-confirm-dialog" role="alertdialog" aria-modal="true"><header><div><span>CONFIRM ACTION</span><h2>{confirmAction.type==='transfer'?'Transfer host privileges?':confirmAction.type==='remove'?'Remove participant?':'Close this room?'}</h2><p>{confirmAction.type==='transfer'?`${confirmAction.member.display_name} will become the host. You will become a viewer.`:confirmAction.type==='remove'?`${confirmAction.member.display_name} will be removed from this screening.`:'Everyone will be disconnected and the room will be permanently closed.'}</p></div></header><div className="wt-confirm-actions"><button type="button" onClick={()=>setConfirmAction(null)}>Cancel</button><button type="button" disabled={busy} onClick={async()=>{const action=confirmAction; if(action.type==='transfer')await transferHost(action.member);else if(action.type==='remove')await removeMember(action.member);else{setConfirmAction(null);await leaveRoom();}}}>{busy?'Working…':'Confirm'}</button></div></section></div>,document.body)}
          {setupDialog && typeof document !== 'undefined' && createPortal(<div className="wt-create-backdrop" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)setSetupDialog(false);}}>
            <section className="wt-create-dialog" role="dialog" aria-modal="true" aria-label="Create a screening room">
              <header><div><span>NEW SCREENING</span><h2>Choose your title</h2><p>Everyone joining this room will open this movie or series.</p></div><button type="button" onClick={()=>setSetupDialog(false)} aria-label="Close"><X size={18}/></button></header>
              <label className="wt-picker-search"><Search size={16}/><input value={mediaQuery} onChange={event=>setMediaQuery(event.target.value)} placeholder="Search any movie or series…"/></label>
              <div className="wt-picker-list">{tmdbSearchLoading && <p className="wt-picker-empty">Searching your library and TMDB…</p>}{filteredMediaItems.length?filteredMediaItems.map((candidate,index)=><button type="button" key={`${candidate.tmdbId || candidate.id}-${index}`} onClick={()=>{setSelectedMedia(candidate);setError('');}} className={selectedMedia?.tmdbId===candidate.tmdbId?'selected':''}><img src={candidate.poster || guest.avatar} alt=""/><span><strong>{candidate.title}</strong><small>{candidate.year || '—'} · {candidate.type==='series'||candidate.mediaType==='tv'?'Series':'Movie'}</small></span>{selectedMedia?.tmdbId===candidate.tmdbId?<Check size={17}/>:<ChevronRight size={16}/>}</button>):<p className="wt-picker-empty">No titles found. Try another title or spelling.</p>}</div>
              {selectedMedia && <div className="wt-dialog-selected"><img src={selectedMedia.poster || guest.avatar} alt=""/><span><strong>{selectedMedia.title}</strong><small>{selectedMedia.year || '—'} · {selectedMedia.type==='series'||selectedMedia.mediaType==='tv'?'Series':'Movie'}</small></span></div>}
              {error && <p className="wt-error">{error}</p>}
              <button className="wt-create" disabled={busy || !selectedMedia || !Number(selectedMedia.tmdbId)} onClick={async()=>{await createRoom();setSetupDialog(false);}}>{busy?'Creating room…':'Create screening room'}<Link2 size={17}/></button>
            </section>
          </div>, document.body)}


    </section>}

  </>;
}
