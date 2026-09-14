import { getAnthropicClient, CHEAP_MODEL_NAME } from '@/lib/anthropic';
import type { CandidateProfile, ExperienceLevel, NaukriSearchParams } from './types';
import { cleanSkillForNaukriSlug } from './cloud-scraper';

// Indian tech hub city GIDs in Naukri
export const NAUKRI_CITY_GIDS: Record<string, number> = {
  bangalore: 9508,
  bengaluru: 9508,
  hyderabad: 9509,
  pune: 9513,
  delhi: 9504,
  'delhi / ncr': 9504,
  noida: 9506,
  gurgaon: 9505,
  gurugram: 9505,
  mumbai: 9511,
  chennai: 9510,
  kolkata: 9512,
  remote: 9500,
};

const COMMON_SKILLS = [
  'react', 'react.js', 'reactjs', 'javascript', 'typescript', 'next.js', 'nextjs',
  'node.js', 'nodejs', 'express', 'python', 'django', 'fastapi', 'flask',
  'java', 'spring', 'spring boot', 'c++', 'c#', '.net', 'golang', 'rust',
  'sql', 'postgresql', 'mysql', 'mongodb', 'redis', 'graphql', 'rest api',
  'html', 'html5', 'css', 'css3', 'tailwind', 'tailwind css', 'bootstrap',
  'docker', 'kubernetes', 'aws', 'azure', 'gcp', 'git', 'github', 'ci/cd',
  'redux', 'redux toolkit', 'zustand', 'vite', 'webpack',
  'machine learning', 'deep learning', 'pandas', 'numpy', 'scikit-learn',
  'flutter', 'react native', 'android', 'ios', 'swift', 'kotlin'
];

/**
 * Deterministic extractor for candidate contact details (Name, Email, Mobile Phone)
 * directly from raw resume text across international and Indian resume formats.
 */
export function extractContactInfo(resumeText: string): {
  name?: string;
  email?: string;
  phone?: string;
} {
  if (!resumeText || resumeText.trim().length === 0) return {};

  // 1. Email extraction (standard RFC compliant regex)
  const emailMatch = resumeText.match(/\b([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})\b/);
  const email = emailMatch ? emailMatch[1].trim() : undefined;

  // 2. Mobile Phone extraction (handles Indian 10-digit, +91 prefixes, labeled and unlabeled formats)
  let phone: string | undefined;

  // A. Labeled match first (e.g. "Phone: +91 9876543210", "Mobile: 9876543210", "Contact: ...")
  const labeledMatch = resumeText.match(
    /(?:phone|mobile|tel|contact|cell|call)(?:\s*(?:no|number)?[\s.:#-]*)((?:\+?\d{1,3}[\s.-]*)?(?:\(?\d{2,5}\)?[\s.-]*)?\d{3,5}[\s.-]*\d{4,5})/i
  );
  if (labeledMatch) {
    const raw = labeledMatch[1].trim();
    const digits = raw.replace(/\D/g, '');
    if (digits.length >= 10) {
      phone = digits.length > 10 && digits.startsWith('91') ? digits.slice(2) : digits.slice(-10);
    }
  }

  // B. Standard Indian mobile pattern: starts with 6, 7, 8, or 9 (with optional +91 or 0 prefix)
  if (!phone) {
    const indianMatch = resumeText.match(/(?:(?:\+|0{0,2})91[\s.-]*)?([6-9]\d{4}[\s.-]*\d{5}|[6-9]\d{9})\b/);
    if (indianMatch) {
      const raw = (indianMatch[1] || indianMatch[0]).replace(/\D/g, '');
      phone = raw.length > 10 && raw.startsWith('91') ? raw.slice(2) : raw.slice(-10);
    }
  }

  /*
   * No unlabelled fallback.
   *
   * There used to be a pattern C: any US-shaped 10-digit run anywhere in the
   * resume, no label required. An employee id, a roll number or a PIN became
   * the phone number on a real job application. A resume with no recognisable
   * phone number now yields none, and the form asks for it.
   */

  // 3. Name extraction: Inspect the first few non-empty lines before contact details or URLs
  let name: string | undefined;
  const lines = resumeText.split('\n').map(l => l.trim()).filter(Boolean);
  for (const line of lines.slice(0, 6)) {
    if (
      line.includes('@') ||
      /\+?\d{7,}/.test(line) ||
      /resume|curriculum|vitae|profile|http|www\.|github|linkedin|portfolio|summary|objective|skills/i.test(line)
    ) {
      continue;
    }

    /*
     * A headline is not a name.
     *
     * "Experienced Full-Stack Developer" is 1-4 words, 3-45 characters and
     * contains none of the words above, so it passed every check and came back
     * Title-Cased as the candidate's name — which the auto-apply modal then
     * pre-fills into a real application. Nobody is named Developer.
     */
    if (
      /\b(developer|engineer|experienced|results|driven|full|stack|frontend|backend|manager|analyst|student|intern|professional|graduate|consultant|designer|architect|specialist|seeking|passionate|motivated|aspiring|enthusiast)\b/i.test(line)
    ) {
      continue;
    }

    const clean = line.replace(/^(?:name\s*[:.-]\s*)/i, '').replace(/[^A-Za-z\s.'-]/g, '').trim();
    const words = clean.split(/\s+/).filter(w => w.length > 1);

    if (clean.length >= 3 && clean.length <= 45 && words.length >= 1 && words.length <= 4) {
      name = words.map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
      break;
    }
  }

  return { name, email, phone };
}

/**
 * Fast deterministic heuristics parser for initial extraction without latency.
 */
export function extractQuickProfile(resumeText: string): CandidateProfile {
  const contact = extractContactInfo(resumeText);
  const lower = resumeText.toLowerCase();

  // 1. Fresher / Experience heuristics
  const isStudentOrGrad = /b\.?tech|b\.?e|m\.?tech|bca|mca|b\.?sc|college|university|student|fresher|intern|internship|pursuing/i.test(resumeText);
  const currentYear = new Date().getFullYear();
  // Any 20xx, bounded relative to now below. The literal window this replaced
  // (202[2-7]) would have silently stopped recognising 2028 graduates.
  const recentGradMatch = resumeText.match(/\b(20\d{2})\b/g);
  let latestGradYear: number | undefined;
  if (recentGradMatch) {
    const years = recentGradMatch.map(Number).filter(y => y >= currentYear - 4 && y <= currentYear + 2);
    if (years.length > 0) latestGradYear = Math.max(...years);
  }

  // Check years of experience mentions
  const expMatch = resumeText.match(/(\d+(?:\.\d+)?)\+?\s*(?:years?|yrs?)(?:\s+of)?\s+experience/i);
  let years = 0;
  if (expMatch) {
    years = parseFloat(expMatch[1]);
  } else if (!isStudentOrGrad) {
    // Count distinct work experience blocks
    const workBlocks = (lower.match(/\b(20\d{2})\s*[-–]\s*(present|current|20\d\d)\b/g) || []).length;
    years = Math.min(workBlocks * 1.5, 10);
  }

  let level: ExperienceLevel = 'fresher';
  if (years >= 5) level = 'senior';
  else if (years >= 2.5) level = 'mid';
  else if (years >= 1) level = 'junior';
  else level = 'fresher';

  // 2. Skill extraction
  const foundSkills = new Set<string>();
  for (const skill of COMMON_SKILLS) {
    const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escaped}\\b`, 'i');
    if (regex.test(resumeText)) {
      foundSkills.add(skill);
    }
  }

  // 3. Location detection
  const preferredLocations: string[] = [];
  for (const city of Object.keys(NAUKRI_CITY_GIDS)) {
    if (city === 'delhi / ncr') continue;
    const regex = new RegExp(`\\b${city}\\b`, 'i');
    if (regex.test(lower)) {
      preferredLocations.push(city.charAt(0).toUpperCase() + city.slice(1));
    }
  }
  // No detected city means no preference. This used to push Bengaluru,
  // Hyderabad and Pune, so a resume naming no city at all got a "personalised"
  // search in three cities the candidate never mentioned.

  // 4. Target roles based on skills
  const targetRoles: string[] = [];
  const skillsArr = Array.from(foundSkills);
  const hasReact = skillsArr.some(s => s.includes('react'));
  const hasNode = skillsArr.some(s => s.includes('node'));
  const hasPython = skillsArr.some(s => s.includes('python'));
  const hasJava = skillsArr.some(s => s.includes('java'));

  const suffix = level === 'fresher' ? 'Fresher' : 'Developer';

  if (hasReact && hasNode) targetRoles.push(`Full Stack ${suffix}`, `React.js ${suffix}`);
  else if (hasReact) targetRoles.push(`React ${suffix}`, `Frontend ${suffix}`);
  else if (hasNode) targetRoles.push(`Node.js ${suffix}`, `Backend ${suffix}`);
  else if (hasPython) targetRoles.push(`Python ${suffix}`, `Software Engineer ${suffix}`);
  else if (hasJava) targetRoles.push(`Java ${suffix}`, `Software Engineer ${suffix}`);
  else targetRoles.push(`Software Engineer ${suffix}`, `Graduate Engineer Trainee`);

  return {
    name: contact.name,
    email: contact.email,
    phone: contact.phone,
    experienceLevel: level,
    totalYearsExperience: years,
    graduationYear: latestGradYear,
    targetRoles,
    coreSkills: skillsArr.slice(0, 15),
    /*
     * Empty, not the constant ['Software Engineering', 'Web Development'] that
     * was returned for every candidate on earth — data scientist, QA, mobile.
     */
    domainInterests: [],
    preferredLocations,
    /*
     * expectedCtcLpa and currentNoticePeriod are deliberately ABSENT.
     *
     * They were `years * 3.5` and a hardcoded '30 Days' — invented numbers —
     * and the auto-apply modal pre-fills Expected CTC from this profile. A
     * salary expectation typed into a real application is the candidate's own
     * statement to an employer; a heuristic must not make it for them.
     */
    analysisSource: 'heuristic',
  };
}

/**
 * Deep AI-enhanced candidate profile analysis.
 */
export async function analyzeResumeForNaukri(resumeText: string): Promise<CandidateProfile> {
  const quick = extractQuickProfile(resumeText);
  const contact = extractContactInfo(resumeText);

  try {
    const anthropic = getAnthropicClient();
    const prompt = `You are a recruitment intelligence engine specialized in the Indian tech market (Naukri.com ecosystem).
Analyze this candidate's resume and extract their profile optimized for discovering the highest-probability job openings on Naukri.

Pay special attention to whether this candidate is a Fresher/Entry-level vs Experienced.
If the candidate graduated recently (e.g. 2024, 2025, 2026), is in college, has only internships, or has 0-1 years exp, classify as 'fresher' or 'junior'.

NEVER estimate, infer or guess salary, notice period or location. These may be
submitted to real employers as the candidate's own statements. If the resume does
not state one explicitly, return null for it.

Return ONLY a JSON object matching this schema:
{
  "name": "Candidate Full Name extracted from resume, or undefined",
  "email": "Candidate Email address extracted from resume, or undefined",
  "phone": "Candidate 10-digit Mobile Phone number extracted from resume, or undefined",
  "experienceLevel": "fresher" | "junior" | "mid" | "senior",
  "totalYearsExperience": number,
  "graduationYear": number or null,
  "degree": "B.Tech Computer Science" or similar,
  "targetRoles": ["Exact Naukri job titles to search, e.g. 'React Developer', 'Frontend Developer Fresher'"],
  "coreSkills": ["Top 10-12 verified skills from resume"],
  "domainInterests": ["domains evidenced by the resume's own projects or roles"],
  "preferredLocations": ["cities the resume itself names, or [] if none"],
  "expectedCtcLpa": number ONLY if the resume states an expected salary, otherwise null,
  "currentNoticePeriod": "Immediate" | "15 Days" | "30 Days" ONLY if stated, otherwise null,
  "summary": "1 sentence profile hook for recruiters"
}

Resume Text:
${resumeText.slice(0, 6000)}`;

    const res = await anthropic.messages.create({
      model: CHEAP_MODEL_NAME,
      max_tokens: 600,
      system: 'You return only valid raw JSON without markdown code blocks.',
      messages: [{ role: 'user', content: prompt }],
    });

    const raw = res.content[0].type === 'text' ? res.content[0].text : '';
    const clean = raw.replace(/^\s*```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
    const parsed = JSON.parse(clean);

    return {
      name: parsed.name || contact.name || quick.name,
      email: parsed.email || contact.email || quick.email,
      phone: parsed.phone || contact.phone || quick.phone,
      experienceLevel: parsed.experienceLevel || quick.experienceLevel,
      totalYearsExperience: typeof parsed.totalYearsExperience === 'number' ? parsed.totalYearsExperience : quick.totalYearsExperience,
      graduationYear: parsed.graduationYear || quick.graduationYear,
      degree: parsed.degree || quick.degree,
      fieldOfStudy: parsed.fieldOfStudy,
      targetRoles: parsed.targetRoles?.length ? parsed.targetRoles : quick.targetRoles,
      coreSkills: parsed.coreSkills?.length ? parsed.coreSkills : quick.coreSkills,
      domainInterests: parsed.domainInterests?.length ? parsed.domainInterests : quick.domainInterests,
      preferredLocations: parsed.preferredLocations?.length ? parsed.preferredLocations : quick.preferredLocations,
      // Only a value the model found stated. No fallback to the heuristic —
      // the heuristic no longer invents these, and must not be reached for.
      expectedCtcLpa:
        typeof parsed.expectedCtcLpa === 'number' && parsed.expectedCtcLpa > 0
          ? parsed.expectedCtcLpa
          : undefined,
      currentNoticePeriod: parsed.currentNoticePeriod || undefined,
      summary: parsed.summary,
      analysisSource: 'ai',
    };
  } catch (err) {
    console.warn('[resume-analyzer] AI extraction failed, falling back to heuristics:', err);
    /*
     * Labelled, not disguised. The heuristic profile has the same shape as the
     * AI one, so without analysisSource a caller could not tell a regex guess
     * from a model's reading of the resume.
     */
    return { ...quick, analysisSource: 'heuristic' };
  }
}

/**
 * Builds optimized search queries and parameters specifically formatted for Naukri.com.
 */
export function buildNaukriSearchStrategy(profile: CandidateProfile): {
  primarySearch: NaukriSearchParams;
  alternativeSearches: NaukriSearchParams[];
  naukriDirectUrl: string;
} {
  const isFresher = profile.experienceLevel === 'fresher' || profile.totalYearsExperience === 0;
  const topRole = profile.targetRoles[0] || 'Software Developer';
  /*
   * Unknowns stay unknown. With no detected skills this searched for "React",
   * and with no city it searched Bengaluru (then Hyderabad for the alternate)
   * — a generic search presented as one tailored to the candidate.
   */
  const primarySkill = profile.coreSkills[0] || topRole;
  const city = profile.preferredLocations[0]?.toLowerCase();
  const cityGid = city ? NAUKRI_CITY_GIDS[city] : undefined;

  // Primary query keywords using canonical technology cleaner
  const clean = cleanSkillForNaukriSlug(primarySkill, isFresher);
  const primaryKeywords = isFresher
    ? `${clean.cleanKeywords} fresher`
    : `${clean.cleanKeywords} developer`;

  const primarySearch: NaukriSearchParams = {
    keywords: primaryKeywords,
    experienceYears: isFresher ? 0 : Math.floor(profile.totalYearsExperience),
    location: city,
    cityTypeGid: cityGid,
    freshnessDays: 15,
  };

  // Alternative queries for broader discovery
  const alternativeSearches: NaukriSearchParams[] = [
    {
      keywords: isFresher ? `${topRole} entry level` : topRole,
      experienceYears: isFresher ? 0 : Math.floor(profile.totalYearsExperience),
      location: profile.preferredLocations[1]?.toLowerCase(),
      cityTypeGid: profile.preferredLocations[1]
        ? NAUKRI_CITY_GIDS[profile.preferredLocations[1].toLowerCase()]
        : undefined,
      freshnessDays: 30,
    },
    {
      keywords: isFresher ? 'Graduate Engineer Trainee' : `${profile.coreSkills.slice(0, 2).join(' ')} developer`,
      experienceYears: isFresher ? 0 : Math.floor(profile.totalYearsExperience),
      freshnessDays: 15,
    },
  ];

  // Direct Naukri search link using canonical slug
  const directParams = new URLSearchParams({
    k: primaryKeywords,
    experience: String(primarySearch.experienceYears ?? 0),
  });
  if (cityGid) directParams.set('cityTypeGid', String(cityGid));
  const naukriDirectUrl = `https://www.naukri.com/${clean.baseSlug}-jobs?${directParams.toString()}`;

  return {
    primarySearch,
    alternativeSearches,
    naukriDirectUrl,
  };
}
