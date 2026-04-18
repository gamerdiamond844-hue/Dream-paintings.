import PolicyLayout from '../components/PolicyLayout';

export default function PrivacyPage() {
  return (
    <PolicyLayout title="Privacy Policy" lastUpdated="June 2025">

      <section>
        <h2 className="text-lg font-bold text-gray-900 mb-2">1. Introduction</h2>
        <p>
          Dinesh Global Enterprises Pvt. Ltd. ("Company", "We") operates the Dream Paintings platform.
          This Privacy Policy explains how we collect, use, disclose, and safeguard your personal information
          in compliance with the <strong>Information Technology Act, 2000</strong> (India), the
          <strong> Information Technology (Reasonable Security Practices and Procedures and Sensitive Personal Data or Information) Rules, 2011</strong>,
          and internationally recognized data protection principles including GDPR.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold text-gray-900 mb-2">2. Information We Collect</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Account Data:</strong> Name, email address, password (hashed), role (buyer/artist).</li>
          <li><strong>Profile Data:</strong> Avatar image, biography, artist portfolio.</li>
          <li><strong>Transaction Data:</strong> Order details, payment proof uploads, transaction IDs, shipping address, mobile number.</li>
          <li><strong>Usage Data:</strong> Pages visited, artworks viewed, likes, comments, search queries.</li>
          <li><strong>Device & Technical Data:</strong> IP address, browser type, operating system, referral URLs.</li>
          <li><strong>Cookies & Tracking:</strong> Session cookies, preference cookies, analytics identifiers.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-bold text-gray-900 mb-2">3. How We Use Your Information</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>To create and manage your account and authenticate your identity.</li>
          <li>To process orders, payments, and facilitate transactions between buyers and sellers.</li>
          <li>To send transactional notifications, order updates, and platform alerts.</li>
          <li>To moderate content, enforce our policies, and prevent fraud.</li>
          <li>To improve Platform features, performance, and user experience.</li>
          <li>To comply with legal obligations and respond to lawful requests from authorities.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-bold text-gray-900 mb-2">4. Cookies</h2>
        <p>
          We use cookies and similar tracking technologies to maintain session state, remember preferences,
          and analyze Platform usage. You may disable cookies through your browser settings; however,
          certain features of the Platform may not function correctly without them.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold text-gray-900 mb-2">5. Third-Party Services</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Cloudinary:</strong> Used for secure image storage and delivery. Images uploaded to the Platform are stored on Cloudinary's servers.</li>
          <li><strong>Payment Processors:</strong> Payment-related data may be processed by third-party payment gateways. We do not store full payment card details on our servers.</li>
          <li><strong>Hosting Providers:</strong> Our infrastructure may be hosted on cloud platforms including AWS, Railway, or similar providers.</li>
        </ul>
        <p className="mt-2">These third parties have their own privacy policies and we are not responsible for their data practices.</p>
      </section>

      <section>
        <h2 className="text-lg font-bold text-gray-900 mb-2">6. Data Sharing & Disclosure</h2>
        <p>We do not sell, rent, or trade your personal information. We may disclose your data:</p>
        <ul className="list-disc pl-5 space-y-1 mt-2">
          <li>To comply with a legal obligation, court order, or government request.</li>
          <li>To protect the rights, property, or safety of the Company, our users, or the public.</li>
          <li>To service providers who assist in Platform operations under strict confidentiality agreements.</li>
          <li>In connection with a merger, acquisition, or sale of company assets.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-bold text-gray-900 mb-2">7. Data Security</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>Passwords are hashed using bcrypt before storage.</li>
          <li>All API communications are protected via JWT authentication.</li>
          <li>Database connections use SSL/TLS encryption.</li>
          <li>Access to sensitive admin functions is role-restricted.</li>
        </ul>
        <p className="mt-2">
          Despite these measures, no method of transmission over the Internet is 100% secure.
          We cannot guarantee absolute security of your data.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold text-gray-900 mb-2">8. Your Rights</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>Right to access the personal data we hold about you.</li>
          <li>Right to request correction of inaccurate data.</li>
          <li>Right to request deletion of your account and associated data.</li>
          <li>Right to withdraw consent for marketing communications.</li>
        </ul>
        <p className="mt-2">To exercise these rights, contact us at <a href="mailto:rawaldinesh193@gmail.com" className="text-red-600">rawaldinesh193@gmail.com</a>.</p>
      </section>

      <section>
        <h2 className="text-lg font-bold text-gray-900 mb-2">9. Data Retention</h2>
        <p>
          We retain your personal data for as long as your account is active or as needed to provide services,
          comply with legal obligations, resolve disputes, and enforce our agreements.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold text-gray-900 mb-2">10. Governing Law</h2>
        <p>
          This Privacy Policy is governed by the laws of India. Any disputes shall be subject to the
          exclusive jurisdiction of courts in Rajasthan, India.
        </p>
      </section>

    </PolicyLayout>
  );
}
