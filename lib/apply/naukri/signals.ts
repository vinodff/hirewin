/**
 * Pure interpretation of what Naukri shows and returns.
 *
 * Everything here is a function of plain data (DOM facts gathered by the
 * applier, an HTTP status and a parsed JSON body), with no Page and no I/O.
 * That is deliberate: the decision "did this application go through?" is the
 * one that must never be wrong, so it lives where it can be unit-tested
 * exhaustively against every response shape we know about, without a browser.
 *
 * Provenance of the shapes below: open-source Naukri bots (patterns only) and
 * a logged-out screenshot. None of it has been confirmed against a logged-in
 * live page yet — see the report accompanying this module. When a shape is
 * unknown the functions answer 'unknown' / 'unexpected', which the applier
 * turns into needs_review, never into applied.
 */
import type { Answer, ApplyOutcome, FieldKind, FieldOption, FormQuestion } from '../types';

// ── Page state ─────────────────────────────────────────────────────────────

export type NaukriPageState =
  | 'logged_out'
  | 'easy_apply'
  | 'company_site'
  | 'already_applied'
  | 'expired'
  | 'quota'
  | 'unknown';

export interface ControlFact {
  visible: boolean;
  text: string;
}

/** Plain facts the applier reads from the job page before deciding anything. */
export interface NaukriPageFacts {
  title: string;
  /** Visible body text; only scanned with specific regexes, never logged. */
  bodyText: string;
  /** `#apply-button` (or equivalent). null when absent from the DOM. */
  applyButton: ControlFact | null;
  /** `#company-site-button` / "Apply on company site". null when absent. */
  companySiteButton: ControlFact | null;
  /** `#already-applied` or an "Applied" state button. */
  alreadyAppliedMarker: boolean;
  /** Header "Login" / "Register" controls — only rendered for signed-out visitors. */
  loginControlVisible: boolean;
  /** "Continue with Google" in the apply slot — the logged-out apply placeholder. */
  googleContinueVisible: boolean;
}

export interface PageClassification {
  state: NaukriPageState;
  evidence: string;
}

const QUOTA_TEXT = /daily quota has been (expired|exhausted|exceeded)|daily apply limit|quota (is )?(over|exhausted|exceeded)/i;
/*
 * Specific phrases only. A bare /expired/ would match the quota message above
 * ("Your daily quota has been expired.") and any job description that happens
 * to mention the word.
 */
const EXPIRED_TEXT =
  /job (has )?expired|this job is (no longer available|closed)|no longer accepting applications|job (is )?no longer available|job not found|page not found|closed by recruiter/i;
const EXPIRED_TITLE = /page not found|job not found|error 404|404/i;
const SUCCESS_TEXT = /you have successfully applied|successfully applied/i;

/** True when the visible text carries Naukri's own "successfully applied" message. */
export function hasSuccessMessage(text: string): boolean {
  return SUCCESS_TEXT.test(text);
}

/**
 * Decide what the job page is offering.
 *
 * Order matters and follows "most final fact wins": a closed job is closed for
 * everyone; a signed-out session cannot apply to anything, so it is reported
 * before the apply controls (a logged-out page may still render a hidden 0x0
 * apply button); an existing application beats a visible apply control.
 */
export function classifyJobPage(f: NaukriPageFacts): PageClassification {
  if (EXPIRED_TITLE.test(f.title) || EXPIRED_TEXT.test(f.bodyText)) {
    return { state: 'expired', evidence: 'dom: job page says the posting is closed/expired/not found' };
  }
  const applyVisible = f.applyButton?.visible === true;
  if (f.googleContinueVisible || (f.loginControlVisible && !applyVisible)) {
    const seen = [
      f.googleContinueVisible ? '"Continue with Google" in apply slot' : null,
      f.loginControlVisible ? 'header Login/Register' : null,
    ].filter(Boolean);
    return { state: 'logged_out', evidence: `dom: ${seen.join(' + ')}` };
  }
  if (f.alreadyAppliedMarker || (f.applyButton && /^\s*applied\s*$/i.test(f.applyButton.text))) {
    return { state: 'already_applied', evidence: 'dom: already-applied marker' };
  }
  if (QUOTA_TEXT.test(f.bodyText)) {
    return { state: 'quota', evidence: 'dom: daily quota message' };
  }
  if (f.companySiteButton?.visible) {
    return { state: 'company_site', evidence: `dom: company-site button "${clip(f.companySiteButton.text, 60)}"` };
  }
  if (applyVisible && /apply/i.test(f.applyButton?.text ?? '')) {
    return { state: 'easy_apply', evidence: `dom: apply button "${clip(f.applyButton?.text ?? '', 40)}"` };
  }
  return { state: 'unknown', evidence: 'dom: no apply, company-site, applied or login control recognised' };
}

// ── apply-workflow response ────────────────────────────────────────────────

export const APPLY_WORKFLOW_PATH = '/apply-workflow/';

/** The request Naukri's own page JS sends when Apply (or the last chatbot answer) is submitted. */
export function isApplyWorkflowPost(url: string, method: string): boolean {
  return url.includes(APPLY_WORKFLOW_PATH) && method.toUpperCase() === 'POST';
}

export type ApplyResponseKind =
  | 'applied'
  | 'questionnaire'
  | 'already_applied'
  | 'captcha'
  | 'session_invalid'
  | 'quota'
  | 'unexpected';

export interface ParsedApplyResponse {
  kind: ApplyResponseKind;
  questions?: FormQuestion[];
  evidence: string;
}

type Json = Record<string, unknown>;

function isObject(v: unknown): v is Json {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function clip(s: string, max: number): string {
  const t = s.replace(/\s+/g, ' ').trim();
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

/** Every string message-ish field in a body, for quota / already-applied phrase checks. */
function messagesOf(body: Json, job: Json | null): string {
  const pick = (o: Json | null) =>
    o ? ['message', 'msg', 'statusMessage', 'error', 'errorMessage', 'title'].map((k) => o[k]).filter((v) => typeof v === 'string') : [];
  return [...pick(body), ...pick(job)].join(' | ');
}

function quotaHit(body: Json): { hit: boolean; detail: string } {
  const q = body.quotaDetails;
  if (!isObject(q)) return { hit: false, detail: '' };
  const applied = typeof q.dailyApplied === 'number' ? q.dailyApplied : null;
  const total = typeof q.totalDailyQuota === 'number' ? q.totalDailyQuota : null;
  const detail = applied !== null ? `quotaDetails.dailyApplied=${applied}${total !== null ? `/${total}` : ''}` : '';
  return { hit: applied !== null && total !== null && total > 0 && applied >= total, detail };
}

/**
 * Turn one apply-workflow response into a decision.
 *
 * `applied` needs `jobs[i].status === 200` for this job and no pending
 * questionnaire. A 2xx with a questionnaire is NOT applied — the server is
 * asking for answers first. A 2xx without `jobs` is reported as
 * already_applied only when the body says so; other bots assumed "no jobs =
 * already applied", which is a guess this module refuses to make.
 */
export function parseApplyResponse(httpStatus: number, body: unknown, jobId?: string): ParsedApplyResponse {
  const http = `apply-workflow HTTP ${httpStatus}`;
  if (httpStatus === 401 || httpStatus === 403) {
    return { kind: 'session_invalid', evidence: `${http} (session rejected)` };
  }
  if (httpStatus === 406) {
    return { kind: 'captcha', evidence: `${http} (reCAPTCHA required)` };
  }
  if (!isObject(body)) {
    return { kind: 'unexpected', evidence: `${http}, body is not a JSON object` };
  }

  const jobs = Array.isArray(body.jobs) ? body.jobs.filter(isObject) : null;
  const index = jobs && jobId ? jobs.findIndex((j) => String(j.jobId ?? '') === jobId) : -1;
  const at = index >= 0 ? index : 0;
  const job = jobs && jobs.length > 0 ? jobs[at] : null;
  const messages = messagesOf(body, job);
  const quota = quotaHit(body);

  if (/quota/i.test(messages) && /(expired|exhausted|exceeded|over|limit)/i.test(messages)) {
    return { kind: 'quota', evidence: `${http}, message mentions daily quota` };
  }

  if (httpStatus < 200 || httpStatus >= 300) {
    return { kind: 'unexpected', evidence: `${http}${messages ? `, message "${clip(messages, 120)}"` : ''}` };
  }

  if (!job) {
    if (/already applied/i.test(messages)) {
      return { kind: 'already_applied', evidence: `${http}, no jobs[], message says already applied` };
    }
    if (quota.hit) return { kind: 'quota', evidence: `${http}, no jobs[], ${quota.detail}` };
    return { kind: 'unexpected', evidence: `${http}, response has no jobs[]` };
  }

  const ref = `jobs[${at}]`;
  const questionnaire = Array.isArray(job.questionnaire) ? job.questionnaire : [];
  if (questionnaire.length > 0) {
    const questions = questionnaire
      .map((item, i) => mapQuestionnaireItem(item, i))
      .filter((q): q is FormQuestion => q !== null);
    if (questions.length === 0) {
      return { kind: 'unexpected', evidence: `${http}, ${ref}.questionnaire present but unreadable` };
    }
    return { kind: 'questionnaire', questions, evidence: `${http}, ${ref}.questionnaire with ${questions.length} question(s)` };
  }

  const jobStatus = typeof job.status === 'number' ? job.status : Number(job.status);
  if (jobStatus === 200) {
    return {
      kind: 'applied',
      evidence: [`${http}, ${ref}.status=200`, quota.detail].filter(Boolean).join(', '),
    };
  }
  if (/already applied/i.test(messages)) {
    return { kind: 'already_applied', evidence: `${http}, ${ref} message says already applied` };
  }
  if (quota.hit) return { kind: 'quota', evidence: `${http}, ${ref}.status=${job.status}, ${quota.detail}` };
  return {
    kind: 'unexpected',
    evidence: `${http}, ${ref}.status=${String(job.status)}${messages ? `, message "${clip(messages, 120)}"` : ''}`,
  };
}

// ── Questionnaire → FormQuestion ───────────────────────────────────────────

const KIND_BY_TYPE: Record<string, { kind: FieldKind; multiple?: boolean }> = {
  'text box': { kind: 'text' },
  'check box': { kind: 'checkbox', multiple: true },
  'radio button': { kind: 'radio' },
  'list menu': { kind: 'select' },
};

/**
 * Options arrive either as an object map (`{"1": "Yes", "2": "No"}`) or as an
 * array (of strings, or of `{id|value, label|name|text}` objects). Both keep
 * the visible label (what the chatbot drawer shows and what we click) and the
 * underlying key. Empty labels are dropped: some text questions carry an
 * all-empty option map, which is not a choice.
 */
export function normalizeAnswerOptions(raw: unknown): FieldOption[] {
  const out: FieldOption[] = [];
  const push = (value: unknown, label: unknown) => {
    const l = typeof label === 'string' || typeof label === 'number' ? String(label).trim() : '';
    if (!l) return;
    const v = typeof value === 'string' || typeof value === 'number' ? String(value).trim() : l;
    out.push({ label: l, value: v || l });
  };
  if (Array.isArray(raw)) {
    for (const item of raw) {
      if (isObject(item)) {
        push(item.id ?? item.value ?? item.key, item.label ?? item.name ?? item.text ?? item.value);
      } else {
        push(item, item);
      }
    }
  } else if (isObject(raw)) {
    for (const [key, label] of Object.entries(raw)) push(key, label);
  }
  return out;
}

/**
 * One Naukri questionnaire item → the shared FormQuestion.
 *
 * `required` defaults to TRUE. The known item shape carries no mandatory flag,
 * and treating an unknown as optional would let a blank answer slide through
 * to a submit; treating it as required only ever produces an extra review.
 */
export function mapQuestionnaireItem(item: unknown, index: number): FormQuestion | null {
  if (!isObject(item)) return null;
  const label = typeof item.questionName === 'string' ? clip(item.questionName, 500) : '';
  if (!label) return null;
  const typeName = typeof item.questionType === 'string' ? item.questionType.trim().toLowerCase() : '';
  const mapped = KIND_BY_TYPE[typeName];
  const options = normalizeAnswerOptions(item.answerOption);
  const kind: FieldKind = mapped ? mapped.kind : options.length > 0 ? 'radio' : 'text';
  const flag = [item.isMandatory, item.mandatory, item.required, item.isRequired].find((v) => typeof v === 'boolean');
  const id = item.questionId !== undefined && item.questionId !== null ? String(item.questionId) : `q${index}`;
  const q: FormQuestion = {
    id,
    label,
    kind,
    options: kind === 'text' ? [] : options,
    required: typeof flag === 'boolean' ? flag : true,
  };
  if (mapped?.multiple) q.multiple = true;
  return q;
}

// ── Request evidence ───────────────────────────────────────────────────────

/**
 * What the final apply-workflow request carried, as counts only. The body has
 * the applicant's answers (CTC, notice period...), so values never leave here.
 */
export function summarizeApplyRequest(postData: string | null, jobId: string): { hasApplyData: boolean; answerCount: number } {
  if (!postData) return { hasApplyData: false, answerCount: 0 };
  try {
    const body: unknown = JSON.parse(postData);
    if (!isObject(body) || !isObject(body.applyData)) return { hasApplyData: false, answerCount: 0 };
    const entry = body.applyData[jobId] ?? Object.values(body.applyData)[0];
    const answers = isObject(entry) && isObject(entry.answers) ? entry.answers : null;
    return { hasApplyData: answers !== null, answerCount: answers ? Object.keys(answers).length : 0 };
  } catch {
    return { hasApplyData: false, answerCount: 0 };
  }
}

// ── Decision → outcome ─────────────────────────────────────────────────────

/**
 * Map a parsed response to the shared outcome. Returns null for
 * `questionnaire`, which is not an outcome but a next step (the chatbot).
 */
export function outcomeForResponse(parsed: ParsedApplyResponse, answers: Answer[], extraEvidence: string[] = []): ApplyOutcome | null {
  const evidence = [parsed.evidence, ...extraEvidence];
  switch (parsed.kind) {
    case 'applied':
      return { status: 'applied', message: 'Applied on Naukri; Naukri confirmed the application.', answers, evidence };
    case 'already_applied':
      return { status: 'already_applied', message: 'Naukri says this account has already applied to this job.', answers, evidence };
    case 'captcha':
      return { status: 'captcha', message: 'Naukri asked for a reCAPTCHA. Open the job and apply by hand.', answers, evidence };
    case 'session_invalid':
      return { status: 'requires_login', message: 'Naukri rejected the session. Log in again in the automation browser.', answers, evidence };
    case 'quota':
      return { status: 'quota_exceeded', message: "Naukri's daily apply quota is used up. Try again tomorrow.", answers, evidence };
    case 'unexpected':
      return {
        status: 'needs_review',
        message: 'Naukri returned a response the engine does not recognise; the application may not have gone through.',
        answers,
        evidence,
      };
    case 'questionnaire':
      return null;
  }
}
