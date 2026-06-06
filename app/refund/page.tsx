import AppNav from '@/components/app-nav';
import Footer from '@/components/footer';
import { CheckCircle2, XCircle, Clock } from 'lucide-react';

export const metadata = { title: 'Refund Policy – HireWin' };

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="text-lg font-bold text-white mb-3">{title}</h2>
      <div className="text-sm text-slate-400 leading-relaxed space-y-3">{children}</div>
    </section>
  );
}

export default function RefundPage() {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#080d1a' }}>
      <AppNav />

      <div className="flex-1 max-w-3xl mx-auto px-4 py-12 w-full">
        <div className="mb-10">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-3">Refund Policy</h1>
          <p className="text-sm text-slate-500">Last updated: June 6, 2026</p>
        </div>

        {/* Quick summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="rounded-2xl p-5 flex gap-3" style={{ background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)' }}>
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-emerald-400 mb-1">Eligible</p>
              <p className="text-xs text-slate-400">Technical failures preventing download after payment</p>
            </div>
          </div>
          <div className="rounded-2xl p-5 flex gap-3" style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)' }}>
            <Clock className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-yellow-400 mb-1">Case by Case</p>
              <p className="text-xs text-slate-400">Subscription cancellations within 24 hours</p>
            </div>
          </div>
          <div className="rounded-2xl p-5 flex gap-3" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
            <XCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-red-400 mb-1">Not Eligible</p>
              <p className="text-xs text-slate-400">Downloads already completed or after 7 days</p>
            </div>
          </div>
        </div>

        <div
          className="rounded-2xl p-6 sm:p-8"
          style={{ background: '#0f1629', border: '1px solid rgba(255,255,255,0.07)' }}
        >
          <Section title="1. Our Refund Philosophy">
            <p>
              We want you to be happy with HireWin. Our free tier lets you fully preview your optimized resume before paying — you only pay when you&rsquo;re ready to download. Because of this, we have a limited refund window, but we always try to resolve genuine issues fairly.
            </p>
          </Section>

          <Section title="2. One-Time Purchases (Starter Plan – ₹99)">
            <p>Refunds for one-time purchases are available if:</p>
            <ul className="list-disc list-inside space-y-1.5 pl-2">
              <li>You were charged but the download failed due to a technical error on our end.</li>
              <li>You were charged multiple times for the same purchase.</li>
              <li>You request a refund within <strong className="text-white">7 days</strong> of purchase and have not successfully downloaded the file.</li>
            </ul>
            <p>
              Once a file (PDF or DOCX) has been successfully downloaded, the purchase is considered fulfilled and is <strong className="text-white">not eligible for a refund</strong>.
            </p>
          </Section>

          <Section title="3. Subscription Plans (Pro & Power)">
            <p>For monthly or annual subscriptions:</p>
            <ul className="list-disc list-inside space-y-1.5 pl-2">
              <li>You may cancel your subscription at any time from your billing settings.</li>
              <li>Cancellation stops future renewals — you retain access until the end of your billing period.</li>
              <li>Refunds for subscription charges are considered on a case-by-case basis if requested within <strong className="text-white">24 hours</strong> of the charge and the plan features have not been used.</li>
              <li>Partial refunds for unused subscription periods are generally not provided.</li>
            </ul>
          </Section>

          <Section title="4. Non-Refundable Situations">
            <p>We do not offer refunds for:</p>
            <ul className="list-disc list-inside space-y-1.5 pl-2">
              <li>Change of mind after a successful download.</li>
              <li>Dissatisfaction with AI output quality (we recommend previewing before purchasing).</li>
              <li>Requests made more than 7 days after the purchase date.</li>
              <li>Accounts that have violated our Terms of Service.</li>
            </ul>
          </Section>

          <Section title="5. How to Request a Refund">
            <p>To request a refund, email us at <a href="mailto:support@hirewin.live" className="text-purple-400 hover:text-purple-300">support@hirewin.live</a> with:</p>
            <ul className="list-disc list-inside space-y-1.5 pl-2">
              <li>Your registered email address</li>
              <li>The date of purchase</li>
              <li>Your Razorpay payment ID (found in your payment confirmation email)</li>
              <li>A brief description of the issue</li>
            </ul>
            <p>We will respond within <strong className="text-white">2 business days</strong>. If approved, refunds are credited to your original payment method within 5–7 business days, depending on your bank.</p>
          </Section>

          <Section title="6. Payment Disputes">
            <p>
              If you believe you have been incorrectly charged, please contact us before raising a dispute with your bank or payment provider. We resolve most issues quickly and appreciate the opportunity to fix any errors directly.
            </p>
          </Section>

          <Section title="7. Contact">
            <p>
              Refund requests and payment questions:<br />
              <a href="mailto:support@hirewin.live" className="text-purple-400 hover:text-purple-300">support@hirewin.live</a>
            </p>
          </Section>
        </div>
      </div>

      <Footer />
    </div>
  );
}
