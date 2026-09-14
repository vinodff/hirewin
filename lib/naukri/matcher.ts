import type { CandidateProfile, MatchTier, NaukriJobListing, NaukriJobMatch } from './types';

/*
 * ALIASES ONLY — different spellings of the same technology.
 *
 * This replaced a "synonym" table plus a substring rule, and both produced
 * matches that were then reported to the candidate as "Verified alignment":
 *
 *   - substring: any two skills of 4+ chars matched if one contained the other,
 *     so "javascript".includes("java") put Java developers on JavaScript roles,
 *     and interview prep told a Java-only candidate to prepare JavaScript.
 *   - synonyms: typescript and javascript were declared equivalent, and "react"
 *     and "node.js" each listed the category words "frontend" / "backend", so
 *     any job tagged "frontend" was satisfied by React and vice versa.
 *
 * Related technologies are not the same skill. Only true spellings live here.
 */
const SKILL_ALIASES: Record<string, string[]> = {
  javascript: ['js', 'es6', 'ecmascript'],
  typescript: ['ts'],
  postgresql: ['postgres'],
  css: ['css3'],
  html: ['html5'],
  tailwind: ['tailwindcss'],
  golang: ['go'],
  'c#': ['csharp'],
};

function normalizeSkill(skill: string): string {
  let n = skill.toLowerCase().trim().replace(/[^a-z0-9+#.]/g, '');
  // "React.js", "ReactJS", "Node.js", "NodeJS", "Next.js" name the same thing
  // as their bare form. Strip the suffix — but never reduce "js" itself to "".
  if (n.endsWith('.js')) n = n.slice(0, -3);
  else if (n.endsWith('js') && n.length > 4) n = n.slice(0, -2);
  return n;
}

function canonicalSkill(skill: string): string {
  const n = normalizeSkill(skill);
  for (const [name, aliases] of Object.entries(SKILL_ALIASES)) {
    if (n === name || aliases.includes(n)) return name;
  }
  return n;
}

function skillsMatch(skillA: string, skillB: string): boolean {
  const a = canonicalSkill(skillA);
  return a.length > 0 && a === canonicalSkill(skillB);
}

/**
 * Evaluates match suitability between candidate profile and a scraped Naukri job.
 */
export function scoreNaukriJob(profile: CandidateProfile, job: NaukriJobListing): NaukriJobMatch {
  const isCandidateFresher = profile.experienceLevel === 'fresher' || profile.totalYearsExperience === 0;
  const isJobFresherFriendly = job.experienceMin === 0 || /fresher|trainee|intern|junior|entry/i.test(job.title + ' ' + job.experienceText);

  // 1. Hard Gate: Experience mismatch
  let expPenalty = 0;
  if (isCandidateFresher && job.experienceMin >= 2) {
    // Severe penalty: Freshers cannot pass automated ATS filters requiring 2+ years
    expPenalty = Math.min(50, job.experienceMin * 18);
  } else if (!isCandidateFresher && profile.totalYearsExperience < job.experienceMin) {
    const diff = job.experienceMin - profile.totalYearsExperience;
    expPenalty = Math.min(30, diff * 12);
  }

  // 2. Skill overlap calculation
  const matchingSkills: string[] = [];
  const missingSkills: string[] = [];

  for (const jobSkill of job.skills) {
    const matched = profile.coreSkills.some(candidateSkill => skillsMatch(candidateSkill, jobSkill));
    if (matched) {
      if (!matchingSkills.includes(jobSkill)) matchingSkills.push(jobSkill);
    } else {
      if (!missingSkills.includes(jobSkill)) missingSkills.push(jobSkill);
    }
  }

  let skillScore = 0;

  // If job had very few explicit skills parsed (e.g. internship cards), check title/description
  if (job.skills.length === 0) {
    for (const cSkill of profile.coreSkills) {
      const regex = new RegExp(`\\b${cSkill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      if (regex.test(job.title + ' ' + job.descriptionSnippet)) {
        matchingSkills.push(cSkill);
      }
    }
    // Benchmark against at least 3 core competencies to prevent artificial 70/70 inflation
    const baselineDenominator = Math.max(3, matchingSkills.length);
    const skillMatchRatio = matchingSkills.length / baselineDenominator;
    skillScore = Math.round(skillMatchRatio * 70);
  } else {
    const totalRequired = Math.max(1, job.skills.length);
    const skillMatchRatio = matchingSkills.length / totalRequired;
    skillScore = Math.round(skillMatchRatio * 70); // Up to 70 pts from skills
  }

  // 3. Location & Mode compatibility
  let locationScore = 15; // default neutral
  const jobLoc = job.location.toLowerCase();
  const prefersRemote = profile.preferredLocations.some(l => l.toLowerCase().includes('remote'));

  if (job.workMode === 'remote' && prefersRemote) {
    locationScore = 20;
  } else {
    const matchesCity = profile.preferredLocations.some(l => jobLoc.includes(l.toLowerCase()));
    if (matchesCity) locationScore = 20;
    else if (job.workMode === 'remote') locationScore = 18;
    else locationScore = 10;
  }

  // 4. Role Title Relevance
  let roleScore = 10;
  for (const targetRole of profile.targetRoles) {
    const targetWords = targetRole.toLowerCase().split(/\s+/);
    if (targetWords.some(w => job.title.toLowerCase().includes(w))) {
      roleScore = 15;
      break;
    }
  }

  // Raw score calculation
  let rawScore = Math.round(skillScore + locationScore + roleScore - expPenalty);

  // Bonus for fresher-friendly job when candidate is fresher
  if (isCandidateFresher && isJobFresherFriendly) {
    rawScore = Math.min(98, rawScore + 10);
  } else if (isCandidateFresher && job.experienceMin >= 2) {
    // Hard cap for freshers against experienced roles
    rawScore = Math.min(35, rawScore);
  }

  /*
   * Floor at 0, not 15. The floor manufactured a nonzero "match" for jobs with
   * no skill, location or role overlap at all, while types.ts documents the
   * range as 0-100. A true zero fit is information the candidate should get.
   */
  const fitScore = Math.max(0, Math.min(98, rawScore));

  // Determine Match Tier
  let matchTier: MatchTier = 'good';
  if (fitScore >= 85) matchTier = 'perfect';
  else if (fitScore >= 72) matchTier = 'strong';
  else if (fitScore >= 55) matchTier = 'good';
  else if (fitScore >= 40) matchTier = 'stretch';
  else matchTier = 'poor';

  // Construct transparent fit reason
  let fitReason = '';
  if (isCandidateFresher && !isJobFresherFriendly && job.experienceMin >= 2) {
    fitReason = `Requires ${job.experienceText} experience. As a fresher, prioritize entry-level openings or highlight equivalent project depth.`;
  } else if (matchTier === 'perfect') {
    // "Verified" claimed a check that never happened — this is string matching.
    fitReason = `Strong overlap: matches ${matchingSkills.slice(0, 3).join(', ')} and your ${isCandidateFresher ? 'fresher batch' : 'experience level'}.`;
  } else if (matchTier === 'strong') {
    fitReason = `Strong match. Matches your core stack (${matchingSkills.slice(0, 2).join(', ')}). ${missingSkills.length > 0 ? `Consider touching upon ${missingSkills[0]}.` : ''}`;
  } else if (matchTier === 'good') {
    fitReason = `Relevant role matching ${matchingSkills.length} key skills. Good interview opportunity.`;
  } else {
    fitReason = `Partial match. Gaps identified in ${missingSkills.slice(0, 2).join(', ')}.`;
  }

  // Interview preparation pointers
  const interviewPrepTips: string[] = [];
  if (matchingSkills.length > 0) {
    interviewPrepTips.push(`Prepare deep-dive code examples for ${matchingSkills[0]}.`);
  }
  if (missingSkills.length > 0) {
    interviewPrepTips.push(`Review foundational questions on ${missingSkills[0]} to overcome ATS keyword gaps.`);
  }
  if (isCandidateFresher) {
    interviewPrepTips.push('Emphasize capstone projects, GitHub repos, and core CS fundamentals.');
  }

  return {
    ...job,
    fitScore,
    matchTier,
    fitReason,
    matchingSkills,
    missingSkills,
    isFresherFriendly: isJobFresherFriendly,
    interviewPrepTips,
  };
}

/**
 * Batch ranks a list of Naukri jobs by fit score descending.
 */
export function rankNaukriJobs(profile: CandidateProfile, jobs: NaukriJobListing[]): NaukriJobMatch[] {
  return jobs
    .map(job => scoreNaukriJob(profile, job))
    .sort((a, b) => b.fitScore - a.fitScore);
}
