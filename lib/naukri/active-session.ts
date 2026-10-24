import { type BrowserContext } from 'playwright';

// Global singleton map to track active headful login browser contexts across API routes
declare global {
  // eslint-disable-next-line no-var
  var __hirewinNaukriActiveContexts: Map<string, BrowserContext> | undefined;
}

if (!global.__hirewinNaukriActiveContexts) {
  global.__hirewinNaukriActiveContexts = new Map<string, BrowserContext>();
}

export const activeLoginContexts = global.__hirewinNaukriActiveContexts;

/**
 * Inspect an actively open interactive browser context without hitting directory lock errors.
 */
export async function inspectActiveContext(userId: string): Promise<{
  isOpen: boolean;
  loggedIn: boolean;
  userName?: string | null;
  userEmail?: string | null;
}> {
  const context = activeLoginContexts.get(userId);
  if (!context) {
    return { isOpen: false, loggedIn: false };
  }

  try {
    // Check all open pages
    const pages = context.pages();
    if (pages.length === 0) {
      return { isOpen: true, loggedIn: false };
    }

    const page = pages[0];
    const pageUrl = page.url();

    // Check if the page is on a logged-in URL (e.g. mnjuser/homepage, mynaukri, or not on nlogin)
    const onLoginUrl = pageUrl.includes('/nlogin/login') || pageUrl.includes('naukri.com/login');

    // Inspect cookies for Naukri authentication tokens
    let hasAuthCookies = false;
    try {
      const cookies = await context.cookies('https://www.naukri.com');
      hasAuthCookies = cookies.some((c) =>
        ['nprofile', 'NkUser', 'user_type', 'SURF', 'logged_in'].includes(c.name)
      );
    } catch {
      // Cookies not yet queryable
    }

    // Inspect DOM for user profile elements if available
    let userInfo = { hasProfile: false, name: null as string | null, email: null as string | null };
    try {
      userInfo = await page.evaluate(() => {
        const nameEl = document.querySelector('.user-name, .nI-gNb-drawer__user-name, .view-profile-wrapper, .info__name');
        const emailEl = document.querySelector('.user-email, .info__email');
        const hasProfile = Boolean(
          nameEl ||
          document.querySelector('.nI-gNb-drawer') ||
          document.querySelector('a[href*="/mnjuser/profile"]') ||
          document.querySelector('.view-profile-wrapper')
        );
        return {
          hasProfile,
          name: nameEl?.textContent?.trim() || null,
          email: emailEl?.textContent?.trim() || null,
        };
      });
    } catch {
      // Page may be navigating
    }

    const isLoggedIn = (hasAuthCookies || userInfo.hasProfile) && !onLoginUrl;

    if (isLoggedIn) {
      console.log(`[active-session] Verified logged-in Naukri session for ${userId}. Name: ${userInfo.name}`);
      // Gracefully close the context to flush all cookies to disk and release the lock for headless auto-apply
      try {
        await context.close();
      } catch {
        // ignore
      }
      activeLoginContexts.delete(userId);
      return {
        isOpen: false,
        loggedIn: true,
        userName: userInfo.name || 'Verified Naukri Account',
        userEmail: userInfo.email,
      };
    }

    return {
      isOpen: true,
      loggedIn: false,
      userName: userInfo.name,
      userEmail: userInfo.email,
    };
  } catch (error) {
    console.error(`[active-session] Error inspecting context for ${userId}:`, error);
    return { isOpen: true, loggedIn: false };
  }
}
