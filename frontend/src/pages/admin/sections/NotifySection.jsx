import { useState, useEffect } from 'react';
import { Bell, Send, Users, Palette, Globe } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../../utils/api';

const TARGET_OPTIONS = [
  { value: 'all', label: 'All Users', icon: Globe, desc: 'Send to every registered user' },
  { value: 'role_user', label: 'All Buyers', icon: Users, desc: 'Send to all buyers only' },
  { value: 'role_artist', label: 'All Artists', icon: Palette, desc: 'Send to all artists only' },
  { value: 'specific', label: 'Specific User', icon: Bell, desc: 'Send to one user by ID' },
];

export default function NotifySection() {
  const [target, setTarget] = useState('all');
  const [userId, setUserId] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [history, setHistory] = useState([]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;
    setSending(true);
    try {
      const payload = { message };
      if (target === 'specific') payload.user_id = userId;
      else if (target === 'role_user') payload.role = 'user';
      else if (target === 'role_artist') payload.role = 'artist';
      const res = await api.post('/admin/notify', payload);
      toast.success(`Notification sent to ${res.data.count} user(s)!`);
      setHistory(h => [{ message, target, count: res.data.count, time: new Date() }, ...h.slice(0, 9)]);
      setMessage('');
      setUserId('');
    } catch { toast.error('Failed to send'); }
    setSending(false);
  };

  return (
    <div className="max-w-2xl space-y-6">
      {/* Target selector */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
        <h3 className="font-semibold text-gray-900 mb-4">Select Recipients</h3>
        <div className="grid grid-cols-2 gap-3">
          {TARGET_OPTIONS.map(({ value, label, icon: Icon, desc }) => (
            <label key={value} className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all
              ${target === value ? 'border-red-500 bg-red-50' : 'border-gray-200 hover:border-red-200'}`}>
              <input type="radio" name="target" value={value} checked={target === value}
                onChange={() => setTarget(value)} className="hidden" />
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5
                ${target === value ? 'bg-red-100' : 'bg-gray-100'}`}>
                <Icon size={15} className={target === value ? 'text-red-600' : 'text-gray-500'} />
              </div>
              <div>
                <p className={`text-sm font-semibold ${target === value ? 'text-red-700' : 'text-gray-700'}`}>{label}</p>
                <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
              </div>
            </label>
          ))}
        </div>
        {target === 'specific' && (
          <div className="mt-4">
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">User ID</label>
            <input type="number" value={userId} onChange={e => setUserId(e.target.value)}
              placeholder="Enter user ID..."
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm" />
          </div>
        )}
      </div>

      {/* Message */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
        <form onSubmit={handleSend} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Message</label>
            <textarea required value={message} onChange={e => setMessage(e.target.value)}
              rows={5} placeholder="Write your notification message here..."
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm resize-none" />
            <p className="text-xs text-gray-400 mt-1">{message.length} characters</p>
          </div>
          <button type="submit" disabled={sending || !message.trim()}
            className="w-full py-3.5 btn-primary rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-50">
            <Send size={16} /> {sending ? 'Sending...' : 'Send Notification'}
          </button>
        </form>
      </div>

      {/* History */}
      {history.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-4 text-sm">Recent Sends (this session)</h3>
          <div className="space-y-3">
            {history.map((h, i) => (
              <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                <div className="w-7 h-7 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Bell size={12} className="text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-700 line-clamp-1">{h.message}</p>
                  <p className="text-xs text-gray-400 mt-0.5">→ {h.target} · {h.count} recipients · {h.time.toLocaleTimeString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
