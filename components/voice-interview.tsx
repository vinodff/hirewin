'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Mic, MicOff, Volume2, VolumeX, ChevronRight, RotateCcw,
  TrendingUp, CheckCircle, BarChart2, Loader2, AlertCircle,
} from 'lucide-react';

/* ─── Web Speech API minimal types (not in TS dom lib by default) ── */
interface ISpeechRecognitionResult { readonly [index: number]: { readonly transcript: string }; readonly isFinal: boolean; }
interface ISpeechRecognitionResultList { readonly length: number; item(index: number): ISpeechRecognitionResult; readonly [index: number]: ISpeechRecognitionResult; }
interface ISpeechRecognitionEvent extends Event { readonly resultIndex: number; readonly results: ISpeechRecognitionResultList; }
interface ISpeechRecognition extends EventTarget {
  continuous: boolean; interimResults: boolean; lang: string;
  onresult: ((ev: ISpeechRecognitionEvent) => void) | null;
  onerror: ((ev: Event) => void) | null;
  onend: ((ev: Event) => void) | null;
  start(): void; stop(): void;
}
type SpeechRecognitionCtor = new () => ISpeechRecognition;

/* ─── Types ─────────────────────────────────────────────── */
type Phase =
  | 'idle'
  | 'starting'
  | 'speaking'      // TTS playing recruiter question
  | 'your-turn'     // waiting for user to tap mic or type
  | 'listening'     // STT active
  | 'processing'    // sending answer to AI
  | 'completing'    // generating final report
  | 'report';

type QAPair = { question: string; answer: string };

type QuestionFeedback = {
  question: string;
  score: number;
  feedback: string;
  betterAnswer: string;
};

type Report = {
  overallScore: number;
  selectionChance: 'High' | 'Medium' | 'Low';
  summary: string;
  strengths: string[];
  improvements: string[];
  questionFeedback: QuestionFeedback[];
};

type Props = {
  resumeText: string;
  role: string;
  company: string;
  jdText?: string;
};

/* ─── Constants ─────────────────────────────────────────── */
const MAX_QUESTIONS = 6;
const SILENCE_MS = 3000; // submit after 3s of silence
const CARD = { background: '#0f1629', border: '1px solid rgba(255,255,255,0.07)' };

/* ─── Waveform bars ──────────────────────────────────────── */
function WaveformBars({ active }: { active: boolean }) {
  return (
    <div className="flex items-end gap-[3px] h-8">
      {Array.from({ length: 14 }).map((_, i) => (
        <div
          key={i}
          className="w-[3px] rounded-full"
          style={{
            background: active ? '#a78bfa' : 'rgba(167,139,250,0.2)',
            height: '28px',
            transformOrigin: 'bottom',
            transform: active ? undefined : 'scaleY(0.2)',
            animation: active
              ? `voice-wave ${0.7 + (i % 5) * 0.12}s ease-in-out infinite alternate`
              : 'none',
            animationDelay: `${i * 0.06}s`,
          }}
        />
      ))}
    </div>
  );
}

/* ─── SVG score ring ─────────────────────────────────────── */
function ScoreRing({ score }: { score: number }) {
  const color = score >= 75 ? '#34d399' : score >= 55 ? '#fbbf24' : '#f87171';
  const r = 36;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  return (
    <div className="relative w-24 h-24 flex items-center justify-center shrink-0">
      <svg className="absolute inset-0 -rotate-90" width="96" height="96">
        <circle cx="48" cy="48" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
        <circle
          cx="48" cy="48" r={r} fill="none" stroke={color} strokeWidth="6"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        />
      </svg>
      <div className="text-center z-10">
        <div className="text-2xl font-black text-white leading-none">{score}</div>
        <div className="text-[9px] text-slate-500 uppercase tracking-wider mt-0.5">Score</div>
      </div>
    </div>
  );
}

/* ─── Chance config ──────────────────────────────────────── */
const CHANCE = {
  High:   { color: '#34d399', bg: 'rgba(52,211,153,0.1)',  border: 'rgba(52,211,153,0.25)',  icon: '🎯', label: 'High chance of selection' },
  Medium: { color: '#fbbf24', bg: 'rgba(251,191,36,0.1)',  border: 'rgba(251,191,36,0.25)',  icon: '⚡', label: 'Medium — strengthen key answers' },
  Low:    { color: '#f87171', bg: 'rgba(248,113,113,0.1)', border: 'rgba(248,113,113,0.25)', icon: '📈', label: 'Low — significant practice needed' },
};

/* ─── Main component ─────────────────────────────────────── */
export default function VoiceInterview({ resumeText, role, company, jdText }: Props) {
  const [phase, setPhase]               = useState<Phase>('idle');
  const [question, setQuestion]         = useState('');
  const [qNum, setQNum]                 = useState(0);
  const [history, setHistory]           = useState<QAPair[]>([]);
  const [transcript, setTranscript]     = useState('');
  const [typedAnswer, setTypedAnswer]   = useState('');
  const [useTyped, setUseTyped]         = useState(false);
  const [muted, setMuted]               = useState(false);
  const [report, setReport]             = useState<Report | null>(null);
  const [error, setError]               = useState('');
  const [sttAvailable, setSttAvailable] = useState(false);

  const recogRef     = useRef<ISpeechRecognition | null>(null);
  const silenceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const finalTxt     = useRef('');
  const historyRef   = useRef<QAPair[]>([]);
  const questionRef  = useRef('');
  const qNumRef      = useRef(0);

  // Keep refs in sync
  useEffect(() => { historyRef.current  = history;  }, [history]);
  useEffect(() => { questionRef.current = question; }, [question]);
  useEffect(() => { qNumRef.current     = qNum;     }, [qNum]);

  // Detect STT availability
  useEffect(() => {
    const win = window as Window & { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown };
    setSttAvailable(!!(win.SpeechRecognition || win.webkitSpeechRecognition));
  }, []);

  /* ─── TTS ──────────────────────────────────────────────── */
  const speak = useCallback((text: string, onEnd: () => void) => {
    if (muted) { onEnd(); return; }
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    const pick =
      voices.find(v => v.name.includes('Google') && v.lang.startsWith('en') && !v.name.includes('Network')) ||
      voices.find(v => !v.localService && v.lang.startsWith('en')) ||
      voices.find(v => v.lang.startsWith('en')) ||
      null;
    if (pick) utt.voice = pick;
    utt.rate = 0.92;
    utt.pitch = 1.0;
    utt.onend = onEnd;
    utt.onerror = onEnd;
    window.speechSynthesis.speak(utt);
  }, [muted]);

  /* ─── STT ──────────────────────────────────────────────── */
  const stopListening = useCallback(() => {
    if (silenceTimer.current) clearTimeout(silenceTimer.current);
    try { recogRef.current?.stop(); } catch { /* ignore */ }
    recogRef.current = null;
  }, []);

  const submitAnswer = useCallback(async (answer: string) => {
    stopListening();
    if (!answer.trim()) { setPhase('your-turn'); return; }

    const newHistory: QAPair[] = [...historyRef.current, { question: questionRef.current, answer: answer.trim() }];
    setHistory(newHistory);
    historyRef.current = newHistory;
    setPhase('processing');
    setTranscript('');
    setTypedAnswer('');
    finalTxt.current = '';

    try {
      const newQNum = qNumRef.current;

      if (newQNum >= MAX_QUESTIONS) {
        await fetchReport(newHistory);
        return;
      }

      const res = await fetch('/api/interview/next', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ history: newHistory, resumeText, role, company, jdText, questionNumber: newQNum }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to get next question.');

      if (data.done) {
        await fetchReport(newHistory);
      } else {
        setQuestion(data.question);
        questionRef.current = data.question;
        setQNum(n => { qNumRef.current = n + 1; return n + 1; });
        setPhase('speaking');
        speak(data.question, () => setPhase('your-turn'));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
      setPhase('your-turn');
    }
  }, [stopListening, resumeText, role, company, jdText, speak]); // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchReport(finalHistory: QAPair[]) {
    setPhase('completing');
    try {
      const res = await fetch('/api/interview/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ history: finalHistory, resumeText, role, company, jdText }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to generate report.');
      setReport(data);
      setPhase('report');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to generate report.');
      setPhase('your-turn');
    }
  }

  const startListening = useCallback(() => {
    const win = window as Window & { SpeechRecognition?: SpeechRecognitionCtor; webkitSpeechRecognition?: SpeechRecognitionCtor };
    const SR = win.SpeechRecognition || win.webkitSpeechRecognition;
    if (!SR) { setUseTyped(true); setPhase('your-turn'); return; }

    finalTxt.current = '';
    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = 'en-US';

    rec.onresult = (event: ISpeechRecognitionEvent) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const txt = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalTxt.current += txt + ' ';
        else interim = txt;
      }
      setTranscript(finalTxt.current + interim);

      // Reset silence timer
      if (silenceTimer.current) clearTimeout(silenceTimer.current);
      if (finalTxt.current.trim().length > 8) {
        silenceTimer.current = setTimeout(() => {
          submitAnswer(finalTxt.current.trim());
        }, SILENCE_MS);
      }
    };

    rec.onerror = () => { setUseTyped(true); setPhase('your-turn'); };
    rec.onend = () => {
      // Auto-restart if still in listening phase (Chrome stops after ~60s)
      if (recogRef.current === rec) {
        try { rec.start(); } catch { /* already stopped */ }
      }
    };

    recogRef.current = rec;
    try { rec.start(); } catch (e) { setUseTyped(true); setPhase('your-turn'); console.error(e); }
  }, [submitAnswer]);

  /* ─── Start interview ────────────────────────────────────── */
  async function startInterview() {
    setPhase('starting');
    setError('');
    setHistory([]);
    setReport(null);
    setTranscript('');
    setTypedAnswer('');
    finalTxt.current = '';
    historyRef.current = [];

    try {
      const res = await fetch('/api/interview/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resumeText, role, company, jdText }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to start interview.');

      setQuestion(data.question);
      questionRef.current = data.question;
      setQNum(1);
      qNumRef.current = 1;
      setPhase('speaking');
      speak(data.question, () => setPhase('your-turn'));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to start interview.');
      setPhase('idle');
    }
  }

  /* ─── Mic button handler ─────────────────────────────────── */
  function handleMic() {
    if (phase === 'listening') {
      const answer = finalTxt.current.trim() || transcript.trim();
      if (answer) { submitAnswer(answer); }
      else { stopListening(); setTranscript(''); setPhase('your-turn'); }
    } else if (phase === 'your-turn') {
      setPhase('listening');
      startListening();
    }
  }

  /* ─── Cleanup ────────────────────────────────────────────── */
  useEffect(() => {
    return () => {
      window.speechSynthesis?.cancel();
      stopListening();
    };
  }, [stopListening]);

  /* ─── Reset ──────────────────────────────────────────────── */
  function reset() {
    window.speechSynthesis?.cancel();
    stopListening();
    setPhase('idle');
    setReport(null);
    setHistory([]);
    setQuestion('');
    setQNum(0);
    setTranscript('');
    setTypedAnswer('');
    setError('');
    finalTxt.current = '';
    historyRef.current = [];
    questionRef.current = '';
    qNumRef.current = 0;
  }

  /* ─── Render ─────────────────────────────────────────────── */
  return (
    <div className="rounded-2xl p-6" style={CARD}>

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Mic className="w-4 h-4 text-purple-400" />
          <h3 className="font-semibold text-white">Live Mock Interview</h3>
          <span className="text-xs px-2 py-0.5 rounded-full font-medium"
            style={{ background: 'rgba(124,58,237,0.12)', color: '#c4b5fd', border: '1px solid rgba(124,58,237,0.25)' }}>
            Voice AI
          </span>
        </div>
        {/* Mute toggle (only during interview) */}
        {['speaking', 'your-turn', 'listening', 'processing'].includes(phase) && (
          <button type="button" onClick={() => { setMuted(m => !m); window.speechSynthesis?.cancel(); }}
            className="text-slate-500 hover:text-slate-300 transition-colors p-1.5 rounded-lg"
            title={muted ? 'Unmute recruiter' : 'Mute recruiter'}>
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
        )}
      </div>

      {/* ── IDLE ────────────────────────────────────────────── */}
      {phase === 'idle' && (
        <div className="rounded-xl p-6 flex flex-col items-center text-center gap-4"
          style={{ background: 'rgba(255,255,255,0.02)', border: '2px dashed rgba(255,255,255,0.07)' }}>
          <div className="w-14 h-14 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(124,58,237,0.12)' }}>
            <Mic className="w-7 h-7 text-purple-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-200 mb-1">
              Real recruiter experience for your {role} interview
            </p>
            <p className="text-xs text-slate-500 max-w-xs">
              An AI recruiter asks {MAX_QUESTIONS} adaptive questions, listens to your voice,
              follows up based on your answers, then gives you a full performance report.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            {['🎙️ Voice input', '🤖 Adaptive questions', '📊 Selection score'].map(l => (
              <span key={l} className="text-xs px-3 py-1.5 rounded-full text-slate-400"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                {l}
              </span>
            ))}
          </div>
          {!sttAvailable && (
            <div className="flex items-start gap-2 rounded-lg px-3 py-2 text-xs text-yellow-300/80 text-left"
              style={{ background: 'rgba(251,191,36,0.07)', border: '1px solid rgba(251,191,36,0.15)' }}>
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-yellow-400" />
              Voice not available in this browser. You'll type your answers instead.
              Use Chrome for voice.
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

      {/* ── STARTING ────────────────────────────────────────── */}
      {phase === 'starting' && (
        <div className="flex flex-col items-center gap-3 py-10">
          <Loader2 className="w-7 h-7 text-purple-400 animate-spin" />
          <p className="text-sm text-slate-400">Preparing your {role} interview…</p>
        </div>
      )}

      {/* ── ACTIVE INTERVIEW (speaking / your-turn / listening / processing) ── */}
      {['speaking', 'your-turn', 'listening', 'processing'].includes(phase) && (
        <div className="space-y-4">

          {/* Progress dots */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-500">Question</span>
            <div className="flex gap-1.5">
              {Array.from({ length: MAX_QUESTIONS }).map((_, i) => (
                <div key={i} className="h-1.5 w-6 rounded-full transition-all duration-300"
                  style={{
                    background: i < qNum
                      ? 'linear-gradient(135deg, #7c3aed, #3b82f6)'
                      : 'rgba(255,255,255,0.08)',
                  }} />
              ))}
            </div>
            <span className="text-[11px] text-slate-500">{qNum}/{MAX_QUESTIONS}</span>
          </div>

          {/* Recruiter speech bubble */}
          <div className="rounded-xl p-4"
            style={{ background: 'rgba(124,58,237,0.07)', border: '1px solid rgba(124,58,237,0.18)' }}>
            <div className="flex items-start gap-3">
              <div className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm select-none"
                style={{ background: 'rgba(124,58,237,0.2)' }}>
                👤
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-[11px] font-semibold text-purple-400 uppercase tracking-wider">Recruiter</span>
                  {phase === 'speaking' && (
                    <span className="flex items-center gap-1 text-[10px] text-slate-500">
                      <Volume2 className="w-3 h-3" /> speaking…
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-200 leading-relaxed">{question}</p>
              </div>
            </div>
          </div>

          {/* User response area */}
          {['your-turn', 'listening', 'processing'].includes(phase) && (
            <div className="rounded-xl p-4"
              style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${phase === 'listening' ? 'rgba(167,139,250,0.3)' : 'rgba(255,255,255,0.08)'}` }}>
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Your Answer</span>
                  {phase === 'listening' && (
                    <span className="flex items-center gap-1.5 text-[10px] text-green-400 font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                      Recording
                    </span>
                  )}
                </div>
                {phase === 'your-turn' && !useTyped && sttAvailable && (
                  <button type="button" onClick={() => setUseTyped(true)}
                    className="text-[10px] text-slate-600 hover:text-slate-400 transition-colors">
                    type instead
                  </button>
                )}
                {phase === 'your-turn' && useTyped && sttAvailable && (
                  <button type="button" onClick={() => setUseTyped(false)}
                    className="text-[10px] text-slate-600 hover:text-slate-400 transition-colors">
                    use voice
                  </button>
                )}
              </div>

              {/* Waveform (voice mode, listening) */}
              {phase === 'listening' && !useTyped && (
                <div className="mb-3 pl-1">
                  <WaveformBars active />
                </div>
              )}

              {/* Transcript display */}
              {!useTyped && (phase === 'listening' || (phase === 'your-turn' && transcript)) && (
                <p className="text-sm text-slate-300 leading-relaxed min-h-[2.5rem]">
                  {transcript || <span className="text-slate-600 italic">Listening…</span>}
                </p>
              )}

              {/* Typed input */}
              {useTyped && (
                <textarea
                  value={typedAnswer}
                  onChange={e => setTypedAnswer(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && e.shiftKey) { e.preventDefault(); if (typedAnswer.trim()) submitAnswer(typedAnswer); } }}
                  placeholder="Type your answer… (Shift + Enter to submit)"
                  disabled={phase === 'processing'}
                  className="w-full h-24 rounded-xl p-3 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-purple-500/50 placeholder-slate-600 text-slate-200 disabled:opacity-50"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                  autoFocus
                />
              )}

              {/* Processing */}
              {phase === 'processing' && (
                <p className="text-xs text-slate-500 animate-pulse flex items-center gap-1.5">
                  <Loader2 className="w-3 h-3 animate-spin" /> Processing your answer…
                </p>
              )}

              {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
            </div>
          )}

          {/* Controls */}
          {!useTyped && ['your-turn', 'listening'].includes(phase) && (
            <div className="flex items-center gap-3 flex-wrap">
              <button type="button" onClick={handleMic}
                className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 active:scale-95"
                style={{
                  background: phase === 'listening'
                    ? 'linear-gradient(135deg, #dc2626, #ef4444)'
                    : 'linear-gradient(135deg, #7c3aed, #3b82f6)',
                }}>
                {phase === 'listening'
                  ? <><MicOff className="w-4 h-4" /> Submit Answer</>
                  : <><Mic className="w-4 h-4" /> Tap to Speak</>}
              </button>
              {phase === 'listening' && (
                <button type="button" onClick={() => { stopListening(); setTranscript(''); finalTxt.current = ''; setPhase('your-turn'); }}
                  className="text-xs text-slate-600 hover:text-slate-400 transition-colors">
                  Cancel
                </button>
              )}
            </div>
          )}

          {useTyped && ['your-turn', 'listening'].includes(phase) && (
            <button type="button"
              onClick={() => typedAnswer.trim() && submitAnswer(typedAnswer)}
              disabled={!typedAnswer.trim()}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 active:scale-95 disabled:opacity-40"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #3b82f6)' }}>
              Submit Answer <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* ── COMPLETING ───────────────────────────────────────── */}
      {phase === 'completing' && (
        <div className="flex flex-col items-center gap-4 py-10">
          <div className="w-12 h-12 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(124,58,237,0.12)' }}>
            <BarChart2 className="w-6 h-6 text-purple-400 animate-pulse" />
          </div>
          <p className="text-sm text-slate-400">Analysing your performance…</p>
          <p className="text-xs text-slate-600">This takes about 10 seconds</p>
        </div>
      )}

      {/* ── REPORT ───────────────────────────────────────────── */}
      {phase === 'report' && report && (
        <div className="space-y-5">

          {/* Score hero */}
          <div className="rounded-xl p-5 flex flex-col sm:flex-row items-center gap-5"
            style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <ScoreRing score={report.overallScore} />
            <div className="flex-1 text-center sm:text-left">
              <div className="flex items-center gap-2 justify-center sm:justify-start mb-2 flex-wrap">
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
              <ul className="space-y-2">
                {report.strengths.map((s, i) => (
                  <li key={i} className="text-sm text-slate-300 flex items-start gap-1.5">
                    <span className="text-emerald-400 shrink-0 mt-0.5 text-xs">✓</span>{s}
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
              <ul className="space-y-2">
                {report.improvements.map((s, i) => (
                  <li key={i} className="text-sm text-slate-300 flex items-start gap-1.5">
                    <span className="text-yellow-400 shrink-0 mt-0.5 text-xs">↗</span>{s}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Per-question breakdown */}
          <div>
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-3">
              Question-by-Question Breakdown
            </h4>
            <div className="space-y-3">
              {report.questionFeedback.map((qf, i) => {
                const scoreColor = qf.score >= 8 ? '#34d399' : qf.score >= 6 ? '#fbbf24' : '#f87171';
                return (
                  <div key={i} className="rounded-xl p-4"
                    style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-[11px] font-bold text-slate-500">Q{i + 1}</span>
                      <span className="text-xs font-black shrink-0" style={{ color: scoreColor }}>{qf.score}/10</span>
                    </div>
                    <p className="text-sm font-medium text-slate-200 mb-2 leading-snug">{qf.question}</p>
                    {/* Score bar */}
                    <div className="h-1 rounded-full mb-3" style={{ background: 'rgba(255,255,255,0.06)' }}>
                      <div className="h-full rounded-full" style={{ width: `${qf.score * 10}%`, background: scoreColor }} />
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

          {/* Retake */}
          <button type="button" onClick={reset}
            className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-300 transition-colors mx-auto">
            <RotateCcw className="w-4 h-4" /> Retake Interview
          </button>
        </div>
      )}
    </div>
  );
}
