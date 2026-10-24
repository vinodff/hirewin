/**
 * Naukri connection for the local auto-apply engine.
 *
 * GET  — is the HireWin Chrome profile signed in to Naukri? Answered by
 *        actually inspecting the browser (cookies / logged-in page), never by
 *        a flag the UI sets. The evidence string says what was seen.
 * POST — open a visible Chrome window on the Naukri login page so the owner
 *        can sign in by hand. The engine does not type passwords or OTPs.
 */
import { NextRequest, NextResponse } from 'next/server';
import { browserInfo, openLoginWindow, contextForRun } from '@/lib/apply/browser';
import { localRunnerVerdict } from '@/lib/apply/local-only';
import { checkNaukriLogin } from '@/lib/apply/naukri';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function refuse(reason: string) {
  return NextResponse.json({ error: reason }, { status: 403 });
}

export async function GET(req: NextRequest) {
  const verdict = localRunnerVerdict(req);
  if (!verdict.ok) return refuse(verdict.reason ?? 'Not available.');

  try {
    const context = await contextForRun();
    const page = await context.newPage();
    try {
      const login = await checkNaukriLogin(page);
      return NextResponse.json({ ...login, browser: browserInfo() });
    } finally {
      await page.close().catch(() => undefined);
    }
  } catch (error) {
    return NextResponse.json(
      { loggedIn: false, evidence: 'check failed', error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const verdict = localRunnerVerdict(req);
  if (!verdict.ok) return refuse(verdict.reason ?? 'Not available.');

  try {
    await openLoginWindow();
    return NextResponse.json({
      opened: true,
      message:
        'A Chrome window opened on this PC at the Naukri login page. Sign in there (enter the OTP if Naukri asks), then click "Check connection".',
    });
  } catch (error) {
    return NextResponse.json(
      { opened: false, error: error instanceof Error ? error.message : String(error) },
      { status: 409 }
    );
  }
}
