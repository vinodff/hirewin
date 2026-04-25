'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

const HEARTBEAT_MS = 45_000;

export default function PresenceBeat() {
  const pathname = usePathname();

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | null = null;

    async function beat() {
      if (cancelled) return;
      try {
        await fetch('/api/presence', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path: pathname }),
          keepalive: true,
        });
      } catch {
        // never block rendering on presence
      }
    }

    async function start() {
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();
      if (!data.user || cancelled) return;
      beat();
      timer = setInterval(beat, HEARTBEAT_MS);
    }

    start();

    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
    };
  }, [pathname]);

  return null;
}
