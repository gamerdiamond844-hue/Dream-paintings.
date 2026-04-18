import { useRef, useState, useCallback, useEffect } from 'react';
import toast from 'react-hot-toast';

// ── ICE / TURN servers ────────────────────────────────────────────────────────
// Multiple STUN + reliable free TURN servers for NAT traversal
const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun.cloudflare.com:3478' },
    // Metered.ca free TURN (most reliable free option)
    {
      urls:       'turn:openrelay.metered.ca:80',
      username:   'openrelayproject',
      credential: 'openrelayproject',
    },
    {
      urls:       'turn:openrelay.metered.ca:443',
      username:   'openrelayproject',
      credential: 'openrelayproject',
    },
    {
      urls:       'turns:openrelay.metered.ca:443',
      username:   'openrelayproject',
      credential: 'openrelayproject',
    },
  ],
  iceCandidatePoolSize: 10,
};

export const CALL_STATE = {
  IDLE:         'idle',
  CALLING:      'calling',
  RINGING:      'ringing',
  CONNECTING:   'connecting',
  CONNECTED:    'connected',
  RECONNECTING: 'reconnecting',
};

export const NET_QUALITY = {
  UNKNOWN: 'unknown',
  GOOD:    'good',
  FAIR:    'fair',
  POOR:    'poor',
};

export function useCall({ socket, currentUser }) {
  const [callState,    setCallState]    = useState(CALL_STATE.IDLE);
  const [callType,     setCallType]     = useState('voice');
  const [remoteUser,   setRemoteUser]   = useState(null);
  const [isMuted,      setIsMuted]      = useState(false);
  const [isCamOff,     setIsCamOff]     = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [netQuality,   setNetQuality]   = useState(NET_QUALITY.UNKNOWN);
  const [permError,    setPermError]    = useState(null);
  // Track socket ID so useEffect re-runs when socket reconnects
  const [socketId,     setSocketId]     = useState(null);

  // DOM refs
  const localVideoRef  = useRef(null);
  const remoteVideoRef = useRef(null);
  const remoteAudioRef = useRef(null);

  // Internal refs
  const pcRef          = useRef(null);
  const localStreamRef = useRef(null);
  const remoteStreamRef= useRef(null);
  const pendingOffer   = useRef(null);
  const durationTimer  = useRef(null);
  const qualityTimer   = useRef(null);
  const callStateRef   = useRef(CALL_STATE.IDLE);
  const callTypeRef    = useRef('voice');
  const remoteUserRef  = useRef(null);
  const facingMode     = useRef('user');
  const iceBuf         = useRef([]);
  const isOfferer      = useRef(false);
  const timerStarted   = useRef(false);
  // Store targetId so doIceRestart can access it without stale closure
  const targetIdRef    = useRef(null);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const setCS = useCallback((s) => {
    callStateRef.current = s;
    setCallState(s);
  }, []);

  const fmt = useCallback((s) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`,
  []);

  const startTimer = useCallback(() => {
    if (timerStarted.current) return;
    timerStarted.current = true;
    clearInterval(durationTimer.current);
    setCallDuration(0);
    durationTimer.current = setInterval(() => setCallDuration(s => s + 1), 1000);
  }, []);

  // ── Attach remote stream ──────────────────────────────────────────────────
  const attachRemote = useCallback((stream) => {
    if (!stream) return;
    remoteStreamRef.current = stream;

    console.log('[RTC] attachRemote tracks:',
      stream.getTracks().map(t => `${t.kind} enabled=${t.enabled} muted=${t.muted} readyState=${t.readyState}`));

    // Attach audio — use ref to bypass React's muted prop bug
    const audioEl = remoteAudioRef.current;
    if (audioEl) {
      audioEl.srcObject = stream;
      audioEl.muted     = false;  // set via DOM ref, not JSX prop
      audioEl.volume    = 1.0;
      audioEl.play().catch(e => console.warn('[RTC] audio play:', e.message));
    }

    // Attach video
    const videoEl = remoteVideoRef.current;
    if (videoEl) {
      videoEl.srcObject = stream;
      videoEl.play().catch(() => {});
    }
  }, []);

  // ── Flush buffered ICE candidates ─────────────────────────────────────────
  const flushIce = useCallback(async () => {
    const pc = pcRef.current;
    if (!pc?.remoteDescription) return;
    const buf = iceBuf.current.splice(0);
    for (const c of buf) {
      try { await pc.addIceCandidate(new RTCIceCandidate(c)); }
      catch (e) { console.warn('[RTC] flush ICE:', e.message); }
    }
    if (buf.length) console.log('[RTC] flushed', buf.length, 'buffered ICE candidates');
  }, []);

  // ── Cleanup ───────────────────────────────────────────────────────────────
  const cleanup = useCallback(() => {
    clearInterval(durationTimer.current);
    clearInterval(qualityTimer.current);
    timerStarted.current  = false;
    targetIdRef.current   = null;

    localStreamRef.current?.getTracks().forEach(t => t.stop());
    localStreamRef.current  = null;
    remoteStreamRef.current = null;
    iceBuf.current          = [];
    isOfferer.current       = false;

    if (pcRef.current) { pcRef.current.close(); pcRef.current = null; }

    // Clear media elements
    [localVideoRef, remoteVideoRef, remoteAudioRef].forEach(ref => {
      if (ref.current) ref.current.srcObject = null;
    });

    pendingOffer.current  = null;
    remoteUserRef.current = null;

    setCS(CALL_STATE.IDLE);
    setRemoteUser(null);
    setIsMuted(false);
    setIsCamOff(false);
    setCallDuration(0);
    setNetQuality(NET_QUALITY.UNKNOWN);
    setPermError(null);
  }, [setCS]);

  // ── Network quality ───────────────────────────────────────────────────────
  const startQuality = useCallback(() => {
    clearInterval(qualityTimer.current);
    qualityTimer.current = setInterval(async () => {
      const pc = pcRef.current;
      if (!pc) return;
      try {
        const stats = await pc.getStats();
        let rtt = null, lost = 0, sent = 0;
        stats.forEach(r => {
          if (r.type === 'remote-inbound-rtp' && r.kind === 'audio') {
            if (r.roundTripTime != null) rtt = r.roundTripTime;
            if (r.packetsLost   != null) lost += r.packetsLost;
          }
          if (r.type === 'outbound-rtp' && r.packetsSent != null) sent += r.packetsSent;
        });
        if (rtt === null) return;
        const loss = sent > 0 ? lost / sent : 0;
        if      (rtt < 0.15 && loss < 0.02) setNetQuality(NET_QUALITY.GOOD);
        else if (rtt < 0.40 && loss < 0.08) setNetQuality(NET_QUALITY.FAIR);
        else                                 setNetQuality(NET_QUALITY.POOR);
      } catch { /* not ready */ }
    }, 3000);
  }, []);

  // ── ICE restart — uses targetIdRef to avoid stale closure ────────────────
  const doIceRestart = useCallback(async () => {
    const pc  = pcRef.current;
    const tid = targetIdRef.current;
    if (!pc || !socket?.current || !tid) return;
    console.log('[RTC] ICE restart for target:', tid);
    try {
      const offer = await pc.createOffer({ iceRestart: true });
      await pc.setLocalDescription(offer);
      socket.current.emit('call_user', {
        targetUserId: tid,
        offer,
        callType:     callTypeRef.current,
        callerName:   currentUser?.name,
        callerAvatar: currentUser?.avatar_url,
        isRestart:    true,
      });
    } catch (e) {
      console.error('[RTC] ICE restart failed:', e);
      cleanup();
    }
  }, [socket, currentUser, cleanup]);

  // ── Get user media ────────────────────────────────────────────────────────
  const getMedia = useCallback(async (type) => {
    setPermError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        video: type === 'video'
          ? { facingMode: facingMode.current, width: { ideal: 1280 }, height: { ideal: 720 } }
          : false,
      });

      const audio = stream.getAudioTracks();
      if (!audio.length) {
        toast.error('No microphone detected.');
        stream.getTracks().forEach(t => t.stop());
        return null;
      }
      // Ensure all audio tracks are enabled
      audio.forEach(t => { t.enabled = true; });
      console.log('[RTC] local tracks:',
        stream.getTracks().map(t => `${t.kind} enabled=${t.enabled} label=${t.label}`));
      return stream;
    } catch (err) {
      const denied   = ['NotAllowedError', 'PermissionDeniedError'].includes(err.name);
      const noDevice = ['NotFoundError', 'DevicesNotFoundError'].includes(err.name);
      const inUse    = ['NotReadableError', 'TrackStartError'].includes(err.name);

      if (denied)   { setPermError(type === 'video' ? 'camera' : 'mic'); toast.error('Permission denied — allow mic/camera in browser settings.'); }
      else if (noDevice) toast.error('No microphone/camera found.');
      else if (inUse)    toast.error('Mic/camera in use by another app.');
      else               toast.error(`Media error: ${err.message}`);

      if (type === 'video' && !denied && !noDevice) {
        try {
          toast('Falling back to voice-only.', { icon: '🎙️' });
          return await navigator.mediaDevices.getUserMedia({
            audio: { echoCancellation: true, noiseSuppression: true },
            video: false,
          });
        } catch { return null; }
      }
      return null;
    }
  }, []);

  const attachLocal = useCallback((stream) => {
    if (localVideoRef.current && stream) {
      localVideoRef.current.srcObject = stream;
      localVideoRef.current.muted     = true;
    }
  }, []);

  // ── Build RTCPeerConnection ───────────────────────────────────────────────
  const createPC = useCallback((targetId) => {
    // Store targetId in ref so doIceRestart can access it without stale closure
    targetIdRef.current = targetId;

    const pc = new RTCPeerConnection(ICE_SERVERS);

    pc.onicecandidate = ({ candidate }) => {
      if (candidate && socket?.current) {
        socket.current.emit('ice_candidate', { targetUserId: targetId, candidate });
      }
    };

    pc.onicecandidateerror = (e) =>
      console.warn('[RTC] ICE candidate error:', e.errorCode, e.errorText);

    pc.ontrack = (ev) => {
      console.log('[RTC] ontrack:', ev.track.kind,
        'enabled:', ev.track.enabled, 'muted:', ev.track.muted,
        'streams:', ev.streams.length);

      // Force track enabled
      ev.track.enabled = true;

      // Handle initially-muted tracks (Safari, Firefox)
      ev.track.onunmute = () => {
        console.log('[RTC] track unmuted:', ev.track.kind);
        if (remoteStreamRef.current) attachRemote(remoteStreamRef.current);
      };

      if (ev.streams?.[0]) {
        attachRemote(ev.streams[0]);
      } else {
        // Build stream manually (some browsers don't provide streams[])
        const s = remoteStreamRef.current ?? new MediaStream();
        if (!s.getTracks().find(t => t.id === ev.track.id)) {
          s.addTrack(ev.track);
        }
        attachRemote(s);
      }
    };

    pc.onconnectionstatechange = () => {
      const s = pc.connectionState;
      console.log('[RTC] connectionState:', s);

      if (s === 'connected') {
        setCS(CALL_STATE.CONNECTED);
        startTimer();
        startQuality();
        // Re-attach stream now that UI overlays are rendered
        if (remoteStreamRef.current) {
          setTimeout(() => attachRemote(remoteStreamRef.current), 100);
        }
      } else if (s === 'connecting') {
        setCS(CALL_STATE.CONNECTING);
      } else if (s === 'disconnected') {
        setCS(CALL_STATE.RECONNECTING);
        toast('Connection lost. Reconnecting…', { icon: '🔄', id: 'rtc-reconnect' });
        if (isOfferer.current) setTimeout(() => doIceRestart(), 2000);
      } else if (s === 'failed') {
        toast.error('Call connection failed.');
        cleanup();
      } else if (s === 'closed') {
        cleanup();
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log('[RTC] iceConnectionState:', pc.iceConnectionState);
      if (pc.iceConnectionState === 'failed' && isOfferer.current) {
        doIceRestart();
      }
    };

    return pc;
  }, [socket, setCS, startTimer, startQuality, attachRemote, doIceRestart, cleanup]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Start outgoing call ───────────────────────────────────────────────────
  const startCall = useCallback(async (targetUser, type = 'voice') => {
    if (callStateRef.current !== CALL_STATE.IDLE) return;
    if (!socket?.current?.connected) {
      toast.error('Not connected. Please refresh the page.');
      return;
    }

    const stream = await getMedia(type);
    if (!stream) return;

    localStreamRef.current = stream;
    attachLocal(stream);
    isOfferer.current = true;

    const pc = createPC(targetUser.id);
    pcRef.current = pc;

    stream.getTracks().forEach(t => {
      pc.addTrack(t, stream);
      console.log('[RTC] caller added track:', t.kind, 'enabled:', t.enabled);
    });

    const offer = await pc.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: type === 'video',
    });
    await pc.setLocalDescription(offer);

    callTypeRef.current   = type;
    remoteUserRef.current = targetUser;
    setCallType(type);
    setRemoteUser(targetUser);
    setCS(CALL_STATE.CALLING);

    socket.current.emit('call_user', {
      targetUserId: targetUser.id,
      offer,
      callType:     type,
      callerName:   currentUser?.name,
      callerAvatar: currentUser?.avatar_url,
    });
  }, [socket, currentUser, getMedia, attachLocal, createPC, setCS]);

  // ── Accept incoming call ──────────────────────────────────────────────────
  const acceptCall = useCallback(async () => {
    const { callerId, callerName, callerAvatar, offer, callType: inType } =
      pendingOffer.current || {};
    if (!offer) return;

    const stream = await getMedia(inType);
    if (!stream) return;

    localStreamRef.current = stream;
    attachLocal(stream);
    isOfferer.current = false;

    const pc = createPC(callerId);
    pcRef.current = pc;

    // Add tracks BEFORE setRemoteDescription — critical for bi-directional audio
    stream.getTracks().forEach(t => {
      pc.addTrack(t, stream);
      console.log('[RTC] callee added track:', t.kind, 'enabled:', t.enabled);
    });

    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    await flushIce();

    const answer = await pc.createAnswer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: inType === 'video',
    });
    await pc.setLocalDescription(answer);

    callTypeRef.current   = inType;
    remoteUserRef.current = { id: callerId, name: callerName, avatar: callerAvatar };
    setCallType(inType);
    setRemoteUser({ id: callerId, name: callerName, avatar: callerAvatar });
    setCS(CALL_STATE.CONNECTING);

    socket.current?.emit('call_answer', { targetUserId: callerId, answer });
  }, [getMedia, attachLocal, createPC, flushIce, socket, setCS]);

  // ── Reject / End ──────────────────────────────────────────────────────────
  const rejectCall = useCallback(() => {
    const id = pendingOffer.current?.callerId;
    if (id) socket.current?.emit('call_reject', { targetUserId: id });
    cleanup();
  }, [socket, cleanup]);

  const endCall = useCallback((targetId, emit = true) => {
    const tid = targetId ?? remoteUserRef.current?.id;
    if (emit && tid) socket.current?.emit('call_end', { targetUserId: tid });
    cleanup();
  }, [socket, cleanup]);

  // ── Mute / Camera / Switch ────────────────────────────────────────────────
  const toggleMute = useCallback(() => {
    const tracks = localStreamRef.current?.getAudioTracks() ?? [];
    if (!tracks.length) { toast.error('No audio track found'); return; }
    const next = !tracks[0].enabled;
    tracks.forEach(t => { t.enabled = next; });
    setIsMuted(!next);
    console.log('[RTC] mic', next ? 'unmuted' : 'muted');
  }, []);

  const toggleCamera = useCallback(() => {
    const tracks = localStreamRef.current?.getVideoTracks() ?? [];
    if (!tracks.length) return;
    const next = !tracks[0].enabled;
    tracks.forEach(t => { t.enabled = next; });
    setIsCamOff(!next);
  }, []);

  const switchCamera = useCallback(async () => {
    if (!pcRef.current || !localStreamRef.current) return;
    facingMode.current = facingMode.current === 'user' ? 'environment' : 'user';
    try {
      const ns  = await navigator.mediaDevices.getUserMedia({
        audio: false, video: { facingMode: facingMode.current },
      });
      const nt  = ns.getVideoTracks()[0];
      const snd = pcRef.current.getSenders().find(s => s.track?.kind === 'video');
      if (snd) await snd.replaceTrack(nt);
      const ot = localStreamRef.current.getVideoTracks()[0];
      if (ot) { ot.stop(); localStreamRef.current.removeTrack(ot); }
      localStreamRef.current.addTrack(nt);
      attachLocal(localStreamRef.current);
    } catch { toast.error('Could not switch camera'); }
  }, [attachLocal]);

  // ── Socket signaling listeners ────────────────────────────────────────────
  // socketId state ensures this re-runs when socket reconnects
  useEffect(() => {
    const sock = socket?.current;
    if (!sock) return;

    // Track socket ID for reconnect detection
    const handleConnect = () => setSocketId(sock.id);
    sock.on('connect', handleConnect);
    if (sock.connected) setSocketId(sock.id);

    const onIncoming = ({ callerId, callerName, callerAvatar, callType: inType, offer, isRestart }) => {
      // ICE restart — renegotiate without showing incoming UI
      if (isRestart && pcRef.current &&
          [CALL_STATE.CONNECTED, CALL_STATE.RECONNECTING].includes(callStateRef.current)) {
        pcRef.current
          .setRemoteDescription(new RTCSessionDescription(offer))
          .then(() => pcRef.current.createAnswer())
          .then(ans => {
            pcRef.current.setLocalDescription(ans);
            sock.emit('call_answer', { targetUserId: callerId, answer: ans });
          })
          .catch(e => console.error('[RTC] restart answer err:', e));
        return;
      }

      if (callStateRef.current !== CALL_STATE.IDLE) {
        sock.emit('call_reject', { targetUserId: callerId });
        return;
      }

      pendingOffer.current  = { callerId, callerName, callerAvatar, callType: inType, offer };
      callTypeRef.current   = inType || 'voice';
      remoteUserRef.current = { id: callerId, name: callerName, avatar: callerAvatar };
      setCallType(inType || 'voice');
      setRemoteUser({ id: callerId, name: callerName, avatar: callerAvatar });
      setCS(CALL_STATE.RINGING);
    };

    const onAnswered = async ({ answer }) => {
      const pc = pcRef.current;
      if (!pc) return;
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
        await flushIce();
        setCS(CALL_STATE.CONNECTING);
        console.log('[RTC] answer set. senders:',
          pc.getSenders().map(s => `${s.track?.kind} enabled=${s.track?.enabled}`));
      } catch (e) {
        console.error('[RTC] setRemoteDesc(answer) failed:', e);
        toast.error('Call setup failed. Please try again.');
        cleanup();
      }
    };

    const onRejected = () => { toast('Call declined.', { icon: '📵' }); cleanup(); };

    const onIce = async ({ candidate }) => {
      if (!candidate) return;
      const pc = pcRef.current;
      if (!pc) return;
      if (!pc.remoteDescription) {
        iceBuf.current.push(candidate);
        return;
      }
      try { await pc.addIceCandidate(new RTCIceCandidate(candidate)); }
      catch (e) { console.warn('[RTC] addIceCandidate:', e.message); }
    };

    const onEnded = () => { toast('Call ended.', { icon: '📞' }); cleanup(); };

    sock.on('incoming_call', onIncoming);
    sock.on('call_answered', onAnswered);
    sock.on('call_rejected', onRejected);
    sock.on('ice_candidate', onIce);
    sock.on('call_ended',    onEnded);

    return () => {
      sock.off('connect',      handleConnect);
      sock.off('incoming_call', onIncoming);
      sock.off('call_answered', onAnswered);
      sock.off('call_rejected', onRejected);
      sock.off('ice_candidate', onIce);
      sock.off('call_ended',    onEnded);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket?.current, socketId]);

  useEffect(() => () => cleanup(), []); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    callState, callType, remoteUser,
    isMuted, isCamOff, callDuration, fmt,
    netQuality, permError,
    localVideoRef, remoteVideoRef, remoteAudioRef, remoteStreamRef,
    startCall, acceptCall, rejectCall, endCall,
    toggleMute, toggleCamera, switchCamera,
  };
}
