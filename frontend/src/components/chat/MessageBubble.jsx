import { useState } from 'react';
import { Trash2, Check, CheckCheck, RotateCcw, X, DollarSign } from 'lucide-react';
import { formatTime } from '../../utils/dateUtils';
import VerifiedBadge from '../VerifiedBadge';

export default function MessageBubble({ msg, isMine, showAvatar, onDelete, onOfferRespond, currentUserId }) {
  const [showCounter, setShowCounter] = useState(false);
  const [counterVal, setCounterVal] = useState('');

  if (msg.deleted) {
    return (
      <div className={`flex items-end gap-2 ${isMine ? 'flex-row-reverse' : ''}`}>
        <div className="w-7 h-7 flex-shrink-0" />
        <div className={`px-4 py-2 rounded-2xl text-xs italic text-gray-400 bg-gray-100 ${isMine ? 'rounded-br-sm' : 'rounded-bl-sm'}`}>
          Message deleted
        </div>
      </div>
    );
  }

  const isOffer = msg.message_type === 'offer';
  const isImage = msg.message_type === 'image';

  return (
    <div className={`flex items-end gap-2 group ${isMine ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      <div className="w-7 h-7 flex-shrink-0">
        {showAvatar && !isMine && (
          <div className="relative">
            {msg.sender_avatar
              ? <img src={msg.sender_avatar} alt="" className="w-7 h-7 rounded-full object-cover" />
              : <div className="w-7 h-7 rounded-full bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center text-white text-xs font-bold">
                  {msg.sender_name?.[0]}
                </div>
            }
            {msg.sender_is_verified && (
              <span className="absolute -bottom-0.5 -right-0.5">
                <VerifiedBadge level={msg.sender_badge_level} size="sm" tooltip={false} />
              </span>
            )}
          </div>
        )}
      </div>

      <div className={`flex flex-col ${isMine ? 'items-end' : 'items-start'} max-w-[70%]`}>
        {/* Bubble */}
        {isImage ? (
          <div className={`rounded-2xl overflow-hidden ${isMine ? 'rounded-br-sm' : 'rounded-bl-sm'}`}>
            <img
              src={msg.image_url}
              alt="Shared image"
              className="max-w-[240px] max-h-[300px] object-cover cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => window.open(msg.image_url, '_blank')}
            />
          </div>
        ) : isOffer ? (
          <div className={`rounded-2xl p-4 min-w-[200px] border-2
            ${isMine
              ? 'bg-gradient-to-br from-red-600 to-rose-700 border-red-500 text-white rounded-br-sm'
              : 'bg-white border-red-200 rounded-bl-sm'
            }`}>
            <div className="flex items-center gap-2 mb-2">
              <DollarSign size={16} className={isMine ? 'text-red-200' : 'text-red-500'} />
              <span className={`text-xs font-semibold uppercase tracking-wide ${isMine ? 'text-red-200' : 'text-red-500'}`}>
                Price Offer
              </span>
            </div>
            <p className={`text-2xl font-bold font-display mb-1 ${isMine ? 'text-white' : 'text-gray-900'}`}>
              ₹{parseFloat(msg.offer_amount).toLocaleString('en-IN')}
            </p>
            {msg.message && (
              <p className={`text-xs mb-3 ${isMine ? 'text-red-100' : 'text-gray-500'}`}>{msg.message}</p>
            )}

            {/* Offer status badge */}
            {msg.offer_status !== 'pending' && (
              <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-semibold
                ${msg.offer_status === 'accepted' ? 'bg-green-100 text-green-700'
                  : msg.offer_status === 'rejected' ? 'bg-red-100 text-red-700'
                  : 'bg-yellow-100 text-yellow-700'}`}>
                {msg.offer_status.charAt(0).toUpperCase() + msg.offer_status.slice(1)}
              </span>
            )}

            {/* Receiver actions */}
            {!isMine && msg.offer_status === 'pending' && (
              <div className="mt-3 space-y-2">
                {showCounter ? (
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={counterVal}
                      onChange={e => setCounterVal(e.target.value)}
                      placeholder="Counter amount"
                      className="flex-1 px-2 py-1 text-xs border border-gray-200 rounded-lg text-gray-900"
                    />
                    <button
                      onClick={() => { onOfferRespond(msg.id, 'countered', counterVal); setShowCounter(false); }}
                      className="px-2 py-1 bg-yellow-500 text-white text-xs rounded-lg font-semibold"
                    >
                      Send
                    </button>
                    <button onClick={() => setShowCounter(false)} className="p-1 text-gray-400 hover:text-gray-600">
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={() => onOfferRespond(msg.id, 'accepted')}
                      className="flex-1 py-1.5 bg-green-500 text-white text-xs rounded-lg font-semibold hover:bg-green-600 transition-colors"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => onOfferRespond(msg.id, 'rejected')}
                      className="flex-1 py-1.5 bg-red-100 text-red-600 text-xs rounded-lg font-semibold hover:bg-red-200 transition-colors"
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => setShowCounter(true)}
                      className="flex-1 py-1.5 bg-yellow-50 text-yellow-700 text-xs rounded-lg font-semibold hover:bg-yellow-100 transition-colors"
                    >
                      Counter
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed
            ${isMine
              ? 'bg-gradient-to-br from-red-600 to-rose-700 text-white rounded-br-sm'
              : 'bg-gray-100 text-gray-900 rounded-bl-sm'
            }`}>
            {msg.message}
          </div>
        )}

        {/* Meta row */}
        <div className={`flex items-center gap-1.5 mt-1 px-1 ${isMine ? 'flex-row-reverse' : ''}`}>
          <span className="text-xs text-gray-400">{formatTime(msg.created_at)}</span>
          {isMine && (
            msg.is_read
              ? <CheckCheck size={13} className="text-red-400" />
              : <Check size={13} className="text-gray-400" />
          )}
          {/* Delete button — only sender, only on hover */}
          {isMine && (
            <button
              onClick={() => onDelete(msg.id)}
              className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition-all ml-1"
            >
              <Trash2 size={12} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
