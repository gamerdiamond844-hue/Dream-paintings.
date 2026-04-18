import PolicyLayout from '../components/PolicyLayout';

export default function BuyerPolicyPage() {
  return (
    <PolicyLayout title="Buyer Policy" lastUpdated="June 2025">

      <section>
        <h2 className="text-lg font-bold text-gray-900 mb-2">1. Buyer Responsibility Before Purchase</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>Buyers are strongly advised to carefully review all listing details, including title, description, dimensions, medium, and images before completing a purchase.</li>
          <li>Buyers should contact the seller or Platform support for any clarifications prior to placing an order.</li>
          <li>By completing a purchase, the buyer confirms they have reviewed and accepted the listing as presented.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-bold text-gray-900 mb-2">2. Artwork Variations</h2>
        <p>
          Dream Paintings is a marketplace for handmade, original artworks. The Platform is
          <strong> not responsible</strong> for minor variations in color, texture, brushwork, or size between
          the listing photographs and the physical artwork received. Such variations are inherent to the
          nature of original handmade art and do not constitute grounds for a refund.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold text-gray-900 mb-2">3. Payment</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>All payments must be made through the Platform's designated payment channels.</li>
          <li>Off-platform payments are not protected by the Platform's buyer protection policies.</li>
          <li>Buyers must retain payment confirmation and transaction IDs for dispute resolution.</li>
          <li>Fraudulent payment submissions (fake proofs, chargebacks without cause) will result in account termination and legal action.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-bold text-gray-900 mb-2">4. Refund Conditions</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>Refunds are available if the artwork received is significantly different from the listing.</li>
          <li>Refunds are available if the artwork arrives damaged due to seller packaging failure.</li>
          <li>Refund requests must be submitted within <strong>7 days</strong> of delivery with photographic evidence.</li>
          <li>Custom, commissioned, and digital artworks are non-refundable once delivered.</li>
          <li>Change-of-mind returns are not accepted.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-bold text-gray-900 mb-2">5. Dispute Resolution Process</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>Buyers must first attempt to resolve disputes directly with the seller through the Platform's messaging system.</li>
          <li>If unresolved within 48 hours, buyers may escalate the dispute to Platform support.</li>
          <li>The Platform will review evidence from both parties and issue a decision within 5–7 business days.</li>
          <li>The Platform's decision on disputes is final and binding on both parties.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-bold text-gray-900 mb-2">6. Prohibited Buyer Conduct</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>Submitting false or manipulated payment proofs.</li>
          <li>Initiating unjustified chargebacks or payment reversals.</li>
          <li>Claiming non-delivery when the artwork has been received.</li>
          <li>Reselling purchased artworks as original works of the buyer's own creation.</li>
          <li>Harassing or threatening sellers or Platform staff.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-bold text-gray-900 mb-2">7. Contact</h2>
        <p>
          For buyer support:<br />
          Phone: <a href="tel:+917984626447" className="text-red-600">+91 79846 26447</a><br />
          Email: <a href="mailto:rawaldinesh193@gmail.com" className="text-red-600">rawaldinesh193@gmail.com</a>
        </p>
      </section>

    </PolicyLayout>
  );
}
