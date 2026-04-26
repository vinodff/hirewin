import { createBrowserClient } from '@supabase/ssr';

/* ── Singleton browser client ───────────────────────────────────
   createBrowserClient is relatively cheap, but NavAuth and other
   components were calling it on every render/mount. A singleton
   avoids re-initialising the GoTrue client repeatedly and reuses
   the existing auth listener across the app. */
let client: ReturnType<typeof createBrowserClient> | null = null;

export function createClient() {
  if (!client) {
    // Fallbacks keep the @supabase/ssr constructor from throwing during
    // Next.js static prerender when env vars are absent in the build env.
    // At runtime the real values must be provided via Netlify env vars.
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';
    client = createBrowserClient(url, key);
  }
  return client;
}
