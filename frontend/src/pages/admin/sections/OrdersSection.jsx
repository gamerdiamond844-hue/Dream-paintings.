import { useState, useEffect, useRef } from 'react';
import { CheckCircle, XCircle, Eye, Upload, QrCode, Clock, X, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../../utils/api';
import LoadingSpinner from '../../../components/LoadingSpinner';

const STATUS = {
  pending: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
};

const downloadInvoice = (order) => {
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Invoice #${order.order_id}</title>
  <style>body{font-family:Arial,sans-serif;max-width:700px;margin:40px auto;color:#111;padding:20px}.header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #e11d48;padding-bottom:20px;margin-bottom:24px}.brand{font-size:24px;font-weight:bold;color:#e11d48}.invoice-title{font-size:28px;font-weight:bold}.section{margin-bottom:20px}.section-title{font-size:13px;font-weight:bold;color:#e11d48;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;border-bottom:1px solid #fecdd3;padding-bottom:6px}.grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}.field label{font-size:11px;color:#888;display:block;margin-bottom:2px}.field span{font-size:14px;font-weight:500}.total-box{background:#fff5f7;border:2px solid #fecdd3;border-radius:12px;padding:16px;text-align:right;margin-top:20px}.total-amount{font-size:28px;font-weight:bold;color:#e11d48}.footer{margin-top:40px;text-align:center;font-size:12px;color:#999;border-top:1px solid #eee;padding-top:16px}</style>
  </head><body>
  <div class="header"><div><div class="brand">🎨 Dream Paintings</div></div><div style="text-align:right"><div class="invoice-title">INVOICE</div><div>#${order.order_id}</div><div>${new Date(order.created_at).toLocaleDateString('en-IN')}</div></div></div>
  <div class="section"><div class="section-title">Customer</div><div class="grid"><div class="field"><label>Name</label><span>${order.full_name}</span></div><div class="field"><label>Email</label><span>${order.email}</span></div><div class="field"><label>Mobile</label><span>${order.mobile}</span></div><div class="field" style="grid-column:1/-1"><label>Address</label><span>${order.address}, ${order.city}, ${order.state} - ${order.pincode}</span></div></div></div>
  <div class="section"><div class="section-title">Painting</div><div class="grid"><div class="field"><label>Title</label><span>${order.painting_title || 'N/A'}</span></div><div class="field"><label>Buyer</label><span>${order.buyer_name}</span></div>${order.transaction_id ? `<div class="field"><label>Transaction ID</label><span>${order.transaction_id}</span></div>` : ''}</div></div>
  <div class="total-box"><div style="font-size:13px;color:#666">Total Amount</div><div class="total-amount">₹${parseFloat(order.amount).toLocaleString('en-IN')}</div></div>
  <div class="footer">Dream Paintings • Computer-generated invoice</div></body></html>`;
  const win = window.open('', '_blank');
  win.document.write(html);
  win.document.close();
  win.print();
};

export default function OrdersSection() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState(null);
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [qrUrl, setQrUrl] = useState(null);
  const [qrUploading, setQrUploading] = useState(false);
  const qrRef = useRef();

  const load = () => {
    setLoading(true);
    Promise.all([
      api.get(`/admin/orders${filter !== 'all' ? `?status=${filter}` : ''}`),
      api.get('/orders/qr'),
    ]).then(([o, q]) => {
      setOrders(o.data.orders);
      setQrUrl(q.data.qr_url);
    }).catch(() => toast.error('Failed to load orders'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [filter]);

  const handleApprove = async (order) => {
    setActionLoading(order.id);
    try {
      await api.put(`/admin/orders/${order.id}/status`, { status: 'approved' });
      toast.success(`Order #${order.order_id} approved!`);
      load();
      setSelected(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
    setActionLoading(null);
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) { toast.error('Please provide a reason'); return; }
    setActionLoading(rejectModal.id);
    try {
      await api.put(`/admin/orders/${rejectModal.id}/status`, { status: 'rejected', rejection_reason: rejectReason });
      toast.success('Order rejected');
      setRejectModal(null);
      setRejectReason('');
      load();
      setSelected(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
    setActionLoading(null);
  };

  const handleQRUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setQrUploading(true);
    const fd = new FormData();
    fd.append('qr', file);
    try {
      const res = await api.post('/admin/qr', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setQrUrl(res.data.qr_url);
      toast.success('QR code updated!');
    } catch {
      toast.error('Failed to upload QR');
    }
    setQrUploading(false);
  };

  const pending = orders.filter(o => o.status === 'pending').length;

  return (
    <div className="space-y-6">
      {/* QR Management */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-4">
          <QrCode size={18} className="text-red-500" />
          <h3 className="font-semibold text-gray-900">Payment QR Code</h3>
        </div>
        <div className="flex items-center gap-6">
          {qrUrl ? (
            <img src={qrUrl} alt="QR" className="w-28 h-28 object-contain rounded-xl border-2 border-red-100" />
          ) : (
            <div className="w-28 h-28 rounded-xl bg-gray-100 flex items-center justify-center">
              <p className="text-xs text-gray-400 text-center">No QR</p>
            </div>
          )}
          <div>
            <p className="text-sm text-gray-600 mb-3">Upload or replace the payment QR code shown to buyers.</p>
            <input ref={qrRef} type="file" accept="image/*" className="hidden" onChange={handleQRUpload} />
            <button onClick={() => qrRef.current.click()} disabled={qrUploading}
              className="btn-primary flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50">
              {qrUploading ? <LoadingSpinner size="sm" /> : <Upload size={15} />}
              {qrUrl ? 'Replace QR' : 'Upload QR'}
            </button>
          </div>
        </div>
      </div>

      {/* Orders */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-gray-900">All Orders</h3>
            {pending > 0 && (
              <span className="text-xs font-bold px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full">{pending} pending</span>
            )}
          </div>
          <div className="flex gap-2">
            {['all', 'pending', 'approved', 'rejected'].map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${filter === f ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                {f}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div>
        ) : orders.length === 0 ? (
          <p className="text-center text-gray-400 py-12 text-sm">No orders found</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['Order', 'Painting', 'Customer', 'Amount', 'Status', 'Date', 'Actions'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {orders.map(o => (
                  <tr key={o.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-4 text-sm font-bold text-gray-900 whitespace-nowrap">#{o.order_id}</td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <img src={o.image_url} alt="" className="w-9 h-9 rounded-lg object-cover flex-shrink-0" />
                        <span className="text-sm text-gray-700 max-w-28 truncate">{o.painting_title}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-sm font-medium text-gray-900">{o.full_name}</p>
                      <p className="text-xs text-gray-500">{o.mobile}</p>
                    </td>
                    <td className="px-4 py-4 text-sm font-bold text-green-600 whitespace-nowrap">₹{parseFloat(o.amount).toLocaleString('en-IN')}</td>
                    <td className="px-4 py-4">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${STATUS[o.status]}`}>{o.status}</span>
                    </td>
                    <td className="px-4 py-4 text-xs text-gray-400 whitespace-nowrap">{new Date(o.created_at).toLocaleDateString('en-IN')}</td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => setSelected(selected?.id === o.id ? null : o)}
                          className="p-1.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-blue-100 hover:text-blue-600 transition-colors" title="View">
                          <Eye size={14} />
                        </button>
                        {o.status === 'pending' && (
                          <>
                            <button onClick={() => handleApprove(o)} disabled={actionLoading === o.id}
                              className="p-1.5 rounded-lg bg-green-100 text-green-600 hover:bg-green-200 transition-colors" title="Approve">
                              {actionLoading === o.id ? <LoadingSpinner size="sm" /> : <CheckCircle size={14} />}
                            </button>
                            <button onClick={() => { setRejectModal(o); setRejectReason(''); }}
                              className="p-1.5 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 transition-colors" title="Reject">
                              <XCircle size={14} />
                            </button>
                          </>
                        )}
                        {o.status === 'approved' && (
                          <button onClick={() => downloadInvoice(o)}
                            className="p-1.5 rounded-lg bg-purple-100 text-purple-600 hover:bg-purple-200 transition-colors" title="Invoice">
                            <Download size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Order Detail Panel */}
      {selected && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 page-enter">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Order #{selected.order_id} — Details</h3>
            <button onClick={() => setSelected(null)} className="p-1.5 rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors"><X size={14} /></button>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm mb-5">
            {[
              ['Full Name', selected.full_name], ['Email', selected.email], ['Mobile', selected.mobile],
              ['WhatsApp', selected.whatsapp], ['Alternate', selected.alternate_contact], ['City', selected.city],
              ['State', selected.state], ['Pin Code', selected.pincode], ['Transaction ID', selected.transaction_id],
            ].filter(([, v]) => v).map(([label, value]) => (
              <div key={label} className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-400 mb-0.5">{label}</p>
                <p className="font-medium text-gray-900">{value}</p>
              </div>
            ))}
            <div className="bg-gray-50 rounded-xl p-3 sm:col-span-2">
              <p className="text-xs text-gray-400 mb-0.5">Address</p>
              <p className="font-medium text-gray-900">{selected.address}, {selected.city}, {selected.state} - {selected.pincode}{selected.landmark ? `, Near ${selected.landmark}` : ''}</p>
            </div>
            {selected.notes && (
              <div className="bg-gray-50 rounded-xl p-3 sm:col-span-2 lg:col-span-3">
                <p className="text-xs text-gray-400 mb-0.5">Notes</p>
                <p className="font-medium text-gray-900">{selected.notes}</p>
              </div>
            )}
          </div>
          {selected.payment_proof && (
            <div className="mb-5">
              <p className="text-xs text-gray-400 mb-2">Payment Screenshot</p>
              <img src={selected.payment_proof} alt="proof" className="max-h-64 rounded-xl border border-gray-200 object-contain" />
            </div>
          )}
          {selected.status === 'pending' && (
            <div className="flex gap-3">
              <button onClick={() => handleApprove(selected)} disabled={actionLoading === selected.id}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-green-600 text-white font-semibold text-sm hover:bg-green-700 transition-colors disabled:opacity-50">
                {actionLoading === selected.id ? <LoadingSpinner size="sm" /> : <CheckCircle size={16} />} Approve Order
              </button>
              <button onClick={() => { setRejectModal(selected); setRejectReason(''); }}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-red-600 text-white font-semibold text-sm hover:bg-red-700 transition-colors">
                <XCircle size={16} /> Reject Order
              </button>
            </div>
          )}
        </div>
      )}

      {/* Reject Modal */}
      {rejectModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setRejectModal(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="font-semibold text-gray-900 mb-1">Reject Order #{rejectModal.order_id}</h3>
            <p className="text-sm text-gray-500 mb-4">Provide a reason — it will be sent to the customer.</p>
            <textarea
              rows={3}
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              placeholder="e.g. Payment screenshot unclear, transaction not found..."
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:border-red-400 transition-all resize-none mb-4"
            />
            <div className="flex gap-3">
              <button onClick={() => setRejectModal(null)} className="flex-1 py-3 rounded-xl border-2 border-gray-200 text-gray-600 font-semibold text-sm hover:border-gray-300 transition-all">Cancel</button>
              <button onClick={handleReject} disabled={actionLoading === rejectModal.id}
                className="flex-1 py-3 rounded-xl bg-red-600 text-white font-semibold text-sm hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                {actionLoading === rejectModal.id ? <LoadingSpinner size="sm" /> : <XCircle size={15} />} Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
