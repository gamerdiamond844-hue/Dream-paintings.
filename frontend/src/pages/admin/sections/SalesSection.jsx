import { useState, useEffect, useCallback } from 'react';
import { TrendingUp, DollarSign, ShoppingBag, Award, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../../utils/api';

export default function SalesSection() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(() => {
    setLoading(true);
    api.get('/admin/sales')
      .then(r => setData(r.data))
      .catch(() => toast.error('Failed to load sales'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading || !data) return (
    <div className="space-y-4">
      {[...Array(3)].map((_, i) => <div key={i} className="bg-white rounded-2xl h-40 skeleton" />)}
    </div>
  );

  const { sales, topPaintings, monthlySales } = data;
  const revenueValues = monthlySales?.map(m => parseFloat(m.revenue) || 0) || [];
  const maxRevenue = revenueValues.length ? Math.max(...revenueValues, 1) : 1;
  const completedSales = sales.filter(x => x.status === 'approved');
  const totalRevenue = completedSales.reduce((s, x) => s + (parseFloat(x.amount) || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-bold text-gray-900">Sales & Revenue</h2>
        <button onClick={fetchData} disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:border-red-300 hover:text-red-600 transition-all disabled:opacity-60">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center mb-3">
            <DollarSign size={18} className="text-green-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">₹{totalRevenue.toLocaleString('en-IN')}</p>
          <p className="text-sm text-gray-500 mt-0.5">Total Revenue</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center mb-3">
            <ShoppingBag size={18} className="text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{completedSales.length}</p>
          <p className="text-sm text-gray-500 mt-0.5">Total Transactions</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center mb-3">
            <TrendingUp size={18} className="text-purple-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">
            ₹{completedSales.length ? Math.round(totalRevenue / completedSales.length).toLocaleString('en-IN') : 0}
          </p>
          <p className="text-sm text-gray-500 mt-0.5">Avg. Sale Value</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Monthly Revenue Chart */}
        {monthlySales?.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-5">
              <TrendingUp size={16} className="text-red-500" />
              <h3 className="font-semibold text-gray-900">Monthly Revenue</h3>
            </div>
            <div className="flex items-end gap-2 h-40">
              {[...monthlySales].reverse().map((m, i) => {
                const height = (parseFloat(m.revenue) / maxRevenue) * 100;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
                    <div className="relative w-full flex items-end justify-center" style={{ height: '120px' }}>
                      <div
                        className="w-full bg-gradient-to-t from-red-600 to-rose-400 rounded-t-lg transition-all duration-500 hover:from-red-700 hover:to-rose-500 cursor-pointer"
                        style={{ height: `${Math.max(height, 4)}%` }}
                        title={`₹${parseFloat(m.revenue).toLocaleString('en-IN')}`}
                      />
                    </div>
                    <span className="text-xs text-gray-400 truncate w-full text-center">
                      {new Date(m.month).toLocaleDateString('en-IN', { month: 'short' })}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Top Paintings */}
        {topPaintings?.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Award size={16} className="text-yellow-500" />
              <h3 className="font-semibold text-gray-900">Top Selling Paintings</h3>
            </div>
            <div className="space-y-3">
              {topPaintings.map((p, i) => (
                <div key={p.id} className="flex items-center gap-3">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0
                    ${i === 0 ? 'bg-yellow-100 text-yellow-700' : i === 1 ? 'bg-gray-100 text-gray-600' : i === 2 ? 'bg-orange-100 text-orange-600' : 'bg-gray-50 text-gray-500'}`}>
                    {i + 1}
                  </span>
                  <img src={p.image_url} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{p.title}</p>
                    <p className="text-xs text-gray-500">{p.sale_count} sales</p>
                  </div>
                  <span className="text-sm font-bold text-green-600 flex-shrink-0">₹{parseFloat(p.revenue).toLocaleString('en-IN')}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Sales Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50">
          <h3 className="font-semibold text-gray-900">All Transactions</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Painting', 'Buyer', 'Artist', 'Amount', 'Status', 'Date'].map(h => (
                  <th key={h} className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {sales.map(s => (
                <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <img src={s.image_url} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                      <span className="text-sm font-medium text-gray-900 line-clamp-1 max-w-32">{s.painting_title}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-sm text-gray-600">{s.buyer_name}</td>
                  <td className="px-5 py-4 text-sm text-gray-500">{s.artist_name}</td>
                  <td className="px-5 py-4 text-sm font-bold text-green-600">₹{parseFloat(s.amount).toLocaleString('en-IN')}</td>
                  <td className="px-5 py-4">
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-green-100 text-green-700">{s.status}</span>
                  </td>
                  <td className="px-5 py-4 text-sm text-gray-400 whitespace-nowrap">{new Date(s.created_at).toLocaleDateString('en-IN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {sales.length === 0 && <p className="text-center text-gray-400 py-12 text-sm">No sales yet</p>}
        </div>
      </div>
    </div>
  );
}
