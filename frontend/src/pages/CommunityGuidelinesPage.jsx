import PolicyLayout from '../components/PolicyLayout';

export default function CommunityGuidelinesPage() {
  return (
    <PolicyLayout title="Community Guidelines" lastUpdated="June 2025">

      <section>
        <h2 className="text-lg font-bold text-gray-900 mb-2">1. Our Community Standards</h2>
        <p>
          Dream Paintings is a professional art marketplace dedicated to celebrating original creativity.
          All users — buyers, artists, and visitors — are expected to conduct themselves with respect,
          integrity, and professionalism. These guidelines exist to maintain a safe, inclusive, and
          trustworthy environment for everyone.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold text-gray-900 mb-2">2. Respectful Conduct</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>Treat all users with respect and courtesy in all interactions, including comments and messages.</li>
          <li>Constructive criticism of artwork is welcome; personal attacks, harassment, or bullying are not.</li>
          <li>Discriminatory language based on race, religion, gender, nationality, disability, or sexual orientation is strictly prohibited.</li>
          <li>Threatening, intimidating, or abusive behavior toward any user or Platform staff will result in immediate account termination.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-bold text-gray-900 mb-2">3. Prohibited Content</h2>
        <p className="font-semibold text-red-700 mb-2">The following content is strictly prohibited on the Platform:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Artwork or content that is sexually explicit, pornographic, or obscene.</li>
          <li>Content that promotes, glorifies, or depicts violence, terrorism, or illegal activities.</li>
          <li>Artwork that infringes upon the copyright or intellectual property of any third party.</li>
          <li>Content that is defamatory, libelous, or constitutes hate speech.</li>
          <li>Spam, unsolicited promotional content, or repetitive irrelevant comments.</li>
          <li>Content that violates any applicable local, national, or international law.</li>
          <li>Artwork depicting minors in any inappropriate or exploitative manner.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-bold text-gray-900 mb-2">4. Authentic Engagement</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>Do not post fake reviews, manipulated ratings, or misleading testimonials.</li>
          <li>Do not use automated bots or scripts to interact with the Platform.</li>
          <li>Do not create multiple accounts to circumvent bans or gain unfair advantages.</li>
          <li>Do not solicit or offer payments in exchange for positive reviews.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-bold text-gray-900 mb-2">5. Privacy of Others</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>Do not share personal information of other users without their explicit consent.</li>
          <li>Do not photograph, record, or distribute content featuring other individuals without their permission.</li>
          <li>Respect the privacy and confidentiality of all communications on the Platform.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-bold text-gray-900 mb-2">6. Reporting Violations</h2>
        <p>
          If you encounter content or behavior that violates these guidelines, please report it to us immediately:<br />
          Email: <a href="mailto:rawaldinesh193@gmail.com" className="text-red-600">rawaldinesh193@gmail.com</a><br />
          Phone: <a href="tel:+917984626447" className="text-red-600">+91 79846 26447</a>
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold text-gray-900 mb-2">7. Enforcement</h2>
        <p>
          Violations of these Community Guidelines may result in:
        </p>
        <ul className="list-disc pl-5 space-y-1 mt-2">
          <li>Content removal without notice.</li>
          <li>Temporary or permanent account suspension.</li>
          <li>Reporting to law enforcement where applicable.</li>
          <li>Legal action for serious violations.</li>
        </ul>
        <p className="mt-2">
          The Platform reserves the right to make enforcement decisions at its sole discretion.
          All decisions are final.
        </p>
      </section>

    </PolicyLayout>
  );
}
