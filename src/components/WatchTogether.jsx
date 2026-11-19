import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, ChevronUp, Copy, Check, Users, Captions, MessageCircle, Play, Pause, SkipBack, SkipForward, X, Link2, Radio, Crown, Send, LogOut, RefreshCw, Volume2, VolumeX, Clock3, ShieldCheck, Search, ChevronRight, Pencil, PanelRightClose, PanelRightOpen, ArrowLeft, Settings2, UserMinus, Eye, EyeOff, Lock, Unlock, QrCode, Theater, Wifi, WifiOff, ArrowRightLeft, Timer, Smile, MonitorPlay, Maximize2, Minimize2, SlidersHorizontal } from 'lucide-react';
import { supabasePublicRequest, supabaseDataRequest } from '../supabase';


const RPC = '/rest/v1/rpc/';
const SOLO_PROGRESS_KEY = 'mcu-watch-together-solo-progress-v1';
const soloProgressId = media => media?.kind === 'local_file' ? 'file:' + String(media.fileFingerprint || '') : 'title:' + [media?.tmdbId || '', media?.mediaType || 'movie', media?.season || 1, media?.episode || 1].join(':');
const readSoloProgress = media => { try { const rows=JSON.parse(localStorage.getItem(SOLO_PROGRESS_KEY)||'{}'); return rows[soloProgressId(media)] || null; } catch { return null; } };
const saveSoloProgress = (media, position, duration) => { const id=soloProgressId(media); if(!id || id.endsWith(':')) return; try { const rows=JSON.parse(localStorage.getItem(SOLO_PROGRESS_KEY)||'{}'); rows[id]={title:media?.title||'Untitled',position:Math.max(0,Number(position)||0),duration:Math.max(0,Number(duration)||0),updatedAt:new Date().toISOString()}; localStorage.setItem(SOLO_PROGRESS_KEY,JSON.stringify(rows)); } catch {} };

const SUBTITLE_FILE_ACCEPT = '.srt,.vtt,text/vtt,application/x-subrip';
const subtitleToVtt = text => {
  const normalized = String(text || '').replace(/^\uFEFF/, '').replace(/\r/g, '').trim();
  if (/^WEBVTT(?:\s|$)/i.test(normalized)) return normalized;
  const body = normalized.replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2');
  return `WEBVTT\n\n${body}`;
};
const VIDEO_FILE_ACCEPT = 'video/*,.mkv,.avi,.mov,.wmv,.flv,.mpg,.mpeg,.m4v,.3gp,.3g2,.ts,.mts,.m2ts,.vob,.ogv,.mxf,.asf,.divx,.f4v,.rm,.rmvb,.dv,.mod,.tod,.nut,.nuv,.y4m,.m2v,.m1v';
const VIDEO_FILE_EXTENSIONS = new Set(VIDEO_FILE_ACCEPT.split(',').filter(value => value.startsWith('.')).map(value => value.slice(1)));
const videoFileExtension = file => String(file?.name || '').split('.').pop().toLowerCase();
const isSupportedVideoFile = file => Boolean(file && (String(file.type || '').startsWith('video/') || VIDEO_FILE_EXTENSIONS.has(videoFileExtension(file))));
const videoFileMime = file => {
  if (file?.type && file.type !== 'application/octet-stream') return file.type;
  return ({
    mkv:'video/x-matroska', mk3d:'video/x-matroska', mp4:'video/mp4', m4v:'video/mp4',
    webm:'video/webm', mov:'video/quicktime', qt:'video/quicktime', avi:'video/x-msvideo',
    wmv:'video/x-ms-wmv', flv:'video/x-flv', mpg:'video/mpeg', mpeg:'video/mpeg',
    mpe:'video/mpeg', ogv:'video/ogg', ogg:'video/ogg', '3gp':'video/3gpp',
    '3g2':'video/3gpp2', ts:'video/mp2t', mts:'video/mp2t', m2ts:'video/mp2t',
    vob:'video/dvd', asf:'video/x-ms-asf', divx:'video/divx', f4v:'video/mp4',
    rm:'application/vnd.rn-realmedia', rmvb:'application/vnd.rn-realmedia-vbr',
    mxf:'application/mxf', dv:'video/dv', mod:'video/mpeg', tod:'video/mpeg',
    m2v:'video/mpeg', m1v:'video/mpeg', nut:'video/x-nut', y4m:'video/x-raw'
  })[videoFileExtension(file)] || 'video/unknown';
};
const readLocalFileChunk = async blob => {
  const readWithFileReader = () => new Promise((resolve, reject) => {
    if (typeof FileReader === 'undefined') {
      reject(new Error('FileReader is unavailable.'));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => reader.result instanceof ArrayBuffer
      ? resolve(reader.result)
      : reject(new Error('The browser returned an invalid file buffer.'));
    reader.onerror = () => reject(reader.error || new Error('FileReader could not read this file.'));
    reader.onabort = () => reject(new Error('File reading was cancelled.'));
    try {
      reader.readAsArrayBuffer(blob);
    } catch (error) {
      reject(error);
    }
  });

  // Try both browser APIs. Some iOS document providers behave differently across the two readers.
  let fileReaderError;
  try {
    return await readWithFileReader();
  } catch (error) {
    fileReaderError = error;
  }

  if (typeof blob.arrayBuffer === 'function') {
    try {
      return await blob.arrayBuffer();
    } catch (arrayBufferError) {
      const details = [fileReaderError?.message, arrayBufferError?.message].filter(Boolean).join('; ');
      throw new Error(`This browser could not read the selected video. If it is in iCloud Drive, download it to this iPad in Files and try again.${details ? ` (Reader errors: ${details})` : ''}`);
    }
  }

  throw new Error(fileReaderError?.message || 'This browser cannot read the selected video file.');
};

const roomRequestError = (operation, error) => {
  const message = String(error?.message || error || '');
  if (error instanceof TypeError || /^(load failed|failed to fetch|networkerror|network request failed)$/i.test(message.trim())) {
    return `${operation} could not reach the room service. Check your connection and try again. (Browser: ${message || 'network error'})`;
  }
  return message || `${operation} failed. Please try again.`;
};

const fingerprintLocalVideo = async file => {
  if (!file || !file.size) throw new Error('Choose a non-empty video file.');
  const size = 1024 * 1024;
  const starts = [...new Set([0, Math.max(0, Math.floor(file.size / 2) - size / 2), Math.max(0, file.size - size)])];
  // Read sequentially: parallel reads from iCloud/Files document providers can fail on iPad.
  const chunks = [];
  for (const start of starts) {
    chunks.push(await readLocalFileChunk(file.slice(start, Math.min(file.size, start + size))));
  }
  if (!globalThis.crypto?.subtle?.digest) {
    throw new Error('Secure video verification is unavailable in this browser context. Open Incursion over HTTPS and try again.');
  }
  // Do not include browser MIME metadata: Android and desktop can report different MIME types for the same file.
  const header = new TextEncoder().encode(String(file.size));
  const bytes = new Uint8Array(header.byteLength + chunks.reduce((n, chunk) => n + chunk.byteLength, 0));
  bytes.set(header);
  let offset = header.byteLength;
  chunks.forEach(chunk => { bytes.set(new Uint8Array(chunk), offset); offset += chunk.byteLength; });
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), value => value.toString(16).padStart(2, '0')).join('');
};

const LOCAL_VIDEO_DB = 'mcu-watch-local-video-v1';
const LOCAL_VIDEO_STORE = 'videos';
const openLocalVideoDb = () => new Promise((resolve, reject) => {
  if (!('indexedDB' in window)) return reject(new Error('Local video storage is unavailable.'));
  const request = indexedDB.open(LOCAL_VIDEO_DB, 1);
  request.onupgradeneeded = () => {
    if (!request.result.objectStoreNames.contains(LOCAL_VIDEO_STORE)) request.result.createObjectStore(LOCAL_VIDEO_STORE);
  };
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error || new Error('Could not open local video storage.'));
});
const storeLocalVideo = async (fingerprint, file) => {
  const db = await openLocalVideoDb();
  try {
    await new Promise((resolve, reject) => {
      const tx = db.transaction(LOCAL_VIDEO_STORE, 'readwrite');
      tx.objectStore(LOCAL_VIDEO_STORE).put({ blob: file, name: file.name, type: file.type || '', lastModified: file.lastModified || Date.now() }, fingerprint);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error || new Error('Could not save the local video.'));
      tx.onabort = () => reject(tx.error || new Error('Local video storage was interrupted.'));
    });
  } finally { db.close(); }
};
const readLocalVideo = async fingerprint => {
  const db = await openLocalVideoDb();
  try {
    return await new Promise((resolve, reject) => {
      const request = db.transaction(LOCAL_VIDEO_STORE, 'readonly').objectStore(LOCAL_VIDEO_STORE).get(fingerprint);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error || new Error('Could not restore the local video.'));
    });
  } finally { db.close(); }
};

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
  const numeric = Number(seconds);
  const n = Number.isFinite(numeric) ? Math.max(0, Math.floor(numeric)) : 0;
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


export default function WatchTogether({ item, tmdbId, mediaType, season = 1, episode = 1, playerUrl, onEpisodeChange, onBeforeOpen, onWatchTogether, onRoomStateChange, onClose, startOpen = false, launchOnly = false, user, profileName, profileAvatar, selectableItems = [], requireMediaSelection = false }) {
  const [guestNameOverride, setGuestNameOverride] = useState('');
  const guest = useMemo(() => { const identity=user?.id?makeAccountIdentity(user,profileName,profileAvatar):{...makeGuest(),isGuest:true}; if(!user?.id&&guestNameOverride){identity.name=guestNameOverride;identity.avatar=blobatar(guestNameOverride);} return identity; }, [user?.id,user?.displayName,user?.email,user?.user_metadata?.display_name,user?.user_metadata?.full_name,user?.user_metadata?.avatar_url,user?.user_metadata?.picture,profileName,profileAvatar,guestNameOverride]);
  const [open, setOpen] = useState(startOpen);
  useEffect(() => { setOpen(Boolean(startOpen)); if (!startOpen) setTheatreMode(false); }, [startOpen]);
  const [showPlaybackNotice, setShowPlaybackNotice] = useState(false);
  const [hostPanelOpen, setHostPanelOpen] = useState(false);
  const [participantsOpen, setParticipantsOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [theatreMode, setTheatreMode] = useState(false);
  const [theatreChatOpen, setTheatreChatOpen] = useState(false);
  const [theatrePreviewsEnabled, setTheatrePreviewsEnabled] = useState(true);
  const [theatreToast, setTheatreToast] = useState(null);
  const [networkState, setNetworkState] = useState(typeof navigator !== 'undefined' && navigator.onLine ? 'online' : 'offline');
  const [networkLatency, setNetworkLatency] = useState(null);
  const [pendingEpisode, setPendingEpisode] = useState(null);
  const [controlsExpanded, setControlsExpanded] = useState(false);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [ownedRooms, setOwnedRooms] = useState([]);
  const [roomsLoading, setRoomsLoading] = useState(false);
  const [publicRooms, setPublicRooms] = useState([]);
  const [publicRoomsView, setPublicRoomsView] = useState(false);
  const [publicRoomEnabled, setPublicRoomEnabled] = useState(false);
  const [mediaSelectorExpanded, setMediaSelectorExpanded] = useState(false);
  const [localPlaybackOverride, setLocalPlaybackOverride] = useState(false);
  const [soloMode, setSoloMode] = useState(false);
  const [roomDeleted, setRoomDeleted] = useState(false);
  const [standaloneLocal, setStandaloneLocal] = useState(false);
  const [savedLocalPosition, setSavedLocalPosition] = useState(null);
  const [savedLocalPaused, setSavedLocalPaused] = useState(true);
  const [canReturnLocal, setCanReturnLocal] = useState(false);
  const [syncNoticeDismissed, setSyncNoticeDismissed] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState(item || null);
  
  const [localVideoError,setLocalVideoError]=useState('');
  const [localSubtitleUrl,setLocalSubtitleUrl]=useState('');
  const [localSubtitleName,setLocalSubtitleName]=useState('');
  const [localSubtitleEnabled,setLocalSubtitleEnabled]=useState(true);
  const [localAudioTracks,setLocalAudioTracks]=useState([]);
  const [localAudioTrackIndex,setLocalAudioTrackIndex]=useState(-1);
  const [localTextTracks,setLocalTextTracks]=useState([]);
  const [localTextTrackIndex,setLocalTextTrackIndex]=useState(-1);
  const [localTracksOpen,setLocalTracksOpen]=useState(false);
  const subtitleFileInputRef=useRef(null);
  const [isLocalFullscreen,setIsLocalFullscreen]=useState(false);
  const [localControlsVisible,setLocalControlsVisible]=useState(true);
  const [localControlsLocked,setLocalControlsLocked]=useState(false);
  const [localAdjustmentsOpen,setLocalAdjustmentsOpen]=useState(false);
  const [localTabletRatio,setLocalTabletRatio]=useState(false);
  const [localBrightness,setLocalBrightness]=useState(100);
  const [localContrast,setLocalContrast]=useState(100);
  const [localSaturation,setLocalSaturation]=useState(100);
  const [localExposure,setLocalExposure]=useState(0);
  const [localTemperature,setLocalTemperature]=useState(0);
  const [localTint,setLocalTint]=useState(0);
  const [localHue,setLocalHue]=useState(0);
  const [localGradeColor,setLocalGradeColor]=useState('#000000');
  const [localGradeColorStrength,setLocalGradeColorStrength]=useState(0);
  const [localGradeHighlightColor,setLocalGradeHighlightColor]=useState('#f2d6ae');
  const [localGradeShadowColor,setLocalGradeShadowColor]=useState('#26364a');
  const [localGradeSplitStrength,setLocalGradeSplitStrength]=useState(0);
  const [localBackgroundColor,setLocalBackgroundColor]=useState('#000000');
  const [localCodecDiagnostics,setLocalCodecDiagnostics]=useState(null);
  const localControlsLockedRef=useRef(false);
  const localControlsHideTimerRef=useRef(null);
  const [roomType,setRoomType]=useState('movie');const [localFile,setLocalFile]=useState(null);const [localFileFingerprint,setLocalFileFingerprint]=useState('');const [localFileBusy,setLocalFileBusy]=useState(false);const [pendingJoinCode,setPendingJoinCode]=useState('');const [pendingJoinIdentity,setPendingJoinIdentity]=useState(null);const [pendingJoinMedia,setPendingJoinMedia]=useState(null);const [joinPreviewOpen,setJoinPreviewOpen]=useState(false);const [isChangingMedia,setIsChangingMedia]=useState(false);const [localVideoUrl,setLocalVideoUrl]=useState('');const localSelectionBeforeChangeRef=useRef(null);const localFileInputRef=useRef(null);const joinFileInputRef=useRef(null);const soloFileInputRef=useRef(null);const localVideoRef=useRef(null);
  const [mediaQuery, setMediaQuery] = useState('');
  const [tmdbMediaItems, setTmdbMediaItems] = useState([]);
  const [tmdbSearchLoading, setTmdbSearchLoading] = useState(false);
  const [availableSeasons, setAvailableSeasons] = useState([]);
  const [availableEpisodes, setAvailableEpisodes] = useState([]);
  const [seasonLoading, setSeasonLoading] = useState(false);
  const [episodeLoading, setEpisodeLoading] = useState(false);
  const [setupDialog, setSetupDialog] = useState(false);
  const [room, setRoom] = useState(null);
  useEffect(() => { onRoomStateChange?.(Boolean(room && !soloMode)); }, [room?.id, soloMode, onRoomStateChange]);
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
  const theatreSeenMessageIdRef = useRef(0);
  useEffect(() => { if (!theatreToast) return undefined; const timer=window.setTimeout(()=>setTheatreToast(null),5200); return ()=>window.clearTimeout(timer); }, [theatreToast]);
  useEffect(() => {
    if (!theatreMode && !isLocalFullscreen) { setTheatreChatOpen(false); setTheatreToast(null); return; }
    if (!theatreMode || !messages.length) return;
    const newestId=Math.max(...messages.map(message=>Number(message.id)||0));
    if (theatreSeenMessageIdRef.current > 0 && newestId > theatreSeenMessageIdRef.current && theatrePreviewsEnabled) {
      const incoming=messages.filter(message=>Number(message.id)>theatreSeenMessageIdRef.current&&message.participant_id!==participant?.id);
      if(incoming.length)setTheatreToast(incoming[incoming.length-1]);
    }
    theatreSeenMessageIdRef.current=newestId;
  }, [messages,theatreMode,isLocalFullscreen,theatrePreviewsEnabled,participant?.id]);
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
  useEffect(() => { const openLocalPlayer = () => soloFileInputRef.current?.click(); window.addEventListener('incursion:open-local-player', openLocalPlayer); return () => window.removeEventListener('incursion:open-local-player', openLocalPlayer); }, []);
  useEffect(() => { if (item) setSelectedMedia(item); }, [item]);
  useEffect(() => { setGuestNameDraft(guest.name); }, [guest.name]);
  const itemMedia = useMemo(() => ({
    title: selectedMedia?.title || 'Untitled',
    poster: selectedMedia?.poster || '',
    tmdbId: Number(selectedMedia?.tmdbId || tmdbId || 0),
    mediaType: selectedMedia?.mediaType || (selectedMedia?.type === 'series' ? 'tv' : null) || mediaType || 'movie',
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
  useEffect(() => () => { if (localSubtitleUrl) URL.revokeObjectURL(localSubtitleUrl); }, [localSubtitleUrl]);
  useEffect(() => {
    const video = localVideoRef.current;
    if (!video) return;
    const syncTracks = () => {
      const audio = video.audioTracks;
      if (audio) {
        const list = Array.from({ length: audio.length }, (_, index) => ({ index, label: audio[index].label || audio[index].language || `Audio ${index + 1}`, language: audio[index].language || '' }));
        setLocalAudioTracks(list);
        const active = list.find(track => audio[track.index].enabled)?.index ?? (list[0]?.index ?? -1);
        setLocalAudioTrackIndex(active);
        if (active >= 0 && !audio[active].enabled) audio[active].enabled = true;
      } else { setLocalAudioTracks([]); setLocalAudioTrackIndex(-1); }
      const text = video.textTracks;
      if (text) {
        const list = Array.from({ length: text.length }, (_, index) => ({ index, label: text[index].label || text[index].language || `Subtitle ${index + 1}`, language: text[index].language || '', kind: text[index].kind || 'subtitles' }));
        setLocalTextTracks(list);
        const active = list.find(track => text[track.index].mode === 'showing' || text[track.index].mode === 'hidden')?.index ?? -1;
        setLocalTextTrackIndex(active);
      } else { setLocalTextTracks([]); setLocalTextTrackIndex(-1); }
    };
    syncTracks();
    const audio = video.audioTracks;
    const text = video.textTracks;
    audio?.addEventListener?.('addtrack', syncTracks);
    audio?.addEventListener?.('removetrack', syncTracks);
    text?.addEventListener?.('addtrack', syncTracks);
    text?.addEventListener?.('removetrack', syncTracks);
    video.addEventListener('loadedmetadata', syncTracks);
    video.addEventListener('loadeddata', syncTracks);
    return () => {
      audio?.removeEventListener?.('addtrack', syncTracks); audio?.removeEventListener?.('removetrack', syncTracks);
      text?.removeEventListener?.('addtrack', syncTracks); text?.removeEventListener?.('removetrack', syncTracks);
      video.removeEventListener('loadedmetadata', syncTracks); video.removeEventListener('loadeddata', syncTracks);
    };
  }, [localVideoUrl, room?.media?.fileFingerprint]);
  useEffect(() => {
    const tracks = localVideoRef.current?.textTracks;
    if (!tracks) return;
    if (localSubtitleUrl && localSubtitleEnabled && localTextTrackIndex < 0 && tracks.length) {
      setLocalTextTrackIndex(tracks.length - 1);
      return;
    }
    Array.from(tracks).forEach((track, index) => { track.mode = index === localTextTrackIndex ? 'showing' : 'disabled'; });
  }, [localSubtitleEnabled, localSubtitleUrl, localTextTrackIndex, localVideoUrl]);
  const selectLocalTextTrack = index => {
    const tracks = localVideoRef.current?.textTracks;
    if (!tracks) return;
    Array.from(tracks).forEach((track, trackIndex) => { track.mode = index === trackIndex ? 'showing' : 'disabled'; });
    setLocalTextTrackIndex(index);
    setLocalSubtitleEnabled(index >= 0);
  };
  const selectLocalAudioTrack = index => {
    const tracks = localVideoRef.current?.audioTracks;
    if (!tracks) return;
    Array.from({ length: tracks.length }, (_, trackIndex) => { tracks[trackIndex].enabled = trackIndex === index; });
    setLocalAudioTrackIndex(index);
  };
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
          const send = (command, args = []) => {if(nextRoom.media?.kind==='local_file')postPlayerCommand(command,args);else frame?.contentWindow?.postMessage({type:'cinesrc:command',command,args},'https://cinesrc.st');};
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

  const loadPublicRooms = useCallback(async () => {
    try {
      const rows = await rpc('list_public_watch_rooms', {});
      setPublicRooms(Array.isArray(rows) ? rows : []);
    } catch (e) { setError(e.message || 'Could not load public rooms.'); }
  }, [rpc]);

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
    catch (e) { setError(e.message || 'Could not delete this room. Someone may still be watching.'); }
    finally { setBusy(false); }
  }, [busy, guest?.token, rpc]);

  useEffect(() => {
    if (!open || room) return undefined;
    loadOwnedRooms();
    loadPublicRooms();
    const timer=window.setInterval(() => { loadOwnedRooms(); loadPublicRooms(); },15000);
    return()=>window.clearInterval(timer);
  }, [open, room?.id, loadOwnedRooms, loadPublicRooms]);

  const joinExisting = useCallback(async (code, identity = guest, verifiedFingerprint = localFileFingerprint, previewFallback = false) => {
    setBusy(true);
    setError('');
    lastVersionRef.current = 0;
    watchSecondsRef.current = 0;
    localHistoryFlushRef.current = 0;
    remoteHistoryFlushRef.current = 0;
    const normalizedCode = code.trim().toUpperCase();
    try {
      const result = await rpc('join_watch_room', {
        p_code: normalizedCode,
        p_token: identity.token,
        p_name: identity.name,
        p_avatar: identity.avatar,
      });
      const remoteLocalVideo = false;
      if (result.room?.media?.kind === 'local_file' && !remoteLocalVideo && previewFallback && !verifiedFingerprint) {
        await rpc('leave_watch_room', { p_code: normalizedCode, p_token: identity.token }).catch(() => {});
        setPendingJoinCode(normalizedCode);
        setPendingJoinIdentity(identity);
        setPendingJoinMedia(result.room.media);
        setJoinPreviewOpen(true);
        return false;
      }
      if (result.room?.media?.kind === 'local_file' && !remoteLocalVideo && result.room.media.fileFingerprint !== verifiedFingerprint) {
        throw new Error('That file does not match this room. Select the exact same video file.');
      }
      if (remoteLocalVideo) {
        setLocalFile(null);
        setLocalFileFingerprint('');
        setLocalVideoUrl(previous => { if (previous) URL.revokeObjectURL(previous); return ''; });
      }
      setParticipant(result.participant);
      applyRoomSnapshot(result);
      if (identity?.token) saveActiveRoom(normalizedCode, identity, result.room?.media || null);
      setOpen(true);
      setRoomLink(window.location.origin + '/watch-room/' + normalizedCode);
      return true;
    } catch (e) {
      setError(roomRequestError('Joining this room', e));
      return false;
    } finally {
      setBusy(false);
    }
  }, [rpc, guest, applyRoomSnapshot, localFileFingerprint]);
  const beginJoin = useCallback(async (code, identity = guest) => {
    const normalizedCode = code.trim().toUpperCase();
    if (!normalizedCode) return;
    setBusy(true);
    setError('');
    try {
      const preview = await rpc('preview_watch_room', { p_code: normalizedCode });
      if (preview?.media?.kind === 'local_file') {
        setPendingJoinCode(normalizedCode);
        setPendingJoinIdentity(identity);
        setPendingJoinMedia(preview.media);
        setJoinPreviewOpen(true);
      } else {
        await joinExisting(normalizedCode, identity);
      }
    } catch (e) {
      setError(roomRequestError('Loading this room', e));
    } finally {
      setBusy(false);
    }
  }, [rpc, joinExisting, guest]);
  const handleLocalFile = useCallback(async (file, expectedFingerprint = '', activate = true) => {
    if (!file) return '';
    setLocalFileBusy(true);
    setError('');
    try {
      if (!isSupportedVideoFile(file)) throw new Error('Choose a supported video file. Common formats include MP4, MKV, WebM, MOV, AVI, WMV and MPEG.');
      const fingerprint = await fingerprintLocalVideo(file);
      if (expectedFingerprint && fingerprint !== expectedFingerprint) {
        throw new Error('This is not the same video file the room is using. Choose the exact matching copy.');
      }
      setLocalFile(file);
      setLocalFileFingerprint(fingerprint);
      // Keep a local browser copy so a refresh can restore the host's video
      // without uploading it or asking the user to pick it again.
      try {
        await navigator.storage?.persist?.();
        await storeLocalVideo(fingerprint, file);
      } catch (storageError) {
        setError(`Video selected, but this browser could not save a reload backup: ${storageError.message || 'storage unavailable'}. Keep the original file so you can reselect it if needed.`);
      }
      if (activate) {
        const url = URL.createObjectURL(file);
        setLocalVideoUrl(previous => { if (previous) URL.revokeObjectURL(previous); return url; });
        setLocalVideoError('');
      }
      return fingerprint;
    } catch (e) {
      setError(e.message || 'Could not read the video file.');
      return '';
    } finally {
      setLocalFileBusy(false);
    }
  }, []);


  const createPersonalRoom = useCallback(async () => {
    const sourceRoom = roomRef.current;
    if (!sourceRoom?.media || !participantRef.current?.token || busy) return false;
    setBusy(true);
    setError('');
    const position = Math.max(0, Number(currentTimeRef.current) || 0);
    const isPaused = Boolean(pausedRef.current);
    try {
      const code = roomCode();
      const media = { ...sourceRoom.media };
      const snapshot = await rpc('create_watch_room', {
        p_code: code,
        p_token: guest.token,
        p_name: guest.name,
        p_avatar: guest.avatar,
        p_media: media,
      });
      if (!snapshot?.room || !snapshot?.participant) throw new Error('The private room could not be created. Please try again.');
      const playback = {
        position,
        paused: isPaused,
        season: Number(media.season || season),
        episode: Number(media.episode || episode),
        updated_at: new Date().toISOString(),
      };
      setSoloMode(false);
      setRoomDeleted(false);
      setStandaloneLocal(false);
      setLocalPlaybackOverride(true);
      localPlaybackOverrideRef.current = true;
      setParticipant(snapshot.participant);
      applyRoomSnapshot(snapshot);
      setRoom(previous => previous ? { ...previous, playback } : previous);
      setCurrentTime(position); currentTimeRef.current = position;
      setPaused(isPaused); pausedRef.current = isPaused;
      lastVersionRef.current = Number(snapshot.room.state_version || 0);
      try {
        const result = await rpc('set_watch_room_playback', { p_code: code, p_token: guest.token, p_playback: playback });
        if (result?.state_version) lastVersionRef.current = Math.max(lastVersionRef.current, Number(result.state_version));
      } catch (playbackError) {
        setError('Your private room is ready, but its starting position could not be synced. You can continue watching here.');
      }
      setLocalPlaybackOverride(false);
      localPlaybackOverrideRef.current = false;
      saveActiveRoom(code, guest, media);
      setRoomLink(window.location.origin + '/watch-room/' + code);
      setCopied(false);
      loadOwnedRooms().catch(() => {});
      setShowPlaybackNotice(false);
      return true;
    } catch (e) {
      setError(e.message || 'Could not create your private room.');
      return false;
    } finally {
      setBusy(false);
    }
  }, [room, participant, busy, rpc, guest, season, episode, applyRoomSnapshot, loadOwnedRooms]);
  const createRoom = useCallback(async () => {
    const localRoom = roomType === 'local';
    if (localRoom && (!localFile || !localFileFingerprint)) { setError('Choose a video file first.'); return false; }
    if (!localRoom && !itemMedia.tmdbId) { setError('This title does not have a TMDB ID, so a shared player cannot be created.'); return false; }
    setBusy(true); setError(''); lastVersionRef.current = 0; watchSecondsRef.current = 0; localHistoryFlushRef.current = 0; remoteHistoryFlushRef.current = 0;
    try {
      const code = roomCode();
      const media = localRoom ? {
        kind: 'local_file',
        title: localFile.name.replace(/\\.[^.]+$/, '') || 'Local video',
        fileName: localFile.name,
        fileSize: localFile.size,
        mimeType: videoFileMime(localFile),
        fileExtension: videoFileExtension(localFile),
        fileFingerprint: localFileFingerprint,
        mediaType: 'local',
        season: 1,
        episode: 1,
      } : itemMedia;
      const result = await rpc('create_watch_room', {
        p_code: code,
        p_token: guest.token,
        p_name: guest.name,
        p_avatar: guest.avatar,
        p_media: media,
      });
      if (!localRoom && publicRoomEnabled) {
        await rpc('set_watch_room_public', { p_code: code, p_token: guest.token, p_public: true });
      }
      const snapshot = result;
      setParticipant(snapshot.participant || result.participant);
      applyRoomSnapshot(snapshot);
      saveActiveRoom(code, guest, media);
      loadOwnedRooms().catch(() => {});
      loadPublicRooms().catch(() => {});
      const link = window.location.origin + '/watch-room/' + code;
      setRoomLink(link);
      setOpen(true);
      setShowPlaybackNotice(true);
      try { await navigator.clipboard.writeText(link); setCopied(true); window.setTimeout(() => setCopied(false), 2200); } catch {}
      return true;
    } catch (e) { setError(e.message || 'Could not create the room.'); return false; }
    finally { setBusy(false); }
  }, [rpc, guest, itemMedia, applyRoomSnapshot, loadOwnedRooms, loadPublicRooms, roomType, localFile, localFileFingerprint, publicRoomEnabled]);

  useEffect(() => {
    if (restoreAttemptedRef.current || roomRef.current) return;
    const pathCode = window.location.pathname.split('/').filter(Boolean);
    const sharePathCode = pathCode[0] === 'watch-room' ? pathCode[1] : null;
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem(ACTIVE_ROOM_KEY) || 'null'); } catch {}
    const code = new URLSearchParams(window.location.search).get('room') || sharePathCode;
    if (!code) return;
    restoreAttemptedRef.current = true;
    onBeforeOpenRef.current?.();
    setOpen(true);
    const identity = saved?.code === code.trim().toUpperCase() && saved.identity?.token ? saved.identity : guest;
    beginJoin(code, identity);
  }, [beginJoin, guest]);

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
        const enoughProgress = durationRef.current > 0 && currentTimeRef.current / durationRef.current >= 0.10;
        if (enoughProgress || activeRoom.media?.kind === 'local_file') {
          setSoloMode(true); setRoomDeleted(true); setLocalPlaybackOverride(true); localPlaybackOverrideRef.current = true;
          setError('The room ended. Your player is still open, so you can continue watching on your own.');
        } else setError('This room has ended or expired.');
        window.clearInterval(pollRef.current);
        window.clearInterval(heartbeatRef.current);
      }
    } finally { pollInFlightRef.current = false; }
  }, [rpc, applyRoomSnapshot]);

  const changeRoomMedia = useCallback(async () => {
    if (!room || !participant?.is_host || busy) return false;
    const localRoom = roomType === 'local';
    if (localRoom && (!localFile || !localFileFingerprint)) {
      setError('Choose the new video file first.');
      return false;
    }
    if (!localRoom && !Number(selectedMedia?.tmdbId)) {
      setError('Choose a movie or series with a valid TMDB ID.');
      return false;
    }
    setBusy(true);
    setError('');
    try {
      const nextMedia = localRoom
        ? {
            kind: 'local_file',
            title: localFile.name.replace(/\.[^.]+$/, '') || 'Local video',
            fileName: localFile.name,
            fileSize: localFile.size,
            mimeType: videoFileMime(localFile),
            fileExtension: videoFileExtension(localFile),
            fileFingerprint: localFileFingerprint,
            mediaType: 'local',
            season: 1,
            episode: 1,
          }
        : { ...itemMedia, title: selectedMedia.title, poster: selectedMedia.poster || '', tmdbId: Number(selectedMedia.tmdbId), mediaType: selectedMedia.mediaType || (selectedMedia.type === 'series' ? 'tv' : 'movie'), season: 1, episode: 1 };
      await rpc('change_watch_room_media', {
        p_code: room.code,
        p_token: participant.token,
        p_media: nextMedia,
      });
      if (localRoom) {
        const nextUrl = URL.createObjectURL(localFile);
        setLocalVideoUrl(previous => { if (previous) URL.revokeObjectURL(previous); return nextUrl; });
        setLocalVideoError('');
      }
      setPlayerReady(false);
      playerReadyRef.current = false;
      setDuration(0);
      durationRef.current = 0;
      setCurrentTime(0);
      currentTimeRef.current = 0;
      setPaused(true);
      pausedRef.current = true;
      const snapshot = await rpc('watch_room_snapshot', { p_code: room.code, p_token: participant.token });
      applyRoomSnapshot(snapshot);
      setSetupDialog(false);
      setIsChangingMedia(false);
      localSelectionBeforeChangeRef.current = null;
      return true;
    } catch (e) {
      setError(e.message || 'Could not change the room media.');
      return false;
    } finally {
      setBusy(false);
    }
  }, [room, participant?.token, participant?.is_host, busy, roomType, localFile, localFileFingerprint, selectedMedia, itemMedia, rpc, applyRoomSnapshot]);

  const localVideoRestoreRef = useRef('');
  useEffect(() => {
    if (!room || !participant || room.media?.kind !== 'local_file') {
      // Clear the restore lock when leaving a room so rejoining the same file
      // can retry IndexedDB restoration or reopen the file picker.
      localVideoRestoreRef.current = '';
      if (room && room.media?.kind !== 'local_file' && !pendingJoinCode) setJoinPreviewOpen(false);
      return;
    }
    if (setupDialog && isChangingMedia) return;
    const fingerprint = room.media.fileFingerprint;
    if (!fingerprint || localFileFingerprint === fingerprint || localVideoRestoreRef.current === fingerprint) return;
    let cancelled = false;
    localVideoRestoreRef.current = fingerprint;
    (async () => {
      try {
        const saved = await readLocalVideo(fingerprint);
        if (cancelled) return;
        if (saved?.blob && saved.blob.size === Number(room.media.fileSize || saved.blob.size)) {
          const restored = new File([saved.blob], saved.name || room.media.fileName || 'local-video', {
            type: saved.type || room.media.mimeType || 'video/mp4',
            lastModified: saved.lastModified || Date.now(),
          });
          const verified = await handleLocalFile(restored, fingerprint, true);
          if (cancelled) return;
          if (verified) {
            setJoinPreviewOpen(false);
            setPendingJoinCode('');
            setPendingJoinIdentity(null);
            setPendingJoinMedia(null);
            return;
          }
        }
      } catch {}
      if (cancelled) return;
      localVideoRestoreRef.current = '';
      setPendingJoinCode('');
      setPendingJoinIdentity(null);
      setPendingJoinMedia(room.media);
      setJoinPreviewOpen(true);
    })();
    return () => { cancelled = true; if (localVideoRestoreRef.current === fingerprint) localVideoRestoreRef.current = ''; };
  }, [room?.id, room?.media?.kind, room?.media?.fileFingerprint, room?.media?.fileSize, room?.media?.fileName, room?.media?.mimeType, participant?.id, localFileFingerprint, setupDialog, isChangingMedia, pendingJoinCode, handleLocalFile]);

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
        // Capture the old values before updating refs. Comparing after updating
        // pausedRef made remote play/pause transitions invisible.
        const previousTime = currentTimeRef.current;
        const previousPaused = pausedRef.current;
        const nextPaused = Boolean(playback.paused);
        const target = Math.max(
          0,
          Number(playback.position) +
            (nextPaused ? 0 : Math.max(0, (Date.now() - Date.parse(playback.updated_at || state.updated_at || new Date().toISOString())) / 1000))
        );

        lastVersionRef.current = version;
        setRoom(previous => previous ? { ...previous, state_version: version, playback } : previous);

        if (!localPlaybackOverrideRef.current) {
          setPaused(nextPaused);
          pausedRef.current = nextPaused;
          setCurrentTime(target);
          currentTimeRef.current = target;
        }

        if (
          playback.actor !== activeParticipant.id &&
          playerReadyRef.current &&
          !applyingRemoteRef.current &&
          !localPlaybackOverrideRef.current
        ) {
          if (activeRoom.media?.kind === 'local_file') {
            const video = localVideoRef.current;
            if (video) {
              const drift = target - (Number(video.currentTime) || 0);
              applyingRemoteRef.current = true;
              // Small drift is left alone; larger drift (including explicit
              // skips) is corrected immediately instead of waiting for timeupdate.
              if (Math.abs(drift) > 0.55) {
                try { video.currentTime = target; } catch {}
              }
              if (nextPaused) {
                if (!video.paused) video.pause();
              } else if (video.paused) {
                video.play().catch(() => setError('Tap Play once on this device to allow synchronized video playback.'));
              }
              window.setTimeout(() => { applyingRemoteRef.current = false; }, 420);
            }
          } else {
            const operatorSkip = Math.abs(previousTime - target) > 2.5;
            const frame = iframeRef.current;
            const send = (command, args = []) => frame?.contentWindow?.postMessage({ type: 'cinesrc:command', command, args }, 'https://cinesrc.st');
            applyingRemoteRef.current = true;
            if (operatorSkip) send('seek', [target]);
            if (previousPaused !== nextPaused) send(nextPaused ? 'pause' : 'play');
            window.setTimeout(() => { applyingRemoteRef.current = false; }, 420);
          }
        }
      }
    } catch (error) {
      if (/expired|closed|not found|not a member/i.test(error.message || '')) setError('This room has ended or expired.');
    } finally {
      playbackPollInFlightRef.current = false;
    }
  }, [rpc]);
  useEffect(() => {
    if (!room || !participant) return undefined;
    // Keep checking room lifetime while someone watches independently, but do
    // not pull shared playback over their personal position.
    if (!standaloneLocal && !roomDeleted) {
      refreshRoom();
      pollRef.current = window.setInterval(refreshRoom, 4200);
    }
    if (!soloMode && !roomDeleted && !standaloneLocal) {
      refreshPlayback();
      playbackPollRef.current = window.setInterval(refreshPlayback, roomRef.current?.media?.kind === 'local_file' ? 220 : 350);
    }
    if (!standaloneLocal && !roomDeleted) {
      heartbeatRef.current = window.setInterval(() => {
        const r = roomRef.current, p = participantRef.current;
        if (r && p?.token) rpc('watch_room_heartbeat', {
          p_code: r.code, p_token: p.token,
          p_position: currentTimeRef.current,
          p_duration: durationRef.current,
          p_paused: pausedRef.current,
        }).catch(() => {});
      }, 4000);
    }
    return () => {
      window.clearInterval(pollRef.current);
      window.clearInterval(playbackPollRef.current);
      window.clearInterval(heartbeatRef.current);
    };
  }, [room?.id, room?.media?.kind, participant?.id, soloMode, standaloneLocal, roomDeleted, refreshRoom, refreshPlayback, rpc]);

  const publishPlayback = useCallback(async (next, force = false) => {
    const r = roomRef.current, p = participantRef.current;
    if (!r || !p || soloMode || !['host','operator'].includes(p.role || (p.is_host ? 'host' : 'viewer')) || applyingRemoteRef.current) return;
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
  }, [rpc, season, episode, soloMode]);

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
    if(roomRef.current?.media?.kind==='local_file'){const video=localVideoRef.current;if(!video)return false;if(command==='seek'&&video.srcObject)return true;if(command==='seek')video.currentTime=Math.max(0,Number(args[0])||0);if(command==='play')video.play().catch(()=>{});if(command==='pause')video.pause();if(command==='setMuted')video.muted=Boolean(args[0]);return true;}
    const message = { type: 'cinesrc:command', command, args };
    if (!playerReadyRef.current || !iframeRef.current?.contentWindow) {
      pendingPlayerCommandsRef.current = [...pendingPlayerCommandsRef.current, message].slice(-12);
      return false;
    }
    iframeRef.current.contentWindow.postMessage(message, 'https://cinesrc.st');
    return true;
  }, []);

  const sendPlayerCommand = useCallback((command, args = []) => {
    if (soloMode) {
      if (roomRef.current?.media?.kind === 'local_file') postPlayerCommand(command,args);
      else iframeRef.current?.contentWindow?.postMessage({ type: 'cinesrc:command', command, args }, 'https://cinesrc.st');
      if (command === 'play') { setPaused(false); pausedRef.current = false; }
      if (command === 'pause') { setPaused(true); pausedRef.current = true; }
      if (command === 'seek') { const position=Math.max(0,Number(args[0])||0);setCurrentTime(position);currentTimeRef.current=position; }
      return;
    }
    if (!canControl && !applyingRemoteRef.current && !['getCurrentTime','getDuration','setMuted'].includes(command)) {
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
    if(roomRef.current?.media?.kind==='local_file')postPlayerCommand(command,args);else iframeRef.current?.contentWindow?.postMessage({ type: 'cinesrc:command', command, args }, 'https://cinesrc.st');
    if (command === 'play') { setPaused(false); pausedRef.current = false; publishPlayback({ position: currentTimeRef.current, paused: false }); }
    if (command === 'pause') { setPaused(true); pausedRef.current = true; publishPlayback({ position: currentTimeRef.current, paused: true }); }
    if (command === 'seek') { const position = Math.max(0, Number(args[0]) || 0); setCurrentTime(position); currentTimeRef.current = position; publishPlayback({ position, paused: pausedRef.current }, true); }
  }, [publishPlayback, canControl, postPlayerCommand, soloMode]);

  const scheduleLocalControlsHide = useCallback(() => {
    if (localControlsHideTimerRef.current) window.clearTimeout(localControlsHideTimerRef.current);
    if (!localVideoRef.current || paused || localAdjustmentsOpen || localTracksOpen) return;
    localControlsHideTimerRef.current = window.setTimeout(() => setLocalControlsVisible(false), 2400);
  }, [paused, localAdjustmentsOpen, localTracksOpen]);

  const revealLocalControls = useCallback(() => {
    setLocalControlsVisible(true);
    scheduleLocalControlsHide();
  }, [scheduleLocalControlsHide]);

  const toggleLocalControlsLock = useCallback(() => {
    const next = !localControlsLockedRef.current;
    localControlsLockedRef.current = next;
    setLocalControlsLocked(next);
    if (localControlsHideTimerRef.current) window.clearTimeout(localControlsHideTimerRef.current);
    if (next) setLocalControlsVisible(false);
    else { setLocalControlsVisible(true); scheduleLocalControlsHide(); }
  }, [scheduleLocalControlsHide]);

  useEffect(() => {
    if (localControlsHideTimerRef.current) window.clearTimeout(localControlsHideTimerRef.current);
    if (!isLocalFullscreen) {
      setLocalAdjustmentsOpen(false);
      localControlsLockedRef.current = false;
      setLocalControlsLocked(false);
    }
    if (!localVideoRef.current || paused) {
      setLocalControlsVisible(true);
      return undefined;
    }
    setLocalControlsVisible(true);
    scheduleLocalControlsHide();
    return () => {
      if (localControlsHideTimerRef.current) window.clearTimeout(localControlsHideTimerRef.current);
    };
  }, [isLocalFullscreen, paused, localVideoUrl, scheduleLocalControlsHide]);

  const toggleLocalFullscreen = useCallback(async () => {
    const video = localVideoRef.current;
    const player = video?.parentElement;
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else if (player?.requestFullscreen) {
        await player.requestFullscreen();
        // Wide movies look much better in landscape on phones. Browsers that
        // don't support orientation locking simply keep their current layout.
        try { await screen.orientation?.lock?.('landscape'); } catch {}
      } else if (video?.webkitEnterFullscreen) {
        video.webkitEnterFullscreen();
      }
    } catch {
      setError('Fullscreen is not available in this browser.');
    }
  }, []);

  useEffect(() => {
    const updateFullscreen = () => {
      const active = Boolean(document.fullscreenElement);
      setIsLocalFullscreen(active);
       if (!active) {
         setTheatreChatOpen(false);
         setLocalAdjustmentsOpen(false);
         try { screen.orientation?.unlock?.(); } catch {}
       }
    };
    document.addEventListener('fullscreenchange', updateFullscreen);
    return () => document.removeEventListener('fullscreenchange', updateFullscreen);
  }, []);

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

  const copyTimestamp = async () => { try { await navigator.clipboard.writeText(`${room?.media?.title || 'Watch Party'} · ${timeText(currentTimeRef.current)} · ${roomLink}`); setCopied(true); window.setTimeout(()=>setCopied(false),1800); } catch { setError('Could not copy timestamp.'); } };
  const updateRoomSettings = async (patch) => { if(!room||!participant?.is_host||busy)return;setBusy(true);setError('');try{await rpc('update_watch_room_settings',{p_code:room.code,p_token:participant.token,p_settings:patch});await refreshRoom();}catch(e){setError(e.message||'Could not update room settings.');}finally{setBusy(false);}};
  const transferHost = async (member) => {if(!member||!room||!participant?.is_host||busy)return;setBusy(true);setError('');try{await rpc('transfer_watch_room_host',{p_code:room.code,p_token:participant.token,p_participant_id:member.id});setHostPanelOpen(false);await refreshRoom();}catch(e){setError(e.message||'Could not transfer host privileges.');}finally{setBusy(false);}};
  const removeMember = async (member) => {if(!member||!room||!participant?.is_host||busy)return;setBusy(true);setError('');try{await rpc('remove_watch_room_participant',{p_code:room.code,p_token:participant.token,p_participant_id:member.id});setMembers(list=>list.filter(m=>m.id!==member.id));setConfirmAction(null);}catch(e){setError(e.message||'Could not remove participant.');}finally{setBusy(false);}};
  const copyLink = async () => {
    if (!roomLink) return;
    try { await navigator.clipboard.writeText(roomLink); setCopied(true); window.setTimeout(() => setCopied(false), 2200); }
    catch { setError('Copy was blocked by your browser. Copy the room link from the address bar.'); }
  };


  const flushWatchHistory = useCallback(async () => {
    if (soloMode) return;
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
  },[user?.id,soloMode]);
  useEffect(()=>{
    if(!room||!participant||soloMode)return undefined;
    const timer=window.setInterval(()=>{
      if(!pausedRef.current&&playerReadyRef.current)watchSecondsRef.current+=15;
      if(watchSecondsRef.current-localHistoryFlushRef.current>=30||watchSecondsRef.current-remoteHistoryFlushRef.current>=30)flushWatchHistory();
    },15000);
    return()=>window.clearInterval(timer);
  },[room?.id,participant?.id,soloMode,flushWatchHistory]);

  const minimizeRoom = async () => {
    await flushWatchHistory();
    setOpen(false);
    setSetupDialog(false);
    setTheatreMode(false);
    onClose?.();
  };

  const leaveRoom = async () => {
    await flushWatchHistory();
    const r = roomRef.current, p = participantRef.current;
    if (r && p) {
      try {
        if (p.is_host) await rpc('close_watch_room', { p_code: r.code, p_token: p.token });
        else await rpc('leave_watch_room', { p_code: r.code, p_token: p.token });
      } catch (e) { setError(e.message || 'Someone is still watching. Ask everyone to pause before ending the room.'); return; }
    }
    try { const saved = JSON.parse(localStorage.getItem(ACTIVE_ROOM_KEY) || 'null'); if (saved?.code === r?.code) localStorage.removeItem(ACTIVE_ROOM_KEY); } catch {}
    window.clearInterval(pollRef.current); window.clearInterval(playbackPollRef.current); window.clearInterval(heartbeatRef.current);
    setRoom(null); setParticipant(null); setMembers([]); setMessages([]); setRequests([]); setPlayerReady(false); lastVersionRef.current = 0; setLocalPlaybackOverride(false);localPlaybackOverrideRef.current=false;setCanReturnLocal(false);setSoloMode(false);setRoomDeleted(false);setOpen(false);setSetupDialog(false);
    const url = new URL(window.location.href); url.searchParams.delete('room'); window.history.replaceState({}, '', url.toString());
    onClose?.();
  };

  useEffect(() => {
    if (!open || !room || !participant || soloMode) return undefined;
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
        saveSoloProgress(roomRef.current?.media,time,durationRef.current);
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
  }, [open, room?.id, participant?.id, canControl, publishPlayback, sendPlayerCommand, onEpisodeChange, season, soloMode]);

  useEffect(() => {
    if (!room || !participant || !room.media) return;
    const roomEpisode = Number(room.playback?.episode || room.media.episode || episode);
    if (roomEpisode > 0 && roomEpisode !== Number(episode)) onEpisodeChangeRef.current?.(roomEpisode);
  }, [room?.state_version, room?.media?.episode, room?.playback?.episode, episode]);

  const sharedPlayerUrl = useMemo(() => {
    if (!room?.media || room.media.kind==='local_file') return playerUrl;
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

  const fullscreenChatPlayer = typeof document !== 'undefined' && isLocalFullscreen && document.fullscreenElement === localVideoRef.current?.parentElement ? document.fullscreenElement : null;

  if (launchOnly) return <button type="button" className="watch-together-launch" onClick={() => { onBeforeOpenRef.current?.(); onWatchTogether?.(); }}><Users size={16} /><span>Watch Party</span></button>;
  return <>
    <input ref={soloFileInputRef} type="file" accept={VIDEO_FILE_ACCEPT} hidden onChange={async event=>{ const file=event.target.files?.[0]; event.target.value=''; if(!file)return; const fingerprint=await handleLocalFile(file,'',true); if(!fingerprint)return; const media={kind:'local_file',title:file.name.replace(/\.[^.]+$/,'')||'Local video',fileName:file.name,fileSize:file.size,mimeType:videoFileMime(file),fileExtension:videoFileExtension(file),fileFingerprint:fingerprint,mediaType:'local',season:1,episode:1}; const saved=readSoloProgress(media); const now=new Date().toISOString(); setRoom({id:'solo-local-'+fingerprint,code:'LOCAL',media,playback:{position:Number(saved?.position)||0,paused:true,updated_at:now},settings:{chat_enabled:false,reactions_enabled:false},updated_at:now}); setParticipant({id:'solo-local',token:'',is_host:true,role:'host'}); setMembers([]);setMessages([]);setRequests([]);setSoloMode(true);setRoomDeleted(true);setStandaloneLocal(true);setLocalPlaybackOverride(true);localPlaybackOverrideRef.current=true;setOpen(true);setSetupDialog(false);setPlayerReady(false);playerReadyRef.current=false;setCurrentTime(Number(saved?.position)||0);currentTimeRef.current=Number(saved?.position)||0;setDuration(Number(saved?.duration)||0);durationRef.current=Number(saved?.duration)||0;setPaused(true);pausedRef.current=true;setControlsExpanded(true);setError('');setLocalVideoError('');setSyncNoticeDismissed(true); }}/>
     {<input ref={joinFileInputRef} type="file" accept={VIDEO_FILE_ACCEPT} hidden onChange={async event => {
                 const file = event.target.files?.[0];
                 event.target.value = '';
                 if (!file) return;
                 const changingRoomFile = !pendingJoinCode && roomRef.current?.media?.kind === 'local_file';
                 const expectedFingerprint = pendingJoinCode
                   ? pendingJoinMedia?.fileFingerprint
                   : changingRoomFile ? roomRef.current?.media?.fileFingerprint : '';
                 const fingerprint = await handleLocalFile(file, expectedFingerprint, true);
                 if (!fingerprint) return;
                 if (pendingJoinCode) {
                   const joined = await joinExisting(pendingJoinCode, pendingJoinIdentity || guest, fingerprint);
                   if (joined) {
                     setJoinPreviewOpen(false);
                     setPendingJoinCode('');
                     setPendingJoinIdentity(null);
                     setPendingJoinMedia(null);
                   }
                 } else if (changingRoomFile) {
                   setJoinPreviewOpen(false);
                   setPendingJoinIdentity(null);
                   setPendingJoinMedia(null);
                   setPlayerReady(false);
                   playerReadyRef.current = false;
                   setLocalVideoError('');
                   setCurrentTime(0);
                   currentTimeRef.current = 0;
                 }
               }}/>}
    {(open || room) && <section className={`wt-page${room ? ' wt-room-active' : ''}${theatreMode ? ' wt-theatre-mode' : ''}${!open ? ' wt-minimized' : ''}${soloMode ? ' wt-solo-mode' : ''}${standaloneLocal ? ' wt-solo-local' : ''}`} aria-label="Watch Party">
          {room && !theatreMode && <button type="button" className="wt-page-back" onClick={()=>setConfirmAction({type:'leave'})} aria-label="Leave room"><ArrowLeft size={17}/><span>Leave</span></button>}
          {!room ? <div className={`wt-entry wt-connect-page${publicRoomsView ? " wt-public-directory-open" : ""}`}>
            <div className="wt-entry-art wt-connect-hero"><div><span>PRIVATE SCREENING ROOM</span><h2>Host a Watch Party.</h2><p>Join your friends with a room code, or create a party and invite everyone with a private link.</p></div></div>
            <div className="wt-connect-card">
              <div className="wt-picker-heading"><span>JOIN A SCREENING</span><h2>Have a room code?</h2><p>Enter the 8-character code shared by your host.</p></div>
              <form className="wt-join-form wt-code-form" onSubmit={e => { e.preventDefault(); beginJoin(joinCode); }}>
                <input value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8))} placeholder="ROOM CODE" maxLength={8} autoComplete="off" aria-label="Room code" />
                <button disabled={busy || joinCode.length !== 8}>{busy ? 'Joining…' : 'Join room'}<ChevronRight size={16}/></button>
              </form>
              <div className="wt-or"><span />OR<span /></div>
              <button type="button" className="wt-create" onClick={() => { setPublicRoomEnabled(false); setSetupDialog(true); setIsChangingMedia(false); setRoomType('movie'); setSelectedMedia(item || null); setLocalFile(null); setLocalFileFingerprint(''); setMediaQuery(''); setMediaSelectorExpanded(true); setError(''); }}><span><strong>Create a new room</strong><small>Choose a movie, series or your own video file</small></span><Link2 size={18}/></button>
              <div className="wt-identity"><img src={guest.avatar} alt="" /><div><small>YOU'RE JOINING AS</small><strong>{guest.name}</strong><span>{guest.isGuest ? 'Guest · no account needed' : 'Signed in · profile identity'}</span></div>{guest.isGuest&&<button type="button" onClick={()=>setEditingGuestName(value=>!value)} title="Change guest name"><Pencil size={16}/></button>}</div>
              {guest.isGuest&&editingGuestName&&<form className="wt-guest-name-form" onSubmit={event=>{event.preventDefault();updateGuestName(guestNameDraft);}}><input value={guestNameDraft} onChange={event=>setGuestNameDraft(event.target.value)} maxLength={32} placeholder="Choose a guest name" aria-label="Guest name"/><button type="submit" disabled={busy||!guestNameDraft.trim()}>Save name</button></form>}
              {error && <p className="wt-error">{error}</p>}
              <p className="wt-privacy"><ShieldCheck size={14}/> Private party links are hard to guess. Guests can join without signing in.</p>
              <button type="button" className="wt-public-browse-link" onClick={()=>{setPublicRoomsView(true);loadPublicRooms();}}><span><Radio size={17}/><span><strong>Browse public screenings</strong><small>{publicRooms.length} live {publicRooms.length===1?'room':'rooms'} · Anyone can join</small></span></span><ChevronRight size={17}/></button>
              <section className="wt-owned-rooms">
                <header><div><small>ROOM MANAGEMENT</small><strong>Your created rooms</strong></div><button type="button" onClick={loadOwnedRooms} disabled={roomsLoading} aria-label="Refresh rooms"><RefreshCw size={14}/></button></header>
                {roomsLoading ? <p className="wt-owned-empty">Loading your rooms…</p> : ownedRooms.length ? <div className="wt-owned-list">{ownedRooms.map(saved=><article className="wt-owned-room" key={saved.id}><div className="wt-owned-poster">{saved.media?.poster?<img src={saved.media.poster} alt=""/>:<Radio size={17}/>}</div><div className="wt-owned-copy"><strong>{saved.media?.title || 'Screening room'}</strong><small>{saved.code} · {saved.is_active ? `${saved.viewer_count || 0} online` : 'Inactive'}</small><small>{saved.is_active ? 'Active now' : `Auto-delete in ${Math.max(0,Math.ceil((Date.parse(saved.expires_at)-Date.now())/60000))} min`}</small></div><button type="button" className="wt-owned-open" onClick={()=>beginJoin(saved.code,guest)} disabled={busy} aria-label={`Open room ${saved.code}`}><Play size={13}/><span>Open</span></button><button type="button" className="wt-owned-delete" onClick={()=>deleteOwnedRoom(saved.code)} disabled={busy} aria-label={`Delete room ${saved.code}`}><X size={16}/></button></article>)}</div> : <p className="wt-owned-empty">No rooms created with this identity yet.</p>}
              </section>
            </div>
            {publicRoomsView && <section className="wt-public-directory">
              <header className="wt-public-directory-head">
                <button type="button" onClick={()=>setPublicRoomsView(false)}><ArrowLeft size={16}/> Back</button>
                <div><span>OPEN TO EVERYONE</span><h2>Public screenings</h2><p>Live rooms hosted by people who are online right now.</p></div>
                <button type="button" onClick={loadPublicRooms} disabled={roomsLoading} aria-label="Refresh public screenings"><RefreshCw size={16}/></button>
              </header>
              {roomsLoading ? <p className="wt-owned-empty">Finding live screenings…</p> : publicRooms.length ? <div className="wt-public-directory-grid">{publicRooms.map(saved=><article className="wt-public-screening" key={saved.id}>
                <div className="wt-public-screening-poster">{saved.poster?<img src={saved.poster} alt=""/>:<Radio size={24}/>}<span><i/> LIVE</span></div>
                <div className="wt-public-screening-info"><strong>{saved.title || 'Screening room'}</strong><small>{saved.media_type==='tv'?'Series':'Movie'} · Hosted by {saved.host_name || 'Guest'}</small><span>{saved.viewer_count || 0} online now</span><button type="button" onClick={()=>beginJoin(saved.code,guest)} disabled={busy}><Play size={14}/> Join screening</button></div>
              </article>)}</div> : <div className="wt-public-directory-empty"><Radio size={28}/><strong>No public screenings right now</strong><p>When someone starts a public room, it will appear here while they're online.</p></div>}
            </section>}
          </div> : <div className="wt-content">
            <div className="wt-main">
              <div className="wt-room-title"><div><span>{soloMode ? 'PERSONAL PLAYBACK' : 'NOW SCREENING'}</span><h2>{room.media?.title || itemMedia.title}</h2><small>{soloMode ? (standaloneLocal ? 'Local player · No room or account needed' : roomDeleted ? 'Room ended · Continue watching on your own' : 'Independent playback · Chat and sync are off') : `${members.length} / 29 online · ${participant.is_host ? 'Host' : (participant.role || 'viewer').replace(/^./, c => c.toUpperCase())}`}</small>{duration>0&&currentTime/duration>=0.10&&<div className="wt-title-progress"><span>YOUR SAVED PROGRESS</span><strong>Continue from {timeText(currentTime)} · {Math.round(currentTime/duration*100)}% watched</strong><i><b style={{width:progressPercent+'%'}}/></i></div>}</div><div className="wt-room-actions">{!soloMode ? <button type="button" className="wt-copy" onClick={createPersonalRoom} disabled={busy}><MonitorPlay size={14}/> {busy ? 'Creating…' : 'Watch on my own · Private room'}</button>{localPlaybackOverride && <button type="button" className="wt-copy wt-solo-return" onClick={syncToRoom} disabled={!playerReady}><Users size={14}/> Watch with room</button>} : standaloneLocal||roomDeleted ? <button type="button" className="wt-copy wt-solo-return" onClick={()=>{localVideoRef.current?.pause();setRoom(null);setParticipant(null);setSoloMode(false);setRoomDeleted(false);setStandaloneLocal(false);setLocalPlaybackOverride(false);localPlaybackOverrideRef.current=false;setPlayerReady(false);playerReadyRef.current=false;setCurrentTime(0);currentTimeRef.current=0;setDuration(0);durationRef.current=0;setLocalVideoUrl(previous=>{if(previous)URL.revokeObjectURL(previous);return '';});setOpen(true);}}><X size={14}/> Close player</button> : <button type="button" className="wt-copy wt-solo-return" onClick={()=>{localVideoRef.current?.pause();setRoom(null);setParticipant(null);setSoloMode(false);setRoomDeleted(false);setStandaloneLocal(false);setLocalPlaybackOverride(false);localPlaybackOverrideRef.current=false;setOpen(false);}}><X size={14}/> Close private room</button>}{guest.isGuest&&<button type="button" className="wt-copy" onClick={()=>setEditingGuestName(value=>!value)}><Pencil size={14}/> Name</button>}{participant.is_host&&<button type="button" className="wt-copy" onClick={()=>{localSelectionBeforeChangeRef.current={file:localFile,fingerprint:localFileFingerprint};setIsChangingMedia(true);setRoomType(room.media?.kind==='local_file'?'local':'movie');if(room.media?.kind!=='local_file')setSelectedMedia({title:room.media?.title||'',tmdbId:room.media?.tmdbId,mediaType:room.media?.mediaType||'movie',type:room.media?.mediaType==='tv'?'series':'film',poster:room.media?.poster||'',year:room.media?.year||''});setError('');setMediaQuery('');setMediaSelectorExpanded(true);setSetupDialog(true);}}><ArrowRightLeft size={14}/> Change media</button>}{participant.is_host&&<button type="button" className="wt-copy" onClick={()=>setHostPanelOpen(true)}><Settings2 size={14}/> Host controls</button>}<button type="button" className="wt-copy wt-end-room" onClick={()=>setConfirmAction({type:participant.is_host?'close':'leave'})}><LogOut size={14}/>{participant.is_host?'End room':'Leave room'}</button><button className="wt-copy" onClick={copyLink}>{copied ? <Check size={15}/> : <Copy size={15}/ >}{copied ? 'Copied' : 'Invite'}</button></div></div>
              {guest.isGuest&&editingGuestName&&<form className="wt-guest-name-form wt-room-rename" onSubmit={event=>{event.preventDefault();updateGuestName(guestNameDraft);}}><input value={guestNameDraft} onChange={event=>setGuestNameDraft(event.target.value)} maxLength={32} aria-label="Guest name"/><button type="submit" disabled={busy||!guestNameDraft.trim()}>Save name</button></form>}
              {showPlaybackNotice && <div className="wt-playback-tip" role="status"><span><strong>Playback tip</strong> If autoplay is blocked, tap Play once. A reputable ad blocker can help reduce pop-ups and redirects.</span><button type="button" onClick={() => setShowPlaybackNotice(false)} aria-label="Dismiss playback tip"><X size={15}/></button></div>}
              <div className="wt-room-tools" aria-label="Room tools"><span className={`wt-network ${networkState}`} title={networkState==='online'?'Room connection is active':networkState==='offline'?'You are offline':'Trying to reconnect'}><i/><span>{networkState==='online'?'Connected':networkState==='offline'?'Offline':'Reconnecting'}</span>{networkLatency!=null&&networkState==='online'&&<small>{networkLatency} ms</small>}</span><div className="wt-room-tool-actions"><button type="button" onClick={()=>refreshRoom()} title="Reconnect to room" aria-label="Reconnect to room"><RefreshCw size={16}/></button><button type="button" onClick={copyTimestamp} title="Copy current timestamp" aria-label="Copy current timestamp"><Clock3 size={16}/></button><button type="button" onClick={()=>setTheatreMode(v=>!v)} title={theatreMode?'Exit theatre mode':'Theatre mode'} aria-label={theatreMode?'Exit theatre mode':'Theatre mode'}><Theater size={16}/></button><button type="button" className="wt-theatre-chat-launch" onClick={()=>{setChatCollapsed(false);setTheatreChatOpen(value=>!value);}} title="Open room chat" aria-label="Open room chat"><MessageCircle size={16}/></button><button type="button" onClick={()=>setQrDialogOpen(true)} title="Show room QR code" aria-label="Show room QR code"><QrCode size={16}/></button></div></div>
              {room.media?.mediaType === "tv" && <section className="wt-episode-picker" aria-label="Choose season and episode">
                <div className="wt-episode-picker-head"><strong>SEASONS</strong><small>{seasonLoading ? "Loading seasons…" : availableSeasons.length + " available"}</small></div>
                <div className="wt-season-row">{availableSeasons.map(s=><button type="button" key={s.season_number} disabled={!canControl&&!room.settings?.guests_can_change_episode} className={activeSeason===Number(s.season_number)?"active":""} onClick={()=>changeRoomEpisode(s.season_number,1)}>{s.season_number===0?"Specials":"S"+s.season_number}</button>)}</div>
                <div className="wt-episode-picker-head wt-episode-heading"><strong>EPISODES</strong><small>{episodeLoading ? "Loading…" : availableEpisodes.length + " episodes"}</small></div>
                <div className="wt-episode-row">{availableEpisodes.map(ep=><button type="button" key={ep.episode_number} disabled={!canControl&&!room.settings?.guests_can_change_episode} className={activeEpisode===Number(ep.episode_number)?"active":""} onClick={()=>changeRoomEpisode(activeSeason,ep.episode_number)}><b>EP {ep.episode_number}</b><span>{ep.name || "Episode "+ep.episode_number}</span></button>)}</div>
                {!canControl && !room.settings?.guests_can_change_episode && <small className="wt-episode-lock">Only the host or an operator can change the room episode.</small>}
              </section>}
              <div className="wt-user-progress" aria-label="Participant playback progress">{members.map(member=>{const pct=Number(member.playback_duration)>0?Math.max(0,Math.min(100,Math.round(Number(member.playback_position||0)/Number(member.playback_duration)*100))):0;const pausedHere=Boolean(room.playback?.paused&&room.playback?.actor===member.id);return <span className="wt-progress-pill" key={member.id}><img src={member.avatar_url||blobatar(member.display_name)} alt=""/><b>{member.display_name}</b><i>{Number(member.playback_duration)>0?pct+"%":timeText(member.playback_position||0)}</i>{pausedHere&&<Pause className="wt-progress-paused" size={11} aria-label="Paused here"/>}</span>;})}</div>
              {pendingEpisode && <div className="wt-episode-transition"><div><strong>Next episode is ready</strong><span>Everyone can move to S{pendingEpisode.season} · E{pendingEpisode.episode}. Viewers who are behind can finish first.</span></div><button type="button" onClick={()=>setPendingEpisode(null)}>Finish current</button><button type="button" onClick={()=>{const next=pendingEpisode;setPendingEpisode(null);onEpisodeChangeRef.current?.(next.episode);setRoom(old=>old?{...old,playback:{...(old.playback||{}),position:0,paused:false,season:next.season,episode:next.episode}}:old);publishPlayback({position:0,paused:false,season:next.season,episode:next.episode},true);}}>Go now</button></div>}
              <div className="wt-player-layout">
              <div className="wt-player-column">
              <div
                className={"wt-player"+(room.media?.kind==='local_file'?" wt-local-video-player"+(isLocalFullscreen?" is-fullscreen":"")+(localControlsVisible?"":" is-controls-hidden")+(localControlsLocked?" is-controls-locked":"")+(localTabletRatio?" is-tablet-ratio":""):"")}
                style={room.media?.kind==='local_file'?{
                  '--wt-grade-temp-color':localTemperature>=0?'#ff9d55':'#579dff',
                  '--wt-grade-temp-opacity':String(Math.abs(localTemperature)/500),
                  '--wt-grade-tint-color':localTint>=0?'#ff55ad':'#4cdb91',
                  '--wt-grade-tint-opacity':String(Math.abs(localTint)/650),
                  '--wt-grade-custom-color':/^#[0-9a-fA-F]{6}$/.test(localGradeColor)?localGradeColor:'#000000',
                  '--wt-grade-custom-opacity':String(localGradeColorStrength/100),
                  '--wt-grade-highlight-color':/^#[0-9a-fA-F]{6}$/.test(localGradeHighlightColor)?localGradeHighlightColor:'#f2d6ae',
                  '--wt-grade-shadow-color':/^#[0-9a-fA-F]{6}$/.test(localGradeShadowColor)?localGradeShadowColor:'#26364a',
                  '--wt-grade-split-opacity':String(localGradeSplitStrength/100),
                  '--wt-player-background':/^#[0-9a-fA-F]{6}$/.test(localBackgroundColor)?localBackgroundColor:'#000000'
                }:undefined}
                onPointerMove={room.media?.kind==='local_file'?(event=>{if(event.pointerType!=='touch')revealLocalControls();}):undefined}
                onPointerEnter={room.media?.kind==='local_file'?(event=>{if(event.pointerType!=='touch')revealLocalControls();}):undefined}
                onPointerDown={room.media?.kind==='local_file'?(event=>{if(event.pointerType!=='touch')revealLocalControls();}):undefined}
                onPointerLeave={room.media?.kind==='local_file'?scheduleLocalControlsHide:undefined}
              >
                {room.media?.kind==='local_file' ? <>
                  <video
                    key={room.media?.fileFingerprint||room.id}
                    ref={localVideoRef}
                    src={localVideoUrl}
                    playsInline
                    preload="auto"
                    style={{filter:`brightness(${Math.round(localBrightness*Math.pow(2,localExposure))}%) contrast(${localContrast}%) saturate(${localSaturation}%) hue-rotate(${localHue}deg)`,backgroundColor:localBackgroundColor}}
                    onClick={event=>{
                      if(event.target!==event.currentTarget)return;
                      const video=event.currentTarget;
                      if(video.srcObject && video.muted){
                        video.muted=false;
                        setMuted(false);
                        video.play().catch(()=>{});
                        return;
                      }
                      if(window.matchMedia?.('(pointer: coarse)').matches){
                        if(localControlsHideTimerRef.current)window.clearTimeout(localControlsHideTimerRef.current);
                        if(localControlsLockedRef.current){setLocalControlsVisible(false);return;}
                        setLocalControlsVisible(value=>!value);
                        if(!localControlsVisible)scheduleLocalControlsHide();
                      }else revealLocalControls();
                    }}
                    onLoadedMetadata={event=>{
                      const video=event.currentTarget;
                      setLocalVideoError('');
                      setLocalCodecDiagnostics(null);
                      
                      setControlsExpanded(true);
                      const finiteDuration=Number.isFinite(video.duration)?video.duration:0;
                       setDuration(finiteDuration);
                       durationRef.current=finiteDuration;
                      setPlayerReady(true);
                      playerReadyRef.current=true;
                      const playback=roomRef.current?.playback;
                      if(playback){
                        const target=Math.max(0,Number(playback.position)||0)+(playback.paused?0:Math.max(0,(Date.now()-Date.parse(playback.updated_at||roomRef.current?.updated_at||new Date().toISOString()))/1000));
                        applyingRemoteRef.current=true;
                        try { video.currentTime=target; } catch {}
                        setCurrentTime(target);
                        currentTimeRef.current=target;
                        setPaused(Boolean(playback.paused));
                        pausedRef.current=Boolean(playback.paused);
                        if(!playback.paused)video.play().catch(()=>setError('Tap Play once on this device to allow synchronized video playback.'));
                        window.setTimeout(()=>{applyingRemoteRef.current=false;},420);
                      }
                    }}
                    onDurationChange={event=>{const value=Number.isFinite(event.currentTarget.duration)?event.currentTarget.duration:0;setDuration(value);durationRef.current=value;}}
                    onTimeUpdate={event=>{
                      const video=event.currentTarget;
                      setCurrentTime(video.currentTime);
                      currentTimeRef.current=video.currentTime;
                      saveSoloProgress(roomRef.current?.media,video.currentTime,video.duration);
                      if(!applyingRemoteRef.current&&canControl&&!video.paused&&Date.now()-lastHostTimePushRef.current>1500){
                        lastHostTimePushRef.current=Date.now();
                        publishPlayback({position:video.currentTime,paused:false});
                      }
                    }}
                    onPlay={()=>{
                      setPaused(false);pausedRef.current=false;
                      if(!applyingRemoteRef.current)publishPlayback({position:localVideoRef.current?.currentTime||0,paused:false},true);
                    }}
                    onPause={()=>{
                      setPaused(true);pausedRef.current=true;
                      if(!applyingRemoteRef.current)publishPlayback({position:localVideoRef.current?.currentTime||0,paused:true},true);
                    }}
                    onSeeked={()=>{
                      const time=localVideoRef.current?.currentTime||0;
                      setCurrentTime(time);currentTimeRef.current=time;
                      if(!applyingRemoteRef.current)publishPlayback({position:time,paused:localVideoRef.current?.paused??true},true);
                    }}
                    onError={event=>{
                      setPlayerReady(false);playerReadyRef.current=false;
                      const probe=document.createElement('video');
                      setLocalCodecDiagnostics({
                        fileName:localFile?.name||'Selected local video',
                        mime:videoFileMime(localFile),
                        h264:probe.canPlayType('video/mp4; codecs="avc1.42E01E, mp4a.40.2"')||'no',
                        hevc:probe.canPlayType('video/mp4; codecs="hvc1.1.6.L93.B0, mp4a.40.2"')||'no',
                        vp9:probe.canPlayType('video/webm; codecs="vp9, opus"')||'no'
                      });
                      setLocalVideoError('This browser cannot decode this file. MKV, AVI and MOV are containers, not codecs. If the video is H.264/AVC with AAC audio, remux it to MP4 without re-encoding. If it is H.265/HEVC or another unsupported codec, convert it to H.264 video with AAC audio. This player does not convert files yet.');
                    }}
                    onLoadedData={()=>setLocalVideoError('')}
                  >
                    {localSubtitleUrl && <track key={localSubtitleUrl} kind="subtitles" src={localSubtitleUrl} srcLang="und" label={localSubtitleName || 'External subtitles'} />}
                  </video>
                  <div className="wt-local-grade-overlays" aria-hidden="true">
                    <span className="wt-grade-temperature"/>
                    <span className="wt-grade-tint"/>
                    <span className="wt-grade-split-tone"/>
                    <span className="wt-grade-custom"/>
                  </div>
                  <div className="wt-local-overlay-tools" onClick={event=>event.stopPropagation()}>
                    <button type="button" className="wt-local-lock" onClick={toggleLocalControlsLock} aria-label={localControlsLocked?'Unlock player controls':'Lock player controls'} title={localControlsLocked?'Unlock controls':'Lock controls'}>{localControlsLocked?<Unlock size={17}/>:<Lock size={17}/>}</button>
                    {!isLocalFullscreen&&<button type="button" className="wt-local-ratio" onClick={()=>setLocalTabletRatio(value=>!value)} aria-pressed={localTabletRatio} aria-label={localTabletRatio?'Use original video ratio':'Use tablet 16 by 10 ratio'} title={localTabletRatio?'Original ratio':'Tablet ratio 16:10'}>{localTabletRatio?'Auto':'16:10'}</button>}
                    {isLocalFullscreen&&<>
                      <button type="button" onClick={()=>{setLocalTracksOpen(value=>!value);setLocalAdjustmentsOpen(false);revealLocalControls();}} aria-expanded={localTracksOpen} aria-label="Audio and subtitles" title="Audio & subtitles"><Captions size={17}/></button>
                      <button type="button" onClick={()=>{setLocalAdjustmentsOpen(value=>!value);setLocalTracksOpen(false);revealLocalControls();}} aria-expanded={localAdjustmentsOpen} aria-label="Adjust picture" title="Picture adjustments"><SlidersHorizontal size={17}/></button>
                      <button type="button" onClick={()=>{setChatCollapsed(false);setTheatreChatOpen(value=>!value);}} aria-expanded={theatreChatOpen} aria-label={theatreChatOpen?'Close room chat':'Open room chat'} title="Room chat"><MessageCircle size={17}/></button>
                    </>}
                  </div>
                  {localTracksOpen && <div className="wt-local-track-menu" onClick={event=>event.stopPropagation()}>
                    <header><strong>Audio &amp; subtitles</strong><button type="button" onClick={()=>setLocalTracksOpen(false)} aria-label="Close track menu"><X size={15}/></button></header>
                    <section><span>Audio track</span>{localAudioTracks.length ? <div className="wt-local-track-options">{localAudioTracks.map(track=><button type="button" key={track.index} className={localAudioTrackIndex===track.index?'active':''} onClick={()=>selectLocalAudioTrack(track.index)}>{track.label}{track.language&&track.label!==track.language?<small>{track.language}</small>:null}</button>)}</div> : <p>Embedded audio track selection is not exposed by this browser.</p>}</section>
                    <section><span>Subtitles</span><div className="wt-local-track-options"><button type="button" className={localTextTrackIndex===-1?'active':''} onClick={()=>selectLocalTextTrack(-1)}>Off</button>{localTextTracks.map(track=><button type="button" key={track.index} className={localTextTrackIndex===track.index?'active':''} onClick={()=>selectLocalTextTrack(track.index)}>{track.label}{track.language&&track.label!==track.language?<small>{track.language}</small>:null}</button>)}</div>{!localTextTracks.length&&<p>No embedded subtitle tracks were exposed by this browser. Some MKV subtitle formats need a dedicated demuxer.</p>}</section>
                    <p className="wt-local-track-footnote">Tracks shown here are the ones your browser can read from this file.</p>
                  </div>}
                  {localAdjustmentsOpen && <div className="wt-local-adjustments" onClick={event=>event.stopPropagation()}>
                    <header><strong>Picture &amp; color</strong><button type="button" onClick={()=>{setLocalBrightness(100);setLocalExposure(0);setLocalContrast(100);setLocalSaturation(100);setLocalTemperature(0);setLocalTint(0);setLocalHue(0);setLocalGradeColor('#000000');setLocalGradeColorStrength(0);setLocalGradeHighlightColor('#f2d6ae');setLocalGradeShadowColor('#26364a');setLocalGradeSplitStrength(0);setLocalBackgroundColor('#000000');}} title="Reset all picture adjustments"><RefreshCw size={14}/> Reset</button></header>
                    <div className="wt-grade-presets">
                      <button type="button" onClick={()=>{setLocalBrightness(100);setLocalExposure(0);setLocalContrast(102);setLocalSaturation(98);setLocalTemperature(0);setLocalTint(0);setLocalHue(0);setLocalGradeColor('#000000');setLocalGradeColorStrength(0);setLocalGradeHighlightColor('#f2d6ae');setLocalGradeShadowColor('#26364a');setLocalGradeSplitStrength(0);}}>Natural</button>
                      <button type="button" onClick={()=>{setLocalBrightness(100);setLocalExposure(-0.1);setLocalContrast(108);setLocalSaturation(94);setLocalTemperature(7);setLocalTint(2);setLocalHue(0);setLocalGradeColor('#000000');setLocalGradeColorStrength(0);setLocalGradeHighlightColor('#e7bd8e');setLocalGradeShadowColor('#15283a');setLocalGradeSplitStrength(9);}}>Cinema</button>
                      <button type="button" onClick={()=>{setLocalBrightness(101);setLocalExposure(0);setLocalContrast(105);setLocalSaturation(96);setLocalTemperature(14);setLocalTint(3);setLocalHue(0);setLocalGradeColor('#000000');setLocalGradeColorStrength(0);setLocalGradeHighlightColor('#f6c98f');setLocalGradeShadowColor('#4a3140');setLocalGradeSplitStrength(8);}}>Warm film</button>
                      <button type="button" onClick={()=>{setLocalBrightness(98);setLocalExposure(-0.15);setLocalContrast(108);setLocalSaturation(90);setLocalTemperature(-14);setLocalTint(-3);setLocalHue(0);setLocalGradeColor('#000000');setLocalGradeColorStrength(0);setLocalGradeHighlightColor('#a6c7e8');setLocalGradeShadowColor('#14253f');setLocalGradeSplitStrength(10);}}>Cool night</button>
                      <button type="button" onClick={()=>{setLocalBrightness(100);setLocalExposure(0);setLocalContrast(112);setLocalSaturation(0);setLocalTemperature(0);setLocalTint(0);setLocalHue(0);setLocalGradeColor('#000000');setLocalGradeColorStrength(0);setLocalGradeSplitStrength(0);}}>Mono</button>
                      <button type="button" onClick={()=>{setLocalBrightness(100);setLocalExposure(0);setLocalContrast(105);setLocalSaturation(112);setLocalTemperature(0);setLocalTint(0);setLocalHue(0);setLocalGradeColor('#000000');setLocalGradeColorStrength(0);setLocalGradeSplitStrength(0);}}>Vivid</button>
                    </div>
                    <label><span>Brightness <output>{localBrightness}%</output></span><input type="range" min="50" max="150" step="1" value={localBrightness} onChange={event=>setLocalBrightness(Number(event.target.value))}/></label>
                    <label><span>Exposure <output>{localExposure>0?'+':''}{localExposure.toFixed(1)} EV</output></span><input type="range" min="-2" max="2" step="0.1" value={localExposure} onChange={event=>setLocalExposure(Number(event.target.value))}/></label>
                    <label><span>Contrast <output>{localContrast}%</output></span><input type="range" min="50" max="160" step="1" value={localContrast} onChange={event=>setLocalContrast(Number(event.target.value))}/></label>
                    <label><span>Saturation <output>{localSaturation}%</output></span><input type="range" min="0" max="160" step="1" value={localSaturation} onChange={event=>setLocalSaturation(Number(event.target.value))}/></label>
                    <label><span>Temperature <output>{localTemperature>0?'+':''}{localTemperature}</output></span><input type="range" min="-100" max="100" step="1" value={localTemperature} onChange={event=>setLocalTemperature(Number(event.target.value))}/></label>
                    <label><span>Tint <output>{localTint>0?'+':''}{localTint}</output></span><input type="range" min="-100" max="100" step="1" value={localTint} onChange={event=>setLocalTint(Number(event.target.value))}/></label>
                    <label><span>Hue <output>{localHue>0?'+':''}{localHue}°</output></span><input type="range" min="-180" max="180" step="1" value={localHue} onChange={event=>setLocalHue(Number(event.target.value))}/></label>
                    <div className="wt-grade-split-row"><span>Split tone</span><label><small>Highlights</small><input type="color" value={localGradeHighlightColor} onChange={event=>setLocalGradeHighlightColor(event.target.value)}/></label><label><small>Shadows</small><input type="color" value={localGradeShadowColor} onChange={event=>setLocalGradeShadowColor(event.target.value)}/></label></div>
                    <label><span>Split tone strength <output>{localGradeSplitStrength}%</output></span><input type="range" min="0" max="20" step="1" value={localGradeSplitStrength} onChange={event=>setLocalGradeSplitStrength(Number(event.target.value))}/></label>
                    <div className="wt-grade-color-row"><span>Color wash</span><input type="color" value={/^#[0-9a-fA-F]{6}$/.test(localGradeColor)?localGradeColor:'#000000'} onChange={event=>setLocalGradeColor(event.target.value)}/><input type="text" value={localGradeColor} maxLength={7} spellCheck={false} aria-label="Color hex code" placeholder="#RRGGBB" onChange={event=>setLocalGradeColor(event.target.value)} onBlur={()=>{if(!/^#[0-9a-fA-F]{6}$/.test(localGradeColor))setLocalGradeColor('#000000');}}/></div>
                    <label><span>Color wash strength <output>{localGradeColorStrength}%</output></span><input type="range" min="0" max="40" step="1" value={localGradeColorStrength} onChange={event=>setLocalGradeColorStrength(Number(event.target.value))}/></label>
                    <div className="wt-grade-background-row"><span>Video background</span><div className="wt-grade-background-swatches">{[{label:'Black',value:'#000000'},{label:'Charcoal',value:'#111827'},{label:'Navy',value:'#101d32'},{label:'Plum',value:'#24172f'},{label:'Forest',value:'#14251f'},{label:'Slate',value:'#26313d'}].map(color=><button key={color.value} type="button" title={color.label} aria-label={color.label+' video background'} aria-pressed={localBackgroundColor===color.value} style={{backgroundColor:color.value}} onClick={()=>setLocalBackgroundColor(color.value)}/>)}</div><input type="color" value={/^#[0-9a-fA-F]{6}$/.test(localBackgroundColor)?localBackgroundColor:'#000000'} aria-label="Custom video background color" onChange={event=>setLocalBackgroundColor(event.target.value)}/></div>
                  </div>}
                  <div className="wt-local-controls" role="group" aria-label="Local video controls" onClick={event=>event.stopPropagation()}>
                    <div className="wt-local-control-row">
                      <input ref={subtitleFileInputRef} type="file" accept={SUBTITLE_FILE_ACCEPT} hidden onChange={async event => { const file=event.target.files?.[0]; event.target.value=''; if(!file)return; try { const raw=await file.text(); const blob=new Blob([subtitleToVtt(raw)],{type:'text/vtt'}); const url=URL.createObjectURL(blob); setLocalSubtitleUrl(previous=>{if(previous)URL.revokeObjectURL(previous);return url;}); setLocalSubtitleName(file.name); setLocalSubtitleEnabled(true); revealLocalControls(); } catch { setError('Could not read this subtitle file. Choose an SRT or VTT file.'); } }} />
                      <button type="button" className="wt-local-track-button" onClick={()=>subtitleFileInputRef.current?.click()} title="Load subtitles" aria-label="Load subtitles">CC</button>
                      {localSubtitleUrl && <button type="button" className="wt-local-track-button" onClick={()=>setLocalSubtitleEnabled(value=>!value)} aria-pressed={localSubtitleEnabled} title={localSubtitleEnabled?'Turn subtitles off':'Turn subtitles on'}>{localSubtitleEnabled?'CC on':'CC off'}</button>}
                      {localAudioTracks.length>1 && <select className="wt-local-track-select" value={localAudioTrackIndex} onChange={event=>{const next=Number(event.target.value);const tracks=localVideoRef.current?.audioTracks;if(!tracks)return;Array.from({length:tracks.length},(_,index)=>{tracks[index].enabled=index===next;});setLocalAudioTrackIndex(next);}} aria-label="Audio track">{localAudioTracks.map(track=><option key={track.index} value={track.index}>{track.label}</option>)}</select>}
                      <button type="button" onClick={()=>sendPlayerCommand('seek',[Math.max(0,currentTimeRef.current-10)])} disabled={!playerReady} aria-label="Back 10 seconds" title="Back 10 seconds"><SkipBack size={17}/><small>10</small></button>
                      <button type="button" className="wt-local-play" onClick={()=>sendPlayerCommand(paused?'play':'pause')} disabled={!playerReady} aria-label={paused?'Play video':'Pause video'} title={paused?'Play':'Pause'}>{paused?<Play size={19} fill="currentColor"/>:<Pause size={19} fill="currentColor"/>}</button>
                      <button type="button" onClick={()=>sendPlayerCommand('seek',[Math.min(duration||Infinity,currentTimeRef.current+10)])} disabled={!playerReady} aria-label="Forward 10 seconds" title="Forward 10 seconds"><SkipForward size={17}/><small>10</small></button>
                      <span className="wt-local-time">{timeText(currentTime)} <i>/</i> {timeText(duration)}</span>
                      <button type="button" onClick={()=>{sendPlayerCommand('setMuted',[!muted]);setMuted(!muted);}} aria-label={muted?'Unmute video':'Mute video'} title={muted?'Unmute':'Mute'}>{muted?<VolumeX size={17}/>:<Volume2 size={17}/>}</button>
                      <button type="button" onClick={toggleLocalFullscreen} aria-label={isLocalFullscreen?'Exit fullscreen':'Enter fullscreen'} title={isLocalFullscreen?'Exit fullscreen':'Fullscreen'}>{isLocalFullscreen?<Minimize2 size={17}/>:<Maximize2 size={17}/>}</button>
                    </div>
                    <div className="wt-local-seek">
                      <input
                        type="range"
                        min="0"
                        max={Math.max(1,duration||1)}
                        step="0.25"
                        value={Math.min(currentTime,duration||currentTime)}
                        disabled={!playerReady}
                        onChange={event=>setCurrentTime(Number(event.target.value))}
                        onPointerUp={event=>sendPlayerCommand('seek',[Number(event.currentTarget.value)])}
                        onKeyUp={event=>{if(event.key.startsWith('Arrow'))sendPlayerCommand('seek',[Number(event.currentTarget.value)]);}}
                        aria-label="Seek local video"
                      />
                    </div>
                  </div>
                  {localVideoError&&<div className="wt-local-playback-error"><strong>Can’t play this video here</strong><span>{localVideoError}</span>{localCodecDiagnostics&&<small className="wt-codec-diagnostics"><b>{localCodecDiagnostics.fileName}</b><br/>Container MIME: {localCodecDiagnostics.mime}<br/>H.264 MP4: {localCodecDiagnostics.h264} · H.265/HEVC MP4: {localCodecDiagnostics.hevc} · VP9 WebM: {localCodecDiagnostics.vp9}<br/>Most widely compatible target: MP4 · H.264 video · AAC audio</small>}</div>}
                </> : <iframe ref={iframeRef} src={sharedPlayerUrl} title={"Watch Party: " + (room.media?.title || itemMedia.title)} allow="autoplay; fullscreen; encrypted-media" allowFullScreen disablePictureInPicture/>}
                {(localPlaybackOverride || canReturnLocal) && !syncNoticeDismissed && <div className="wt-sync-floating" role="status">
                  <span className="wt-sync-indicator"><i/>{localPlaybackOverride?'Playing independently':'Room playback'}</span>
                  {localPlaybackOverride&&<button type="button" onClick={syncToRoom} disabled={!playerReady} title="Jump back to the room’s current position"><Radio size={14}/> Sync with room</button>}
                  {canReturnLocal&&<button type="button" onClick={returnToLocalPosition} disabled={!playerReady} title="Return to your saved playback position">Return to my spot</button>}
                  <button type="button" className="wt-sync-dismiss" onClick={()=>setSyncNoticeDismissed(true)} aria-label="Dismiss playback sync notice" title="Dismiss"><X size={15}/></button>
                </div>}
              </div>
              {theatreMode && theatreToast && <button type="button" className="wt-theatre-message-toast" onClick={()=>{setChatCollapsed(false);setTheatreChatOpen(true);setTheatreToast(null);}}><img src={theatreToast.avatar_url || blobatar(theatreToast.display_name)} alt=""/><span><strong>{theatreToast.display_name}</strong><small>{theatreToast.body}</small></span><X size={14} onClick={event=>{event.stopPropagation();setTheatreToast(null);}}/></button>}
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
              <div className="wt-members"><button type="button" className="wt-members-summary" onClick={()=>setParticipantsOpen(true)} aria-haspopup="dialog" aria-label={`View all ${members.length} active participants`}><span className="wt-members-stack">{members.slice(0,4).map(member=><img key={member.id} src={member.avatar_url||blobatar(member.display_name)} alt=""/>)}{members.length>4&&<i>+{members.length-4}</i>}</span><span className="wt-members-summary-copy"><b>{members.length} online</b><small>View participants</small></span><ChevronRight size={15}/></button></div>
              </div>
            {!theatreMode && <aside className={"wt-chat"+(chatCollapsed?" is-collapsed":"")}>
              <div className="wt-chat-head"><div><MessageCircle size={17}/><strong>Room chat</strong><span className="wt-theatre-online">{members.length} online</span></div></div>
              {participant?.is_host && requests.length>0 && <div className="wt-requests"><strong>Access requests <small>{requests.length}</small></strong>{requests.map(req=><div className="wt-request" key={req.id}><span><b>{req.display_name}</b><small>{({operator:'Operator access',skip_forward:'Skip forward 10s',skip_back:'Skip back 10s',seek:'Seek request'})[req.request_type] || req.request_type}</small></span><button onClick={()=>resolveRequest(req.id,true)} disabled={busy}>Allow</button><button onClick={()=>resolveRequest(req.id,false)} disabled={busy}>Deny</button></div>)}</div>}
              <div className="wt-chat-messages">{messages.map(message=><article className={message.participant_id===participant.id?'mine':''} key={message.id}><img src={message.avatar_url || blobatar(message.display_name)} alt=""/><div><div className="wt-message-meta"><b>{message.display_name}</b><time>{new Date(message.created_at).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</time></div><p>{message.body}</p></div></article>)}</div>
              {room.settings?.reactions_enabled !== false && <div className="wt-reactions">{['❤️','😂','😮','👏','🔥'].map(emoji=><button type="button" key={emoji} disabled={busy||room.settings?.chat_enabled===false} onClick={()=>{setDraft(emoji);setTimeout(()=>{const form=document.querySelector('.wt-chat-form');form?.requestSubmit();},0);}}>{emoji}</button>)}</div>}
              {room.settings?.chat_enabled !== false ? <form className="wt-chat-form" onSubmit={sendChat}><input value={draft} onChange={e=>setDraft(e.target.value.slice(0,500))} placeholder="Say something…" maxLength={500}/><button type="button" className="wt-chat-toggle" onClick={()=>setChatCollapsed(value=>!value)} aria-label={chatCollapsed?"Expand room chat":"Collapse room chat"} title={chatCollapsed?"Expand chat":"Collapse chat"}>{chatCollapsed?<PanelRightOpen size={17}/>:<PanelRightClose size={17}/>}</button><button type="submit" disabled={!draft.trim()||busy} aria-label="Send message"><Send size={17}/></button></form> : <div className="wt-chat-disabled">The host has disabled room chat.</div>}
              {error && <p className="wt-error wt-chat-error">{error}</p>}
              <div className="wt-chat-foot"><Clock3 size={13}/> Chat and room expire automatically after inactivity.</div>
            </aside>}
              </div>
            </div>
          </div>}
          {qrDialogOpen && room && typeof document !== 'undefined' && createPortal(
            <div className="wt-qr-backdrop" role="presentation" onMouseDown={event=>{if(event.target===event.currentTarget)setQrDialogOpen(false);}}>
              <section className="wt-qr-dialog" role="dialog" aria-modal="true" aria-label="Room QR code">
                <button type="button" className="wt-qr-close" onClick={()=>setQrDialogOpen(false)} aria-label="Close QR code"><X size={19}/></button>
                <span className="wt-qr-kicker">JOIN THIS SCREENING</span>
                <h2>Join this Watch Party</h2>
                <p>Open your camera and scan this code to join the room.</p>
                <div className="wt-qr-image"><img src={`https://quickchart.io/qr?size=360&margin=2&text=${encodeURIComponent(roomLink)}`} alt="QR code for this screening room"/></div>
                <div className="wt-qr-code"><span>ROOM CODE</span><strong>{room.code}</strong></div>
                <button type="button" className="wt-qr-copy" onClick={copyLink}><Copy size={16}/>{copied?'Copied invite link':'Copy invite link'}</button>
              </section>
            </div>,document.body
          )}
                    {participantsOpen && room && typeof document !== 'undefined' && createPortal(<div className="wt-create-backdrop wt-participants-backdrop" role="presentation" onMouseDown={event=>{if(event.target===event.currentTarget)setParticipantsOpen(false);}}><section className="wt-create-dialog wt-participants-dialog" role="dialog" aria-modal="true" aria-label="Watch Party participants"><header><div><span>IN THIS PARTY</span><h2>Participants <small>{members.length} / 29</small></h2><p>People currently active in this room.</p></div><button type="button" onClick={()=>setParticipantsOpen(false)} aria-label="Close participants"><X size={18}/></button></header><div className="wt-participant-list">{members.map(member=><article key={member.id}><img src={member.avatar_url||blobatar(member.display_name)} alt=""/><span><b>{member.display_name}{member.id===participant?.id?' (You)':''}</b><small>{member.is_host||member.role==='host'?'Host':member.role==='operator'?'Operator':'Viewer'}</small></span>{member.is_host||member.role==='host'?<Crown size={15}/>:member.role==='operator'?<ShieldCheck size={15}/>:participant?.is_host?<div className="wt-participant-actions"><button type="button" disabled={busy} onClick={()=>grantOperator(member)} title="Make operator"><ShieldCheck size={15}/></button><button type="button" disabled={busy} onClick={()=>setConfirmAction({type:'remove',member})} title="Remove participant"><UserMinus size={15}/></button><button type="button" disabled={busy} onClick={()=>setConfirmAction({type:'transfer',member})} title="Transfer host"><ArrowRightLeft size={15}/></button></div>:null}</article>)}</div><footer><span>{Math.max(0,29-members.length)} spots available</span><button type="button" onClick={()=>setParticipantsOpen(false)}>Done</button></footer></section></div>,document.body)}
{hostPanelOpen && typeof document !== 'undefined' && createPortal(<div className="wt-create-backdrop" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)setHostPanelOpen(false);}}><section className="wt-create-dialog wt-host-panel" role="dialog" aria-modal="true" aria-label="Host control panel"><header><div><span>ROOM MANAGEMENT</span><h2>Host control panel</h2><p>Manage access, permissions and your screening.</p></div><button type="button" onClick={()=>setHostPanelOpen(false)} aria-label="Close"><X size={18}/></button></header><div className="wt-host-settings"><label><span><b>Lock room</b><small>Only current participants can stay. New joins are blocked.</small></span><input type="checkbox" checked={Boolean(room.settings?.locked)} onChange={e=>updateRoomSettings({locked:e.target.checked})}/></label><label><span><b>Reactions</b><small>Allow quick emoji reactions in chat.</small></span><input type="checkbox" checked={room.settings?.reactions_enabled!==false} onChange={e=>updateRoomSettings({reactions_enabled:e.target.checked})}/></label><label><span><b>Room chat</b><small>Allow participants to send messages.</small></span><input type="checkbox" checked={room.settings?.chat_enabled!==false} onChange={e=>updateRoomSettings({chat_enabled:e.target.checked})}/></label><label><span><b>Guest episode changes</b><small>Let viewers change the shared episode.</small></span><input type="checkbox" checked={Boolean(room.settings?.guests_can_change_episode)} onChange={e=>updateRoomSettings({guests_can_change_episode:e.target.checked})}/></label><label><span><b>Room expiry</b><small>Choose how long the room can remain active.</small></span><select value={room.settings?.expiry_minutes||30} onChange={e=>updateRoomSettings({expiry_minutes:Number(e.target.value)})}><option value="30">30 minutes inactive</option><option value="60">1 hour inactive</option><option value="180">3 hours inactive</option><option value="480">8 hours inactive</option><option value="1440">24 hours inactive</option></select></label></div><div className="wt-host-people wt-host-people-compact"><div><span><b>Participants</b><small>{members.length} of 29 active · manage roles and access</small></span><button type="button" onClick={()=>{setHostPanelOpen(false);setParticipantsOpen(true);}}>Manage list <ChevronRight size={14}/></button></div></div><div className="wt-host-danger"><div className="wt-host-danger-copy"><span className="wt-host-danger-icon"><LogOut size={16}/></span><span><b>End room</b><small>Disconnect everyone and permanently close this screening.</small></span></div><button type="button" onClick={()=>setConfirmAction({type:'close'})}><LogOut size={14}/>End room</button></div></section></div>,document.body)}
          {confirmAction && typeof document !== 'undefined' && createPortal(<div className="wt-create-backdrop wt-confirm-backdrop" role="presentation"><section className={"wt-create-dialog wt-confirm-dialog " + (confirmAction.type==='close'||confirmAction.type==='leave'||confirmAction.type==='remove'?'is-danger':'')} role="alertdialog" aria-modal="true"><div className={"wt-confirm-icon " + (confirmAction.type==='transfer'?'is-transfer':'')}>{confirmAction.type==='transfer'?<ArrowRightLeft size={21}/>:confirmAction.type==='remove'?<UserMinus size={21}/>:<LogOut size={21}/>}</div><header><div><span>{confirmAction.type==='transfer'?'HOST TRANSFER':confirmAction.type==='remove'?'PARTICIPANT ACCESS':confirmAction.type==='leave'?'LEAVE SCREENING':'END SCREENING'}</span><h2>{confirmAction.type==='transfer'?'Transfer host privileges?':confirmAction.type==='remove'?'Remove participant?':confirmAction.type==='leave'&&!participant?.is_host?'Leave this room?':'End this room?'}</h2><p>{confirmAction.type==='transfer'?confirmAction.member.display_name+' will become the host. You will become a viewer.':confirmAction.type==='remove'?confirmAction.member.display_name+' will be removed from this screening.':confirmAction.type==='leave'&&!participant?.is_host?'You will leave the screening. The room will remain open for everyone else.':'Everyone will be disconnected and this room will be permanently closed.'}</p></div></header><div className="wt-confirm-actions"><button type="button" className="wt-confirm-cancel" onClick={()=>setConfirmAction(null)}>Cancel</button><button type="button" className={"wt-confirm-primary " + (confirmAction.type==='transfer'?'is-transfer':'')} disabled={busy} onClick={async()=>{const action=confirmAction; if(action.type==='transfer')await transferHost(action.member);else if(action.type==='remove')await removeMember(action.member);else{setConfirmAction(null);await leaveRoom();}}}>{busy?'Working…':confirmAction.type==='close'?'End room':confirmAction.type==='leave'?(participant?.is_host?'End room':'Leave room'):confirmAction.type==='remove'?'Remove participant':'Transfer host'}</button></div></section></div>,document.body)}
          {joinPreviewOpen && typeof document !== 'undefined' && createPortal(
            <div className="wt-create-backdrop wt-join-file-backdrop" role="presentation" onMouseDown={event => {
              if (event.target === event.currentTarget) {
                setJoinPreviewOpen(false);
                setPendingJoinCode('');
                setPendingJoinIdentity(null);
                setPendingJoinMedia(null);
                setError('');
              }
            }}>
              <section className="wt-create-dialog wt-join-file-dialog" role="dialog" aria-modal="true" aria-labelledby="wt-join-file-title">
                <header>
                  <div>
                    <span>{pendingJoinCode ? 'LOCAL FILE SCREENING' : 'MEDIA UPDATED'}</span>
                    <h2 id="wt-join-file-title">{pendingJoinCode ? 'Join this room?' : 'The host changed the video'}</h2>
                    <p>{pendingJoinCode ? 'The host is sharing a video stored on their device.' : 'Choose the new matching file to continue watching with everyone.'}</p>
                  </div>
                  <button type="button" onClick={() => {
                    setJoinPreviewOpen(false);
                    setPendingJoinCode('');
                    setPendingJoinIdentity(null);
                    setPendingJoinMedia(null);
                    setError('');
                  }} aria-label="Cancel joining"><X size={18}/></button>
                </header>
                <div className="wt-join-file-preview">
                  <span className="wt-join-file-preview-icon"><Radio size={23}/></span>
                  <span className="wt-join-file-preview-copy">
                    <strong title={pendingJoinMedia?.fileName || pendingJoinMedia?.title || 'Video file'}>{pendingJoinMedia?.fileName || pendingJoinMedia?.title || 'Video file'}</strong>
                    <small>{pendingJoinMedia?.fileSize ? (Number(pendingJoinMedia.fileSize) / 1024 / 1024).toFixed(1) + ' MB' : 'Video file'} · {pendingJoinMedia?.mimeType || 'Video'}</small>
                  </span>
                </div>
                <p className="wt-join-file-note"><ShieldCheck size={15}/> {pendingJoinCode ? 'Choose your own copy of this exact video. The file stays on your device and is checked locally before you join.' : 'The file stays on your device. Playback will resume with the room after the matching file is selected.'}</p>
                {error && <p className="wt-error">{error}</p>}
                <div className="wt-join-file-actions">
                  <button type="button" className="wt-join-file-cancel" onClick={() => {
                    setJoinPreviewOpen(false);
                    setPendingJoinCode('');
                    setPendingJoinIdentity(null);
                    setPendingJoinMedia(null);
                    setError('');
                  }}>Cancel</button>
                  <button type="button" className="wt-join-file-primary" disabled={busy || localFileBusy} onClick={() => {
                    setError('');
                    const picker = joinFileInputRef.current;
                    if (!picker) { setError('The video picker is unavailable. Close this dialog and try again.'); return; }
                    try { if (typeof picker.showPicker === 'function') picker.showPicker(); else picker.click(); }
                    catch { picker.click(); }
                  }}>{localFileBusy ? 'Checking video…' : busy ? 'Joining…' : 'Choose matching video'}</button>
                </div>
              </section>
            </div>,
            document.body
          )}
          {setupDialog && typeof document !== 'undefined' && createPortal(<div className="wt-create-backdrop" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget){setSetupDialog(false);if(isChangingMedia){setLocalFile(localSelectionBeforeChangeRef.current?.file||null);setLocalFileFingerprint(localSelectionBeforeChangeRef.current?.fingerprint||'');}setIsChangingMedia(false);localSelectionBeforeChangeRef.current=null;}}}>
            <section className="wt-create-dialog" role="dialog" aria-modal="true" aria-label="Create a screening room">
              <header><div><span>{isChangingMedia ? 'ROOM UPDATE' : 'NEW SCREENING'}</span><h2>{isChangingMedia ? 'Change what everyone is watching' : 'Choose your title'}</h2><p>{isChangingMedia ? 'The new movie or file will be switched for everyone in this room.' : 'Everyone joining this room will open this movie or series.'}</p></div><button type="button" onClick={()=>{setSetupDialog(false);if(isChangingMedia){setLocalFile(localSelectionBeforeChangeRef.current?.file||null);setLocalFileFingerprint(localSelectionBeforeChangeRef.current?.fingerprint||'');}setIsChangingMedia(false);localSelectionBeforeChangeRef.current=null;}} aria-label="Close"><X size={18}/></button></header>
              <div className="wt-room-type-pills" role="group" aria-label="Room type">
                <button type="button" className={roomType==='movie'?'active':''} onClick={()=>{setRoomType('movie');setError('');}}><Play size={14}/> Movie / Series</button>
                <button type="button" className={roomType==='local'?'active':''} onClick={()=>{setRoomType('local');setPublicRoomEnabled(false);setError('');}}><Users size={14}/> Local</button>
              </div>
              {!isChangingMedia && roomType==='movie' && <div className="wt-public-toggle wt-create-public-toggle"><span><strong>Public room</strong><small>Optional · Anyone can find and join while you're online</small></span><button type="button" role="switch" aria-label="Make this room public" aria-checked={publicRoomEnabled} className={publicRoomEnabled?'is-on':''} onClick={()=>setPublicRoomEnabled(value=>!value)}><i/></button></div>}
              {(roomType==='local')?<div className="wt-local-file-picker"><input ref={localFileInputRef} type="file" accept={VIDEO_FILE_ACCEPT} hidden onChange={event=>{const file=event.target.files?.[0];event.target.value='';handleLocalFile(file, '', !isChangingMedia);}}/><button type="button" className="wt-local-file-drop" onClick={()=>localFileInputRef.current?.click()} disabled={localFileBusy}><span className="wt-local-file-icon"><Radio size={22}/></span><strong>{localFileBusy?'Checking video…':localFile?'Change video file':'Choose a video file'}</strong><small>{localFile?localFile.name:'Select a video stored on this device'}</small><em>{localFile?((localFile.size/1024/1024).toFixed(1)+' MB · Never uploaded'): 'Everyone joining must select their own copy of the same file.'}</em></button>{localFile&&<div className="wt-local-file-match"><Check size={15}/><span><strong>File fingerprint ready</strong><small>Participants are checked against this video before joining.</small></span><badge>Verified locally</badge></div>}</div>:<>{roomType==='movie'&&mediaSelectorExpanded&&<><label className="wt-picker-search"><Search size={16}/><input value={mediaQuery} onChange={event=>setMediaQuery(event.target.value)} placeholder="Search any movie or series…"/></label><div className="wt-picker-grid">{tmdbSearchLoading && <p className="wt-picker-empty">Searching your library and TMDB…</p>}{filteredMediaItems.length?filteredMediaItems.map((candidate,index)=><button type="button" key={`${candidate.tmdbId || candidate.id}-${index}`} onClick={()=>{setSelectedMedia(candidate);setMediaSelectorExpanded(false);setError('');}} className={selectedMedia?.tmdbId===candidate.tmdbId?'selected':''}>{candidate.poster ? <img src={candidate.poster} alt="" loading={index<9?'eager':'lazy'} decoding="async" onError={event=>{event.currentTarget.style.visibility='hidden';event.currentTarget.parentElement.classList.add('poster-unavailable');}}/> : <span className="wt-poster-placeholder" aria-hidden="true">No poster</span>}<span className="wt-picker-copy"><strong title={candidate.title}>{candidate.title}</strong><small className="wt-picker-rating-row"><span>{candidate.year || '—'} · {candidate.type==='series'||candidate.mediaType==='tv'?'Series':'Movie'}</span><b>{(candidate.rating || candidate.imdbRating || candidate.voteAverage) ? `★ ${Number(candidate.rating || candidate.imdbRating || candidate.voteAverage).toFixed(1)}` : 'Rating unavailable'}</b></small></span><i>{selectedMedia?.tmdbId===candidate.tmdbId?<Check size={15}/>:null}</i></button>):<p className="wt-picker-empty">No titles found. Try another title or spelling.</p>}</div></>}
              {roomType==='movie'&&selectedMedia && <div className="wt-dialog-selected"><img src={selectedMedia.poster || guest.avatar} alt=""/><span className="wt-dialog-selected-meta"><strong title={selectedMedia.title}>{selectedMedia.title}</strong><small>{selectedMedia.year || '—'} · {selectedMedia.type==='series'||selectedMedia.mediaType==='tv'?'Series':'Movie'}</small><small className="wt-dialog-rating">{(selectedMedia.rating || selectedMedia.imdbRating || selectedMedia.voteAverage) ? `★ ${Number(selectedMedia.rating || selectedMedia.imdbRating || selectedMedia.voteAverage).toFixed(1)} rating` : 'Rating unavailable'}</small></span><button type="button" className="wt-change-title" onClick={()=>setMediaSelectorExpanded(value=>!value)}>{mediaSelectorExpanded?'Done':'Change title'}</button></div>}
              {roomType==='movie'&&!selectedMedia&&<small className="wt-picker-hint">Choose a movie or series to continue.</small>}
              </>}
              {error && <p className="wt-error">{error}</p>}
              <button className="wt-create" disabled={busy||localFileBusy||((roomType==='local')?!localFile:(!selectedMedia||!Number(selectedMedia.tmdbId)))} onClick={async()=>{const saved=isChangingMedia?await changeRoomMedia():await createRoom();if(saved){setSetupDialog(false);setIsChangingMedia(false);}}}>{busy?(isChangingMedia?'Updating room…':'Creating room…'):isChangingMedia?'Change for everyone':roomType==='local'?'Create local file room':'Create screening room'}<Link2 size={17}/></button>
            </section>
          </div>, document.body)}


    </section>}

    {(theatreMode || isLocalFullscreen) && theatreChatOpen && typeof document !== 'undefined' && createPortal(
      <div className={`wt-theatre-chat-portal${fullscreenChatPlayer ? ' wt-local-fullscreen-chat-portal' : ''}`} style={{position:fullscreenChatPlayer?"absolute":"fixed",inset:0,zIndex:2147483647,pointerEvents:"none",isolation:"isolate"}}><aside className={"wt-chat wt-theatre-chat-open"+(chatCollapsed?" is-collapsed":"")} style={{display:"flex",position:fullscreenChatPlayer?"absolute":"fixed",top:"calc(58px + env(safe-area-inset-top))",right:14,bottom:"calc(14px + env(safe-area-inset-bottom))",width:"min(390px, calc(100vw - 28px))",height:"auto",maxHeight:"none",minHeight:0,margin:0,boxSizing:"border-box",flexDirection:"column",overflow:"hidden",pointerEvents:"auto",zIndex:1,border:"1px solid rgba(255,255,255,.14)",borderRadius:20,background:"rgba(10,13,20,.76)",color:"#f5f7fb",boxShadow:"0 24px 90px rgba(0,0,0,.6)",backdropFilter:"blur(30px) saturate(1.25)",WebkitBackdropFilter:"blur(30px) saturate(1.25)"}}>
              <div className="wt-chat-head"><div><MessageCircle size={17}/><strong>Room chat</strong><span className="wt-theatre-online">{members.length} online</span></div><div className="wt-theatre-chat-actions"><button type="button" onClick={()=>setQrDialogOpen(true)} title="Show room QR code" aria-label="Show room QR code"><QrCode size={16}/></button><button type="button" onClick={copyLink} title="Copy invite link" aria-label="Copy invite link">{copied?<Check size={16}/>:<Copy size={16}/>}</button><button type="button" className="wt-theatre-chat-close" onClick={()=>setTheatreChatOpen(false)} title="Close chat" aria-label="Close chat"><X size={17}/></button></div></div>
              {theatreMode && <button type="button" className="wt-theatre-preview-setting" onClick={()=>{setTheatrePreviewsEnabled(value=>!value);setTheatreToast(null);}}>{theatrePreviewsEnabled?<Eye size={14}/>:<EyeOff size={14}/>} Message popups {theatrePreviewsEnabled?'on':'off'}</button>}
              {participant?.is_host && requests.length>0 && <div className="wt-requests"><strong>Access requests <small>{requests.length}</small></strong>{requests.map(req=><div className="wt-request" key={req.id}><span><b>{req.display_name}</b><small>{({operator:'Operator access',skip_forward:'Skip forward 10s',skip_back:'Skip back 10s',seek:'Seek request'})[req.request_type] || req.request_type}</small></span><button onClick={()=>resolveRequest(req.id,true)} disabled={busy}>Allow</button><button onClick={()=>resolveRequest(req.id,false)} disabled={busy}>Deny</button></div>)}</div>}
              <div className="wt-chat-messages">{messages.map(message=><article className={message.participant_id===participant.id?'mine':''} key={message.id}><img src={message.avatar_url || blobatar(message.display_name)} alt=""/><div><div className="wt-message-meta"><b>{message.display_name}</b><time>{new Date(message.created_at).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</time></div><p>{message.body}</p></div></article>)}</div>
              {room.settings?.reactions_enabled !== false && <div className="wt-reactions">{['❤️','😂','😮','👏','🔥'].map(emoji=><button type="button" key={emoji} disabled={busy||room.settings?.chat_enabled===false} onClick={()=>{setDraft(emoji);setTimeout(()=>{const form=document.querySelector('.wt-chat-form');form?.requestSubmit();},0);}}>{emoji}</button>)}</div>}
              {room.settings?.chat_enabled !== false ? <form className="wt-chat-form" onSubmit={sendChat}><input value={draft} onChange={e=>setDraft(e.target.value.slice(0,500))} placeholder="Say something…" maxLength={500}/><button type="button" className="wt-chat-toggle" onClick={()=>setChatCollapsed(value=>!value)} aria-label={chatCollapsed?"Expand room chat":"Collapse room chat"} title={chatCollapsed?"Expand chat":"Collapse chat"}>{chatCollapsed?<PanelRightOpen size={17}/>:<PanelRightClose size={17}/>}</button><button type="submit" disabled={!draft.trim()||busy} aria-label="Send message"><Send size={17}/></button></form> : <div className="wt-chat-disabled">The host has disabled room chat.</div>}
              {error && <p className="wt-error wt-chat-error">{error}</p>}
              <div className="wt-chat-foot"><Clock3 size={13}/> Chat and room expire automatically after inactivity.</div>
            </aside>
      </div>, fullscreenChatPlayer || document.body
    )}

  </>;
}
