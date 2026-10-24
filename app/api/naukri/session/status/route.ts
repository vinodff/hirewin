import { NextRequest, NextResponse } from 'next/server';
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { createClient } from '@/lib/supabase/server';
import { clientIp } from '@/lib/rate-limit';
import { sessionDirForUser } from '@/lib/naukri/safety';
import { inspectActiveContext } from '@/lib/naukri/active-session';
import { localRunnerVerdict } from '@/lib/apply/local-only';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  // Superseded by /api/apply/session; launches a browser, so local-only.
  const verdict = localRunnerVerdict(req);
  if (!verdict.ok) return NextResponse.json({ loggedIn: false, error: verdict.reason }, { status: 403 });
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const ip = clientIp(req);
    const userId = user?.id || `anon_${ip.replace(/[^a-zA-Z0-9]/g, '_')}`;
    const sessionDir = sessionDirForUser(userId);

    // 1. Inspect any actively open headful browser window first
    const activeCheck = await inspectActiveContext(userId);
    if (activeCheck.loggedIn) {
      return NextResponse.json({
        loggedIn: true,
        userName: activeCheck.userName,
        userEmail: activeCheck.userEmail,
      });
    }
    if (activeCheck.isOpen) {
      return NextResponse.json({
        loggedIn: false,
        browserOpen: true,
        message: 'Login window is open on your desktop. Please sign into Naukri in that window, then click Verify.',
      });
    }

    // 2. If session directory does not exist or has no cookies, definitely not logged in
    if (!fs.existsSync(sessionDir)) {
      return NextResponse.json({ loggedIn: false });
    }

    const cookiePath1 = path.join(sessionDir, 'Default', 'Network', 'Cookies');
    const cookiePath2 = path.join(sessionDir, 'Default', 'Cookies');
    const hasCookies = fs.existsSync(cookiePath1) || fs.existsSync(cookiePath2);

    if (!hasCookies) {
      return NextResponse.json({ loggedIn: false });
    }

    // Launch a quick headless check on saved profile
    let context;
    try {
      context = await chromium.launchPersistentContext(sessionDir, {
        headless: true,
        timeout: 8000,
        args: ['--disable-blink-features=AutomationControlled'],
      });
    } catch (launchErr) {
      return NextResponse.json({
        loggedIn: false,
        browserOpen: true,
        message: 'Login window or lock is active. Please finish signing in and close the window, then click Verify.',
      });
    }

    try {
      const page = context.pages().length > 0 ? context.pages()[0] : await context.newPage();
      page.setDefaultTimeout(7000);

      await page.goto('https://www.naukri.com/mnjuser/homepage', {
        waitUntil: 'domcontentloaded',
      });
      await page.waitForTimeout(1500);

      const pageUrl = page.url();
      const isLoginUrl = pageUrl.includes('/nlogin/login') || pageUrl.includes('login');

      if (isLoginUrl) {
        await context.close();
        return NextResponse.json({ loggedIn: false });
      }

      const userInfo = await page.evaluate(() => {
        const nameEl = document.querySelector('.user-name, .nI-gNb-drawer__user-name, .view-profile-wrapper, .info__name');
        const emailEl = document.querySelector('.user-email, .info__email');
        const hasProfile = Boolean(
          nameEl ||
          document.querySelector('.nI-gNb-drawer') ||
          document.querySelector('a[href*="/mnjuser/profile"]')
        );
        return {
          hasProfile,
          name: nameEl?.textContent?.trim() || null,
          email: emailEl?.textContent?.trim() || null,
        };
      });

      await context.close();

      return NextResponse.json({
        loggedIn: userInfo.hasProfile,
        userName: userInfo.name,
        userEmail: userInfo.email,
      });
    } catch (checkErr) {
      await context.close().catch(() => {});
      return NextResponse.json({ loggedIn: false });
    }
  } catch (error) {
    console.error('[naukri/session/status] Error checking session status:', error);
    return NextResponse.json({ loggedIn: false });
  }
}
