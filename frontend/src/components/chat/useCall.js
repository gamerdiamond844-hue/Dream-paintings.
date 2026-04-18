import { useRef, useState, useCallback, useEffect } from 'react';
import toast from 'react-hot-toast';

// ── ICE / TURN servers ────────────────────────────────────────────────────────
const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
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
      urls:       'turn:openrelay.metered.ca:443?transport=tcp',
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
  // ── React state (drives UI) ───────────────────────────────────────────────
  const [callState,    setCallState]    = useState(CALL_STATE.IDLE);
  const [callType,     setCallType]     = useState('voice');
  const [remoteUser,   setRemoteUser]   = useState(null);
  const [isMuted,      setIsMuted]      = useState(false);
  const [isCamOff,     setIsCamOff]     = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [netQuality,   setNetQuality]   = useState(NET_QUALITY.UNKNOWN);
  const [permError,    setPermError]    = useState(null);

  // ── DOM refs ──────────────────────────────────────────────────────────────
  const localVideoRef  = useRef(null);
  const remoteVideoRef = useRef(null);
  const remoteAudioRef = useRef(null);

  // ── Internal refs (never cause re-renders) ────────────────────────────────
  const pcRef              = useRef(null);
  const localStreamRef     = useRef(null);
  const remoteStreamRef    = useRef(null);
  const pendingOfferRef    = useRef(null);
  const durationTimer      = useRef(null);
  const qualityTimer       = useRef(null);
  const callStateRef       = useRef(CALL_STATE.IDLE);
  const callTypeRef        = useRef('voice');
  const remoteUserRef      = useRef(null);
  const facingMode         = useRef('user');
  const iceBuf             = useRef([]);   // buffer candidates before remoteDesc
  const isOfferer          = useRef(false);
  const timerStarted       = useRef(false);

  // ── Sync state + ref together ─────────────────────────────────────────────
  const setCS = useCallback((s) => {
    callStateRef.current = s;
    setCallState(s);
  }, []);

  // ── Duration timer ────────────────────────────────────────────────────────
  const startTimer = useCallback(() => {
    if (timerStarted.current) return;
    timerStarted.current = true;
    clearInterval(durationTimer.current);
    setCallDuration(0);
    durationTimer.current = setInterval(
      () => setCallDuration(s => s + 1), 1000
    );
  }, []);

  // ── Format seconds → MM:SS ────────────────────────────────────────────────
  const fmt = useCallback((s) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`,
  []);

  // ── Attach remote stream to every output element ──────────────────────────
  const attachRemote = useCallback((stream) => {
    if (!stream) return;
    remoteStreamRef.current = stream;
    const tracks = stream.getTracks();
    console.log('[RTC] remote stream tracks:',
      tracks.map(t => `${t.kind} enabled=${t.enabled} muted=${t.muted}`));

    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = stream;
      remoteVideoRef.current.play().catch(() => {});
    }
    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = stream;
      remoteAudioRef.current.play().catch(() => {});
    }
  }, []);

  // ── Flush buffered ICE candidates ─────────────────────────────────────────
  const flushIce = useCallback(async () => {
    const pc = pcRef.current;
    if (!pc?.remoteDescription) return;
    const buf = iceBuf.current.splice(0);
    for (const c of buf) {
      try { await pc.addIceCandidate(new RTCIceCandidate(c)); }
      catch (e) { console.warn('[RTC] flush ICE err:', e.message); }
    }
  }, []);

  // ── Full cleanup ──────────────────────────────────────────────────────────
  const cleanup = useCallback(() => {
    clearInterval(durationTimer.current);
    clearInterval(qualityTimer.current);
    timerStarted.current = false;

    localStreamRef.current?.getTracks().forEach(t => t.stop());
    localStreamRef.current  = null;
    remoteStreamRef.current = null;
    iceBuf.current          = [];
    isOfferer.current       = false;

    if (pcRef.current) { pcRef.current.close(); pcRef.current = null; }

    if (localVideoRef.current)  localVideoRef.current.srcObject  = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    if (remoteAudioRef.current) remoteAudioRef.current.srcObject = null;

    pendingOfferRef.current = null;
    remoteUserRef.current   = null;

    setCS(CALL_STATE.IDLE);
    setRemoteUser(null);
    setIsMuted(false);
    setIsCamOff(false);
    setCallDuration(0);
    setNetQuality(NET_QUALITY.UNKNOWN);
    setPermError(null);
  }, [setCS]);

  // ── Network quality polling ───────────────────────────────────────────────
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
      } catch { /* not ready yet */ }
    }, 3000);
  }, []);

  // ── Get user media ────────────────────────────────────────────────────────
  const getMedia = useCallback(async (type) => {
    setPermError(null);
    const constraints = {
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl:  true,
      },
      video: type === 'video'
        ? { facingMode: facingMode.current, width: { ideal: 1280 }, height: { ideal: 720 } }
        : false,
    };

    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      const audio  = stream.getAudioTracks();
      if (!audio.length) {
        toast.error('No microphone detected.');
        stream.getTracks().forEach(t => t.stop());
        return null;
      }
      audio.forEach(t => { t.enabled = true; });
      console.log('[RTC] local tracks:',
        stream.getTracks().map(t => `${t.kind} enabled=${t.enabled}`));
      return stream;
    } catch (err) {
      const denied   = ['NotAllowedError','PermissionDeniedError'].includes(err.name);
      const noDevice = ['NotFoundError','DevicesNotFoundError'].includes(err.name);
      const inUse    = ['NotReadableError','TrackStartError'].includes(err.name);

      if (denied) {
        setPermError(type === 'video' ? 'camera' : 'mic');
        toast.error('Permission denied — allow mic/camera in browser settings.');
      } else if (noDevice) {
        toast.error('No microphone/camera found.');
      } else if (inUse) {
        toast.error('Mic/camera in use by another app.');
      } else {
        toast.error(`Media error: ${err.message}`);
      }

      // Fallback to audio-only for video calls
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

  // ── Attach local stream to local video element ────────────────────────────
  const attachLocal = useCallback((stream) => {
    if (localVideoRef.current && stream) {
      localVideoRef.current.srcObject = stream;
      localVideoRef.current.muted     = true;
    }
  }, []);

  // ── Build RTCPeerConnection ───────────────────────────────────────────────
  // NOTE: cleanup, attachRemote, startQuality, flushIce, startTimer, setCS
  //       are all stable useCallback refs — safe to use inside createPC
  const createPC = useCallback((targetId) => {
    const pc = new RTCPeerConnection(ICE_SERVERS);

    pc.onicecandidate = ({ candidate }) => {
      if (candidate && socket?.current) {
        socket.current.emit('ice_candidate', { targetUserId: targetId, candidate });
      }
    };

    pc.onicecandidateerror = (e) =>
      console.warn('[RTC] ICE error:', e.errorCode, e.errorText);

    pc.ontrack = (ev) => {
      console.log('[RTC] ontrack:', ev.track.kind, 'streams:', ev.streams.length);
      if (ev.streams?.[0]) {
        attachRemote(ev.streams[0]);
      } else {
        // Build stream manually when streams[] is empty (some browsers)
        const s = remoteStreamRef.current ?? new MediaStream();
        s.addTrack(ev.track);
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
      } else if (s === 'connecting') {
        setCS(CALL_STATE.CONNECTING);
      } else if (s === 'disconnected') {
        setCS(CALL_STATE.RECONNECTING);
        toast('Reconnecting…', { icon: '🔄', id: 'rtc-reconnect' });
        if (isOfferer.current) {
          setTimeout(() => doIceRestart(targetId), 2000);
        }
      } else if (s === 'failed') {
        toast.error('Call failed. Please try again.');
        cleanup();
      } else if (s === 'closed') {
        cleanup();
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log('[RTC] iceState:', pc.iceConnectionState);
      if (pc.iceConnectionState === 'failed' && isOfferer.current) {
        doIceRestart(targetId);
      }
    };

    return pc;
  }, [socket, setCS, startTimer, startQuality, attachRemote, cleanup]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── ICE restart ───────────────────────────────────────────────────────────
  const doIceRestart = useCallback(async (targetId) => {
    const pc = pcRef.current;
    if (!pc || !socket?.current) return;
    console.log('[RTC] ICE restart…');
    try {
      const offer = await pc.createOffer({ iceRestart: true });
      await pc.setLocalDescription(offer);
      socket.current.emit('call_user', {
        targetUserId: targetId ?? remoteUserRef.current?.id,
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

  // ── Start outgoing call ───────────────────────────────────────────────────
  const startCall = useCallback(async (targetUser, type = 'voice') => {
    if (callStateRef.current !== CALL_STATE.IDLE) return;
    if (!socket?.current?.connected) {
      toast.error('Not connected to server. Please refresh.');
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
      console.log('[RTC] added local track:', t.kind);
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
      pendingOfferRef.current || {};
    if (!offer) return;

    const stream = await getMedia(inType);
    if (!stream) return;

    localStreamRef.current = stream;
    attachLocal(stream);
    isOfferer.current = false;

    const pc = createPC(callerId);
    pcRef.current = pc;

    stream.getTracks().forEach(t => {
      pc.addTrack(t, stream);
      console.log('[RTC] added local track (callee):', t.kind);
    });

    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    await flushIce();

    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    callTypeRef.current   = inType;
    remoteUserRef.current = { id: callerId, name: callerName, avatar: callerAvatar };
    setCallType(inType);
    setRemoteUser({ id: callerId, name: callerName, avatar: callerAvatar });
    setCS(CALL_STATE.CONNECTING);

    socket.current?.emit('call_answer', { targetUserId: callerId, answer });
  }, [getMedia, attachLocal, createPC, flushIce, socket, setCS]);

  // ── Reject call ───────────────────────────────────────────────────────────
  const rejectCall = useCallback(() => {
    const id = pendingOfferRef.current?.callerId;
    if (id) socket.current?.emit('call_reject', { targetUserId: id });
    cleanup();
  }, [socket, cleanup]);

  // ── End call ──────────────────────────────────────────────────────────────
  const endCall = useCallback((targetId, emit = true) => {
    const tid = targetId ?? remoteUserRef.current?.id;
    if (emit && tid) socket.current?.emit('call_end', { targetUserId: tid });
    cleanup();
  }, [socket, cleanup]);

  // ── Mute toggle ───────────────────────────────────────────────────────────
  const toggleMute = useCallback(() => {
    const tracks = localStreamRef.current?.getAudioTracks() ?? [];
    if (!tracks.length) { toast.error('No audio track'); return; }
    const next = !tracks[0].enabled;
    tracks.forEach(t => { t.enabled = next; });
    setIsMuted(!next);
  }, []);

  // ── Camera toggle ─────────────────────────────────────────────────────────
  const toggleCamera = useCallback(() => {
    const tracks = localStreamRef.current?.getVideoTracks() ?? [];
    if (!tracks.length) return;
    const next = !tracks[0].enabled;
    tracks.forEach(t => { t.enabled = next; });
    setIsCamOff(!next);
  }, []);

  // ── Switch camera ─────────────────────────────────────────────────────────
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
  // Re-attach whenever the socket instance changes (reconnect, login, etc.)
  useEffect(() => {
    const sock = socket?.current;
    if (!sock) return;

    const onIncoming = ({ callerId, callerName, callerAvatar, callType: inType, offer, isRestart }) => {
      // ICE restart renegotiation — don't show incoming UI
      if (isRestart && pcRef.current &&
          (callStateRef.current === CALL_STATE.CONNECTED ||
           callStateRef.current === CALL_STATE.RECONNECTING)) {
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

      pendingOfferRef.current = { callerId, callerName, callerAvatar, callType: inType, offer };
      callTypeRef.current     = inType || 'voice';
      remoteUserRef.current   = { id: callerId, name: callerName, avatar: callerAvatar };
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
          pc.getSenders().map(s => s.track?.kind));
      } catch (e) {
        console.error('[RTC] setRemoteDesc(answer) failed:', e);
        toast.error('Call setup failed.');
        cleanup();
      }
    };

    const onRejected = () => {
      toast('Call declined.', { icon: '📵' });
      cleanup();
    };

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

    const onEnded = () => {
      toast('Call ended.', { icon: '📞' });
      cleanup();
    };

    sock.on('incoming_call', onIncoming);
    sock.on('call_answered', onAnswered);
    sock.on('call_rejected', onRejected);
    sock.on('ice_candidate', onIce);
    sock.on('call_ended',    onEnded);

    return () => {
      sock.off('incoming_call', onIncoming);
      sock.off('call_answered', onAnswered);
      sock.off('call_rejected', onRejected);
      sock.off('ice_candidate', onIce);
      sock.off('call_ended',    onEnded);
    };
  // Re-run when socket.current changes (new socket instance after reconnect)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket?.current]);

  // Cleanup on unmount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => () => cleanup(), []);

  return {
    callState, callType, remoteUser,
    isMuted, isCamOff, callDuration, fmt,
    netQuality, permError,
    localVideoRef, remoteVideoRef, remoteAudioRef, remoteStreamRef,
    startCall, acceptCall, rejectCall, endCall,
    toggleMute, toggleCamera, switchCamera,
  };
}
