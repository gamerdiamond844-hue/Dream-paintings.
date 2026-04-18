import { useState, useEffect, useCallback } from 'react';
import {
  LayoutDashboard, Palette, Clock, Users, ShoppingBag, Bell, MessageSquare,
  BarChart3, Menu, X, LogOut, ChevronRight, Activity, Settings,
  TrendingUp, Star, Trash2, RefreshCw, Moon, Sun, Shield
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import OverviewSection from './sections/OverviewSection';
import PaintingsSection from './sections/PaintingsSection';
import PendingSection from './sections/PendingSection';
import UsersSection from './sections/UsersSection';
import CommentsSection from './sections/CommentsSection';
import SalesSection from './sections/SalesSection';
import NotifySection from './sections/NotifySection';
import ActivitySection from './sections/ActivitySection';
import OrdersSection from './sections/OrdersSection';
import HomepageEditor from './sections/HomepageEditor';
import ConversationsSection from './sections/ConversationsSection';
import VerificationSection from './sections/VerificationSection';
import WithdrawalsSection from './sections/WithdrawalsSection';

const NAV = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard, badge: null },
  { id: 'homepage', label: 'Homepage Editor', icon: Settings, badge: null },
  { id: 'paintings', label: 'All Paintings', icon: Palette, badge: null },
  { id: 'pending', label: 'Pending', icon: Clock, badge: 'pending' },
  { id: 'orders', label: 'Orders', icon: ShoppingBag, badge: 'orders' },
  { id: 'withdrawals', label: 'Withdrawals', icon: TrendingUp, badge: 'withdrawals' },
  { id: 'users', label: 'Users', icon: Users, badge: null },
  { id: 'verification', label: 'Verification', icon: Shield, badge: 'verification' },
  { id: 'conversations', label: 'Conversations', icon: MessageSquare, badge: null },
  { id: 'comments', label: 'Comments', icon: MessageSquare, badge: null },
  { id: 'sales', label: 'Sales', icon: BarChart3, badge: null },
  { id: 'notify', label: 'Notifications', icon: Bell, badge: null },
  { id: 'activity', label: 'Activity Logs', icon: Activity, badge: null },
];

export default function AdminDashboard() {
  const [tab, setTab] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [stats, setStats] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [dark, setDark] = useState(false);
  const [pendingOrders, setPendingOrders] = useState(0);
  const [pendingVerifications, setPendingVerifications] = useState(0);
  const [pendingWithdrawals, setPendingWithdrawals] = useState(0);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const fetchStats = useCallback(() => {
    return Promise.all([
      api.get('/admin/stats').then(r => setStats(r.data)).catch(() => {}),
      api.get('/admin/orders?status=pending').then(r => setPendingOrders(r.data.total || 0)).catch(() => {}),
      api.get('/verification/admin/requests?status=pending').then(r => setPendingVerifications(r.data.total || 0)).catch(() => {}),
      api.get('/admin/withdrawals/stats').then(r => setPendingWithdrawals(r.data.pending?.count || 0)).catch(() => {}),
    ]);
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchStats();
    setRefreshing(false);
  }, [fetchStats]);

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div className={`content-layer min-h-screen pt-16 ${dark ? 'dark bg-gray-950' : 'bg-gray-50'}`}>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/40 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed left-0 top-16 h-[calc(100vh-4rem)] w-64 z-40 transition-transform duration-300
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0
        ${dark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'} border-r shadow-xl`}>
        <div className="flex flex-col h-full">
          {/* Brand */}
          <div className={`p-5 border-b ${dark ? 'border-gray-800' : 'border-gray-100'}`}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-rose-700 rounded-xl flex items-center justify-center shadow-lg shadow-red-200">
                <BarChart3 size={18} className="text-white" />
              </div>
              <div>
                <p className={`font-bold text-sm ${dark ? 'text-white' : 'text-gray-900'}`}>Admin Portal</p>
                <p className="text-xs text-red-500 font-medium">Dream Paintings</p>
              </div>
            </div>
          </div>

          {/* Nav */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {NAV.map(({ id, label, icon: Icon, badge }) => {
              const count = badge === 'pending' ? stats?.pendingApprovals : badge === 'orders' ? pendingOrders : badge === 'verification' ? pendingVerifications : badge === 'withdrawals' ? pendingWithdrawals : null;
              const active = tab === id;
              return (
                <button key={id} onClick={() => { setTab(id); setSidebarOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all group
                    ${active
                      ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-lg shadow-red-200'
                      : dark ? 'text-gray-400 hover:bg-gray-800 hover:text-white' : 'text-gray-600 hover:bg-red-50 hover:text-red-600'
                    }`}>
                  <Icon size={17} className={active ? 'text-white' : ''} />
                  <span className="flex-1 text-left">{label}</span>
                  {count > 0 && (
                    <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${active ? 'bg-white/20 text-white' : 'bg-red-100 text-red-600'}`}>
                      {count}
                    </span>
                  )}
                  {active && <ChevronRight size={14} className="text-white/60" />}
                </button>
              );
            })}
          </nav>

          {/* Footer */}
          <div className={`p-4 border-t ${dark ? 'border-gray-800' : 'border-gray-100'}`}>
            <div className={`flex items-center gap-3 p-3 rounded-xl mb-3 ${dark ? 'bg-gray-800' : 'bg-gray-50'}`}>
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-400 to-rose-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                {user?.name?.[0]?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-xs font-semibold truncate ${dark ? 'text-white' : 'text-gray-900'}`}>{user?.name}</p>
                <p className="text-xs text-red-500">Administrator</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setDark(!dark)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all
                  ${dark ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                {dark ? <Sun size={13} /> : <Moon size={13} />}
                {dark ? 'Light' : 'Dark'}
              </button>
              <button onClick={handleLogout}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium bg-red-50 text-red-600 hover:bg-red-100 transition-all">
                <LogOut size={13} /> Logout
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="lg:ml-64 min-h-screen">
        {/* Topbar */}
        <div className={`sticky top-16 z-20 px-6 py-4 border-b flex items-center gap-4
          ${dark ? 'bg-gray-900/95 border-gray-800' : 'bg-white/95 border-gray-100'} backdrop-blur-sm`}>
          <button onClick={() => setSidebarOpen(!sidebarOpen)}
            className={`lg:hidden p-2 rounded-lg ${dark ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>
            <Menu size={18} />
          </button>
          <div className="flex-1">
            <h1 className={`font-display text-xl font-bold capitalize ${dark ? 'text-white' : 'text-gray-900'}`}>
              {NAV.find(n => n.id === tab)?.label}
            </h1>
            <p className={`text-xs mt-0.5 ${dark ? 'text-gray-500' : 'text-gray-400'}`}>
              {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          {/* Quick stats pills */}
          {stats && (
            <div className="hidden md:flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 rounded-full">
                <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                <span className="text-xs font-semibold text-red-600">{stats.pendingApprovals} Pending</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 rounded-full">
                <span className="text-xs font-semibold text-green-600">₹{stats.totalRevenue?.toLocaleString('en-IN')}</span>
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        <div className={`p-6 ${dark ? 'text-white' : ''}`}>
          <div className="page-enter">
            {tab === 'overview' && <OverviewSection stats={stats} refreshing={refreshing} onRefresh={handleRefresh} />}
            {tab === 'homepage' && <HomepageEditor />}
            {tab === 'paintings' && <PaintingsSection />}
            {tab === 'pending' && <PendingSection onUpdate={handleRefresh} />}
            {tab === 'orders' && <OrdersSection />}
            {tab === 'withdrawals' && <WithdrawalsSection />}
            {tab === 'users' && <UsersSection />}
            {tab === 'verification' && <VerificationSection />}
            {tab === 'conversations' && <ConversationsSection />}
            {tab === 'comments' && <CommentsSection />}
            {tab === 'sales' && <SalesSection />}
            {tab === 'notify' && <NotifySection users={[]} />}
            {tab === 'activity' && <ActivitySection />}
          </div>
        </div>
      </main>
    </div>
  );
}
