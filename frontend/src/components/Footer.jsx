import { Link } from 'react-router-dom';

const legalLinks = [
  { to: '/terms', label: 'Terms & Conditions' },
  { to: '/privacy', label: 'Privacy Policy' },
  { to: '/refund-policy', label: 'Refund & Cancellation' },
  { to: '/seller-policy', label: 'Seller Policy' },
  { to: '/buyer-policy', label: 'Buyer Policy' },
  { to: '/disclaimer', label: 'Disclaimer' },
  { to: '/intellectual-property', label: 'Intellectual Property' },
  { to: '/dmca', label: 'DMCA / Copyright' },
  { to: '/community-guidelines', label: 'Community Guidelines' },
];

export default function Footer() {
  return (
    <footer className="bg-gray-950 text-gray-400 border-t border-red-900/30 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Brand */}
        <div className="flex items-center gap-2 mb-4">
          <img
            src="/logo.png"
            alt="Dream Paintings Logo"
            className="w-10 h-10 rounded-lg object-contain"
          />
          <span className="font-bold text-white text-lg">Dream Paintings</span>
        </div>
        <p className="text-xs text-gray-500 mb-2">
          A product of <span className="text-gray-300 font-medium">Dinesh Global Enterprises Pvt. Ltd.</span>
        </p>
        <p className="text-xs text-gray-500 mb-6">
          Contact: <a href="tel:+917984626447" className="hover:text-red-400 transition-colors">+91 79846 26447</a>
          &nbsp;|&nbsp;
          <a href="mailto:rawaldinesh193@gmail.com" className="hover:text-red-400 transition-colors">rawaldinesh193@gmail.com</a>
        </p>

        {/* Legal Links */}
        <div className="flex flex-wrap gap-x-4 gap-y-2 mb-8">
          {legalLinks.map(l => (
            <Link
              key={l.to}
              to={l.to}
              className="text-xs text-gray-500 hover:text-red-400 transition-colors underline-offset-2 hover:underline"
            >
              {l.label}
            </Link>
          ))}
        </div>

        {/* Divider */}
        <div className="border-t border-gray-800 pt-6 space-y-2">
          <p className="text-xs text-gray-600 font-medium uppercase tracking-widest">
            ⚠ Legal Warning
          </p>
          <p className="text-xs text-gray-600 leading-relaxed max-w-3xl">
            Unauthorized reproduction, distribution, or commercial use of any content, artwork, or intellectual property
            displayed on this platform is strictly prohibited and constitutes a violation of applicable copyright laws.
            Offenders will be subject to civil and criminal prosecution to the fullest extent permitted by law.
          </p>
        </div>

        {/* Copyright */}
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-700">
            &copy; {new Date().getFullYear()} Dream Paintings — Dinesh Global Enterprises Pvt. Ltd. All Rights Reserved.
          </p>
          <p className="text-xs text-gray-800 mt-1">
            Governed by the laws of India. Jurisdiction: Rajasthan, India.
          </p>
        </div>
      </div>
    </footer>
  );
}
