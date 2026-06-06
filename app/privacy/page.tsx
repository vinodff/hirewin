import AppNav from '@/components/app-nav';
import Footer from '@/components/footer';

export const metadata = { title: 'Privacy Policy – HireWin' };

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="text-lg font-bold text-white mb-3">{title}</h2>
      <div className="text-sm text-slate-400 leading-relaxed space-y-3">{children}</div>
    </section>
  );
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#080d1a' }}>
      <AppNav />

      <div className="flex-1 max-w-3xl mx-auto px-4 py-12 w-full">
        <div className="mb-10">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-3">Privacy Policy</h1>
          <p className="text-sm text-slate-500">Last updated: June 6, 2026</p>
        </div>

        <div
          className="rounded-2xl p-6 sm:p-8"
          style={{ background: '#0f1629', border: '1px solid rgba(255,255,255,0.07)' }}
        >
          <Section title="1. Who We Are">
            <p>
              HireWin (&ldquo;we&rdquo;, &ldquo;our&rdquo;, &ldquo;us&rdquo;) operates <strong className="text-white">hirewin.live</strong> — an AI-powered resume optimization platform. We are committed to protecting your personal information and your right to privacy.
            </p>
            <p>
              If you have questions about this policy, contact us at <a href="mailto:support@hirewin.live" className="text-purple-400 hover:text-purple-300">support@hirewin.live</a>.
            </p>
          </Section>

          <Section title="2. Information We Collect">
            <p>We collect the following types of information:</p>
            <ul className="list-disc list-inside space-y-1.5 pl-2">
              <li><strong className="text-white">Account information:</strong> Name, email address, and profile photo (via Google OAuth).</li>
              <li><strong className="text-white">Resume content:</strong> The resume text or PDF you upload for optimization. This is used solely to generate your optimized resume.</li>
              <li><strong className="text-white">Job descriptions:</strong> Text or URLs of job descriptions you provide.</li>
              <li><strong className="text-white">Payment information:</strong> We do not store card details. Payments are processed securely by Razorpay.</li>
              <li><strong className="text-white">Usage data:</strong> Pages visited, features used, and timestamps — for analytics and improving the product.</li>
              <li><strong className="text-white">Device information:</strong> IP address, browser type, and OS — for security and rate limiting.</li>
            </ul>
          </Section>

          <Section title="3. How We Use Your Information">
            <ul className="list-disc list-inside space-y-1.5 pl-2">
              <li>To provide and improve our resume optimization service.</li>
              <li>To save your optimization history and results for your reference.</li>
              <li>To process payments and manage your subscription.</li>
              <li>To send transactional emails (e.g., payment confirmations).</li>
              <li>To prevent fraud and abuse via rate limiting.</li>
              <li>To respond to your support requests.</li>
            </ul>
            <p>We do not sell, rent, or share your personal data or resume content with third parties for marketing purposes.</p>
          </Section>

          <Section title="4. AI Processing">
            <p>
              Your resume and job description are sent to Anthropic&rsquo;s Claude API for AI processing. Anthropic processes this data to generate the optimized resume. We recommend not including highly sensitive personal information (e.g., national ID numbers, financial details) in your resume when using our service.
            </p>
            <p>
              Anthropic&rsquo;s privacy policy governs their handling of data: <a href="https://www.anthropic.com/privacy" className="text-purple-400 hover:text-purple-300" target="_blank" rel="noopener noreferrer">anthropic.com/privacy</a>.
            </p>
          </Section>

          <Section title="5. Data Storage and Security">
            <p>
              Your data is stored securely on Supabase (hosted on AWS infrastructure). We use industry-standard encryption (TLS in transit, AES-256 at rest). Access to your data is restricted to your account only.
            </p>
            <p>
              Optimization history is retained based on your plan: 1 month (Free), 6 months (Pro), or 12 months (Power). You can request deletion at any time.
            </p>
          </Section>

          <Section title="6. Cookies">
            <p>
              We use essential cookies to maintain your login session. We do not use advertising cookies or third-party tracking cookies. You can disable cookies in your browser settings, but this may affect your ability to log in.
            </p>
          </Section>

          <Section title="7. Third-Party Services">
            <p>We use the following third-party services:</p>
            <ul className="list-disc list-inside space-y-1.5 pl-2">
              <li><strong className="text-white">Supabase</strong> — database and authentication</li>
              <li><strong className="text-white">Anthropic (Claude)</strong> — AI resume optimization</li>
              <li><strong className="text-white">Razorpay</strong> — payment processing</li>
              <li><strong className="text-white">Vercel</strong> — hosting and CDN</li>
            </ul>
            <p>Each provider has its own privacy policy governing their data handling.</p>
          </Section>

          <Section title="8. Your Rights">
            <p>You have the right to:</p>
            <ul className="list-disc list-inside space-y-1.5 pl-2">
              <li>Access the personal data we hold about you.</li>
              <li>Request correction of inaccurate data.</li>
              <li>Request deletion of your account and data.</li>
              <li>Export your optimization history.</li>
            </ul>
            <p>
              To exercise any of these rights, email us at <a href="mailto:support@hirewin.live" className="text-purple-400 hover:text-purple-300">support@hirewin.live</a>. We will respond within 30 days.
            </p>
          </Section>

          <Section title="9. Children's Privacy">
            <p>
              HireWin is not intended for children under 13. We do not knowingly collect data from children. If you believe a child has provided us personal data, please contact us immediately.
            </p>
          </Section>

          <Section title="10. Changes to This Policy">
            <p>
              We may update this Privacy Policy from time to time. We will notify you of significant changes by posting the new policy on this page with an updated date. Continued use of HireWin after changes constitutes acceptance of the updated policy.
            </p>
          </Section>

          <Section title="11. Contact">
            <p>
              For privacy-related questions or requests, contact:<br />
              <a href="mailto:support@hirewin.live" className="text-purple-400 hover:text-purple-300">support@hirewin.live</a>
            </p>
          </Section>
        </div>
      </div>

      <Footer />
    </div>
  );
}
