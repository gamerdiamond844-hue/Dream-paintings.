import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Phone, Mail, MapPin, FileText, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';

const Field = ({ label, required, error, children }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1.5">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    {children}
    {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
  </div>
);

const Input = ({ className = '', ...props }) => (
  <input className={`w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:border-red-400 transition-all bg-white ${className}`} {...props} />
);

export default function CustomerDetails() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const painting = state?.painting;

  const [form, setForm] = useState({
    full_name: '', mobile: '', whatsapp: '', alternate_contact: '',
    email: '', address: '', city: '', state: '', pincode: '', landmark: '', notes: '',
  });
  const [errors, setErrors] = useState({});

  if (!painting) {
    navigate('/gallery');
    return null;
  }

  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: '' })); };

  const validate = () => {
    const e = {};
    if (!form.full_name.trim()) e.full_name = 'Full name is required';
    if (!/^[6-9]\d{9}$/.test(form.mobile)) e.mobile = 'Enter valid 10-digit mobile number';
    if (form.whatsapp && !/^[6-9]\d{9}$/.test(form.whatsapp)) e.whatsapp = 'Enter valid WhatsApp number';
    if (form.alternate_contact && !/^[6-9]\d{9}$/.test(form.alternate_contact)) e.alternate_contact = 'Enter valid alternate number';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Enter valid email';
    if (!form.address.trim()) e.address = 'Address is required';
    if (!form.city.trim()) e.city = 'City is required';
    if (!form.state.trim()) e.state = 'State is required';
    if (!/^\d{6}$/.test(form.pincode)) e.pincode = 'Enter valid 6-digit pin code';
    return e;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); toast.error('Please fix the errors'); return; }
    navigate('/payment', { state: { painting, customerDetails: form } });
  };

  const price = painting.discount_percent > 0
    ? (parseFloat(painting.price) * (1 - painting.discount_percent / 100)).toFixed(2)
    : parseFloat(painting.price).toFixed(2);

  return (
    <div className="content-layer min-h-screen pt-20 pb-16 bg-gray-50">
      <div className="max-w-3xl mx-auto px-4">
        {/* Header */}
        <button onClick={() => navigate(-1)} className="inline-flex items-center gap-2 text-gray-500 hover:text-red-600 transition-colors mb-6 text-sm">
          <ArrowLeft size={16} /> Back
        </button>

        {/* Steps */}
        <div className="flex items-center gap-2 mb-8">
          {['Customer Details', 'Payment', 'Confirmation'].map((s, i) => (
            <div key={s} className="flex items-center gap-2 flex-1">
              <div className={`flex items-center gap-2 ${i === 0 ? 'text-red-600' : 'text-gray-400'}`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 ${i === 0 ? 'border-red-600 bg-red-600 text-white' : 'border-gray-300 text-gray-400'}`}>{i + 1}</div>
                <span className="text-sm font-medium hidden sm:block">{s}</span>
              </div>
              {i < 2 && <div className={`flex-1 h-0.5 ${i === 0 ? 'bg-red-200' : 'bg-gray-200'}`} />}
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Form */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h1 className="font-display text-2xl font-bold text-gray-900 mb-6">Customer Details</h1>
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Personal Info */}
                <div className="flex items-center gap-2 text-red-600 mb-2">
                  <User size={16} /><span className="text-sm font-semibold">Personal Information</span>
                </div>
                <Field label="Full Name" required error={errors.full_name}>
                  <Input placeholder="Enter your full name" value={form.full_name} onChange={e => set('full_name', e.target.value)} />
                </Field>
                <Field label="Email Address" required error={errors.email}>
                  <Input type="email" placeholder="your@email.com" value={form.email} onChange={e => set('email', e.target.value)} />
                </Field>

                {/* Contact */}
                <div className="flex items-center gap-2 text-red-600 mt-4 mb-2">
                  <Phone size={16} /><span className="text-sm font-semibold">Contact Numbers</span>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <Field label="Mobile Number" required error={errors.mobile}>
                    <Input placeholder="10-digit mobile" maxLength={10} value={form.mobile} onChange={e => set('mobile', e.target.value.replace(/\D/g, ''))} />
                  </Field>
                  <Field label="WhatsApp Number" error={errors.whatsapp}>
                    <Input placeholder="WhatsApp number" maxLength={10} value={form.whatsapp} onChange={e => set('whatsapp', e.target.value.replace(/\D/g, ''))} />
                  </Field>
                </div>
                <Field label="Alternate Contact" error={errors.alternate_contact}>
                  <Input placeholder="Alternate phone (optional)" maxLength={10} value={form.alternate_contact} onChange={e => set('alternate_contact', e.target.value.replace(/\D/g, ''))} />
                </Field>

                {/* Address */}
                <div className="flex items-center gap-2 text-red-600 mt-4 mb-2">
                  <MapPin size={16} /><span className="text-sm font-semibold">Delivery Address</span>
                </div>
                <Field label="Full Address" required error={errors.address}>
                  <textarea
                    rows={3}
                    placeholder="House/Flat no., Street, Area..."
                    value={form.address}
                    onChange={e => set('address', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:border-red-400 transition-all bg-white resize-none"
                  />
                </Field>
                <div className="grid sm:grid-cols-3 gap-4">
                  <Field label="City" required error={errors.city}>
                    <Input placeholder="City" value={form.city} onChange={e => set('city', e.target.value)} />
                  </Field>
                  <Field label="State" required error={errors.state}>
                    <Input placeholder="State" value={form.state} onChange={e => set('state', e.target.value)} />
                  </Field>
                  <Field label="Pin Code" required error={errors.pincode}>
                    <Input placeholder="6-digit pin" maxLength={6} value={form.pincode} onChange={e => set('pincode', e.target.value.replace(/\D/g, ''))} />
                  </Field>
                </div>
                <Field label="Landmark" error={errors.landmark}>
                  <Input placeholder="Near landmark (optional)" value={form.landmark} onChange={e => set('landmark', e.target.value)} />
                </Field>

                {/* Notes */}
                <div className="flex items-center gap-2 text-red-600 mt-4 mb-2">
                  <FileText size={16} /><span className="text-sm font-semibold">Additional Notes</span>
                </div>
                <Field label="Notes">
                  <textarea
                    rows={2}
                    placeholder="Any special instructions (optional)"
                    value={form.notes}
                    onChange={e => set('notes', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:border-red-400 transition-all bg-white resize-none"
                  />
                </Field>

                <button type="submit" className="btn-primary w-full py-4 rounded-2xl font-semibold flex items-center justify-center gap-2 text-base mt-2">
                  Continue to Payment <ChevronRight size={18} />
                </button>
              </form>
            </div>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sticky top-24">
              <h3 className="font-semibold text-gray-900 mb-4">Order Summary</h3>
              <img src={painting.image_url} alt={painting.title} className="w-full h-40 object-cover rounded-xl mb-4" />
              <p className="font-semibold text-gray-900 text-sm mb-1">{painting.title}</p>
              {painting.artist_name && <p className="text-xs text-gray-500 mb-3">by {painting.artist_name}</p>}
              <div className="border-t border-gray-100 pt-3 mt-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Total Amount</span>
                  <span className="font-display text-xl font-bold gradient-text">₹{parseFloat(price).toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
