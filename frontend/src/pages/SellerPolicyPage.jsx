import PolicyLayout from '../components/PolicyLayout';

export default function SellerPolicyPage() {
  return (
    <PolicyLayout title="Seller Policy" lastUpdated="June 2025">

      <section>
        <h2 className="text-lg font-bold text-gray-900 mb-2">1. Seller Eligibility</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>Only registered artists with an approved account may list artworks for sale.</li>
          <li>Sellers must be at least 18 years of age.</li>
          <li>Sellers must provide accurate identity and contact information during registration.</li>
          <li>The Platform reserves the right to verify seller identity and reject applications at its sole discretion.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-bold text-gray-900 mb-2">2. Original Artwork Requirement</h2>
        <p className="font-semibold text-red-700 mb-2">Only 100% original artwork is permitted on this Platform.</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>All listed artworks must be original creations by the seller.</li>
          <li>Reproductions, prints, or copies of other artists' work are strictly prohibited.</li>
          <li>Artworks that replicate, trace, or are substantially derived from copyrighted works without authorization are not allowed.</li>
          <li>Sellers must own all intellectual property rights to the artwork they list.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-bold text-gray-900 mb-2">3. Seller Authenticity Responsibility</h2>
        <p>
          The seller is <strong>solely and fully responsible</strong> for the authenticity, originality, and legal ownership
          of every artwork listed. The Platform acts as an intermediary and does not independently verify each artwork.
          Any misrepresentation of authenticity is a direct violation of these Terms and applicable law.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold text-gray-900 mb-2">4. Listing Requirements</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>Listings must include accurate title, description, medium, dimensions, and price.</li>
          <li>Images must be clear, high-quality photographs of the actual artwork.</li>
          <li>Misleading, exaggerated, or false descriptions are prohibited.</li>
          <li>Pricing must be honest and not artificially inflated for the purpose of fake discounts.</li>
          <li>All listings are subject to admin review and approval before going live.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-bold text-gray-900 mb-2">5. Commission Structure</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>The Platform may charge a commission on each completed sale. The applicable commission rate will be communicated to sellers at the time of listing or account setup.</li>
          <li>The Platform reserves the right to revise commission rates with reasonable prior notice.</li>
          <li>Sellers agree to the commission deduction as a condition of using the Platform.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-bold text-gray-900 mb-2">6. Order Fulfillment & Shipping</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>Sellers are responsible for packaging, shipping, and delivering sold artworks safely and on time.</li>
          <li>Sellers must provide tracking information to the buyer upon shipment.</li>
          <li>Artworks must be packaged to prevent damage during transit.</li>
          <li>Failure to fulfill orders within a reasonable timeframe may result in account suspension.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-bold text-gray-900 mb-2">7. Returns & Refund Obligations</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>Sellers must cooperate with the Platform's refund and dispute resolution process.</li>
          <li>If a refund is approved due to seller fault (damage, misrepresentation, non-delivery), the seller bears the financial responsibility.</li>
          <li>Sellers must accept returns for artworks that are significantly not as described.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-bold text-gray-900 mb-2">8. Prohibited Seller Conduct</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>Listing stolen, plagiarized, or counterfeit artwork.</li>
          <li>Manipulating reviews, ratings, or buyer feedback.</li>
          <li>Conducting transactions outside the Platform to avoid commission.</li>
          <li>Providing false shipping or tracking information.</li>
          <li>Creating multiple accounts to circumvent bans or restrictions.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-bold text-gray-900 mb-2">9. Penalties for Fraud</h2>
        <p className="font-semibold text-red-700">
          Any seller found engaging in fraudulent activity will face:
        </p>
        <ul className="list-disc pl-5 space-y-1 mt-2">
          <li>Immediate and permanent account ban without refund of any pending earnings.</li>
          <li>Removal of all listings from the Platform.</li>
          <li>Reporting to relevant law enforcement authorities.</li>
          <li>Civil and/or criminal legal action under applicable Indian law, including the Indian Penal Code and the IT Act, 2000.</li>
        </ul>
      </section>

    </PolicyLayout>
  );
}
