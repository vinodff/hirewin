import { describe, it, expect } from 'vitest';
import { cleanSkillForNaukriSlug } from '@/lib/naukri/cloud-scraper';
import { applyToNaukriJob } from '@/lib/naukri/headless-applier';
import type { NaukriJobListing } from '@/lib/naukri/types';
import type { RealApplicantVault } from '@/lib/naukri/profile-vault';

describe('Naukri Technology Slug Cleaner', () => {
  it('maps compound SQL queries into canonical sql slug', () => {
    const result1 = cleanSkillForNaukriSlug('SQL Query Optimization');
    expect(result1.baseSlug).toBe('sql');
    expect(result1.cleanKeywords).toContain('sql query optimization');

    const result2 = cleanSkillForNaukriSlug('SQL Query Optimization fresher', true);
    expect(result2.baseSlug).toBe('sql');
    expect(result2.isFresher).toBe(true);
  });

  it('maps React variants into react-js slug', () => {
    const res = cleanSkillForNaukriSlug('React.js Frontend Development');
    expect(res.baseSlug).toBe('react-js');
  });

  it('maps frontend and UI keywords to frontend-developer slug', () => {
    const res = cleanSkillForNaukriSlug('Frontend Engineer Entry Level', true);
    expect(res.baseSlug).toBe('frontend-developer');
    expect(res.isFresher).toBe(true);
  });

  it('maps Python and Django keywords to python slug', () => {
    const res = cleanSkillForNaukriSlug('Python Django Backend Trainee');
    expect(res.baseSlug).toBe('python');
    expect(res.isFresher).toBe(true);
  });

  it('maps Data Analyst & BI to data-analyst slug', () => {
    const res = cleanSkillForNaukriSlug('Data Analyst Power BI Fresher 2026 Batch');
    expect(res.baseSlug).toBe('data-analyst');
    expect(res.isFresher).toBe(true);
  });

  it('maps Full Stack & MERN to full-stack-developer slug', () => {
    const res = cleanSkillForNaukriSlug('Full Stack MERN Developer');
    expect(res.baseSlug).toBe('full-stack-developer');
  });
});

describe('Headless Applier Fast-Paths', () => {
  const dummyVault: RealApplicantVault = {
    fullName: 'Test Candidate',
    email: 'test@example.com',
    phone: '9876543210',
    currentLocation: 'Bengaluru',
    totalExperienceYears: 0,
    currentCtcLpa: 0,
    expectedCtcLpa: 6,
    noticePeriod: 'Immediate',
    highestDegree: 'B.Tech',
    specialization: 'CSE',
    collegeName: 'Engineering College',
    graduationYear: 2026,
    skills: ['SQL', 'React'],
    resumeText: 'Test resume text',
  };

  it('immediately returns external_redirect for category or search URLs without launching a browser', async () => {
    const searchJob: NaukriJobListing = {
      id: 'curated-sql-1',
      title: 'SQL Developer',
      company: 'Tech Corp',
      location: 'Bengaluru',
      jobUrl: 'https://www.naukri.com/sql-jobs?experience=0',
      applyType: 'external_site',
      skills: ['SQL'],
      descriptionSnippet: 'SQL opening',
      // Required by NaukriJobListing. Omitted originally, which is what broke
      // the typecheck — the object was cast to the type without satisfying it.
      experienceText: '0-1 Yrs',
      experienceMin: 0,
      experienceMax: 1,
      salaryText: 'Not disclosed',
      workMode: 'onsite',
      postedDateText: '1 day ago',
    };

    const result = await applyToNaukriJob({
      job: searchJob,
      vault: dummyVault,
      sessionDir: 'dummy-session-dir',
    });

    expect(result.status).toBe('external_redirect');
    expect(result.message).toContain('Direct opening saved to your job tracker');
    expect(result.externalUrl).toBe(searchJob.jobUrl);
  });
});
