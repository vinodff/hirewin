import AppNav from '@/components/app-nav';
import Footer from '@/components/footer';
import { Zap, Download, Mail } from 'lucide-react';

export const metadata = { title: 'Shipping & Delivery Policy – HireWin' };

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="text-lg font-bold text-white mb-3">{title}</h2>
      <div className="text-sm text-slate-400 leading-relaxed space-y-3">{children}</div>
    </section>
  );
}

export default function ShippingPage() {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#080d1a' }}>
      <AppNav />

      <div className="flex-1 max-w-3xl mx-auto px-4 py-12 w-full">
        <div className="mb-10">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-3">Shipping &amp; Delivery Policy</h1>
          <p className="text-sm text-slate-500">Last updated: June 6, 2026</p>
        </div>

        {/* Quick summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="rounded-2xl p-5 flex gap-3" style={{ background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.2)' }}>
            <Zap className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-purple-400 mb-1">Digital Only</p>
              <p className="text-xs text-slate-400">No physical goods are shipped</p>
            </div>
          </div>
          <div className="rounded-2xl p-5 flex gap-3" style={{ background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)' }}>
            <Download className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-emerald-400 mb-1">Instant Access</p>
              <p className="text-xs text-slate-400">Delivered online immediately after payment</p>
            </div>
          </div>
          <div className="rounded-2xl p-5 flex gap-3" style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)' }}>
            <Mail className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-blue-400 mb-1">Email Confirmation</p>
              <p className="text-xs text-slate-400">Receipt sent to your registered email</p>
            </div>
          </div>
        </div>

        <div
          className="rounded-2xl p-6 sm:p-8"
          style={{ background: '#0f1629', border: '1px solid rgba(255,255,255,0.07)' }}
        >
          <Section title="1. Nature of Our Service">
            <p>
              HireWin is a <strong className="text-white">100% digital software service</strong> (SaaS). We provide AI-powered
              resume optimization, downloadable resume and cover-letter files (PDF and DOCX), mock interview practice, and
              related career tools. <strong className="text-white">No physical products are sold or shipped.</strong> There is
              no courier, freight, or postal delivery involved in any purchase.
            </p>
          </Section>

          <Section title="2. How &amp; When Your Purchase Is Delivered">
            <ul className="list-disc list-inside space-y-1.5 pl-2">
              <li>Access to paid features (downloads, subscription benefits) is activated <strong className="text-white">instantly and automatically</strong> upon successful payment confirmation from our payment partner.</li>
              <li>Downloadable files (PDF / DOCX) are generated on demand and made available for download directly within your account, immediately after purchase.</li>
              <li>A payment receipt and confirmation are sent to your registered email address.</li>
              <li>There is no waiting period and no shipping or handling charge, as delivery is fully electronic.</li>
            </ul>
          </Section>

          <Section title="3. Delivery Timeline">
            <p>
              Digital delivery is <strong className="text-white">immediate</strong> in the vast majority of cases. In the rare
              event of a delay caused by a payment-gateway settlement lag or a temporary technical issue, access is granted
              automatically within a maximum of <strong className="text-white">24 hours</strong> of the payment being confirmed.
            </p>
          </Section>

          <Section title="4. If You Did Not Receive Access">
            <p>
              If your payment succeeded but you cannot access your purchase or download your files, please contact us. We will
              resolve genuine technical failures promptly, including a refund where applicable under our{' '}
              <a href="/refund" className="text-purple-400 hover:text-purple-300">Refund Policy</a>. When contacting us, include:
            </p>
            <ul className="list-disc list-inside space-y-1.5 pl-2">
              <li>Your registered email address</li>
              <li>Your PayU transaction ID (from your payment confirmation email)</li>
              <li>A short description of the issue</li>
            </ul>
          </Section>

          <Section title="5. Contact">
            <p>
              For any delivery or access questions, email us at{' '}
              <a href="mailto:support@hirewin.live" className="text-purple-400 hover:text-purple-300">support@hirewin.live</a>.
              We respond within <strong className="text-white">2 business days</strong> (Mon–Sat, 9 AM – 6 PM IST).
            </p>
            <p className="text-xs text-slate-500">
              HireWin is operated by Kondeti Vinod Kumar (Sole Proprietorship). Registered address available on our{' '}
              <a href="/contact" className="text-purple-400 hover:text-purple-300">Contact</a> page.
            </p>
          </Section>
        </div>
      </div>

      <Footer />
    </div>
  );
}
