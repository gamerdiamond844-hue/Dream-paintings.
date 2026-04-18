import { useState, useEffect } from 'react';
import { Flag, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../../utils/api';
import LoadingSpinner from '../../../components/LoadingSpinner';

export default function ConversationsSection() {
  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [activeConv, setActiveConv] = useState(null);
  const [search, setSearch] = useState('');
  const [flaggedOnly, setFlaggedOnly] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);

  const loadConversations = async () => {
    setLoading(true);
    try {
      const res = await api.get('/messages/admin/conversations', { params: {
        search: search || undefined,
        flagged: flaggedOnly ? 'true' : undefined,
      }});
      setConversations(res.data);
    } catch (err) {
      toast.error('Failed to load conversations');
    }
    setLoading(false);
  };

  const loadMessages = async (conversation) => {
    setActiveConv(conversation);
    setMessages([]);
    setLoadingMessages(true);
    try {
      const res = await api.get(`/messages/admin/conversations/${conversation.id}`);
      setMessages(res.data);
    } catch {
      toast.error('Failed to load messages');
    }
    setLoadingMessages(false);
  };

  useEffect(() => { loadConversations(); }, [search, flaggedOnly]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-red-500 font-semibold">Chat moderation</p>
          <h2 className="font-display text-2xl font-bold text-gray-900">Conversation logs</h2>
        </div>
        <div className="flex flex-wrap gap-3 items-center">
          <label className="inline-flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={flaggedOnly} onChange={() => setFlaggedOnly(v => !v)} className="form-checkbox h-4 w-4 text-red-600" />
            Flagged only
          </label>
          <div className="relative rounded-3xl border border-gray-200 overflow-hidden bg-white shadow-sm">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search users or conversation"
              className="pl-10 pr-4 py-3 text-sm w-full min-w-[220px] focus:outline-none"
            />
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[320px,1fr]">
        <div className="rounded-3xl border border-gray-100 bg-white shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100 text-sm font-semibold text-gray-900">Conversations</div>
          <div className="divide-y divide-gray-100">
            {loading ? (
              [...Array(6)].map((_, idx) => (
                <div key={idx} className="p-4 animate-pulse bg-gray-50" />
              ))
            ) : conversations.length === 0 ? (
              <div className="p-6 text-sm text-gray-500">No conversations found.</div>
            ) : conversations.map(conv => (
              <button
                key={conv.id}
                onClick={() => loadMessages(conv)}
                className={`w-full text-left p-4 hover:bg-red-50 transition-colors ${activeConv?.id === conv.id ? 'bg-red-50' : ''}`}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-sm text-gray-900 truncate">{conv.user1_name} ↔ {conv.user2_name}</h3>
                    <p className="text-xs text-gray-500 truncate mt-1">{conv.painting_title ? `Painting: ${conv.painting_title}` : 'General chat'}</p>
                  </div>
                  {conv.is_flagged && <Flag size={14} className="text-orange-500" />}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-gray-100 bg-white shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100 text-sm font-semibold text-gray-900">Messages</div>
          <div className="h-[520px] overflow-y-auto p-4 space-y-4">
            {activeConv ? (
              loadingMessages ? (
                <div className="flex items-center justify-center h-full"><LoadingSpinner size="lg" /></div>
              ) : messages.length === 0 ? (
                <div className="text-sm text-gray-500">No messages in this conversation yet.</div>
              ) : (
                messages.map(msg => (
                  <div key={msg.id} className="rounded-3xl border border-gray-100 p-4 bg-gray-50">
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <div className="text-xs text-gray-500">{msg.sender_name}</div>
                      <div className="text-xs text-gray-400">{new Date(msg.created_at).toLocaleString()}</div>
                    </div>
                    <div className="text-sm text-gray-900">{msg.message_type === 'image' ? '📷 Image message' : msg.message || '—'}</div>
                    {msg.message_type === 'offer' && (
                      <div className="mt-2 text-xs text-gray-500">Offer: ₹{msg.offer_amount} — {msg.offer_status}</div>
                    )}
                  </div>
                ))
              )
            ) : (
              <div className="text-sm text-gray-500">Select a conversation to view the message log.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
