/**
 * The one Chrome the engine drives: a persistent profile on this PC.
 *
 * Why one persistent profile and not a browser per job:
 *  - The Naukri login lives in it. A fresh browser per job is a logged-out
 *    browser per job — which is exactly why all 12 earlier attempts hit the
 *    login wall: their profiles never held a Naukri auth cookie.
 *  - Chrome locks a profile directory, so it can only be opened once. Several
 *    jobs at the same time therefore means several TABS in this one context.
 *
 * Never headless. Measured on 2026-09-14: headless Chrome gets HTTP 403
 * "Access Denied" from Naukri's CDN on every page (job search and homepage
 * alike), while the same Chrome as a normal window loads them with 200. So
 * "background" means a real window placed off-screen, not a headless browser.
 *
 * Two modes share the same profile. 'visible' is an on-screen window so the
 * owner can sign in by hand (password, OTP) — the engine never automates the
 * login. 'background' is the off-screen window runs use. Switching closes one
 * and reopens the other; closing flushes cookies to disk, so a login made in
 * the visible window is present in the background one.
 *
 * State is kept on globalThis so Next dev's module reloads do not orphan a
 * running Chrome that still holds the profile lock.
 */
import fs from 'fs';
import { chromium, type BrowserContext } from 'playwright';
import { browserProfileDir } from './paths';

export type BrowserMode = 'background' | 'visible';

interface BrowserState {
  context: BrowserContext | null;
  mode: BrowserMode | null;
  /**
   * How the open context was launched. A context left over from an older
   * build that launched headless (or with no record) is blocked by Naukri and
   * is replaced instead of reused.
   */
  headless?: boolean | null;
  opening: Promise<BrowserContext> | null;
  activeRuns: number;
}

declare global {
  // eslint-disable-next-line no-var
  var __hirewinApplyBrowser: BrowserState | undefined;
}

const state: BrowserState = (globalThis.__hirewinApplyBrowser ??= {
  context: null,
  mode: null,
  headless: null,
  opening: null,
  activeRuns: 0,
});

export const NAUKRI_LOGIN_URL = 'https://www.naukri.com/nlogin/login';

/** Far outside any monitor: the window exists (so Naukri serves it) but stays out of the way. */
const OFF_SCREEN_ARG = '--window-position=-32000,-32000';

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function launch(mode: BrowserMode): Promise<BrowserContext> {
  const dir = browserProfileDir();
  fs.mkdirSync(dir, { recursive: true });

  // HIREWIN_APPLY_VISIBLE=1 keeps run windows on-screen, to watch a run.
  const offScreen = mode === 'background' && process.env.HIREWIN_APPLY_VISIBLE !== '1';
  const options = {
    headless: false,
    viewport: { width: 1366, height: 850 },
    locale: 'en-IN',
    timezoneId: 'Asia/Kolkata',
    args: ['--disable-blink-features=AutomationControlled', ...(offScreen ? [OFF_SCREEN_ARG] : [])],
  };

  // Installed Chrome first: it is what the owner signs in with day to day, and
  // it looks like an ordinary browser to Naukri. Bundled Chromium only if the
  // Chrome channel cannot start at all.
  try {
    return await chromium.launchPersistentContext(dir, { ...options, channel: 'chrome' });
  } catch (chromeError) {
    try {
      return await chromium.launchPersistentContext(dir, options);
    } catch (chromiumError) {
      throw new Error(
        `Could not start Chrome with the HireWin profile (${message(chromeError)}; fallback: ${message(chromiumError)}). ` +
          'If a HireWin Chrome window is still open, close it and try again.'
      );
    }
  }
}

function reusable(mode?: BrowserMode): boolean {
  return state.context !== null && state.headless === false && (mode === undefined || state.mode === mode);
}

async function open(mode: BrowserMode): Promise<BrowserContext> {
  if (state.opening) await state.opening.catch(() => null);
  if (reusable(mode)) return state.context as BrowserContext;

  if (state.context) {
    if (state.activeRuns > 0) {
      throw new Error('An auto-apply run is still in progress. Wait for it to finish first.');
    }
    await state.context.close().catch(() => undefined);
    state.context = null;
    state.mode = null;
    state.headless = null;
  }

  state.opening = launch(mode);
  try {
    const context = await state.opening;
    state.context = context;
    state.mode = mode;
    state.headless = false;
    context.on('close', () => {
      // The owner closed the window, or Chrome exited. Forget it so the next
      // call relaunches instead of using a dead context.
      if (state.context === context) {
        state.context = null;
        state.mode = null;
        state.headless = null;
      }
    });
    return context;
  } finally {
    state.opening = null;
  }
}

/** Opens an on-screen Chrome window on the Naukri login page for a manual sign-in. */
export async function openLoginWindow(): Promise<void> {
  if (state.activeRuns > 0) {
    throw new Error('An auto-apply run is still in progress. Wait for it to finish first.');
  }
  const context = await open('visible');
  const page = context.pages()[0] ?? (await context.newPage());
  await page.goto(NAUKRI_LOGIN_URL, { waitUntil: 'domcontentloaded', timeout: 45_000 });
  await page.bringToFront();
}

/**
 * The context a run should use: whatever usable window is already open (a
 * visible window the owner just signed in with works perfectly well), else an
 * off-screen one.
 */
export async function contextForRun(): Promise<BrowserContext> {
  if (state.opening) await state.opening.catch(() => null);
  if (reusable()) return state.context as BrowserContext;
  return open('background');
}

export function beginRun(): void {
  state.activeRuns += 1;
}

export function endRun(): void {
  state.activeRuns = Math.max(0, state.activeRuns - 1);
}

export function browserInfo(): { open: boolean; mode: BrowserMode | null; activeRuns: number } {
  return { open: state.context !== null, mode: state.mode, activeRuns: state.activeRuns };
}
