'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import {
  User, Mail, Phone, MapPin, Globe, Linkedin, Github,
  Briefcase, GraduationCap, Wrench, FolderGit2, Award, Heart,
  Plus, Trash2, ArrowRight, ArrowLeft, FileText, Sparkles, Check,
} from 'lucide-react';
import AppNav from '@/components/app-nav';
import type { TemplateName } from '@/components/template-selector';

const ResumePreview = dynamic(() => import('@/components/resume-preview'), { ssr: false });
const TemplateSelector = dynamic(() => import('@/components/template-selector'), { ssr: false });

type Experience = { id: string; role: string; company: string; period: string; bullets: string };
type Education = { id: string; degree: string; school: string; period: string; details: string };
type Project = { id: string; name: string; tech: string; bullets: string };

type ResumeData = {
  name: string;
  title: string;
  email: string;
  phone: string;
  location: string;
  linkedin: string;
  github: string;
  website: string;
  summary: string;
  experience: Experience[];
  education: Education[];
  skills: string;
  projects: Project[];
  certifications: string;
  awards: string;
  languages: string;
  interests: string;
};

const initialData: ResumeData = {
  name: '',
  title: '',
  email: '',
  phone: '',
  location: '',
  linkedin: '',
  github: '',
  website: '',
  summary: '',
  experience: [],
  education: [],
  skills: '',
  projects: [],
  certifications: '',
  awards: '',
  languages: '',
  interests: '',
};

type Step = {
  key: string;
  title: string;
  icon: React.ReactNode;
};

const STEPS: Step[] = [
  { key: 'header', title: 'Contact', icon: <User className="w-4 h-4" /> },
  { key: 'summary', title: 'Summary', icon: <Sparkles className="w-4 h-4" /> },
  { key: 'experience', title: 'Experience', icon: <Briefcase className="w-4 h-4" /> },
  { key: 'education', title: 'Education', icon: <GraduationCap className="w-4 h-4" /> },
  { key: 'skills', title: 'Skills', icon: <Wrench className="w-4 h-4" /> },
  { key: 'projects', title: 'Projects', icon: <FolderGit2 className="w-4 h-4" /> },
  { key: 'extras', title: 'Extras', icon: <Award className="w-4 h-4" /> },
  { key: 'finish', title: 'Preview', icon: <FileText className="w-4 h-4" /> },
];

const inputStyle = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.1)',
  color: '#e2e8f0',
};
const cardStyle = { background: '#0f1629', border: '1px solid rgba(255,255,255,0.07)' };

function buildResumeText(d: ResumeData): string {
  const lines: string[] = [];

  if (d.name) lines.push(d.name);
  if (d.title) lines.push(d.title);

  const contact = [d.email, d.phone, d.location, d.linkedin, d.github, d.website]
    .filter(Boolean)
    .join(' | ');
  if (contact) lines.push(contact);

  if (d.summary.trim()) {
    lines.push('', 'PROFESSIONAL SUMMARY', d.summary.trim());
  }

  if (d.experience.length > 0) {
    lines.push('', 'EXPERIENCE');
    d.experience.forEach((e) => {
      const head = [e.role, e.company, e.period].filter(Boolean).join(' | ');
      if (head) lines.push(head);
      if (e.bullets.trim()) lines.push(e.bullets.trim());
      lines.push('');
    });
    if (lines[lines.length - 1] === '') lines.pop();
  }

  if (d.education.length > 0) {
    lines.push('', 'EDUCATION');
    d.education.forEach((ed) => {
      const head = [ed.degree, ed.school, ed.period].filter(Boolean).join(' | ');
      if (head) lines.push(head);
      if (ed.details.trim()) lines.push(ed.details.trim());
      lines.push('');
    });
    if (lines[lines.length - 1] === '') lines.pop();
  }

  if (d.skills.trim()) {
    lines.push('', 'TECHNICAL SKILLS', d.skills.trim());
  }

  if (d.projects.length > 0) {
    lines.push('', 'PROJECTS');
    d.projects.forEach((p) => {
      const head = [p.name, p.tech].filter(Boolean).join(' | ');
      if (head) lines.push(head);
      if (p.bullets.trim()) lines.push(p.bullets.trim());
      lines.push('');
    });
    if (lines[lines.length - 1] === '') lines.pop();
  }

  if (d.certifications.trim()) {
    lines.push('', 'CERTIFICATIONS', d.certifications.trim());
  }
  if (d.awards.trim()) {
    lines.push('', 'AWARDS & ACHIEVEMENTS', d.awards.trim());
  }
  if (d.languages.trim()) {
    lines.push('', 'LANGUAGES', d.languages.trim());
  }
  if (d.interests.trim()) {
    lines.push('', 'INTERESTS', d.interests.trim());
  }

  return lines.join('\n');
}

const newId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

export default function BuilderPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [data, setData] = useState<ResumeData>(initialData);
  const [template, setTemplate] = useState<TemplateName>('classic');

  const resumeText = useMemo(() => buildResumeText(data), [data]);

  const update = <K extends keyof ResumeData>(key: K, value: ResumeData[K]) =>
    setData((d) => ({ ...d, [key]: value }));

  const addExperience = () =>
    update('experience', [
      ...data.experience,
      { id: newId(), role: '', company: '', period: '', bullets: '' },
    ]);
  const updateExperience = (id: string, patch: Partial<Experience>) =>
    update(
      'experience',
      data.experience.map((e) => (e.id === id ? { ...e, ...patch } : e))
    );
  const removeExperience = (id: string) =>
    update('experience', data.experience.filter((e) => e.id !== id));

  const addEducation = () =>
    update('education', [
      ...data.education,
      { id: newId(), degree: '', school: '', period: '', details: '' },
    ]);
  const updateEducation = (id: string, patch: Partial<Education>) =>
    update(
      'education',
      data.education.map((e) => (e.id === id ? { ...e, ...patch } : e))
    );
  const removeEducation = (id: string) =>
    update('education', data.education.filter((e) => e.id !== id));

  const addProject = () =>
    update('projects', [
      ...data.projects,
      { id: newId(), name: '', tech: '', bullets: '' },
    ]);
  const updateProject = (id: string, patch: Partial<Project>) =>
    update(
      'projects',
      data.projects.map((p) => (p.id === id ? { ...p, ...patch } : p))
    );
  const removeProject = (id: string) =>
    update('projects', data.projects.filter((p) => p.id !== id));

  const next = () => setStep((s) => Math.min(s + 1, STEPS.length - 1));
  const prev = () => setStep((s) => Math.max(s - 1, 0));

  function handleAnalyze() {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('hirewin:builder-resume', resumeText);
    }
    router.push('/analyze');
  }

  function handleDownload() {
    const blob = new Blob([resumeText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${data.name?.trim().replace(/\s+/g, '-').toLowerCase() || 'resume'}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const currentStep = STEPS[step];

  return (
    <div className="min-h-screen" style={{ background: '#080d1a' }}>
      <AppNav />

      <div className="max-w-6xl mx-auto px-4 py-6 sm:py-10">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight mb-2">
            Build Your Resume <span className="gradient-text">From Scratch</span>
          </h1>
          <p className="text-slate-400 text-sm sm:text-base">
            Fill in each section. We&apos;ll format it cleanly — no design skills needed.
          </p>
        </div>

        {/* Progress steps */}
        <div className="rounded-2xl p-3 sm:p-4 mb-4" style={cardStyle}>
          <div className="overflow-x-auto scrollbar-none -mx-1 px-1">
            <div className="flex items-center gap-1.5 min-w-max">
              {STEPS.map((s, i) => {
                const active = i === step;
                const done = i < step;
                return (
                  <button
                    key={s.key}
                    onClick={() => setStep(i)}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap"
                    style={
                      active
                        ? { background: 'linear-gradient(135deg, #7c3aed, #3b82f6)', color: '#fff' }
                        : done
                        ? { background: 'rgba(16,185,129,0.1)', color: '#6ee7b7', border: '1px solid rgba(16,185,129,0.25)' }
                        : { background: 'rgba(255,255,255,0.03)', color: '#94a3b8' }
                    }
                  >
                    {done ? <Check className="w-3.5 h-3.5" /> : s.icon}
                    {s.title}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Form */}
          <div className="rounded-2xl p-5 sm:p-6 animate-in" style={cardStyle}>
            <div className="flex items-center gap-2 mb-5">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: 'rgba(124,58,237,0.15)', color: '#c4b5fd' }}
              >
                {currentStep.icon}
              </div>
              <div>
                <h2 className="font-semibold text-white">{currentStep.title}</h2>
                <p className="text-xs text-slate-500">
                  Step {step + 1} of {STEPS.length}
                </p>
              </div>
            </div>

            {currentStep.key === 'header' && (
              <div className="space-y-3">
                <Field label="Full name" icon={<User className="w-3.5 h-3.5" />}>
                  <input
                    value={data.name}
                    onChange={(e) => update('name', e.target.value)}
                    placeholder="Jane Doe"
                    className="w-full px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-purple-500/50 placeholder-slate-600"
                    style={inputStyle}
                  />
                </Field>
                <Field label="Job title (optional)">
                  <input
                    value={data.title}
                    onChange={(e) => update('title', e.target.value)}
                    placeholder="Senior Software Engineer"
                    className="w-full px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-purple-500/50 placeholder-slate-600"
                    style={inputStyle}
                  />
                </Field>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Email" icon={<Mail className="w-3.5 h-3.5" />}>
                    <input
                      type="email"
                      value={data.email}
                      onChange={(e) => update('email', e.target.value)}
                      placeholder="jane@example.com"
                      className="w-full px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-purple-500/50 placeholder-slate-600"
                      style={inputStyle}
                    />
                  </Field>
                  <Field label="Phone" icon={<Phone className="w-3.5 h-3.5" />}>
                    <input
                      value={data.phone}
                      onChange={(e) => update('phone', e.target.value)}
                      placeholder="+1 (555) 123-4567"
                      className="w-full px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-purple-500/50 placeholder-slate-600"
                      style={inputStyle}
                    />
                  </Field>
                </div>
                <Field label="Location" icon={<MapPin className="w-3.5 h-3.5" />}>
                  <input
                    value={data.location}
                    onChange={(e) => update('location', e.target.value)}
                    placeholder="San Francisco, CA"
                    className="w-full px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-purple-500/50 placeholder-slate-600"
                    style={inputStyle}
                  />
                </Field>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Field label="LinkedIn" icon={<Linkedin className="w-3.5 h-3.5" />}>
                    <input
                      value={data.linkedin}
                      onChange={(e) => update('linkedin', e.target.value)}
                      placeholder="linkedin.com/in/jane"
                      className="w-full px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-purple-500/50 placeholder-slate-600"
                      style={inputStyle}
                    />
                  </Field>
                  <Field label="GitHub" icon={<Github className="w-3.5 h-3.5" />}>
                    <input
                      value={data.github}
                      onChange={(e) => update('github', e.target.value)}
                      placeholder="github.com/jane"
                      className="w-full px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-purple-500/50 placeholder-slate-600"
                      style={inputStyle}
                    />
                  </Field>
                  <Field label="Website" icon={<Globe className="w-3.5 h-3.5" />}>
                    <input
                      value={data.website}
                      onChange={(e) => update('website', e.target.value)}
                      placeholder="janedoe.com"
                      className="w-full px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-purple-500/50 placeholder-slate-600"
                      style={inputStyle}
                    />
                  </Field>
                </div>
              </div>
            )}

            {currentStep.key === 'summary' && (
              <Field
                label="Professional summary"
                hint="2–4 sentences. Who you are, what you do, your impact."
              >
                <textarea
                  value={data.summary}
                  onChange={(e) => update('summary', e.target.value)}
                  placeholder="Software engineer with 5+ years building scalable web platforms. Led the redesign of a checkout flow that lifted conversion by 18%. Strong in React, TypeScript, and distributed systems."
                  className="w-full h-40 rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-purple-500/50 placeholder-slate-600"
                  style={inputStyle}
                />
              </Field>
            )}

            {currentStep.key === 'experience' && (
              <div className="space-y-4">
                {data.experience.map((exp, i) => (
                  <RepeatableCard
                    key={exp.id}
                    title={`Position ${i + 1}`}
                    onRemove={() => removeExperience(exp.id)}
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Field label="Role">
                        <input
                          value={exp.role}
                          onChange={(e) => updateExperience(exp.id, { role: e.target.value })}
                          placeholder="Senior Software Engineer"
                          className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-purple-500/50 placeholder-slate-600"
                          style={inputStyle}
                        />
                      </Field>
                      <Field label="Company">
                        <input
                          value={exp.company}
                          onChange={(e) => updateExperience(exp.id, { company: e.target.value })}
                          placeholder="Acme Corp"
                          className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-purple-500/50 placeholder-slate-600"
                          style={inputStyle}
                        />
                      </Field>
                    </div>
                    <Field label="Period">
                      <input
                        value={exp.period}
                        onChange={(e) => updateExperience(exp.id, { period: e.target.value })}
                        placeholder="Jan 2022 – Present"
                        className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-purple-500/50 placeholder-slate-600"
                        style={inputStyle}
                      />
                    </Field>
                    <Field label="Highlights" hint="One bullet per line. Start with action verbs.">
                      <textarea
                        value={exp.bullets}
                        onChange={(e) => updateExperience(exp.id, { bullets: e.target.value })}
                        placeholder="• Led migration to TypeScript across 40+ services\n• Mentored 4 junior engineers\n• Cut p95 latency by 35%"
                        className="w-full h-28 rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-purple-500/50 placeholder-slate-600"
                        style={inputStyle}
                      />
                    </Field>
                  </RepeatableCard>
                ))}
                <AddButton label="Add position" onClick={addExperience} />
              </div>
            )}

            {currentStep.key === 'education' && (
              <div className="space-y-4">
                {data.education.map((ed, i) => (
                  <RepeatableCard
                    key={ed.id}
                    title={`Education ${i + 1}`}
                    onRemove={() => removeEducation(ed.id)}
                  >
                    <Field label="Degree">
                      <input
                        value={ed.degree}
                        onChange={(e) => updateEducation(ed.id, { degree: e.target.value })}
                        placeholder="B.S. Computer Science"
                        className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-purple-500/50 placeholder-slate-600"
                        style={inputStyle}
                      />
                    </Field>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Field label="School">
                        <input
                          value={ed.school}
                          onChange={(e) => updateEducation(ed.id, { school: e.target.value })}
                          placeholder="Stanford University"
                          className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-purple-500/50 placeholder-slate-600"
                          style={inputStyle}
                        />
                      </Field>
                      <Field label="Period">
                        <input
                          value={ed.period}
                          onChange={(e) => updateEducation(ed.id, { period: e.target.value })}
                          placeholder="2018 – 2022"
                          className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-purple-500/50 placeholder-slate-600"
                          style={inputStyle}
                        />
                      </Field>
                    </div>
                    <Field label="Details (optional)" hint="GPA, honors, relevant coursework.">
                      <textarea
                        value={ed.details}
                        onChange={(e) => updateEducation(ed.id, { details: e.target.value })}
                        placeholder="GPA: 3.8/4.0 · Dean's List · Coursework: Algorithms, ML"
                        className="w-full h-20 rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-purple-500/50 placeholder-slate-600"
                        style={inputStyle}
                      />
                    </Field>
                  </RepeatableCard>
                ))}
                <AddButton label="Add education" onClick={addEducation} />
              </div>
            )}

            {currentStep.key === 'skills' && (
              <Field
                label="Skills"
                hint="Group by category, e.g. Languages: ... | Frameworks: ... | Tools: ..."
              >
                <textarea
                  value={data.skills}
                  onChange={(e) => update('skills', e.target.value)}
                  placeholder={
                    'Languages: Python, JavaScript, SQL\nFrameworks: React, Node.js, FastAPI\nTools: Git, Docker, AWS, PostgreSQL'
                  }
                  className="w-full h-40 rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-purple-500/50 placeholder-slate-600"
                  style={inputStyle}
                />
              </Field>
            )}

            {currentStep.key === 'projects' && (
              <div className="space-y-4">
                {data.projects.map((p, i) => (
                  <RepeatableCard
                    key={p.id}
                    title={`Project ${i + 1}`}
                    onRemove={() => removeProject(p.id)}
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Field label="Name">
                        <input
                          value={p.name}
                          onChange={(e) => updateProject(p.id, { name: e.target.value })}
                          placeholder="My Cool App"
                          className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-purple-500/50 placeholder-slate-600"
                          style={inputStyle}
                        />
                      </Field>
                      <Field label="Tech stack">
                        <input
                          value={p.tech}
                          onChange={(e) => updateProject(p.id, { tech: e.target.value })}
                          placeholder="Next.js, Postgres, Vercel"
                          className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-purple-500/50 placeholder-slate-600"
                          style={inputStyle}
                        />
                      </Field>
                    </div>
                    <Field label="Highlights">
                      <textarea
                        value={p.bullets}
                        onChange={(e) => updateProject(p.id, { bullets: e.target.value })}
                        placeholder="• What you built and the impact\n• Link: github.com/your-repo"
                        className="w-full h-24 rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-purple-500/50 placeholder-slate-600"
                        style={inputStyle}
                      />
                    </Field>
                  </RepeatableCard>
                ))}
                <AddButton label="Add project" onClick={addProject} />
              </div>
            )}

            {currentStep.key === 'extras' && (
              <div className="space-y-3">
                <Field label="Certifications" icon={<Award className="w-3.5 h-3.5" />}>
                  <textarea
                    value={data.certifications}
                    onChange={(e) => update('certifications', e.target.value)}
                    placeholder="• AWS Certified Solutions Architect — Amazon, 2024"
                    className="w-full h-20 rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-purple-500/50 placeholder-slate-600"
                    style={inputStyle}
                  />
                </Field>
                <Field label="Awards & achievements">
                  <textarea
                    value={data.awards}
                    onChange={(e) => update('awards', e.target.value)}
                    placeholder="• Award name — Org, Year"
                    className="w-full h-20 rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-purple-500/50 placeholder-slate-600"
                    style={inputStyle}
                  />
                </Field>
                <Field label="Languages">
                  <input
                    value={data.languages}
                    onChange={(e) => update('languages', e.target.value)}
                    placeholder="English (Native) · Hindi (Fluent) · Spanish (Conversational)"
                    className="w-full px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-purple-500/50 placeholder-slate-600"
                    style={inputStyle}
                  />
                </Field>
                <Field label="Interests" icon={<Heart className="w-3.5 h-3.5" />}>
                  <input
                    value={data.interests}
                    onChange={(e) => update('interests', e.target.value)}
                    placeholder="Photography · Long-distance running · Open-source"
                    className="w-full px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-purple-500/50 placeholder-slate-600"
                    style={inputStyle}
                  />
                </Field>
              </div>
            )}

            {currentStep.key === 'finish' && (
              <div className="space-y-4">
                <div
                  className="rounded-xl p-4 flex items-start gap-3"
                  style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)' }}
                >
                  <Check className="w-5 h-5 text-emerald-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-emerald-300">Your resume is ready!</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Pick a template on the right, then send it to the analyzer to get an ATS score and tailored
                      improvements — or download the plain text.
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleAnalyze}
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-white font-bold text-base transition-all hover:opacity-90 active:scale-[0.99]"
                  style={{ background: 'linear-gradient(135deg, #7c3aed, #3b82f6)' }}
                >
                  <Sparkles className="w-4 h-4" />
                  Optimize for a Job →
                </button>

                <button
                  onClick={handleDownload}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-slate-300 hover:text-white transition-all"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  <FileText className="w-4 h-4" />
                  Download as plain text
                </button>
              </div>
            )}

            {/* Nav */}
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-white/5">
              <button
                onClick={prev}
                disabled={step === 0}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-white/5 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
              {step < STEPS.length - 1 && (
                <button
                  onClick={next}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all hover:opacity-90"
                  style={{ background: 'linear-gradient(135deg, #7c3aed, #3b82f6)' }}
                >
                  Next
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Live Preview */}
          <div className="space-y-4 lg:sticky lg:top-4 lg:self-start">
            <TemplateSelector selected={template} onSelect={setTemplate} />
            <div className="rounded-2xl p-5" style={cardStyle}>
              <ResumePreview
                resumeText={resumeText.trim() || '(Start filling in the form to see your resume here)'}
                template={template}
                label="Live preview"
                badge={
                  <span
                    className="text-xs font-medium px-2 py-0.5 rounded-md"
                    style={{
                      background: 'rgba(124,58,237,0.12)',
                      color: '#c4b5fd',
                      border: '1px solid rgba(124,58,237,0.25)',
                    }}
                  >
                    {template.charAt(0).toUpperCase() + template.slice(1)}
                  </span>
                }
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── UI helpers ────────────────────────────── */
function Field({
  label,
  icon,
  hint,
  children,
}: {
  label: string;
  icon?: React.ReactNode;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1.5">
        {icon && <span className="text-slate-500">{icon}</span>}
        <label className="text-xs font-semibold text-slate-300">{label}</label>
      </div>
      {children}
      {hint && <p className="text-[11px] text-slate-600 mt-1">{hint}</p>}
    </div>
  );
}

function RepeatableCard({
  title,
  onRemove,
  children,
}: {
  title: string;
  onRemove: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="rounded-xl p-4 space-y-3 animate-in"
      style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)' }}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-purple-300">{title}</span>
        <button
          onClick={onRemove}
          className="p-1.5 rounded-md text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
          title="Remove"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
      {children}
    </div>
  );
}

function AddButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium text-slate-500 hover:text-purple-400 transition-all border border-dashed border-white/10 hover:border-purple-500/30"
    >
      <Plus className="w-4 h-4" />
      {label}
    </button>
  );
}
