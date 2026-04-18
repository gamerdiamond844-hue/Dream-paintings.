import { useRef, useState, useCallback, useEffect } from 'react';
import toast from 'react-hot-toast';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    // TURN fallback — replace with your own TURN credentials in production
    // { urls: 'turn:your.turn.server:3478', username: 'user', credential: 'pass' },
  ],
};

// Call states
export const CALL_STATE = {
  IDLE: 'idle',
  CALLING: 'calling',      // outgoing, waiting for answer
  RINGING: 'ringing',      // incoming, waiting for user to accept/reject
  CONNECTED: 'connected',
  ENDED: 'ended',
};

export function useVoiceCall({ socket, currentUser }) {
  const [callState, setCallState] = useState(CALL_STATE.IDLE);
  const [remoteUser, setRemoteUser] = useState(null); // { id, name, avatar }
  const [isMuted, setIsMuted] = useState(false);
  const [callDuration, setCallDuration] = useState(0);

  const pcRef = useRef(null);           // RTCPeerConnection
  const localStreamRef = useRef(null);  // local MediaStream
  const remoteAudioRef = useRef(null);  // <audio> element ref (passed in)
  const pendingOfferRef = useRef(null); // store offer until user accepts
  const durationTimerRef = useRef(null);
  const listenersAttached = useRef(false);

  // ── Cleanup everything ────────────────────────────────────────────────────
  const cleanup = useCallback(() => {
    clearInterval(durationTimerRef.current);
    setCallDuration(0);

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
    }
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = null;
    }
    pendingOfferRef.current = null;
    setIsMuted(false);
    setRemoteUser(null);
    setCallState(CALL_STATE.IDLE);
  }, []);

  // ── Build RTCPeerConnection ───────────────────────────────────────────────
  const createPeerConnection = useCallback((targetUserId) => {
    const pc = new RTCPeerConnection(ICE_SERVERS);

    pc.onicecandidate = ({ candidate }) => {
      if (candidate) {
        socket.current?.emit('ice_candidate', { targetUserId, candidate });
      }
    };

    pc.ontrack = ({ streams }) => {
      if (remoteAudioRef.current && streams[0]) {
        remoteAudioRef.current.srcObject = streams[0];
      }
    };

    pc.onconnectionstatechange = () => {
      if (['disconnected', 'failed', 'closed'].includes(pc.connectionState)) {
        endCall(targetUserId, false); // local cleanup only, no re-emit
      }
    };

    return pc;
  }, [socket]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Get microphone ────────────────────────────────────────────────────────
  const getMic = async () => {
    try {
      return await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    } catch (err) {
      const msg = err.name === 'NotAllowedError'
        ? 'Microphone permission denied. Please allow mic access and try again.'
        : 'Could not access microphone.';
      toast.error(msg);
      return null;
    }
  };

  // ── Start outgoing call ───────────────────────────────────────────────────
  const startCall = useCallback(async (targetUser) => {
    if (callState !== CALL_STATE.IDLE) return;
    if (!socket.current) { toast.error('Not connected'); return; }

    const stream = await getMic();
    if (!stream) return;

    localStreamRef.current = stream;
    const pc = createPeerConnection(targetUser.id);
    pcRef.current = pc;

    stream.getTracks().forEach(t => pc.addTrack(t, stream));

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    setRemoteUser(targetUser);
    setCallState(CALL_STATE.CALLING);

    socket.current.emit('call_user', {
      targetUserId: targetUser.id,
      offer,
      callerName: currentUser.name,
      callerAvatar: currentUser.avatar_url,
    });
  }, [callState, socket, currentUser, createPeerConnection]);

  // ── Accept incoming call ──────────────────────────────────────────────────
  const acceptCall = useCallback(async () => {
    const { callerId, callerName, callerAvatar, offer } = pendingOfferRef.current || {};
    if (!offer) return;

    const stream = await getMic();
    if (!stream) return;

    localStreamRef.current = stream;
    const pc = createPeerConnection(callerId);
    pcRef.current = pc;

    stream.getTracks().forEach(t => pc.addTrack(t, stream));

    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    setRemoteUser({ id: callerId, name: callerName, avatar: callerAvatar });
    setCallState(CALL_STATE.CONNECTED);
    startDurationTimer();

    socket.current?.emit('call_answer', { targetUserId: callerId, answer });
  }, [createPeerConnection, socket]);

  // ── Reject incoming call ──────────────────────────────────────────────────
  const rejectCall = useCallback(() => {
    const callerId = pendingOfferRef.current?.callerId;
    if (callerId) socket.current?.emit('call_reject', { targetUserId: callerId });
    cleanup();
  }, [socket, cleanup]);

  // ── End active call ───────────────────────────────────────────────────────
  const endCall = useCallback((targetId, emitSignal = true) => {
    const tid = targetId ?? remoteUser?.id;
    if (emitSignal && tid) {
      socket.current?.emit('call_end', { targetUserId: tid });
    }
    cleanup();
  }, [remoteUser, socket, cleanup]);

  // ── Mute toggle ───────────────────────────────────────────────────────────
  const toggleMute = useCallback(() => {
    if (!localStreamRef.current) return;
    localStreamRef.current.getAudioTracks().forEach(t => {
      t.enabled = !t.enabled;
    });
    setIsMuted(prev => !prev);
  }, []);

  // ── Duration timer ────────────────────────────────────────────────────────
  const startDurationTimer = () => {
    clearInterval(durationTimerRef.current);
    setCallDuration(0);
    durationTimerRef.current = setInterval(() => setCallDuration(s => s + 1), 1000);
  };

  // ── Socket event listeners (attach once per socket instance) ─────────────
  useEffect(() => {
    const sock = socket?.current;
    if (!sock || listenersAttached.current) return;
    listenersAttached.current = true;

    const onIncomingCall = ({ callerId, callerName, callerAvatar, offer }) => {
      if (callState !== CALL_STATE.IDLE) {
        // Already in a call — auto-reject
        sock.emit('call_reject', { targetUserId: callerId });
        return;
      }
      pendingOfferRef.current = { callerId, callerName, callerAvatar, offer };
      setRemoteUser({ id: callerId, name: callerName, avatar: callerAvatar });
      setCallState(CALL_STATE.RINGING);
    };

    const onCallAnswered = async ({ answer }) => {
      if (!pcRef.current) return;
      await pcRef.current.setRemoteDescription(new RTCSessionDescription(answer));
      setCallState(CALL_STATE.CONNECTED);
      startDurationTimer();
    };

    const onCallRejected = () => {
      toast('Call was declined.', { icon: '📵' });
      cleanup();
    };

    const onIceCandidate = async ({ candidate }) => {
      try {
        if (pcRef.current && candidate) {
          await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
        }
      } catch (_) {}
    };

    const onCallEnded = () => {
      toast('Call ended.', { icon: '📞' });
      cleanup();
    };

    sock.on('incoming_call', onIncomingCall);
    sock.on('call_answered', onCallAnswered);
    sock.on('call_rejected', onCallRejected);
    sock.on('ice_candidate', onIceCandidate);
    sock.on('call_ended', onCallEnded);

    return () => {
      sock.off('incoming_call', onIncomingCall);
      sock.off('call_answered', onCallAnswered);
      sock.off('call_rejected', onCallRejected);
      sock.off('ice_candidate', onIceCandidate);
      sock.off('call_ended', onCallEnded);
      listenersAttached.current = false;
    };
  }, [socket?.current]); // eslint-disable-line react-hooks/exhaustive-deps

  // Cleanup on unmount
  useEffect(() => () => cleanup(), []); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    callState,
    remoteUser,
    isMuted,
    callDuration,
    remoteAudioRef,
    startCall,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
  };
}
