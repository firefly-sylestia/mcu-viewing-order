import React, { useEffect, useRef, useState } from 'react';

const ICE_SERVERS = [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }];

export default function WatchTogetherP2P({ room, participant, members = [], localVideoRef, videoEnabled, voiceEnabled, rpc }) {
  const peers = useRef(new Map());
  const membersRef = useRef(members);
  membersRef.current = members;
  const memberKey = members.map(member => member.id).sort().join('|');
  const localMic = useRef(null);
  const seenSignal = useRef(0);
  const [connections, setConnections] = useState({});
  const [remoteStreams, setRemoteStreams] = useState({});
  const [error, setError] = useState('');
  const active = Boolean(room?.code && participant?.id && (videoEnabled || voiceEnabled));

  useEffect(() => {
    if (!active) return undefined;
    let cancelled = false;
    let polling = false;
    const update = (id, state) => setConnections(old => ({ ...old, [id]: state }));
    const send = async (to, payload) => {
      await rpc('watch_room_p2p_send', { p_code: room.code, p_token: participant.token, p_to: to, p_payload: payload });
    };
    const makePeer = async member => {
      if (cancelled || member.id === participant.id || peers.current.has(member.id)) return;
      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      const entry = { pc, stream: new MediaStream(), makingOffer: false };
      peers.current.set(member.id, entry);
      pc.onicecandidate = event => { if (event.candidate) send(member.id, { type: 'ice', candidate: event.candidate.toJSON() }).catch(() => {}); };
      pc.onconnectionstatechange = () => {
        update(member.id, pc.connectionState);
        if (['failed','closed'].includes(pc.connectionState)) {
          pc.close(); peers.current.delete(member.id);
          setRemoteStreams(old => { const next={...old}; delete next[member.id]; return next; });
        }
      };
      pc.ontrack = event => {
        const stream = event.streams?.[0] || entry.stream;
        if (!event.streams?.[0]) entry.stream.addTrack(event.track);
        setRemoteStreams(old => ({ ...old, [member.id]: { stream, name: member.display_name } }));
      };
      if (videoEnabled && participant.is_host) {
        const video = localVideoRef?.current;
        const capture = video?.captureStream || video?.mozCaptureStream;
        if (capture) {
          const media = capture.call(video);
          media.getTracks().forEach(track => pc.addTrack(track, media));
        } else {
          setError('This browser cannot capture the local video stream. Try a Chromium-based browser.');
        }
      }
      if (voiceEnabled) {
        if (!localMic.current) {
          try { localMic.current = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }, video: false }); }
          catch { setError('Microphone permission is needed for experimental P2P voice.'); }
        }
        localMic.current?.getAudioTracks().forEach(track => pc.addTrack(track, localMic.current));
      }
      if (String(participant.id) < String(member.id)) {
        entry.makingOffer = true;
        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          await send(member.id, { type: 'offer', description: pc.localDescription });
        } finally { entry.makingOffer = false; }
      }
    };
    const syncPeers = async () => {
      for (const member of membersRef.current) {
        if (member.id !== participant.id && !peers.current.has(member.id)) await makePeer(member);
      }
      const live = new Set(membersRef.current.map(member => member.id));
      for (const [id, entry] of peers.current) if (!live.has(id)) { entry.pc.close(); peers.current.delete(id); }
    };
    const poll = async () => {
      if (polling || cancelled) return;
      polling = true;
      try {
        const rows = await rpc('watch_room_p2p_poll', { p_code: room.code, p_token: participant.token, p_after: seenSignal.current });
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
            const answer = await entry.pc.createAnswer();
            await entry.pc.setLocalDescription(answer);
            await send(from, { type: 'answer', description: entry.pc.localDescription });
          } else if (payload.type === 'answer' && entry.pc.signalingState === 'have-local-offer') {
            await entry.pc.setRemoteDescription(payload.description);
          } else if (payload.type === 'ice' && payload.candidate) {
            try { await entry.pc.addIceCandidate(payload.candidate); } catch {}
          }
        }
      } catch (e) { if (!cancelled) setError(e.message || 'P2P signaling is unavailable. Apply the room migration first.'); }
      finally { polling = false; }
    };
    syncPeers().catch(e => setError(e.message || 'Could not start P2P connections.'));
    const timer = window.setInterval(() => { syncPeers().catch(() => {}); poll(); }, 700);
    poll();
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      peers.current.forEach(entry => entry.pc.close());
      peers.current.clear();
      localMic.current?.getTracks().forEach(track => track.stop());
      localMic.current = null;
      setRemoteStreams({});
      setConnections({});
    };
  }, [active, room?.code, participant?.id, participant?.token, participant?.is_host, memberKey, videoEnabled, voiceEnabled, rpc, localVideoRef]);

  if (!active) return null;
  const states = Object.values(connections);
  return <div className="wt-p2p-panel" aria-live="polite">
    <div className="wt-p2p-heading"><span className="wt-p2p-dot"/><strong>Experimental peer connection</strong><small>{states.filter(value => value === 'connected').length}/{members.length - 1} connected</small></div>
    {error && <p className="wt-p2p-error">{error}</p>}
    <div className="wt-p2p-peers">{members.filter(member => member.id !== participant.id).map(member => <span key={member.id}>{member.display_name}: {connections[member.id] || 'connecting'}</span>)}</div>
    <div className="wt-p2p-remote">{Object.entries(remoteStreams).map(([id, remote]) => <div key={id}><video autoPlay playsInline ref={node => { if (node && node.srcObject !== remote.stream) node.srcObject = remote.stream; }} /><small>{remote.name}</small><audio autoPlay playsInline ref={node => { if (node && node.srcObject !== remote.stream) node.srcObject = remote.stream; }}/></div>)}</div>
    <p>Direct connections use your devices’ upload bandwidth. TURN relay fallback is not configured yet.</p>
  </div>;
}
