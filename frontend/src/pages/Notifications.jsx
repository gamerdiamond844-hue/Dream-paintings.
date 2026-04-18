import { useState, useEffect } from 'react';
import { Bell, Check, Trash2 } from 'lucide-react';
import api from '../utils/api';
import LoadingSpinner from '../components/LoadingSpinner';

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/notifications')
      .then(res => {
        setNotifications(res.data);
        // Mark all as read after fetching
        if (res.data.some(n => !n.is_read)) {
          api.put('/notifications/read').catch(() => {});
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="content-layer min-h-screen pt-24 pb-16">
      <div className="max-w-2xl mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
              <Bell size={20} className="text-red-600" />
            </div>
            <h1 className="font-display text-4xl font-bold text-gray-900">Notifications</h1>
          </div>
          {notifications.length > 0 && (
            <span className="text-sm text-gray-400">{notifications.length} total</span>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-20 bg-gray-50 rounded-3xl">
            <Bell size={48} className="text-gray-200 mx-auto mb-4" />
            <p className="text-gray-400 font-medium">No notifications yet</p>
            <p className="text-gray-300 text-sm mt-1">You'll see updates about your purchases and paintings here</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map(n => (
              <div
                key={n.id}
                className={`p-4 rounded-2xl border transition-all ${
                  n.is_read
                    ? 'bg-white border-gray-100'
                    : 'bg-red-50 border-red-200 shadow-sm shadow-red-100'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                    n.is_read ? 'bg-gray-100' : 'bg-red-100'
                  }`}>
                    {n.is_read
                      ? <Check size={15} className="text-gray-400" />
                      : <Bell size={15} className="text-red-600" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm leading-relaxed ${n.is_read ? 'text-gray-600' : 'text-gray-900 font-medium'}`}>
                      {n.message}
                    </p>
                    <p className="text-xs text-gray-400 mt-1.5">
                      {new Date(n.created_at).toLocaleString('en-IN', {
                        day: 'numeric', month: 'short', year: 'numeric',
                        hour: '2-digit', minute: '2-digit'
                      })}
                    </p>
                  </div>
                  {!n.is_read && (
                    <div className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0 mt-1.5" />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
