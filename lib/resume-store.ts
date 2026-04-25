import { v4 as uuid } from 'uuid';

export type PersonalInfo = {
  fullName: string;
  email: string;
  phone: string;
  location: string;
  linkedin: string;
  portfolio: string;
};

export type Experience = {
  id: string;
  company: string;
  title: string;
  startDate: string;
  endDate: string;
  current: boolean;
  location: string;
  bullets: string[];
};

export type Education = {
  id: string;
  school: string;
  degree: string;
  field: string;
  startDate: string;
  endDate: string;
  gpa: string;
};

export type SkillGroup = {
  id: string;
  group: string;
  skills: string;
};

export type Project = {
  id: string;
  name: string;
  description: string;
  link: string;
  technologies: string;
};

export type Certification = {
  id: string;
  name: string;
  issuer: string;
  date: string;
};

export type ResumeData = {
  id: string;
  title: string;
  updatedAt: string;
  personalInfo: PersonalInfo;
  summary: string;
  experience: Experience[];
  education: Education[];
  skills: SkillGroup[];
  projects: Project[];
  certifications: Certification[];
};

const STORAGE_KEY = 'hirewin_resumes';

export function emptyResume(overrides: Partial<ResumeData> = {}): ResumeData {
  return {
    id: uuid(),
    title: 'Untitled Resume',
    updatedAt: new Date().toISOString(),
    personalInfo: { fullName: '', email: '', phone: '', location: '', linkedin: '', portfolio: '' },
    summary: '',
    experience: [],
    education: [],
    skills: [],
    projects: [],
    certifications: [],
    ...overrides,
  };
}

export function loadResumes(): ResumeData[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
  } catch {
    return [];
  }
}

export function saveResume(resume: ResumeData): void {
  const all = loadResumes().filter((r) => r.id !== resume.id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify([{ ...resume, updatedAt: new Date().toISOString() }, ...all]));
}

export function deleteResume(id: string): void {
  const all = loadResumes().filter((r) => r.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}

export function getResume(id: string): ResumeData | null {
  return loadResumes().find((r) => r.id === id) ?? null;
}

export function completionPercent(r: ResumeData): number {
  let filled = 0;
  const total = 10;
  const pi = r.personalInfo;
  if (pi.fullName) filled++;
  if (pi.email) filled++;
  if (pi.phone) filled++;
  if (pi.location) filled++;
  if (pi.linkedin || pi.portfolio) filled++;
  if (r.summary) filled++;
  if (r.experience.length > 0) filled++;
  if (r.education.length > 0) filled++;
  if (r.skills.length > 0) filled++;
  if (r.projects.length > 0 || r.certifications.length > 0) filled++;
  return Math.round((filled / total) * 100);
}
