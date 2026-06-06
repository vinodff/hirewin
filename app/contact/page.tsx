'use client';

import { useState } from 'react';
import { Mail, MessageSquare, Clock, CheckCircle2, MapPin } from 'lucide-react';
import AppNav from '@/components/app-nav';
import Footer from '@/components/footer';

const cardStyle = { background: '#0f1629', border: '1px solid rgba(255,255,255,0.07)' };
const inputStyle = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.1)',
  color: '#e2e8f0',
};

export default function ContactPage() {
  const [form, setForm]     = useState({ name: '', email: '', subject: '', message: '' });
  const [sending, setSending] = useState(false);
  const [sent, setSent]     = useState(false);
  const [error, setError]   = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) {
      setError('Please fill in all required fields.');
      return;
    }
    setSending(true);
    setError('');
    try {
      // Opens default email client pre-filled — no backend needed
      const subject = encodeURIComponent(form.subject || 'HireWin Support Request');
      const body = encodeURIComponent(
        `Name: ${form.name}\nEmail: ${form.email}\n\n${form.message}`
      );
      window.location.href = `mailto:support@hirewin.live?subject=${subject}&body=${body}`;
      setSent(true);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#080d1a' }}>
      <AppNav />

      <div className="flex-1 max-w-4xl mx-auto px-4 py-12 w-full">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-3">Contact Us</h1>
          <p className="text-slate-400 text-sm max-w-md mx-auto">
            Have a question, issue, or feedback? We'd love to hear from you. We typically respond within 24 hours.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Info cards */}
          <div className="space-y-4">
            <div className="rounded-2xl p-5" style={cardStyle}>
              <Mail className="w-5 h-5 text-purple-400 mb-3" />
              <h3 className="font-semibold text-white text-sm mb-1">Email Us</h3>
              <a href="mailto:support@hirewin.live" className="text-xs text-purple-400 hover:text-purple-300 transition-colors">
                support@hirewin.live
              </a>
              <p className="text-xs text-slate-500 mt-1">For all inquiries and support</p>
            </div>

            <div className="rounded-2xl p-5" style={cardStyle}>
              <MapPin className="w-5 h-5 text-pink-400 mb-3" />
              <h3 className="font-semibold text-white text-sm mb-1">Registered Address</h3>
              <p className="text-xs text-slate-300 font-medium">Kondeti Vinod Kumar</p>
              <address className="text-xs text-slate-400 mt-1 not-italic leading-relaxed">
                1-264, Laku Peta, Sakhinetipalli<br />
                Laku, Sakhinetipalli, Sakhinetipalle
              </address>
            </div>

            <div className="rounded-2xl p-5" style={cardStyle}>
              <Clock className="w-5 h-5 text-blue-400 mb-3" />
              <h3 className="font-semibold text-white text-sm mb-1">Response Time</h3>
              <p className="text-xs text-slate-400">Within 24 hours</p>
              <p className="text-xs text-slate-500 mt-1">Mon–Sat, 9 AM – 6 PM IST</p>
            </div>

            <div className="rounded-2xl p-5" style={cardStyle}>
              <MessageSquare className="w-5 h-5 text-emerald-400 mb-3" />
              <h3 className="font-semibold text-white text-sm mb-1">Common Topics</h3>
              <ul className="text-xs text-slate-400 space-y-1 mt-1">
                <li>· Billing & payments</li>
                <li>· Refund requests</li>
                <li>· Account issues</li>
                <li>· Feature requests</li>
                <li>· Bug reports</li>
              </ul>
            </div>
          </div>

          {/* Form */}
          <div className="md:col-span-2 rounded-2xl p-6" style={cardStyle}>
            {sent ? (
              <div className="flex flex-col items-center justify-center h-full gap-4 py-10 text-center">
                <CheckCircle2 className="w-12 h-12 text-emerald-400" />
                <h3 className="text-xl font-bold text-white">Email client opened!</h3>
                <p className="text-sm text-slate-400 max-w-xs">
                  Your message is pre-filled in your email app. Hit send and we'll get back to you within 24 hours.
                </p>
                <button
                  onClick={() => { setSent(false); setForm({ name: '', email: '', subject: '', message: '' }); }}
                  className="text-sm text-purple-400 hover:text-purple-300 transition-colors mt-2"
                >
                  Send another message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <h2 className="font-semibold text-white mb-4">Send a Message</h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1.5">
                      Name <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                      placeholder="Your name"
                      className="w-full rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500/50 placeholder-slate-600"
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1.5">
                      Email <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                      placeholder="your@email.com"
                      className="w-full rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500/50 placeholder-slate-600"
                      style={inputStyle}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1.5">Subject</label>
                  <input
                    type="text"
                    value={form.subject}
                    onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                    placeholder="How can we help?"
                    className="w-full rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500/50 placeholder-slate-600"
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1.5">
                    Message <span className="text-red-400">*</span>
                  </label>
                  <textarea
                    value={form.message}
                    onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                    placeholder="Describe your issue or question in detail…"
                    rows={6}
                    className="w-full rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-purple-500/50 placeholder-slate-600"
                    style={inputStyle}
                  />
                </div>

                {error && <p className="text-xs text-red-400">{error}</p>}

                <button
                  type="submit"
                  disabled={sending}
                  className="w-full py-3 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 disabled:opacity-60"
                  style={{ background: 'linear-gradient(135deg, #7c3aed, #3b82f6)' }}
                >
                  {sending ? 'Opening email…' : 'Send Message →'}
                </button>

                <p className="text-xs text-slate-600 text-center">
                  This will open your email client with the message pre-filled.
                </p>
              </form>
            )}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
