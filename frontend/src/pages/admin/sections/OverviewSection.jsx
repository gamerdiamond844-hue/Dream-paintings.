import { Users, Palette, ShoppingBag, Clock, DollarSign, MessageSquare, TrendingUp, UserX, RefreshCw, Activity } from 'lucide-react';

const StatCard = ({ icon: Icon, label, value, sub, color = 'red', trend }) => (
  <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 group">
    <div className="flex items-start justify-between mb-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center
        ${color === 'red' ? 'bg-red-50 group-hover:bg-red-100' :
          color === 'green' ? 'bg-green-50 group-hover:bg-green-100' :
          color === 'blue' ? 'bg-blue-50 group-hover:bg-blue-100' :
          color === 'purple' ? 'bg-purple-50 group-hover:bg-purple-100' :
          color === 'orange' ? 'bg-orange-50 group-hover:bg-orange-100' :
          'bg-yellow-50 group-hover:bg-yellow-100'} transition-colors`}>
        <Icon size={20} className={
          color === 'red' ? 'text-red-600' :
          color === 'green' ? 'text-green-600' :
          color === 'blue' ? 'text-blue-600' :
          color === 'purple' ? 'text-purple-600' :
          color === 'orange' ? 'text-orange-600' :
          'text-yellow-600'} />
      </div>
      {trend !== undefined && (
        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${trend >= 0 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
          {trend >= 0 ? '+' : ''}{trend}%
        </span>
      )}
    </div>
    <p className="text-2xl font-bold text-gray-900 font-display">{value}</p>
    <p className="text-sm text-gray-500 mt-0.5">{label}</p>
    {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
  </div>
);

const timeAgo = (date) => {
  const s = Math.floor((Date.now() - new Date(date)) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
};

export default function OverviewSection({ stats, onRefresh, refreshing }) {
  if (!stats) return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {[...Array(8)].map((_, i) => (
        <div key={i} className="bg-white rounded-2xl p-5 border border-gray-100 h-32 skeleton" />
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold text-gray-900">Dashboard Overview</h2>
          <p className="text-sm text-gray-500 mt-0.5">Real-time platform metrics</p>
        </div>
        <button onClick={onRefresh} disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:border-red-300 hover:text-red-600 transition-all disabled:opacity-60">
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} /> {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Total Buyers" value={stats.totalUsers} color="blue" />
        <StatCard icon={Palette} label="Total Artists" value={stats.totalArtists} color="purple" />
        <StatCard icon={Palette} label="Live Paintings" value={stats.totalPaintings} color="red" />
        <StatCard icon={Clock} label="Pending Approvals" value={stats.pendingApprovals} color="yellow" />
        <StatCard icon={ShoppingBag} label="Total Sales" value={stats.totalSales} color="green" />
        <StatCard icon={DollarSign} label="Total Revenue" value={`₹${(stats.totalRevenue || 0).toLocaleString('en-IN')}`} color="green" />
        <StatCard icon={MessageSquare} label="Total Comments" value={stats.totalComments} color="blue" />
        <StatCard icon={UserX} label="Banned Users" value={stats.bannedUsers} color="orange" />
      </div>

      {/* Revenue highlight */}
      <div className="bg-gradient-to-r from-red-600 to-rose-700 rounded-2xl p-6 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-32 translate-x-32" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-24 -translate-x-24" />
        <div className="relative">
          <p className="text-red-200 text-sm font-medium mb-1">Total Platform Revenue</p>
          <p className="text-4xl font-bold font-display">₹{(stats.totalRevenue || 0).toLocaleString('en-IN')}</p>
          <p className="text-red-200 text-sm mt-2">from {stats.totalSales} completed sales</p>
        </div>
      </div>

      {/* Activity Feed */}
      {stats.recentActivity?.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-2">
            <Activity size={16} className="text-red-500" />
            <h3 className="font-semibold text-gray-900 text-sm">Recent Admin Activity</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {stats.recentActivity.map(log => (
              <div key={log.id} className="px-5 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-red-400 to-rose-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                  {log.admin_name?.[0] || 'A'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-700 truncate">{log.action}</p>
                  <p className="text-xs text-gray-400">{log.admin_name}</p>
                </div>
                <span className="text-xs text-gray-400 flex-shrink-0">{timeAgo(log.created_at)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
