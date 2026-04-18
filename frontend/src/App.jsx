import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { lazy, Suspense } from 'react';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import ParticleBackground from './components/ParticleBackground';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';

// Lazy-load every page — each becomes its own JS chunk loaded on demand
const Home               = lazy(() => import('./pages/Home'));
const Gallery            = lazy(() => import('./pages/Gallery'));
const PaintingDetail     = lazy(() => import('./pages/PaintingDetail'));
const Login              = lazy(() => import('./pages/Login'));
const Register           = lazy(() => import('./pages/Register'));
const Profile            = lazy(() => import('./pages/Profile'));
const Chat               = lazy(() => import('./pages/Chat'));
const ArtistProfile      = lazy(() => import('./pages/ArtistProfile'));
const SubmitPainting     = lazy(() => import('./pages/SubmitPainting'));
const Notifications      = lazy(() => import('./pages/Notifications'));
const AdminDashboard     = lazy(() => import('./pages/admin/AdminDashboard'));
const CustomerDetails    = lazy(() => import('./pages/CustomerDetails'));
const PaymentPage        = lazy(() => import('./pages/PaymentPage'));
const OrderSuccess       = lazy(() => import('./pages/OrderSuccess'));
const OrderHistory       = lazy(() => import('./pages/OrderHistory'));
const TermsPage          = lazy(() => import('./pages/TermsPage'));
const PrivacyPage        = lazy(() => import('./pages/PrivacyPage'));
const RefundPage         = lazy(() => import('./pages/RefundPage'));
const SellerPolicyPage   = lazy(() => import('./pages/SellerPolicyPage'));
const BuyerPolicyPage    = lazy(() => import('./pages/BuyerPolicyPage'));
const DisclaimerPage     = lazy(() => import('./pages/DisclaimerPage'));
const IntellectualPropertyPage = lazy(() => import('./pages/IntellectualPropertyPage'));
const DmcaPage           = lazy(() => import('./pages/DmcaPage'));
const CommunityGuidelinesPage  = lazy(() => import('./pages/CommunityGuidelinesPage'));
const WithdrawalPage           = lazy(() => import('./pages/WithdrawalPage'));

// Minimal fallback shown while a lazy chunk loads
function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

// Renders Footer only on non-chat routes
function AppShell({ children }) {
  const { pathname } = useLocation();
  const hideFooter = pathname === '/chat';
  return (
    <>
      <ParticleBackground />
      <Navbar />
      {children}
      {!hideFooter && <Footer />}
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <SocketProvider>
      <BrowserRouter>
        <AppShell>
        <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/gallery" element={<Gallery />} />
          <Route path="/paintings/:id" element={<PaintingDetail />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/artist/:id" element={<ArtistProfile />} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
          <Route path="/submit-painting" element={<ProtectedRoute roles={['artist', 'admin']}><SubmitPainting /></ProtectedRoute>} />
          <Route path="/buy" element={<ProtectedRoute><CustomerDetails /></ProtectedRoute>} />
          <Route path="/payment" element={<ProtectedRoute><PaymentPage /></ProtectedRoute>} />
          <Route path="/order-success" element={<ProtectedRoute><OrderSuccess /></ProtectedRoute>} />
          <Route path="/orders" element={<ProtectedRoute><OrderHistory /></ProtectedRoute>} />
          <Route path="/chat" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
          <Route path="/super-admin-portal-xyz" element={<ProtectedRoute roles={['admin']}><AdminDashboard /></ProtectedRoute>} />
          <Route path="/super-admin-secret" element={<ProtectedRoute roles={['admin']}><AdminDashboard /></ProtectedRoute>} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/refund-policy" element={<RefundPage />} />
          <Route path="/seller-policy" element={<SellerPolicyPage />} />
          <Route path="/buyer-policy" element={<BuyerPolicyPage />} />
          <Route path="/disclaimer" element={<DisclaimerPage />} />
          <Route path="/intellectual-property" element={<IntellectualPropertyPage />} />
          <Route path="/dmca" element={<DmcaPage />} />
          <Route path="/community-guidelines" element={<CommunityGuidelinesPage />} />
          <Route path="/withdrawals" element={<ProtectedRoute roles={['artist', 'admin']}><WithdrawalPage /></ProtectedRoute>} />
        </Routes>
        </Suspense>
        </AppShell>
        <Toaster
          position="top-right"
          toastOptions={{
            style: { borderRadius: '12px', background: '#fff', color: '#111', border: '1px solid #fecdd3', fontSize: '14px' },
            success: { iconTheme: { primary: '#e11d48', secondary: '#fff' } },
          }}
        />
      </BrowserRouter>
      </SocketProvider>
    </AuthProvider>
  );
}
