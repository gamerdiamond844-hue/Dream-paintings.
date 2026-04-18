import { useLocation, useNavigate, Link } from 'react-router-dom';
import { CheckCircle, Package, ArrowRight } from 'lucide-react';

export default function OrderSuccess() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const order = state?.order;
  const painting = state?.painting;

  if (!order) { navigate('/gallery'); return null; }

  return (
    <div className="content-layer min-h-screen pt-20 pb-16 bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full mx-auto px-4">
        <div className="bg-white rounded-3xl border border-gray-100 shadow-xl p-8 text-center page-enter">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle size={40} className="text-green-600" />
          </div>
          <h1 className="font-display text-3xl font-bold text-gray-900 mb-2">Order Placed!</h1>
          <p className="text-gray-500 mb-6">Your order has been submitted successfully. Admin will verify your payment and confirm the order.</p>

          <div className="bg-gray-50 rounded-2xl p-4 mb-6 text-left space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Order ID</span>
              <span className="font-bold text-gray-900">#{order.order_id}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Painting</span>
              <span className="font-medium text-gray-900 text-right max-w-40 truncate">{painting?.title}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Amount</span>
              <span className="font-bold gradient-text">₹{parseFloat(order.amount).toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Status</span>
              <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full text-xs font-semibold">Pending Verification</span>
            </div>
          </div>

          <div className="bg-blue-50 rounded-xl p-3 mb-6 text-xs text-blue-700">
            📧 You'll receive a notification once your order is approved. Check your order history for updates.
          </div>

          <div className="flex gap-3">
            <Link to="/orders" className="flex-1 btn-primary py-3 rounded-xl font-semibold flex items-center justify-center gap-2 text-sm">
              <Package size={16} /> My Orders
            </Link>
            <Link to="/gallery" className="flex-1 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 text-sm border-2 border-gray-200 text-gray-600 hover:border-red-400 hover:text-red-600 transition-all">
              Gallery <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
