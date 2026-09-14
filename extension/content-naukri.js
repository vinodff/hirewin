/**
 * HireWin — Naukri AI Copilot & Auto-Apply Assistant (Content Script)
 *
 * Runs directly on https://www.naukri.com/* in the user's authentic session.
 * 1. Scrapes active job listings and displays HireWin Fit Badges.
 * 2. Autofills application modals, dropdowns, and chatbot questionnaires.
 * 3. Answers recruiter screening questions using AI grounded in resume evidence.
 * 4. Syncs applied jobs to HireWin Application History.
 */

(function () {
  'use strict';

  // Prevent double injection
  if (window.__hirewinNaukriLoaded) return;
  window.__hirewinNaukriLoaded = true;

  console.log('[HireWin] Naukri Copilot initialized.');

  // State
  let cachedResume = '';
  let cachedProfile = null;
  let scoredJobsMap = new Map();

  // Load stored profile from extension storage
  function loadStoredData() {
    chrome.runtime.sendMessage({ type: 'HIREWIN_GET_PROFILE' }, (res) => {
      if (chrome.runtime.lastError || !res) return;
      cachedResume = res.resumeText || '';
      cachedProfile = res.autofillProfile || null;
      if (cachedResume) {
        annotatePageJobs();
      }
    });
  }

  // ── Floating Copilot Launcher ──────────────────────────────────────────

  function injectFloatingLauncher() {
    if (document.getElementById('hirewin-naukri-launcher')) return;

    const launcher = document.createElement('div');
    launcher.id = 'hirewin-naukri-launcher';
    launcher.innerHTML = `
      <div class="hw-naukri-pill">
        <span class="hw-logo-dot"></span>
        <span class="hw-pill-title">HireWin Copilot</span>
        <button id="hw-btn-scan" class="hw-pill-action" title="Score all jobs on this page against your resume">Score Page</button>
        <button id="hw-btn-fill" class="hw-pill-action hw-highlight" title="Autofill active application form">Autofill</button>
      </div>
    `;

    document.body.appendChild(launcher);

    document.getElementById('hw-btn-scan')?.addEventListener('click', () => {
      annotatePageJobs(true);
    });

    document.getElementById('hw-btn-fill')?.addEventListener('click', () => {
      executeAutofill();
    });
  }

  // ── Scrape Job Cards from DOM ──────────────────────────────────────────

  function extractJobsFromDom() {
    const cards = document.querySelectorAll(
      '.srp-jobtuple-wrapper, .jobTuple, article.jobTuple, [data-job-id]'
    );
    const jobs = [];

    cards.forEach((card, index) => {
      try {
        const titleEl = card.querySelector('a.title, .title, .job-title');
        const companyEl = card.querySelector('a.comp-name, .comp-name, .subTitle');
        const expEl = card.querySelector('.expwdth, .experience, [class*="exp"]');
        const salEl = card.querySelector('.sal, .salary, [class*="sal"]');
        const locEl = card.querySelector('.locWdth, .location, [class*="loc"]');
        const skillEls = card.querySelectorAll('.tags-gt li, .dot-gt li, .tag-li, .skill-badge');

        const title = titleEl ? titleEl.textContent.trim() : '';
        const jobUrl = titleEl && titleEl.href ? titleEl.href : window.location.href;
        const company = companyEl ? companyEl.textContent.trim() : 'Company';
        const exp = expEl ? expEl.textContent.trim() : '0-1 Yrs';
        const sal = salEl ? salEl.textContent.trim() : 'Not Disclosed';
        const loc = locEl ? locEl.textContent.trim() : 'India';

        const skills = [];
        skillEls.forEach(s => {
          const text = s.textContent.trim();
          if (text && !skills.includes(text)) skills.push(text);
        });

        if (title) {
          jobs.push({
            el: card,
            id: card.getAttribute('data-job-id') || `job-${index}`,
            title,
            company,
            experienceText: exp,
            salaryText: sal,
            location: loc,
            skills,
            jobUrl,
          });
        }
      } catch (e) {
        console.warn('[HireWin] Error parsing job card:', e);
      }
    });

    return jobs;
  }

  // ── Compute Match & Annotate Job Cards ─────────────────────────────────

  function computeQuickScore(job, resumeText) {
    const lowerResume = (resumeText || '').toLowerCase();
    const isFresher = /fresher|student|intern|b\.?tech|2024|2025|2026/i.test(resumeText);
    const isJobFresher = /fresher|0\s*-\s*1|0\s*-\s*2|trainee|junior/i.test(job.experienceText + ' ' + job.title);

    let matched = 0;
    const missing = [];
    job.skills.forEach(skill => {
      if (lowerResume.includes(skill.toLowerCase())) {
        matched++;
      } else {
        missing.push(skill);
      }
    });

    let score = 70;
    if (job.skills.length > 0) {
      score = Math.round((matched / job.skills.length) * 60) + 25;
    }

    if (isFresher && !isJobFresher && /3-|4-|5-|6-/i.test(job.experienceText)) {
      score = Math.min(35, score - 30); // Heavy penalty for non-fresher roles
    } else if (isFresher && isJobFresher) {
      score = Math.min(96, score + 12);
    }

    return {
      score: Math.max(20, Math.min(96, score)),
      missing,
      matched,
      isFresherFriendly: isJobFresher,
    };
  }

  function annotatePageJobs(forceNotice = false) {
    const jobs = extractJobsFromDom();
    if (jobs.length === 0) {
      if (forceNotice) showToast('No job cards detected on this page.');
      return;
    }

    jobs.forEach(job => {
      if (job.el.querySelector('.hw-fit-badge')) return; // already annotated

      const result = computeQuickScore(job, cachedResume);
      scoredJobsMap.set(job.id, result);

      const badge = document.createElement('div');
      badge.className = 'hw-fit-badge';
      
      let badgeClass = 'hw-badge-good';
      let label = 'Good Match';
      if (result.score >= 85) {
        badgeClass = 'hw-badge-perfect';
        label = '🎯 Perfect Match';
      } else if (result.score >= 70) {
        badgeClass = 'hw-badge-strong';
        label = '✓ Strong Fit';
      } else if (result.score < 45) {
        badgeClass = 'hw-badge-stretch';
        label = '⚠️ Experience Gap';
      }

      /*
       * Built with DOM nodes, not innerHTML.
       *
       * `result.missing` comes from job.skills, scraped off the page with
       * .textContent. textContent returns literal characters — no HTML is
       * parsed on the way IN — but assigning that string to innerHTML parses
       * it on the way OUT. A job whose skill tag reads
       * `<img src=x onerror=...>` therefore executed, automatically, on every
       * page: annotatePageJobs() runs from a MutationObserver with no user
       * action required.
       *
       * The payload runs in the page's world, so it cannot reach chrome.* or
       * the auth token. It can read the DOM — which by then holds whatever
       * autofill just typed in: CTC, notice period, location, and answers
       * derived from the user's resume — and ship it anywhere.
       *
       * textContent on every interpolated value closes it. Keep it that way:
       * nothing scraped from the page may become markup.
       */
      const pill = document.createElement('div');
      pill.className = `hw-badge-pill ${badgeClass}`;

      const scoreEl = document.createElement('span');
      scoreEl.className = 'hw-badge-score';
      scoreEl.textContent = `${result.score}%`;
      pill.appendChild(scoreEl);

      const labelEl = document.createElement('span');
      labelEl.className = 'hw-badge-label';
      labelEl.textContent = label;
      pill.appendChild(labelEl);

      if (result.missing.length > 0) {
        const missingEl = document.createElement('span');
        missingEl.className = 'hw-badge-missing';
        missingEl.textContent = `Missing: ${result.missing.slice(0, 2).join(', ')}`;
        pill.appendChild(missingEl);
      }

      badge.appendChild(pill);

      job.el.style.position = 'relative';
      job.el.appendChild(badge);
    });

    if (forceNotice) {
      showToast(`Scored ${jobs.length} jobs against your resume!`);
    }
  }

  // ── Form Autofill Engine ───────────────────────────────────────────────

  function dispatchInputEvents(el, val) {
    el.focus();
    el.value = val;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    el.dispatchEvent(new Event('blur', { bubbles: true }));
  }

  /*
   * The application form, not the whole page.
   *
   * Autofill used to run document.querySelectorAll('input, select, textarea')
   * across the entire page — search boxes, filters, any widget — and match by
   * loose substrings. CTC, notice period and location could be typed into
   * fields that were never part of an application, where the page's own
   * scripts and analytics see them on the dispatched input/change events.
   */
  function findApplicationContainer() {
    return document.querySelector(
      '[role="dialog"], .drawerWrapper, [class*="chatbot"], [class*="Drawer"], form[action*="apply"]'
    );
  }

  /** Text that labels THIS field — never its parent's whole text content. */
  function fieldLabel(input) {
    const own = input.labels && input.labels[0] ? input.labels[0].textContent : '';
    const aria = input.getAttribute('aria-label') || '';
    return `${own} ${aria}`.toLowerCase();
  }

  async function executeAutofill() {
    /*
     * No invented profile. When nothing was saved, this used to fall back to
     * { fullName: 'Candidate', expectedCtcLpa: 5.5, currentLocation:
     * 'Bengaluru', noticePeriod: 'Immediate' } and type those into a real
     * application as the user's own answers.
     */
    if (!cachedProfile) {
      showToast('Save your profile in the HireWin popup first — nothing was filled.');
      return;
    }

    const container = findApplicationContainer();
    if (!container) {
      showToast('Open the job\'s application form first, then click Autofill.');
      return;
    }

    showToast('Scanning form inputs...');
    const profile = cachedProfile;
    let filledCount = 0;

    const SKIP_TYPES = ['hidden', 'password', 'file', 'checkbox', 'radio', 'submit', 'button'];
    const inputs = container.querySelectorAll('input, select, textarea');

    inputs.forEach(input => {
      if (input.disabled || input.readOnly || SKIP_TYPES.includes((input.type || '').toLowerCase())) return;

      /*
       * One haystack per field, and the most specific checks FIRST.
       *
       * The old chain tested experience first with name.includes('exp'),
       * which also matches "expctc" and "expected" — so the Expected CTC field
       * received the candidate's years of experience. And the label came from
       * parentElement.textContent, which on most forms includes every sibling
       * field's label, so one input could match all five branches' keywords.
       */
      const key = `${input.name || ''} ${input.id || ''} ${input.placeholder || ''} ${fieldLabel(input)}`.toLowerCase();
      const tag = input.tagName.toLowerCase();

      if (/expctc|expected\s*(ctc|salary)/.test(key)) {
        // Only a figure the candidate actually saved. `|| 5` used to supply one.
        if (typeof profile.expectedCtcLpa === 'number' && profile.expectedCtcLpa > 0) {
          dispatchInputEvents(input, String(profile.expectedCtcLpa));
          filledCount++;
        }
      } else if (/curctc|current\s*(ctc|salary)/.test(key)) {
        if (typeof profile.currentCtcLpa === 'number' && profile.currentCtcLpa >= 0) {
          dispatchInputEvents(input, String(profile.currentCtcLpa));
          filledCount++;
        }
      } else if (/notice/.test(key)) {
        if (!profile.noticePeriod) return;
        if (tag === 'select') {
          /*
           * Match the saved notice period. The old test was
           * /immediate|15 days|0/ — and "0" is in "30 Days", "60 Days" and
           * "90 Days", so whichever of those came first was selected
           * regardless of what the candidate had saved.
           */
          const want = String(profile.noticePeriod).toLowerCase();
          for (const opt of input.options) {
            if (opt.text.trim().toLowerCase() === want) {
              input.value = opt.value;
              input.dispatchEvent(new Event('change', { bubbles: true }));
              filledCount++;
              break;
            }
          }
        } else {
          dispatchInputEvents(input, profile.noticePeriod);
          filledCount++;
        }
      } else if (/\bexp\b|experience/.test(key)) {
        if (typeof profile.experienceYears === 'number' && profile.experienceYears >= 0) {
          dispatchInputEvents(input, String(profile.experienceYears));
          filledCount++;
        }
      } else if (/city|current\s*location/.test(key)) {
        if (profile.currentLocation) {
          dispatchInputEvents(input, profile.currentLocation);
          filledCount++;
        }
      }
    });

    // Recruiter questions — scoped to the form, with a bounded question text.
    const textareas = container.querySelectorAll('textarea');
    for (const ta of textareas) {
      if (ta.value && ta.value.trim().length > 10) continue;

      /*
       * The question is this field's own label. The old lookup fell back to
       * ta.closest('div'), the nearest div of any kind, so arbitrary page text
       * could be sent to the backend model as a "recruiter question" — a
       * prompt-injection channel from any hostile listing. Capped as well.
       */
      const group = ta.closest('.question-item, .form-group');
      const raw =
        fieldLabel(ta).trim() ||
        (group && group.querySelector('label, .label') ? group.querySelector('label, .label').textContent : '');
      const questionText = (raw || '').trim().slice(0, 300);
      if (questionText.length <= 5) continue;

      showToast('Drafting AI answer for recruiter question...');
      try {
        const res = await sendBackgroundMessage({
          type: 'HIREWIN_NAUKRI_AUTO_ANSWER',
          payload: {
            resumeText: cachedResume,
            question: questionText,
            jobTitle: (document.querySelector('.title, h1')?.textContent || '').trim().slice(0, 200),
          },
        });
        if (res && res.ok && res.data && res.data.suggestedAnswer) {
          dispatchInputEvents(ta, res.data.suggestedAnswer);
          filledCount++;
        }
      } catch (e) {
        console.warn('[HireWin] Auto-answer failed:', e);
      }
    }

    const submitBtn = container.querySelector('button[type="submit"], .apply-button, .submit-btn, button.apply');
    if (submitBtn) {
      submitBtn.addEventListener('click', () => {
        const company = (document.querySelector('.comp-name, .company')?.textContent || '').trim();
        const role = (document.querySelector('.title, h1')?.textContent || '').trim();

        /*
         * Recorded only after evidence the submission took.
         *
         * This used to fire on the click itself, so a submission blocked by
         * validation or a network error was still saved as `status: 'applied'`
         * — and when the page had no company or title, it was saved as
         * "Naukri Company" / "Software Engineer". Now: wait, then require the
         * submit control to be gone, and require a real company and role.
         */
        setTimeout(() => {
          const stillThere = document.contains(submitBtn) && submitBtn.offsetParent !== null;
          if (stillThere || !company || !role) return;
          chrome.runtime.sendMessage({
            type: 'HIREWIN_RECORD_APPLICATION',
            payload: { company, role, jobUrl: window.location.href, status: 'applied' },
          });
        }, 4000);
      }, { once: true });
    }

    if (filledCount > 0) {
      showToast(`Autofilled ${filledCount} fields. Review every answer before you submit.`);
    } else {
      showToast('No fields were filled. Check your saved profile, then review the form yourself.');
    }
  }

  function sendBackgroundMessage(msg) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(msg, (response) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(response);
        }
      });
    });
  }

  // ── Toast Notifications ───────────────────────────────────────────────

  function showToast(msg) {
    let toast = document.getElementById('hw-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'hw-toast';
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.className = 'hw-toast-visible';
    setTimeout(() => {
      toast.className = '';
    }, 3500);
  }

  // ── Initialization & DOM Observer ─────────────────────────────────────

  injectFloatingLauncher();
  loadStoredData();

  // Observe URL changes and infinite scrolling
  // Debounced. Every DOM mutation re-scanned the whole page, and a page that
  // churns its DOM forced repeated full rescans.
  let annotateTimer = null;
  const observer = new MutationObserver(() => {
    if (!cachedResume) return;
    clearTimeout(annotateTimer);
    annotateTimer = setTimeout(annotatePageJobs, 400);
  });
  observer.observe(document.body, { childList: true, subtree: true });

})();
