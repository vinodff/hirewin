'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Briefcase, MapPin, Search, Sparkles, Upload, Loader2, Check, X,
  AlertCircle, ExternalLink, FileText, Compass, CheckCircle2, AlertTriangle, ArrowRight,
} from 'lucide-react';
import AppNav from '@/components/app-nav';
import Footer from '@/components/footer';
import type { ResumeVersion } from '@/types';

interface ScannedJob {
  title: string;
  company: string;
  location: string;
  jobUrl: string;
  portal: string;
  fitScore: number;
  fitReason: string;
  matchingSkills: string[];
  missingSkills: string[];
}

export default function JobScanPage() {
  const router = useRouter();

  // Form State
  const [role, setRole] = useState('');
  const [location, setLocation] = useState('India');
  const [resumeSource, setResumeSource] = useState<'history' | 'paste'>('paste');
  const [selectedResumeId, setSelectedResumeId] = useState('');
  const [resumeText, setResumeText] = useState('');
  
  // File Upload State
  const [fileName, setFileName] = useState('');
  const [pdfParsing, setPdfParsing] = useState(false);
  const [pdfError, setPdfError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // App/User Data
  const [historyResumes, setHistoryResumes] = useState<ResumeVersion[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Scan Execution State
  const [scanning, setScanning] = useState(false);
  const [scanStep, setScanStep] = useState(0);
  const [scanError, setScanError] = useState('');
  const [scannedRole, setScannedRole] = useState('');
  const [scannedLocation, setScannedLocation] = useState('');
  const [jobs, setJobs] = useState<ScannedJob[]>([]);
  const [hasScanned, setHasScanned] = useState(false);

  // Fetch saved resumes on mount
  useEffect(() => {
    fetch('/api/history')
      .then(async (r) => {
        if (r.status === 401) {
          setIsLoggedIn(false);
          setResumeSource('paste');
          return null;
        }
        setIsLoggedIn(true);
        return r.json();
      })
      .then((d) => {
        if (d && d.versions && d.versions.length > 0) {
          setHistoryResumes(d.versions);
          setSelectedResumeId(d.versions[0].id);
          setResumeSource('history');
        }
      })
      .catch((err) => {
        console.error('Failed to load history:', err);
      })
      .finally(() => {
        setLoadingHistory(false);
      });
  }, []);

  // Update resumeText when selectedResumeId changes
  useEffect(() => {
    if (resumeSource === 'history' && selectedResumeId) {
      const selected = historyResumes.find((r) => r.id === selectedResumeId);
      if (selected) {
        setResumeText(selected.optimized_resume || selected.original_resume || '');
      }
    }
  }, [selectedResumeId, resumeSource, historyResumes]);

  // Dynamic step message for the scan overlay
  useEffect(() => {
    if (!scanning) return;
    setScanStep(0);
    const intervals = [
      setTimeout(() => setScanStep(1), 3000),  // 3s
      setTimeout(() => setScanStep(2), 7000),  // 7s
      setTimeout(() => setScanStep(3), 13000), // 13s
    ];
    return () => intervals.forEach(clearTimeout);
  }, [scanning]);

  // Handle PDF Upload
  async function handleFile(file: File) {
    if (file.size > 5 * 1024 * 1024) {
      setPdfError('File is too large — max 5MB.');
      return;
    }
    setPdfParsing(true);
    setPdfError('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/parse-pdf', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Could not parse PDF');
      setResumeText(data.text);
      setFileName(file.name);
    } catch (e) {
      setPdfError(e instanceof Error ? e.message : 'Could not read PDF — paste text instead');
    } finally {
      setPdfParsing(false);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  // Handle Scan Run
  async function handleScan() {
    let finalResumeText = resumeText;
    if (resumeSource === 'history') {
      const selected = historyResumes.find((r) => r.id === selectedResumeId);
      if (selected) {
        finalResumeText = selected.optimized_resume || selected.original_resume || '';
      }
    }

    if (!finalResumeText || finalResumeText.trim().length < 50) {
      setScanError('Please select a resume or paste your resume text (min 50 characters) to scan.');
      return;
    }

    setScanning(true);
    setScanError('');
    setJobs([]);

    try {
      const res = await fetch('/api/job-scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resumeText: finalResumeText,
          query: role,
          location: location,
        }),
      });

      const data = await res.json();
      
      if (!res.ok) {
        if (data.error === 'limit_reached') {
          throw new Error('limit_reached');
        }
        throw new Error(data.error ?? 'Failed to complete job scan. Please try again.');
      }

      setJobs(data.jobs || []);
      setScannedRole(data.role || role || 'Matching Roles');
      setScannedLocation(data.location || location || 'India');
      setHasScanned(true);
    } catch (e: any) {
      if (e.message === 'limit_reached') {
        setScanError('limit_reached');
      } else {
        setScanError(e instanceof Error ? e.message : 'An unexpected error occurred.');
      }
    } finally {
      setScanning(false);
    }
  }

  // Prefill optimizer and redirect
  function handleOptimize(job: ScannedJob) {
    let finalResumeText = resumeText;
    if (resumeSource === 'history') {
      const selected = historyResumes.find((r) => r.id === selectedResumeId);
      if (selected) {
        finalResumeText = selected.optimized_resume || selected.original_resume || '';
      }
    }

    // Prepare job description text
    const fullJd = `Role: ${job.title}\nCompany: ${job.company}\nLocation: ${job.location}\n\nKey Requirements:\n${job.missingSkills.join(', ')}\n\nMatched Skills:\n${job.matchingSkills.join(', ')}\n\nAbout the job:\n${job.fitReason}`;

    sessionStorage.setItem('hirewin:scan-resume', finalResumeText);
    sessionStorage.setItem('hirewin:scan-jd', fullJd);

    router.push('/analyze');
  }

  // Get color for fit score
  function getScoreColor(score: number) {
    if (score >= 80) return { text: 'text-emerald-400', border: 'border-emerald-500/30', bg: 'bg-emerald-500/10' };
    if (score >= 50) return { text: 'text-amber-400', border: 'border-amber-500/30', bg: 'bg-amber-500/10' };
    return { text: 'text-red-400', border: 'border-red-500/30', bg: 'bg-red-500/10' };
  }

  const stepMessages = [
    'Analyzing resume and extracting profile skills...',
    'Searching all major job portals (LinkedIn, Naukri, Indeed, Internshala)...',
    'Cross-referencing matching jobs & evaluating fit score with Claude AI...',
    'Finalizing matching results...',
  ];

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#080d1a' }}>
      <AppNav />

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold text-purple-300 mb-4"
            style={{ background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.25)' }}>
            <Compass className="w-3.5 h-3.5" />
            Discover matching job openings
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-tight">
            AI Job Portal <span className="gradient-text">Scanner</span>
          </h1>
          <p className="text-slate-400 text-sm sm:text-base max-w-xl mx-auto mt-2">
            Scan top job portals in real time using your resume. Find matching jobs, view your job fit score, and optimize your application in one click.
          </p>
        </div>

        {/* Form Controls */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Inputs Panel (1 Column) */}
          <div className="lg:col-span-1 space-y-6">
            <div className="rounded-2xl p-5 space-y-5" style={{ background: '#0f1629', border: '1px solid rgba(255,255,255,0.07)' }}>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">Search Parameters</h2>

              {/* Target Role */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400">Target Job Title</label>
                <div className="relative">
                  <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                  <input
                    type="text"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    placeholder="e.g. React Developer (or auto-detect)"
                    className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl focus:outline-none focus:ring-1 focus:ring-purple-500/50 placeholder-slate-600 text-slate-200"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}
                  />
                </div>
              </div>

              {/* Location */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400">Preferred Location</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. Remote, Bangalore, India"
                    className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl focus:outline-none focus:ring-1 focus:ring-purple-500/50 placeholder-slate-600 text-slate-200"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}
                  />
                </div>
              </div>

              {/* Resume Source Selector */}
              {isLoggedIn && historyResumes.length > 0 && (
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-400">Select Resume Source</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setResumeSource('history')}
                      className={`py-2 text-xs font-semibold rounded-lg border transition-all ${
                        resumeSource === 'history'
                          ? 'border-purple-500 bg-purple-500/10 text-white'
                          : 'border-white/5 bg-white/2 text-slate-400'
                      }`}
                    >
                      Optimized History
                    </button>
                    <button
                      onClick={() => setResumeSource('paste')}
                      className={`py-2 text-xs font-semibold rounded-lg border transition-all ${
                        resumeSource === 'paste'
                          ? 'border-purple-500 bg-purple-500/10 text-white'
                          : 'border-white/5 bg-white/2 text-slate-400'
                      }`}
                    >
                      Paste or Upload
                    </button>
                  </div>
                </div>
              )}

              {/* Resume Selection */}
              {resumeSource === 'history' && historyResumes.length > 0 ? (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400">Choose Resume Version</label>
                  <div className="relative">
                    <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                    <select
                      value={selectedResumeId}
                      onChange={(e) => setSelectedResumeId(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl focus:outline-none focus:ring-1 focus:ring-purple-500/50 text-slate-200 appearance-none bg-slate-900 cursor-pointer"
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}
                    >
                      {historyResumes.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.role} at {v.company} ({new Date(v.created_at).toLocaleDateString()})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ) : (
                /* Paste or Upload Panel */
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-400">Paste Resume Text</label>
                    <textarea
                      value={resumeText}
                      onChange={(e) => setResumeText(e.target.value)}
                      placeholder="Paste your resume content here..."
                      rows={5}
                      className="w-full p-3 text-xs rounded-xl focus:outline-none focus:ring-1 focus:ring-purple-500/50 placeholder-slate-600 text-slate-200 resize-none"
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}
                    />
                  </div>

                  {/* Drop zone */}
                  <div
                    onClick={() => !pdfParsing && fileInputRef.current?.click()}
                    className="rounded-xl p-3 text-center transition-all border-2 border-dashed border-white/5 bg-white/2 cursor-pointer"
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                    {pdfParsing ? (
                      <div className="flex items-center justify-center gap-2 text-purple-400">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span className="text-xs">Reading PDF...</span>
                      </div>
                    ) : fileName ? (
                      <div className="flex items-center justify-center gap-1.5 text-purple-400">
                        <FileText className="w-3.5 h-3.5 shrink-0" />
                        <span className="text-xs font-medium truncate max-w-[150px]">{fileName}</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-0.5">
                        <Upload className="w-4 h-4 text-slate-600" />
                        <p className="text-[10px] text-slate-500">
                          Or click to upload PDF (max 5MB)
                        </p>
                      </div>
                    )}
                  </div>
                  {pdfError && <p className="text-[10px] text-red-400">{pdfError}</p>}
                </div>
              )}

              {/* Action Button */}
              <button
                onClick={handleScan}
                disabled={scanning}
                className="w-full py-3 rounded-xl text-white font-bold text-sm transition-all hover:opacity-90 active:scale-[0.98] glow-purple disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ background: 'linear-gradient(135deg, #7c3aed, #3b82f6)' }}
              >
                {scanning ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Scanning...
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4" />
                    Scan Job Portals
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Results Panel (2 Columns) */}
          <div className="lg:col-span-2 min-h-[400px] flex flex-col">
            {/* Overlay during scan */}
            {scanning && (
              <div
                className="flex-1 flex flex-col items-center justify-center rounded-2xl p-8 text-center animate-in"
                style={{ background: '#0c1220', border: '1px solid rgba(255,255,255,0.07)' }}
              >
                {/* Radar Scanning animation */}
                <div className="relative w-32 h-32 mb-6 flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full border border-purple-500/20 animate-ping opacity-75" />
                  <div className="absolute w-24 h-24 rounded-full border border-purple-500/40 animate-pulse" />
                  <div className="absolute w-16 h-16 rounded-full border border-purple-500/60" />
                  <div
                    className="absolute w-1 h-16 origin-bottom bottom-1/2 left-[calc(50%-2px)] bg-gradient-to-t from-purple-500 to-transparent animate-spin"
                    style={{ animationDuration: '3s' }}
                  />
                  <Briefcase className="w-8 h-8 text-purple-400 z-10" />
                </div>
                <h3 className="font-semibold text-white text-lg mb-1">Scanning the Web for Openings</h3>
                <p className="text-sm text-slate-500 max-w-sm h-12 flex items-center justify-center">
                  {stepMessages[scanStep]}
                </p>
              </div>
            )}

            {/* Error State */}
            {!scanning && scanError && (
              <div
                className="flex-1 flex flex-col items-center justify-center rounded-2xl p-8 text-center"
                style={{ background: '#0c1220', border: '1px solid rgba(255,255,255,0.07)' }}
              >
                {scanError === 'limit_reached' ? (
                  <div className="max-w-md">
                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 bg-yellow-500/10 border border-yellow-500/20">
                      <AlertTriangle className="w-8 h-8 text-yellow-400" />
                    </div>
                    <h3 className="font-bold text-white text-lg mb-2">Scan Limit Reached</h3>
                    <p className="text-sm text-slate-500 mb-6">
                      You have used all available scans on your current plan. Upgrade to a Pro or Power plan to scan unlimited times and match with more job boards.
                    </p>
                    <Link
                      href="/pricing"
                      className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-xl font-bold text-white text-sm transition-all hover:scale-105 active:scale-95"
                      style={{ background: 'linear-gradient(135deg, #7c3aed, #3b82f6)' }}
                    >
                      View Pricing Plans
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                ) : (
                  <div className="max-w-sm">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3 bg-red-500/10 border border-red-500/20">
                      <AlertCircle className="w-6 h-6 text-red-400" />
                    </div>
                    <h3 className="font-semibold text-white text-base mb-1">Scanning Failed</h3>
                    <p className="text-xs text-slate-500 mb-4">{scanError}</p>
                    <button
                      onClick={handleScan}
                      className="px-4 py-2 text-xs font-semibold rounded-lg text-white hover:opacity-90 transition-colors"
                      style={{ background: 'linear-gradient(135deg, #7c3aed, #3b82f6)' }}
                    >
                      Try Again
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Empty / Initial State */}
            {!scanning && !scanError && !hasScanned && (
              <div
                className="flex-1 flex flex-col items-center justify-center rounded-2xl p-12 text-center"
                style={{ background: '#0c1220', border: '1px solid rgba(255,255,255,0.07)' }}
              >
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5 bg-purple-500/10 border border-purple-500/20">
                  <Compass className="w-7 h-7 text-purple-400" />
                </div>
                <h3 className="font-bold text-white text-lg mb-2">Ready to Scan</h3>
                <p className="text-sm text-slate-500 max-w-sm mx-auto">
                  Provide your resume and target job details, then click &quot;Scan Job Portals&quot; to fetch live job listings matching your skillset.
                </p>
              </div>
            )}

            {/* Results State */}
            {!scanning && !scanError && hasScanned && (
              <div className="flex-1 space-y-4">
                {/* Results Header */}
                <div className="flex justify-between items-center px-1">
                  <div>
                    <h3 className="text-sm font-semibold text-white">
                      Matched Openings for &quot;<span className="text-purple-400 font-bold">{scannedRole}</span>&quot;
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Location: {scannedLocation} · Found {jobs.length} matching jobs
                    </p>
                  </div>
                  <button
                    onClick={handleScan}
                    className="text-xs text-purple-400 font-semibold hover:text-purple-300 transition-colors"
                  >
                    Rescan
                  </button>
                </div>

                {/* Jobs List */}
                {jobs.length === 0 ? (
                  <div
                    className="flex-1 flex flex-col items-center justify-center rounded-2xl p-12 text-center"
                    style={{ background: '#0c1220', border: '1px solid rgba(255,255,255,0.07)' }}
                  >
                    <Briefcase className="w-10 h-10 text-slate-600 mb-3" />
                    <h3 className="font-semibold text-white text-base mb-1">No Jobs Found</h3>
                    <p className="text-xs text-slate-500 max-w-xs mx-auto">
                      We couldn&apos;t find any matching jobs for your search query. Try broadening your job title or changing your location.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {jobs.map((job, idx) => {
                      const cfg = getScoreColor(job.fitScore);
                      const initial = (job.company?.[0] ?? '?').toUpperCase();
                      
                      return (
                        <div
                          key={idx}
                          className="rounded-2xl p-5 space-y-4 transition-all duration-300 hover:border-white/10"
                          style={{
                            background: '#0c1220',
                            border: '1px solid rgba(255,255,255,0.06)',
                          }}
                        >
                          {/* Top Row: Title, Company, Score */}
                          <div className="flex justify-between items-start gap-4">
                            <div className="flex items-center gap-3">
                              {/* Company Avatar */}
                              <div
                                className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm text-purple-300 shrink-0"
                                style={{ background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)' }}
                              >
                                {initial}
                              </div>
                              <div className="min-w-0">
                                <h4 className="font-bold text-white text-sm sm:text-base leading-snug truncate">
                                  {job.title}
                                </h4>
                                <p className="text-xs text-slate-400 font-medium truncate mt-0.5">
                                  {job.company}
                                </p>
                              </div>
                            </div>

                            {/* Fit Score Badge */}
                            <div
                              className={`px-3 py-1.5 rounded-full border text-xs font-bold shrink-0 ${cfg.text} ${cfg.border} ${cfg.bg}`}
                            >
                              {job.fitScore}% Fit
                            </div>
                          </div>

                          {/* Middle Row: Meta details */}
                          <div className="flex items-center gap-3 text-slate-500 text-xs flex-wrap">
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5 text-slate-600" />
                              {job.location || 'Location Not Specified'}
                            </span>
                            <span className="w-1 h-1 rounded-full bg-slate-700" />
                            <span className="px-2 py-0.5 rounded bg-slate-900 border border-white/5 text-[10px] text-slate-400 uppercase font-semibold">
                              {job.portal}
                            </span>
                          </div>

                          {/* Reason / Fit Explanation */}
                          <p className="text-xs text-slate-400 leading-relaxed bg-white/2 p-3 rounded-xl border border-white/[0.04]">
                            {job.fitReason}
                          </p>

                          {/* Skills lists */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                            {/* Matching Skills */}
                            {job.matchingSkills.length > 0 && (
                              <div className="space-y-1.5">
                                <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                                  Matching Skills ({job.matchingSkills.length})
                                </div>
                                <div className="flex flex-wrap gap-1">
                                  {job.matchingSkills.map((s) => (
                                    <span key={s} className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 font-medium">
                                      {s}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Missing Skills */}
                            {job.missingSkills.length > 0 && (
                              <div className="space-y-1.5">
                                <div className="text-[10px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1">
                                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                  Skills Gaps ({job.missingSkills.length})
                                </div>
                                <div className="flex flex-wrap gap-1">
                                  {job.missingSkills.map((s) => (
                                    <span key={s} className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-300 font-medium">
                                      {s}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Card Actions */}
                          <div className="flex gap-3 pt-2 border-t border-white/[0.04]">
                            {/* Apply Now */}
                            <a
                              href={job.jobUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold text-slate-300 bg-white/5 border border-white/10 hover:bg-white/10 hover:text-white transition-all active:scale-[0.98]"
                            >
                              Apply Now
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>

                            {/* Optimize Resume */}
                            <button
                              onClick={() => handleOptimize(job)}
                              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold text-white transition-all hover:opacity-90 active:scale-[0.98]"
                              style={{ background: 'linear-gradient(135deg, #7c3aed, #3b82f6)' }}
                            >
                              <Sparkles className="w-3.5 h-3.5" />
                              Optimize Resume
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
