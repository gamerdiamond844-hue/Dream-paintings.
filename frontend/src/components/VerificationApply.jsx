import { useState, useEffect } from 'react';
import { X, Upload, Shield, CheckCircle, Clock, XCircle, QrCode, CreditCard, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../utils/api';
import VerifiedBadge from './VerifiedBadge';

const BADGE_OPTIONS = [
  {
    level: 'red',
    label: 'Red Badge — Premium',
    price: 299,
    display: '₹299',
    color: 'border-red-400 bg-red-50',
    activeColor: 'border-red-600 bg-red-100 ring-2 ring-red-400',
    perks: ['Priority listing', 'Featured artist section', 'Profile glow', 'Premium tag'],
  },
  {
    level: 'blue',
    label: 'Blue Badge — Standard',
    price: 99,
    display: '₹99',
    color: 'border-blue-300 bg-blue-50',
    activeColor: 'border-blue-600 bg-blue-100 ring-2 ring-blue-400',
    perks: ['Verified seller tag', 'Higher search visibility', 'Trust badge on listings'],
  },
];

function StatusBanner({ status }) {
  if (!status) return null;
  const map = {
    pending:  { icon: Clock,       color: 'bg-yellow-50 border-yellow-300 text-yellow-800', text: "Your application is under review. We'll notify you once it's processed." },
    approved: { icon: CheckCircle, color: 'bg-green-50 border-green-300 text-green-800',   text: 'Your badge has been approved! It is now visible on your profile.' },
    rejected: { icon: XCircle,     color: 'bg-red-50 border-red-300 text-red-800',         text: `Your application was not approved.${status.rejection_reason ? ' Reason: ' + status.rejection_reason : ''} You may reapply.` },
  };
  const cfg = map[status.status];
  if (!cfg) return null;
  const Icon = cfg.icon;
  return (
    <div className={`flex items-start gap-3 p-4 rounded-xl border ${cfg.color} mb-4`}>
      <Icon size={18} className="flex-shrink-0 mt-0.5" />
      <p className="text-sm">{cfg.text}</p>
    </div>
  );
}

// ── Step 3: Payment ───────────────────────────────────────────────────────────
function PaymentStep({ requestId, badgeLevel, amount, onSuccess, onBack }) {
  const [qrUrl, setQrUrl] = useState(null);
  const [proofFile, setProofFile] = useState(null);
  const [proofPreview, setProofPreview] = useState(null);
  const [txnId, setTxnId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [rzLoading, setRzLoading] = useState(false);
  const [payMethod, setPayMethod] = useState('upi'); // 'upi' | 'razorpay'

  useEffect(() => {
    api.get('/orders/qr').then(r => setQrUrl(r.data.qr_url)).catch(() => {});
  }, []);

  const loadRazorpay = () => new Promise((resolve, reject) => {
    if (window.Razorpay) return resolve(true);
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = () => resolve(true);
    s.onerror = () => reject(new Error('Failed to load Razorpay'));
    document.body.appendChild(s);
  });

  const handleRazorpay = async () => {
    setRzLoading(true);
    try {
      await loadRazorpay();
      const { data } = await api.post(`/verification/${requestId}/pay/razorpay`);
      const options = {
        key: data.key,
        amount: data.amount,
        currency: data.currency,
        name: 'Dream Paintings',
        description: `${badgeLevel === 'red' ? 'Red Premium' : 'Blue Standard'} Verified Badge`,
        order_id: data.order_id,
        theme: { color: '#dc2626' },
        handler: async (response) => {
          try {
            await api.post(`/verification/${requestId}/pay/razorpay/verify`, {
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id:   response.razorpay_order_id,
              razorpay_signature:  response.razorpay_signature,
            });
            toast.success('Payment successful! Badge activated 🎉');
            onSuccess();
          } catch (err) {
            toast.error(err.response?.data?.message || 'Payment verification failed');
          }
        },
        modal: { ondismiss: () => setRzLoading(false) },
      };
      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', () => {
        toast.error('Payment failed. Please try again.');
        setRzLoading(false);
      });
      rzp.open();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Unable to start payment');
      setRzLoading(false);
    }
  };

  const handleUpiSubmit = async () => {
    if (!proofFile) return toast.error('Please upload payment screenshot');
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('payment_proof', proofFile);
      if (txnId) fd.append('transaction_id', txnId);
      await api.post(`/verification/${requestId}/pay/upi`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Payment proof submitted! Admin will verify and activate your badge.');
      onSuccess();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Submission failed');
    }
    setSubmitting(false);
  };

  const opt = BADGE_OPTIONS.find(o => o.level === badgeLevel);

  return (
    <div className="space-y-4">
      {/* Amount banner */}
      <div className="flex items-center justify-between bg-gradient-to-r from-red-50 to-rose-50 border border-red-200 rounded-2xl px-4 py-3">
        <div className="flex items-center gap-2">
          <VerifiedBadge level={badgeLevel} size="sm" tooltip={false} />
          <span className="text-sm font-semibold text-gray-800">{opt?.label}</span>
        </div>
        <span className="text-xl font-black text-red-600">₹{amount}</span>
      </div>

      {/* Method toggle */}
      <div className="grid grid-cols-2 gap-2">
        {[
          { id: 'upi',      icon: QrCode,      label: 'UPI / QR Scan' },
          { id: 'razorpay', icon: CreditCard,   label: 'Card / UPI Online' },
        ].map(m => (
          <button key={m.id} onClick={() => setPayMethod(m.id)}
            className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all
              ${payMethod === m.id
                ? 'border-red-500 bg-red-50 text-red-700'
                : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
            <m.icon size={16} />
            {m.label}
          </button>
        ))}
      </div>

      {payMethod === 'upi' ? (
        <div className="space-y-4">
          {/* QR Code */}
          <div className="text-center">
            {qrUrl ? (
              <img src={qrUrl} alt="Payment QR"
                className="w-44 h-44 object-contain mx-auto rounded-2xl border-4 border-red-100 shadow-lg" />
            ) : (
              <div className="w-44 h-44 mx-auto rounded-2xl bg-gray-100 flex items-center justify-center">
                <p className="text-gray-400 text-xs">QR not available</p>
              </div>
            )}
            <p className="text-xs text-gray-500 mt-2">
              Scan & pay <span className="font-bold text-red-600">₹{amount}</span>, then upload screenshot below
            </p>
          </div>

          {/* Proof upload */}
          {proofPreview ? (
            <div className="relative">
              <img src={proofPreview} alt="proof"
                className="w-full max-h-40 object-contain rounded-xl border border-gray-200" />
              <button onClick={() => { setProofFile(null); setProofPreview(null); }}
                className="absolute top-2 right-2 w-6 h-6 bg-red-600 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-700">
                ✕
              </button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-red-400 hover:bg-red-50 transition-all">
              <Upload size={20} className="text-gray-400 mb-1" />
              <span className="text-sm text-gray-500">Upload payment screenshot</span>
              <span className="text-xs text-gray-400">JPG, PNG up to 5MB</span>
              <input type="file" accept="image/*" className="hidden"
                onChange={e => {
                  const f = e.target.files[0];
                  if (!f) return;
                  if (f.size > 5 * 1024 * 1024) return toast.error('File must be under 5MB');
                  setProofFile(f);
                  setProofPreview(URL.createObjectURL(f));
                }} />
            </label>
          )}

          <input value={txnId} onChange={e => setTxnId(e.target.value)}
            placeholder="UPI Transaction ID (optional)"
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm" />

          <button onClick={handleUpiSubmit} disabled={submitting || !proofFile}
            className="w-full btn-primary py-3 rounded-2xl font-semibold disabled:opacity-50 flex items-center justify-center gap-2">
            {submitting ? 'Submitting…' : <><CheckCircle size={16} /> Submit Payment Proof</>}
          </button>
          <p className="text-xs text-gray-400 text-center">
            Admin will verify your payment and activate the badge within 24 hours.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-gray-600 text-center">
            Pay securely via Razorpay. Badge activates instantly after payment.
          </p>
          <button onClick={handleRazorpay} disabled={rzLoading}
            className="w-full btn-primary py-4 rounded-2xl font-semibold text-base disabled:opacity-50 flex items-center justify-center gap-2">
            {rzLoading ? 'Opening Razorpay…' : `Pay ₹${amount} with Razorpay`}
          </button>
          <p className="text-xs text-gray-400 text-center">
            Supports UPI, Credit/Debit cards, Net Banking & Wallets
          </p>
        </div>
      )}

      <button onClick={onBack}
        className="w-full flex items-center justify-center gap-1.5 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors">
        <ArrowLeft size={14} /> Back to application
      </button>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function VerificationApply({ onClose, currentStatus, onSuccess }) {
  const [step, setStep] = useState(1);       // 1=badge, 2=form, 3=payment
  const [badgeLevel, setBadgeLevel] = useState('red');
  const [form, setForm] = useState({ full_name: '', reason: '', portfolio_links: '' });
  const [docFile, setDocFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [requestId, setRequestId] = useState(null); // set after step 2 submit

  const canApply = !currentStatus ||
    currentStatus.status === 'rejected' ||
    currentStatus.status === null;

  // If user has a pending-payment application, jump straight to payment
  useEffect(() => {
    if (currentStatus?.status === 'pending' && currentStatus?.payment_status === 'unpaid') {
      setRequestId(currentStatus.id);
      setBadgeLevel(currentStatus.badge_level);
      setStep(3);
    }
  }, [currentStatus]);

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!form.full_name.trim() || !form.reason.trim())
      return toast.error('Full name and reason are required');

    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('full_name', form.full_name.trim());
      fd.append('reason', form.reason.trim());
      fd.append('portfolio_links', form.portfolio_links.trim());
      fd.append('badge_level', badgeLevel);
      if (docFile) fd.append('document', docFile);

      const res = await api.post('/verification/apply', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setRequestId(res.data.id);
      setStep(3); // go to payment
    } catch (err) {
      toast.error(err.response?.data?.message || 'Submission failed');
    }
    setSubmitting(false);
  };

  const handlePaymentSuccess = () => {
    onSuccess?.();
    onClose();
  };

  const selectedOpt = BADGE_OPTIONS.find(o => o.level === badgeLevel);

  const stepLabels = ['Choose Badge', 'Application', 'Payment'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="bg-gradient-to-r from-red-600 to-rose-700 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 text-white">
            <Shield size={20} />
            <div>
              <h2 className="font-bold text-base">Apply for Verification</h2>
              <p className="text-red-200 text-xs">Dream Paintings Badge Program</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex items-center px-6 py-3 bg-gray-50 border-b border-gray-100">
          {stepLabels.map((label, i) => {
            const num = i + 1;
            const active = step === num;
            const done = step > num;
            return (
              <div key={label} className="flex items-center flex-1">
                <div className="flex items-center gap-1.5">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all
                    ${done  ? 'bg-green-500 border-green-500 text-white' :
                      active ? 'bg-red-600 border-red-600 text-white' :
                               'border-gray-300 text-gray-400'}`}>
                    {done ? '✓' : num}
                  </div>
                  <span className={`text-xs font-medium hidden sm:block ${active ? 'text-red-600' : done ? 'text-green-600' : 'text-gray-400'}`}>
                    {label}
                  </span>
                </div>
                {i < stepLabels.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-2 ${done ? 'bg-green-300' : 'bg-gray-200'}`} />
                )}
              </div>
            );
          })}
        </div>

        <div className="p-6 max-h-[70vh] overflow-y-auto">
          <StatusBanner status={currentStatus} />

          {!canApply && step !== 3 ? (
            <div className="text-center py-6">
              <CheckCircle size={48} className="mx-auto text-green-500 mb-3" />
              <p className="font-semibold text-gray-900">Application already submitted</p>
              <p className="text-sm text-gray-500 mt-1">Check your notifications for updates.</p>
            </div>

          ) : step === 1 ? (
            <>
              <p className="text-sm text-gray-600 mb-4">Choose the badge level that fits your needs.</p>
              <div className="space-y-3 mb-5">
                {BADGE_OPTIONS.map(opt => (
                  <button key={opt.level} onClick={() => setBadgeLevel(opt.level)}
                    className={`w-full text-left p-4 rounded-2xl border-2 transition-all
                      ${badgeLevel === opt.level ? opt.activeColor : opt.color}`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <VerifiedBadge level={opt.level} size="md" tooltip={false} />
                        <span className="font-semibold text-gray-900 text-sm">{opt.label}</span>
                      </div>
                      <span className="font-black text-gray-900 text-lg">{opt.display}</span>
                    </div>
                    <ul className="space-y-1">
                      {opt.perks.map(p => (
                        <li key={p} className="text-xs text-gray-600 flex items-center gap-1.5">
                          <span className="w-1 h-1 rounded-full bg-gray-400 flex-shrink-0" />
                          {p}
                        </li>
                      ))}
                    </ul>
                  </button>
                ))}
              </div>
              <button onClick={() => setStep(2)}
                className="w-full btn-primary py-3 rounded-2xl font-semibold">
                Continue with {badgeLevel === 'red' ? 'Red' : 'Blue'} Badge →
              </button>
            </>

          ) : step === 2 ? (
            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <VerifiedBadge level={badgeLevel} size="sm" tooltip={false} />
                <span className="text-sm font-semibold text-gray-700">
                  {selectedOpt?.label} — {selectedOpt?.display}
                </span>
                <button type="button" onClick={() => setStep(1)}
                  className="ml-auto text-xs text-red-600 hover:underline">Change</button>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                <input type="text" value={form.full_name}
                  onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))}
                  placeholder="Your legal full name"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm" required />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Why do you deserve this badge? *</label>
                <textarea value={form.reason}
                  onChange={e => setForm(p => ({ ...p, reason: e.target.value }))}
                  placeholder="Describe your work, achievements..."
                  rows={3} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm resize-none" required />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Portfolio / Social Links <span className="text-gray-400">(optional)</span>
                </label>
                <input type="text" value={form.portfolio_links}
                  onChange={e => setForm(p => ({ ...p, portfolio_links: e.target.value }))}
                  placeholder="Instagram, website, Behance..."
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ID / Document Proof <span className="text-gray-400">(optional, max 5MB)</span>
                </label>
                <label className="flex items-center gap-3 px-4 py-3 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-red-300 transition-colors">
                  <Upload size={16} className="text-gray-400 flex-shrink-0" />
                  <span className="text-sm text-gray-500 truncate">
                    {docFile ? docFile.name : 'Click to upload JPG, PNG or PDF'}
                  </span>
                  <input type="file" accept="image/*,.pdf" className="hidden"
                    onChange={e => setDocFile(e.target.files[0] || null)} />
                </label>
              </div>

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setStep(1)}
                  className="flex-1 py-3 rounded-2xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                  Back
                </button>
                <button type="submit" disabled={submitting}
                  className="flex-1 btn-primary py-3 rounded-2xl font-semibold disabled:opacity-50">
                  {submitting ? 'Saving…' : 'Continue to Payment →'}
                </button>
              </div>
            </form>

          ) : step === 3 && requestId ? (
            <PaymentStep
              requestId={requestId}
              badgeLevel={badgeLevel}
              amount={selectedOpt?.price || (badgeLevel === 'red' ? 299 : 99)}
              onSuccess={handlePaymentSuccess}
              onBack={() => setStep(2)}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
