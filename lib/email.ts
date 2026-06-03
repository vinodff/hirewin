import { Resend } from 'resend';

let _resend: Resend | null = null;

function getResend(): Resend {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error('RESEND_API_KEY is not set');
  if (!_resend) _resend = new Resend(apiKey);
  return _resend;
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://hirewin.live';
const FROM = process.env.EMAIL_FROM ?? 'HireWin <hello@hirewin.live>';

function monthName(month: string): string {
  const [year, m] = month.split('-');
  return new Date(parseInt(year), parseInt(m) - 1, 1)
    .toLocaleString('en-US', { month: 'long', year: 'numeric' });
}

function prevMonth(): string {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function buildCreditsResetHtml(opts: {
  name: string;
  usedLast: number;
  lastMonthLabel: string;
  freeCredits: number;
}): string {
  const { name, usedLast, lastMonthLabel, freeCredits } = opts;
  const firstName = name.split(' ')[0] || 'there';

  const usageLine = usedLast > 0
    ? `You used <strong>${usedLast} optimization${usedLast !== 1 ? 's' : ''}</strong> in ${lastMonthLabel}. Your ${freeCredits} free credit${freeCredits !== 1 ? 's' : ''} just reset — ready when you are.`
    : `Your ${freeCredits} free credit${freeCredits !== 1 ? 's' : ''} just reset for the new month — ready when you are.`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Your credits are back</title>
</head>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">

          <!-- Logo / Brand -->
          <tr>
            <td align="center" style="padding-bottom:28px;">
              <span style="font-size:22px;font-weight:700;letter-spacing:-0.5px;background:linear-gradient(135deg,#7c3aed,#3b82f6);-webkit-background-clip:text;-webkit-text-fill-color:transparent;color:#7c3aed;">
                HireWin
              </span>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background:#ffffff;border-radius:16px;padding:40px 40px 32px;box-shadow:0 2px 12px rgba(0,0,0,0.06);">

              <!-- Headline -->
              <p style="margin:0 0 8px;font-size:24px;font-weight:700;color:#0f172a;line-height:1.3;">
                Your credits are back, ${firstName}.
              </p>
              <p style="margin:0 0 32px;font-size:15px;color:#64748b;line-height:1.6;">
                ${usageLine}
              </p>

              <!-- Credits box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,#f5f3ff,#eff6ff);border-radius:12px;border:1px solid #e0e7ff;margin-bottom:32px;">
                <tr>
                  <td style="padding:24px 28px;">
                    <p style="margin:0 0 4px;font-size:12px;font-weight:600;color:#7c3aed;text-transform:uppercase;letter-spacing:0.8px;">Available now</p>
                    <p style="margin:0;font-size:52px;font-weight:800;color:#4c1d95;line-height:1;">${freeCredits}</p>
                    <p style="margin:4px 0 0;font-size:14px;color:#6d28d9;font-weight:500;">free optimization${freeCredits !== 1 ? 's' : ''} this month</p>
                  </td>
                </tr>
              </table>

              <!-- Description -->
              <p style="margin:0 0 28px;font-size:15px;color:#475569;line-height:1.7;">
                Paste a new job description and let HireWin rewrite your resume to match it exactly — keywords, structure, tone, ATS score.
              </p>

              <!-- CTA -->
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="border-radius:10px;background:linear-gradient(135deg,#7c3aed,#3b82f6);">
                    <a href="${SITE_URL}/analyze"
                       style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:10px;letter-spacing:-0.2px;">
                      Optimize my resume →
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Upsell -->
              <p style="margin:28px 0 0;font-size:13px;color:#94a3b8;line-height:1.6;">
                Want more than ${freeCredits} per month?
                <a href="${SITE_URL}/pricing" style="color:#7c3aed;text-decoration:none;font-weight:500;">Pro gives you 20</a>
                — enough for a serious job search.
              </p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding-top:24px;">
              <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.8;">
                HireWin &nbsp;·&nbsp;
                <a href="${SITE_URL}/privacy" style="color:#94a3b8;text-decoration:none;">Privacy</a>
                &nbsp;·&nbsp;
                <a href="${SITE_URL}/unsubscribe" style="color:#94a3b8;text-decoration:none;">Unsubscribe</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function sendCreditsResetEmail(opts: {
  to: string;
  name: string;
  usedLast: number;
  freeCredits: number;
}) {
  const lastMonthLabel = monthName(prevMonth());
  const html = buildCreditsResetHtml({
    name: opts.name,
    usedLast: opts.usedLast,
    lastMonthLabel,
    freeCredits: opts.freeCredits,
  });

  const firstName = opts.name.split(' ')[0] || 'there';

  const resend = getResend();
  const { error } = await resend.emails.send({
    from: FROM,
    to: opts.to,
    subject: `Your ${opts.freeCredits} free resume optimization${opts.freeCredits !== 1 ? 's' : ''} just reset`,
    html,
    text: `Hi ${firstName},\n\nYour ${opts.freeCredits} free resume optimization${opts.freeCredits !== 1 ? 's' : ''} just reset for the new month.\n\nOptimize your resume: ${SITE_URL}/analyze\n\nHireWin`,
  });

  if (error) throw new Error(`Resend error: ${error.message}`);
}
