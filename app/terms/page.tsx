import AppNav from '@/components/app-nav';
import Footer from '@/components/footer';

export const metadata = { title: 'Terms of Service – HireWin' };

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="text-lg font-bold text-white mb-3">{title}</h2>
      <div className="text-sm text-slate-400 leading-relaxed space-y-3">{children}</div>
    </section>
  );
}

export default function TermsPage() {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#080d1a' }}>
      <AppNav />

      <div className="flex-1 max-w-3xl mx-auto px-4 py-12 w-full">
        <div className="mb-10">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-3">Terms of Service</h1>
          <p className="text-sm text-slate-500">Last updated: June 6, 2026</p>
        </div>

        <div
          className="rounded-2xl p-6 sm:p-8"
          style={{ background: '#0f1629', border: '1px solid rgba(255,255,255,0.07)' }}
        >
          <Section title="1. Acceptance of Terms">
            <p>
              HireWin (<strong className="text-white">hirewin.live</strong>) is owned and operated by
              {' '}<strong className="text-white">Kondeti Vinod Kumar</strong>, a Sole Proprietorship registered in
              Andhra Pradesh, India (&ldquo;HireWin&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;).
            </p>
            <p>
              By accessing or using HireWin, you agree to be bound by these Terms of Service. If you do not agree, please do not use our service.
            </p>
            <p>
              We reserve the right to update these terms at any time. Continued use of the platform after changes constitutes acceptance of the revised terms.
            </p>
          </Section>

          <Section title="2. Description of Service">
            <p>
              HireWin is an AI-powered resume optimization platform that helps jobseekers tailor their resumes to specific job descriptions. Our service includes:
            </p>
            <ul className="list-disc list-inside space-y-1.5 pl-2">
              <li>AI resume optimization and ATS scoring</li>
              <li>Keyword analysis and skill gap identification</li>
              <li>Resume builder</li>
              <li>Job application tracker</li>
              <li>PDF and DOCX download (paid feature)</li>
              <li>Cold outreach generation</li>
              <li>Voice interview practice</li>
            </ul>
          </Section>

          <Section title="3. User Accounts">
            <p>
              Some features require a registered account. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You must provide accurate and complete information when creating an account.
            </p>
            <p>
              You may not use another person&rsquo;s account or share your account credentials with others.
            </p>
          </Section>

          <Section title="4. Acceptable Use">
            <p>You agree not to:</p>
            <ul className="list-disc list-inside space-y-1.5 pl-2">
              <li>Use HireWin to generate false, misleading, or fraudulent resume content.</li>
              <li>Abuse the AI system through excessive automated requests.</li>
              <li>Attempt to reverse-engineer, hack, or disrupt our services.</li>
              <li>Use the service for any unlawful purpose.</li>
              <li>Resell or redistribute our service without written permission.</li>
              <li>Impersonate any person or entity.</li>
            </ul>
            <p>
              We reserve the right to suspend or terminate accounts that violate these terms without notice.
            </p>
          </Section>

          <Section title="5. Payments and Plans">
            <p>
              HireWin offers both free and paid plans. Paid plans include one-time purchases and subscriptions. All prices are in Indian Rupees (₹) and inclusive of applicable taxes unless stated otherwise.
            </p>
            <p>
              Payments are processed by Cashfree. By making a payment, you agree to Cashfree&rsquo;s terms of service. We do not store your card or banking details.
            </p>
            <p>
              Subscription plans auto-renew unless cancelled before the renewal date. You can cancel your subscription at any time from your billing settings.
            </p>
          </Section>

          <Section title="6. Refunds">
            <p>
              Please refer to our <a href="/refund" className="text-purple-400 hover:text-purple-300">Refund Policy</a> for complete details on eligibility and process.
            </p>
          </Section>

          <Section title="7. Intellectual Property">
            <p>
              The HireWin platform, including its design, code, AI models, and content, is owned by HireWin and protected by applicable intellectual property laws.
            </p>
            <p>
              You retain ownership of the resume content you upload. By using our service, you grant HireWin a limited, non-exclusive license to process your resume content for the purpose of providing the service.
            </p>
          </Section>

          <Section title="8. AI-Generated Content Disclaimer">
            <p>
              HireWin uses AI to generate optimized resume content. While we strive for accuracy, AI-generated content may not always be perfect. You are solely responsible for reviewing the output before using it in any job application.
            </p>
            <p>
              HireWin does not guarantee that using our service will result in job interviews or employment offers. Results vary based on many factors outside our control.
            </p>
          </Section>

          <Section title="9. Limitation of Liability">
            <p>
              To the maximum extent permitted by applicable law, HireWin shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including loss of profits, data, or goodwill, arising out of or in connection with your use of the service.
            </p>
            <p>
              Our total liability to you for any claim arising from these terms or your use of the service shall not exceed the amount you paid us in the 12 months prior to the claim.
            </p>
          </Section>

          <Section title="10. Disclaimer of Warranties">
            <p>
              HireWin is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo; without warranties of any kind, either express or implied. We do not warrant that the service will be uninterrupted, error-free, or free of viruses.
            </p>
          </Section>

          <Section title="11. Governing Law">
            <p>
              These terms are governed by the laws of India. Any disputes shall be subject to the exclusive jurisdiction of the courts in Hyderabad, Telangana, India.
            </p>
          </Section>

          <Section title="12. Contact">
            <p>
              For questions about these Terms, contact us at:<br />
              <a href="mailto:support@hirewin.live" className="text-purple-400 hover:text-purple-300">support@hirewin.live</a>
            </p>
          </Section>
        </div>
      </div>

      <Footer />
    </div>
  );
}
