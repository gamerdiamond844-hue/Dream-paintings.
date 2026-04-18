import PolicyLayout from '../components/PolicyLayout';

export default function RefundPage() {
  return (
    <PolicyLayout title="Refund & Cancellation Policy" lastUpdated="June 2025">

      <section>
        <h2 className="text-lg font-bold text-gray-900 mb-2">1. Overview</h2>
        <p>
          Dream Paintings, operated by Dinesh Global Enterprises Pvt. Ltd., facilitates transactions between
          buyers and independent artists. This policy governs all refund and cancellation requests on the Platform.
          By making a purchase, you agree to the terms set forth herein.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold text-gray-900 mb-2">2. Eligible Refund Conditions</h2>
        <p>A refund may be considered under the following circumstances:</p>
        <ul className="list-disc pl-5 space-y-1 mt-2">
          <li>The artwork received is significantly different from the listing description or images.</li>
          <li>The artwork arrives damaged due to improper packaging by the seller.</li>
          <li>The order was not fulfilled or shipped within the agreed timeframe and no communication was provided.</li>
          <li>A duplicate payment was charged due to a technical error.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-bold text-gray-900 mb-2">3. Non-Refundable Cases</h2>
        <p className="font-semibold text-red-700 mb-2">The following are strictly non-refundable:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Custom or commissioned paintings created specifically for the buyer.</li>
          <li>Digital artwork files once downloaded or accessed.</li>
          <li>Artworks where the buyer has changed their mind after delivery.</li>
          <li>Minor variations in color, texture, or size that are inherent to handmade artwork.</li>
          <li>Orders where the buyer provided incorrect shipping information.</li>
          <li>Artworks damaged after delivery due to buyer mishandling.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-bold text-gray-900 mb-2">4. Cancellation Policy</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>Orders may be cancelled within <strong>24 hours</strong> of placement, provided the seller has not yet shipped the item.</li>
          <li>Once an order has been shipped, cancellation is not possible.</li>
          <li>Cancellation requests must be submitted via the Platform's order management section or by contacting support.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-bold text-gray-900 mb-2">5. Refund Process & Timeline</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>Submit a refund request within <strong>7 days</strong> of receiving the order.</li>
          <li>Include photographic evidence of the issue with your request.</li>
          <li>The Platform will review the dispute within <strong>5–7 business days</strong>.</li>
          <li>Approved refunds will be processed within <strong>7–14 business days</strong> to the original payment method.</li>
          <li>The Company's decision on refund disputes is final and binding.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-bold text-gray-900 mb-2">6. Contact for Refund Requests</h2>
        <p>
          Phone: <a href="tel:+917984626447" className="text-red-600">+91 79846 26447</a><br />
          Email: <a href="mailto:rawaldinesh193@gmail.com" className="text-red-600">rawaldinesh193@gmail.com</a>
        </p>
      </section>

    </PolicyLayout>
  );
}
