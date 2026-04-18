import PolicyLayout from '../components/PolicyLayout';

export default function IntellectualPropertyPage() {
  return (
    <PolicyLayout title="Intellectual Property Policy" lastUpdated="June 2025">

      <section>
        <h2 className="text-lg font-bold text-gray-900 mb-2">1. Artist Ownership</h2>
        <p>
          Artists who list their original artworks on Dream Paintings retain full intellectual property
          ownership of their creations. Listing an artwork on the Platform does not transfer, assign, or
          diminish the artist's copyright or any other intellectual property rights in the artwork.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold text-gray-900 mb-2">2. License Granted to the Platform</h2>
        <p>
          By submitting artwork to the Platform, the artist grants Dinesh Global Enterprises Pvt. Ltd.
          a <strong>non-exclusive, royalty-free, worldwide license</strong> to:
        </p>
        <ul className="list-disc pl-5 space-y-1 mt-2">
          <li>Display, reproduce, and distribute images of the artwork for the purpose of operating and promoting the Platform.</li>
          <li>Use artwork images in marketing materials, social media, and promotional content related to Dream Paintings.</li>
          <li>Create thumbnails and optimized versions of artwork images for Platform display.</li>
        </ul>
        <p className="mt-2">
          This license is limited to Platform operations and does not grant the Company the right to sell,
          sublicense, or commercially exploit the artwork beyond Platform promotion.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold text-gray-900 mb-2">3. Platform Content Ownership</h2>
        <p>
          All Platform content created by the Company — including but not limited to the website design,
          logo, branding, software code, text, and user interface — is the exclusive intellectual property
          of Dinesh Global Enterprises Pvt. Ltd. and is protected by applicable copyright and trademark laws.
          Unauthorized use, reproduction, or distribution of Platform content is strictly prohibited.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold text-gray-900 mb-2">4. Buyer Rights After Purchase</h2>
        <p>
          The purchase of a physical artwork grants the buyer ownership of the physical object only.
          It does <strong>not</strong> transfer copyright, reproduction rights, or any other intellectual
          property rights to the buyer. The buyer may not reproduce, distribute, or commercially exploit
          the artwork without explicit written permission from the artist.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold text-gray-900 mb-2">5. Copyright Violation Enforcement</h2>
        <p>The Platform takes copyright infringement seriously. Actions taken against violators include:</p>
        <ul className="list-disc pl-5 space-y-1 mt-2">
          <li>Immediate removal of infringing content.</li>
          <li>Permanent suspension of the offending account.</li>
          <li>Reporting to relevant law enforcement and copyright authorities.</li>
          <li>Civil and criminal legal action under the Copyright Act, 1957 (India) and applicable international treaties.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-bold text-gray-900 mb-2">6. Reporting IP Violations</h2>
        <p>
          If you believe your intellectual property rights have been violated on this Platform,
          please refer to our <strong>DMCA / Copyright Infringement Policy</strong> or contact us at:<br />
          Email: <a href="mailto:rawaldinesh193@gmail.com" className="text-red-600">rawaldinesh193@gmail.com</a>
        </p>
      </section>

    </PolicyLayout>
  );
}
