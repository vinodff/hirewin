import { describe, it, expect } from 'vitest';
import { extractQuickProfile, buildNaukriSearchStrategy } from '../lib/naukri/resume-analyzer';
import { scoreNaukriJob, rankNaukriJobs } from '../lib/naukri/matcher';
import type { CandidateProfile, NaukriJobListing } from '../lib/naukri/types';

describe('Naukri Candidate Profile & Match Scoring', () => {
  const sampleFresherResume = `
VINOD KONDETI
vinod@example.com | +91 9876543210 | Bengaluru, India
GitHub: github.com/vinod | Portfolio: vinod.dev

EDUCATION
B.Tech in Computer Science and Engineering (2022 - 2026)
GPA: 8.9 / 10

TECHNICAL SKILLS
Languages: JavaScript, TypeScript, Python, HTML5, CSS3
Frameworks: React.js, Next.js, Node.js, Express, Tailwind CSS, Redux Toolkit
Databases: MongoDB, PostgreSQL, SQL
Tools: Git, GitHub, Docker, Postman

PROJECTS
E-Commerce Platform: Built full stack application using React, Node.js, and MongoDB.
Resume Analyzer: Built AI-powered application with Next.js and Tailwind CSS.
`;

  it('extracts fresher experience level and core skills correctly', () => {
    const profile = extractQuickProfile(sampleFresherResume);
    expect(profile.experienceLevel).toBe('fresher');
    expect(profile.totalYearsExperience).toBe(0);
    expect(profile.coreSkills).toContain('react');
    expect(profile.coreSkills).toContain('javascript');
    expect(profile.coreSkills).toContain('typescript');
    expect(profile.preferredLocations).toContain('Bengaluru');
  });

  it('builds optimized search strategy for freshers with experience=0', () => {
    const profile: CandidateProfile = {
      experienceLevel: 'fresher',
      totalYearsExperience: 0,
      targetRoles: ['React Developer Fresher'],
      coreSkills: ['React', 'JavaScript', 'TypeScript'],
      domainInterests: ['Web Development'],
      preferredLocations: ['Bengaluru'],
    };

    const strategy = buildNaukriSearchStrategy(profile);
    expect(strategy.primarySearch.experienceYears).toBe(0);
    expect(strategy.primarySearch.cityTypeGid).toBe(9508);
    expect(strategy.primarySearch.keywords).toContain('fresher');
    expect(strategy.naukriDirectUrl).toContain('experience=0');
  });

  it('penalizes jobs requiring multi-year experience for freshers', () => {
    const profile: CandidateProfile = {
      experienceLevel: 'fresher',
      totalYearsExperience: 0,
      targetRoles: ['React Developer'],
      coreSkills: ['React', 'JavaScript', 'TypeScript'],
      domainInterests: ['Web Development'],
      preferredLocations: ['Bengaluru'],
    };

    const seniorJob: NaukriJobListing = {
      id: 'job-1',
      title: 'Senior React Architect',
      company: 'Tech Corp',
      experienceText: '5-8 Yrs',
      experienceMin: 5,
      experienceMax: 8,
      salaryText: '25-35 Lacs PA',
      location: 'Bengaluru',
      workMode: 'hybrid',
      skills: ['React', 'JavaScript'],
      descriptionSnippet: 'Looking for 5+ years experienced React architects',
      jobUrl: 'https://www.naukri.com/job-listings-1',
      postedDateText: '1 day ago',
      applyType: 'naukri_easy_apply',
    };

    const fresherJob: NaukriJobListing = {
      id: 'job-2',
      title: 'Junior React Developer Fresher',
      company: 'Growth Startup',
      experienceText: '0-1 Yrs',
      experienceMin: 0,
      experienceMax: 1,
      salaryText: '6-8 Lacs PA',
      location: 'Bengaluru',
      workMode: 'hybrid',
      skills: ['React', 'JavaScript', 'TypeScript'],
      descriptionSnippet: 'Welcoming 2024-2026 freshers',
      jobUrl: 'https://www.naukri.com/job-listings-2',
      postedDateText: 'Just now',
      applyType: 'naukri_easy_apply',
    };

    const seniorScore = scoreNaukriJob(profile, seniorJob);
    const fresherScore = scoreNaukriJob(profile, fresherJob);

    expect(fresherScore.fitScore).toBeGreaterThan(seniorScore.fitScore);
    expect(fresherScore.isFresherFriendly).toBe(true);
    expect(seniorScore.matchTier).toBe('poor');
  });

  it('ranks fresher-friendly jobs at the top of the list', () => {
    const profile: CandidateProfile = {
      experienceLevel: 'fresher',
      totalYearsExperience: 0,
      targetRoles: ['React Developer'],
      coreSkills: ['React', 'JavaScript', 'TypeScript'],
      domainInterests: ['Web Development'],
      preferredLocations: ['Bengaluru'],
    };

    const jobs: NaukriJobListing[] = [
      {
        id: '1',
        title: 'Lead Architect',
        company: 'Corp A',
        experienceText: '7-10 Yrs',
        experienceMin: 7,
        experienceMax: 10,
        salaryText: '30 Lacs',
        location: 'Bengaluru',
        workMode: 'onsite',
        skills: ['React'],
        descriptionSnippet: '',
        jobUrl: 'https://www.naukri.com/1',
        postedDateText: '3 days ago',
        applyType: 'naukri_easy_apply',
      },
      {
        id: '2',
        title: 'Graduate React Trainee (Fresher)',
        company: 'Corp B',
        experienceText: '0-1 Yrs',
        experienceMin: 0,
        experienceMax: 1,
        salaryText: '6 Lacs',
        location: 'Bengaluru',
        workMode: 'hybrid',
        skills: ['React', 'TypeScript'],
        descriptionSnippet: '',
        jobUrl: 'https://www.naukri.com/2',
        postedDateText: '1 day ago',
        applyType: 'naukri_easy_apply',
      },
    ];

    const ranked = rankNaukriJobs(profile, jobs);
    expect(ranked[0].id).toBe('2');
    expect(ranked[0].fitScore).toBeGreaterThan(80);
  });
});
