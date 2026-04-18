import { useState, useEffect, useCallback } from 'react';
import { CheckCircle, XCircle, Clock, PauseCircle, Banknote, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../../utils/api';

const STATUS_TABS = ['all', 'pending', 'approved', 'on_hold', 'paid', 'rejected'];

const STATUS_COLOR = {
  pending:  'text-yellow-700 bg-yellow-50 border-yellow-200',
  approved: 'text-blue-700 bg-blue-50 border-blue-200',
  rejected: 'text-red-700 bg-red-50 border-red-200',
  on_hold:  'text-orange-700 bg-orange-50 border-orange-200',
  paid:     'text-green-700 bg-green-50 border-green-200',
};

const ACTION_OPTIONS = {
  pending:  [{ value: 'approve', label: '✅ Approve' }, { value: 'reject', label: '❌ Reject' }, { value: 'modify', label: '✏️ Modify Amount' }, { value: 'hold', label: '⚠️ Put on Hold' }],
  approved: [{ value: 'mark_paid', label: '💸 Mark as Paid' }, { value: 'reject', label: '❌ Reject' }],
  on_hold:  [{ value: 'release_hold', label: '🔓 Release Hold' }, { value: 'reject', label: '❌ Reject' }],
  rejected: [],
  paid:     [],
};

function StatCard({ label, count, amount, color }) {
  return (
    <div className={`rounded-2xl p-4 border ${color} bg-white`}>
      <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">{label}</p>
      <p className="text-2xl font-bold text-gray-900 mt-1">{count}</p>
      <p className="text-sm text-gray-500 mt-0.5">₹{parseFloat(amount || 0).toLocaleString('en-IN')}</p>
    </div>
  );
}

function ActionModal({ withdrawal, onClose, onDone }) {
  const [action, setAction] = useState('');
  const [reason, setReason] = useState('');
  const [modifiedAmount, setModifiedAmount] = useState('');
  const [holdAmount, setHoldAmount] = useState('');
  const [loading, setLoading] = useState(false);

  const actions = ACTION_OPTIONS[withdrawal.status] || [];

  const handleSubmit = async () => {
    if (!action) return toast.error('Select an action');
    if (!reason.trim()) return toast.error('Reason is required');
    if (action === 'modify' && (!modifiedAmount || parseFloat(modifiedAmount) <= 0))
      return toast.error('Enter a valid modified amount');
    if (action === 'hold' && (!holdAmount || parseFloat(holdAmount) < 0))
      return toast.error('Enter a valid hold amount');

    setLoading(true);
    try {
      await api.put(`/admin/withdrawals/${withdrawal.id}`, {
        action, reason,
        modified_amount: modifiedAmount || undefined,
        hold_amount: holdAmount || undefined,
      });
      toast.success('Withdrawal updated. Seller has been notified.');
      onDone();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Action failed');
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg text-gray-900">Manage Withdrawal #{withdrawal.id}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        {/* Seller info */}
        <div className="p-3 bg-gray-50 rounded-xl mb-4 text-sm">
          <p className="font-semibold text-gray-800">{withdrawal.seller_name}</p>
          <p className="text-gray-500 text-xs">{withdrawal.seller_email}</p>
          <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
            <div><span className="text-gray-400">Bank:</span> <span className="font-medium">{withdrawal.bank_name}</span></div>
            <div><span className="text-gray-400">IFSC:</span> <span className="font-medium">{withdrawal.ifsc_code}</span></div>
            <div><span className="text-gray-400">Account:</span> <span className="font-medium">{withdrawal.account_number_masked}</span></div>
            {withdrawal.upi_id && <div><span className="text-gray-400">UPI:</span> <span className="font-medium">{withdrawal.upi_id}</span></div>}
          </div>
        </div>

        {/* Amount breakdown */}
        <div className="p-3 bg-gray-50 rounded-xl mb-4 text-sm space-y-1.5">
          <div className="flex justify-between">
            <span className="text-gray-500">Original Amount</span>
            <span className="font-semibold">₹{parseFloat(withdrawal.original_amount).toLocaleString('en-IN')}</span>
          </div>
          {withdrawal.modified_amount && (
            <div className="flex justify-between">
              <span className="text-yellow-600">Modified Amount</span>
              <span className="font-semibold text-yellow-700">₹{parseFloat(withdrawal.modified_amount).toLocaleString('en-IN')}</span>
            </div>
          )}
          {parseFloat(withdrawal.hold_amount || 0) > 0 && (
            <div className="flex justify-between">
              <span className="text-red-600">Hold Amount</span>
              <span className="font-semibold text-red-700">₹{parseFloat(withdrawal.hold_amount).toLocaleString('en-IN')}</span>
            </div>
          )}
          <div className="flex justify-between border-t pt-1.5">
            <span className="font-semibold">Final Payable</span>
            <span className="font-bold text-green-700">₹{parseFloat(withdrawal.final_amount || withdrawal.original_amount).toLocaleString('en-IN')}</span>
          </div>
        </div>

        {actions.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">No actions available for this status.</p>
        ) : (
          <>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Action</label>
              <select value={action} onChange={e => setAction(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-red-200">
                <option value="">Select action…</option>
                {actions.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
              </select>
            </div>

            {action === 'modify' && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Modified Amount <span className="text-gray-400 font-normal">(max ₹{parseFloat(withdrawal.original_amount).toLocaleString('en-IN')})</span>
                </label>
                <input type="number" value={modifiedAmount} onChange={e => setModifiedAmount(e.target.value)}
                  placeholder="Enter modified amount"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-red-200" />
              </div>
            )}

            {action === 'hold' && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Hold Amount</label>
                <input type="number" value={holdAmount} onChange={e => setHoldAmount(e.target.value)}
                  placeholder="Amount to hold"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-red-200" />
                <p className="text-xs text-gray-400 mt-1">Remaining payable: ₹{Math.max(0, (parseFloat(withdrawal.modified_amount || withdrawal.original_amount) - (parseFloat(holdAmount) || 0))).toLocaleString('en-IN')}</p>
              </div>
            )}

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Reason <span className="text-red-500">*</span>
                <span className="text-gray-400 font-normal ml-1">(shown to seller as "DreamPaintings Team")</span>
              </label>
              <textarea value={reason} onChange={e => setReason(e.target.value)} rows={3}
                placeholder="Provide a clear reason for this action…"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm resize-none outline-none focus:ring-2 focus:ring-red-200" />
            </div>

            <div className="flex gap-3">
              <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={handleSubmit} disabled={loading}
                className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 disabled:opacity-50">
                {loading ? 'Processing…' : 'Confirm Action'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function AuditTimeline({ id }) {
  const [logs, setLogs] = useState(null);
  useEffect(() => {
    api.get(`/admin/withdrawals/${id}/audit`).then(r => setLogs(r.data)).catch(() => setLogs([]));
  }, [id]);
  if (!logs) return <p className="text-xs text-gray-400 p-3">Loading…</p>;
  if (!logs.length) return <p className="text-xs text-gray-400 p-3">No audit history yet.</p>;
  return (
    <div className="p-4 bg-gray-50 border-t border-gray-100 space-y-3">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Audit Timeline</p>
      {logs.map((l, i) => (
        <div key={i} className="flex gap-3 text-xs">
          <div className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 flex-shrink-0" />
          <div>
            <p className="font-medium text-gray-700 capitalize">{l.action.replace('_', ' ')}</p>
            {l.reason && <p className="text-gray-500 mt-0.5">{l.reason}</p>}
            <p className="text-gray-400 mt-0.5">{l.performed_by} · {new Date(l.created_at).toLocaleString('en-IN')}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function WithdrawalsSection() {
  const [stats, setStats] = useState(null);
  const [withdrawals, setWithdrawals] = useState([]);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);
  const [expandedAudit, setExpandedAudit] = useState(null);
  const LIMIT = 15;

  const load = useCallback(async () => {
    try {
      const params = { page, limit: LIMIT };
      if (statusFilter !== 'all') params.status = statusFilter;
      const [s, w] = await Promise.all([
        api.get('/admin/withdrawals/stats'),
        api.get('/admin/withdrawals', { params }),
      ]);
      setStats(s.data);
      setWithdrawals(w.data.withdrawals);
      setTotal(w.data.total);
    } catch { toast.error('Failed to load withdrawals'); }
  }, [statusFilter, page]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-6">
      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Pending" count={stats.pending.count} amount={stats.pending.amount} color="border-yellow-200" />
          <StatCard label="Approved" count={stats.approved.count} amount={stats.approved.amount} color="border-blue-200" />
          <StatCard label="Paid Out" count={stats.paid.count} amount={stats.paid.amount} color="border-green-200" />
          <StatCard label="Total" count={stats.total.count} amount={stats.total.amount} color="border-gray-200" />
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2">
        {STATUS_TABS.map(s => (
          <button key={s} onClick={() => { setStatusFilter(s); setPage(1); }}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold capitalize transition-all
              ${statusFilter === s ? 'bg-red-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-red-300'}`}>
            {s === 'all' ? 'All' : s.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {withdrawals.length === 0 ? (
          <div className="p-10 text-center text-gray-400 text-sm">No withdrawal requests found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-xs text-gray-500 uppercase tracking-wider">
                  <th className="px-4 py-3 text-left">Seller</th>
                  <th className="px-4 py-3 text-left">Amount</th>
                  <th className="px-4 py-3 text-left">Bank Details</th>
                  <th className="px-4 py-3 text-left">Date</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {withdrawals.map(w => (
                  <>
                    <tr key={w.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{w.seller_name}</p>
                        <p className="text-xs text-gray-400">{w.seller_email}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-gray-900">₹{parseFloat(w.original_amount).toLocaleString('en-IN')}</p>
                        {w.final_amount && parseFloat(w.final_amount) !== parseFloat(w.original_amount) && (
                          <p className="text-xs text-green-600 font-medium">Final: ₹{parseFloat(w.final_amount).toLocaleString('en-IN')}</p>
                        )}
                        {parseFloat(w.hold_amount || 0) > 0 && (
                          <p className="text-xs text-red-500">Hold: ₹{parseFloat(w.hold_amount).toLocaleString('en-IN')}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-gray-700">{w.bank_name}</p>
                        <p className="text-xs text-gray-400">{w.account_number_masked} · {w.ifsc_code}</p>
                        {w.upi_id && <p className="text-xs text-gray-400">{w.upi_id}</p>}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {new Date(w.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border capitalize ${STATUS_COLOR[w.status]}`}>
                          {w.status.replace('_', ' ')}
                        </span>
                        {w.admin_action_reason && (
                          <p className="text-xs text-gray-400 mt-1 max-w-[140px] truncate" title={w.admin_action_reason}>{w.admin_action_reason}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {ACTION_OPTIONS[w.status]?.length > 0 && (
                            <button onClick={() => setSelected(w)}
                              className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-semibold hover:bg-red-700 transition-colors">
                              Manage
                            </button>
                          )}
                          <button onClick={() => setExpandedAudit(expandedAudit === w.id ? null : w.id)}
                            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
                            {expandedAudit === w.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </button>
                        </div>
                      </td>
                    </tr>
                    {expandedAudit === w.id && (
                      <tr key={`audit-${w.id}`}>
                        <td colSpan={6} className="p-0">
                          <AuditTimeline id={w.id} />
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {total > LIMIT && (
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>Showing {Math.min((page - 1) * LIMIT + 1, total)}–{Math.min(page * LIMIT, total)} of {total}</span>
          <div className="flex gap-2">
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
              className="px-3 py-1.5 border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50">Prev</button>
            <button disabled={page * LIMIT >= total} onClick={() => setPage(p => p + 1)}
              className="px-3 py-1.5 border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50">Next</button>
          </div>
        </div>
      )}

      {selected && (
        <ActionModal withdrawal={selected} onClose={() => setSelected(null)} onDone={load} />
      )}
    </div>
  );
}
