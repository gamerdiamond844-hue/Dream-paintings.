import PolicyLayout from '../components/PolicyLayout';

export default function DmcaPage() {
  return (
    <PolicyLayout title="DMCA / Copyright Infringement Policy" lastUpdated="June 2025">

      <section>
        <h2 className="text-lg font-bold text-gray-900 mb-2">1. Our Commitment</h2>
        <p>
          Dream Paintings, operated by Dinesh Global Enterprises Pvt. Ltd., respects the intellectual property
          rights of artists and creators. We comply with the Digital Millennium Copyright Act (DMCA) and
          applicable Indian copyright law under the <strong>Copyright Act, 1957</strong>. We will respond
          promptly to valid notices of copyright infringement.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold text-gray-900 mb-2">2. Reporting Copyright Infringement</h2>
        <p>If you believe that content on our Platform infringes your copyright, please submit a written notice containing:</p>
        <ul className="list-disc pl-5 space-y-1 mt-2">
          <li>Your full legal name, address, phone number, and email address.</li>
          <li>A description of the copyrighted work you claim has been infringed.</li>
          <li>The specific URL(s) or location(s) on the Platform where the infringing content appears.</li>
          <li>A statement that you have a good-faith belief that the use is not authorized by the copyright owner, its agent, or the law.</li>
          <li>A statement, under penalty of perjury, that the information in your notice is accurate and that you are the copyright owner or authorized to act on their behalf.</li>
          <li>Your physical or electronic signature.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-bold text-gray-900 mb-2">3. Submit Your Notice To</h2>
        <p>
          <strong>Designated Copyright Agent:</strong><br />
          Dinesh Global Enterprises Pvt. Ltd.<br />
          Email: <a href="mailto:rawaldinesh193@gmail.com" className="text-red-600">rawaldinesh193@gmail.com</a><br />
          Phone: <a href="tel:+917984626447" className="text-red-600">+91 79846 26447</a>
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold text-gray-900 mb-2">4. Content Removal Process</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>Upon receipt of a valid infringement notice, we will investigate and, if warranted, remove or disable access to the infringing content.</li>
          <li>We will notify the user who posted the content of the removal.</li>
          <li>The affected user may submit a counter-notice if they believe the removal was in error.</li>
          <li>We aim to process valid notices within <strong>5–10 business days</strong>.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-bold text-gray-900 mb-2">5. Repeat Infringer Policy</h2>
        <p>
          The Platform maintains a strict repeat infringer policy. Users who are found to have repeatedly
          infringed the intellectual property rights of others will have their accounts permanently terminated.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold text-gray-900 mb-2">6. Legal Consequences</h2>
        <p>
          Copyright infringement is a serious legal matter. Offenders may be subject to:
        </p>
        <ul className="list-disc pl-5 space-y-1 mt-2">
          <li>Civil liability including damages and injunctive relief.</li>
          <li>Criminal prosecution under the Copyright Act, 1957 (India) and the IT Act, 2000.</li>
          <li>International legal action under applicable treaties including the Berne Convention.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-bold text-gray-900 mb-2">7. False Notices</h2>
        <p>
          Submitting a false or fraudulent copyright infringement notice is a serious legal offense.
          Any person who knowingly misrepresents that content is infringing may be liable for damages,
          including costs and attorneys' fees.
        </p>
      </section>

    </PolicyLayout>
  );
}
