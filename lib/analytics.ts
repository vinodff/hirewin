type EventName =
  | 'upload_started'
  | 'upload_complete'
  | 'analysis_started'
  | 'analysis_complete'
  | 'download_pdf'
  | 'download_docx'
  | 'history_viewed'
  | 'pricing_viewed'
  | 'payment_started'
  | 'payment_complete'
  | 'signup'
  | 'login';

export async function trackEvent(
  name: EventName,
  data?: Record<string, unknown>,
  sessionHash?: string
) {
  if (typeof window === 'undefined') return;

  try {
    await fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: name, data, sessionHash }),
      keepalive: true,
    });
  } catch {
    // analytics must never break the app
  }
}

export function getSessionHash(): string {
  if (typeof window === 'undefined') return 'server';
  let hash = sessionStorage.getItem('hw_session');
  if (!hash) {
    hash = Math.random().toString(36).slice(2) + Date.now().toString(36);
    sessionStorage.setItem('hw_session', hash);
  }
  return hash;
}
