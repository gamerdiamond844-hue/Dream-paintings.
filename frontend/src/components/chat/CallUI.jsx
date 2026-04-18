import { useEffect, useRef } from 'react';
import {
  Phone, PhoneOff, Mic, MicOff,
  Video, VideoOff, RotateCcw,
} from 'lucide-react';
import { CALL_STATE } from './useCall';

// ── Shared helpers ────────────────────────────────────────────────────────────
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

function CtrlBtn({ onClick, active, danger, disabled, label, children }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={`flex flex-col items-center gap-1.5 group disabled:opacity-40 disabled:cursor-not-allowed`}
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

        {/* Call type badge */}
        <span className={`inline-flex items-center gap-1.5 text-xs font-semibold uppercase
          tracking-widest px-3 py-1 rounded-full mb-5
          ${isVideo ? 'bg-blue-500/20 text-blue-300' : 'bg-green-500/20 text-green-300'}`}>
          {isVideo ? <Video size={12} /> : <Phone size={12} />}
          Incoming {isVideo ? 'Video' : 'Voice'} Call
        </span>

        {/* Pulsing avatar */}
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
export function VoiceCallOverlay({ remoteUser, isMuted, callDuration, fmt, onMute, onEnd }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center
      bg-gradient-to-br from-gray-950 via-gray-900 to-gray-800">
      <div className="text-white text-center px-6">
        <div className="relative inline-flex mb-6">
          <span className="absolute inset-0 rounded-full bg-green-400/10 animate-pulse pointer-events-none" />
          <Avatar name={remoteUser?.name} avatar={remoteUser?.avatar} size="lg" />
        </div>
        <p className="text-2xl font-bold mb-1">{remoteUser?.name}</p>
        <p className="text-green-400 text-sm font-mono mb-10 tabular-nums">{fmt(callDuration)}</p>

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
  localVideoRef, remoteVideoRef, remoteStreamRef,
  onMute, onCam, onSwitch, onEnd,
}) {
  // Detect if device has multiple cameras (for switch button)
  const hasMultipleCams = useRef(false);
  useEffect(() => {
    navigator.mediaDevices.enumerateDevices().then(devices => {
      hasMultipleCams.current = devices.filter(d => d.kind === 'videoinput').length > 1;
    }).catch(() => {});
  }, []);

  // ── KEY FIX: attach remote stream when this component mounts ──────────────
  // ontrack fires during SDP negotiation, BEFORE this overlay renders.
  // remoteStreamRef holds the stream; we assign it here once the <video> exists.
  useEffect(() => {
    const videoEl = remoteVideoRef.current;
    const stream  = remoteStreamRef?.current;
    if (videoEl && stream) {
      videoEl.srcObject = stream;
      videoEl.play().catch(() => {});
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="fixed inset-0 z-[60] bg-black flex flex-col">

      {/* ── Remote video (full screen) ──────────────────────────────────── */}
      <div className="flex-1 relative overflow-hidden">
        <video
          ref={(el) => {
            remoteVideoRef.current = el;
            if (el && remoteStreamRef?.current) {
              el.srcObject = remoteStreamRef.current;
              el.play().catch(() => {});
            }
          }}
          autoPlay
          playsInline
          className="w-full h-full object-cover"
        />

        {/* Fallback when remote video is absent */}
        <div className="absolute inset-0 flex flex-col items-center justify-center
          pointer-events-none select-none">
          <Avatar name={remoteUser?.name} avatar={remoteUser?.avatar} size="lg" />
          <p className="text-white font-semibold mt-3 text-lg drop-shadow">{remoteUser?.name}</p>
          <p className="text-green-400 text-sm font-mono tabular-nums mt-1 drop-shadow">
            {fmt(callDuration)}
          </p>
        </div>

        {/* ── Local video (picture-in-picture) ──────────────────────────── */}
        <div className="absolute top-4 right-4 w-28 sm:w-36 aspect-[9/16] rounded-2xl
          overflow-hidden shadow-2xl border-2 border-white/20 bg-gray-900">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted          /* always mute local to prevent echo */
            className={`w-full h-full object-cover scale-x-[-1] transition-opacity
              ${isCamOff ? 'opacity-0' : 'opacity-100'}`}
          />
          {isCamOff && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
              <VideoOff size={20} className="text-gray-500" />
            </div>
          )}
        </div>

        {/* Timer badge */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2
          bg-black/50 backdrop-blur-sm text-white text-xs font-mono tabular-nums
          px-3 py-1 rounded-full border border-white/10">
          {fmt(callDuration)}
        </div>
      </div>

      {/* ── Controls bar ────────────────────────────────────────────────── */}
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

// ── Master CallUI — picks the right overlay ───────────────────────────────────
export default function CallUI({
  callState, callType, remoteUser,
  isMuted, isCamOff, callDuration, fmt,
  localVideoRef, remoteVideoRef, remoteAudioRef, remoteStreamRef,
  onAccept, onReject, onEnd, onMute, onCam, onSwitch,
}) {
  const isVideo = callType === 'video';

  // Ensure remote audio stream is attached to the audio element
  useEffect(() => {
    if (remoteAudioRef?.current && remoteStreamRef?.current) {
      remoteAudioRef.current.srcObject = remoteStreamRef.current;
      remoteAudioRef.current.play().catch(() => {});
    }
  }); // run every render — refs are not reactive

  return (
    <>
      {/* Hidden audio element — carries remote audio for voice calls
          and also acts as audio fallback when remote video is muted */}
      <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />

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

      {callState === CALL_STATE.CONNECTED && !isVideo && (
        <VoiceCallOverlay
          remoteUser={remoteUser}
          isMuted={isMuted}
          callDuration={callDuration}
          fmt={fmt}
          onMute={onMute}
          onEnd={onEnd}
        />
      )}

      {callState === CALL_STATE.CONNECTED && isVideo && (
        <VideoCallOverlay
          remoteUser={remoteUser}
          isMuted={isMuted}
          isCamOff={isCamOff}
          callDuration={callDuration}
          fmt={fmt}
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
