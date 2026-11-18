import React, { useEffect, useRef, useState } from 'react';

const DEFAULT_ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

const getIceServers = () => {
  try {
    const value = import.meta.env?.VITE_P2P_ICE_SERVERS;
    if (!value) return DEFAULT_ICE_SERVERS;
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) && parsed.length ? parsed : DEFAULT_ICE_SERVERS;
  } catch {
    return DEFAULT_ICE_SERVERS;
  }
};

export default function WatchTogetherP2P({ room, participant, members = [], localVideoRef, videoEnabled, videoReady = false, videoPlaying = false, voiceEnabled, onRemoteMuted, rpc }) {
  const peers = useRef(new Map());
  const membersRef = useRef(members);
  membersRef.current = members;
  const localMic = useRef(null);
  const captureStream = useRef(null);
  const seenSignal = useRef(0);
  const [connections, setConnections] = useState({});
  const [remoteStreams, setRemoteStreams] = useState({});
  const [error, setError] = useState('');
  const [streamStarted, setStreamStarted] = useState(false);
  const hostStreamActive = Boolean(videoEnabled && participant?.is_host && streamStarted);
  const active = Boolean(room?.code && participant?.id && (videoEnabled || voiceEnabled));
  useEffect(() => {
    setStreamStarted(false);
    setError('');
  }, [room?.code, videoEnabled]);

  useEffect(() => {
    if (!active) return undefined;
    if (videoEnabled && participant.is_host && !streamStarted && !voiceEnabled) return undefined;
    let cancelled = false;
    let polling = false;
    const pendingIce = new Map();
    const iceServers = getIceServers();
    const update = (id, state) => setConnections(old => ({ ...old, [id]: state }));
    const send = (to, payload) => rpc('watch_room_p2p_send', {
      p_code: room.code, p_token: participant.token, p_to: to, p_payload: payload,
    });

    const ensureCapture = () => {
      if (!videoEnabled || !participant.is_host || captureStream.current) return Boolean(captureStream.current);
      const video = localVideoRef?.current;
      const capture = video?.captureStream || video?.mozCaptureStream;
      if (!video || video.readyState < 2 || video.paused || video.ended) return false;
      if (!capture) {
        setError('This browser cannot share a local video stream. Try the latest Chrome or Edge.');
        return false;
      }
      try {
        const stream = capture.call(video);
        if (!stream.getVideoTracks().length) return false;
        captureStream.current = stream;
        return true;
      } catch {
        setError('This browser could not capture the local video. Try the latest Chrome or Edge.');
        return false;
      }
    };

    const flushIce = async entry => {
      if (!entry.pc.remoteDescription) return;
      for (const candidate of entry.pendingIce.splice(0)) {
        try { await entry.pc.addIceCandidate(candidate); } catch {}
      }
    };

    const makePeer = async member => {
      if (cancelled || member.id === participant.id || peers.current.has(member.id)) return;
      if (hostStreamActive && !ensureCapture()) return;
      const pc = new RTCPeerConnection({ iceServers });
      const entry = { pc, pendingIce: [], stream: new MediaStream() };
      peers.current.set(member.id, entry);
      pc.onicecandidate = event => {
        if (event.candidate) send(member.id, { type: 'ice', candidate: event.candidate.toJSON() }).catch(() => {});
      };
      pc.onconnectionstatechange = () => {
        update(member.id, pc.connectionState);
        if (['failed', 'closed'].includes(pc.connectionState)) {
          pc.close();
          peers.current.delete(member.id);
          setRemoteStreams(old => { const next = { ...old }; delete next[member.id]; return next; });
        }
      };
      pc.ontrack = event => {
        const stream = event.streams?.[0] || entry.stream;
        if (!event.streams?.[0] && !stream.getTracks().some(track => track.id === event.track.id)) stream.addTrack(event.track);
        setRemoteStreams(old => ({ ...old, [member.id]: { stream, name: member.display_name } }));
        if (videoEnabled && !participant.is_host && localVideoRef?.current) {
          const player = localVideoRef.current;
          if (player.srcObject !== stream) {
            player.pause?.();
            player.removeAttribute('src');
            player.srcObject = stream;
            // Muted autoplay is permitted by mobile browsers; the viewer can tap
            // the video once to enable the host video's audio.
            player.muted = true;
            onRemoteMuted?.();
          }
          const startRemotePlayback = () => {
            player.play?.().catch(error => {
              setError(error?.message || 'Tap the video to start the shared stream.');
            });
          };
          event.track.addEventListener?.('unmute', startRemotePlayback, { once: true });
          if (player.readyState >= 1) startRemotePlayback();
          else player.addEventListener('loadedmetadata', startRemotePlayback, { once: true });
        }
      };

      // For local video the host must offer first, with the captured media tracks
      // already in the SDP. Streaming rooms never enter this video path.
      const shouldOffer = videoEnabled ? Boolean(participant.is_host) : String(participant.id) < String(member.id);
      if (hostStreamActive && participant.is_host && captureStream.current) {
        captureStream.current.getTracks().forEach(track => pc.addTrack(track, captureStream.current));
      }
      if (voiceEnabled) {
        if (!localMic.current) {
          try {
            localMic.current = await navigator.mediaDevices.getUserMedia({
              audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
              video: false,
            });
          } catch {
            setError('Microphone permission is needed for experimental P2P voice.');
          }
        }
        localMic.current?.getAudioTracks().forEach(track => pc.addTrack(track, localMic.current));
      }
      if (shouldOffer) {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        await send(member.id, { type: 'offer', description: pc.localDescription });
      }
    };

    const syncPeers = async () => {
      if (hostStreamActive && !ensureCapture()) return;
      for (const member of membersRef.current) {
        if (member.id !== participant.id && !peers.current.has(member.id)) await makePeer(member);
      }
      const live = new Set(membersRef.current.map(member => member.id));
      for (const [id, entry] of peers.current) {
        if (!live.has(id)) {
          entry.pc.close();
          peers.current.delete(id);
          setRemoteStreams(old => { const next = { ...old }; delete next[id]; return next; });
        }
      }
    };

    const poll = async () => {
      if (polling || cancelled) return;
      polling = true;
      try {
        const rows = await rpc('watch_room_p2p_poll', {
          p_code: room.code, p_token: participant.token, p_after: seenSignal.current,
        });
        for (const signal of rows || []) {
          seenSignal.current = Math.max(seenSignal.current, Number(signal.id) || 0);
          const from = signal.from_participant_id;
          const member = membersRef.current.find(item => item.id === from);
          if (!member) continue;
          if (!peers.current.has(from)) await makePeer(member);
          const entry = peers.current.get(from);
          if (!entry) continue;
          const payload = signal.payload || {};
          if (payload.type === 'offer') {
            await entry.pc.setRemoteDescription(payload.description);
            await flushIce(entry);
            const answer = await entry.pc.createAnswer();
            await entry.pc.setLocalDescription(answer);
            await send(from, { type: 'answer', description: entry.pc.localDescription });
          } else if (payload.type === 'answer' && entry.pc.signalingState === 'have-local-offer') {
            await entry.pc.setRemoteDescription(payload.description);
            await flushIce(entry);
          } else if (payload.type === 'ice' && payload.candidate) {
            if (entry.pc.remoteDescription) {
              try { await entry.pc.addIceCandidate(payload.candidate); } catch {}
            } else {
              entry.pendingIce.push(payload.candidate);
            }
          }
        }
      } catch (e) {
        if (!cancelled) setError(e.message || 'P2P signaling is unavailable. Apply the room migration first.');
      } finally {
        polling = false;
      }
    };

    const player = localVideoRef?.current;
    const onPlayerReady = () => {
      if (ensureCapture()) syncPeers().catch(e => setError(e.message || 'Could not start P2P connections.'));
    };
    if (hostStreamActive && participant.is_host && player) {
      player.addEventListener('loadeddata', onPlayerReady);
      player.addEventListener('canplay', onPlayerReady);
      player.addEventListener('playing', onPlayerReady);
      onPlayerReady();
    }
    syncPeers().catch(e => setError(e.message || 'Could not start P2P connections.'));
    const timer = window.setInterval(() => { syncPeers().catch(() => {}); poll(); }, 700);
    poll();

    return () => {
      cancelled = true;
      window.clearInterval(timer);
      player?.removeEventListener('loadeddata', onPlayerReady);
      player?.removeEventListener('canplay', onPlayerReady);
      player?.removeEventListener('playing', onPlayerReady);
      peers.current.forEach(entry => entry.pc.close());
      peers.current.clear();
      captureStream.current = null;
      localMic.current?.getTracks().forEach(track => track.stop());
      localMic.current = null;
      if (videoEnabled && !participant.is_host && localVideoRef?.current?.srcObject) {
        localVideoRef.current.pause?.();
        localVideoRef.current.srcObject = null;
      }
      setRemoteStreams({});
      setConnections({});
    };
  }, [active, room?.code, participant?.id, participant?.token, participant?.is_host, videoEnabled, hostStreamActive, voiceEnabled, rpc, localVideoRef]);

  if (!active) return null;
  const connected = Object.values(connections).filter(value => value === 'connected').length;
  const others = members.filter(member => member.id !== participant.id);
  return <div className="wt-p2p-panel" aria-live="polite">
    <div className="wt-p2p-heading"><span className="wt-p2p-dot"/><strong>{videoEnabled ? 'Direct local video' : 'Experimental peer connection'}</strong><small>{connected}/{others.length} connected</small></div>
    {videoEnabled && participant.is_host && <div className="wt-p2p-start-row">
      <span>{streamStarted ? 'Streaming is active. Keep this tab open.' : videoReady ? (videoPlaying ? 'Video ready. Start sharing when you’re ready.' : 'Press Play on your video before starting the stream.') : 'Load the local video first. The stream cannot start without a playable file.'}</span>
      {streamStarted
        ? <button type="button" onClick={()=>setStreamStarted(false)}>Stop streaming</button>
        : <button type="button" disabled={!videoReady || !videoPlaying} onClick={()=>{setError('');setStreamStarted(true);}}>Start streaming</button>}
    </div>}
    {videoEnabled && !participant.is_host && <p className="wt-p2p-waiting">{Object.keys(remoteStreams).length ? 'Receiving the host’s video.' : 'Waiting for the host to start streaming…'}</p>}
    {error && <p className="wt-p2p-error">{error}</p>}
    <div className="wt-p2p-peers">{others.map(member => <span key={member.id}>{member.display_name}: {connections[member.id] || 'connecting'}</span>)}</div>
    {!videoEnabled && <div className="wt-p2p-remote">{Object.entries(remoteStreams).map(([id, remote]) => <div key={id}><audio autoPlay playsInline ref={node => { if (node && node.srcObject !== remote.stream) node.srcObject = remote.stream; }}/><small>{remote.name}</small></div>)}</div>}
    {videoEnabled && <p>Video is sent directly from the host’s browser. Keep the host tab open. Some networks require a TURN relay.</p>}
    {!videoEnabled && <p>Direct connections use your devices’ upload bandwidth. Some networks require a TURN relay.</p>}
  </div>;
}
