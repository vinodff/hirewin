/**
 * Types and contracts for Naukri AI Job Search, Scraping, Matching, and Autofill.
 */

export type ExperienceLevel = 'fresher' | 'junior' | 'mid' | 'senior';

export interface CandidateProfile {
  name?: string;
  email?: string;
  phone?: string;
  experienceLevel: ExperienceLevel;
  totalYearsExperience: number;
  graduationYear?: number;
  degree?: string;
  fieldOfStudy?: string;
  targetRoles: string[];
  coreSkills: string[];
  domainInterests: string[];
  preferredLocations: string[];
  expectedCtcLpa?: number;
  currentNoticePeriod?: string;
  summary?: string;
  /**
   * Where this profile came from. `heuristic` is regex extraction — used when
   * the AI call fails as well as for the fast path — and must never be shown
   * to a user as if a model had read their resume.
   */
  analysisSource?: 'ai' | 'heuristic';
}

export interface NaukriSearchParams {
  keywords: string;
  experienceYears?: number; // 0 for fresher
  location?: string;
  cityTypeGid?: number; // e.g. 9508 for Bangalore, 9509 for Hyderabad
  minSalaryLpa?: number;
  maxSalaryLpa?: number;
  freshnessDays?: number;
  workMode?: 'wfh' | 'hybrid' | 'office';
}

export interface NaukriJobListing {
  id: string;
  title: string;
  company: string;
  companyRating?: number;
  companyReviewsCount?: number;
  experienceText: string;
  experienceMin: number;
  experienceMax: number;
  salaryText: string;
  location: string;
  workMode: 'onsite' | 'remote' | 'hybrid';
  skills: string[];
  descriptionSnippet: string;
  jobUrl: string;
  postedDateText: string;
  applyType: 'naukri_easy_apply' | 'external_site';
}

export type MatchTier = 'perfect' | 'strong' | 'good' | 'stretch' | 'poor';

export interface NaukriJobMatch extends NaukriJobListing {
  fitScore: number; // 0 to 100
  matchTier: MatchTier;
  fitReason: string;
  matchingSkills: string[];
  missingSkills: string[];
  isFresherFriendly: boolean;
  interviewPrepTips: string[];
}

export interface AutofillProfile {
  fullName: string;
  email: string;
  phone: string;
  currentLocation: string;
  preferredLocations: string[];
  experienceYears: number;
  currentCompany?: string;
  currentDesignation?: string;
  noticePeriod: 'Immediate' | '15 Days' | '30 Days' | '60 Days' | '90 Days';
  currentCtcLpa: number;
  expectedCtcLpa: number;
  highestDegree: string;
  specialization: string;
  collegeName: string;
  graduationYear: number;
  keySkills: string[];
  resumeText: string;
}

export interface ScreenerQuestion {
  id: string;
  question: string;
  questionType?: 'text' | 'radio' | 'select' | 'numeric';
  options?: string[];
}

export interface ScreenerAnswer {
  questionId: string;
  question: string;
  suggestedAnswer: string;
  confidenceScore: number;
}
