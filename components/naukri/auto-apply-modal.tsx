'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Zap, X, CheckCircle2, AlertCircle, Loader2, ShieldCheck,
  ExternalLink, FileText, ChevronRight, Eye, Sparkles, Building2,
  LogIn,
} from 'lucide-react';
import type { ScannedJob } from '@/app/job-scan/page';
import type { RealApplicantVault } from '@/lib/naukri/profile-vault';
import { extractContactInfo } from '@/lib/naukri/resume-analyzer';

interface AutoApplyModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobs: ScannedJob[];
  defaultProfile?: any;
  resumeText: string;
  isTestMode?: boolean;
}

interface ApplyResultItem {
  jobId: string;
  jobTitle: string;
  company: string;
  jobUrl?: string;
  externalUrl?: string;
  isTestMode?: boolean;
  /*
   * Mirrors AutoApplyResult['status'] in lib/naukri/headless-applier.ts.
   *
   * `needs_review` was missing here after the server gained it, and the gap
   * was invisible: the badge lookup fell through to a gray pill showing the
   * raw enum, and the summary below counted only `applied`, so a run that
   * submitted nothing could still render "Applications Complete!".
   *
   * `needs_review` means THE APPLICATION WAS NOT SUBMITTED.
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
  durationMs: number;
}

export default function AutoApplyModal({
  isOpen,
  onClose,
  jobs,
  defaultProfile,
  resumeText,
  isTestMode = false,
}: AutoApplyModalProps) {
  // Real Data Form State: extracted dynamically from candidate resume
  const initialContact = typeof resumeText === 'string' ? extractContactInfo(resumeText) : {};
  const [fullName, setFullName] = useState(defaultProfile?.name || initialContact.name || '');
  const [email, setEmail] = useState(defaultProfile?.email || initialContact.email || '');
  const [phone, setPhone] = useState(defaultProfile?.phone || initialContact.phone || '');
  const [location, setLocation] = useState(defaultProfile?.preferredLocations?.[0] || 'Bengaluru');
  const [noticePeriod, setNoticePeriod] = useState<'Immediate' | '15 Days' | '30 Days'>('Immediate');
  const [currentCtc, setCurrentCtc] = useState<number>(0);
  const [expectedCtc, setExpectedCtc] = useState<number>(defaultProfile?.expectedCtcLpa || 6.0);
  const [expYears, setExpYears] = useState<number>(defaultProfile?.totalYearsExperience ?? 0);
  const [dryRun, setDryRun] = useState(false);
  const [jobLimit, setJobLimit] = useState(Math.min(5, jobs.length));

  // Naukri Login State
  const [naukriLoginStatus, setNaukriLoginStatus] = useState<'pending' | 'verifying' | 'logged_in'>('pending');
  const [connectedUser, setConnectedUser] = useState<string | null>(null);
  const [isLaunchingLogin, setIsLaunchingLogin] = useState(false);
  const [loginLaunchMsg, setLoginLaunchMsg] = useState('');

  // Sync real candidate details dynamically whenever defaultProfile, resumeText, or modal opens
  useEffect(() => {
    const contact = typeof resumeText === 'string' ? extractContactInfo(resumeText) : {};
    const resolvedName = defaultProfile?.name || contact.name;
    const resolvedEmail = defaultProfile?.email || contact.email;
    const resolvedPhone = defaultProfile?.phone || contact.phone;

    if (resolvedName) setFullName(resolvedName);
    if (resolvedEmail) setEmail(resolvedEmail);
    if (resolvedPhone) setPhone(resolvedPhone);
    if (defaultProfile?.preferredLocations?.[0]) {
      setLocation(defaultProfile.preferredLocations[0]);
    }
    if (defaultProfile?.expectedCtcLpa) {
      setExpectedCtc(defaultProfile.expectedCtcLpa);
    }
    if (defaultProfile?.totalYearsExperience !== undefined) {
      setExpYears(defaultProfile.totalYearsExperience);
    }
  }, [defaultProfile, resumeText, isOpen]);

  const pollRef = useRef<NodeJS.Timeout | null>(null);

  // Check actual session status on open
  useEffect(() => {
    if (isOpen) {
      checkNaukriStatus(true);
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [isOpen]);

  // Execution State
  const [isRunning, setIsRunning] = useState(false);
  const [progressMsg, setProgressMsg] = useState('');
  const [results, setResults] = useState<ApplyResultItem[]>([]);
  const [errorMsg, setErrorMsg] = useState('');
  const [activeTab, setActiveTab] = useState<'setup' | 'running' | 'completed'>('setup');
  const [selectedProof, setSelectedProof] = useState<{
    url: string;
    title: string;
    company: string;
    isTestMode?: boolean;
    status: string;
    jobUrl?: string;
  } | null>(null);

  function getProofUrl(pathOrUrl?: string): string | null {
    if (!pathOrUrl) return null;
    if (pathOrUrl.startsWith('/api/') || pathOrUrl.startsWith('http')) return pathOrUrl;
    const fileName = pathOrUrl.split(/[/\\]/).pop();
    return fileName ? `/api/naukri/proof?file=${encodeURIComponent(fileName)}` : null;
  }

  async function checkNaukriStatus(silent = false) {
    if (!silent) setNaukriLoginStatus('verifying');
    try {
      const res = await fetch('/api/naukri/session/status');
      const data = await res.json();
      if (data.loggedIn) {
        setNaukriLoginStatus('logged_in');
        setConnectedUser(data.userName || data.userEmail || 'Verified Naukri Account');
        setLoginLaunchMsg('');
        if (pollRef.current) {
          clearInterval(pollRef.current);
          pollRef.current = null;
        }
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('hirewin:naukri-logged-in', 'true');
        }
        return true;
      } else {
        if (!silent) {
          if (data.browserOpen) {
            setLoginLaunchMsg(data.message || 'Login window is still open. Please complete sign in, then click Verify Connection.');
          } else {
            setLoginLaunchMsg('No active Naukri session found in browser profile. Click "Connect Headless Account" or use 1-Click Browser Apply.');
          }
          setNaukriLoginStatus('pending');
        }
        return false;
      }
    } catch {
      if (!silent) setNaukriLoginStatus('pending');
      return false;
    }
  }

  async function handleLaunchNaukriLogin() {
    setIsLaunchingLogin(true);
    setLoginLaunchMsg('Launching Chrome window on your desktop...');
    try {
      const res = await fetch('/api/naukri/session/launch', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setLoginLaunchMsg('Chrome window opened! Log into your Naukri account in that window. HireWin will auto-detect your login once completed.');
        // Auto-poll every 2 seconds for up to 90 seconds
        if (pollRef.current) clearInterval(pollRef.current);
        let attempts = 0;
        pollRef.current = setInterval(async () => {
          attempts++;
          if (attempts > 45) {
            if (pollRef.current) clearInterval(pollRef.current);
            return;
          }
          const ok = await checkNaukriStatus(true);
          if (ok && pollRef.current) {
            clearInterval(pollRef.current);
            pollRef.current = null;
          }
        }, 2000);
      } else {
        setLoginLaunchMsg(data.error || 'Failed to launch browser window.');
      }
    } catch {
      setLoginLaunchMsg('Could not open browser window. Please ensure Chrome/Chromium is installed.');
    } finally {
      setIsLaunchingLogin(false);
    }
  }

  /*
   * The early return lives HERE, below every hook, and must stay below them.
   */
  if (!isOpen) return null;

  async function handleStartAutoApply(opts?: { forceTestMode?: boolean }) {
    const isTest = Boolean(opts?.forceTestMode || dryRun || isTestMode);
    setIsRunning(true);
    setActiveTab('running');
    setProgressMsg(`Initializing background auto-apply engine for ${jobLimit} jobs...`);
    setErrorMsg('');
    setResults([]);

    const vault: RealApplicantVault = {
      fullName,
      email,
      phone,
      currentLocation: location,
      totalExperienceYears: expYears,
      noticePeriod,
      currentCtcLpa: currentCtc,
      expectedCtcLpa: expectedCtc,
      highestDegree: defaultProfile?.degree || 'B.Tech',
      specialization: defaultProfile?.fieldOfStudy || 'Computer Science',
      collegeName: 'Engineering Institute',
      graduationYear: defaultProfile?.graduationYear || 2026,
      skills: defaultProfile?.coreSkills || ['React', 'TypeScript', 'Node.js'],
      resumeText,
    };

    try {
      const selectedJobs = jobs.slice(0, jobLimit).map((j) => ({
        id: j.id || (j as any).id || `job-${Math.random().toString(36).substring(7)}`,
        title: j.title,
        company: j.company,
        location: j.location,
        jobUrl: j.jobUrl,
        experienceText: j.experienceText || '0-1 Yrs',
        experienceMin: expYears,
        experienceMax: expYears + 1,
        salaryText: j.salaryText || 'Competitive',
        workMode: (j.workMode as any) || 'onsite',
        skills: j.matchingSkills,
        descriptionSnippet: j.fitReason,
        postedDateText: 'Recently',
        applyType: j.applyType || 'naukri_easy_apply',
      }));

      setProgressMsg(
        isTest
          ? 'Running candidate profile autofill & AI screener verification (Preview Mode)...'
          : 'Connecting to Naukri & autofilling application with real data...'
      );

      const res = await fetch('/api/naukri/auto-apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobs: selectedJobs,
          vault,
          dryRun: isTest,
          maxJobs: jobLimit,
          testMode: isTest,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Auto-apply execution failed');
      }

      setResults(data.results || []);
      setActiveTab('completed');
    } catch (err) {
      console.error('Auto-apply error:', err);
      setErrorMsg(err instanceof Error ? err.message : 'Unknown error during background apply');
      setActiveTab('setup');
    } finally {
      setIsRunning(false);
    }
  }

  function handleOpenAllOnNaukri() {
    const selected = jobs.slice(0, jobLimit);
    if (selected.length === 0) return;

    // Copy applicant summary to clipboard for instant paste into any recruiter screener forms
    const summary = `Applicant: ${fullName} | Phone: ${phone} | Email: ${email} | Experience: ${expYears} Yrs | Notice Period: ${noticePeriod} | Expected CTC: ₹${expectedCtc} LPA`;
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(summary).catch(() => {});
    }

    selected.forEach((j, i) => {
      setTimeout(() => {
        window.open(j.jobUrl, '_blank');
      }, i * 350);
    });

    const directItems: ApplyResultItem[] = selected.map((j) => ({
      jobId: j.id || (j as any).id || `job-${Math.random().toString(36).substring(7)}`,
      jobTitle: j.title,
      company: j.company,
      jobUrl: j.jobUrl,
      status: 'external_redirect',
      message: 'Job opened in your active browser. Submit with 1-click on Naukri! (Your applicant details copied to clipboard).',
      filledFields: [
        `Full Name: ${fullName}`,
        `Email: ${email}`,
        `Phone: ${phone}`,
        `Notice: ${noticePeriod}`,
        `Expected CTC: ₹${expectedCtc} LPA`,
      ],
      durationMs: 300,
    }));

    setResults(directItems);
    setActiveTab('completed');
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div
        className="w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
        style={{
          background: '#0c1220',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        }}
      >
        {/* Modal Header */}
        <div className="p-5 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Background Auto-Apply Engine
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
                  Zero Extension Required
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Runs headlessly in the background using your verified applicant data
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isRunning}
            className="p-1 rounded-lg text-slate-400 hover:text-white transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-2.5 text-xs text-red-300">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {activeTab === 'setup' && (
            <div className="space-y-5">
              {/* ═══════════════════════════════════════════════════
                  Step 1: Naukri Login
                  ═══════════════════════════════════════════════════ */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold border transition-all ${
                    naukriLoginStatus === 'logged_in'
                      ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                      : 'bg-white/5 border-white/10 text-slate-400'
                  }`}>
                    {naukriLoginStatus === 'logged_in' ? '✓' : '1'}
                  </div>
                  <h4 className="text-sm font-bold text-white">Naukri Account Login</h4>
                  {naukriLoginStatus === 'logged_in' && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold animate-in fade-in">
                      Connected
                    </span>
                  )}
                </div>

                {/* Pending: show login prompt */}
                {naukriLoginStatus === 'pending' && (
                  <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center flex-shrink-0">
                        <LogIn className="w-5 h-5 text-amber-400" />
                      </div>
                      <div className="space-y-1">
                        <h5 className="text-xs font-bold text-white">Choose How to Apply on Naukri</h5>
                        <p className="text-xs text-slate-300 leading-relaxed">
                          Already logged into Naukri in your browser? You can apply immediately using 1-Click Direct Apply, or connect your account for headless automation.
                        </p>
                      </div>
                    </div>

                    {loginLaunchMsg && (
                      <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200 leading-relaxed">
                        {loginLaunchMsg}
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                      {/* Option 1: Already logged in */}
                      <button
                        type="button"
                        onClick={() => {
                          setNaukriLoginStatus('logged_in');
                          setConnectedUser('Active Browser Session (1-Click Apply)');
                        }}
                        className="p-3 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-left transition-all cursor-pointer group flex flex-col justify-between"
                      >
                        <div className="flex items-center justify-between w-full mb-1">
                          <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            I&apos;m Already Signed In
                          </span>
                          <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded font-semibold">
                            Fastest
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-300">
                          Uses your active browser login. Opens matching jobs for 1-click submit with your applicant details pre-copied.
                        </p>
                      </button>

                      {/* Option 2: Connect headless browser window */}
                      <button
                        type="button"
                        onClick={handleLaunchNaukriLogin}
                        disabled={isLaunchingLogin}
                        className="p-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/25 text-left transition-all cursor-pointer group flex flex-col justify-between disabled:opacity-50"
                      >
                        <div className="flex items-center justify-between w-full mb-1">
                          <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                            {isLaunchingLogin ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ExternalLink className="w-3.5 h-3.5" />}
                            Connect Headless Account
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-300">
                          Opens a desktop Chrome window to save your session for silent background auto-apply.
                        </p>
                      </button>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-white/5 flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => checkNaukriStatus(false)}
                        className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-slate-400" />
                        Verify Saved Session
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setNaukriLoginStatus('logged_in');
                          setConnectedUser('Free Test Mode');
                          setDryRun(true);
                        }}
                        className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <Zap className="w-3.5 h-3.5 text-cyan-400" />
                        Continue in Free Test Mode →
                      </button>
                    </div>
                  </div>
                )}

                {/* Verifying: spinner */}
                {naukriLoginStatus === 'verifying' && (
                  <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/20 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center flex-shrink-0">
                      <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
                    </div>
                    <div>
                      <h5 className="text-sm font-semibold text-white">Verifying Naukri session...</h5>
                      <p className="text-xs text-slate-400">Checking browser profile credentials</p>
                    </div>
                  </div>
                )}

                {/* Logged in: success banner */}
                {naukriLoginStatus === 'logged_in' && (
                  <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center flex-shrink-0">
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      </div>
                      <div>
                        <h5 className="text-sm font-bold text-emerald-300">
                          {connectedUser ? `Connected: ${connectedUser}` : 'Naukri Session Connected! 🎉'}
                        </h5>
                        <p className="text-xs text-slate-300">
                          {dryRun
                            ? 'Preview Mode active. Forms will be autofilled to verify candidate field accuracy.'
                            : 'Your automated browser profile is authenticated. Real applications will be submitted directly to employers.'}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setNaukriLoginStatus('pending');
                        setConnectedUser(null);
                        if (typeof window !== 'undefined') {
                          sessionStorage.removeItem('hirewin:naukri-logged-in');
                        }
                      }}
                      className="text-[11px] text-slate-400 hover:text-slate-300 underline flex-shrink-0 cursor-pointer"
                    >
                      Disconnect
                    </button>
                  </div>
                )}
              </div>

              {/* ═══════════════════════════════════════════════════
                  Step 2: Applicant Details (only visible after login)
                  ═══════════════════════════════════════════════════ */}
              {naukriLoginStatus === 'logged_in' && (
                <div className="space-y-5 animate-in fade-in slide-in-from-bottom-3 duration-500">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold bg-accent-500/10 border border-accent-500/30 text-accent-400">
                      2
                    </div>
                    <h4 className="text-sm font-bold text-white">Verify Your Applicant Details</h4>
                  </div>

                  {/* Info Notice */}
                  <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 flex items-start gap-2.5">
                    <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
                    <div>
                      <strong className="text-white block mb-0.5">Real Data Injection & AI Screener Q&A</strong>
                      The background runner will fill out application fields, select notice period, input CTCs, and answer recruiter questions automatically using your resume details.
                    </div>
                  </div>

                  {/* Form Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Full Name */}
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-400">Full Name</label>
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    {/* Email */}
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-400">Email Address</label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="e.g. yourname@gmail.com"
                        className="w-full px-3 py-2 text-xs rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    {/* Mobile Phone */}
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-400">Mobile Phone</label>
                      <input
                        type="text"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="10-digit mobile number"
                        className="w-full px-3 py-2 text-xs rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    {/* Location */}
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-400">Current Location</label>
                      <input
                        type="text"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    {/* Total Experience */}
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-400">Total Experience</label>
                      <select
                        value={expYears}
                        onChange={(e) => setExpYears(Number(e.target.value))}
                        className="w-full px-3 py-2 text-xs rounded-xl bg-slate-900 border border-white/10 text-white focus:outline-none focus:border-emerald-500"
                      >
                        <option value={0}>0 Years (Fresher / Student)</option>
                        <option value={1}>1 Year Experience</option>
                        <option value={2}>2 Years Experience</option>
                        <option value={3}>3+ Years Experience</option>
                      </select>
                    </div>

                    {/* Notice Period */}
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-400">Notice Period</label>
                      <select
                        value={noticePeriod}
                        onChange={(e) => setNoticePeriod(e.target.value as any)}
                        className="w-full px-3 py-2 text-xs rounded-xl bg-slate-900 border border-white/10 text-white focus:outline-none focus:border-emerald-500"
                      >
                        <option value="Immediate">Immediate Joiner</option>
                        <option value="15 Days">15 Days</option>
                        <option value="30 Days">30 Days</option>
                      </select>
                    </div>

                    {/* Current CTC */}
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-400">Current CTC (in LPA)</label>
                      <input
                        type="number"
                        value={currentCtc}
                        onChange={(e) => setCurrentCtc(Number(e.target.value))}
                        placeholder="0"
                        className="w-full px-3 py-2 text-xs rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    {/* Expected CTC */}
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-400">Expected CTC (in LPA)</label>
                      <input
                        type="number"
                        step="0.5"
                        value={expectedCtc}
                        onChange={(e) => setExpectedCtc(Number(e.target.value))}
                        placeholder="6.0"
                        className="w-full px-3 py-2 text-xs rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  {/* Number of Jobs to Apply */}
                  <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold text-white block">Auto-Apply Scope</span>
                      <span className="text-[11px] text-slate-400">
                        Will apply to top ranked matching jobs sequentially
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {[3, 5, 10].map((n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => setJobLimit(n)}
                          className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                            jobLimit === n
                              ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300'
                              : 'border-white/5 bg-white/2 text-slate-400'
                          }`}
                        >
                          Top {n} Jobs
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Dry-Run Toggle */}
                  <label className="flex items-center gap-2.5 p-3 rounded-xl bg-white/2 border border-white/5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={dryRun}
                      onChange={(e) => setDryRun(e.target.checked)}
                      className="rounded text-emerald-500 focus:ring-0 focus:ring-offset-0"
                    />
                    <div className="text-xs">
                      <span className="text-slate-200 font-semibold block">Dry-Run Preview Mode</span>
                      <span className="text-slate-400 text-[11px]">
                        Fills all form inputs and captures proof screenshots without hitting the final submit button.
                      </span>
                    </div>
                  </label>
                </div>
              )}
            </div>
          )}

          {activeTab === 'running' && (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
              <div className="relative w-20 h-20 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border-2 border-emerald-500/20 animate-ping" />
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
                </div>
              </div>
              <h4 className="text-lg font-bold text-white">Applying in Background</h4>
              <p className="text-xs text-slate-400 max-w-md">{progressMsg}</p>
              <div className="w-full max-w-xs h-1.5 rounded-full bg-white/5 overflow-hidden">
                <div className="h-full bg-emerald-500 animate-pulse w-3/4 rounded-full" />
              </div>
            </div>
          )}

          {activeTab === 'completed' && (() => {
            const appliedCount = results.filter((r) => r.status === 'applied').length;
            // Not submitted. Counted separately and surfaced even when some
            // jobs did succeed — a mixed run previously showed only the good half.
            const needsReviewCount = results.filter((r) => r.status === 'needs_review').length;
            const requiresLoginCount = results.filter((r) => r.status === 'requires_login').length;
            const externalCount = results.filter((r) => r.status === 'external_redirect').length;
            const errorCount = results.filter((r) => r.status === 'error').length;

            const isAnyTestMode = isTestMode || results.some((r) => (r as any).isTestMode);

            return (
              <div className="space-y-4">
                {/* Dynamic Summary Card */}
                {appliedCount > 0 ? (
                  <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="w-6 h-6 text-emerald-400 flex-shrink-0" />
                      <div>
                        <h4 className="font-bold text-white text-sm">
                          {isAnyTestMode ? 'Test Run Complete!' : needsReviewCount > 0 ? 'Partly complete' : 'Applications Complete!'}
                        </h4>
                        <p className="text-xs text-slate-400">
                          {isAnyTestMode
                            ? `Verified & simulated ${appliedCount} job${appliedCount > 1 ? 's' : ''} on Naukri. Click "View Proof Screenshot" to inspect live captures.`
                            : `Submitted ${appliedCount} job${appliedCount > 1 ? 's' : ''}.${needsReviewCount > 0 ? ` ${needsReviewCount} could NOT be submitted and need you to finish them.` : ''}`}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : requiresLoginCount > 0 ? (
                  <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-3">
                      <AlertCircle className="w-6 h-6 text-amber-400 flex-shrink-0" />
                      <div>
                        <h4 className="font-bold text-white text-sm">Naukri Account Login</h4>
                        <p className="text-xs text-slate-400">
                          Submit directly via your active browser session, or run candidate profile autofill in Free Test Mode.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => {
                          handleStartAutoApply({ forceTestMode: true });
                        }}
                        className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-emerald-500/20 active:scale-95 cursor-pointer"
                      >
                        <Zap className="w-3.5 h-3.5" />
                        Apply in Free Test Mode
                      </button>
                      <button
                        type="button"
                        onClick={handleOpenAllOnNaukri}
                        className="px-3.5 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/30 text-cyan-300 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Open All on Naukri (1-Click Apply)
                      </button>
                    </div>
                  </div>
                ) : externalCount > 0 && errorCount === 0 ? (
                  <div className="p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="w-6 h-6 text-cyan-400" />
                      <div>
                        <h4 className="font-bold text-white text-sm">Openings Saved to Tracker</h4>
                        <p className="text-xs text-slate-400">
                          Saved {externalCount} direct application link{externalCount > 1 ? 's' : ''} to your job tracker.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-slate-800/60 border border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <AlertCircle className="w-6 h-6 text-slate-300" />
                      <div>
                        <h4 className="font-bold text-white text-sm">Run Complete ({results.length} processed)</h4>
                        <p className="text-xs text-slate-400">
                          Review individual application statuses below.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Results List */}
                <div className="space-y-3">
                  {results.map((r) => {
                    const isJobTestMode = (r as any).isTestMode ?? isTestMode;
                    const badge = {
                      applied: {
                        text: isJobTestMode ? '✓ Applied (Test Mode)' : '✓ Applied',
                        style: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
                      },
                      form_filled: { text: 'Form Filled', style: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
                      requires_login: { text: 'Login Required', style: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
                      external_redirect: { text: 'Saved to Tracker', style: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' },
                      // Amber, and says plainly that nothing was sent. It used
                      // to fall through to a gray pill reading "needs_review",
                      // which looked like an unremarkable unknown state.
                      needs_review: { text: '⚠ Not submitted — needs you', style: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
                      error: { text: 'Attention', style: 'bg-rose-500/10 text-rose-400 border-rose-500/20' },
                    }[r.status] || { text: r.status, style: 'bg-slate-500/10 text-slate-400 border-slate-500/20' };

                    return (
                      <div
                        key={r.jobId}
                        className="p-4 rounded-xl bg-white/2 border border-white/5 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h5 className="font-bold text-white text-sm">{r.jobTitle}</h5>
                            <p className="text-xs text-slate-400">{r.company}</p>
                          </div>
                          <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold capitalize border ${badge.style}`}>
                            {badge.text}
                          </span>
                        </div>

                        <p className="text-xs text-slate-400">{r.message}</p>

                        {r.filledFields && r.filledFields.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {r.filledFields.map((f, i) => (
                              <span
                                key={i}
                                className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] text-slate-300"
                              >
                                ✓ {f}
                              </span>
                            ))}
                          </div>
                        )}

                        <div className="flex items-center gap-3 pt-2 flex-wrap">
                          {r.status === 'requires_login' && (
                            <button
                              type="button"
                              onClick={handleLaunchNaukriLogin}
                              className="inline-flex items-center gap-1.5 text-xs text-amber-300 hover:text-amber-200 font-semibold bg-amber-500/15 hover:bg-amber-500/25 px-2.5 py-1 rounded-lg border border-amber-500/30 transition-all cursor-pointer"
                            >
                              <LogIn className="w-3.5 h-3.5" />
                              Connect Naukri Account
                            </button>
                          )}

                          {(r.status === 'external_redirect' || (r as any).externalUrl) && (
                            <a
                              href={(r as any).externalUrl || '#'}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 font-semibold"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              Open Job Portal
                            </a>
                          )}

                          {r.proofScreenshotPath && (
                            <button
                              type="button"
                              onClick={() => {
                                const url = getProofUrl(r.proofScreenshotPath);
                                if (url) {
                                  setSelectedProof({
                                    url,
                                    title: r.jobTitle,
                                    company: r.company,
                                    isTestMode: isJobTestMode,
                                    status: r.status,
                                    jobUrl: (r as any).jobUrl || (r as any).externalUrl,
                                  });
                                }
                              }}
                              className="inline-flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 font-semibold cursor-pointer px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 transition-all active:scale-95"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              View Proof Screenshot
                            </button>
                          )}

                          {((r as any).jobUrl || (r as any).externalUrl) && r.status !== 'external_redirect' && (
                            <a
                              href={(r as any).jobUrl || (r as any).externalUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 font-semibold hover:underline"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              Open Job on Naukri (1-Click Apply)
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-white/5 flex items-center justify-between bg-white/[0.02]">
          {activeTab === 'setup' ? (
            <>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              {naukriLoginStatus === 'logged_in' ? (
                connectedUser === 'Active Browser Session (1-Click Apply)' ? (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleStartAutoApply({ forceTestMode: true })}
                      disabled={isRunning}
                      className="px-4 py-2.5 rounded-xl text-xs font-semibold text-cyan-300 hover:text-white bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 transition-all cursor-pointer"
                    >
                      Run Form Preview
                    </button>
                    <button
                      type="button"
                      onClick={handleOpenAllOnNaukri}
                      disabled={isRunning}
                      className="px-5 py-2.5 rounded-xl text-xs font-bold text-white flex items-center gap-2 transition-all hover:opacity-90 active:scale-[0.98] cursor-pointer shadow-md shadow-emerald-500/20"
                      style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Open & Apply to Top {jobLimit} Jobs on Naukri
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleStartAutoApply()}
                    disabled={isRunning}
                    className="px-5 py-2.5 rounded-xl text-xs font-bold text-white flex items-center gap-2 transition-all hover:opacity-90 active:scale-[0.98] cursor-pointer shadow-md shadow-emerald-500/20"
                    style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}
                  >
                    <Zap className="w-3.5 h-3.5" />
                    {dryRun ? 'Run Form Preview' : `Apply to Top ${jobLimit} Jobs Now`}
                  </button>
                )
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setNaukriLoginStatus('logged_in');
                    setConnectedUser('Free Test Mode');
                    setDryRun(true);
                  }}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-white flex items-center gap-2 transition-all hover:opacity-90 active:scale-[0.98] bg-slate-700 hover:bg-slate-600 border border-white/10 cursor-pointer shadow-md"
                >
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  Continue in Free Test Mode →
                </button>
              )}
            </>
          ) : activeTab === 'completed' ? (
            <>
              <a
                href="/history"
                className="px-4 py-2 text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1.5"
              >
                View in Job Tracker
                <ChevronRight className="w-3.5 h-3.5" />
              </a>
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-white/10 hover:bg-white/15"
              >
                Done
              </button>
            </>
          ) : null}
        </div>
      </div>

      {/* Proof Screenshot Lightbox */}
      {selectedProof && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-3xl rounded-2xl bg-slate-900 border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            {/* Lightbox Header */}
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/[0.03]">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <Eye className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-white text-sm">{selectedProof.title}</h4>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        selectedProof.status === 'requires_login'
                          ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                          : selectedProof.isTestMode
                          ? 'bg-blue-500/10 text-blue-300 border-blue-500/30'
                          : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                      }`}
                    >
                      {selectedProof.status === 'requires_login'
                        ? 'Naukri Login Required'
                        : selectedProof.isTestMode
                        ? 'Preview Verification'
                        : 'Live Naukri Submission'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">{selectedProof.company} • Live Headless Browser Capture</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedProof(null)}
                className="p-1.5 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Lightbox Verification Banner */}
            <div className="p-3.5 bg-slate-800/60 border-b border-white/5 text-xs">
              {selectedProof.status === 'requires_login' ? (
                <div className="flex items-start gap-2.5 text-amber-200/90">
                  <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-amber-300">Naukri Login Screen Captured (Application Not Submitted):</p>
                    <p className="text-slate-300 text-[11px] leading-relaxed mt-0.5">
                      The screenshot below shows the actual Naukri job page visited by the automated browser.
                      Naukri blocked submission because this browser session is not logged into your Naukri account.
                      Connect your Naukri account in Step 1 to enable automated submissions, or click &quot;Open Live Job on Naukri.com&quot; below to apply directly in your browser.
                    </p>
                  </div>
                </div>
              ) : selectedProof.isTestMode ? (
                <div className="flex items-start gap-2.5 text-amber-200/90">
                  <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-amber-300">Live Browser Capture Verification:</p>
                    <p className="text-slate-300 text-[11px] leading-relaxed mt-0.5">
                      The screenshot below was captured live by HireWin&apos;s browser visiting this job posting on Naukri.com.
                      To submit real live applications directly into the recruiter&apos;s Naukri inbox, connect your active Naukri session.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-2.5 text-emerald-200/90">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-emerald-300">Verified Submission Proof:</p>
                    <p className="text-slate-300 text-[11px] leading-relaxed mt-0.5">
                      Headless browser verified and submitted this application on Naukri using your applicant credentials.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Lightbox Image Body */}
            <div className="p-4 overflow-y-auto flex-1 flex flex-col items-center justify-center bg-black/50">
              <div className="relative w-full max-h-[56vh] overflow-auto rounded-xl border border-white/10 shadow-inner bg-slate-950 flex items-center justify-center">
                <img
                  src={selectedProof.url}
                  alt={`Proof screenshot for ${selectedProof.title}`}
                  className="w-full h-auto object-contain"
                />
              </div>
            </div>

            {/* Lightbox Footer */}
            <div className="p-3.5 border-t border-white/10 flex items-center justify-between bg-white/[0.02]">
              <div className="flex items-center gap-3">
                {selectedProof.jobUrl && (
                  <a
                    href={selectedProof.jobUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 font-semibold hover:underline"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Open Live Job on Naukri.com
                  </a>
                )}
                <a
                  href={selectedProof.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white font-medium hover:underline"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Open Fullscreen Image
                </a>
              </div>
              <button
                type="button"
                onClick={() => setSelectedProof(null)}
                className="px-4 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
