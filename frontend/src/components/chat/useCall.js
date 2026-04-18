import { useRef, useState, useCallback, useEffect } from 'react';
import toast from 'react-hot-toast';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    // TURN — replace with real credentials for production NAT traversal
    // { urls: 'turn:your.turn.server:3478', username: 'user', credential: 'pass' },
  ],
};

export const CALL_STATE = {
  IDLE:      'idle',
  CALLING:   'calling',    // outgoing — waiting for answer
  RINGING:   'ringing',    // incoming — waiting for accept/reject
  CONNECTED: 'connected',
};

export function useCall({ socket, currentUser }) {
  const [callState,    setCallState]    = useState(CALL_STATE.IDLE);

  const [callType,     setCallType]     = useState('voice');   // 'voice' | 'video'
  const [remoteUser,   setRemoteUser]   = useState(null);
  const [isMuted,      setIsMuted]      = useState(false);
  const [isCamOff,     setIsCamOff]     = useState(false);
  const [callDuration, setCallDuration] = useState(0);

  // DOM refs — assigned by CallUI via callback refs
  const localVideoRef  = useRef(null);
  const remoteVideoRef = useRef(null);
  const remoteAudioRef = useRef(null);  // voice-only fallback

  // Internal refs
  const pcRef            = useRef(null);
  const localStreamRef   = useRef(null);
  const remoteStreamRef  = useRef(null); // persists remote stream across renders
  const pendingOfferRef  = useRef(null);
  const durationTimer    = useRef(null);
  const listenersAdded   = useRef(false);
  const callStateRef      = useRef(CALL_STATE.IDLE);
  const facingMode       = useRef('user'); // 'user' | 'environment'

  // ── Helpers ───────────────────────────────────────────────────────────────
  const fmt = (s) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  const startTimer = () => {
    clearInterval(durationTimer.current);
    setCallDuration(0);
    durationTimer.current = setInterval(() => setCallDuration(s => s + 1), 1000);
  };

  // ── Full teardown ─────────────────────────────────────────────────────────
  const cleanup = useCallback(() => {
    clearInterval(durationTimer.current);

    localStreamRef.current?.getTracks().forEach(t => t.stop());
    localStreamRef.current = null;
    remoteStreamRef.current = null;

    if (pcRef.current) { pcRef.current.close(); pcRef.current = null; }

    if (localVideoRef.current)  localVideoRef.current.srcObject  = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    if (remoteAudioRef.current) remoteAudioRef.current.srcObject = null;

    pendingOfferRef.current = null;
    callStateRef.current = CALL_STATE.IDLE;
    setCallState(CALL_STATE.IDLE);
    setRemoteUser(null);
    setIsMuted(false);
    setIsCamOff(false);
    setCallDuration(0);
  }, []);

  // ── Get media stream ──────────────────────────────────────────────────────
  const getMedia = async (type) => {
    const constraints = {
      audio: true,
      video: type === 'video'
        ? { facingMode: facingMode.current, width: { ideal: 1280 }, height: { ideal: 720 } }
        : false,
    };
    try {
      return await navigator.mediaDevices.getUserMedia(constraints);
    } catch (err) {
      const denied = err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError';
      const noDevice = err.name === 'NotFoundError';
      toast.error(
        denied   ? 'Camera/mic permission denied. Please allow access in browser settings.' :
        noDevice ? 'No camera found. Falling back to voice only.' :
                   'Could not access media devices.'
      );
      // Fallback: try audio-only if video failed
      if (type === 'video' && !denied) {
        try { return await navigator.mediaDevices.getUserMedia({ audio: true, video: false }); }
        catch { return null; }
      }
      return null;
    }
  };

  // ── Build RTCPeerConnection ───────────────────────────────────────────────
  const createPC = useCallback((targetUserId) => {
    const pc = new RTCPeerConnection(ICE_SERVERS);

    pc.onicecandidate = ({ candidate }) => {
      if (candidate && socket?.current) socket.current.emit('ice_candidate', { targetUserId, candidate });
    };

    pc.ontrack = ({ streams, track }) => {
      // Always use streams[0] — it contains ALL tracks for this peer connection.
      // We store it in a ref so VideoCallOverlay can attach it when it mounts.
      const stream = streams[0];
      if (!stream) return;

      remoteStreamRef.current = stream;

      // If the video element is already mounted (e.g. re-negotiation), attach immediately
      if (remoteVideoRef.current && track.kind === 'video') {
        remoteVideoRef.current.srcObject = stream;
      }
      // Always keep audio element in sync for voice calls
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = stream;
      }
    };

    pc.onconnectionstatechange = () => {
      if (['disconnected', 'failed', 'closed'].includes(pc.connectionState)) {
        // Remote side dropped — clean up locally without re-emitting
        cleanup();
      }
    };

    return pc;
  }, [socket, cleanup]);

  // ── Attach local stream to local video element ────────────────────────────
  const attachLocalStream = (stream) => {
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream;
    }
  };

  // ── Start outgoing call ───────────────────────────────────────────────────
  const startCall = useCallback(async (targetUser, type = 'voice') => {
    if (callState !== CALL_STATE.IDLE) return;
    if (!socket.current) { toast.error('Not connected to server'); return; }

    const stream = await getMedia(type);
    if (!stream) return;

    localStreamRef.current = stream;
    attachLocalStream(stream);

    const pc = createPC(targetUser.id);
    pcRef.current = pc;
    stream.getTracks().forEach(t => pc.addTrack(t, stream));

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    setCallType(type);
    setRemoteUser(targetUser);
    callStateRef.current = CALL_STATE.CALLING;
    setCallState(CALL_STATE.CALLING);

    socket.current.emit('call_user', {
      targetUserId: targetUser.id,
      offer,
      callType: type,
      callerName:   currentUser.name,
      callerAvatar: currentUser.avatar_url,
    });
  }, [callState, socket, currentUser, createPC]);

  // ── Accept incoming call ──────────────────────────────────────────────────
  const acceptCall = useCallback(async () => {
    const { callerId, callerName, callerAvatar, offer, callType: inType } = pendingOfferRef.current || {};
    if (!offer) return;

    const stream = await getMedia(inType);
    if (!stream) return;

    localStreamRef.current = stream;
    attachLocalStream(stream);

    const pc = createPC(callerId);
    pcRef.current = pc;
    stream.getTracks().forEach(t => pc.addTrack(t, stream));

    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    setCallType(inType);
    setRemoteUser({ id: callerId, name: callerName, avatar: callerAvatar });
    callStateRef.current = CALL_STATE.CONNECTED;
    setCallState(CALL_STATE.CONNECTED);
    startTimer();

    socket.current?.emit('call_answer', { targetUserId: callerId, answer });
  }, [createPC, socket]);

  // ── Reject incoming call ──────────────────────────────────────────────────
  const rejectCall = useCallback(() => {
    const callerId = pendingOfferRef.current?.callerId;
    if (callerId) socket.current?.emit('call_reject', { targetUserId: callerId });
    cleanup();
  }, [socket, cleanup]);

  // ── End call ──────────────────────────────────────────────────────────────
  const endCall = useCallback((targetId, emitSignal = true) => {
    const tid = targetId ?? remoteUser?.id;
    if (emitSignal && tid) socket.current?.emit('call_end', { targetUserId: tid });
    cleanup();
  }, [remoteUser, socket, cleanup]);

  // ── Toggle mute ───────────────────────────────────────────────────────────
  const toggleMute = useCallback(() => {
    localStreamRef.current?.getAudioTracks().forEach(t => { t.enabled = !t.enabled; });
    setIsMuted(p => !p);
  }, []);

  // ── Toggle camera ─────────────────────────────────────────────────────────
  const toggleCamera = useCallback(() => {
    localStreamRef.current?.getVideoTracks().forEach(t => { t.enabled = !t.enabled; });
    setIsCamOff(p => !p);
  }, []);

  // ── Switch camera (front ↔ back, mobile) ──────────────────────────────────
  const switchCamera = useCallback(async () => {
    if (!pcRef.current || !localStreamRef.current) return;
    facingMode.current = facingMode.current === 'user' ? 'environment' : 'user';

    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: facingMode.current },
      });
      const newTrack = newStream.getVideoTracks()[0];

      // Replace track in peer connection
      const sender = pcRef.current.getSenders().find(s => s.track?.kind === 'video');
      if (sender) await sender.replaceTrack(newTrack);

      // Replace track in local stream
      const oldTrack = localStreamRef.current.getVideoTracks()[0];
      if (oldTrack) {
        oldTrack.stop();
        localStreamRef.current.removeTrack(oldTrack);
      }
      localStreamRef.current.addTrack(newTrack);
      attachLocalStream(localStreamRef.current);
    } catch {
      toast.error('Could not switch camera');
    }
  }, []);

  // ── Socket signaling listeners (attached once per socket instance) ────────
  useEffect(() => {
    const sock = socket?.current;
    if (!sock || listenersAdded.current) return;
    listenersAdded.current = true;

    const onIncomingCall = ({ callerId, callerName, callerAvatar, callType: inType, offer }) => {
      // Already busy — auto-reject (use ref to avoid stale closure)
      if (callStateRef.current !== CALL_STATE.IDLE) {
        sock.emit('call_reject', { targetUserId: callerId });
        return;
      }
      pendingOfferRef.current = { callerId, callerName, callerAvatar, callType: inType, offer };
      setCallType(inType || 'voice');
      setRemoteUser({ id: callerId, name: callerName, avatar: callerAvatar });
      callStateRef.current = CALL_STATE.RINGING;
      setCallState(CALL_STATE.RINGING);
    };

    const onCallAnswered = async ({ answer }) => {
      if (!pcRef.current) return;
      await pcRef.current.setRemoteDescription(new RTCSessionDescription(answer));
      callStateRef.current = CALL_STATE.CONNECTED;
      setCallState(CALL_STATE.CONNECTED);
      startTimer();
    };

    const onCallRejected = () => {
      toast('Call was declined.', { icon: '📵' });
      cleanup();
    };

    const onIceCandidate = async ({ candidate }) => {
      try {
        if (pcRef.current && candidate)
          await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (_) {}
    };

    const onCallEnded = () => {
      toast('Call ended.', { icon: '📞' });
      cleanup();
    };

    sock.on('incoming_call',  onIncomingCall);
    sock.on('call_answered',  onCallAnswered);
    sock.on('call_rejected',  onCallRejected);
    sock.on('ice_candidate',  onIceCandidate);
    sock.on('call_ended',     onCallEnded);

    return () => {
      sock.off('incoming_call',  onIncomingCall);
      sock.off('call_answered',  onCallAnswered);
      sock.off('call_rejected',  onCallRejected);
      sock.off('ice_candidate',  onIceCandidate);
      sock.off('call_ended',     onCallEnded);
      listenersAdded.current = false;
    };
  }, [socket?.current, cleanup]); // eslint-disable-line react-hooks/exhaustive-deps

  // Cleanup on unmount
  useEffect(() => () => cleanup(), []); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    // state
    callState, callType, remoteUser, isMuted, isCamOff, callDuration, fmt,
    // video element refs (assign these to <video> elements in UI)
    localVideoRef, remoteVideoRef, remoteAudioRef,
    // remote stream ref — used by VideoCallOverlay to attach stream after mount
    remoteStreamRef,
    // actions
    startCall, acceptCall, rejectCall, endCall,
    toggleMute, toggleCamera, switchCamera,
  };
}
