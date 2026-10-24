import { NextRequest, NextResponse } from 'next/server';
import { chromium, type BrowserContext } from 'playwright';
import fs from 'fs';
import { createClient } from '@/lib/supabase/server';
import { clientIp } from '@/lib/rate-limit';
import { sessionDirForUser } from '@/lib/naukri/safety';
import { activeLoginContexts } from '@/lib/naukri/active-session';
import { localRunnerVerdict } from '@/lib/apply/local-only';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  // Superseded by /api/apply/session. Opens a visible browser on the machine
  // running the server, so it must never be reachable from outside this PC.
  const verdict = localRunnerVerdict(req);
  if (!verdict.ok) return NextResponse.json({ error: verdict.reason }, { status: 403 });
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const ip = clientIp(req);
    const userId = user?.id || `anon_${ip.replace(/[^a-zA-Z0-9]/g, '_')}`;
    const sessionDir = sessionDirForUser(userId);

    fs.mkdirSync(sessionDir, { recursive: true });

    // If a login context is already active for this user, bring it forward or close it
    const existing = activeLoginContexts.get(userId);
    if (existing) {
      try {
        await existing.close();
      } catch {
        // ignore if already closed
      }
      activeLoginContexts.delete(userId);
    }

    const launchOptions: any = {
      headless: false,
      channel: 'chrome',
      viewport: { width: 1280, height: 800 },
      args: ['--disable-blink-features=AutomationControlled'],
    };

    let context: BrowserContext;
    try {
      context = await chromium.launchPersistentContext(sessionDir, launchOptions);
    } catch {
      delete launchOptions.channel;
      context = await chromium.launchPersistentContext(sessionDir, launchOptions);
    }

    activeLoginContexts.set(userId, context);

    context.on('close', () => {
      activeLoginContexts.delete(userId);
    });

    const page = context.pages().length > 0 ? context.pages()[0] : await context.newPage();
    await page.goto('https://www.naukri.com/nlogin/login', { waitUntil: 'domcontentloaded' });

    return NextResponse.json({
      success: true,
      message: 'Browser window launched on your desktop. Sign into your Naukri account, then close the browser window or click Verify.',
    });
  } catch (error) {
    console.error('[naukri/session/launch] Error launching login window:', error);
    const message = error instanceof Error ? error.message : 'Failed to launch login window';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
