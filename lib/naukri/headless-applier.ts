import { chromium, type BrowserContext, type Page } from 'playwright';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import type { NaukriJobListing } from './types';
import type { RealApplicantVault } from './profile-vault';
import { checkJobUrl, proofsDir, safeIdFragment } from './safety';

export interface AutoApplyOptions {
  job: NaukriJobListing;
  vault: RealApplicantVault;
  headless?: boolean; // default true for silent background operation
  dryRun?: boolean; // if true, fills form but does not hit final submit
  sessionDir?: string;
  timeoutMs?: number;
}

export interface AutoApplyResult {
  jobId: string;
  jobTitle: string;
  company: string;
  /**
   * `applied` means a submit control was found, clicked, AND the page stopped
   * showing it. Anything less honest than that is `needs_review`: the form was
   * filled but nobody can say an application was actually submitted.
   */
  status:
    | 'applied'
    | 'needs_review'
    | 'form_filled'
    | 'external_redirect'
    | 'requires_login'
    | 'error';
  message: string;
  filledFields: string[];
  proofScreenshotPath?: string;
  externalUrl?: string;
  durationMs: number;
}

const DEFAULT_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

/**
 * Headless Playwright engine that automates applying to a Naukri job
 * in the background using real candidate data without any extension.
 */
export async function applyToNaukriJob(options: AutoApplyOptions): Promise<AutoApplyResult> {
  const startTime = Date.now();
  const { job, vault, dryRun = false, headless = true, timeoutMs = 30000 } = options;

  const reject = (message: string): AutoApplyResult => ({
    jobId: job?.id ?? 'unknown',
    jobTitle: job?.title ?? '',
    company: job?.company ?? '',
    status: 'error',
    message,
    filledFields: [],
    durationMs: Date.now() - startTime,
  });

  /*
   * Gate the URL BEFORE launching anything.
   *
   * `page.goto()` on a URL from a request body is server-side request forgery
   * with a browser attached: it will fetch cloud metadata endpoints, localhost
   * admin panels and internal services, and the old code then screenshotted the
   * result into a public directory. The allowlist lives in safety.ts.
   */
  const urlCheck = checkJobUrl(job?.jobUrl);
  if (!urlCheck.allowed) {
    console.error(`[headless-applier] blocked navigation: ${urlCheck.reason}`);
    return reject(urlCheck.reason ?? 'job URL rejected');
  }

  /*
   * A session directory is REQUIRED, never defaulted.
   *
   * The old default put every caller in one shared browser profile under
   * process.cwd(), so whoever logged into Naukri last is who everyone else
   * applied as — their cookies, their account, their name on the application.
   * Making it required means a caller cannot get that by omission.
   */
  if (!options.sessionDir) {
    return reject('sessionDir is required — refusing to share one browser profile across users');
  }
  const sessionPath = options.sessionDir;

  fs.mkdirSync(sessionPath, { recursive: true });
  const proofs = proofsDir();
  fs.mkdirSync(proofs, { recursive: true });

  const filledFields: string[] = [];
  /** Things a machine must not decide. Any entry blocks a truthful `applied`. */
  const needsHuman: string[] = [];
  let context: BrowserContext | null = null;
  // Held so `finally` can detach it; an undetached listener keeps the closure
  // (and the page it captured) alive after the context is gone.
  let onPopupRef: (p: Page) => void = () => {};

  try {
    const launchOptions: any = {
      headless,
      channel: 'chrome',
      userAgent: DEFAULT_USER_AGENT,
      viewport: { width: 1366, height: 768 },
      /*
       * The Chrome sandbox stays ON.
       *
       * `--no-sandbox` was survivable only while the URL was trusted. It is not
       * trusted — it arrives in a request body — so disabling the sandbox meant
       * a browser exploit on a hostile page ran as the server process. The
       * allowlist above and the sandbox here are belt and braces, deliberately.
       */
      args: ['--disable-blink-features=AutomationControlled', '--disable-infobars'],
    };

    try {
      context = await chromium.launchPersistentContext(sessionPath, launchOptions);
    } catch {
      // Fallback if Chrome channel is unavailable
      delete launchOptions.channel;
      context = await chromium.launchPersistentContext(sessionPath, launchOptions);
    }

    await context.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    });

    const page = context.pages().length > 0 ? context.pages()[0] : await context.newPage();
    page.setDefaultTimeout(timeoutMs);

    // 1. Navigate to the job listing
    console.log(`[headless-applier] Navigating to ${job.title} at ${job.company} (${job.jobUrl})...`);
    await page.goto(job.jobUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2500); // Allow React hydration

    // 2. Check for External Apply (Company Career site)
    const externalBtn = await page.$(
      'button:has-text("Apply on company site"), a:has-text("Apply on company site"), button:has-text("Apply on website"), a:has-text("Apply on website"), .apply-button-external'
    );
    const isExternal = externalBtn !== null;

    if (isExternal) {
      console.log(`[headless-applier] Job ${job.id} redirects to external employer portal.`);
      return {
        jobId: job.id,
        jobTitle: job.title,
        company: job.company,
        status: 'external_redirect',
        message: 'Job directs to external employer portal. Direct application link saved.',
        filledFields: [],
        externalUrl: job.jobUrl,
        durationMs: Date.now() - startTime,
      };
    }

    // 3. Fast Zero-Latency Login Detection
    // When unauthenticated, Naukri renders "Continue with Google", "Login to apply", or a hidden 0x0 apply button
    const googleLoginBtn = await page.$('#continue-with-google-button, .continue-with-google-button, a:has-text("Login to apply")');
    const isGoogleLoginVisible = googleLoginBtn ? await googleLoginBtn.isVisible() : false;

    // Check if apply button has 0x0 dimensions (meaning unauthenticated static placeholder)
    const applyButtonState = await page.evaluate(() => {
      const b = document.getElementById('apply-button') || document.querySelector('.apply-button');
      if (!b) return { exists: false, visible: false, text: '' };
      const r = b.getBoundingClientRect();
      return {
        exists: true,
        visible: r.width > 0 && r.height > 0,
        text: (b.textContent || '').trim()
      };
    });

    if (isGoogleLoginVisible || (applyButtonState.exists && !applyButtonState.visible)) {
      const proofFileName = `requires-login-${safeIdFragment(job.id)}-${randomUUID()}.png`;
      const proofPath = path.join(proofs, proofFileName);
      await page.screenshot({ path: proofPath, fullPage: false });

      console.log(`[headless-applier] Job ${job.id} requires Naukri user login.`);
      return {
        jobId: job.id,
        jobTitle: job.title,
        company: job.company,
        status: 'requires_login',
        message: 'Naukri login required. Log into your Naukri account once in your browser to activate 1-click background auto-apply.',
        filledFields: [],
        proofScreenshotPath: proofPath,
        durationMs: Date.now() - startTime,
      };
    }

    // 4. Locate & Click in-portal Apply button
    /*
     * Popups are accepted only from the job board, and only the FIRST one.
     *
     * The old handler reassigned the target on every `page` event for the life
     * of the context, so an ad or tracker window opening mid-fill silently
     * became the form being typed into. Capturing once, and only from an
     * allowlisted host, removes both the race and the hijack.
     */
    let targetPage: Page = page;
    let drawerCaptured = false;
    const onPopup = (p: Page) => {
      if (drawerCaptured) return;
      if (!checkJobUrl(p.url()).allowed) {
        console.warn('[headless-applier] ignoring popup to a non-Naukri URL:', p.url());
        return;
      }
      drawerCaptured = true;
      targetPage = p;
    };
    onPopupRef = onPopup;
    context.on('page', onPopup);

    const applyButton = await page.$(
      '#apply-button, button.apply-button, .styles_apply-button__uJI3A, button:has-text("Apply")'
    );

    if (!applyButton) {
      // Check if already applied
      const alreadyApplied = await page.$('.already-applied, :text-matches("Already applied", "i")');
      if (alreadyApplied) {
        return {
          jobId: job.id,
          jobTitle: job.title,
          company: job.company,
          status: 'applied',
          message: 'Already previously applied to this job on Naukri.',
          filledFields: [],
          durationMs: Date.now() - startTime,
        };
      }

      // Check if job posting is expired or closed
      const isExpired = await page.$(':text-matches("expired|no longer accepting|closed by recruiter", "i")');
      return {
        jobId: job.id,
        jobTitle: job.title,
        company: job.company,
        status: 'error',
        message: isExpired ? 'Job is expired or no longer accepting applications.' : 'Apply button not found on this posting.',
        filledFields: [],
        durationMs: Date.now() - startTime,
      };
    }

    // Attempt standard click; fallback to DOM click if obscured by sticky bar
    try {
      await applyButton.click({ timeout: 3500 });
    } catch {
      await page.evaluate(() => {
        const b = (document.getElementById('apply-button') || document.querySelector('.apply-button')) as HTMLElement;
        if (b) b.click();
      });
    }

    await targetPage.waitForTimeout(2500);

    // 5. Post-click Login Modal Check
    const loginDetected = await targetPage.$(
      'input[placeholder*="Username"], input[placeholder*="Email"], form[action*="login"], .login-layer, .drawerWrapper form'
    );
    if (loginDetected) {
      const proofFileName = `login-prompt-${safeIdFragment(job.id)}-${randomUUID()}.png`;
      const proofPath = path.join(proofs, proofFileName);
      await targetPage.screenshot({ path: proofPath, fullPage: false });

      return {
        jobId: job.id,
        jobTitle: job.title,
        company: job.company,
        status: 'requires_login',
        message: 'Naukri credentials required to submit application.',
        filledFields: [],
        proofScreenshotPath: proofPath,
        durationMs: Date.now() - startTime,
      };
    }

    // 6. Fill Application Form / Questionnaire Inputs
    console.log('[headless-applier] Filling application fields with real candidate data on active page...');

    // Total Experience Field
    const expInput = await targetPage.$(
      'input[name*="exp"], input[placeholder*="Experience"], input[id*="exp"]'
    );
    if (expInput && (await expInput.isVisible())) {
      await expInput.fill(String(vault.totalExperienceYears));
      filledFields.push(`Total Experience: ${vault.totalExperienceYears} Yrs`);
    }

    // Notice Period Dropdown or Input
    const noticeSelect = await targetPage.$(
      'select[name*="notice"], select[id*="notice"]'
    );
    if (noticeSelect && (await noticeSelect.isVisible())) {
      /*
       * Match the vault's value by label, and report what was ACTUALLY picked.
       *
       * The old code selected `{ index: 1 }` — the comment said "usually
       * Immediate or 15 Days" — and then reported `vault.noticePeriod`. So the
       * applicant was told a notice period that had never been selected, and
       * the employer got whatever happened to sit at index 1.
       */
      try {
        await noticeSelect.selectOption({ label: vault.noticePeriod });
        filledFields.push(`Notice Period: ${vault.noticePeriod}`);
      } catch {
        const actual = await noticeSelect.inputValue().catch(() => '');
        console.warn(
          `[headless-applier] no "${vault.noticePeriod}" option; leaving notice period as "${actual}"`
        );
        needsHuman.push(`Notice period could not be set to "${vault.noticePeriod}"`);
      }
    }

    // Current CTC
    const currentCtc = await targetPage.$(
      'input[name*="curctc"], input[placeholder*="Current"], input[id*="current"]'
    );
    if (currentCtc && (await currentCtc.isVisible())) {
      await currentCtc.fill(String(vault.currentCtcLpa));
      filledFields.push(`Current CTC: ₹${vault.currentCtcLpa} LPA`);
    }

    // Expected CTC
    const expCtc = await targetPage.$(
      'input[name*="expctc"], input[placeholder*="Expected"], input[id*="expected"]'
    );
    if (expCtc && (await expCtc.isVisible())) {
      await expCtc.fill(String(vault.expectedCtcLpa));
      filledFields.push(`Expected CTC: ₹${vault.expectedCtcLpa} LPA`);
    }

    // Location / City
    const cityInput = await targetPage.$(
      'input[name*="city"], input[placeholder*="City"], input[placeholder*="Location"]'
    );
    if (cityInput && (await cityInput.isVisible())) {
      await cityInput.fill(vault.currentLocation);
      filledFields.push(`Location: ${vault.currentLocation}`);
    }

    // Resume PDF Attachment if file input present and local path supplied
    if (vault.resumePdfPath && fs.existsSync(vault.resumePdfPath)) {
      const fileInput = await targetPage.$('input[type="file"]');
      if (fileInput) {
        await fileInput.setInputFiles(vault.resumePdfPath);
        filledFields.push('Resume File Attached');
      }
    }

    /*
     * Recruiter questions are left BLANK, on purpose.
     *
     * The old code filled every empty textarea with the same sentence —
     * "Immediate joiner with verified project experience in React.js, ..." —
     * whatever the question was. Asked about visa status, notice, or salary
     * history, that sentence is a non-answer at best and a false statement to
     * an employer at worst, submitted under a real person's name.
     *
     * A machine that cannot read the question cannot answer it. The questions
     * are reported so a human can finish, and their presence downgrades the
     * result to `needs_review` below.
     */
    const textareas = await targetPage.$$('textarea');
    for (const ta of textareas) {
      if (!(await ta.isVisible())) continue;
      const currentVal = await ta.inputValue();
      if (currentVal && currentVal.trim().length > 0) continue;

      const question =
        (await ta.getAttribute('placeholder')) ||
        (await ta.getAttribute('aria-label')) ||
        (await ta.getAttribute('name')) ||
        'unlabelled question';
      needsHuman.push(`Recruiter question needs a human answer: "${question.slice(0, 120)}"`);
    }

    await targetPage.waitForTimeout(1500);

    // 6. Screenshot of Filled Form
    const proofFileName = `applied-${safeIdFragment(job.id)}-${randomUUID()}.png`;
    const proofPath = path.join(proofs, proofFileName);


    await targetPage.screenshot({ path: proofPath, fullPage: false });

    // 7. Submit or Dry-Run
    if (dryRun) {
      console.log('[headless-applier] Dry-run completed. Form successfully filled without submit.');
      return {
        jobId: job.id,
        jobTitle: job.title,
        company: job.company,
        status: 'form_filled',
        message: 'Form filled with real applicant data (Dry-Run mode).',
        filledFields,
        proofScreenshotPath: proofPath,
        durationMs: Date.now() - startTime,
      };
    }

    /*
     * Submit — and only claim `applied` when a submit actually happened.
     *
     * The old code clicked the button if it found one, then returned
     * `status: 'applied'` with "Application successfully submitted"
     * UNCONDITIONALLY. No button, or an invisible one, and it still said
     * applied. The route wrote that into resume_versions with a real
     * applied_at timestamp, so the user saw applications they had never made —
     * and would never follow up on, because the product told them it was done.
     *
     * Three outcomes now, and the difference between them is evidence:
     *   no submit control found  → needs_review, nothing was sent
     *   submit clicked, control still there → needs_review, it may not have taken
     *   submit clicked and gone   → applied
     */
    const SUBMIT_SELECTOR =
      'button[type="submit"], button:has-text("Submit"), button:has-text("Send Application"), .apply-button';

    const submitBtn = await targetPage.$(SUBMIT_SELECTOR);
    const submitVisible = submitBtn ? await submitBtn.isVisible() : false;

    if (!submitBtn || !submitVisible) {
      needsHuman.push('No submit control was found — the application was NOT sent');
      return {
        jobId: job.id,
        jobTitle: job.title,
        company: job.company,
        status: 'needs_review',
        message: `Form filled but NOT submitted: no submit button found. ${needsHuman.join(' · ')}`,
        filledFields,
        proofScreenshotPath: proofPath,
        durationMs: Date.now() - startTime,
      };
    }

    if (needsHuman.length > 0) {
      // Questions a machine must not answer are still unanswered. Submitting
      // now would send a half-filled form under the applicant's name.
      return {
        jobId: job.id,
        jobTitle: job.title,
        company: job.company,
        status: 'needs_review',
        message: `Filled, NOT submitted — needs a human: ${needsHuman.join(' · ')}`,
        filledFields,
        proofScreenshotPath: proofPath,
        durationMs: Date.now() - startTime,
      };
    }

    await submitBtn.click();
    await targetPage.waitForTimeout(3000);
    await targetPage.screenshot({ path: proofPath, fullPage: false });

    // Evidence that it took: the submit control is gone or disabled. Weak
    // evidence, but it is evidence, where before there was none at all.
    const stillPresent = await targetPage.$(SUBMIT_SELECTOR);
    const stillVisible = stillPresent ? await stillPresent.isVisible().catch(() => false) : false;

    if (stillVisible) {
      return {
        jobId: job.id,
        jobTitle: job.title,
        company: job.company,
        status: 'needs_review',
        message:
          'Submit was clicked but the form is still showing it — the application may not have gone through. Check the screenshot.',
        filledFields,
        proofScreenshotPath: proofPath,
        durationMs: Date.now() - startTime,
      };
    }

    console.log(`[headless-applier] Submitted to ${job.title} at ${job.company}.`);

    return {
      jobId: job.id,
      jobTitle: job.title,
      company: job.company,
      status: 'applied',
      message: 'Application submitted on Naukri.',
      filledFields,
      proofScreenshotPath: proofPath,
      durationMs: Date.now() - startTime,
    };
  } catch (error) {
    console.error(`[headless-applier] Error applying to job ${job.id}:`, error);
    return {
      jobId: job.id,
      jobTitle: job.title,
      company: job.company,
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown headless automation error',
      filledFields,
      durationMs: Date.now() - startTime,
    };
  } finally {
    if (context) {
      context.off('page', onPopupRef);
      await context.close().catch(() => {});
    }
  }
}
