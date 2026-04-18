import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { Bell, MessageCircle, Menu, X, User, LogOut, LayoutDashboard, Upload, Package } from 'lucide-react';
import api from '../utils/api';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { unreadCount = 0 } = useSocket() || {};
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [dropOpen, setDropOpen] = useState(false);
  const [notifCount, setNotifCount] = useState(0);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!user) return;
    // Fetch once on login, not on every navigation
    api.get('/notifications').then(res => {
      setNotifCount(res.data.filter(n => !n.is_read).length);
    }).catch(() => {});
  }, [user?.id]); // only re-run when user changes, not on every location change

  const handleLogout = () => { logout(); navigate('/'); };

  const navLinks = [
    { to: '/', label: 'Home' },
    { to: '/gallery', label: 'Gallery' },
  ];

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'glass shadow-lg shadow-red-100' : 'bg-transparent'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <img
              src="/logo.png"
              alt="Dream Paintings Logo"
              className="w-10 h-10 rounded-lg object-contain group-hover:scale-105 transition-transform"
            />
            <span className="font-display text-xl font-bold gradient-text">Dream Paintings</span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map(l => (
              <Link key={l.to} to={l.to}
                className={`text-sm font-medium transition-colors hover:text-red-600 ${location.pathname === l.to ? 'text-red-600' : 'text-gray-700'}`}>
                {l.label}
              </Link>
            ))}
          </div>

          {/* Right side */}
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <>
                {/* Chat */}
                <Link to="/chat" className="relative p-2 rounded-full hover:bg-red-50 transition-colors">
                  <MessageCircle size={20} className="text-gray-600" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-600 text-white text-xs rounded-full flex items-center justify-center">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </Link>

                {/* Notifications */}
                <Link to="/notifications" className="relative p-2 rounded-full hover:bg-red-50 transition-colors">
                  <Bell size={20} className="text-gray-600" />
                  {notifCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-600 text-white text-xs rounded-full flex items-center justify-center">
                      {notifCount}
                    </span>
                  )}
                </Link>

                {/* User dropdown */}
                <div className="relative">
                  <button onClick={() => setDropOpen(!dropOpen)}
                    className="flex items-center gap-2 p-1 rounded-full hover:bg-red-50 transition-colors">
                    {user.avatar_url
                      ? <img src={user.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover ring-2 ring-red-200" />
                      : <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-400 to-rose-600 flex items-center justify-center text-white text-sm font-bold">
                          {user.name?.[0]?.toUpperCase()}
                        </div>
                    }
                  </button>
                  {dropOpen && (
                    <div className="absolute right-0 mt-2 w-52 glass rounded-2xl shadow-xl shadow-red-100 py-2 border border-red-100">
                      <div className="px-4 py-2 border-b border-red-50">
                        <p className="font-semibold text-sm text-gray-900">{user.name}</p>
                        <p className="text-xs text-gray-500 capitalize">{user.role}</p>
                      </div>
                      <Link to="/profile" onClick={() => setDropOpen(false)}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-red-50 hover:text-red-600 transition-colors">
                        <User size={15} /> Profile
                      </Link>
                      <Link to="/orders" onClick={() => setDropOpen(false)}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-red-50 hover:text-red-600 transition-colors">
                        <Package size={15} /> My Orders
                      </Link>
                      {user.role === 'artist' && (
                        <Link to="/submit-painting" onClick={() => setDropOpen(false)}
                          className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-red-50 hover:text-red-600 transition-colors">
                          <Upload size={15} /> Submit Painting
                        </Link>
                      )}
                      <button onClick={handleLogout}
                        className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors">
                        <LogOut size={15} /> Logout
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <Link to="/login" className="btn-outline px-4 py-2 rounded-full text-sm font-medium">Login</Link>
                <Link to="/register" className="btn-primary px-4 py-2 rounded-full text-sm font-medium">Get Started</Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <button className="md:hidden p-2" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden glass border-t border-red-100 px-4 py-4 space-y-3">
          {navLinks.map(l => (
            <Link key={l.to} to={l.to} onClick={() => setMenuOpen(false)}
              className="block text-sm font-medium text-gray-700 hover:text-red-600 py-2">
              {l.label}
            </Link>
          ))}
          {user ? (
            <>
              <Link to="/chat" onClick={() => setMenuOpen(false)} className="block text-sm py-2 text-gray-700">Messages</Link>
              <Link to="/profile" onClick={() => setMenuOpen(false)} className="block text-sm py-2 text-gray-700">Profile</Link>
              <Link to="/orders" onClick={() => setMenuOpen(false)} className="block text-sm py-2 text-gray-700">My Orders</Link>
              {user.role === 'artist' && (
                <Link to="/submit-painting" onClick={() => setMenuOpen(false)} className="block text-sm py-2 text-gray-700">Submit Painting</Link>
              )}
              <button onClick={handleLogout} className="block text-sm py-2 text-red-600 w-full text-left">Logout</button>
            </>
          ) : (
            <div className="flex gap-3 pt-2">
              <Link to="/login" onClick={() => setMenuOpen(false)} className="btn-outline px-4 py-2 rounded-full text-sm flex-1 text-center">Login</Link>
              <Link to="/register" onClick={() => setMenuOpen(false)} className="btn-primary px-4 py-2 rounded-full text-sm flex-1 text-center">Register</Link>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}
