'use client';

import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import AppNav from '@/components/app-nav';
import {
  loadResumes, saveResume, deleteResume, emptyResume, completionPercent,
  type ResumeData,
} from '@/lib/resume-store';

const FREE_LIMIT = 3;

function CircleProgress({ pct }: { pct: number }) {
  const r = 18;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <svg width="44" height="44" viewBox="0 0 44 44" className="shrink-0">
      <circle cx="22" cy="22" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3" />
      <circle
        cx="22" cy="22" r={r} fill="none"
        stroke="url(#pg)" strokeWidth="3"
        strokeDasharray={`${dash} ${circ - dash}`}
        strokeLinecap="round"
        transform="rotate(-90 22 22)"
      />
      <defs>
        <linearGradient id="pg" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#7c3aed" />
          <stop offset="100%" stopColor="#3b82f6" />
        </linearGradient>
      </defs>
      <text x="22" y="26" textAnchor="middle" fontSize="9" fontWeight="700" fill="#e2e8f0">
        {pct}%
      </text>
    </svg>
  );
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function MyResumesPage() {
  const [resumes, setResumes] = useState<ResumeData[]>([]);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setResumes(loadResumes());
    setMounted(true);
  }, []);

  function handleNew() {
    if (resumes.length >= FREE_LIMIT) return;
    const r = emptyResume();
    saveResume(r);
    router.push(`/my-resumes/${r.id}`);
  }

  function handleDelete(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    if (!confirm('Delete this resume?')) return;
    deleteResume(id);
    setResumes(loadResumes());
  }

  const canAdd = resumes.length < FREE_LIMIT;

  return (
    <div className="min-h-screen" style={{ background: '#07070f' }}>
      <AppNav />

      <div className="max-w-5xl mx-auto px-4 py-10">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">My Resumes</h1>
            <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>
              {mounted ? resumes.length : 0} / {FREE_LIMIT} resumes
            </p>
          </div>
          <button
            onClick={handleNew}
            disabled={!canAdd}
            className="flex items-center gap-2 text-sm font-bold px-5 py-2.5 rounded-xl text-white transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #3b82f6)' }}
          >
            <Plus className="w-4 h-4" />
            New Resume
          </button>
        </div>

        {!mounted && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2].map((i) => (
              <div key={i} className="rounded-2xl h-52 animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} />
            ))}
          </div>
        )}

        {mounted && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {resumes.map((r) => {
              const pct = completionPercent(r);
              return (
                <div
                  key={r.id}
                  className="rounded-2xl p-5 flex flex-col gap-3 cursor-pointer group transition-all hover:-translate-y-0.5"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.07)',
                  }}
                >
                  {/* Top row */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="font-bold text-white text-base truncate">{r.title}</h3>
                      <p className="text-xs mt-0.5 truncate" style={{ color: 'rgba(255,255,255,0.35)' }}>
                        {r.personalInfo.fullName || 'No name yet'}
                      </p>
                      <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.25)' }}>
                        Edited {timeAgo(r.updatedAt)}
                      </p>
                    </div>
                    <CircleProgress pct={pct} />
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 mt-auto pt-1">
                    <button
                      onClick={() => router.push(`/my-resumes/${r.id}`)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90"
                      style={{ background: 'linear-gradient(135deg, #7c3aed, #3b82f6)' }}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      Edit
                    </button>
                    <button
                      onClick={(e) => handleDelete(e, r.id)}
                      className="p-2.5 rounded-xl text-slate-600 hover:text-red-400 transition-colors"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)' }}
                      aria-label="Delete resume"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}

            {/* New Resume card */}
            {canAdd && (
              <button
                onClick={handleNew}
                className="rounded-2xl min-h-[180px] flex flex-col items-center justify-center gap-2 transition-all group"
                style={{
                  background: 'transparent',
                  border: '1.5px dashed rgba(255,255,255,0.12)',
                }}
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center transition-all group-hover:scale-110"
                  style={{ background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)' }}
                >
                  <Plus className="w-5 h-5 text-purple-400" />
                </div>
                <span className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  New Resume
                </span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
