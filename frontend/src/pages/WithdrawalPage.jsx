import { useState, useEffect, useCallback } from 'react';
import { Wallet, AlertCircle, CheckCircle, XCircle, Clock, PauseCircle, Banknote, ChevronDown, ChevronUp, Download, MessageSquare } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../utils/api';

const STATUS_CONFIG = {
  pending:  { label: 'Pending',  icon: Clock,        color: 'text-yellow-600 bg-yellow-50 border-yellow-200' },
  approved: { label: 'Approved', icon: CheckCircle,  color: 'text-blue-600 bg-blue-50 border-blue-200' },
  rejected: { label: 'Rejected', icon: XCircle,      color: 'text-red-600 bg-red-50 border-red-200' },
  on_hold:  { label: 'On Hold',  icon: PauseCircle,  color: 'text-orange-600 bg-orange-50 border-orange-200' },
  paid:     { label: 'Paid',     icon: Banknote,     color: 'text-green-600 bg-green-50 border-green-200' },
};

const POLICY = [
  'Minimum withdrawal amount is ₹500.',
  'Processing time: 2–5 working days after approval.',
  'Platform may hold funds for disputes or fraud review.',
  'Incorrect bank details are the user\'s responsibility.',
  'Platform fees or commission may be deducted.',
  'Processed withdrawals are non-reversible.',
  'KYC may be required for high-value withdrawals.',
];

const INITIAL_FORM = {
  full_name: '', bank_name: '', account_number: '', ifsc_code: '',
  upi_id: '', amount: '', note: '', policy_agreed: false,
};

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${cfg.color}`}>
      <Icon size={12} /> {cfg.label}
    </span>
  );
}

function AmountBreakdown({ w }) {
  const modified = w.modified_amount != null && parseFloat(w.modified_amount) !== parseFloat(w.original_amount);
  const held = parseFloat(w.hold_amount || 0) > 0;
  return (
    <div className="mt-3 space-y-1.5 text-sm">
      <div className="flex justify-between">
        <span className="text-gray-500">Requested Amount</span>
        <span className="font-medium">₹{parseFloat(w.original_amount).toLocaleString('en-IN')}</span>
      </div>
      {modified && (
        <div className="flex justify-between">
          <span className="text-yellow-600 font-medium">Modified Amount ⚠️</span>
          <span className="font-semibold text-yellow-700">₹{parseFloat(w.modified_amount).toLocaleString('en-IN')}</span>
        </div>
      )}
      {held && (
        <div className="flex justify-between">
          <span className="text-red-600 font-medium">Hold Amount 🔒</span>
          <span className="font-semibold text-red-700">₹{parseFloat(w.hold_amount).toLocaleString('en-IN')}</span>
        </div>
      )}
      <div className="flex justify-between border-t pt-1.5 mt-1.5">
        <span className="font-semibold text-gray-800">Final Payable</span>
        <span className="font-bold text-green-700">₹{parseFloat(w.final_amount || w.original_amount).toLocaleString('en-IN')}</span>
      </div>
      {w.admin_action_reason && (
        <div className="mt-2 p-2.5 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-xs text-gray-500 font-medium">Reason from DreamPaintings Team:</p>
          <p className="text-xs text-gray-700 mt-0.5">{w.admin_action_reason}</p>
        </div>
      )}
    </div>
  );
}

function WithdrawalCard({ w, onDispute }) {
  const [open, setOpen] = useState(false);
  const [timeline, setTimeline] = useState(null);

  const loadTimeline = async () => {
    if (timeline) { setOpen(!open); return; }
    try {
      const r = await api.get(`/withdrawals/${w.id}`);
      setTimeline(r.data.timeline || []);
      setOpen(true);
    } catch { setOpen(!open); }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-semibold text-gray-900">₹{parseFloat(w.original_amount).toLocaleString('en-IN')}</p>
            <p className="text-xs text-gray-400 mt-0.5">{new Date(w.created_at).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })}</p>
          </div>
          <StatusBadge status={w.status} />
        </div>
        <div className="mt-3 text-sm text-gray-600">
          <span className="font-medium">{w.bank_name}</span>
          {w.account_number_masked && <span className="ml-2 text-gray-400">•••• {w.account_number_masked.slice(-4)}</span>}
        </div>
        <AmountBreakdown w={w} />
      </div>
      <div className="border-t border-gray-100 px-5 py-3 flex items-center gap-3">
        <button onClick={loadTimeline} className="flex items-center gap-1.5 text-xs text-red-600 font-medium hover:underline">
          View Details {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </button>
        {['rejected', 'on_hold'].includes(w.status) && (
          <button onClick={() => onDispute(w.id)} className="flex items-center gap-1.5 text-xs text-orange-600 font-medium hover:underline ml-auto">
            <MessageSquare size={12} /> Raise Dispute
          </button>
        )}
      </div>
      {open && timeline && (
        <div className="border-t border-gray-100 px-5 py-4 bg-gray-50">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Timeline</p>
          {timeline.length === 0 && <p className="text-xs text-gray-400">No actions yet.</p>}
          <div className="space-y-3">
            {timeline.map((t, i) => (
              <div key={i} className="flex gap-3 text-xs">
                <div className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-gray-700 capitalize">{t.action.replace('_', ' ')}</p>
                  {t.reason && <p className="text-gray-500 mt-0.5">{t.reason}</p>}
                  <p className="text-gray-400 mt-0.5">{t.performed_by} · {new Date(t.created_at).toLocaleString('en-IN')}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function WithdrawalPage() {
  const [earnings, setEarnings] = useState(null);
  const [withdrawals, setWithdrawals] = useState([]);
  const [form, setForm] = useState(INITIAL_FORM);
  const [showForm, setShowForm] = useState(false);
  const [showPolicy, setShowPolicy] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      const [e, w] = await Promise.all([
        api.get('/withdrawals/earnings'),
        api.get('/withdrawals'),
      ]);
      setEarnings(e.data);
      setWithdrawals(w.data);
    } catch { toast.error('Failed to load withdrawal data'); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleChange = e => {
    const { name, value, type, checked } = e.target;
    setForm(p => ({ ...p, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = async () => {
    setShowConfirm(false);
    setLoading(true);
    try {
      await api.post('/withdrawals', form);
      toast.success('Withdrawal request submitted!');
      setForm(INITIAL_FORM);
      setShowForm(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Submission failed');
    }
    setLoading(false);
  };

  const handleDispute = async (id) => {
    const reason = prompt('Describe your dispute:');
    if (!reason) return;
    try {
      await api.post(`/withdrawals/${id}/dispute`, { reason });
      toast.success('Dispute raised. DreamPaintings Team will review it.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to raise dispute');
    }
  };

  const amt = parseFloat(form.amount) || 0;
  const available = parseFloat(earnings?.withdrawable ?? 0);
  const amtError = amt > 0
    ? amt < 500
      ? 'Minimum ₹500'
      : amt > available
        ? 'Exceeds available balance'
        : null
    : null;

  return (
    <div className="content-layer min-h-screen pt-24 pb-16 bg-gray-50">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-8">
          <p className="text-xs uppercase tracking-widest text-red-600 font-semibold">Seller Dashboard</p>
          <h1 className="font-display text-4xl font-bold text-gray-900 mt-2">Withdraw Earnings</h1>
          <p className="text-gray-500 mt-1 text-sm">Manage your payouts securely. All actions are reviewed by DreamPaintings Team.</p>
        </div>

        {/* Earnings Summary */}
        {earnings && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            {[
              { label: 'Total Earnings', value: earnings.totalEarnings, color: 'text-gray-900' },
              { label: 'Pending / Locked', value: earnings.pending, color: 'text-orange-600' },
              { label: 'Withdrawable', value: earnings.withdrawable, color: 'text-green-700' },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                <p className="text-xs text-gray-400 uppercase tracking-wider">{label}</p>
                <p className={`text-2xl font-bold mt-2 ${color}`}>₹{parseFloat(value || 0).toLocaleString('en-IN')}</p>
              </div>
            ))}
          </div>
        )}

        {/* CTA */}
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="mb-8 flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-red-600 to-rose-600 text-white rounded-xl font-semibold shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all"
          >
            <Wallet size={18} /> Withdraw Earnings
          </button>
        )}

        {/* Withdrawal Form */}
        {showForm && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-8">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold text-lg text-gray-900">New Withdrawal Request</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 text-sm">Cancel</button>
            </div>

            {available < 500 && (
              <div className="flex items-center gap-2 p-3 bg-orange-50 border border-orange-200 rounded-xl mb-5 text-sm text-orange-700">
                <AlertCircle size={16} /> Your withdrawable balance is below ₹500. Minimum withdrawal is ₹500.
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { name: 'full_name', label: 'Full Name (as per bank)', placeholder: 'As on bank account' },
                { name: 'bank_name', label: 'Bank Name', placeholder: 'e.g. State Bank of India' },
                { name: 'account_number', label: 'Account Number', placeholder: 'Bank account number', type: 'password' },
                { name: 'ifsc_code', label: 'IFSC Code', placeholder: 'e.g. SBIN0001234' },
                { name: 'upi_id', label: 'UPI ID (optional)', placeholder: 'e.g. name@upi' },
                { name: 'amount', label: 'Amount to Withdraw (₹)', placeholder: 'Min ₹500', type: 'number' },
              ].map(({ name, label, placeholder, type = 'text' }) => (
                <div key={name}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                  <input
                    type={type} name={name} value={form[name]} onChange={handleChange}
                    placeholder={placeholder}
                    className={`w-full px-4 py-2.5 border rounded-xl text-sm transition-all outline-none focus:ring-2 focus:ring-red-200
                      ${name === 'amount' && amtError ? 'border-red-400' : 'border-gray-200'}`}
                  />
                  {name === 'amount' && amtError && <p className="text-xs text-red-500 mt-1">{amtError}</p>}
                </div>
              ))}
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Note (optional)</label>
                <textarea name="note" value={form.note} onChange={handleChange} rows={2}
                  placeholder="Any additional note..."
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm resize-none outline-none focus:ring-2 focus:ring-red-200" />
              </div>
            </div>

            {/* Policy */}
            <div className="mt-5 p-4 bg-gray-50 rounded-xl border border-gray-200">
              <button onClick={() => setShowPolicy(!showPolicy)} className="flex items-center gap-2 text-sm font-medium text-gray-700 w-full">
                Withdrawal Policy {showPolicy ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
              {showPolicy && (
                <ol className="mt-3 space-y-1.5 list-decimal list-inside text-xs text-gray-600">
                  {POLICY.map((p, i) => <li key={i}>{p}</li>)}
                </ol>
              )}
              <label className="flex items-start gap-2.5 mt-3 cursor-pointer">
                <input type="checkbox" name="policy_agreed" checked={form.policy_agreed} onChange={handleChange}
                  className="mt-0.5 accent-red-600" />
                <span className="text-sm text-gray-700">I agree to the withdrawal policy</span>
              </label>
            </div>

            <button
              onClick={() => {
                if (!form.full_name || !form.bank_name || !form.account_number || !form.ifsc_code)
                  return toast.error('Please fill all required fields.');
                if (amt < 500) return toast.error('Minimum withdrawal is ₹500.');
                if (amtError) return toast.error(amtError);
                if (!form.policy_agreed) return toast.error('Please agree to the withdrawal policy.');
                setShowConfirm(true);
              }}
              disabled={loading}
              className="mt-5 w-full py-3 bg-gradient-to-r from-red-600 to-rose-600 text-white rounded-xl font-semibold disabled:opacity-50 hover:shadow-md transition-all"
            >
              {loading ? 'Submitting…' : 'Submit Withdrawal Request'}
            </button>
          </div>
        )}

        {/* Confirmation Modal */}
        {showConfirm && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
              <h3 className="font-bold text-lg text-gray-900 mb-2">Confirm Withdrawal</h3>
              <p className="text-sm text-gray-600 mb-4">
                You are requesting a withdrawal of <strong>₹{amt.toLocaleString('en-IN')}</strong> to <strong>{form.bank_name}</strong>.
                This will be reviewed by DreamPaintings Team.
              </p>
              <div className="flex gap-3">
                <button onClick={() => setShowConfirm(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50">Cancel</button>
                <button onClick={handleSubmit} className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700">Confirm</button>
              </div>
            </div>
          </div>
        )}

        {/* History */}
        <div>
          <h2 className="font-semibold text-lg text-gray-900 mb-4">Withdrawal History</h2>
          {withdrawals.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center text-gray-400 text-sm">
              No withdrawal requests yet.
            </div>
          ) : (
            <div className="space-y-4">
              {withdrawals.map(w => (
                <WithdrawalCard key={w.id} w={w} onDispute={handleDispute} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
