export type CompanyType = 'startup' | 'enterprise' | 'faang' | 'agency' | 'nonprofit';
export type CareerLevel = 'Junior' | 'Mid' | 'Senior' | 'Executive';
export type SkillImportance = 'Critical' | 'High' | 'Medium';
export type Plan = 'free' | 'starter' | 'pro' | 'power' | 'team';

export type EvaluationType = 'quick' | 'deep';

export type Archetype =
  | 'ai_platform_llmops'
  | 'agentic'
  | 'technical_pm'
  | 'solutions_architect'
  | 'forward_deployed'
  | 'transformation';

export const ARCHETYPE_LABELS: Record<Archetype, string> = {
  ai_platform_llmops: 'AI Platform / LLMOps',
  agentic: 'Agentic Systems',
  technical_pm: 'Technical PM',
  solutions_architect: 'Solutions Architect',
  forward_deployed: 'Forward Deployed',
  transformation: 'Transformation',
};

export type LegitimacyTier = 'high_confidence' | 'proceed_with_caution' | 'suspicious';

export const LEGITIMACY_LABELS: Record<LegitimacyTier, string> = {
  high_confidence: 'High Confidence',
  proceed_with_caution: 'Proceed with Caution',
  suspicious: 'Suspicious',
};

export type DeepScores = {
  cvMatch: number;
  northStar: number;
  comp: number;
  cultural: number;
  redFlags: number;
  global: number;
};

export type Gap = {
  description: string;
  severity: 'hard_blocker' | 'nice_to_have';
  mitigation: string;
};

export type StarStory = {
  situation: string;
  task: string;
  action: string;
  result: string;
  reflection: string;
  jdRequirement: string;
};

export type AtsPlatform = 'greenhouse' | 'ashby' | 'lever' | 'workday' | 'custom';
export type PortalCategory = 'indian_tech' | 'global_tech' | 'ai_labs' | 'european_tech' | 'custom';

export type Portal = {
  id: string;
  name: string;
  careers_url: string;
  api_url: string | null;
  ats_platform: AtsPlatform | null;
  category: PortalCategory;
  notes: string | null;
  is_system: boolean;
  enabled: boolean;
};

export type ScannedJob = {
  id: string;
  portal_id: string | null;
  job_url: string;
  title: string;
  company: string;
  location: string | null;
  first_seen: string;
  dismissed: boolean;
};

export type ScanResult = {
  totalPortals: number;
  scannedPortals: number;
  failedPortals: number;
  newJobs: ScannedJob[];
  duplicates: number;
};

export type FollowupChannel = 'email' | 'linkedin' | 'phone' | 'other';
export type FollowupUrgency = 'urgent' | 'overdue' | 'waiting' | 'cold';

export type FollowupEntry = {
  id: string;
  version_id: string;
  channel: FollowupChannel;
  contact_name: string | null;
  contact_email: string | null;
  sent_at: string;
  notes: string | null;
};

export type PatternAnalysis = {
  id: string;
  computed_at: string;
  application_count: number;
  funnel: Record<string, number>;
  score_comparison: {
    positive: { avg: number; min: number; max: number };
    negative: { avg: number; min: number; max: number };
  };
  archetype_breakdown: Array<{ archetype: string; count: number; conversion: number }>;
  blockers: Array<{ type: string; count: number; percentage: number }>;
  tech_gaps: Array<{ tech: string; count: number }>;
  recommendations: Array<{ action: string; reasoning: string; impact: string }>;
  score_threshold: number | null;
};

export type ApplicationStatus =
  | 'evaluated'
  | 'applied'
  | 'responded'
  | 'interview'
  | 'offer'
  | 'rejected'
  | 'discarded';

export const APPLICATION_STATUSES: ApplicationStatus[] = [
  'evaluated',
  'applied',
  'responded',
  'interview',
  'offer',
  'rejected',
  'discarded',
];

export const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  evaluated: 'Evaluated',
  applied: 'Applied',
  responded: 'Responded',
  interview: 'Interview',
  offer: 'Offer',
  rejected: 'Rejected',
  discarded: 'Discarded',
};

export type SkillGap = {
  skill: string;
  importance: SkillImportance;
  reason: string;
};

export type AnalysisResult = {
  atsScore: number;
  jobFitScore: number;
  careerLevel: CareerLevel;
  keywordsMatched: string[];
  keywordsMissing: string[];
  skillGaps: SkillGap[];
  company: string;
  role: string;
  companyType: CompanyType;
  optimizedResume: string;
  outreachEmail: string;
  outreachLinkedIn: string;
};

export type ResumeVersion = {
  id: string;
  user_id: string;
  created_at: string;
  company: string;
  role: string;
  company_type: CompanyType;
  ats_score: number;
  job_fit_score: number;
  career_level: CareerLevel;
  original_resume: string;
  optimized_resume: string;
  keywords_matched: string[];
  keywords_missing: string[];
  skill_gaps: SkillGap[];
  outreach_email: string;
  outreach_linkedin: string;
  application_status: ApplicationStatus;
  applied_at: string | null;
  responded_at: string | null;
  interview_at: string | null;
  closed_at: string | null;
  pipeline_note: string | null;
  // Deep evaluation fields (null for quick analysis)
  evaluation_type: EvaluationType;
  deep_score: number | null;
  archetype: Archetype | null;
  legitimacy: LegitimacyTier | null;
  deep_scores: DeepScores | null;
  gaps: Gap[] | null;
  star_stories: StarStory[] | null;
  personalization_plan: Record<string, unknown> | null;
  comp_research: Record<string, unknown> | null;
  interview_questions: Record<string, unknown> | null;
  evaluation_report: string | null;
  jd_keywords: string[];
  jd_url: string | null;
  jd_text: string | null;
};

export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  plan: Plan;
  usage_month: string;
  improvements_used: number;
  roadmaps_used: number;
  downloads_used: number;
  team_wallet_paise: number;
  created_at: string;
  updated_at: string;
  // Career-ops profile extensions
  headline: string | null;
  target_roles: string[];
  cv_text: string | null;
  location: string | null;
  linkedin_url: string | null;
  portfolio_url: string | null;
  comp_current: string | null;
  comp_target: string | null;
  comp_currency: string;
  deal_breakers: string[];
  superpower: string | null;
};

export type PlanLimits = {
  improvements: number;
  roadmaps: number;
  downloads: number;
  historyMonths: number;
  deepEvals: number;
  scansPerMonth: number;
};

export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  free: { improvements: 2, roadmaps: 1, downloads: 0, historyMonths: 1, deepEvals: 0, scansPerMonth: 0 },
  starter: { improvements: 2, roadmaps: 1, downloads: 1, historyMonths: 1, deepEvals: 0, scansPerMonth: 0 },
  pro: { improvements: 20, roadmaps: 15, downloads: Infinity, historyMonths: 3, deepEvals: 10, scansPerMonth: 30 },
  power: { improvements: 80, roadmaps: 60, downloads: Infinity, historyMonths: 6, deepEvals: 40, scansPerMonth: 100 },
  team: { improvements: Infinity, roadmaps: Infinity, downloads: Infinity, historyMonths: 12, deepEvals: Infinity, scansPerMonth: Infinity },
};

// SSE event types from /api/analyze
export type SSEEvent =
  | { type: 'field'; field: keyof AnalysisResult; value: unknown }
  | { type: 'complete'; versionId: string; result: AnalysisResult; originalResume: string }
  | { type: 'error'; message: string };

// SSE event types from /api/evaluate (deep evaluation)
export type DeepEvalSSEEvent =
  | { type: 'block'; block: string; content: string }
  | { type: 'scores'; scores: DeepScores }
  | { type: 'archetype'; archetype: Archetype }
  | { type: 'legitimacy'; tier: LegitimacyTier }
  | { type: 'complete'; versionId: string }
  | { type: 'error'; message: string };

export type OrderStatus = 'created' | 'paid' | 'failed';

export type Order = {
  id: string;
  user_id: string | null;
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
  plan: Plan;
  amount_paise: number;
  currency: string;
  status: OrderStatus;
  is_yearly: boolean;
  created_at: string;
};
