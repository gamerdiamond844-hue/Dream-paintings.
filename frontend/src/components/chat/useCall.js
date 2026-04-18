import { useRef, useState, useCallback, useEffect } from 'react';
import toast from 'react-hot-toast';

// ── ICE servers ───────────────────────────────────────────────────────────────
// Free STUN + public TURN via Open Relay (metered.ca free tier)
// For production replace with your own TURN credentials
const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    // Public TURN — works for most NAT/firewall scenarios
    {
      urls: 'turn:openrelay.metered.ca:80',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
    {
      urls: 'turn:openrelay.metered.ca:443',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
    {
      urls: 'turn:openrelay.metered.ca:443?transport=tcp',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
  ],
  iceCandidatePoolSize: 10,
};

export const CALL_STATE = {
  IDLE:         'idle',
  CALLING:      'calling',       // outgoing — waiting for answer
  RINGING:      'ringing',       // incoming — waiting for accept/reject
  CONNECTING:   'connecting',    // WebRTC handshake in progress
  CONNECTED:    'connected',     // media flowing
  RECONNECTING: 'reconnecting',  // ICE restart in progress
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
  const [permError,    setPermError]    = useState(null); // 'mic' | 'camera' | null

  // DOM refs
  const localVideoRef  = useRef(null);
  const remoteVideoRef = useRef(null);
  const remoteAudioRef = useRef(null);

  // Internal refs
  const pcRef           = useRef(null);
  const localStreamRef  = useRef(null);
  const remoteStreamRef = useRef(null);
  const pendingOfferRef = useRef(null);
  const durationTimer   = useRef(null);
  const qualityTimer    = useRef(null);
  const listenersAdded  = useRef(false);
  const callStateRef    = useRef(CALL_STATE.IDLE);
  const callTypeRef     = useRef('voice');
  const remoteUserRef   = useRef(null);
  const facingMode      = useRef('user');
  // Buffer ICE candidates that arrive before remoteDescription is set
  const iceCandidateBuffer = useRef([]);
  // Track whether we are the offerer (caller) for ICE restart
  const isOffererRef    = useRef(false);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const fmt = (s) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  const setCS = (state) => {
    callStateRef.current = state;
    setCallState(state);
  };

  const startTimer = () => {
    clearInterval(durationTimer.current);
    setCallDuration(0);
    durationTimer.current = setInterval(() => setCallDuration(s => s + 1), 1000);
  };

  // ── Network quality monitor ───────────────────────────────────────────────
  const startQualityMonitor = useCallback(() => {
    clearInterval(qualityTimer.current);
    qualityTimer.current = setInterval(async () => {
      const pc = pcRef.current;
      if (!pc) return;
      try {
        const stats = await pc.getStats();
        let rtt = null;
        let packetsLost = 0;
        let packetsSent = 0;
        stats.forEach(report => {
          if (report.type === 'remote-inbound-rtp' && report.kind === 'audio') {
            if (report.roundTripTime != null) rtt = report.roundTripTime;
            if (report.packetsLost != null) packetsLost += report.packetsLost;
          }
          if (report.type === 'outbound-rtp') {
            if (report.packetsSent != null) packetsSent += report.packetsSent;
          }
        });
        const lossRate = packetsSent > 0 ? packetsLost / packetsSent : 0;
        if (rtt === null) { setNetQuality(NET_QUALITY.UNKNOWN); return; }
        if (rtt < 0.15 && lossRate < 0.02) setNetQuality(NET_QUALITY.GOOD);
        else if (rtt < 0.4 && lossRate < 0.08) setNetQuality(NET_QUALITY.FAIR);
        else setNetQuality(NET_QUALITY.POOR);
      } catch { /* stats not available yet */ }
    }, 3000);
  }, []);

  // ── Full teardown ─────────────────────────────────────────────────────────
  const cleanup = useCallback(() => {
    clearInterval(durationTimer.current);
    clearInterval(qualityTimer.current);

    localStreamRef.current?.getTracks().forEach(t => t.stop());
    localStreamRef.current  = null;
    remoteStreamRef.current = null;
    iceCandidateBuffer.current = [];
    isOffererRef.current = false;

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
  }, []);

  // ── Get media stream ──────────────────────────────────────────────────────
  const getMedia = async (type) => {
    setPermError(null);
    // Preferred constraints — HD video, echo-cancelled audio
    const constraints = {
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl:  true,
        sampleRate: 48000,
      },
      video: type === 'video'
        ? { facingMode: facingMode.current, width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } }
        : false,
    };

    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      // Verify audio track is live and enabled
      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length === 0) {
        toast.error('No microphone track found. Check your mic.');
        stream.getTracks().forEach(t => t.stop());
        return null;
      }
      audioTracks.forEach(t => { t.enabled = true; });
      console.log('[WebRTC] Got media tracks:', stream.getTracks().map(t => `${t.kind}:${t.label}:enabled=${t.enabled}`));
      return stream;
    } catch (err) {
      const denied    = err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError';
      const noDevice  = err.name === 'NotFoundError'   || err.name === 'DevicesNotFoundError';
      const inUse     = err.name === 'NotReadableError' || err.name === 'TrackStartError';

      if (denied) {
        setPermError(type === 'video' ? 'camera' : 'mic');
        toast.error('Permission denied. Please allow mic/camera in browser settings and reload.');
      } else if (noDevice) {
        toast.error('No microphone/camera found. Please connect a device.');
      } else if (inUse) {
        toast.error('Mic/camera is in use by another app. Please close it and try again.');
      } else {
        toast.error(`Media error: ${err.message}`);
      }

      // Fallback: audio-only if video failed for non-permission reasons
      if (type === 'video' && !denied && !noDevice) {
        try {
          toast('Falling back to voice-only call.', { icon: '🎙️' });
          const fallback = await navigator.mediaDevices.getUserMedia({
            audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
            video: false,
          });
          return fallback;
        } catch { return null; }
      }
      return null;
    }
  };

  // ── Attach local stream to video element ──────────────────────────────────
  const attachLocalStream = (stream) => {
    if (localVideoRef.current && stream) {
      localVideoRef.current.srcObject = stream;
      localVideoRef.current.muted = true; // always mute local to prevent echo
    }
  };

  // ── Attach remote stream to all output elements ───────────────────────────
  const attachRemoteStream = useCallback((stream) => {
    if (!stream) return;
    remoteStreamRef.current = stream;

    // Video element (video calls)
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = stream;
      remoteVideoRef.current.play().catch(() => {});
    }
    // Audio element (voice calls + audio fallback)
    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = stream;
      remoteAudioRef.current.play().catch(() => {});
    }

    console.log('[WebRTC] Remote stream attached. Tracks:',
      stream.getTracks().map(t => `${t.kind}:enabled=${t.enabled}:muted=${t.muted}`));
  }, []);

  // ── Flush buffered ICE candidates ─────────────────────────────────────────
  const flushIceCandidates = useCallback(async () => {
    const pc = pcRef.current;
    if (!pc || !pc.remoteDescription) return;
    const buf = iceCandidateBuffer.current.splice(0);
    for (const c of buf) {
      try { await pc.addIceCandidate(new RTCIceCandidate(c)); }
      catch (e) { console.warn('[WebRTC] ICE candidate flush error:', e.message); }
    }
  }, []);

  // ── Build RTCPeerConnection ───────────────────────────────────────────────
  const createPC = useCallback((targetUserId) => {
    const pc = new RTCPeerConnection(ICE_SERVERS);

    // ICE candidate — send to remote peer
    pc.onicecandidate = ({ candidate }) => {
      if (candidate && socket?.current) {
        socket.current.emit('ice_candidate', { targetUserId, candidate });
      }
    };

    pc.onicecandidateerror = (e) => {
      // Only log — these are common and usually non-fatal
      console.warn('[WebRTC] ICE candidate error:', e.errorCode, e.errorText);
    };

    // Remote track arrived — attach to output elements
    pc.ontrack = (event) => {
      console.log('[WebRTC] ontrack fired:', event.track.kind, 'streams:', event.streams.length);
      const stream = event.streams[0];
      if (!stream) {
        // Fallback: build stream manually from track
        const fallbackStream = remoteStreamRef.current || new MediaStream();
        fallbackStream.addTrack(event.track);
        attachRemoteStream(fallbackStream);
        return;
      }
      attachRemoteStream(stream);
    };

    // Connection state changes
    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      console.log('[WebRTC] Connection state:', state);

      if (state === 'connected') {
        setCS(CALL_STATE.CONNECTED);
        startQualityMonitor();
      } else if (state === 'connecting') {
        setCS(CALL_STATE.CONNECTING);
      } else if (state === 'disconnected') {
        // Try ICE restart before giving up
        setCS(CALL_STATE.RECONNECTING);
        toast('Connection unstable. Reconnecting…', { icon: '🔄', id: 'reconnect' });
        if (isOffererRef.current) {
          setTimeout(() => attemptIceRestart(targetUserId), 2000);
        }
      } else if (state === 'failed') {
        toast.error('Call connection failed.');
        cleanup();
      } else if (state === 'closed') {
        cleanup();
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log('[WebRTC] ICE state:', pc.iceConnectionState);
      if (pc.iceConnectionState === 'failed') {
        if (isOffererRef.current) attemptIceRestart(targetUserId);
      }
    };

    return pc;
  }, [socket, cleanup, attachRemoteStream, startQualityMonitor]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── ICE restart (reconnection) ────────────────────────────────────────────
  const attemptIceRestart = useCallback(async (targetUserId) => {
    const pc = pcRef.current;
    if (!pc || !socket?.current) return;
    console.log('[WebRTC] Attempting ICE restart…');
    try {
      const offer = await pc.createOffer({ iceRestart: true });
      await pc.setLocalDescription(offer);
      socket.current.emit('call_user', {
        targetUserId: targetUserId ?? remoteUserRef.current?.id,
        offer,
        callType: callTypeRef.current,
        callerName:   currentUser.name,
        callerAvatar: currentUser.avatar_url,
        isRestart: true,
      });
    } catch (e) {
      console.error('[WebRTC] ICE restart failed:', e);
      cleanup();
    }
  }, [socket, currentUser, cleanup]);

  // ── Start outgoing call ───────────────────────────────────────────────────
  const startCall = useCallback(async (targetUser, type = 'voice') => {
    if (callStateRef.current !== CALL_STATE.IDLE) return;
    if (!socket?.current) { toast.error('Not connected to server'); return; }

    const stream = await getMedia(type);
    if (!stream) return;

    localStreamRef.current = stream;
    attachLocalStream(stream);
    isOffererRef.current = true;

    const pc = createPC(targetUser.id);
    pcRef.current = pc;

    // Add ALL tracks — critical for bi-directional audio+video
    stream.getTracks().forEach(track => {
      pc.addTrack(track, stream);
      console.log('[WebRTC] Added local track:', track.kind, track.label);
    });

    const offer = await pc.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: type === 'video',
    });
    await pc.setLocalDescription(offer);

    callTypeRef.current  = type;
    remoteUserRef.current = targetUser;
    setCallType(type);
    setRemoteUser(targetUser);
    setCS(CALL_STATE.CALLING);

    socket.current.emit('call_user', {
      targetUserId: targetUser.id,
      offer,
      callType: type,
      callerName:   currentUser.name,
      callerAvatar: currentUser.avatar_url,
    });
  }, [socket, currentUser, createPC]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Accept incoming call ──────────────────────────────────────────────────
  const acceptCall = useCallback(async () => {
    const { callerId, callerName, callerAvatar, offer, callType: inType } = pendingOfferRef.current || {};
    if (!offer) return;

    const stream = await getMedia(inType);
    if (!stream) return;

    localStreamRef.current = stream;
    attachLocalStream(stream);
    isOffererRef.current = false;

    const pc = createPC(callerId);
    pcRef.current = pc;

    // Add ALL tracks before setting remote description
    stream.getTracks().forEach(track => {
      pc.addTrack(track, stream);
      console.log('[WebRTC] Added local track (callee):', track.kind, track.label);
    });

    await pc.setRemoteDescription(new RTCSessionDescription(offer));

    // Flush any ICE candidates that arrived before we set remote description
    await flushIceCandidates();

    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    callTypeRef.current   = inType;
    remoteUserRef.current = { id: callerId, name: callerName, avatar: callerAvatar };
    setCallType(inType);
    setRemoteUser({ id: callerId, name: callerName, avatar: callerAvatar });
    setCS(CALL_STATE.CONNECTING);
    startTimer();

    socket.current?.emit('call_answer', { targetUserId: callerId, answer });
  }, [createPC, socket, flushIceCandidates]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Reject incoming call ──────────────────────────────────────────────────
  const rejectCall = useCallback(() => {
    const callerId = pendingOfferRef.current?.callerId;
    if (callerId) socket.current?.emit('call_reject', { targetUserId: callerId });
    cleanup();
  }, [socket, cleanup]);

  // ── End call ──────────────────────────────────────────────────────────────
  const endCall = useCallback((targetId, emitSignal = true) => {
    const tid = targetId ?? remoteUserRef.current?.id;
    if (emitSignal && tid) socket.current?.emit('call_end', { targetUserId: tid });
    cleanup();
  }, [socket, cleanup]);

  // ── Toggle mute ───────────────────────────────────────────────────────────
  const toggleMute = useCallback(() => {
    const tracks = localStreamRef.current?.getAudioTracks() ?? [];
    if (tracks.length === 0) { toast.error('No audio track found'); return; }
    const newEnabled = !tracks[0].enabled;
    tracks.forEach(t => { t.enabled = newEnabled; });
    setIsMuted(!newEnabled);
    console.log('[WebRTC] Audio tracks enabled:', newEnabled);
  }, []);

  // ── Toggle camera ─────────────────────────────────────────────────────────
  const toggleCamera = useCallback(() => {
    const tracks = localStreamRef.current?.getVideoTracks() ?? [];
    if (tracks.length === 0) return;
    const newEnabled = !tracks[0].enabled;
    tracks.forEach(t => { t.enabled = newEnabled; });
    setIsCamOff(!newEnabled);
  }, []);

  // ── Switch camera (front ↔ back) ──────────────────────────────────────────
  const switchCamera = useCallback(async () => {
    if (!pcRef.current || !localStreamRef.current) return;
    facingMode.current = facingMode.current === 'user' ? 'environment' : 'user';
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: facingMode.current },
      });
      const newTrack = newStream.getVideoTracks()[0];
      const sender = pcRef.current.getSenders().find(s => s.track?.kind === 'video');
      if (sender) await sender.replaceTrack(newTrack);

      const oldTrack = localStreamRef.current.getVideoTracks()[0];
      if (oldTrack) { oldTrack.stop(); localStreamRef.current.removeTrack(oldTrack); }
      localStreamRef.current.addTrack(newTrack);
      attachLocalStream(localStreamRef.current);
    } catch {
      toast.error('Could not switch camera');
    }
  }, []);

  // ── Socket signaling listeners ────────────────────────────────────────────
  useEffect(() => {
    const sock = socket?.current;
    if (!sock || listenersAdded.current) return;
    listenersAdded.current = true;

    const onIncomingCall = ({ callerId, callerName, callerAvatar, callType: inType, offer, isRestart }) => {
      // ICE restart from remote — handle renegotiation
      if (isRestart && pcRef.current && callStateRef.current === CALL_STATE.CONNECTED) {
        pcRef.current.setRemoteDescription(new RTCSessionDescription(offer))
          .then(() => pcRef.current.createAnswer())
          .then(answer => {
            pcRef.current.setLocalDescription(answer);
            sock.emit('call_answer', { targetUserId: callerId, answer });
          })
          .catch(e => console.error('[WebRTC] ICE restart answer failed:', e));
        return;
      }

      if (callStateRef.current !== CALL_STATE.IDLE) {
        sock.emit('call_reject', { targetUserId: callerId });
        return;
      }
      pendingOfferRef.current = { callerId, callerName, callerAvatar, callType: inType, offer };
      callTypeRef.current = inType || 'voice';
      setCallType(inType || 'voice');
      setRemoteUser({ id: callerId, name: callerName, avatar: callerAvatar });
      remoteUserRef.current = { id: callerId, name: callerName, avatar: callerAvatar };
      setCS(CALL_STATE.RINGING);
    };

    const onCallAnswered = async ({ answer }) => {
      const pc = pcRef.current;
      if (!pc) return;
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
        // Flush buffered ICE candidates now that remote description is set
        await flushIceCandidates();
        setCS(CALL_STATE.CONNECTING);
        startTimer();
        console.log('[WebRTC] Remote description set (answer). Senders:',
          pc.getSenders().map(s => s.track?.kind));
      } catch (e) {
        console.error('[WebRTC] setRemoteDescription (answer) failed:', e);
        toast.error('Call setup failed. Please try again.');
        cleanup();
      }
    };

    const onCallRejected = () => {
      toast('Call was declined.', { icon: '📵' });
      cleanup();
    };

    const onIceCandidate = async ({ candidate }) => {
      if (!candidate) return;
      const pc = pcRef.current;
      if (!pc) return;

      // If remote description not set yet, buffer the candidate
      if (!pc.remoteDescription) {
        iceCandidateBuffer.current.push(candidate);
        console.log('[WebRTC] Buffered ICE candidate (no remote desc yet)');
        return;
      }
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (e) {
        console.warn('[WebRTC] addIceCandidate error:', e.message);
      }
    };

    const onCallEnded = () => {
      toast('Call ended.', { icon: '📞' });
      cleanup();
    };

    sock.on('incoming_call', onIncomingCall);
    sock.on('call_answered', onCallAnswered);
    sock.on('call_rejected', onCallRejected);
    sock.on('ice_candidate', onIceCandidate);
    sock.on('call_ended',    onCallEnded);

    return () => {
      sock.off('incoming_call', onIncomingCall);
      sock.off('call_answered', onCallAnswered);
      sock.off('call_rejected', onCallRejected);
      sock.off('ice_candidate', onIceCandidate);
      sock.off('call_ended',    onCallEnded);
      listenersAdded.current = false;
    };
  }, [socket?.current, cleanup, flushIceCandidates]); // eslint-disable-line react-hooks/exhaustive-deps

  // Cleanup on unmount
  useEffect(() => () => cleanup(), []); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    callState, callType, remoteUser, isMuted, isCamOff,
    callDuration, fmt, netQuality, permError,
    localVideoRef, remoteVideoRef, remoteAudioRef, remoteStreamRef,
    startCall, acceptCall, rejectCall, endCall,
    toggleMute, toggleCamera, switchCamera,
  };
}
