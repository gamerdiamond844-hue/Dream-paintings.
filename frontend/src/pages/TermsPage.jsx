import PolicyLayout from '../components/PolicyLayout';

export default function TermsPage() {
  return (
    <PolicyLayout title="Terms & Conditions" lastUpdated="June 2025">

      <section>
        <h2 className="text-lg font-bold text-gray-900 mb-2">1. Binding Agreement</h2>
        <p>
          By accessing, registering on, or using the Dream Paintings platform ("Platform"), operated by
          <strong> Dinesh Global Enterprises Pvt. Ltd.</strong> ("Company", "We", "Us"), you ("User") agree to be
          legally bound by these Terms & Conditions ("Terms"). If you do not agree, you must immediately cease
          all use of the Platform. These Terms constitute a legally enforceable contract between you and the Company.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold text-gray-900 mb-2">2. Eligibility</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>You must be at least 18 years of age to use this Platform.</li>
          <li>By registering, you represent that all information provided is accurate, current, and complete.</li>
          <li>Accounts created on behalf of minors are strictly prohibited.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-bold text-gray-900 mb-2">3. Buyer Responsibilities</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>Buyers must review all listing details, images, and descriptions before completing a purchase.</li>
          <li>Buyers acknowledge that physical artworks may have minor variations in color, texture, or size due to photography and display settings.</li>
          <li>Buyers are responsible for providing accurate shipping and contact information.</li>
          <li>Buyers must not initiate fraudulent chargebacks or payment disputes without first contacting the Platform.</li>
          <li>Buyers agree not to resell purchased artworks as their own original work.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-bold text-gray-900 mb-2">4. Seller (Artist) Responsibilities</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>Sellers must only list original artworks that they have created and legally own.</li>
          <li>Sellers are solely responsible for the authenticity, accuracy, and legality of their listings.</li>
          <li>Sellers must fulfill orders promptly and communicate shipping details to buyers.</li>
          <li>Sellers must not misrepresent the medium, size, condition, or origin of any artwork.</li>
          <li>Sellers agree to the Platform's commission structure as communicated at the time of listing.</li>
          <li>Sellers are responsible for all applicable taxes on their sales.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-bold text-gray-900 mb-2">5. Platform Rights</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>The Company reserves the right to suspend, restrict, or permanently terminate any account at its sole discretion, with or without prior notice, for any violation of these Terms.</li>
          <li>The Company may remove, edit, or reject any listing that violates these Terms or applicable law.</li>
          <li>The Company may modify these Terms at any time. Continued use of the Platform constitutes acceptance of the revised Terms.</li>
          <li>The Company reserves the right to pursue legal remedies against users who cause harm to the Platform, other users, or third parties.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-bold text-gray-900 mb-2">6. Prohibited Activities</h2>
        <p className="mb-2">The following activities are strictly prohibited and will result in immediate account termination and potential legal action:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Listing, selling, or promoting counterfeit, forged, or plagiarized artwork.</li>
          <li>Infringing upon the intellectual property rights of any artist, photographer, or rights holder.</li>
          <li>Creating fraudulent listings, fake reviews, or misleading pricing.</li>
          <li>Engaging in any form of financial fraud, including payment manipulation or chargeback abuse.</li>
          <li>Uploading malicious code, viruses, or any content designed to harm the Platform or its users.</li>
          <li>Impersonating another user, artist, or the Company.</li>
          <li>Using the Platform for money laundering or any illegal financial activity.</li>
          <li>Scraping, harvesting, or unauthorized data extraction from the Platform.</li>
          <li>Circumventing the Platform to conduct off-platform transactions with buyers or sellers met through the Platform.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-bold text-gray-900 mb-2">7. Account Termination</h2>
        <p>
          The Company may terminate or suspend your account immediately, without prior notice or liability, for any reason,
          including breach of these Terms. Upon termination, your right to use the Platform ceases immediately.
          All provisions of these Terms which by their nature should survive termination shall survive, including
          ownership provisions, warranty disclaimers, indemnity, and limitations of liability.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold text-gray-900 mb-2">8. Limitation of Liability</h2>
        <p>
          To the maximum extent permitted by applicable law, the Company shall not be liable for any indirect,
          incidental, special, consequential, or punitive damages arising from your use of the Platform.
          The Company's total liability shall not exceed the amount paid by you to the Platform in the
          preceding three (3) months.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold text-gray-900 mb-2">9. Governing Law & Jurisdiction</h2>
        <p>
          These Terms shall be governed by and construed in accordance with the laws of India.
          Any disputes arising under these Terms shall be subject to the exclusive jurisdiction of the
          courts located in Rajasthan, India.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold text-gray-900 mb-2">10. Contact</h2>
        <p>
          For legal inquiries: <strong>Dinesh Global Enterprises Pvt. Ltd.</strong><br />
          Phone: <a href="tel:+917984626447" className="text-red-600">+91 79846 26447</a><br />
          Email: <a href="mailto:rawaldinesh193@gmail.com" className="text-red-600">rawaldinesh193@gmail.com</a>
        </p>
      </section>

    </PolicyLayout>
  );
}
