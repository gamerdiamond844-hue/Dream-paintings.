import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload, CheckCircle, QrCode, X } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../utils/api';
import LoadingSpinner from '../components/LoadingSpinner';

export default function PaymentPage() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const painting = state?.painting;
  const customerDetails = state?.customerDetails;

  const [qrUrl, setQrUrl] = useState(null);
  const [proofFile, setProofFile] = useState(null);
  const [proofPreview, setProofPreview] = useState(null);
  const [transactionId, setTransactionId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [razorpayLoading, setRazorpayLoading] = useState(false);

  useEffect(() => {
    if (!painting || !customerDetails) { navigate('/gallery'); return; }
    api.get('/orders/qr').then(r => setQrUrl(r.data.qr_url)).catch(() => {});
  }, []);

  if (!painting || !customerDetails) return null;

  const price = painting.discount_percent > 0
    ? (parseFloat(painting.price) * (1 - painting.discount_percent / 100)).toFixed(2)
    : parseFloat(painting.price).toFixed(2);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('File must be under 5MB'); return; }
    setProofFile(file);
    setProofPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async () => {
    if (!proofFile) { toast.error('Please upload payment screenshot'); return; }
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('payment_proof', proofFile);
      fd.append('painting_id', painting.id);
      fd.append('transaction_id', transactionId);
      Object.entries(customerDetails).forEach(([k, v]) => fd.append(k, v));

      const res = await api.post('/orders', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('Order placed successfully! 🎉');
      navigate('/order-success', { state: { order: res.data, painting } });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to place order');
    }
    setSubmitting(false);
  };

  const loadRazorpayScript = () => new Promise((resolve, reject) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => reject(new Error('Failed to load Razorpay SDK'));
    document.body.appendChild(script);
  });

  const handleRazorpayPayment = async () => {
    setRazorpayLoading(true);
    try {
      await loadRazorpayScript();
      const orderResponse = await api.post('/orders/razorpay/create', { painting_id: painting.id });
      const { order_id, amount, currency, key } = orderResponse.data;

      const options = {
        key,
        amount,
        currency,
        name: 'Dream Paintings',
        description: painting.title,
        order_id,
        prefill: {
          name: customerDetails.full_name,
          email: customerDetails.email,
          contact: customerDetails.mobile,
        },
        notes: {
          painting_id: painting.id,
        },
        theme: {
          color: '#dc2626',
        },
        handler: async (response) => {
          try {
            const payload = {
              painting_id: painting.id,
              ...customerDetails,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature,
            };
            const res = await api.post('/orders/razorpay/verify', payload);
            toast.success('Payment successful! Order placed. 🎉');
            navigate('/order-success', { state: { order: res.data, painting } });
          } catch (err) {
            toast.error(err.response?.data?.message || 'Payment verification failed');
          }
        },
        modal: {
          ondismiss: () => setRazorpayLoading(false),
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', () => {
        toast.error('Payment failed. Please try again.');
        setRazorpayLoading(false);
      });
      rzp.open();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Unable to start Razorpay checkout');
      setRazorpayLoading(false);
    }
  };

  return (
    <div className="content-layer min-h-screen pt-20 pb-16 bg-gray-50">
      <div className="max-w-3xl mx-auto px-4">
        <button onClick={() => navigate(-1)} className="inline-flex items-center gap-2 text-gray-500 hover:text-red-600 transition-colors mb-6 text-sm">
          <ArrowLeft size={16} /> Back
        </button>

        {/* Steps */}
        <div className="flex items-center gap-2 mb-8">
          {['Customer Details', 'Payment', 'Confirmation'].map((s, i) => (
            <div key={s} className="flex items-center gap-2 flex-1">
              <div className={`flex items-center gap-2 ${i === 1 ? 'text-red-600' : i === 0 ? 'text-green-600' : 'text-gray-400'}`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 ${i === 1 ? 'border-red-600 bg-red-600 text-white' : i === 0 ? 'border-green-500 bg-green-500 text-white' : 'border-gray-300 text-gray-400'}`}>
                  {i === 0 ? '✓' : i + 1}
                </div>
                <span className="text-sm font-medium hidden sm:block">{s}</span>
              </div>
              {i < 2 && <div className={`flex-1 h-0.5 ${i === 0 ? 'bg-green-200' : 'bg-gray-200'}`} />}
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Payment Panel */}
          <div className="lg:col-span-2 space-y-5">
            {/* QR Code */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-center">
              <div className="flex items-center gap-2 justify-center text-red-600 mb-4">
                <QrCode size={18} /><h2 className="font-semibold text-gray-900">Scan & Pay</h2>
              </div>
              {qrUrl ? (
                <img src={qrUrl} alt="Payment QR" className="w-52 h-52 object-contain mx-auto rounded-2xl border-4 border-red-100 shadow-lg shadow-red-50 mb-4" />
              ) : (
                <div className="w-52 h-52 mx-auto rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
                  <p className="text-gray-400 text-sm">QR not available</p>
                </div>
              )}
              <div className="bg-red-50 rounded-xl p-3 text-sm text-red-700 font-medium">
                Scan the QR code and pay <span className="font-bold">₹{parseFloat(price).toLocaleString('en-IN')}</span>
              </div>
              <p className="text-xs text-gray-400 mt-2">After payment, upload the screenshot below</p>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="flex items-center gap-2 justify-center text-red-600 mb-4">
                <QrCode size={18} /><h2 className="font-semibold text-gray-900">Pay with Razorpay</h2>
              </div>
              <p className="text-sm text-gray-600 mb-4">Complete your payment instantly with secure online checkout.</p>
              <button
                onClick={handleRazorpayPayment}
                disabled={razorpayLoading}
                className="btn-primary w-full py-4 rounded-2xl font-semibold flex items-center justify-center gap-2 text-base disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {razorpayLoading ? 'Opening Razorpay...' : `Pay ₹${parseFloat(price).toLocaleString('en-IN')}`}
              </button>
            </div>

            {/* Upload Proof */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Upload Payment Proof</h3>

              {proofPreview ? (
                <div className="relative mb-4">
                  <img src={proofPreview} alt="proof" className="w-full max-h-64 object-contain rounded-xl border border-gray-200" />
                  <button onClick={() => { setProofFile(null); setProofPreview(null); }}
                    className="absolute top-2 right-2 w-7 h-7 bg-red-600 text-white rounded-full flex items-center justify-center hover:bg-red-700 transition-colors">
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-red-400 hover:bg-red-50 transition-all mb-4">
                  <Upload size={24} className="text-gray-400 mb-2" />
                  <span className="text-sm text-gray-500">Click to upload screenshot</span>
                  <span className="text-xs text-gray-400 mt-1">JPG, PNG up to 5MB</span>
                  <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                </label>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Transaction ID <span className="text-gray-400 text-xs">(optional)</span></label>
                <input
                  value={transactionId}
                  onChange={e => setTransactionId(e.target.value)}
                  placeholder="Enter UPI transaction ID"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:border-red-400 transition-all"
                />
              </div>
            </div>

            <button
              onClick={handleSubmit}
              disabled={submitting || !proofFile}
              className="btn-primary w-full py-4 rounded-2xl font-semibold flex items-center justify-center gap-2 text-base disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? <LoadingSpinner size="sm" /> : <><CheckCircle size={18} /> Submit Order</>}
            </button>
          </div>

          {/* Summary */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sticky top-24">
              <h3 className="font-semibold text-gray-900 mb-4">Order Summary</h3>
              <img src={painting.image_url} alt={painting.title} className="w-full h-36 object-cover rounded-xl mb-3" />
              <p className="font-semibold text-gray-900 text-sm">{painting.title}</p>
              <div className="border-t border-gray-100 pt-3 mt-3 mb-4">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Amount</span>
                  <span className="font-bold gradient-text">₹{parseFloat(price).toLocaleString('en-IN')}</span>
                </div>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 space-y-1.5">
                <p className="text-xs font-semibold text-gray-700 mb-2">Delivery To</p>
                <p className="text-xs text-gray-600 font-medium">{customerDetails.full_name}</p>
                <p className="text-xs text-gray-500">{customerDetails.mobile}</p>
                <p className="text-xs text-gray-500 line-clamp-2">{customerDetails.address}, {customerDetails.city}</p>
                <p className="text-xs text-gray-500">{customerDetails.state} - {customerDetails.pincode}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
