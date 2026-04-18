import { useEffect, useRef, useState } from 'react';
import {
  Phone, PhoneOff, Mic, MicOff,
  Video, VideoOff, RotateCcw, Wifi, WifiOff, AlertTriangle,
} from 'lucide-react';
import { CALL_STATE, NET_QUALITY } from './useCall';

// ── Avatar ────────────────────────────────────────────────────────────────────
function Avatar({ name, avatar, size = 'lg' }) {
  const dim = size === 'lg' ? 'w-24 h-24 text-3xl' : 'w-12 h-12 text-base';
  return avatar
    ? <img src={avatar} alt={name} className={`${dim} rounded-full object-cover ring-4 ring-white/20`} />
    : (
      <div className={`${dim} rounded-full bg-gradient-to-br from-red-400 to-rose-600
        flex items-center justify-center text-white font-bold ring-4 ring-white/20`}>
        {name?.[0]}
      </div>
    );
}

// ── Control button ────────────────────────────────────────────────────────────
function CtrlBtn({ onClick, active, danger, disabled, label, children }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="flex flex-col items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
    >
      <span className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all
        ${danger  ? 'bg-red-600 hover:bg-red-700 text-white' :
          active  ? 'bg-white text-gray-900 hover:bg-gray-100' :
                    'bg-white/10 hover:bg-white/20 text-white'}`}>
        {children}
      </span>
      <span className="text-[11px] text-gray-400">{label}</span>
    </button>
  );
}

// ── Network quality badge ─────────────────────────────────────────────────────
function NetBadge({ quality }) {
  if (quality === NET_QUALITY.UNKNOWN) return null;
  const cfg = {
    [NET_QUALITY.GOOD]: { icon: Wifi,    color: 'text-green-400',  label: 'Good' },
    [NET_QUALITY.FAIR]: { icon: Wifi,    color: 'text-yellow-400', label: 'Fair' },
    [NET_QUALITY.POOR]: { icon: WifiOff, color: 'text-red-400',    label: 'Poor' },
  }[quality];
  const Icon = cfg.icon;
  return (
    <div className={`flex items-center gap-1 text-xs font-medium ${cfg.color}`}>
      <Icon size={12} /> {cfg.label}
    </div>
  );
}

// ── Status pill shown during connecting / reconnecting ────────────────────────
function StatusPill({ callState }) {
  if (callState === CALL_STATE.CONNECTING) {
    return (
      <div className="flex items-center gap-2 px-3 py-1 bg-yellow-500/20 rounded-full">
        <span className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
        <span className="text-yellow-300 text-xs font-medium">Connecting…</span>
      </div>
    );
  }
  if (callState === CALL_STATE.RECONNECTING) {
    return (
      <div className="flex items-center gap-2 px-3 py-1 bg-orange-500/20 rounded-full">
        <span className="w-2 h-2 bg-orange-400 rounded-full animate-ping" />
        <span className="text-orange-300 text-xs font-medium">Reconnecting…</span>
      </div>
    );
  }
  if (callState === CALL_STATE.CONNECTED) {
    return (
      <div className="flex items-center gap-2 px-3 py-1 bg-green-500/20 rounded-full">
        <span className="w-2 h-2 bg-green-400 rounded-full" />
        <span className="text-green-300 text-xs font-medium">Connected</span>
      </div>
    );
  }
  return null;
}

// ── Permission error banner ───────────────────────────────────────────────────
function PermErrorBanner({ permError }) {
  if (!permError) return null;
  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10
      flex items-center gap-2 px-4 py-2 bg-red-900/90 rounded-xl border border-red-500/50 text-white text-xs max-w-xs text-center">
      <AlertTriangle size={14} className="text-red-400 flex-shrink-0" />
      {permError === 'camera'
        ? 'Camera blocked. Allow camera access in browser settings.'
        : 'Microphone blocked. Allow mic access in browser settings.'}
    </div>
  );
}

// ── Incoming call popup ───────────────────────────────────────────────────────
export function IncomingCallPopup({ remoteUser, callType, onAccept, onReject }) {
  const toneRef = useRef(null);

  useEffect(() => {
    toneRef.current = new Audio('/ringtone.mp3');
    toneRef.current.loop = true;
    toneRef.current.play().catch(() => {});
    return () => { toneRef.current?.pause(); toneRef.current = null; };
  }, []);

  const isVideo = callType === 'video';
  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4
      bg-black/70 backdrop-blur-md">
      <div className="w-full max-w-xs bg-gradient-to-br from-gray-900 to-gray-800
        rounded-3xl p-7 shadow-2xl border border-white/10 text-white text-center
        animate-[slideUp_0.3s_cubic-bezier(0.34,1.56,0.64,1)]">

        <span className={`inline-flex items-center gap-1.5 text-xs font-semibold uppercase
          tracking-widest px-3 py-1 rounded-full mb-5
          ${isVideo ? 'bg-blue-500/20 text-blue-300' : 'bg-green-500/20 text-green-300'}`}>
          {isVideo ? <Video size={12} /> : <Phone size={12} />}
          Incoming {isVideo ? 'Video' : 'Voice'} Call
        </span>

        <div className="relative inline-flex mb-4">
          <span className="absolute inset-0 rounded-full animate-ping bg-white/10 pointer-events-none" />
          <Avatar name={remoteUser?.name} avatar={remoteUser?.avatar} size="lg" />
        </div>

        <p className="text-xl font-bold mb-1">{remoteUser?.name}</p>
        <p className="text-sm text-gray-400 mb-8">is calling you…</p>

        <div className="flex justify-center gap-12">
          <CtrlBtn onClick={onReject} danger label="Decline">
            <PhoneOff size={22} />
          </CtrlBtn>
          <CtrlBtn onClick={onAccept} label="Accept">
            <span className="w-full h-full rounded-full bg-green-500 hover:bg-green-600
              flex items-center justify-center transition-colors">
              {isVideo ? <Video size={22} /> : <Phone size={22} />}
            </span>
          </CtrlBtn>
        </div>
      </div>
    </div>
  );
}

// ── Outgoing call overlay ─────────────────────────────────────────────────────
export function OutgoingCallOverlay({ remoteUser, callType, onCancel }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center
      bg-gradient-to-br from-gray-950 to-gray-900">
      <div className="text-white text-center px-6">
        <div className="relative inline-flex mb-6">
          <span className="absolute inset-0 rounded-full animate-ping bg-white/10 pointer-events-none" />
          <Avatar name={remoteUser?.name} avatar={remoteUser?.avatar} size="lg" />
        </div>
        <p className="text-2xl font-bold mb-1">{remoteUser?.name}</p>
        <p className="text-sm text-gray-400 mb-2 animate-pulse">
          {callType === 'video' ? '📹' : '📞'} Calling…
        </p>
        <p className="text-xs text-gray-600 mb-10">Waiting for them to answer</p>
        <CtrlBtn onClick={onCancel} danger label="Cancel">
          <PhoneOff size={22} />
        </CtrlBtn>
      </div>
    </div>
  );
}

// ── Active VOICE call overlay ─────────────────────────────────────────────────
export function VoiceCallOverlay({
  remoteUser, isMuted, callDuration, fmt,
  callState, netQuality, permError,
  onMute, onEnd,
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center
      bg-gradient-to-br from-gray-950 via-gray-900 to-gray-800">
      <PermErrorBanner permError={permError} />
      <div className="text-white text-center px-6">
        <div className="relative inline-flex mb-6">
          <span className="absolute inset-0 rounded-full bg-green-400/10 animate-pulse pointer-events-none" />
          <Avatar name={remoteUser?.name} avatar={remoteUser?.avatar} size="lg" />
        </div>
        <p className="text-2xl font-bold mb-2">{remoteUser?.name}</p>

        {/* Status + timer */}
        <div className="flex flex-col items-center gap-2 mb-8">
          <StatusPill callState={callState} />
          {callState === CALL_STATE.CONNECTED && (
            <p className="text-green-400 text-sm font-mono tabular-nums">{fmt(callDuration)}</p>
          )}
          <NetBadge quality={netQuality} />
        </div>

        {/* Mic status indicator */}
        {isMuted && (
          <div className="flex items-center justify-center gap-1.5 mb-4 text-red-400 text-xs">
            <MicOff size={13} /> Microphone muted
          </div>
        )}

        <div className="flex justify-center gap-8">
          <CtrlBtn onClick={onMute} active={isMuted} label={isMuted ? 'Unmute' : 'Mute'}>
            {isMuted ? <MicOff size={22} /> : <Mic size={22} />}
          </CtrlBtn>
          <CtrlBtn onClick={onEnd} danger label="End">
            <PhoneOff size={22} />
          </CtrlBtn>
        </div>
      </div>
    </div>
  );
}

// ── Active VIDEO call overlay ─────────────────────────────────────────────────
export function VideoCallOverlay({
  remoteUser, isMuted, isCamOff, callDuration, fmt,
  callState, netQuality, permError,
  localVideoRef, remoteVideoRef, remoteStreamRef,
  onMute, onCam, onSwitch, onEnd,
}) {
  const hasMultipleCams    = useRef(false);
  const [remoteVideoActive, setRemoteVideoActive] = useState(false);

  useEffect(() => {
    navigator.mediaDevices.enumerateDevices().then(devices => {
      hasMultipleCams.current = devices.filter(d => d.kind === 'videoinput').length > 1;
    }).catch(() => {});
  }, []);

  // Attach remote stream on mount and when stream ref changes
  // Does NOT call setState — avoids infinite re-render loop
  useEffect(() => {
    const el     = remoteVideoRef.current;
    const stream = remoteStreamRef?.current;
    if (el && stream && el.srcObject !== stream) {
      el.srcObject = stream;
      el.play().catch(() => {});
    }
    // Check video activity without triggering re-render
    const hasVideo = stream?.getVideoTracks().some(t => t.enabled && !t.muted) ?? false;
    setRemoteVideoActive(hasVideo);
  }); // run every render — refs are not reactive, but guard with srcObject check

  return (
    <div className="fixed inset-0 z-[60] bg-black flex flex-col">
      <PermErrorBanner permError={permError} />

      {/* Remote video */}
      <div className="flex-1 relative overflow-hidden bg-gray-900">
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover"
        />

        {/* Avatar fallback when remote video not active */}
        {!remoteVideoActive && (
          <div className="absolute inset-0 flex flex-col items-center justify-center select-none">
            <Avatar name={remoteUser?.name} avatar={remoteUser?.avatar} size="lg" />
            <p className="text-white font-semibold mt-3 text-lg drop-shadow">{remoteUser?.name}</p>
          </div>
        )}

        {/* Status + timer + network */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5">
          <StatusPill callState={callState} />
          {callState === CALL_STATE.CONNECTED && (
            <div className="bg-black/50 backdrop-blur-sm text-white text-xs font-mono tabular-nums
              px-3 py-1 rounded-full border border-white/10">
              {fmt(callDuration)}
            </div>
          )}
          <NetBadge quality={netQuality} />
        </div>

        {/* Local video PiP */}
        <div className="absolute top-4 right-4 w-28 sm:w-36 aspect-[9/16] rounded-2xl
          overflow-hidden shadow-2xl border-2 border-white/20 bg-gray-900">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover scale-x-[-1] transition-opacity
              ${isCamOff ? 'opacity-0' : 'opacity-100'}`}
          />
          {isCamOff && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
              <VideoOff size={20} className="text-gray-500" />
            </div>
          )}
        </div>

        {/* Mic muted indicator */}
        {isMuted && (
          <div className="absolute bottom-24 left-1/2 -translate-x-1/2
            flex items-center gap-1.5 px-3 py-1 bg-red-900/80 rounded-full text-red-300 text-xs">
            <MicOff size={12} /> Muted
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="bg-gradient-to-t from-black via-black/80 to-transparent
        px-6 pt-6 pb-8 flex justify-center gap-6 sm:gap-8">
        <CtrlBtn onClick={onMute} active={isMuted} label={isMuted ? 'Unmute' : 'Mute'}>
          {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
        </CtrlBtn>
        <CtrlBtn onClick={onCam} active={isCamOff} label={isCamOff ? 'Cam On' : 'Cam Off'}>
          {isCamOff ? <VideoOff size={20} /> : <Video size={20} />}
        </CtrlBtn>
        <CtrlBtn onClick={onSwitch} label="Switch" disabled={!hasMultipleCams.current}>
          <RotateCcw size={20} />
        </CtrlBtn>
        <CtrlBtn onClick={onEnd} danger label="End">
          <PhoneOff size={20} />
        </CtrlBtn>
      </div>
    </div>
  );
}

// ── Master CallUI ─────────────────────────────────────────────────────────────
export default function CallUI({
  callState, callType, remoteUser,
  isMuted, isCamOff, callDuration, fmt,
  netQuality, permError,
  localVideoRef, remoteVideoRef, remoteAudioRef, remoteStreamRef,
  onAccept, onReject, onEnd, onMute, onCam, onSwitch,
}) {
  const isVideo = callType === 'video';

  // Attach remote stream to audio element on every render
  // muted is set via DOM ref — React's muted={false} JSX prop is ignored by browsers
  useEffect(() => {
    const el     = remoteAudioRef?.current;
    const stream = remoteStreamRef?.current;
    if (!el || !stream) return;
    if (el.srcObject !== stream) {
      el.srcObject = stream;
      el.play().catch(e => console.warn('[CallUI] audio play:', e.message));
    }
    // Always force unmuted via DOM — JSX muted prop bug in React
    el.muted  = false;
    el.volume = 1.0;
  });

  // Attach remote stream to video element on every render
  useEffect(() => {
    const el     = remoteVideoRef?.current;
    const stream = remoteStreamRef?.current;
    if (el && stream && el.srcObject !== stream) {
      el.srcObject = stream;
      el.play().catch(() => {});
    }
  });

  const activeCall = [
    CALL_STATE.CONNECTING,
    CALL_STATE.CONNECTED,
    CALL_STATE.RECONNECTING,
  ].includes(callState);

  return (
    <>
      {/* Hidden audio element — muted set via DOM ref, NOT JSX prop
          React ignores muted={false} — must use el.muted = false in effect */}
      <audio
        ref={remoteAudioRef}
        autoPlay
        playsInline
        style={{ display: 'none' }}
      />

      {callState === CALL_STATE.RINGING && (
        <IncomingCallPopup
          remoteUser={remoteUser}
          callType={callType}
          onAccept={onAccept}
          onReject={onReject}
        />
      )}

      {callState === CALL_STATE.CALLING && (
        <OutgoingCallOverlay
          remoteUser={remoteUser}
          callType={callType}
          onCancel={onEnd}
        />
      )}

      {activeCall && !isVideo && (
        <VoiceCallOverlay
          remoteUser={remoteUser}
          isMuted={isMuted}
          callDuration={callDuration}
          fmt={fmt}
          callState={callState}
          netQuality={netQuality}
          permError={permError}
          onMute={onMute}
          onEnd={onEnd}
        />
      )}

      {activeCall && isVideo && (
        <VideoCallOverlay
          remoteUser={remoteUser}
          isMuted={isMuted}
          isCamOff={isCamOff}
          callDuration={callDuration}
          fmt={fmt}
          callState={callState}
          netQuality={netQuality}
          permError={permError}
          localVideoRef={localVideoRef}
          remoteVideoRef={remoteVideoRef}
          remoteStreamRef={remoteStreamRef}
          onMute={onMute}
          onCam={onCam}
          onSwitch={onSwitch}
          onEnd={onEnd}
        />
      )}
    </>
  );
}
