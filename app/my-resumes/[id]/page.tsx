'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ChevronDown, ChevronUp, Plus, Trash2, Download, ArrowLeft,
  Pencil, Check, X, Loader2,
} from 'lucide-react';
import {
  getResume, saveResume, type ResumeData, type Experience,
  type Education, type SkillGroup, type Project, type Certification,
} from '@/lib/resume-store';
import AppNav from '@/components/app-nav';

/* ─── tiny helpers ───────────────────────────────────────── */
const uid = () => Math.random().toString(36).slice(2, 9);

const fieldStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.1)',
  color: '#e2e8f0',
  borderRadius: '0.5rem',
  padding: '0.5rem 0.75rem',
  fontSize: '0.875rem',
  width: '100%',
  outline: 'none',
};

const labelStyle: React.CSSProperties = {
  fontSize: '0.625rem',
  fontWeight: 700,
  letterSpacing: '0.08em',
  color: 'rgba(255,255,255,0.35)',
  textTransform: 'uppercase',
  marginBottom: '0.25rem',
  display: 'block',
};

const sectionCardStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.07)',
  borderRadius: '1rem',
  overflow: 'hidden',
};

/* ─── Section wrapper ────────────────────────────────────── */
function Section({
  title,
  children,
  defaultOpen = true,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={sectionCardStyle}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 text-left"
      >
        <span className="font-semibold text-white text-sm">{title}</span>
        {open ? (
          <ChevronUp className="w-4 h-4 text-slate-500" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-500" />
        )}
      </button>
      {open && <div className="px-5 pb-5 space-y-4">{children}</div>}
    </div>
  );
}

/* ─── Field row ──────────────────────────────────────────── */
function Field({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={fieldStyle}
        className="focus:ring-1 focus:ring-purple-500/50"
      />
    </div>
  );
}

/* ─── Inline title editor ────────────────────────────────── */
function TitleEditor({ title, onChange }: { title: string; onChange: (v: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(title);
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => { setVal(title); }, [title]);
  useEffect(() => { if (editing) ref.current?.focus(); }, [editing]);

  function commit() {
    onChange(val.trim() || 'Untitled Resume');
    setEditing(false);
  }

  if (editing) {
    return (
      <div className="flex items-center gap-2">
        <input
          ref={ref}
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false); }}
          className="text-white font-bold text-base bg-transparent border-b border-purple-500 outline-none"
        />
        <button onClick={commit} className="text-green-400 hover:text-green-300"><Check className="w-4 h-4" /></button>
        <button onClick={() => setEditing(false)} className="text-slate-500 hover:text-slate-300"><X className="w-4 h-4" /></button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className="flex items-center gap-1.5 text-white font-bold text-base hover:text-purple-300 transition-colors group"
    >
      {title}
      <Pencil className="w-3.5 h-3.5 text-slate-600 group-hover:text-purple-400 transition-colors" />
    </button>
  );
}

/* ─── Live preview HTML ──────────────────────────────────── */
function buildPreviewHtml(r: ResumeData): string {
  const pi = r.personalInfo;
  const contact = [pi.email, pi.phone, pi.location, pi.linkedin, pi.portfolio]
    .filter(Boolean)
    .join(' · ');

  const expHtml = r.experience.map((e) => `
    <div class="entry">
      <div class="entry-header">
        <span class="entry-title">${e.title || ''}</span>
        <span class="entry-dates">${e.startDate || ''}${e.endDate || e.current ? ` – ${e.current ? 'Present' : e.endDate}` : ''}</span>
      </div>
      <div class="entry-sub">${e.company || ''}${e.location ? ` · ${e.location}` : ''}</div>
      <ul>${e.bullets.filter(Boolean).map((b) => `<li>${b}</li>`).join('')}</ul>
    </div>
  `).join('');

  const eduHtml = r.education.map((e) => `
    <div class="entry">
      <div class="entry-header">
        <span class="entry-title">${e.school || ''}</span>
        <span class="entry-dates">${e.startDate || ''}${e.endDate ? ` – ${e.endDate}` : ''}</span>
      </div>
      <div class="entry-sub">${[e.degree, e.field].filter(Boolean).join(', ')}${e.gpa ? ` · GPA ${e.gpa}` : ''}</div>
    </div>
  `).join('');

  const skillsHtml = r.skills.map((s) => `
    <div class="skill-row"><strong>${s.group}:</strong> ${s.skills}</div>
  `).join('');

  const projHtml = r.projects.map((p) => `
    <div class="entry">
      <div class="entry-header">
        <span class="entry-title">${p.name || ''}</span>
        ${p.link ? `<a href="${p.link}" style="font-size:10px;color:#555">${p.link}</a>` : ''}
      </div>
      ${p.technologies ? `<div class="entry-sub">${p.technologies}</div>` : ''}
      ${p.description ? `<p style="margin:4px 0 0;font-size:11px">${p.description}</p>` : ''}
    </div>
  `).join('');

  const certHtml = r.certifications.map((c) => `
    <div class="entry">
      <div class="entry-header">
        <span class="entry-title">${c.name || ''}</span>
        <span class="entry-dates">${c.date || ''}</span>
      </div>
      ${c.issuer ? `<div class="entry-sub">${c.issuer}</div>` : ''}
    </div>
  `).join('');

  return `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Helvetica Neue',Arial,sans-serif;font-size:11px;color:#222;background:#fff;padding:32px 36px;line-height:1.45}
  h1{font-size:22px;font-weight:700;letter-spacing:-0.3px;color:#111;margin-bottom:2px}
  .contact{font-size:10px;color:#555;margin-bottom:14px}
  .section{margin-bottom:14px}
  .section-title{font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#444;border-bottom:1px solid #ddd;padding-bottom:3px;margin-bottom:8px}
  .summary{font-size:11px;color:#333;line-height:1.55}
  .entry{margin-bottom:10px}
  .entry-header{display:flex;justify-content:space-between;align-items:baseline}
  .entry-title{font-weight:700;font-size:11px;color:#111}
  .entry-dates{font-size:10px;color:#777;white-space:nowrap;margin-left:8px}
  .entry-sub{font-size:10.5px;color:#555;margin-top:1px}
  ul{margin:4px 0 0 14px;padding:0}
  li{font-size:10.5px;color:#333;margin-bottom:2px}
  .skill-row{font-size:10.5px;margin-bottom:4px;color:#333}
</style></head><body>
  <h1>${pi.fullName || 'Your Name'}</h1>
  ${contact ? `<div class="contact">${contact}</div>` : ''}
  ${r.summary ? `<div class="section"><div class="section-title">Summary</div><div class="summary">${r.summary}</div></div>` : ''}
  ${r.experience.length ? `<div class="section"><div class="section-title">Experience</div>${expHtml}</div>` : ''}
  ${r.education.length ? `<div class="section"><div class="section-title">Education</div>${eduHtml}</div>` : ''}
  ${r.skills.length ? `<div class="section"><div class="section-title">Skills</div>${skillsHtml}</div>` : ''}
  ${r.projects.length ? `<div class="section"><div class="section-title">Projects</div>${projHtml}</div>` : ''}
  ${r.certifications.length ? `<div class="section"><div class="section-title">Certifications</div>${certHtml}</div>` : ''}
</body></html>`;
}

/* ─── Main editor ────────────────────────────────────────── */
export default function ResumeEditorPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [resume, setResume] = useState<ResumeData | null>(null);
  const [improvingSum, setImprovingSum] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const r = getResume(id);
    if (!r) { router.push('/my-resumes'); return; }
    setResume(r);
  }, [id, router]);

  const update = useCallback((patch: Partial<ResumeData>) => {
    setResume((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...patch };
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => saveResume(next), 600);
      return next;
    });
  }, []);

  const pi = (k: keyof ResumeData['personalInfo'], v: string) =>
    update({ personalInfo: { ...resume!.personalInfo, [k]: v } });

  /* Experience helpers */
  const addExp = () => update({
    experience: [...(resume?.experience ?? []), {
      id: uid(), company: '', title: '', startDate: '', endDate: '',
      current: false, location: '', bullets: [''],
    }],
  });
  const patchExp = (idx: number, patch: Partial<Experience>) => {
    const arr = [...(resume?.experience ?? [])];
    arr[idx] = { ...arr[idx], ...patch };
    update({ experience: arr });
  };
  const removeExp = (idx: number) => {
    const arr = [...(resume?.experience ?? [])];
    arr.splice(idx, 1);
    update({ experience: arr });
  };
  const addBullet = (idx: number) => {
    const arr = [...(resume?.experience ?? [])];
    arr[idx] = { ...arr[idx], bullets: [...arr[idx].bullets, ''] };
    update({ experience: arr });
  };
  const patchBullet = (expIdx: number, bIdx: number, v: string) => {
    const arr = [...(resume?.experience ?? [])];
    const bullets = [...arr[expIdx].bullets];
    bullets[bIdx] = v;
    arr[expIdx] = { ...arr[expIdx], bullets };
    update({ experience: arr });
  };
  const removeBullet = (expIdx: number, bIdx: number) => {
    const arr = [...(resume?.experience ?? [])];
    const bullets = arr[expIdx].bullets.filter((_, i) => i !== bIdx);
    arr[expIdx] = { ...arr[expIdx], bullets };
    update({ experience: arr });
  };

  /* Education helpers */
  const addEdu = () => update({
    education: [...(resume?.education ?? []), {
      id: uid(), school: '', degree: '', field: '', startDate: '', endDate: '', gpa: '',
    }],
  });
  const patchEdu = (idx: number, patch: Partial<Education>) => {
    const arr = [...(resume?.education ?? [])];
    arr[idx] = { ...arr[idx], ...patch };
    update({ education: arr });
  };
  const removeEdu = (idx: number) => {
    const arr = [...(resume?.education ?? [])];
    arr.splice(idx, 1);
    update({ education: arr });
  };

  /* Skills helpers */
  const addSkill = () => update({
    skills: [...(resume?.skills ?? []), { id: uid(), group: '', skills: '' }],
  });
  const patchSkill = (idx: number, patch: Partial<SkillGroup>) => {
    const arr = [...(resume?.skills ?? [])];
    arr[idx] = { ...arr[idx], ...patch };
    update({ skills: arr });
  };
  const removeSkill = (idx: number) => {
    const arr = [...(resume?.skills ?? [])];
    arr.splice(idx, 1);
    update({ skills: arr });
  };

  /* Project helpers */
  const addProject = () => update({
    projects: [...(resume?.projects ?? []), {
      id: uid(), name: '', description: '', link: '', technologies: '',
    }],
  });
  const patchProject = (idx: number, patch: Partial<Project>) => {
    const arr = [...(resume?.projects ?? [])];
    arr[idx] = { ...arr[idx], ...patch };
    update({ projects: arr });
  };
  const removeProject = (idx: number) => {
    const arr = [...(resume?.projects ?? [])];
    arr.splice(idx, 1);
    update({ projects: arr });
  };

  /* Certification helpers */
  const addCert = () => update({
    certifications: [...(resume?.certifications ?? []), {
      id: uid(), name: '', issuer: '', date: '',
    }],
  });
  const patchCert = (idx: number, patch: Partial<Certification>) => {
    const arr = [...(resume?.certifications ?? [])];
    arr[idx] = { ...arr[idx], ...patch };
    update({ certifications: arr });
  };
  const removeCert = (idx: number) => {
    const arr = [...(resume?.certifications ?? [])];
    arr.splice(idx, 1);
    update({ certifications: arr });
  };

  /* AI improve summary */
  async function improveSummary() {
    if (!resume) return;
    setImprovingSum(true);
    try {
      const context = [
        resume.personalInfo.fullName && `Name: ${resume.personalInfo.fullName}`,
        resume.experience[0] && `Recent role: ${resume.experience[0].title} at ${resume.experience[0].company}`,
        resume.summary && `Current summary: ${resume.summary}`,
      ].filter(Boolean).join('\n');

      const res = await fetch('/api/improve-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ context }),
      });
      if (res.ok) {
        const { summary } = await res.json();
        update({ summary });
      }
    } catch {
      // silently fail — user can edit manually
    } finally {
      setImprovingSum(false);
    }
  }

  /* Download as PDF via print */
  function handleDownload() {
    if (!resume) return;
    const html = buildPreviewHtml(resume);
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); }, 500);
  }

  if (!resume) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#07070f' }}>
        <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#07070f' }}>
      <AppNav />

      {/* Sub-header */}
      <div
        className="sticky top-14 z-30 flex items-center justify-between px-4 py-2.5 border-b border-white/[0.06]"
        style={{ background: 'rgba(7,7,15,0.95)', backdropFilter: 'blur(10px)' }}
      >
        <div className="flex items-center gap-2 text-sm">
          <button
            onClick={() => router.push('/my-resumes')}
            className="flex items-center gap-1 text-slate-500 hover:text-slate-300 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Resumes</span>
          </button>
          <span className="text-slate-700">/</span>
          <TitleEditor title={resume.title} onChange={(v) => update({ title: v })} />
        </div>
        <button
          onClick={handleDownload}
          className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-xl text-white transition-all hover:opacity-90"
          style={{ background: 'rgba(124,58,237,0.2)', border: '1px solid rgba(124,58,237,0.35)' }}
        >
          <Download className="w-3.5 h-3.5" />
          Download
        </button>
      </div>

      {/* Split layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* ── Left: Form ── */}
        <div
          className="w-full lg:w-[46%] overflow-y-auto px-4 py-5 space-y-3"
          style={{ maxHeight: 'calc(100vh - 112px)' }}
        >
          {/* Personal Info */}
          <Section title="Personal Info">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Full Name" value={resume.personalInfo.fullName} onChange={(v) => pi('fullName', v)} placeholder="Jane Smith" />
              <Field label="Email" value={resume.personalInfo.email} onChange={(v) => pi('email', v)} placeholder="jane@example.com" type="email" />
              <Field label="Phone" value={resume.personalInfo.phone} onChange={(v) => pi('phone', v)} placeholder="+1 (555) 000-0000" />
              <Field label="Location" value={resume.personalInfo.location} onChange={(v) => pi('location', v)} placeholder="New York, NY" />
              <Field label="LinkedIn" value={resume.personalInfo.linkedin} onChange={(v) => pi('linkedin', v)} placeholder="linkedin.com/in/jane" />
              <Field label="Portfolio / Website" value={resume.personalInfo.portfolio} onChange={(v) => pi('portfolio', v)} placeholder="janesmith.dev" />
            </div>
          </Section>

          {/* Professional Summary */}
          <Section title="Professional Summary">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label style={labelStyle}>Summary</label>
                <button
                  onClick={improveSummary}
                  disabled={improvingSum}
                  className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg transition-all hover:opacity-80 disabled:opacity-50"
                  style={{ background: 'rgba(124,58,237,0.12)', color: '#c4b5fd', border: '1px solid rgba(124,58,237,0.25)' }}
                >
                  {improvingSum ? <Loader2 className="w-3 h-3 animate-spin" /> : <span>✦</span>}
                  Improve
                </button>
              </div>
              <textarea
                value={resume.summary}
                onChange={(e) => update({ summary: e.target.value })}
                placeholder="Results-driven professional with…"
                rows={5}
                style={{ ...fieldStyle, resize: 'vertical' }}
                className="focus:ring-1 focus:ring-purple-500/50"
              />
            </div>
          </Section>

          {/* Experience */}
          <Section title="Experience">
            {resume.experience.map((exp, i) => (
              <div key={exp.id} className="rounded-xl p-4 space-y-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-400">Position {i + 1}</span>
                  <button onClick={() => removeExp(i)} className="text-slate-700 hover:text-red-400 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Job Title" value={exp.title} onChange={(v) => patchExp(i, { title: v })} placeholder="Software Engineer" />
                  <Field label="Company" value={exp.company} onChange={(v) => patchExp(i, { company: v })} placeholder="Acme Corp" />
                  <Field label="Start Date" value={exp.startDate} onChange={(v) => patchExp(i, { startDate: v })} placeholder="Jan 2022" />
                  <Field label="End Date" value={exp.endDate} onChange={(v) => patchExp(i, { endDate: v })} placeholder="Dec 2023" />
                  <div className="col-span-2">
                    <Field label="Location" value={exp.location} onChange={(v) => patchExp(i, { location: v })} placeholder="San Francisco, CA" />
                  </div>
                  <div className="col-span-2 flex items-center gap-2">
                    <input
                      type="checkbox"
                      id={`cur-${exp.id}`}
                      checked={exp.current}
                      onChange={(e) => patchExp(i, { current: e.target.checked })}
                      className="accent-purple-500"
                    />
                    <label htmlFor={`cur-${exp.id}`} className="text-xs text-slate-400">Currently working here</label>
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>Bullet Points</label>
                  <div className="space-y-2">
                    {exp.bullets.map((b, bi) => (
                      <div key={bi} className="flex items-start gap-2">
                        <span className="text-slate-600 mt-2 text-xs">•</span>
                        <input
                          value={b}
                          onChange={(e) => patchBullet(i, bi, e.target.value)}
                          placeholder="Led migration of legacy system…"
                          style={{ ...fieldStyle, flex: 1 }}
                          className="focus:ring-1 focus:ring-purple-500/50"
                        />
                        {exp.bullets.length > 1 && (
                          <button onClick={() => removeBullet(i, bi)} className="text-slate-700 hover:text-red-400 mt-1.5 shrink-0">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  <button onClick={() => addBullet(i)} className="mt-2 text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1 transition-colors">
                    <Plus className="w-3 h-3" /> Add bullet
                  </button>
                </div>
              </div>
            ))}
            <button
              onClick={addExp}
              className="w-full py-2.5 rounded-xl text-sm font-medium text-purple-400 hover:text-purple-300 transition-colors flex items-center justify-center gap-1.5"
              style={{ border: '1.5px dashed rgba(124,58,237,0.3)', background: 'rgba(124,58,237,0.04)' }}
            >
              <Plus className="w-4 h-4" /> Add Experience
            </button>
          </Section>

          {/* Education */}
          <Section title="Education" defaultOpen={false}>
            {resume.education.map((edu, i) => (
              <div key={edu.id} className="rounded-xl p-4 space-y-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-400">Entry {i + 1}</span>
                  <button onClick={() => removeEdu(i)} className="text-slate-700 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2"><Field label="School / University" value={edu.school} onChange={(v) => patchEdu(i, { school: v })} placeholder="MIT" /></div>
                  <Field label="Degree" value={edu.degree} onChange={(v) => patchEdu(i, { degree: v })} placeholder="B.Tech" />
                  <Field label="Field of Study" value={edu.field} onChange={(v) => patchEdu(i, { field: v })} placeholder="Computer Science" />
                  <Field label="Start Date" value={edu.startDate} onChange={(v) => patchEdu(i, { startDate: v })} placeholder="2018" />
                  <Field label="End Date" value={edu.endDate} onChange={(v) => patchEdu(i, { endDate: v })} placeholder="2022" />
                  <div className="col-span-2"><Field label="GPA (optional)" value={edu.gpa} onChange={(v) => patchEdu(i, { gpa: v })} placeholder="3.8 / 4.0" /></div>
                </div>
              </div>
            ))}
            <button onClick={addEdu} className="w-full py-2.5 rounded-xl text-sm font-medium text-purple-400 hover:text-purple-300 transition-colors flex items-center justify-center gap-1.5" style={{ border: '1.5px dashed rgba(124,58,237,0.3)', background: 'rgba(124,58,237,0.04)' }}>
              <Plus className="w-4 h-4" /> Add Education
            </button>
          </Section>

          {/* Skills */}
          <Section title="Skills" defaultOpen={false}>
            {resume.skills.map((s, i) => (
              <div key={s.id} className="flex items-center gap-2">
                <input value={s.group} onChange={(e) => patchSkill(i, { group: e.target.value })} placeholder="Languages" style={{ ...fieldStyle, width: '30%' }} className="focus:ring-1 focus:ring-purple-500/50" />
                <input value={s.skills} onChange={(e) => patchSkill(i, { skills: e.target.value })} placeholder="Python, TypeScript, Go" style={{ ...fieldStyle, flex: 1 }} className="focus:ring-1 focus:ring-purple-500/50" />
                <button onClick={() => removeSkill(i)} className="text-slate-700 hover:text-red-400 shrink-0"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            ))}
            <button onClick={addSkill} className="w-full py-2.5 rounded-xl text-sm font-medium text-purple-400 hover:text-purple-300 transition-colors flex items-center justify-center gap-1.5" style={{ border: '1.5px dashed rgba(124,58,237,0.3)', background: 'rgba(124,58,237,0.04)' }}>
              <Plus className="w-4 h-4" /> Add Skill Group
            </button>
          </Section>

          {/* Projects */}
          <Section title="Projects" defaultOpen={false}>
            {resume.projects.map((p, i) => (
              <div key={p.id} className="rounded-xl p-4 space-y-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-400">Project {i + 1}</span>
                  <button onClick={() => removeProject(i)} className="text-slate-700 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Project Name" value={p.name} onChange={(v) => patchProject(i, { name: v })} placeholder="My App" />
                  <Field label="Link (optional)" value={p.link} onChange={(v) => patchProject(i, { link: v })} placeholder="github.com/…" />
                  <div className="col-span-2"><Field label="Technologies" value={p.technologies} onChange={(v) => patchProject(i, { technologies: v })} placeholder="React, Node.js, PostgreSQL" /></div>
                </div>
                <div>
                  <label style={labelStyle}>Description</label>
                  <textarea value={p.description} onChange={(e) => patchProject(i, { description: e.target.value })} placeholder="Built a platform that…" rows={3} style={{ ...fieldStyle, resize: 'vertical' }} className="focus:ring-1 focus:ring-purple-500/50" />
                </div>
              </div>
            ))}
            <button onClick={addProject} className="w-full py-2.5 rounded-xl text-sm font-medium text-purple-400 hover:text-purple-300 transition-colors flex items-center justify-center gap-1.5" style={{ border: '1.5px dashed rgba(124,58,237,0.3)', background: 'rgba(124,58,237,0.04)' }}>
              <Plus className="w-4 h-4" /> Add Project
            </button>
          </Section>

          {/* Certifications */}
          <Section title="Certifications" defaultOpen={false}>
            {resume.certifications.map((c, i) => (
              <div key={c.id} className="flex items-center gap-2">
                <input value={c.name} onChange={(e) => patchCert(i, { name: e.target.value })} placeholder="AWS Solutions Architect" style={{ ...fieldStyle, flex: 2 }} className="focus:ring-1 focus:ring-purple-500/50" />
                <input value={c.issuer} onChange={(e) => patchCert(i, { issuer: e.target.value })} placeholder="Amazon" style={{ ...fieldStyle, flex: 1 }} className="focus:ring-1 focus:ring-purple-500/50" />
                <input value={c.date} onChange={(e) => patchCert(i, { date: e.target.value })} placeholder="2024" style={{ ...fieldStyle, width: '70px', flexShrink: 0 }} className="focus:ring-1 focus:ring-purple-500/50" />
                <button onClick={() => removeCert(i)} className="text-slate-700 hover:text-red-400 shrink-0"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            ))}
            <button onClick={addCert} className="w-full py-2.5 rounded-xl text-sm font-medium text-purple-400 hover:text-purple-300 transition-colors flex items-center justify-center gap-1.5" style={{ border: '1.5px dashed rgba(124,58,237,0.3)', background: 'rgba(124,58,237,0.04)' }}>
              <Plus className="w-4 h-4" /> Add Certification
            </button>
          </Section>

          <div className="h-4" />
        </div>

        {/* ── Right: Live Preview ── */}
        <div
          className="hidden lg:flex flex-1 overflow-hidden"
          style={{ background: '#e5e7eb', borderLeft: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div className="flex-1 overflow-y-auto p-6 flex justify-center">
            <iframe
              key={JSON.stringify(resume)}
              srcDoc={buildPreviewHtml(resume)}
              title="Resume Preview"
              className="w-full rounded-lg shadow-2xl"
              style={{
                background: '#fff',
                maxWidth: '680px',
                minHeight: '900px',
                border: 'none',
              }}
            />
          </div>
        </div>
      </div>

      {/* Upgrade nudge */}
      <div
        className="fixed bottom-0 left-0 right-0 flex items-center justify-center py-3 px-4 text-sm text-center"
        style={{ background: 'rgba(7,7,15,0.95)', borderTop: '1px solid rgba(255,255,255,0.06)', backdropFilter: 'blur(10px)' }}
      >
        <span className="mr-1">✨</span>
        Upgrade to{' '}
        <a href="/pricing" className="font-bold gradient-text mx-1">Pro or Power</a>
        {' '}to unlock AI bullet improvements &amp; generation
      </div>
    </div>
  );
}
