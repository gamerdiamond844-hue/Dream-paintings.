import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Send, Image, Tag, X, MoreVertical, Flag,
  Smile, ArrowLeft, ChevronDown, Phone, Video
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import EmojiPicker from '../components/chat/EmojiPicker';
import OfferModal from '../components/chat/OfferModal';
import MessageBubble from '../components/chat/MessageBubble';
import ConversationList from '../components/chat/ConversationList';
import CallUI from '../components/chat/CallUI';
import { useCall, CALL_STATE } from '../components/chat/useCall';

export default function Chat() {
  const { user } = useAuth();
  const { socket, isOnline } = useSocket();
  const [searchParams] = useSearchParams();

  const [conversations, setConversations] = useState([]);
  const [activeConv, setActiveConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [typing, setTyping] = useState(false);
  const [remoteTyping, setRemoteTyping] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [showOffer, setShowOffer] = useState(false);
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [mobileShowList, setMobileShowList] = useState(true);

  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const typingTimerRef = useRef(null);
  const fileInputRef = useRef(null);
  const sendingRef = useRef(false);

  // ── Voice + Video call ────────────────────────────────────────────────────
  const {
    callState, callType, remoteUser: callRemoteUser,
    isMuted, isCamOff, callDuration, fmt,
    localVideoRef, remoteVideoRef, remoteAudioRef, remoteStreamRef,
    startCall, acceptCall, rejectCall, endCall,
    toggleMute, toggleCamera, switchCamera,
  } = useCall({ socket, currentUser: user });

  // ── Load conversations ────────────────────────────────────────────────────
  const loadConversations = useCallback(async () => {
    try {
      const res = await api.get('/messages/conversations');
      setConversations(res.data);
    } catch { /* silent */ }
    finally { setLoadingConvs(false); }
  }, []);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  // ── Auto-open conversation from URL params (from painting/artist page) ────
  useEffect(() => {
    const userId = searchParams.get('user');
    const paintingId = searchParams.get('painting');
    if (!userId) return;

    api.post('/messages/conversations', {
      other_user_id: userId,
      painting_id: paintingId || undefined,
    }).then(res => {
      setActiveConv(res.data);
      setMobileShowList(false);
      loadConversations();
    }).catch(err => toast.error(err.response?.data?.message || 'Cannot start conversation'));
  }, [searchParams, loadConversations]);

  // ── Load messages for active conversation ────────────────────────────────
  useEffect(() => {
    if (!activeConv) return;
    setLoadingMsgs(true);
    setMessages([]);

    api.get(`/messages/conversations/${activeConv.id}`)
      .then(res => {
        setMessages(res.data);
        setConversations(prev => prev.map(c =>
          c.id === activeConv.id ? { ...c, unread_count: '0' } : c
        ));
      })
      .catch(() => toast.error('Failed to load messages'))
      .finally(() => setLoadingMsgs(false));
  }, [activeConv?.id]);

  // ── Socket: join room + listen for events ─────────────────────────────────
  useEffect(() => {
    const sock = socket?.current;
    if (!sock || !activeConv) return;

    sock.emit('join_conversation', activeConv.id);

    const onNewMessage = (msg) => {
      setMessages(prev => {
        // Deduplicate: skip if real ID already exists, or replace matching optimistic
        const hasReal = prev.some(m => m.id === msg.id);
        if (hasReal) return prev;
        const hasOptimistic = prev.some(
          m => typeof m.id === 'string' && m.id.startsWith('opt_') &&
               Number(m.sender_id) === Number(msg.sender_id) &&
               m.message === msg.message && m.message_type === msg.message_type
        );
        if (hasOptimistic) {
          // Replace the optimistic entry with the confirmed server message
          return prev.map(m =>
            typeof m.id === 'string' && m.id.startsWith('opt_') &&
            Number(m.sender_id) === Number(msg.sender_id) &&
            m.message === msg.message && m.message_type === msg.message_type
              ? msg : m
          );
        }
        return [...prev, msg];
      });
      setConversations(prev => prev.map(c =>
        c.id === activeConv.id ? { ...c, last_message: msg, unread_count: '0' } : c
      ));
    };
    const onTyping = ({ userId: uid, isTyping }) => {
      if (Number(uid) !== Number(user.id)) setRemoteTyping(isTyping);
    };
    const onOfferUpdated = ({ messageId, status, counterMsg }) => {
      setMessages(prev => prev.map(m => m.id === messageId ? { ...m, offer_status: status } : m));
      if (counterMsg) setMessages(prev => [...prev, counterMsg]);
    };
    const onMsgDeleted = ({ messageId }) => {
      setMessages(prev => prev.map(m =>
        m.id === messageId ? { ...m, deleted: true, message: null } : m
      ));
    };
    const onSeen = ({ conversationId }) => {
      if (conversationId === activeConv.id)
        setMessages(prev => prev.map(m => ({ ...m, is_read: true })));
    };

    sock.on('new_message', onNewMessage);
    sock.on('typing', onTyping);
    sock.on('offer_updated', onOfferUpdated);
    sock.on('message_deleted', onMsgDeleted);
    sock.on('messages_seen', onSeen);

    return () => {
      sock.emit('leave_conversation', activeConv.id);
      sock.off('new_message', onNewMessage);
      sock.off('typing', onTyping);
      sock.off('offer_updated', onOfferUpdated);
      sock.off('message_deleted', onMsgDeleted);
      sock.off('messages_seen', onSeen);
    };
  }, [socket, activeConv?.id, user?.id]);

  // ── Notification badge for messages in other convs ────────────────────────
  useEffect(() => {
    const sock = socket?.current;
    if (!sock) return;
    const onNotif = ({ conversationId }) => {
      if (conversationId !== activeConv?.id) {
        setConversations(prev => prev.map(c =>
          c.id === conversationId
            ? { ...c, unread_count: String(Number(c.unread_count || 0) + 1) }
            : c
        ));
      }
    };
    sock.on('message_notification', onNotif);
    return () => sock.off('message_notification', onNotif);
  }, [socket, activeConv?.id]);

  // ── Auto-scroll to bottom ─────────────────────────────────────────────────
  useEffect(() => {
    if (!showScrollBtn) messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, remoteTyping]);

  const handleScroll = () => {
    const el = messagesContainerRef.current;
    if (!el) return;
    setShowScrollBtn(el.scrollHeight - el.scrollTop - el.clientHeight > 200);
  };

  // ── Typing indicator ──────────────────────────────────────────────────────
  const handleTextChange = (e) => {
    setText(e.target.value);
    const sock = socket?.current;
    if (!sock || !activeConv) return;
    if (!typing) {
      setTyping(true);
      sock.emit('typing', { conversationId: activeConv.id, isTyping: true });
    }
    clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      setTyping(false);
      sock.emit('typing', { conversationId: activeConv.id, isTyping: false });
    }, 1500);
  };

  // ── Send message (with optimistic UI, guarded against double-send) ─────────
  const sendMessage = async (payload = {}) => {
    if (!activeConv || sendingRef.current) return;
    const body = { message_type: 'text', ...payload };
    if (!body.message?.trim() && !body.image_url && !body.offer_amount) return;

    sendingRef.current = true;
    const optimisticId = `opt_${Date.now()}`;
    const optimistic = {
      id: optimisticId,
      conversation_id: activeConv.id,
      sender_id: user.id,
      message: body.message || null,
      message_type: body.message_type,
      offer_amount: body.offer_amount || null,
      offer_status: 'pending',
      image_url: body.image_url || null,
      is_read: false,
      created_at: new Date().toISOString(),
      sender_name: user.name,
      sender_avatar: user.avatar_url,
    };
    setMessages(prev => [...prev, optimistic]);
    setText('');

    try {
      const res = await api.post(`/messages/conversations/${activeConv.id}`, body);
      // Replace optimistic with confirmed server message (socket may also arrive — dedup handles it)
      setMessages(prev => prev.map(m => m.id === optimisticId ? res.data : m));
      setConversations(prev => prev.map(c =>
        c.id === activeConv.id ? { ...c, last_message: res.data } : c
      ));
    } catch (err) {
      setMessages(prev => prev.filter(m => m.id !== optimisticId));
      toast.error(err.response?.data?.message || 'Failed to send');
    } finally {
      sendingRef.current = false;
    }
  };

  const handleSend = (e) => {
    e?.preventDefault();
    if (!text.trim() || sendingRef.current) return;
    sendMessage({ message: text.trim() });
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('image', file);
    try {
      const res = await api.post('/messages/upload-image', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      sendMessage({ message_type: 'image', image_url: res.data.url });
    } catch {
      toast.error('Image upload failed');
    }
    e.target.value = '';
  };

  const handleOfferSend = (amount) => {
    sendMessage({ message_type: 'offer', message: `Price offer: ₹${amount}`, offer_amount: amount });
    setShowOffer(false);
  };

  const handleDeleteMessage = async (msgId) => {
    try { await api.delete(`/messages/messages/${msgId}`); }
    catch { toast.error('Cannot delete'); }
  };

  const handleOfferRespond = async (msgId, status, counterAmount) => {
    try { await api.put(`/messages/messages/${msgId}/offer`, { status, counter_amount: counterAmount }); }
    catch { toast.error('Failed to respond to offer'); }
  };

  const handleFlag = async () => {
    try {
      await api.post(`/messages/conversations/${activeConv.id}/flag`);
      toast.success('Conversation flagged for review');
    } catch { toast.error('Failed to flag'); }
  };

  const getOtherUser = (conv) => {
    if (!conv || !user) return {};
    const isUser1 = Number(conv.user1_id) === Number(user.id);
    return {
      id: isUser1 ? conv.user2_id : conv.user1_id,
      name: isUser1 ? conv.user2_name : conv.user1_name,
      avatar: isUser1 ? conv.user2_avatar : conv.user1_avatar,
    };
  };

  const other = getOtherUser(activeConv);
  const callActive = callState !== CALL_STATE.IDLE;

  return (
    <div className="content-layer fixed inset-0 top-16 bg-gray-50 flex">
      <div className="flex-1 flex shadow-xl overflow-hidden">

        {/* ── Conversation List ─────────────────────────────────────────── */}
        <div className={`${mobileShowList ? 'flex' : 'hidden'} md:flex flex-col w-full md:w-80 lg:w-96 border-r border-gray-100 bg-white flex-shrink-0`}>
          <div className="p-5 border-b border-gray-100">
            <h2 className="font-display text-xl font-bold text-gray-900">Messages</h2>
          </div>
          <ConversationList
            conversations={conversations}
            activeId={activeConv?.id}
            currentUserId={user?.id}
            isOnline={isOnline}
            loading={loadingConvs}
            onSelect={(conv) => { setActiveConv(conv); setMobileShowList(false); }}
          />
        </div>

        {/* ── Chat Window ───────────────────────────────────────────────── */}
        <div className={`${!mobileShowList ? 'flex' : 'hidden'} md:flex flex-col flex-1 bg-white relative`}>
          {!activeConv ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center mb-4">
                <Send size={32} className="text-red-300" />
              </div>
              <h3 className="font-display text-2xl font-bold text-gray-900 mb-2">Your Messages</h3>
              <p className="text-gray-400 text-sm max-w-xs">
                Select a conversation or start one from an artist's profile or painting page.
              </p>
            </div>
          ) : (
            <>
              {/* Chat Header */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 bg-white shadow-sm flex-shrink-0">
                <button onClick={() => setMobileShowList(true)} className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors">
                  <ArrowLeft size={18} className="text-gray-600" />
                </button>

                <div className="relative flex-shrink-0">
                  {other.avatar
                    ? <img src={other.avatar} alt="" className="w-10 h-10 rounded-full object-cover ring-2 ring-red-100" />
                    : <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-400 to-rose-600 flex items-center justify-center text-white font-bold text-sm">
                        {other.name?.[0]}
                      </div>
                  }
                  {isOnline(other.id) && (
                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 rounded-full border-2 border-white" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm truncate">{other.name}</p>
                  <p className="text-xs">
                    {remoteTyping
                      ? <span className="text-red-500 animate-pulse">typing...</span>
                      : isOnline(other.id)
                        ? <span className="text-green-500 font-medium">Online</span>
                        : <span className="text-gray-400">Offline</span>
                    }
                  </p>
                </div>

                {activeConv.painting_title && (
                  <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-red-50 rounded-full flex-shrink-0">
                    {activeConv.painting_image && (
                      <img src={activeConv.painting_image} alt="" className="w-5 h-5 rounded object-cover" />
                    )}
                    <span className="text-xs text-red-600 font-medium truncate max-w-[100px]">
                      {activeConv.painting_title}
                    </span>
                  </div>
                )}

                {/* Voice call button */}
                <button
                  onClick={() => startCall(other, 'voice')}
                  disabled={!isOnline(other.id) || callActive}
                  title={isOnline(other.id) ? 'Voice call' : 'User is offline'}
                  className="p-2 rounded-lg text-gray-500 hover:bg-green-50 hover:text-green-600
                    disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex-shrink-0"
                >
                  <Phone size={18} />
                </button>

                {/* Video call button */}
                <button
                  onClick={() => startCall(other, 'video')}
                  disabled={!isOnline(other.id) || callActive}
                  title={isOnline(other.id) ? 'Video call' : 'User is offline'}
                  className="p-2 rounded-lg text-gray-500 hover:bg-blue-50 hover:text-blue-600
                    disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex-shrink-0"
                >
                  <Video size={18} />
                </button>

                <div className="relative group flex-shrink-0">
                  <button className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
                    <MoreVertical size={16} className="text-gray-500" />
                  </button>
                  <div className="absolute right-0 top-full mt-1 w-40 bg-white rounded-xl shadow-xl border border-gray-100 py-1 hidden group-hover:block z-10">
                    <button onClick={handleFlag}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-orange-600 hover:bg-orange-50 transition-colors">
                      <Flag size={14} /> Flag Chat
                    </button>
                  </div>
                </div>
              </div>

              {/* Messages Area */}
              <div
                ref={messagesContainerRef}
                onScroll={handleScroll}
                className="flex-1 overflow-y-auto px-4 py-4 space-y-1"
              >
                {loadingMsgs ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <p className="text-gray-400 text-sm">No messages yet. Say hello! 👋</p>
                  </div>
                ) : (
                  messages.map((msg, i) => (
                    <MessageBubble
                      key={msg.id}
                      msg={msg}
                      isMine={Number(msg.sender_id) === Number(user.id)}
                      showAvatar={i === 0 || messages[i - 1]?.sender_id !== msg.sender_id}
                      onDelete={handleDeleteMessage}
                      onOfferRespond={handleOfferRespond}
                      currentUserId={user.id}
                    />
                  ))
                )}
                {remoteTyping && (
                  <div className="flex items-end gap-2">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                      {other.name?.[0]}
                    </div>
                    <div className="bg-gray-100 rounded-2xl rounded-bl-sm px-4 py-3">
                      <div className="flex gap-1">
                        {[0, 1, 2].map(i => (
                          <div key={i} className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                            style={{ animationDelay: `${i * 0.15}s` }} />
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Scroll to bottom */}
              {showScrollBtn && (
                <button
                  onClick={() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })}
                  className="absolute bottom-24 right-6 w-9 h-9 bg-red-600 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-red-700 transition-colors z-10"
                >
                  <ChevronDown size={18} />
                </button>
              )}

              {/* Input Area */}
              <div className="px-4 py-3 border-t border-gray-100 bg-white flex-shrink-0">
                {showEmoji && (
                  <EmojiPicker
                    onSelect={(emoji) => setText(prev => prev + emoji)}
                    onClose={() => setShowEmoji(false)}
                  />
                )}
                <form onSubmit={handleSend} className="flex items-end gap-2">
                  <div className="flex-1 flex items-end gap-2 bg-gray-50 rounded-2xl px-4 py-2 border border-gray-200 focus-within:border-red-400 focus-within:shadow-[0_0_0_3px_rgba(225,29,72,0.1)] transition-all">
                    <textarea
                      value={text}
                      onChange={handleTextChange}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
                      }}
                      placeholder="Type a message... (Enter to send)"
                      rows={1}
                      className="flex-1 bg-transparent text-sm text-gray-900 placeholder-gray-400 resize-none outline-none max-h-32 py-1"
                      style={{ minHeight: '24px' }}
                    />
                    <button type="button" onClick={() => setShowEmoji(!showEmoji)}
                      className="text-gray-400 hover:text-red-500 transition-colors p-1 flex-shrink-0">
                      <Smile size={18} />
                    </button>
                  </div>

                  <button type="button" onClick={() => fileInputRef.current?.click()}
                    className="p-3 rounded-xl bg-gray-100 text-gray-500 hover:bg-red-50 hover:text-red-600 transition-all flex-shrink-0"
                    title="Send image">
                    <Image size={18} />
                  </button>
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />

                  <button type="button" onClick={() => setShowOffer(true)}
                    className="p-3 rounded-xl bg-gray-100 text-gray-500 hover:bg-red-50 hover:text-red-600 transition-all flex-shrink-0"
                    title="Send price offer">
                    <Tag size={18} />
                  </button>

                  <button type="submit" disabled={!text.trim()}
                    className="p-3 rounded-xl btn-primary disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0">
                    <Send size={18} />
                  </button>
                </form>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Call UI (overlays + hidden audio) ──────────────────────────── */}
      <CallUI
        callState={callState}
        callType={callType}
        remoteUser={callRemoteUser}
        isMuted={isMuted}
        isCamOff={isCamOff}
        callDuration={callDuration}
        fmt={fmt}
        localVideoRef={localVideoRef}
        remoteVideoRef={remoteVideoRef}
        remoteAudioRef={remoteAudioRef}
        remoteStreamRef={remoteStreamRef}
        onAccept={acceptCall}
        onReject={rejectCall}
        onEnd={() => endCall()}
        onMute={toggleMute}
        onCam={toggleCamera}
        onSwitch={switchCamera}
      />

      {showOffer && (
        <OfferModal
          painting={activeConv?.painting_title ? {
            title: activeConv.painting_title,
            price: activeConv.painting_price,
            image: activeConv.painting_image,
          } : null}
          onSend={handleOfferSend}
          onClose={() => setShowOffer(false)}
        />
      )}
    </div>
  );
}
