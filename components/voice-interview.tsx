'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Mic, MicOff, VolumeX, ChevronRight, RotateCcw,
  TrendingUp, CheckCircle, BarChart2, Loader2, AlertCircle, Volume2,
} from 'lucide-react';
import RecruiterAvatar from '@/components/recruiter-avatar';

/* ─── Web Speech API minimal types ──────────────────────── */
interface ISpeechRecognitionResult { readonly [index: number]: { readonly transcript: string }; readonly isFinal: boolean; }
interface ISpeechRecognitionResultList { readonly length: number; readonly [index: number]: ISpeechRecognitionResult; }
interface ISpeechRecognitionEvent extends Event { readonly resultIndex: number; readonly results: ISpeechRecognitionResultList; }
interface ISpeechRecognition extends EventTarget {
  continuous: boolean; interimResults: boolean; lang: string;
  onresult: ((ev: ISpeechRecognitionEvent) => void) | null;
  onerror: ((ev: Event) => void) | null;
  onend: ((ev: Event) => void) | null;
  start(): void; stop(): void;
}
type SpeechRecognitionCtor = new () => ISpeechRecognition;

/* ─── App types ──────────────────────────────────────────── */
type Phase =
  | 'idle' | 'starting'
  | 'speaking'    // recruiter TTS + lip sync
  | 'your-turn'   // waiting for user
  | 'listening'   // STT active
  | 'processing'  // AI computing next question
  | 'completing'  // generating report
  | 'report';

type QAPair = { question: string; answer: string };
type QuestionFeedback = { question: string; score: number; feedback: string; betterAnswer: string };
type Report = {
  overallScore: number;
  selectionChance: 'High' | 'Medium' | 'Low';
  summary: string; strengths: string[]; improvements: string[];
  questionFeedback: QuestionFeedback[];
};
type Props = { resumeText: string; role: string; company: string; jdText?: string };

/* ─── Constants ──────────────────────────────────────────── */
const MAX_Q     = 6;
const SILENCE   = 3000;
const CARD      = { background: '#0d1220', border: '1px solid rgba(255,255,255,0.07)' };

/**
 * Mouth-openness pattern that mimics natural speech rhythm.
 * Repeating 16-step sequence, each step ~100 ms → ~1.6 s cycle.
 */
const LIP_PATTERN = [0, 0.15, 0.5, 0.8, 0.65, 0.4, 0.75, 0.55, 0.2, 0.6, 0.85, 0.4, 0.1, 0.7, 0.5, 0];

/* ─── Sub-components ─────────────────────────────────────── */

function ScoreRing({ score }: { score: number }) {
  const color = score >= 75 ? '#34d399' : score >= 55 ? '#fbbf24' : '#f87171';
  const r = 36, circ = 2 * Math.PI * r, dash = (score / 100) * circ;
  return (
    <div className="relative w-24 h-24 flex items-center justify-center shrink-0">
      <svg className="absolute inset-0 -rotate-90" width="96" height="96">
        <circle cx="48" cy="48" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
        <circle cx="48" cy="48" r={r} fill="none" stroke={color} strokeWidth="6"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" />
      </svg>
      <div className="text-center z-10">
        <div className="text-2xl font-black text-white leading-none">{score}</div>
        <div className="text-[9px] text-slate-500 uppercase tracking-wider mt-0.5">Score</div>
      </div>
    </div>
  );
}

const CHANCE = {
  High:   { color: '#34d399', bg: 'rgba(52,211,153,0.1)',  border: 'rgba(52,211,153,0.25)',  icon: '🎯', label: 'High chance of selection' },
  Medium: { color: '#fbbf24', bg: 'rgba(251,191,36,0.1)',  border: 'rgba(251,191,36,0.25)',  icon: '⚡', label: 'Medium — strengthen key answers' },
  Low:    { color: '#f87171', bg: 'rgba(248,113,113,0.1)', border: 'rgba(248,113,113,0.25)', icon: '📈', label: 'Low — significant practice needed' },
};

/* ─── Main component ─────────────────────────────────────── */

export default function VoiceInterview({ resumeText, role, company, jdText }: Props) {
  const [phase,        setPhase]        = useState<Phase>('idle');
  const [question,     setQuestion]     = useState('');
  const [qNum,         setQNum]         = useState(0);
  const [history,      setHistory]      = useState<QAPair[]>([]);
  const [transcript,   setTranscript]   = useState('');
  const [typedAnswer,  setTypedAnswer]  = useState('');
  const [useTyped,     setUseTyped]     = useState(false);
  const [muted,        setMuted]        = useState(false);
  const [report,       setReport]       = useState<Report | null>(null);
  const [error,        setError]        = useState('');
  const [sttAvail,     setSttAvail]     = useState(false);
  const [mouthOpen,    setMouthOpen]    = useState(0);   // 0–1 for lip sync
  const [avatarPhase,  setAvatarPhase]  = useState<'idle' | 'speaking' | 'thinking' | 'listening'>('idle');

  // Stable refs to avoid stale closures
  const recogRef    = useRef<ISpeechRecognition | null>(null);
  const silenceRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lipRef      = useRef<ReturnType<typeof setInterval> | null>(null);
  const finalTxt    = useRef('');
  const historyRef  = useRef<QAPair[]>([]);
  const questionRef = useRef('');
  const qNumRef     = useRef(0);

  useEffect(() => { historyRef.current  = history;  }, [history]);
  useEffect(() => { questionRef.current = question; }, [question]);
  useEffect(() => { qNumRef.current     = qNum;     }, [qNum]);

  useEffect(() => {
    const win = window as Window & { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown };
    setSttAvail(!!(win.SpeechRecognition || win.webkitSpeechRecognition));
  }, []);

  /* ─── Lip sync ───────────────────────────────────────── */

  const startLipSync = useCallback(() => {
    if (lipRef.current) clearInterval(lipRef.current);
    let i = Math.floor(Math.random() * LIP_PATTERN.length);
    lipRef.current = setInterval(() => {
      setMouthOpen(LIP_PATTERN[i % LIP_PATTERN.length]);
      i++;
    }, 100);
  }, []);

  const stopLipSync = useCallback(() => {
    if (lipRef.current) { clearInterval(lipRef.current); lipRef.current = null; }
    setMouthOpen(0);
  }, []);

  /* ─── TTS ────────────────────────────────────────────── */

  const speak = useCallback((text: string, onEnd: () => void) => {
    if (muted) { stopLipSync(); setAvatarPhase('idle'); onEnd(); return; }
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    const pick =
      voices.find(v => v.name.includes('Google') && v.lang.startsWith('en') && !v.name.includes('Network')) ||
      voices.find(v => !v.localService && v.lang.startsWith('en')) ||
      voices.find(v => v.lang.startsWith('en')) || null;
    if (pick) utt.voice = pick;
    utt.rate = 0.9; utt.pitch = 1.0;

    utt.onstart  = () => { startLipSync(); setAvatarPhase('speaking'); };
    utt.onend    = () => { stopLipSync();  setAvatarPhase('listening'); onEnd(); };
    utt.onerror  = () => { stopLipSync();  setAvatarPhase('idle');     onEnd(); };

    // Word-boundary accent: boost mouth on each word start
    (utt as SpeechSynthesisUtterance & { onboundary?: (e: SpeechSynthesisEvent) => void }).onboundary = (e) => {
      if (e.name === 'word') setMouthOpen(0.85);
    };

    window.speechSynthesis.speak(utt);
  }, [muted, startLipSync, stopLipSync]);

  /* ─── STT ────────────────────────────────────────────── */

  const stopListening = useCallback(() => {
    if (silenceRef.current) clearTimeout(silenceRef.current);
    try { recogRef.current?.stop(); } catch { /* ignore */ }
    recogRef.current = null;
  }, []);

  const submitAnswer = useCallback(async (answer: string) => {
    stopListening();
    if (!answer.trim()) { setPhase('your-turn'); return; }

    const newHistory: QAPair[] = [
      ...historyRef.current,
      { question: questionRef.current, answer: answer.trim() },
    ];
    setHistory(newHistory);
    historyRef.current = newHistory;
    setPhase('processing');
    setAvatarPhase('thinking');
    setTranscript('');
    setTypedAnswer('');
    finalTxt.current = '';

    try {
      const n = qNumRef.current;

      if (n >= MAX_Q) { await fetchReport(newHistory); return; }

      const res  = await fetch('/api/interview/next', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ history: newHistory, resumeText, role, company, jdText, questionNumber: n }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to get next question.');

      if (data.done) {
        await fetchReport(newHistory);
      } else {
        setQuestion(data.question);
        questionRef.current = data.question;
        setQNum(prev => { qNumRef.current = prev + 1; return prev + 1; });
        setPhase('speaking');
        speak(data.question, () => setPhase('your-turn'));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
      setPhase('your-turn');
      setAvatarPhase('idle');
    }
  }, [stopListening, resumeText, role, company, jdText, speak]); // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchReport(hist: QAPair[]) {
    setPhase('completing');
    setAvatarPhase('thinking');
    try {
      const res  = await fetch('/api/interview/report', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ history: hist, resumeText, role, company, jdText }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to generate report.');
      setReport(data);
      setPhase('report');
      setAvatarPhase('idle');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to generate report.');
      setPhase('your-turn');
      setAvatarPhase('idle');
    }
  }

  const startListening = useCallback(() => {
    const win = window as Window & { SpeechRecognition?: SpeechRecognitionCtor; webkitSpeechRecognition?: SpeechRecognitionCtor };
    const SR  = win.SpeechRecognition || win.webkitSpeechRecognition;
    if (!SR) { setUseTyped(true); setPhase('your-turn'); return; }

    finalTxt.current = '';
    const rec = new SR();
    rec.continuous     = true;
    rec.interimResults = true;
    rec.lang           = 'en-US';

    rec.onresult = (ev: ISpeechRecognitionEvent) => {
      let interim = '';
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const t = ev.results[i][0].transcript;
        if (ev.results[i].isFinal) finalTxt.current += t + ' ';
        else interim = t;
      }
      setTranscript(finalTxt.current + interim);
      if (silenceRef.current) clearTimeout(silenceRef.current);
      if (finalTxt.current.trim().length > 8) {
        silenceRef.current = setTimeout(() => submitAnswer(finalTxt.current.trim()), SILENCE);
      }
    };

    rec.onerror = () => { setUseTyped(true); setPhase('your-turn'); };
    rec.onend   = () => {
      if (recogRef.current === rec) {
        try { rec.start(); } catch { /* already stopped */ }
      }
    };

    recogRef.current = rec;
    try { rec.start(); } catch (e) { setUseTyped(true); setPhase('your-turn'); console.error(e); }
  }, [submitAnswer]);

  async function startInterview() {
    setPhase('starting');
    setError('');
    setHistory([]); setReport(null);
    setTranscript(''); setTypedAnswer('');
    finalTxt.current = ''; historyRef.current = [];
    try {
      const res  = await fetch('/api/interview/start', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resumeText, role, company, jdText }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to start interview.');
      setQuestion(data.question); questionRef.current = data.question;
      setQNum(1); qNumRef.current = 1;
      setPhase('speaking');
      speak(data.question, () => setPhase('your-turn'));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to start interview.');
      setPhase('idle');
    }
  }

  function handleMic() {
    if (phase === 'listening') {
      const ans = finalTxt.current.trim() || transcript.trim();
      if (ans) submitAnswer(ans);
      else { stopListening(); setTranscript(''); setPhase('your-turn'); }
    } else if (phase === 'your-turn') {
      setAvatarPhase('listening');
      setPhase('listening');
      startListening();
    }
  }

  function reset() {
    window.speechSynthesis?.cancel();
    stopListening(); stopLipSync();
    setPhase('idle'); setReport(null); setHistory([]);
    setQuestion(''); setQNum(0); setTranscript('');
    setTypedAnswer(''); setError(''); setMouthOpen(0);
    setAvatarPhase('idle');
    finalTxt.current = ''; historyRef.current = [];
    questionRef.current = ''; qNumRef.current = 0;
  }

  useEffect(() => {
    return () => {
      window.speechSynthesis?.cancel();
      stopListening(); stopLipSync();
    };
  }, [stopListening, stopLipSync]);

  const isActive = ['speaking', 'your-turn', 'listening', 'processing'].includes(phase);

  /* ─── RENDER ─────────────────────────────────────────── */
  return (
    <div className="rounded-2xl overflow-hidden" style={CARD}>

      {/* Header bar */}
      <div className="flex items-center justify-between px-5 py-3.5"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
        <div className="flex items-center gap-2">
          <Mic className="w-4 h-4 text-purple-400" />
          <span className="font-semibold text-white text-sm">Live Mock Interview</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold"
            style={{ background: 'rgba(124,58,237,0.15)', color: '#c4b5fd', border: '1px solid rgba(124,58,237,0.3)' }}>
            Voice AI
          </span>
        </div>
        {isActive && (
          <button type="button"
            onClick={() => { setMuted(m => !m); window.speechSynthesis?.cancel(); stopLipSync(); }}
            className="text-slate-500 hover:text-slate-300 transition-colors p-1.5 rounded-lg hover:bg-white/5"
            title={muted ? 'Unmute' : 'Mute recruiter'}>
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
        )}
      </div>

      {/* ── IDLE ─────────────────────────────────────────── */}
      {phase === 'idle' && (
        <div className="p-6 flex flex-col items-center text-center gap-5">
          {/* Static avatar preview */}
          <div className="w-32 h-36 opacity-80">
            <RecruiterAvatar openness={0} phase="idle" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-200 mb-1">
              Practice your {role} interview with an AI recruiter
            </p>
            <p className="text-xs text-slate-500 max-w-sm">
              Alex — your AI interviewer — will ask {MAX_Q} adaptive questions,
              listen to your voice answers, and give you a full performance report.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            {['🎙️ Voice input', '🤖 Adaptive follow-ups', '📊 Selection score'].map(l => (
              <span key={l} className="text-xs px-3 py-1.5 rounded-full text-slate-400"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                {l}
              </span>
            ))}
          </div>
          {!sttAvail && (
            <div className="flex items-start gap-2 rounded-lg px-3 py-2 text-xs text-yellow-300/80 text-left max-w-xs"
              style={{ background: 'rgba(251,191,36,0.07)', border: '1px solid rgba(251,191,36,0.15)' }}>
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-yellow-400" />
              Voice not available in this browser — you&apos;ll type your answers. Use Chrome for voice.
            </div>
          )}
          {error && <p className="text-xs text-red-400">{error}</p>}
          <button type="button" onClick={startInterview}
            className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 active:scale-95"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #3b82f6)' }}>
            <Mic className="w-4 h-4" /> Start Mock Interview
          </button>
        </div>
      )}

      {/* ── STARTING ─────────────────────────────────────── */}
      {phase === 'starting' && (
        <div className="flex flex-col items-center gap-3 py-12">
          <Loader2 className="w-7 h-7 text-purple-400 animate-spin" />
          <p className="text-sm text-slate-400">Preparing your {role} interview…</p>
        </div>
      )}

      {/* ── ACTIVE INTERVIEW ─────────────────────────────── */}
      {isActive && (
        <div>
          {/* ── VIDEO-CALL RECRUITER PANEL ───────────────── */}
          <div className="relative flex flex-col items-center pb-6 pt-5 px-4"
            style={{
              background: 'linear-gradient(160deg, #0a0f20 0%, #0d1428 100%)',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
            }}>

            {/* Corner: progress indicator */}
            <div className="absolute top-3 right-4 flex items-center gap-1.5">
              <span className="text-[10px] text-slate-600">Q{qNum}/{MAX_Q}</span>
              <div className="flex gap-1">
                {Array.from({ length: MAX_Q }).map((_, i) => (
                  <div key={i} className="h-1 w-4 rounded-full transition-all duration-300"
                    style={{ background: i < qNum ? 'linear-gradient(135deg,#7c3aed,#3b82f6)' : 'rgba(255,255,255,0.08)' }} />
                ))}
              </div>
            </div>

            {/* Live / muted badge */}
            <div className="absolute top-3 left-4">
              {muted ? (
                <span className="text-[10px] px-2 py-0.5 rounded font-semibold text-slate-500"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  MUTED
                </span>
              ) : (
                <span className="text-[10px] px-2 py-0.5 rounded font-semibold flex items-center gap-1"
                  style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.25)' }}>
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" /> LIVE
                </span>
              )}
            </div>

            {/* Avatar — hero element */}
            <div className="w-40 h-48 sm:w-48 sm:h-56 drop-shadow-2xl">
              <RecruiterAvatar openness={mouthOpen} phase={avatarPhase} />
            </div>

            {/* Recruiter name + status */}
            <div className="mt-1 flex items-center gap-2 flex-wrap justify-center">
              <span className="text-sm font-bold text-white">Alex</span>
              <span className="text-slate-500 text-xs">· AI Recruiter</span>
              {phase === 'speaking' && !muted && (
                <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> speaking
                </span>
              )}
              {phase === 'processing' && (
                <span className="text-[10px] text-blue-400 flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" /> thinking
                </span>
              )}
            </div>

            {/* Question text */}
            <div className="mt-4 max-w-md text-center px-2">
              <p className="text-sm sm:text-base text-slate-200 leading-relaxed">{question}</p>
            </div>
          </div>

          {/* ── USER RESPONSE PANEL ──────────────────────── */}
          <div className="px-4 pt-4 pb-2">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">You</span>
                {phase === 'listening' && (
                  <span className="text-[10px] font-semibold text-red-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" /> Recording
                  </span>
                )}
              </div>
              {!useTyped && sttAvail && (
                <button type="button" onClick={() => setUseTyped(true)}
                  className="text-[10px] text-slate-600 hover:text-slate-400 transition-colors">
                  type instead
                </button>
              )}
              {useTyped && sttAvail && (
                <button type="button" onClick={() => setUseTyped(false)}
                  className="text-[10px] text-slate-600 hover:text-slate-400 transition-colors">
                  use voice
                </button>
              )}
            </div>

            {/* Waveform (voice mode, recording) */}
            {phase === 'listening' && !useTyped && (
              <div className="flex items-end gap-[3px] h-6 mb-2 px-1">
                {Array.from({ length: 18 }).map((_, i) => (
                  <div key={i} className="w-[3px] rounded-full"
                    style={{
                      height: '24px',
                      transformOrigin: 'bottom',
                      background: '#a78bfa',
                      animation: `voice-wave ${0.6 + (i % 5) * 0.1}s ease-in-out infinite alternate`,
                      animationDelay: `${i * 0.05}s`,
                    }} />
                ))}
              </div>
            )}

            {/* Transcript / typed input */}
            {useTyped ? (
              <textarea
                value={typedAnswer}
                onChange={e => setTypedAnswer(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && e.shiftKey) { e.preventDefault(); if (typedAnswer.trim()) submitAnswer(typedAnswer); } }}
                placeholder="Type your answer… (Shift+Enter to submit)"
                disabled={phase === 'processing'}
                className="w-full h-20 rounded-xl p-3 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-purple-500/50 placeholder-slate-600 text-slate-200 disabled:opacity-50"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                autoFocus
              />
            ) : (
              <div className="min-h-[3rem] px-1">
                {transcript ? (
                  <p className="text-sm text-slate-300 leading-relaxed">{transcript}</p>
                ) : phase === 'your-turn' ? (
                  <p className="text-sm text-slate-600 italic">Tap the mic button to start speaking…</p>
                ) : null}
              </div>
            )}

            {phase === 'processing' && (
              <p className="text-xs text-slate-500 animate-pulse flex items-center gap-1.5 mt-1">
                <Loader2 className="w-3 h-3 animate-spin" /> Processing your answer…
              </p>
            )}
            {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
          </div>

          {/* ── CONTROLS ─────────────────────────────────── */}
          <div className="px-4 pb-4 flex items-center gap-3 flex-wrap">
            {!useTyped && ['your-turn', 'listening'].includes(phase) && (
              <button type="button" onClick={handleMic}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 active:scale-95"
                style={{
                  background: phase === 'listening'
                    ? 'linear-gradient(135deg,#dc2626,#ef4444)'
                    : 'linear-gradient(135deg,#7c3aed,#3b82f6)',
                }}>
                {phase === 'listening'
                  ? <><MicOff className="w-4 h-4" /> Submit Answer</>
                  : <><Mic className="w-4 h-4" /> Tap to Speak</>}
              </button>
            )}

            {phase === 'listening' && !useTyped && (
              <button type="button"
                onClick={() => { stopListening(); setTranscript(''); finalTxt.current = ''; setPhase('your-turn'); setAvatarPhase('listening'); }}
                className="text-xs text-slate-600 hover:text-slate-400 transition-colors">
                Cancel
              </button>
            )}

            {useTyped && ['your-turn', 'listening'].includes(phase) && (
              <button type="button"
                onClick={() => typedAnswer.trim() && submitAnswer(typedAnswer)}
                disabled={!typedAnswer.trim()}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 active:scale-95 disabled:opacity-40"
                style={{ background: 'linear-gradient(135deg,#7c3aed,#3b82f6)' }}>
                Submit Answer <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── COMPLETING ───────────────────────────────────── */}
      {phase === 'completing' && (
        <div className="flex flex-col items-center gap-4 py-12">
          <div className="w-16 h-20 opacity-60">
            <RecruiterAvatar openness={0} phase="thinking" />
          </div>
          <p className="text-sm text-slate-400">Alex is reviewing your performance…</p>
          <p className="text-xs text-slate-600">Takes about 10 seconds</p>
        </div>
      )}

      {/* ── REPORT ───────────────────────────────────────── */}
      {phase === 'report' && report && (
        <div className="p-5 sm:p-6 space-y-5">

          {/* Score hero */}
          <div className="rounded-xl p-5 flex flex-col sm:flex-row items-center gap-5"
            style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <ScoreRing score={report.overallScore} />
            <div className="flex-1 text-center sm:text-left">
              <div className="flex items-center gap-2 justify-center sm:justify-start mb-1.5 flex-wrap">
                <span className="text-base font-bold text-white">Interview Report</span>
                <span className="text-xs font-bold px-2.5 py-1 rounded-full"
                  style={CHANCE[report.selectionChance]}>
                  {CHANCE[report.selectionChance].icon} {CHANCE[report.selectionChance].label}
                </span>
              </div>
              <p className="text-sm text-slate-300 leading-relaxed">{report.summary}</p>
            </div>
          </div>

          {/* Strengths + Improvements */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-xl p-4"
              style={{ background: 'rgba(52,211,153,0.06)', border: '1px solid rgba(52,211,153,0.18)' }}>
              <div className="flex items-center gap-1.5 mb-2.5">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">Strengths</span>
              </div>
              <ul className="space-y-1.5">
                {report.strengths.map((s, i) => (
                  <li key={i} className="text-sm text-slate-300 flex items-start gap-1.5">
                    <span className="text-emerald-400 shrink-0 text-xs mt-0.5">✓</span>{s}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl p-4"
              style={{ background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.18)' }}>
              <div className="flex items-center gap-1.5 mb-2.5">
                <TrendingUp className="w-3.5 h-3.5 text-yellow-400" />
                <span className="text-[11px] font-bold text-yellow-400 uppercase tracking-wider">Areas to Improve</span>
              </div>
              <ul className="space-y-1.5">
                {report.improvements.map((s, i) => (
                  <li key={i} className="text-sm text-slate-300 flex items-start gap-1.5">
                    <span className="text-yellow-400 shrink-0 text-xs mt-0.5">↗</span>{s}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Per-question breakdown */}
          <div>
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-3">
              Question Breakdown
            </h4>
            <div className="space-y-3">
              {report.questionFeedback.map((qf, i) => {
                const sc = qf.score >= 8 ? '#34d399' : qf.score >= 6 ? '#fbbf24' : '#f87171';
                return (
                  <div key={i} className="rounded-xl p-4"
                    style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-[11px] font-bold text-slate-500">Q{i + 1}</span>
                      <span className="text-xs font-black shrink-0" style={{ color: sc }}>{qf.score}/10</span>
                    </div>
                    <p className="text-sm font-medium text-slate-200 mb-2 leading-snug">{qf.question}</p>
                    <div className="h-1 rounded-full mb-2.5" style={{ background: 'rgba(255,255,255,0.06)' }}>
                      <div className="h-full rounded-full" style={{ width: `${qf.score * 10}%`, background: sc }} />
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed mb-2">{qf.feedback}</p>
                    {qf.betterAnswer && (
                      <div className="rounded-lg p-3"
                        style={{ background: 'rgba(124,58,237,0.07)', border: '1px solid rgba(124,58,237,0.15)' }}>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-purple-400 mb-1">Stronger Answer</p>
                        <p className="text-xs text-slate-300 leading-relaxed">{qf.betterAnswer}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <button type="button" onClick={reset}
            className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-300 transition-colors mx-auto">
            <RotateCcw className="w-4 h-4" /> Retake Interview
          </button>
        </div>
      )}
    </div>
  );
}
