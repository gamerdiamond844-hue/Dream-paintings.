import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Package, Download, Eye, Clock, CheckCircle, XCircle, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../utils/api';
import LoadingSpinner from '../components/LoadingSpinner';

const STATUS = {
  pending: { label: 'Pending', icon: Clock, cls: 'bg-yellow-100 text-yellow-700' },
  approved: { label: 'Approved', icon: CheckCircle, cls: 'bg-green-100 text-green-700' },
  rejected: { label: 'Rejected', icon: XCircle, cls: 'bg-red-100 text-red-700' },
};

const downloadInvoice = (order) => {
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
  <title>Invoice #${order.order_id}</title>
  <style>
    body{font-family:Arial,sans-serif;max-width:700px;margin:40px auto;color:#111;padding:20px}
    .header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #e11d48;padding-bottom:20px;margin-bottom:24px}
    .brand{font-size:24px;font-weight:bold;color:#e11d48}
    .brand-sub{font-size:12px;color:#666;margin-top:2px}
    .invoice-title{font-size:28px;font-weight:bold;color:#111}
    .invoice-meta{font-size:13px;color:#666;margin-top:4px}
    .section{margin-bottom:20px}
    .section-title{font-size:13px;font-weight:bold;color:#e11d48;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;border-bottom:1px solid #fecdd3;padding-bottom:6px}
    .grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}
    .field label{font-size:11px;color:#888;display:block;margin-bottom:2px}
    .field span{font-size:14px;color:#111;font-weight:500}
    .total-box{background:#fff5f7;border:2px solid #fecdd3;border-radius:12px;padding:16px;text-align:right;margin-top:20px}
    .total-label{font-size:13px;color:#666}
    .total-amount{font-size:28px;font-weight:bold;color:#e11d48}
    .status-badge{display:inline-block;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:bold;background:#d1fae5;color:#065f46}
    .footer{margin-top:40px;text-align:center;font-size:12px;color:#999;border-top:1px solid #eee;padding-top:16px}
  </style></head><body>
  <div class="header">
    <div><div class="brand">🎨 Dream Paintings</div><div class="brand-sub">Premium Art Marketplace</div></div>
    <div style="text-align:right"><div class="invoice-title">INVOICE</div><div class="invoice-meta">#${order.order_id}</div><div class="invoice-meta">${new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</div></div>
  </div>
  <div class="section">
    <div class="section-title">Customer Details</div>
    <div class="grid">
      <div class="field"><label>Full Name</label><span>${order.full_name}</span></div>
      <div class="field"><label>Email</label><span>${order.email}</span></div>
      <div class="field"><label>Mobile</label><span>${order.mobile}</span></div>
      ${order.whatsapp ? `<div class="field"><label>WhatsApp</label><span>${order.whatsapp}</span></div>` : ''}
      <div class="field" style="grid-column:1/-1"><label>Address</label><span>${order.address}, ${order.city}, ${order.state} - ${order.pincode}${order.landmark ? ', Near ' + order.landmark : ''}</span></div>
    </div>
  </div>
  <div class="section">
    <div class="section-title">Painting Details</div>
    <div class="grid">
      <div class="field"><label>Title</label><span>${order.painting_title || 'N/A'}</span></div>
      <div class="field"><label>Artist</label><span>${order.artist_name || 'N/A'}</span></div>
      ${order.transaction_id ? `<div class="field"><label>Transaction ID</label><span>${order.transaction_id}</span></div>` : ''}
      <div class="field"><label>Status</label><span class="status-badge">${order.status.toUpperCase()}</span></div>
    </div>
  </div>
  <div class="total-box">
    <div class="total-label">Total Amount Paid</div>
    <div class="total-amount">₹${parseFloat(order.amount).toLocaleString('en-IN')}</div>
  </div>
  <div class="footer">Thank you for your purchase! • Dream Paintings • This is a computer-generated invoice.</div>
  </body></html>`;

  const win = window.open('', '_blank');
  win.document.write(html);
  win.document.close();
  win.print();
};

export default function OrderHistory() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    api.get('/orders/my')
      .then(r => setOrders(r.data))
      .catch(() => toast.error('Failed to load orders'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="content-layer min-h-screen pt-20 flex items-center justify-center">
      <LoadingSpinner size="lg" />
    </div>
  );

  return (
    <div className="content-layer min-h-screen pt-20 pb-16">
      <div className="max-w-4xl mx-auto px-4">
        <Link to="/gallery" className="inline-flex items-center gap-2 text-gray-500 hover:text-red-600 transition-colors mb-6 text-sm">
          <ArrowLeft size={16} /> Back to Gallery
        </Link>
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center">
            <Package size={20} className="text-red-600" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-gray-900">My Orders</h1>
            <p className="text-sm text-gray-500">{orders.length} order{orders.length !== 1 ? 's' : ''}</p>
          </div>
        </div>

        {orders.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
            <Package size={48} className="text-gray-200 mx-auto mb-4" />
            <p className="text-gray-500 font-medium">No orders yet</p>
            <Link to="/gallery" className="btn-primary inline-flex items-center gap-2 px-6 py-3 rounded-xl mt-4 text-sm font-semibold">
              Browse Gallery
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map(order => {
              const s = STATUS[order.status] || STATUS.pending;
              const Icon = s.icon;
              return (
                <div key={order.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all overflow-hidden">
                  <div className="flex gap-4 p-5">
                    <img src={order.image_url} alt={order.painting_title} className="w-20 h-20 object-cover rounded-xl flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <p className="font-semibold text-gray-900 truncate">{order.painting_title}</p>
                        <span className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0 ${s.cls}`}>
                          <Icon size={11} /> {s.label}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mb-2">Order #{order.order_id} • {new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                      <p className="font-bold gradient-text text-lg">₹{parseFloat(order.amount).toLocaleString('en-IN')}</p>
                      {order.rejection_reason && (
                        <p className="text-xs text-red-600 mt-1 bg-red-50 px-2 py-1 rounded-lg">Reason: {order.rejection_reason}</p>
                      )}
                    </div>
                  </div>
                  <div className="border-t border-gray-50 px-5 py-3 flex items-center justify-between bg-gray-50/50">
                    <button onClick={() => setSelected(selected?.id === order.id ? null : order)}
                      className="text-xs text-gray-500 hover:text-red-600 flex items-center gap-1 transition-colors">
                      <Eye size={13} /> {selected?.id === order.id ? 'Hide' : 'View'} Details
                    </button>
                    {order.status === 'approved' && (
                      <button onClick={() => downloadInvoice(order)}
                        className="flex items-center gap-1.5 text-xs font-semibold text-red-600 hover:text-red-700 transition-colors">
                        <Download size={13} /> Download Invoice
                      </button>
                    )}
                  </div>
                  {selected?.id === order.id && (
                    <div className="px-5 pb-5 border-t border-gray-100 pt-4 grid sm:grid-cols-2 gap-3 text-sm">
                      {[
                        ['Name', order.full_name], ['Email', order.email], ['Mobile', order.mobile],
                        ['WhatsApp', order.whatsapp], ['City', order.city], ['State', order.state],
                        ['Pin Code', order.pincode], ['Transaction ID', order.transaction_id],
                      ].filter(([, v]) => v).map(([label, value]) => (
                        <div key={label}>
                          <span className="text-gray-400 text-xs">{label}</span>
                          <p className="text-gray-800 font-medium">{value}</p>
                        </div>
                      ))}
                      <div className="sm:col-span-2">
                        <span className="text-gray-400 text-xs">Address</span>
                        <p className="text-gray-800 font-medium">{order.address}, {order.city}, {order.state} - {order.pincode}</p>
                      </div>
                      {order.payment_proof && (
                        <div className="sm:col-span-2">
                          <span className="text-gray-400 text-xs block mb-2">Payment Screenshot</span>
                          <img src={order.payment_proof} alt="proof" className="max-h-48 rounded-xl border border-gray-200 object-contain" />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
