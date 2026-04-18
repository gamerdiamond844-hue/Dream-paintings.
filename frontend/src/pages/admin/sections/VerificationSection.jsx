import { useState, useEffect, useCallback } from 'react';
import { CheckCircle, XCircle, Shield, Trash2, UserPlus, ExternalLink, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../../utils/api';
import VerifiedBadge from '../../../components/VerifiedBadge';

const STATUS_TABS = ['all', 'pending', 'approved', 'rejected'];

function RequestCard({ req, onApprove, onReject, onRemove }) {
  const [rejectReason, setRejectReason] = useState('');
  const [showReject, setShowReject] = useState(false);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
      {/* User info */}
      <div className="flex items-start gap-3">
        {req.avatar_url
          ? <img src={req.avatar_url} alt="" className="w-11 h-11 rounded-full object-cover flex-shrink-0" />
          : <div className="w-11 h-11 rounded-full bg-gradient-to-br from-red-400 to-rose-600 flex items-center justify-center text-white font-bold flex-shrink-0">
              {req.user_name?.[0]}
            </div>
        }
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-gray-900 text-sm">{req.user_name}</span>
            {req.is_verified && <VerifiedBadge level={req.current_badge} size="sm" />}
            <span className="text-xs text-gray-400 capitalize bg-gray-100 px-2 py-0.5 rounded-full">{req.role}</span>
          </div>
          <p className="text-xs text-gray-500 truncate">{req.user_email}</p>
        </div>
        {/* Requested badge */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <VerifiedBadge level={req.badge_level} size="sm" tooltip={false} />
          <span className="text-xs font-semibold text-gray-600 capitalize">{req.badge_level}</span>
        </div>
      </div>

      {/* Application details */}
      <div className="bg-gray-50 rounded-xl p-3 space-y-2">
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wide">Full Name</p>
          <p className="text-sm text-gray-800">{req.full_name}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wide">Reason</p>
          <p className="text-sm text-gray-800 whitespace-pre-wrap">{req.reason}</p>
        </div>
        {req.portfolio_links && (
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide">Portfolio</p>
            <p className="text-sm text-blue-600 break-all">{req.portfolio_links}</p>
          </div>
        )}
        {req.document_url && (
          <a href={req.document_url} target="_blank" rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-red-600 hover:underline">
            <ExternalLink size={12} /> View ID Document
          </a>
        )}
        {req.payment_proof && (
          <a href={req.payment_proof} target="_blank" rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-green-600 hover:underline ml-3">
            <ExternalLink size={12} /> View Payment Proof
          </a>
        )}
      </div>

      {/* Status + date */}
      <div className="flex items-center justify-between text-xs text-gray-400">
        <div className="flex items-center gap-2">
          <span className={`px-2 py-1 rounded-full font-semibold capitalize
            ${req.status === 'pending'  ? 'bg-yellow-100 text-yellow-700' :
              req.status === 'approved' ? 'bg-green-100 text-green-700' :
                                          'bg-red-100 text-red-700'}`}>
            {req.status}
          </span>
          {/* Payment status pill */}
          <span className={`px-2 py-1 rounded-full font-semibold capitalize
            ${req.payment_status === 'paid'    ? 'bg-green-100 text-green-700' :
              req.payment_status === 'pending' ? 'bg-blue-100 text-blue-700' :
                                                  'bg-gray-100 text-gray-500'}`}>
            {req.payment_status === 'paid' ? '💳 Paid' :
             req.payment_status === 'pending' ? '⏳ Proof Submitted' : '💰 Unpaid'}
          </span>
        </div>
        <span>{new Date(req.created_at).toLocaleDateString('en-IN')}</span>
      </div>

      {/* Actions */}
      {req.status === 'pending' && (
        <div className="space-y-2">
          {showReject ? (
            <div className="space-y-2">
              <input
                type="text"
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                placeholder="Rejection reason (optional)"
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm"
              />
              <div className="flex gap-2">
                <button onClick={() => { onReject(req.id, rejectReason); setShowReject(false); }}
                  className="flex-1 py-2 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 transition-colors">
                  Confirm Reject
                </button>
                <button onClick={() => setShowReject(false)}
                  className="px-4 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <button onClick={() => onApprove(req.id)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-green-600 text-white rounded-xl text-sm font-semibold hover:bg-green-700 transition-colors">
                <CheckCircle size={14} /> Approve
              </button>
              <button onClick={() => setShowReject(true)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-red-50 text-red-600 rounded-xl text-sm font-semibold hover:bg-red-100 transition-colors">
                <XCircle size={14} /> Reject
              </button>
            </div>
          )}
        </div>
      )}
      {req.status === 'approved' && (
        <button onClick={() => onRemove(req.user_id)}
          className="w-full flex items-center justify-center gap-1.5 py-2 bg-gray-100 text-gray-600 rounded-xl text-sm font-semibold hover:bg-red-50 hover:text-red-600 transition-colors">
          <Trash2 size={14} /> Remove Badge
        </button>
      )}
    </div>
  );
}

function AssignBadgeModal({ onClose, onAssign }) {
  const [userId, setUserId] = useState('');
  const [level, setLevel] = useState('red');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
        <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
          <UserPlus size={18} className="text-red-600" /> Manually Assign Badge
        </h3>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">User ID</label>
            <input type="number" value={userId} onChange={e => setUserId(e.target.value)}
              placeholder="Enter user ID"
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Badge Level</label>
            <div className="flex gap-2">
              {['red', 'blue'].map(l => (
                <button key={l} onClick={() => setLevel(l)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl border-2 text-sm font-semibold transition-all
                    ${level === l ? 'border-red-500 bg-red-50 text-red-700' : 'border-gray-200 text-gray-600'}`}>
                  <VerifiedBadge level={l} size="sm" tooltip={false} />
                  {l.charAt(0).toUpperCase() + l.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="flex gap-2 mt-5">
          <button onClick={onClose}
            className="flex-1 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">
            Cancel
          </button>
          <button onClick={() => { if (userId) { onAssign(userId, level); onClose(); } else toast.error('Enter a user ID'); }}
            className="flex-1 py-2 btn-primary rounded-xl text-sm font-semibold">
            Assign Badge
          </button>
        </div>
      </div>
    </div>
  );
}

export default function VerificationSection() {
  const [requests, setRequests] = useState([]);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [loading, setLoading] = useState(true);
  const [showAssign, setShowAssign] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = statusFilter !== 'all' ? `?status=${statusFilter}` : '';
      const r = await api.get(`/verification/admin/requests${params}`);
      setRequests(r.data.requests);
      setTotal(r.data.total);
    } catch { toast.error('Failed to load requests'); }
    setLoading(false);
  }, [statusFilter]);

  useEffect(() => { load(); }, [load]);

  const handleApprove = async (id) => {
    try {
      await api.put(`/verification/admin/requests/${id}/approve`);
      toast.success('Badge approved!');
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const handleReject = async (id, reason) => {
    try {
      await api.put(`/verification/admin/requests/${id}/reject`, { rejection_reason: reason });
      toast.success('Request rejected');
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const handleRemove = async (userId) => {
    if (!confirm('Remove this user\'s badge?')) return;
    try {
      await api.delete(`/verification/admin/users/${userId}/badge`);
      toast.success('Badge removed');
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const handleAssign = async (userId, level) => {
    try {
      await api.post(`/verification/admin/users/${userId}/badge`, { badge_level: level });
      toast.success('Badge assigned!');
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-display text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Shield size={22} className="text-red-600" /> Verification Requests
          </h2>
          <p className="text-sm text-gray-500 mt-1">{total} total requests</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load}
            className="p-2 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors">
            <RefreshCw size={16} />
          </button>
          <button onClick={() => setShowAssign(true)}
            className="flex items-center gap-2 px-4 py-2 btn-primary rounded-xl text-sm font-semibold">
            <UserPlus size={15} /> Assign Badge
          </button>
        </div>
      </div>

      {/* Status tabs */}
      <div className="flex gap-2 flex-wrap">
        {STATUS_TABS.map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`px-4 py-2 rounded-full text-sm font-medium capitalize transition-all
              ${statusFilter === s
                ? 'bg-red-600 text-white shadow-sm'
                : 'bg-white border border-gray-200 text-gray-600 hover:border-red-300'}`}>
            {s}
          </button>
        ))}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="skeleton h-64 rounded-2xl" />
          ))}
        </div>
      ) : requests.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <Shield size={40} className="mx-auto mb-3 opacity-30" />
          <p>No {statusFilter !== 'all' ? statusFilter : ''} requests found</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {requests.map(req => (
            <RequestCard
              key={req.id}
              req={req}
              onApprove={handleApprove}
              onReject={handleReject}
              onRemove={handleRemove}
            />
          ))}
        </div>
      )}

      {showAssign && (
        <AssignBadgeModal onClose={() => setShowAssign(false)} onAssign={handleAssign} />
      )}
    </div>
  );
}
