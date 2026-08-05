import { createClient } from '@/lib/supabase/server';
import { isAdminEmail } from '@/lib/admin-emails';

// Re-exported so existing callers keep working; the implementation lives in
// lib/admin-emails.ts because that module has no server-only imports.
export { isAdminEmail, parseAdminEmails } from '@/lib/admin-emails';

/** Returns the admin user or null. Use in admin pages + API routes. */
export async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdminEmail(user.email)) return null;
  return user;
}
