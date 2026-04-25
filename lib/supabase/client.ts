import { createBrowserClient } from '@supabase/ssr';

/* ── Singleton browser client ───────────────────────────────────
   createBrowserClient is relatively cheap, but NavAuth and other
   components were calling it on every render/mount. A singleton
   avoids re-initialising the GoTrue client repeatedly and reuses
   the existing auth listener across the app. */
let client: ReturnType<typeof createBrowserClient> | null = null;

export function createClient() {
  if (!client) {
    client = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  return client;
}
