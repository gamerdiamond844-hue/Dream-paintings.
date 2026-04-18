import PolicyLayout from '../components/PolicyLayout';

export default function DisclaimerPage() {
  return (
    <PolicyLayout title="Disclaimer" lastUpdated="June 2025">

      <section>
        <h2 className="text-lg font-bold text-gray-900 mb-2">1. Platform as Intermediary</h2>
        <p>
          Dream Paintings, operated by Dinesh Global Enterprises Pvt. Ltd., is an online marketplace that
          acts solely as an <strong>intermediary platform</strong> connecting independent artists (sellers)
          with buyers. The Company is not a party to any transaction between buyers and sellers and does not
          take ownership of any artwork listed on the Platform.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold text-gray-900 mb-2">2. No Guarantee of Artwork Authenticity</h2>
        <p>
          The Platform does not independently verify, authenticate, or certify the originality of any artwork
          listed by sellers. <strong>The seller is solely and exclusively responsible</strong> for the
          authenticity, originality, and legal ownership of all artworks they list. The Company makes no
          representations or warranties regarding the authenticity of any artwork.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold text-gray-900 mb-2">3. Limited Liability</h2>
        <p>To the maximum extent permitted by applicable law:</p>
        <ul className="list-disc pl-5 space-y-1 mt-2">
          <li>The Company shall not be liable for any loss, damage, or harm arising from transactions between buyers and sellers.</li>
          <li>The Company shall not be liable for the quality, safety, legality, or authenticity of items listed.</li>
          <li>The Company shall not be liable for any failure or delay in delivery by sellers.</li>
          <li>The Company shall not be liable for any indirect, incidental, consequential, or punitive damages.</li>
          <li>The Company's maximum liability in any matter shall not exceed the transaction value of the specific order in dispute.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-bold text-gray-900 mb-2">4. No Warranty</h2>
        <p>
          The Platform is provided on an "as is" and "as available" basis without any warranties of any kind,
          either express or implied, including but not limited to warranties of merchantability, fitness for a
          particular purpose, or non-infringement.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold text-gray-900 mb-2">5. External Links</h2>
        <p>
          The Platform may contain links to third-party websites or services. The Company has no control over
          and assumes no responsibility for the content, privacy policies, or practices of any third-party sites.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold text-gray-900 mb-2">6. Accuracy of Information</h2>
        <p>
          While we strive to keep information on the Platform accurate and up to date, we make no representations
          or warranties about the completeness, accuracy, reliability, or availability of any information on the Platform.
        </p>
      </section>

    </PolicyLayout>
  );
}
