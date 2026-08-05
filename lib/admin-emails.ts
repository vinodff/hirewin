/**
 * Pure admin-email check. Deliberately has ZERO imports.
 *
 * lib/admin.ts pulls in the server Supabase client (which uses next/headers),
 * so it can never be imported from anywhere that might reach a client bundle.
 * Quota gates need the email check without that baggage, so it lives here and
 * lib/admin.ts re-exports it.
 *
 * ADMIN_EMAILS has no NEXT_PUBLIC_ prefix, so the list never ships to the
 * browser. Callers must pass an email that came from supabase.auth.getUser()
 * server-side — never one from a request body, header or query param.
 */
export function parseAdminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return parseAdminEmails().includes(email.toLowerCase());
}
