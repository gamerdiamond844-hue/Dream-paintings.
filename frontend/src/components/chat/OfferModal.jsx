import { useState } from 'react';
import { X, Tag } from 'lucide-react';

export default function OfferModal({ painting, onSend, onClose }) {
  const [amount, setAmount] = useState(painting?.price ? Math.floor(painting.price * 0.9) : '');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!amount || isNaN(amount) || Number(amount) <= 0) return;
    onSend(Number(amount));
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-red-50 rounded-xl flex items-center justify-center">
              <Tag size={18} className="text-red-600" />
            </div>
            <h3 className="font-display text-lg font-bold text-gray-900">Send Offer</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
            <X size={18} className="text-gray-500" />
          </button>
        </div>

        {painting && (
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-2xl mb-5">
            {painting.image && (
              <img src={painting.image} alt="" className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />
            )}
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">{painting.title}</p>
              <p className="text-xs text-gray-500">Listed at ₹{parseFloat(painting.price).toLocaleString('en-IN')}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Your Offer (₹)</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-semibold">₹</span>
              <input
                type="number"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="Enter amount"
                min="1"
                className="w-full pl-8 pr-4 py-3 border border-gray-200 rounded-xl text-sm font-semibold text-gray-900"
                autoFocus
              />
            </div>
            {painting?.price && (
              <p className="text-xs text-gray-400 mt-1">
                {amount && Number(amount) < painting.price
                  ? `${Math.round((1 - amount / painting.price) * 100)}% below listed price`
                  : 'Enter your best offer'}
              </p>
            )}
          </div>

          <div className="flex gap-3">
            <button type="button" onClick={onClose}
              className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={!amount || Number(amount) <= 0}
              className="flex-1 py-3 rounded-xl btn-primary text-sm font-semibold disabled:opacity-40">
              Send Offer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
