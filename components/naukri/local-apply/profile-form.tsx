'use client';

/**
 * The applicant details every application is filled from.
 *
 * Prefilled only from what the resume analysis actually found; everything else
 * starts blank and the server refuses to run without the fields employers
 * receive as the candidate's own answers (identity, location, expected CTC,
 * notice period). Edits are remembered on this PC so they are typed once.
 */
import type { CandidateProfile } from '@/lib/naukri/types';
import { extractContactInfo } from '@/lib/naukri/resume-analyzer';

export const NOTICE_PERIODS = ['Immediate', '15 Days', '30 Days', '60 Days', '90 Days'] as const;
const STORAGE_KEY = 'hirewin:apply-profile:v1';

type TriState = '' | 'yes' | 'no';

export interface ProfileDraft {
  fullName: string;
  email: string;
  phone: string;
  currentLocation: string;
  totalExperienceYears: string;
  noticePeriod: string;
  currentCtcLpa: string;
  expectedCtcLpa: string;
  highestDegree: string;
  specialization: string;
  collegeName: string;
  graduationYear: string;
  skills: string;
  preferredLocations: string;
  willingToRelocate: TriState;
  linkedinUrl: string;
  githubUrl: string;
  portfolioUrl: string;
  authorizedToWorkIn: string;
  requiresSponsorship: TriState;
  resumePdfPath: string;
}

function exactNotice(value?: string): string {
  if (!value) return '';
  const match = NOTICE_PERIODS.find((p) => p.toLowerCase() === value.trim().toLowerCase());
  return match ?? '';
}

export function draftFromProfile(profile: CandidateProfile | null, resumeText: string): ProfileDraft {
  const contact = resumeText ? extractContactInfo(resumeText) : {};
  return {
    fullName: profile?.name || contact.name || '',
    email: profile?.email || contact.email || '',
    phone: profile?.phone || contact.phone || '',
    currentLocation: profile?.preferredLocations?.[0] ?? '',
    totalExperienceYears: profile ? String(profile.totalYearsExperience ?? '') : '',
    noticePeriod: exactNotice(profile?.currentNoticePeriod),
    currentCtcLpa: '',
    expectedCtcLpa: profile?.expectedCtcLpa ? String(profile.expectedCtcLpa) : '',
    highestDegree: profile?.degree ?? '',
    specialization: profile?.fieldOfStudy ?? '',
    collegeName: '',
    graduationYear: profile?.graduationYear ? String(profile.graduationYear) : '',
    skills: (profile?.coreSkills ?? []).join(', '),
    preferredLocations: (profile?.preferredLocations ?? []).join(', '),
    willingToRelocate: '',
    linkedinUrl: '',
    githubUrl: '',
    portfolioUrl: '',
    authorizedToWorkIn: '',
    requiresSponsorship: '',
    resumePdfPath: '',
  };
}

/** Saved edits win over extraction, field by field, but only when non-empty. */
export function withSavedDraft(draft: ProfileDraft): ProfileDraft {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') as Partial<ProfileDraft> | null;
    if (!saved) return draft;
    const merged = { ...draft };
    for (const key of Object.keys(draft) as Array<keyof ProfileDraft>) {
      const value = saved[key];
      if (typeof value === 'string' && value.trim() !== '') {
        (merged as Record<keyof ProfileDraft, string>)[key] = value;
      }
    }
    return merged;
  } catch {
    return draft;
  }
}

export function saveDraft(draft: ProfileDraft): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
  } catch {
    // Storage full or blocked: the form still works, it just is not remembered.
  }
}

const list = (s: string) => s.split(',').map((x) => x.trim()).filter(Boolean);
const tri = (v: TriState) => (v === '' ? undefined : v === 'yes');

export function draftToPayload(d: ProfileDraft, resumeText: string): Record<string, unknown> {
  return {
    fullName: d.fullName,
    email: d.email,
    phone: d.phone,
    currentLocation: d.currentLocation,
    totalExperienceYears: Number(d.totalExperienceYears),
    noticePeriod: d.noticePeriod,
    currentCtcLpa: Number(d.currentCtcLpa || 0),
    expectedCtcLpa: Number(d.expectedCtcLpa),
    highestDegree: d.highestDegree,
    specialization: d.specialization,
    collegeName: d.collegeName,
    graduationYear: Number(d.graduationYear || 0),
    skills: list(d.skills),
    resumeText,
    preferredLocations: list(d.preferredLocations),
    willingToRelocate: tri(d.willingToRelocate),
    linkedinUrl: d.linkedinUrl,
    githubUrl: d.githubUrl,
    portfolioUrl: d.portfolioUrl,
    authorizedToWorkIn: list(d.authorizedToWorkIn),
    requiresSponsorship: tri(d.requiresSponsorship),
    resumePdfPath: d.resumePdfPath,
  };
}

/** The same required fields the server enforces, checked before a round trip. */
export function draftProblems(d: ProfileDraft): string[] {
  const problems: string[] = [];
  if (d.fullName.trim().length < 2) problems.push('Full name');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email)) problems.push('Email');
  if (!/^\+?[0-9]{10,14}$/.test(d.phone.replace(/[\s-]/g, ''))) problems.push('Mobile number');
  if (!d.currentLocation.trim()) problems.push('Current location');
  if (d.totalExperienceYears === '' || !(Number(d.totalExperienceYears) >= 0)) problems.push('Total experience');
  if (!d.noticePeriod) problems.push('Notice period');
  if (!(Number(d.expectedCtcLpa) > 0)) problems.push('Expected CTC');
  return problems;
}

interface FieldSpec {
  key: keyof ProfileDraft;
  label: string;
  type?: 'text' | 'email' | 'tel' | 'number' | 'url';
  placeholder?: string;
  required?: boolean;
  wide?: boolean;
}

const FIELDS: FieldSpec[] = [
  { key: 'fullName', label: 'Full name', required: true },
  { key: 'email', label: 'Email', type: 'email', required: true },
  { key: 'phone', label: 'Mobile', type: 'tel', placeholder: '10-digit number', required: true },
  { key: 'currentLocation', label: 'Current location', placeholder: 'City', required: true },
  { key: 'totalExperienceYears', label: 'Total experience (years)', type: 'number', placeholder: '0 for fresher', required: true },
  { key: 'currentCtcLpa', label: 'Current CTC (LPA)', type: 'number', placeholder: '0 if none' },
  { key: 'expectedCtcLpa', label: 'Expected CTC (LPA)', type: 'number', placeholder: 'Required', required: true },
  { key: 'highestDegree', label: 'Highest degree', placeholder: 'e.g. B.Tech' },
  { key: 'specialization', label: 'Specialization' },
  { key: 'collegeName', label: 'College' },
  { key: 'graduationYear', label: 'Graduation year', type: 'number' },
  { key: 'preferredLocations', label: 'Preferred locations', placeholder: 'Comma separated' },
  { key: 'authorizedToWorkIn', label: 'Authorized to work in', placeholder: 'e.g. India' },
  { key: 'linkedinUrl', label: 'LinkedIn URL', type: 'url' },
  { key: 'githubUrl', label: 'GitHub URL', type: 'url' },
  { key: 'portfolioUrl', label: 'Portfolio URL', type: 'url' },
  { key: 'skills', label: 'Skills', placeholder: 'Comma separated', wide: true },
  { key: 'resumePdfPath', label: 'Resume PDF path on this PC', placeholder: 'C:\\Users\\you\\resume.pdf — used by company career sites', wide: true },
];

const inputClass =
  'w-full px-2.5 py-1.5 text-xs rounded-lg border outline-none transition-colors focus:border-[var(--accent)]';
const inputStyle = { background: 'var(--ground)', borderColor: 'var(--edge)', color: 'var(--fg)' } as const;

export function ProfileForm({ draft, onChange }: { draft: ProfileDraft; onChange: (next: ProfileDraft) => void }) {
  const set = (key: keyof ProfileDraft, value: string) => onChange({ ...draft, [key]: value });

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {FIELDS.map((f) => (
        <div key={f.key} className={`space-y-1 ${f.wide ? 'sm:col-span-2' : ''}`}>
          <label htmlFor={`la-${f.key}`} className="text-[11px] font-medium" style={{ color: 'var(--dim)' }}>
            {f.label}
            {f.required && <span style={{ color: 'var(--warn)' }}> *</span>}
          </label>
          <input
            id={`la-${f.key}`}
            type={f.type ?? 'text'}
            inputMode={f.type === 'number' ? 'decimal' : undefined}
            step={f.type === 'number' ? 'any' : undefined}
            min={f.type === 'number' ? 0 : undefined}
            value={draft[f.key]}
            placeholder={f.placeholder}
            onChange={(e) => set(f.key, e.target.value)}
            className={`${inputClass} ${f.type === 'number' ? 'font-data tabular-nums' : ''}`}
            style={inputStyle}
          />
        </div>
      ))}

      <div className="space-y-1">
        <label htmlFor="la-noticePeriod" className="text-[11px] font-medium" style={{ color: 'var(--dim)' }}>
          Notice period<span style={{ color: 'var(--warn)' }}> *</span>
        </label>
        <select
          id="la-noticePeriod"
          value={draft.noticePeriod}
          onChange={(e) => set('noticePeriod', e.target.value)}
          className={inputClass}
          style={inputStyle}
        >
          <option value="">Select…</option>
          {NOTICE_PERIODS.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </div>

      {(
        [
          ['willingToRelocate', 'Willing to relocate'],
          ['requiresSponsorship', 'Needs visa sponsorship'],
        ] as const
      ).map(([key, label]) => (
        <div key={key} className="space-y-1">
          <label htmlFor={`la-${key}`} className="text-[11px] font-medium" style={{ color: 'var(--dim)' }}>
            {label}
          </label>
          <select
            id={`la-${key}`}
            value={draft[key]}
            onChange={(e) => set(key, e.target.value)}
            className={inputClass}
            style={inputStyle}
          >
            <option value="">Not stated</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
        </div>
      ))}
    </div>
  );
}
