'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Mic, MicOff, VolumeX, ChevronRight, RotateCcw,
  TrendingUp, CheckCircle, Loader2, AlertCircle, Volume2,
  Video, VideoOff, PhoneOff, Monitor, Users, MessageSquare,
  MoreHorizontal, Shield, Signal,
} from 'lucide-react';
import RecruiterAvatar from '@/components/recruiter-avatar';

/* ─── Web Speech API minimal types ──────────────────────── */
interface ISpeechRecognitionResult { readonly [index: number]: { readonly transcript: string }; readonly isFinal: boolean; }
interface ISpeechRecognitionResultList { readonly length: number; readonly [index: number]: ISpeechRecognitionResult; }
interface ISpeechRecognitionEvent extends Event { readonly resultIndex: number; readonly results: ISpeechRecognitionResultList; }
interface ISpeechRecognition extends EventTarget {
  continuous: boolean; interimResults: boolean; lang: string;
  onaudiostart: ((ev: Event) => void) | null;
  onspeechstart: ((ev: Event) => void) | null;
  onspeechend: ((ev: Event) => void) | null;
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
type Props = { resumeText: string; role: string; company: string; jdText?: string; versionId?: string };

/* ─── Constants ──────────────────────────────────────────── */
const MAX_Q       = 10;    // hard ceiling (server decides actual end, usually 5–8)
const SILENCE       = 5500;  // ms of silence after last word before auto-submit
const MIN_WORDS_AUTO = 6;    // don't auto-submit until the answer has at least this many words
const AUTO_LISTEN_DELAY = 450; // ms after recruiter finishes before mic opens

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

export default function VoiceInterview({ resumeText, role, company, jdText, versionId }: Props) {
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
  const [voiceStatus,   setVoiceStatus]   = useState('');
  // Video call UI state
  const [cameraOn,     setCameraOn]     = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [joinStep,     setJoinStep]     = useState(0);
  // Real-time audio level (0-1) driven by Web Audio API analyser
  const [audioLevel,    setAudioLevel]    = useState(0);
  const [mouthOpen,     setMouthOpen]     = useState(0);   // 0–1 for lip sync
  const [avatarPhase,   setAvatarPhase]   = useState<'idle' | 'speaking' | 'thinking' | 'listening'>('idle');
  const [visibleWords,  setVisibleWords]  = useState(0);   // word-by-word reveal
  // silenceActive: true while the auto-submit countdown is running (≥ MIN_WORDS spoken, mic quiet)
  const [silenceActive, setSilenceActive] = useState(false);

  // Stable refs to avoid stale closures
  const recogRef       = useRef<ISpeechRecognition | null>(null);
  const silenceRef     = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lipRef         = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoListenRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const micConfirmedRef = useRef(false);
  const noSpeechCountRef = useRef(0);
  const meterCtxRef    = useRef<AudioContext | null>(null);
  const meterSrcRef    = useRef<MediaStreamAudioSourceNode | null>(null);
  const meterStreamRef = useRef<MediaStream | null>(null);
  const levelFrameRef  = useRef<number | null>(null);
  const lastSpeechTsRef = useRef(0);   // ms timestamp of last transcribed word — drives synthetic meter
  // makeRecognitionRef: allows onend to restart without resetting the transcript
  const makeRecognitionRef = useRef<((reset: boolean) => void) | null>(null);
  // Video call refs
  const videoRef       = useRef<HTMLVideoElement | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const timerRef       = useRef<ReturnType<typeof setInterval> | null>(null);
  // ElevenLabs / Web Audio refs
  const audioCtxRef  = useRef<AudioContext | null>(null);
  const audioSrcRef  = useRef<AudioBufferSourceNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const wordTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const finalTxt     = useRef('');
  const liveTxt      = useRef('');   // final + interim — the best-available answer text
  const historyRef   = useRef<QAPair[]>([]);
  const questionRef  = useRef('');
  const qNumRef      = useRef(0);
  // Refs mirrored from state — read inside scheduled timers without stale closures
  const phaseRef     = useRef<Phase>('idle');
  const useTypedRef  = useRef(false);
  const sttAvailRef  = useRef(false);
  const onRecruiterDoneRef = useRef<() => void>(() => {});

  useEffect(() => { historyRef.current  = history;  }, [history]);
  useEffect(() => { questionRef.current = question; }, [question]);
  useEffect(() => { qNumRef.current     = qNum;     }, [qNum]);
  useEffect(() => { phaseRef.current    = phase;    }, [phase]);
  useEffect(() => { useTypedRef.current = useTyped; }, [useTyped]);
  useEffect(() => { sttAvailRef.current = sttAvail; }, [sttAvail]);

  // Re-attach camera stream every time the phase changes.
  // When we transition from lobby → active call, React swaps in a new <video>
  // element so we must re-set srcObject on the new DOM node.
  useEffect(() => {
    const vid = videoRef.current;
    const stream = cameraStreamRef.current;
    if (vid && stream?.active) {
      vid.srcObject = stream;
      // Chrome requires an explicit play() call after srcObject is assigned
      // to a newly mounted video element — autoPlay alone isn't enough here.
      vid.play().catch(() => {});
    }
  }, [phase]);

  useEffect(() => {
    const win = window as Window & { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown };
    const avail = !!(win.SpeechRecognition || win.webkitSpeechRecognition);
    setSttAvail(avail);
    sttAvailRef.current = avail;
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

  /* ─── TTS helpers ───────────────────────────────────── */

  const stopAudio = useCallback(() => {
    if (animFrameRef.current) { cancelAnimationFrame(animFrameRef.current); animFrameRef.current = null; }
    wordTimersRef.current.forEach(t => clearTimeout(t));
    wordTimersRef.current = [];
    try { audioSrcRef.current?.stop(); } catch { /* ignore */ }
    audioSrcRef.current = null;
    window.speechSynthesis?.cancel();
  }, []);

  // Best available neural voice for browser TTS fallback
  const pickBrowserVoice = useCallback((): SpeechSynthesisVoice | null => {
    const all = window.speechSynthesis.getVoices();
    const en  = all.filter(v => v.lang.startsWith('en'));
    // Prefer female voices throughout
    // 1. Microsoft Natural neural voices (Windows 10+) — prefer female (Aria, Zira, etc)
    const msNaturalFemale = en.find(v => v.name.includes('Natural') && /Aria|Zira|Sarah|Michelle|Natasha|Rachel|Laura/i.test(v.name));
    if (msNaturalFemale) return msNaturalFemale;
    const msNatural = en.find(v => v.name.includes('Natural') && !v.localService)
      || en.find(v => v.name.includes('Natural'));
    if (msNatural) return msNatural;
    // 2. Any Neural voice — prefer female
    const neuralFemale = en.find(v => /Neural|Wavenet/i.test(v.name) && /Aria|Zira|Sarah|Michelle|Natasha|Rachel|Laura|Female|Woman/i.test(v.name));
    if (neuralFemale) return neuralFemale;
    const neural = en.find(v => /Neural|Wavenet/i.test(v.name));
    if (neural) return neural;
    // 3. Google non-network — prefer female
    const googleFemale = en.find(v => v.name.includes('Google') && !v.name.includes('Network') && /Female|Woman|Zira|Rachel/i.test(v.name));
    if (googleFemale) return googleFemale;
    const google = en.find(v => v.name.includes('Google') && !v.name.includes('Network'));
    if (google) return google;
    // 4. Any online voice
    const online = en.find(v => !v.localService);
    if (online) return online;
    return en[0] ?? null;
  }, []);

  /* ─── TTS ────────────────────────────────────────────── */

  const speak = useCallback(async (text: string, onEnd: () => void) => {
    if (muted) { stopAudio(); stopLipSync(); setAvatarPhase('idle'); setVisibleWords(Number.MAX_SAFE_INTEGER); onEnd(); return; }

    stopAudio();
    setAvatarPhase('speaking');
    setVisibleWords(0);
    startLipSync();

    /* ── Try ElevenLabs first ── */
    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      if (res.ok) {
        const buf = await res.arrayBuffer();

        // Reuse AudioContext across calls
        if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
          audioCtxRef.current = new AudioContext();
        }
        const ctx = audioCtxRef.current;
        if (ctx.state === 'suspended') await ctx.resume();

        const decoded = await ctx.decodeAudioData(buf);
        const src     = ctx.createBufferSource();
        src.buffer    = decoded;
        audioSrcRef.current = src;

        // Analyser for real-time audio-driven lip sync
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.75;
        src.connect(analyser);
        analyser.connect(ctx.destination);

        const freqData = new Uint8Array(analyser.frequencyBinCount);
        const driveLips = () => {
          analyser.getByteFrequencyData(freqData);
          // Low-mid speech energy bins (roughly 80–800 Hz range)
          const energy = freqData.slice(1, 9).reduce((a, b) => a + b, 0) / 8;
          setMouthOpen(Math.min(1, energy / 110));
          animFrameRef.current = requestAnimationFrame(driveLips);
        };
        animFrameRef.current = requestAnimationFrame(driveLips);

        // Word reveal timed by character position over audio duration.
        // Timers are scheduled relative to src.start() (recorded via Date.now()),
        // not from when this closure runs — otherwise fetch+decode latency (~100-300ms)
        // makes all reveals arrive early.
        const words    = text.split(/\s+/).filter(w => w);
        const durMs    = decoded.duration * 1000;
        let charSoFar  = 0;
        const wordDelays = words.map((w) => {
          charSoFar += w.length + 1;
          return (charSoFar / (text.length || 1)) * durMs * 0.92;
        });

        src.onended = () => {
          if (animFrameRef.current) { cancelAnimationFrame(animFrameRef.current); animFrameRef.current = null; }
          stopLipSync();
          setMouthOpen(0);
          setAvatarPhase('listening');
          setVisibleWords(Number.MAX_SAFE_INTEGER);
          audioSrcRef.current = null;
          onEnd();
        };
        const startedAt = Date.now();
        src.start();
        // Schedule reveals relative to when playback actually starts, not when we
        // decoded the buffer — this corrects for fetch + decode latency (~100-300ms).
        wordTimersRef.current = wordDelays.map((delay, i) => {
          const remaining = Math.max(0, delay - (Date.now() - startedAt));
          return setTimeout(() => setVisibleWords(i + 1), remaining);
        });
        return; // ElevenLabs path done
      }
    } catch {
      // Network failure or API unavailable — fall through to browser TTS
    }

    /* ── Browser TTS fallback (improved voice selection) ── */
    const utt    = new SpeechSynthesisUtterance(text);
    const voice  = pickBrowserVoice();
    if (voice) utt.voice = voice;
    utt.rate   = 0.87;
    utt.pitch  = 0.93; // slightly lower for male warmth
    utt.volume = 1.0;

    // Timer-based word reveal — works on all browsers/voices.
    // onboundary is unreliable (Chrome on Windows often never fires it).
    // IMPORTANT: setVisibleWords(0) must happen BEFORE scheduling timers so that
    // the first timer (80ms) doesn't race against onstart resetting back to 0.
    setVisibleWords(0);
    const words = text.split(/\s+/).filter(w => w);
    const msPerWord = Math.round(1000 / (utt.rate * 2.5)); // ~160ms at rate 0.87
    wordTimersRef.current = words.map((_, i) =>
      setTimeout(() => setVisibleWords(i + 1), i * msPerWord + 80)
    );

    utt.onstart = () => { startLipSync(); setAvatarPhase('speaking'); };
    utt.onend   = () => {
      wordTimersRef.current.forEach(t => clearTimeout(t));
      wordTimersRef.current = [];
      stopLipSync(); setAvatarPhase('listening'); setVisibleWords(Number.MAX_SAFE_INTEGER); onEnd();
    };
    utt.onerror = () => {
      wordTimersRef.current.forEach(t => clearTimeout(t));
      wordTimersRef.current = [];
      stopLipSync(); setAvatarPhase('idle'); setVisibleWords(Number.MAX_SAFE_INTEGER); onEnd();
    };

    window.speechSynthesis.speak(utt);
  }, [muted, startLipSync, stopLipSync, stopAudio, pickBrowserVoice]);

  /* ─── STT ────────────────────────────────────────────── */

  // Inline meter teardown — avoids useCallback cross-dependency that confuses SWC
  const teardownMeter = () => {
    if (levelFrameRef.current) { cancelAnimationFrame(levelFrameRef.current); levelFrameRef.current = null; }
    meterSrcRef.current?.disconnect();
    meterCtxRef.current?.close().catch(() => {});
    meterSrcRef.current = null; meterCtxRef.current = null;
    meterStreamRef.current?.getTracks().forEach(t => t.stop());
    meterStreamRef.current = null;
    setAudioLevel(0);
  };

  const stopAudioMeter = useCallback(() => { teardownMeter(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ROOT-CAUSE FIX: the meter must NOT open its own getUserMedia stream.
  // A second open mic stream starves Chrome's SpeechRecognition — STT then
  // receives silence and reports no-speech while the meter shows "audio
  // detected" (see requestMicAccess note). So we drive the waveform
  // *synthetically* and let the real transcript be the source of truth.
  // No mic stream here = no conflict = STT actually captures audio.
  const startAudioMeter = useCallback(() => {
    teardownMeter(); // cancel any prior animation frame
    let t = 0;
    const tick = () => {
      if (phaseRef.current !== 'listening') { setAudioLevel(0); return; }
      t += 1;
      // Gentle always-alive shimmer so the bars never look frozen
      const base = 0.16 + 0.10 * Math.sin(t / 7) + 0.05 * Math.sin(t / 3.3);
      // Surge right after a word is actually transcribed (real feedback)
      const since = Date.now() - lastSpeechTsRef.current;
      const surge = since < 900 ? (1 - since / 900) * 0.6 : 0;
      setAudioLevel(Math.min(1, base + surge + Math.random() * 0.04));
      levelFrameRef.current = requestAnimationFrame(tick);
    };
    levelFrameRef.current = requestAnimationFrame(tick);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const stopListening = useCallback(() => {
    if (silenceRef.current) clearTimeout(silenceRef.current);
    silenceRef.current = null;
    setSilenceActive(false);
    try { recogRef.current?.stop(); } catch { /* ignore */ }
    recogRef.current = null;
    teardownMeter(); // inline — no cross-dep
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const requestMicAccess = useCallback(async () => {
    // Already confirmed — no need to re-request
    if (micConfirmedRef.current) {
      return true;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Microphone access is not available in this browser. Please use Chrome or Edge.');
      return false;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Stop tracks immediately — we only needed to confirm permission.
      // Keeping the stream open conflicts with SpeechRecognition in Chrome,
      // causing audio detection to work but speech recognition to silently fail.
      stream.getTracks().forEach(track => track.stop());
      micConfirmedRef.current = true;
      setVoiceStatus('Microphone ready');
      return true;
    } catch (e) {
      const name = e instanceof DOMException ? e.name : '';
      const message = name === 'NotAllowedError' || name === 'PermissionDeniedError'
        ? 'Microphone permission was blocked. Allow microphone access in your browser, then try again.'
        : 'Could not access your microphone. Check that a mic is connected and not being used by another app.';
      setError(message);
      setVoiceStatus('Microphone blocked');
      return false;
    }
  }, []);

  const submitAnswer = useCallback(async (answer: string) => {
    phaseRef.current = 'processing';   // sync — stops trailing STT results from re-submitting
    stopListening();
    if (!answer.trim()) { phaseRef.current = 'your-turn'; setPhase('your-turn'); return; }

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
    liveTxt.current  = '';

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
        speak(data.question, () => onRecruiterDoneRef.current());
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
      setPhase('your-turn');
      setAvatarPhase('idle');
    }
  }, [stopListening, resumeText, role, company, jdText, versionId, speak]); // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchReport(hist: QAPair[]) {
    setPhase('completing');
    setAvatarPhase('thinking');
    try {
      const res  = await fetch('/api/interview/report', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ history: hist, resumeText, role, company, jdText, versionId }),
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

  const startListening = useCallback((reset = true) => {
    const win = window as Window & { SpeechRecognition?: SpeechRecognitionCtor; webkitSpeechRecognition?: SpeechRecognitionCtor };
    const SR  = win.SpeechRecognition || win.webkitSpeechRecognition;
    if (!SR) {
      setUseTyped(true); setPhase('your-turn');
      setVoiceStatus('Voice recognition not supported. Use Chrome or type your answer.');
      return;
    }

    if (reset) {
      finalTxt.current = ''; liveTxt.current = '';
      setTranscript(''); setError('');
      noSpeechCountRef.current = 0;
    }
    if (reset) setVoiceStatus('Starting microphone…');

    // Use continuous:false — each phrase is its own clean request to Google's STT.
    // More reliable than continuous:true which can enter a zombie state where
    // onaudiostart fires but onresult never does (network timeout loop).
    const rec = new SR();
    rec.continuous     = false;
    rec.interimResults = true;
    rec.lang           = 'en-US';

    // Only show "speak now" if no words have been captured yet — don't overwrite
    // the transcript area with a stale status message on recognition restart.
    rec.onaudiostart = () => {
      if (!liveTxt.current) setVoiceStatus('Microphone is on — speak now.');
    };

    rec.onspeechstart = () => {
      noSpeechCountRef.current = 0; // reset counter when speech is actually detected
      if (!liveTxt.current) setVoiceStatus('Capturing your voice…');
    };

    rec.onspeechend = () => {
      if (!liveTxt.current) setVoiceStatus('Processing…');
    };

    rec.onresult = (ev: ISpeechRecognitionEvent) => {
      if (phaseRef.current !== 'listening') return;
      let interim = '';
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const t = ev.results[i][0].transcript;
        if (ev.results[i].isFinal) finalTxt.current += t + ' ';
        else interim += t;
      }
      liveTxt.current = (finalTxt.current + interim).trim();
      setTranscript(liveTxt.current);
      lastSpeechTsRef.current = Date.now(); // surge the synthetic meter
      setVoiceStatus('');                   // clear any lingering status messages

      // Reset the silence countdown — new words arrived, user is still speaking.
      setSilenceActive(false);
      if (silenceRef.current) { clearTimeout(silenceRef.current); silenceRef.current = null; }

      // Only arm auto-submit once the answer is substantial enough.
      // Prevents submitting mid-sentence when the user pauses to think.
      const wordCount = liveTxt.current.trim().split(/\s+/).filter(Boolean).length;
      if (wordCount >= MIN_WORDS_AUTO) {
        setSilenceActive(true);
        silenceRef.current = setTimeout(() => {
          silenceRef.current = null;   // clear stale handle immediately
          setSilenceActive(false);
          if (phaseRef.current !== 'listening') return;
          const ans = liveTxt.current.trim();
          if (ans) submitAnswer(ans);
        }, SILENCE);
      }
    };

    rec.onerror = (ev: Event) => {
      const err = (ev as Event & { error?: string }).error;

      if (err === 'aborted') return;

      if (err === 'no-speech') {
        noSpeechCountRef.current++;
        if (noSpeechCountRef.current < 3) {
          // Give the user up to 3 chances before switching to typed mode.
          // After no-speech, recognition stops itself and onend fires —
          // as long as we don't null recogRef, onend will restart it.
          setVoiceStatus(`Nothing heard — speak clearly, attempt ${noSpeechCountRef.current} of 3`);
          return;
        }
        // After 3 failures, fall back to typed input.
        recogRef.current = null;
        setSilenceActive(false);
        try { rec.stop(); } catch { /* ignore */ }
        stopAudioMeter();
        const captured = (liveTxt.current || finalTxt.current || '').trim();
        if (captured) setTypedAnswer(captured);
        setUseTyped(true); setPhase('your-turn'); setVoiceStatus('');
        // Set a clear, accurate reason — mic didn't pick up audio, not a network issue.
        setError('Mic didn\'t pick up your voice. Check your mic volume, then type your answer below.');
        return;
      }

      if (err === 'network') {
        recogRef.current = null;
        const captured = (liveTxt.current || finalTxt.current || '').trim();
        if (captured) setTypedAnswer(captured);
        setUseTyped(true); setPhase('your-turn'); setVoiceStatus('');
        setError('Voice recognition needs a stable internet connection. Please type your answer.');
        return;
      }

      const message =
        err === 'not-allowed'   ? 'Microphone permission blocked. Allow it in your browser and retry.' :
        err === 'audio-capture' ? 'No microphone found. Connect one and retry.' :
                                  'Voice recognition failed. Please type your answer.';
      setError(message); setVoiceStatus('');
      setUseTyped(true); setPhase('your-turn');
    };

    rec.onend = () => {
      // If we're still in listening phase and this is the current recognition,
      // restart with a FRESH instance (not rec.start()) — avoids InvalidStateError
      // and stale recognition zombie state.
      if (recogRef.current !== rec || phaseRef.current !== 'listening') return;
      setTimeout(() => {
        if (phaseRef.current === 'listening') {
          // Use the ref so we always call the latest version of startListening
          // with reset=false (preserves accumulated transcript in refs)
          makeRecognitionRef.current?.(false);
        }
      }, 120);
    };

    recogRef.current = rec;
    try { rec.start(); } catch (e) {
      setUseTyped(true); setPhase('your-turn');
      setVoiceStatus('Could not start voice recognition. Please type your answer.');
      console.error(e);
    }
  }, [submitAnswer]);

  // Keep the ref pointing at the latest startListening (used in onend to avoid stale closures)
  useEffect(() => { makeRecognitionRef.current = startListening; }, [startListening]);

  /* ─── Auto-listen: recruiter finished → open mic hands-free ─── */
  const beginListening = useCallback(async () => {
    if (!useTypedRef.current) {
      const ok = await requestMicAccess();
      if (!ok) { setPhase('your-turn'); return; }
    }
    setAvatarPhase('listening');
    phaseRef.current = 'listening';
    setPhase('listening');
    startListening();
    startAudioMeter(); // synthetic waveform only — must not open a 2nd mic stream
  }, [requestMicAccess, startListening, startAudioMeter]);

  const onRecruiterDone = useCallback(() => {
    setPhase('your-turn');
    if (autoListenRef.current) clearTimeout(autoListenRef.current);
    // Hands-free: if voice is available and the user isn't typing, open the mic automatically.
    if (sttAvailRef.current && !useTypedRef.current) {
      autoListenRef.current = setTimeout(() => {
        // Only auto-start if the user hasn't already acted (still waiting their turn).
        if (phaseRef.current === 'your-turn') beginListening();
      }, AUTO_LISTEN_DELAY);
    }
  }, [beginListening]);

  // Keep the ref pointing at the latest callback (used inside speak() closures).
  useEffect(() => { onRecruiterDoneRef.current = onRecruiterDone; }, [onRecruiterDone]);

  /* ─── Camera ──────────────────────────────────────── */
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      cameraStreamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setCameraOn(true);
    } catch { setCameraOn(false); }
  }, []);

  const stopCamera = useCallback(() => {
    cameraStreamRef.current?.getTracks().forEach(t => t.stop());
    cameraStreamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraOn(false);
  }, []);

  const toggleCamera = useCallback(() => {
    if (cameraOn) stopCamera(); else startCamera();
  }, [cameraOn, startCamera, stopCamera]);

  const formatCallTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  async function startInterview() {
    setPhase('starting');
    setError('');
    setVoiceStatus('');
    setJoinStep(1);
    setHistory([]); setReport(null);
    setTranscript(''); setTypedAnswer('');
    setUseTyped(false);   // reset — previous session may have fallen back to typed
    setCallDuration(0);
    finalTxt.current = ''; historyRef.current = [];
    // Start camera (non-blocking, so lobby self-view works immediately)
    startCamera();
    // Realistic joining animation sequence
    await new Promise(r => setTimeout(r, 700));   // "Verifying identity…"
    setJoinStep(2);
    await new Promise(r => setTimeout(r, 800));   // "Connecting to recruiter…"
    setJoinStep(3);
    await new Promise(r => setTimeout(r, 500));   // "Starting interview…"
    // Start call timer
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => setCallDuration(d => d + 1), 1000);
    if (sttAvailRef.current && !useTypedRef.current) {
      await requestMicAccess();
    }
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
      speak(data.question, () => onRecruiterDoneRef.current());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to start interview.');
      setPhase('idle');
      setJoinStep(0);
    }
  }

  function handleMic() {
    if (autoListenRef.current) clearTimeout(autoListenRef.current);
    if (phase === 'listening') {
      const ans = (liveTxt.current.trim() || finalTxt.current.trim() || transcript.trim());
      if (ans) submitAnswer(ans);
      else {
        // Nothing was captured — stop, switch to typed mode so the user can still answer.
        stopListening(); setTranscript(''); finalTxt.current = ''; liveTxt.current = '';
        setUseTyped(true);
        setError('Nothing was captured. Type your answer below and press Submit.');
        setVoiceStatus('');
        setPhase('your-turn');
      }
    } else if (phase === 'your-turn') {
      beginListening();
    }
  }

  function reset() {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    stopCamera();
    setCallDuration(0);
    stopAudio(); stopListening(); stopLipSync();
    if (autoListenRef.current) clearTimeout(autoListenRef.current);
    setPhase('idle'); setReport(null); setHistory([]);
    setQuestion(''); setQNum(0); setTranscript('');
    setTypedAnswer(''); setError(''); setVoiceStatus(''); setMouthOpen(0);
    setAvatarPhase('idle');
    setUseTyped(false);       // must reset — voice may work fine next time
    setSilenceActive(false);  // redundant with stopListening, but makes intent explicit
    micConfirmedRef.current = false;
    noSpeechCountRef.current = 0;
    finalTxt.current = ''; liveTxt.current = ''; historyRef.current = [];
    questionRef.current = ''; qNumRef.current = 0;
  }

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      cameraStreamRef.current?.getTracks().forEach(t => t.stop());
      stopAudio(); stopListening(); stopLipSync(); teardownMeter();
      if (autoListenRef.current) clearTimeout(autoListenRef.current);
      audioCtxRef.current?.close();
    };
  }, [stopAudio, stopListening, stopLipSync]); // eslint-disable-line react-hooks/exhaustive-deps

  const isActive = ['speaking', 'your-turn', 'listening', 'processing'].includes(phase);
  const isInCall = isActive || phase === 'completing';

  /* ─── shared control button ─── */
  const CtrlBtn = ({
    icon: Icon, label, onClick, active = true, danger = false, disabled = false, badge,
  }: {
    icon: React.ElementType; label: string; onClick?: () => void;
    active?: boolean; danger?: boolean; disabled?: boolean; badge?: string;
  }) => (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      className={[
        'relative flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all select-none',
        danger   ? 'bg-red-600 hover:bg-red-700 text-white w-14 h-14 rounded-full flex-col !gap-0 justify-center'
                 : active && !disabled
                   ? 'bg-white/10 hover:bg-white/15 text-white'
                   : 'bg-white/5 text-slate-500',
        disabled ? 'cursor-not-allowed opacity-40' : 'cursor-pointer active:scale-95',
      ].join(' ')}
    >
      <Icon className={danger ? 'w-6 h-6' : 'w-5 h-5'} />
      {!danger && <span className="text-[9px] font-medium">{label}</span>}
      {badge && (
        <span className="absolute -top-1 -right-1 bg-purple-500 text-white text-[8px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
          {badge}
        </span>
      )}
    </button>
  );

  /* ─── RENDER ─────────────────────────────────────────── */
  return (
    <div className="rounded-2xl overflow-hidden flex flex-col" style={{ background: '#0f1117', minHeight: 580 }}>

      {/* ══════════════════════════════════════════════════
          PRE-CALL LOBBY
      ══════════════════════════════════════════════════ */}
      {(phase === 'idle' || phase === 'starting') && (
        <div className="flex-1 flex flex-col" style={{ background: '#202124' }}>

          {/* ── Google-Meet-style top bar ── */}
          <div className="flex items-center justify-between px-5 py-3"
            style={{ background: '#1a1a1a', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="flex items-center gap-2">
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-white text-sm font-semibold">{company}</span>
              <span className="text-slate-500 text-xs">×</span>
              <span className="text-slate-400 text-xs">HireWin Interview</span>
            </div>
            <span className="text-emerald-400 text-[10px] font-semibold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> End-to-end encrypted
            </span>
          </div>

          {/* ── Main lobby area ── */}
          <div className="flex-1 flex flex-col lg:flex-row items-center justify-center gap-8 p-6">

            {/* LEFT: your self-view (the star of the lobby, like Google Meet) */}
            <div className="flex flex-col items-center gap-4">
              {/* Camera preview */}
              <div className="relative rounded-2xl overflow-hidden shadow-2xl"
                style={{ width: 320, height: 240, background: '#1a1d2e', border: '1px solid rgba(255,255,255,0.1)' }}>
                <video ref={videoRef} autoPlay muted playsInline
                  className="w-full h-full object-cover"
                  style={{ transform: 'scaleX(-1)', display: cameraOn ? 'block' : 'none' }} />
                {!cameraOn && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                    <div className="w-20 h-20 rounded-full flex items-center justify-center"
                      style={{ background: 'linear-gradient(135deg,#4a5568,#2d3748)' }}>
                      <VideoOff className="w-8 h-8 text-slate-400" />
                    </div>
                    <p className="text-slate-400 text-xs">Camera is off</p>
                  </div>
                )}
                {/* "You" label */}
                <div className="absolute bottom-2 left-2 bg-black/70 backdrop-blur-sm px-2 py-0.5 rounded text-white text-[11px] font-medium">
                  {muted && <MicOff className="w-3 h-3 inline mr-1 text-red-400" />}
                  You
                </div>
                {/* Connection quality */}
                <div className="absolute top-2 right-2 flex items-center gap-1 bg-black/60 px-1.5 py-0.5 rounded text-[10px] text-emerald-400">
                  <Signal className="w-2.5 h-2.5" /> HD
                </div>
              </div>

              {/* Camera/mic toggle row */}
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => { setMuted(m => !m); }}
                  className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all ${muted ? 'bg-red-600/20 text-red-400' : 'bg-white/10 text-white hover:bg-white/15'}`}>
                  {muted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                  <span className="text-[9px]">{muted ? 'Unmute' : 'Mute'}</span>
                </button>
                <button type="button" onClick={toggleCamera}
                  className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all ${!cameraOn ? 'bg-red-600/20 text-red-400' : 'bg-white/10 text-white hover:bg-white/15'}`}>
                  {cameraOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
                  <span className="text-[9px]">{cameraOn ? 'Stop video' : 'Start video'}</span>
                </button>
                <button type="button" disabled
                  className="flex flex-col items-center gap-1 px-4 py-2 rounded-xl bg-white/5 text-slate-600 opacity-40">
                  <MoreHorizontal className="w-5 h-5" />
                  <span className="text-[9px]">More</span>
                </button>
              </div>

              {!sttAvail && (
                <div className="flex items-start gap-2 rounded-lg px-3 py-2 text-xs text-yellow-300/80 max-w-xs"
                  style={{ background: 'rgba(251,191,36,0.07)', border: '1px solid rgba(251,191,36,0.15)' }}>
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-yellow-400" />
                  Voice recognition unavailable — you&apos;ll type answers. Use Chrome for voice.
                </div>
              )}
            </div>

            {/* RIGHT: meeting info + join */}
            <div className="flex flex-col items-center gap-5 text-center max-w-xs">
              {/* Alex's preview */}
              <div className="relative rounded-2xl overflow-hidden shadow-xl"
                style={{ width: 120, height: 144, background: '#0d1624', border: '1px solid rgba(255,255,255,0.08)' }}>
                <RecruiterAvatar openness={0} phase="idle" />
                <div className="absolute bottom-1.5 left-1.5 bg-black/70 px-1.5 py-0.5 rounded text-[9px] text-white font-medium">
                  Sarah Chen
                </div>
              </div>

              <div>
                <h2 className="text-white font-bold text-xl mb-1">{role} Interview</h2>
                <p className="text-slate-400 text-sm">Sarah Chen · AI Recruiter · {company}</p>
              </div>

              {/* Join button OR joining sequence */}
              {phase === 'idle' ? (
                <div className="flex flex-col items-center gap-3 w-full">
                  {error && (
                    <div className="flex items-start gap-2 rounded-xl px-4 py-3 text-sm text-red-300 w-full"
                      style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)' }}>
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
                      {error}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => { void startInterview(); }}
                    className="w-full flex items-center justify-center gap-2.5 py-4 rounded-full text-base font-bold text-white shadow-lg shadow-green-900/30 transition-all hover:scale-105 active:scale-95"
                    style={{ background: 'linear-gradient(135deg,#16a34a,#15803d)' }}>
                    <Video className="w-5 h-5" /> Join now
                  </button>
                  <p className="text-slate-500 text-xs">Sarah is waiting for you to join</p>
                </div>
              ) : (
                /* Joining animation sequence */
                <div className="flex flex-col items-center gap-4 w-full">
                  <div className="w-full rounded-2xl p-4 flex flex-col items-center gap-3"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    {/* Animated connecting dots */}
                    <div className="flex items-center gap-2">
                      {[0,1,2].map(i => (
                        <div key={i} className="w-2.5 h-2.5 rounded-full bg-green-500"
                          style={{ animation: `voice-wave 0.8s ease-in-out infinite alternate`, animationDelay: `${i*0.25}s` }} />
                      ))}
                    </div>
                    <p className="text-white text-sm font-medium">
                      {joinStep === 1 && 'Verifying your identity…'}
                      {joinStep === 2 && 'Connecting to Sarah…'}
                      {joinStep === 3 && 'Starting your interview…'}
                    </p>
                    {/* Progress steps */}
                    <div className="flex items-center gap-1.5 w-full">
                      {[
                        { step: 1, label: 'Verified' },
                        { step: 2, label: 'Connected' },
                        { step: 3, label: 'Ready' },
                      ].map(({ step, label }) => (
                        <div key={step} className="flex-1 flex flex-col items-center gap-1">
                          <div className={`w-full h-1 rounded-full transition-all duration-500 ${joinStep >= step ? 'bg-green-500' : 'bg-white/10'}`} />
                          <span className={`text-[9px] font-medium ${joinStep >= step ? 'text-green-400' : 'text-slate-600'}`}>{label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════
          ACTIVE VIDEO CALL
      ══════════════════════════════════════════════════ */}
      {isInCall && (
        <div className="flex-1 flex flex-col">

          {/* ── TOP BAR ── */}
          <div className="flex items-center justify-between px-4 py-2.5"
            style={{ background: 'rgba(0,0,0,0.5)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-center gap-3">
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-white text-sm font-semibold">{company} Interview</span>
              <span className="text-slate-600 text-xs">·</span>
              <span className="text-slate-400 text-xs">{role}</span>
            </div>
            <div className="flex items-center gap-3">
              {/* Question counter */}
              {isActive && (
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-slate-500 font-medium">Q{qNum}</span>
                  <div className="flex gap-0.5">
                    {Array.from({ length: Math.max(qNum, 1) }).map((_, i) => (
                      <div key={i} className="h-1 w-2.5 rounded-full"
                        style={{ background: i < qNum ? '#7c3aed' : 'rgba(255,255,255,0.1)' }} />
                    ))}
                  </div>
                </div>
              )}
              {/* Timer */}
              <span className="text-white text-xs font-mono bg-black/30 px-2 py-0.5 rounded">
                {formatCallTime(callDuration)}
              </span>
              {/* Recording badge */}
              <span className="flex items-center gap-1 text-[10px] font-bold text-red-400">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                REC
              </span>
              {/* Network quality */}
              <Signal className="w-3.5 h-3.5 text-emerald-400" />
            </div>
          </div>

          {/* ── MAIN AREA ── */}
          <div className="flex-1 flex gap-2 p-2 relative" style={{ minHeight: 280 }}>

            {/* Alex's main video tile */}
            <div className="flex-1 relative rounded-xl overflow-hidden"
              style={{
                background: '#0d1624',
                boxShadow: phase === 'speaking' && !muted
                  ? '0 0 0 2px #22c55e, 0 0 24px rgba(34,197,94,0.25)'
                  : '0 0 0 1px rgba(255,255,255,0.08)',
                transition: 'box-shadow 0.3s ease',
              }}>
              {/* Avatar fills the tile */}
              <div className="absolute inset-0 flex items-center justify-center p-4">
                <div style={{ width: '100%', maxWidth: 260, height: '100%', maxHeight: 320 }}>
                  <RecruiterAvatar openness={mouthOpen} phase={avatarPhase} />
                </div>
              </div>

              {/* Name + status overlay — bottom left */}
              <div className="absolute bottom-3 left-3 flex items-center gap-2">
                <div className="bg-black/70 backdrop-blur-sm px-2.5 py-1 rounded-lg flex items-center gap-1.5">
                  {phase === 'speaking' && !muted && <Mic className="w-3 h-3 text-emerald-400" />}
                  {muted && <VolumeX className="w-3 h-3 text-slate-400" />}
                  <span className="text-white text-[11px] font-semibold">Sarah Chen</span>
                  <span className="text-slate-400 text-[10px]">AI Recruiter</span>
                </div>
                {phase === 'processing' && (
                  <div className="bg-black/70 backdrop-blur-sm px-2 py-1 rounded-lg flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin text-blue-400" />
                    <span className="text-blue-300 text-[10px]">thinking…</span>
                  </div>
                )}
              </div>

              {/* LIVE badge — top left */}
              <div className="absolute top-3 left-3">
                {muted ? (
                  <span className="bg-black/60 text-slate-500 text-[10px] font-bold px-2 py-0.5 rounded">MUTED</span>
                ) : (
                  <span className="bg-red-600/80 text-white text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> LIVE
                  </span>
                )}
              </div>

              {/* Mute Sarah button — top right */}
              <button type="button"
                onClick={() => { setMuted(m => !m); stopAudio(); stopLipSync(); }}
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center transition-colors"
                title={muted ? 'Unmute Sarah' : 'Mute Sarah'}>
                {muted ? <VolumeX className="w-3.5 h-3.5 text-slate-400" /> : <Volume2 className="w-3.5 h-3.5 text-white" />}
              </button>

              {/* Self-view floating tile — bottom right of main video */}
              <div className="absolute bottom-3 right-3 w-28 sm:w-36 rounded-xl overflow-hidden shadow-xl"
                style={{ height: 80, background: '#1a1d2e', border: '2px solid rgba(255,255,255,0.12)' }}>
                <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover"
                  style={{ transform: 'scaleX(-1)', display: cameraOn ? 'block' : 'none' }} />
                {!cameraOn && (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center">
                      <VideoOff className="w-4 h-4 text-slate-400" />
                    </div>
                  </div>
                )}
                <div className="absolute bottom-1 left-1.5 text-[9px] text-white/80 font-medium">You</div>
              </div>
            </div>
          </div>

          {/* ── CAPTIONS: Question text ── */}
          {question && isActive && (
            <div className="px-4 py-2.5 text-center"
              style={{ background: 'rgba(0,0,0,0.45)', borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              {/* "Alex asked:" label */}
              {(phase === 'your-turn' || phase === 'listening') && (
                <p className="text-[10px] font-bold uppercase tracking-widest text-purple-400/80 mb-1">Alex asked</p>
              )}
              <p className="text-sm sm:text-base leading-relaxed max-w-xl mx-auto">
                {question.split(/\s+/).filter(w => w).map((word, i) => (
                  <span key={i} style={{
                    display: 'inline-block', marginRight: '0.28em',
                    // Unrevealed words show dimly so the full question is always readable.
                    // They brighten as TTS speaks them. At 0 (initial) all words show at 0.35.
                    opacity: i < visibleWords ? 1 : 0.35,
                    color: i < visibleWords ? (i === visibleWords - 1 ? '#ffffff' : '#94a3b8') : '#64748b',
                    fontWeight: i === visibleWords - 1 ? 600 : 400,
                    transition: 'opacity 120ms ease, color 350ms ease',
                  }}>{word}</span>
                ))}
              </p>
            </div>
          )}

          {/* Completing state */}
          {phase === 'completing' && (
            <div className="flex items-center justify-center gap-3 py-6">
              <Loader2 className="w-5 h-5 animate-spin text-purple-400" />
              <span className="text-slate-300 text-sm">Sarah is reviewing your performance…</span>
            </div>
          )}

          {/* ── YOUR ANSWER PANEL ── */}
          {isActive && (
            <div className="px-3 pt-2.5 pb-2" style={{ background: 'rgba(0,0,0,0.38)', minHeight: '6.5rem' }}>

              {/* ── SPEAKING: Sarah is asking the question ── */}
              {phase === 'speaking' && (
                <div className="flex items-center gap-3 py-1">
                  <div className="flex items-end gap-[3px] h-5">
                    {[0.4,0.7,1,0.8,0.5,0.9,0.6].map((h, i) => (
                      <div key={i} className="w-1 rounded-full bg-emerald-500/60"
                        style={{ height: `${h * 18}px`, animation: `voice-wave 0.6s ease-in-out infinite alternate`, animationDelay: `${i * 0.1}s` }} />
                    ))}
                  </div>
                  <span className="text-[12px] text-slate-400">Sarah is speaking — listen to the question, then answer when the mic opens.</span>
                </div>
              )}

              {/* ── VOICE MODE: listening ── */}
              {!useTyped && phase === 'listening' && (
                <div className="space-y-2">
                  {/* Real-time audio meter + transcript box */}
                  <div className="rounded-xl p-3 transition-all duration-200"
                    style={{
                      background: 'rgba(124,58,237,0.10)',
                      border: '1px solid rgba(124,58,237,0.45)',
                      minHeight: '7rem',
                    }}>
                    {/* Mic status row */}
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                      <span className="text-[10px] font-bold text-white uppercase tracking-wider">Recording</span>
                      {transcript ? (
                        silenceActive ? (
                          // Silence countdown is running — user paused after speaking ≥6 words
                          <span className="text-[10px] text-yellow-400 font-semibold animate-pulse">
                            · Paused — keep speaking or click Submit
                          </span>
                        ) : (
                          // Still actively capturing — show live word count
                          <span className="text-[10px] text-emerald-400 font-semibold">
                            · {liveTxt.current.trim().split(/\s+/).filter(Boolean).length} words · Listening…
                          </span>
                        )
                      ) : voiceStatus ? (
                        <span className="text-[10px] text-yellow-300">{voiceStatus}</span>
                      ) : (
                        <span className="text-[10px] text-slate-500">· Speak your answer…</span>
                      )}
                    </div>
                    {/* Audio level bars — synthetic, surges on transcribed words */}
                    <div className="flex items-end gap-[3px] h-7 mb-2.5">
                      {Array.from({ length: 28 }).map((_, i) => {
                        const wave = Math.sin((i / 28) * Math.PI);
                        const h = Math.max(3, audioLevel * 26 * wave + (audioLevel > 0.05 ? 4 : 2));
                        return (
                          <div key={i} className="flex-1 rounded-full transition-all duration-75"
                            style={{
                              height: h,
                              background: audioLevel > 0.15
                                ? `hsl(${270 - i * 2}, 80%, 65%)`
                                : 'rgba(255,255,255,0.12)',
                            }} />
                        );
                      })}
                    </div>
                    {/* Transcript text — grows with content */}
                    {transcript ? (
                      <p className="text-base text-white leading-relaxed font-medium min-h-[2rem]">
                        {transcript}
                        <span className="inline-block w-0.5 h-4 bg-purple-400 ml-0.5 align-middle"
                          style={{ animation: 'av-blink-cursor 0.9s step-end infinite' }} />
                      </p>
                    ) : (
                      <p className="text-sm text-purple-300/70 italic min-h-[2rem] flex items-center">
                        Your answer will appear here as you speak…
                      </p>
                    )}
                  </div>

                  {/* Gentle helper while waiting for first words — no false alarms */}
                  {!transcript && (
                    <div className="flex items-center gap-2 px-1">
                      <span className="text-[10px] text-slate-500">
                        Speak naturally. Prefer typing? <button type="button"
                          onClick={() => { stopListening(); setUseTyped(true); setPhase('your-turn'); }}
                          className="text-slate-400 hover:text-white underline transition-colors">switch to typing</button>.
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* ── VOICE MODE: waiting (your-turn) ── */}
              {!useTyped && phase === 'your-turn' && (
                <div className="rounded-xl p-3 flex items-center gap-3"
                  style={{ background: 'rgba(124,58,237,0.07)', border: '1px solid rgba(124,58,237,0.25)' }}>
                  {/* Pulsing mic icon */}
                  <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                    style={{ background: 'rgba(124,58,237,0.18)', animation: 'av-breathe-mic 1.8s ease-in-out infinite' }}>
                    <Mic className="w-4 h-4 text-purple-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">Your turn to speak</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Mic opening… speak clearly when ready</p>
                  </div>
                  <style>{`
                    @keyframes av-breathe-mic {
                      0%,100%{ box-shadow:0 0 0 0 rgba(124,58,237,0.45); }
                      50%    { box-shadow:0 0 0 7px rgba(124,58,237,0); }
                    }
                  `}</style>
                </div>
              )}

              {/* ── TYPED MODE ── shown immediately when voice fails ── */}
              {useTyped && (
                <div className="space-y-2">
                  {/* Banner explaining why we switched */}
                  <div className="flex items-start gap-2.5 rounded-xl px-3 py-2.5"
                    style={{ background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.3)' }}>
                    <Mic className="w-4 h-4 shrink-0 mt-0.5 text-blue-400" />
                    <div className="flex-1">
                      <p className="text-[11px] text-blue-200 font-semibold">
                        {error || 'Switched to typing mode'}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">Type your answer below — scored exactly the same as voice.</p>
                    </div>
                    {sttAvail && (
                      <button type="button" onClick={() => { setUseTyped(false); setError(''); noSpeechCountRef.current = 0; }}
                        className="text-[10px] text-slate-400 hover:text-white transition-colors shrink-0 underline">
                        retry voice
                      </button>
                    )}
                  </div>

                  {/* Full-size textarea — impossible to miss */}
                  <textarea
                    value={typedAnswer}
                    onChange={e => setTypedAnswer(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && (e.shiftKey || e.ctrlKey)) { e.preventDefault(); if (typedAnswer.trim()) submitAnswer(typedAnswer); } }}
                    placeholder="Type your full answer here… press Ctrl+Enter or the Submit button to send."
                    disabled={phase === 'processing'}
                    className="w-full rounded-xl p-3 text-sm resize-none focus:outline-none placeholder-slate-500 text-white disabled:opacity-50"
                    style={{
                      minHeight: '6rem',
                      background: 'rgba(255,255,255,0.06)',
                      border: '1.5px solid rgba(124,58,237,0.5)',
                      outline: 'none',
                    }}
                    autoFocus
                  />
                </div>
              )}

              {/* Processing indicator */}
              {phase === 'processing' && (
                <div className="flex items-center gap-2 mt-1">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400" />
                  <span className="text-[11px] text-blue-300">Processing your answer…</span>
                </div>
              )}
            </div>
          )}

          {/* ── BOTTOM VIDEO-CALL CONTROLS ── */}
          <div className="flex items-center justify-between px-4 py-3"
            style={{ background: 'rgba(0,0,0,0.6)', borderTop: '1px solid rgba(255,255,255,0.06)' }}>

            {/* Left: answer submit controls */}
            <div className="flex items-center gap-2 flex-1">
              {isActive && !useTyped && ['your-turn', 'listening'].includes(phase) && (
                <>
                  <button type="button" onClick={handleMic}
                    className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold text-white transition-all hover:opacity-90 active:scale-95"
                    style={{
                      background: phase === 'listening' ? 'linear-gradient(135deg,#dc2626,#ef4444)' : 'linear-gradient(135deg,#7c3aed,#3b82f6)',
                    }}>
                    {phase === 'listening' ? <><MicOff className="w-3.5 h-3.5" /> Submit</> : <><Mic className="w-3.5 h-3.5" /> Speak</>}
                  </button>
                  {phase === 'listening' && (
                    <button type="button"
                      onClick={() => { stopListening(); setTranscript(''); finalTxt.current=''; liveTxt.current=''; setPhase('your-turn'); setAvatarPhase('listening'); }}
                      className="text-[11px] text-slate-600 hover:text-slate-400 transition-colors px-2">Cancel</button>
                  )}
                </>
              )}
              {isActive && useTyped && ['your-turn', 'listening'].includes(phase) && (
                <button type="button"
                  onClick={() => typedAnswer.trim() && submitAnswer(typedAnswer)}
                  disabled={!typedAnswer.trim()}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold text-white disabled:opacity-40 transition-all hover:opacity-90 active:scale-95"
                  style={{ background: 'linear-gradient(135deg,#7c3aed,#3b82f6)' }}>
                  Submit <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Center: device controls */}
            <div className="flex items-center gap-2">
              <CtrlBtn icon={muted ? MicOff : Mic} label={muted ? 'Unmute' : 'Mute'}
                active={!muted}
                onClick={() => { setMuted(m => !m); stopAudio(); stopLipSync(); }} />
              <CtrlBtn icon={cameraOn ? Video : VideoOff} label={cameraOn ? 'Stop video' : 'Start video'}
                active={cameraOn} onClick={toggleCamera} />
              <CtrlBtn icon={Monitor} label="Present" disabled />
              <CtrlBtn icon={Users} label="People" disabled badge="2" />
              <CtrlBtn icon={MessageSquare} label="Chat" disabled />
              <CtrlBtn icon={MoreHorizontal} label="More" disabled />
            </div>

            {/* Right: end call */}
            <div className="flex-1 flex justify-end">
              <CtrlBtn icon={PhoneOff} label="End" danger onClick={reset} />
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════
          CALL ENDED — REPORT
      ══════════════════════════════════════════════════ */}
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
