import { formatDistanceToNow } from '../../utils/dateUtils';

export default function ConversationList({ conversations, activeId, currentUserId, isOnline, loading, onSelect }) {
  if (loading) {
    return (
      <div className="flex-1 p-4 space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-3">
            <div className="w-12 h-12 rounded-full skeleton flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-3 skeleton rounded w-3/4" />
              <div className="h-2.5 skeleton rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!conversations.length) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 text-center">
        <p className="text-gray-400 text-sm">No conversations yet.<br />Message an artist to get started.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {conversations.map(conv => {
        const isUser1 = Number(conv.user1_id) === Number(currentUserId);
        const other = {
          id: isUser1 ? conv.user2_id : conv.user1_id,
          name: isUser1 ? conv.user2_name : conv.user1_name,
          avatar: isUser1 ? conv.user2_avatar : conv.user1_avatar,
        };
        const unread = parseInt(conv.unread_count || 0);
        const lastMsg = conv.last_message;
        const active = conv.id === activeId;

        return (
          <button
            key={conv.id}
            onClick={() => onSelect(conv)}
            className={`w-full flex items-center gap-3 px-4 py-3.5 transition-all text-left border-b border-gray-50
              ${active ? 'bg-red-50 border-l-2 border-l-red-500' : 'hover:bg-gray-50'}`}
          >
            <div className="relative flex-shrink-0">
              {other.avatar
                ? <img src={other.avatar} alt="" className="w-12 h-12 rounded-full object-cover" />
                : <div className="w-12 h-12 rounded-full bg-gradient-to-br from-red-400 to-rose-600 flex items-center justify-center text-white font-bold">
                    {other.name?.[0]}
                  </div>
              }
              {isOnline(other.id) && (
                <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-400 rounded-full border-2 border-white" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-0.5">
                <span className={`text-sm font-semibold truncate ${active ? 'text-red-700' : 'text-gray-900'}`}>
                  {other.name}
                </span>
                {lastMsg && (
                  <span className="text-xs text-gray-400 flex-shrink-0 ml-2">
                    {formatDistanceToNow(lastMsg.created_at)}
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-500 truncate">
                  {lastMsg
                    ? lastMsg.message_type === 'image' ? '📷 Image'
                      : lastMsg.message_type === 'offer' ? '💰 Offer'
                      : lastMsg.message || 'Message deleted'
                    : conv.painting_title ? `Re: ${conv.painting_title}` : 'Start chatting'
                  }
                </p>
                {unread > 0 && (
                  <span className="ml-2 flex-shrink-0 w-5 h-5 bg-red-600 text-white text-xs rounded-full flex items-center justify-center font-bold">
                    {unread > 9 ? '9+' : unread}
                  </span>
                )}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
