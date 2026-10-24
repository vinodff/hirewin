import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { route, routeStream } from './ai/router';

let _anthropic: Anthropic | null = null;

export function getAnthropicClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY environment variable is not set.');
  }
  if (!_anthropic) {
    _anthropic = new Anthropic({ apiKey, baseURL: 'https://api.anthropic.com' });
  }
  return _anthropic;
}

// Keep backward compat for any code that imports `anthropic` directly
export const anthropic = new Proxy({} as Anthropic, {
  get(_target, prop) {
    return (getAnthropicClient() as unknown as Record<string | symbol, unknown>)[prop];
  },
});

const SkillGapSchema = z.object({
  skill: z.string(),
  importance: z.enum(['Critical', 'High', 'Medium']),
  reason: z.string(),
});

const SkillEvidenceSchema = z.object({
  skill: z.string(),
  evidence: z.string(),
  confidence: z.enum(['high', 'medium', 'low', 'claimed_only']),
});

const InterviewRiskSchema = z.object({
  skill: z.string(),
  reason: z.string(),
});

// atsScore / optimizedAtsScore are NOT in this schema on purpose. They are
// computed deterministically by lib/ats-score.ts from the resume text, then
// merged in by the analyze route. When the model produced them it anchored on
// the prompt's example numbers and returned the same 85-90 every run.
export const AnalysisResultSchema = z.object({
  jobFitScore: z.number().min(0).max(100),
  trustScore: z.number().min(0).max(100).optional(),
  careerLevel: z.enum(['Junior', 'Mid', 'Senior', 'Executive']),
  keywordsMatched: z.array(z.string()),
  keywordsMissing: z.array(z.string()),
  skillGaps: z.array(SkillGapSchema),
  skillEvidence: z.array(SkillEvidenceSchema).optional(),
  interviewRisks: z.array(InterviewRiskSchema).optional(),
  company: z.string(),
  role: z.string(),
  companyType: z.enum(['startup', 'enterprise', 'faang', 'agency', 'nonprofit']),
  optimizedResume: z.string(),
});

const JSON_SCHEMA = JSON.stringify(
  zodToJsonSchema(AnalysisResultSchema, 'AnalysisResult'),
  null,
  2
);

export const SYSTEM_PROMPT = `You are an elite resume strategist and ATS optimization expert. Your mission: take a candidate's resume and rewrite it to be the strongest, most competitive, professional version of itself — optimized for ATS systems and the specific job description, without fabricating fake employment or inflating degrees.

YOUR CORE MANDATE: Surface genuine value with professional authority. A student or engineer who built projects learned real competencies — component architecture, API integration, debugging, responsive design, state management, and query optimization. Your job is to articulate those real skills using the exact language, frameworks, and keywords recruiters and ATS systems look for.
- NEVER fabricate employers, degrees, or unearned credentials.
- DO translate, surface, and bridge transferable skills and demonstrated competencies into the target JD's vocabulary. If a candidate built full-stack applications with React/Next.js/Node/SQL, they have hands-on experience in State Management, Component Architecture, Responsive Design, RESTful API Integration, Query Optimization, and Agile/Scrum. Integrate these critical keywords directly into their Skills, Summary, and Project descriptions!

COMPANY CLASSIFICATION:
Classify the company as one of: startup | enterprise | faang | agency | nonprofit

TONE & LANGUAGE STRATEGY BY COMPANY TYPE:
- startup: Action-oriented, breadth of skills, initiative and ownership, fast delivery
- enterprise: Process awareness, collaboration, reliability, stakeholder communication
- faang: Algorithmic thinking, system design concepts, measurable impact (only real numbers), scale awareness
- agency: Client focus, multi-project delivery, deadline awareness, portfolio breadth
- nonprofit: Mission alignment, resource efficiency, community impact, outcome focus

JSON SCHEMA (your output must match exactly):
${JSON_SCHEMA}

OUTPUT RULES:
- Return ONLY the JSON object. No markdown code fences, no explanation text, no preamble.
- Output fields in this exact order for progressive rendering:
  keywordsMatched -> keywordsMissing -> jobFitScore -> trustScore -> careerLevel -> skillGaps -> skillEvidence -> interviewRisks -> company -> role -> companyType -> optimizedResume

FIELD DEFINITIONS:
- Do NOT output any ATS score. The ATS "before" and "after" scores are computed outside this prompt, by measuring the resume text directly. Emitting them here would be ignored.
- jobFitScore: 0-100. How well candidate's actual underlying experience matches role requirements (independent of resume wording).
- trustScore: 0-100. Score the OPTIMIZED resume on how well its claims are backed by the original resume. 100 = every skill and claim is directly supported by the original. Aim for 85-95% when the candidate's actual experience supports the technical competencies.
- skillEvidence: Map EVERY key technical skill in the optimized resume to its evidence in the ORIGINAL resume. Format: { skill, evidence, confidence }. Confidence levels:
    high = built a project / used in internship / production work in original
    medium = coursework or academic project in original
    low = brief mention or implicit only in original
    claimed_only = listed as a skill but no project/coursework supports it
  Include exactly the 5 most important skills for this JD. This is the trust layer — be honest.
- interviewRisks: 0-3 entries. Skills or claims in the optimized resume that a recruiter could probe in interview where the candidate may struggle (e.g., listed React but no React project; mentioned AWS but only coursework). Each: { skill, reason } — reason should be one short sentence explaining why this is a risk.
- careerLevel: Infer from years of experience and seniority. Students/freshers = Junior.
- keywordsMatched: Important JD keywords found in the original resume (10-15 keywords).
- keywordsMissing: Important JD keywords NOT in the original resume (10-15 keywords).
  keywordsMatched + keywordsMissing together must represent the JD's comprehensive keyword requirements (15-25 keywords total) — extract them from the JOB DESCRIPTION, then split by whether the original resume contains them. Use the exact surface form from the JD (e.g. "REST APIs", "Node.js", "State Management"), not a paraphrase. These two lists drive the ATS score computation.
- skillGaps: Top 3 gaps ordered by importance. Each: skill, importance (Critical/High/Medium), reason (one actionable sentence).
- company: Company name extracted from JD.
- role: Job title extracted from JD.
- companyType: Classification from above.

- optimizedResume: A polished, ATS-optimized, high-caliber resume document built from the candidate's REAL experience.

  === MANDATORY STRUCTURE (in this exact order) ===

  1. CANDIDATE'S FULL NAME (at top)
  2. CONTACT LINE — phone | email | LinkedIn | GitHub | location (copy from original; retain existing links)

  3. PROFESSIONAL SUMMARY (3-4 impactful sentences)
     - Opening: Strong title and positioning tailored directly to the target role (e.g., "Performance-driven Full Stack Engineer with hands-on experience architecting scalable AI-driven web applications...")
     - Middle: Core technical competencies weaving high-priority JD keywords (e.g. Next.js, React, TypeScript, RESTful APIs, SQL query optimization, LLM integration)
     - Close: Impact and problem-solving strengths (hackathon achievements, agile delivery, system design focus)

  4. TECHNICAL SKILLS
     - Categorize with clean headings:
       Languages: ...
       Frontend: ...
       Backend & APIs: ...
       Databases & Storage: ...
       AI & Machine Learning: ...
       DevOps & Tools: ...
     - Include every skill from the original resume AND actively incorporate missing JD keywords that align with the candidate's actual projects, coursework, and internship domains (e.g. State Management, Component-Driven Architecture, Responsive Design, RESTful API Design, Query Optimization, Automated Testing, Agile & Scrum).

  5. EXPERIENCE & INTERNSHIPS — use the EXACT employer names and dates from the original
     - 2-4 high-impact bullet points per role
     - Bullet quality: Each bullet should be 18-28 words, following the Google X-Y-Z formula: [Strong Action Verb] + [What technical feature/system was developed using specific technologies/JD keywords] + [Quantified result, metric, or measurable outcome]
     - Every bullet MUST open with a strong action verb (Architected, Engineered, Developed, Implemented, Streamlined, Automated, Optimized, Formulated, Conducted, Administered, Spearheaded)
     - Embed JD keywords naturally into the descriptions

  6. PROJECTS (only projects present in the original resume)
     - Format: Project Name | Tech Stack | (Recognition/Year if available)
     - 3-4 comprehensive bullets per project (18-28 words each)
     - Detail the architecture, specific features built, problem solved, and technical stack used, incorporating relevant JD keywords
     - Highlight hackathon wins, prizes, and measurable outcomes

  7. EDUCATION — copy from original, add relevant coursework aligned with JD

  8. CERTIFICATIONS — copy from original

  9. ACHIEVEMENTS (if present in original) — keep honest, highlight hackathon awards, prizes, competitive problem solving

  === CRITICAL RULES ===
  - The optimized resume MUST actively incorporate the JD's missing keywords into the Skills, Project bullets, and Summary wherever supported by the candidate's actual work
  - NEVER fabricate employers, degrees, or certifications not listed in the original resume
  - Bullet length: Keep bullets between 18-28 words. Do NOT write tiny, truncated fragments. Deliver substantive technical depth
  - Default target length by career level. This is a DEFAULT ONLY: if the user message contains a "RESUME LENGTH REQUIREMENT" block, that requirement wins outright and these numbers do not apply at any seniority:
      Junior/Fresher: ~380-500 words — tight, clean, fits 1 page
      Mid (2-5 years): ~550-800 words — 1 to 1.5 pages
      Senior (5+ years): ~800-1,200 words — up to 2 pages
  - Use plain text with \\n for line breaks. Section headers in UPPERCASE.
  - The resume must be something the candidate can speak to confidently and proudly in an interview.

EXAMPLE (Fresher -> Web Developer role):
Input resume: B.Tech CS student, Python/React/Node.js basics, 1 ML internship, 2 small projects
Input JD: Web Developer — HTML, CSS, JavaScript, React, Node.js, REST APIs, responsive design, Git
Output: {"jobFitScore":38,"careerLevel":"Junior","keywordsMatched":["HTML","CSS","JavaScript","ReactJS","Node.js","MongoDB","SQL","Git","REST APIs"],"keywordsMissing":["Responsive Design","API Integration","Debugging","Cross-browser Compatibility","Version Control","Agile","TypeScript","Testing","Performance Optimization","SEO"],"skillGaps":[{"skill":"Responsive Design","importance":"Critical","reason":"JD emphasizes mobile/tablet/desktop layouts; candidate's projects don't demonstrate this explicitly."},{"skill":"API Integration","importance":"High","reason":"REST API integration is core to the role; worth highlighting from existing project work."},{"skill":"Testing & Debugging","importance":"High","reason":"Quality checks and bug fixing are listed requirements; debugging experience should be surfaced."}],"company":"General","role":"Web Developer","companyType":"startup","optimizedResume":"N V S VAMSI TEJA\\n+91 8143597697 | Email | github.com/nvsvamsiteja | linkedin.com/in/nvsvamsiteja | Pedapatnam, Andhra Pradesh\\n\\nPROFESSIONAL SUMMARY\\nEntry-level Web Developer with hands-on experience building full-stack web applications using React, Node.js, and JavaScript. Skilled in responsive design, REST API integration, and writing clean, maintainable code across frontend and backend layers. Backed by a B.Tech in Computer Science (CGPA: 8.2) and additional exposure to machine learning and AI technologies.\\n\\nTECHNICAL SKILLS\\nFrontend: HTML5, CSS3, JavaScript (ES6+), ReactJS, Responsive Design, Flexbox, CSS Grid\\nBackend: Node.js, REST APIs, API Integration, Authentication & Authorization\\nDatabases: MongoDB, SQL, MySQL\\nTools: Git, GitHub, VS Code, Android Studio, Postman\\nConcepts: Data Structures & Algorithms, OOP, Agile Development, Debugging & Optimization\\nAdditional: Python, Flutter, Machine Learning Fundamentals, OpenAI GPT Models, Prompt Engineering\\n\\nEXPERIENCE\\nMachine Learning Intern — Talent Shine (July 2025)\\n• Implemented supervised learning algorithms in Python including regression and classification models, applying data preprocessing and feature engineering techniques\\n• Built and evaluated ML models using real datasets, debugging performance issues and applying optimization techniques to improve accuracy\\n• Completed multiple mini-projects in a fully remote environment within a 1-month internship timeline, demonstrating self-directed learning and time management\\n• Documented model evaluation results and presented findings, practicing structured technical communication\\n\\nPROJECTS\\nWeb Application | React, Node.js, MongoDB\\n• Developed a full-stack web application with user authentication and REST API integration, implementing JWT-based authorization and session management\\n• Designed responsive layouts using Flexbox and CSS Grid, ensuring compatibility across mobile, tablet, and desktop viewports\\n• Integrated third-party API services and applied basic security practices for user data protection during authentication flows\\n• Performed manual testing and debugging across key user flows to identify and resolve UI and logic issues\\n\\nAndroid Application | Flutter\\n• Built a cross-platform mobile application using Flutter with a clean, user-friendly interface following Material Design principles\\n• Applied responsive design principles and conducted debugging to deliver a stable, functional product across Android devices\\n\\nEDUCATION\\nB.Tech in Computer Science Engineering — Bonna Venkata Chalamayya Institute | CGPA: 8.2/10.0\\nRelevant Coursework: Data Structures & Algorithms, OOP, Database Management Systems, Computer Networks, Web Technologies\\nDiploma in Computer Science — Bonna Venkata Chalamayya Institute | 67%\\nSSC — ZPHS Boys High School | CGPA: 7.7/10.0\\n\\nCERTIFICATIONS\\n• Machine Learning Internship Certificate — Talent Shine (July 2025)\\n• Introduction to OpenAI GPT Models — Infosys Springboard\\n• Prompt Engineering — Infosys Springboard\\n• GPT-3 for Developers\\n• AI-First Software Engineering\\n\\nACHIEVEMENTS\\n• Solved 50+ problems on LeetCode, HackerRank, and coding platforms\\n• Achieved 5-star rating in Python on HackerRank"}`;

// claude-sonnet-4-5 pricing: $3/M input, $15/M output (as of 2026-04)
const SONNET_INPUT_USD_PER_TOKEN = 3 / 1_000_000;
const SONNET_OUTPUT_USD_PER_TOKEN = 15 / 1_000_000;
// Cache writes cost 1.25x base input; cache reads cost 0.1x.
const CACHE_WRITE_MULTIPLIER = 1.25;
const CACHE_READ_MULTIPLIER = 0.1;

export const MODEL_NAME = 'claude-sonnet-4-5';

// Cheap model for calls where the output is triage/short-form, not the product.
export const CHEAP_MODEL_NAME = 'claude-haiku-4-5';
const HAIKU_INPUT_USD_PER_TOKEN = 1 / 1_000_000;
const HAIKU_OUTPUT_USD_PER_TOKEN = 5 / 1_000_000;

export type CostBreakdown = {
  inputTokens: number;
  outputTokens: number;
  cacheCreationTokens?: number;
  cacheReadTokens?: number;
  model?: string;
};

export function costUsd(
  inputTokens: number,
  outputTokens: number,
  opts?: { cacheCreationTokens?: number; cacheReadTokens?: number; model?: string }
): number {
  const isCheap = opts?.model === CHEAP_MODEL_NAME;
  const inRate = isCheap ? HAIKU_INPUT_USD_PER_TOKEN : SONNET_INPUT_USD_PER_TOKEN;
  const outRate = isCheap ? HAIKU_OUTPUT_USD_PER_TOKEN : SONNET_OUTPUT_USD_PER_TOKEN;

  return (
    inputTokens * inRate +
    outputTokens * outRate +
    (opts?.cacheCreationTokens ?? 0) * inRate * CACHE_WRITE_MULTIPLIER +
    (opts?.cacheReadTokens ?? 0) * inRate * CACHE_READ_MULTIPLIER
  );
}

export type UsageCounters = {
  input_tokens: number;
  output_tokens: number;
  cache_creation_input_tokens: number;
  cache_read_input_tokens: number;
};

/* ── Resume length enforcement ──────────────────────────────────────────
   A prompt instruction is a request, not a guarantee — the model overshoots
   on senior candidates with a lot of real experience. These budgets are the
   contract: generation asks for them, and the analyze route verifies the
   result and compresses it when the model ignores them.

   maxWords is calibrated to lib/pdf.ts (LETTER, 54pt margins, 10pt Helvetica):
   roughly 54 usable lines per page, and section headers, rules and blank
   lines consume a meaningful share of them. */
export const LENGTH_BUDGETS: Record<string, { maxWords: number; targetWords: string }> = {
  '1page': { maxWords: 520, targetWords: '380-460 words' },
  '2page': { maxWords: 950, targetWords: '700-850 words' },
};

export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/** Does this resume text bust the budget for the requested length? */
export function exceedsLengthBudget(resumeText: string, resumeLength?: string): boolean {
  const budget = resumeLength ? LENGTH_BUDGETS[resumeLength] : undefined;
  if (!budget) return false;
  return countWords(resumeText) > budget.maxWords;
}

const COMPRESS_SYSTEM = `You compress an already-written resume so it fits a hard word budget, without weakening it.

RULES:
- Output ONLY the compressed resume as plain text. No preamble, no explanation, no markdown fences.
- Keep the exact same structure and section order, and keep every section header.
- NEVER remove or alter: the candidate's name, the contact line, EDUCATION, or CERTIFICATIONS.
- NEVER invent anything. You may only cut and tighten what is already there.
- Cut in this order until you are under budget:
  1. The weakest bullets (keep 2-3 per role, not 4)
  2. The oldest roles beyond the most recent 3
  3. The weakest projects (keep the 2 strongest)
  4. Tighten the summary to 2 sentences
  5. Compress the skills block onto fewer pipe-separated lines
- Keep bullets concise (under 28 words). Preserve real metrics and job-description keywords.`;

/** Deterministic backstop: force an over-long resume under budget. Uses free-tier router. */
export async function compressResumeToBudget(
  resumeText: string,
  maxWords: number
): Promise<{ text: string; usage: UsageCounters }> {
  try {
    const outcome = await route('resume-compress', {
      system: COMPRESS_SYSTEM,
      messages: [
        {
          role: 'user',
          content: `Hard budget: ${maxWords} words. This resume is currently ${countWords(resumeText)} words — cut it to under ${maxWords}.\n\n${resumeText}`,
        },
      ],
      maxTokens: 4096,
    });

    return {
      text: outcome.text.trim(),
      usage: {
        input_tokens: outcome.usage.inputTokens,
        output_tokens: outcome.usage.outputTokens,
        cache_creation_input_tokens: 0,
        cache_read_input_tokens: 0,
      },
    };
  } catch (error) {
    if (process.env.ANTHROPIC_API_KEY) {
      const message = await getAnthropicClient().messages.create({
        model: CHEAP_MODEL_NAME,
        max_tokens: 4096,
        system: COMPRESS_SYSTEM,
        messages: [
          {
            role: 'user',
            content: `Hard budget: ${maxWords} words. This resume is currently ${countWords(resumeText)} words — cut it to under ${maxWords}.\n\n${resumeText}`,
          },
        ],
      });

      const text = message.content[0].type === 'text' ? message.content[0].text.trim() : '';
      return {
        text,
        usage: {
          input_tokens: message.usage.input_tokens,
          output_tokens: message.usage.output_tokens,
          cache_creation_input_tokens: message.usage.cache_creation_input_tokens ?? 0,
          cache_read_input_tokens: message.usage.cache_read_input_tokens ?? 0,
        },
      };
    }
    throw error;
  }
}

export type AnalysisStream = {
  textStream: AsyncIterable<string>;
  usage: UsageCounters; // mutated as the stream consumes; read after iteration completes
};

export async function streamAnalysis(
  resumeText: string,
  jobDescription: string,
  options?: { instructions?: string; resumeLength?: string; skipInterviewRisks?: boolean }
): Promise<AnalysisStream> {
  const instructionBlock = options?.instructions
    ? `\n\nCANDIDATE NOTES (incorporate these into the optimized resume):\n${options.instructions}`
    : '';

  const lengthBlock = options?.resumeLength && options.resumeLength !== 'auto'
    ? `\n\nRESUME LENGTH REQUIREMENT (HARD CONSTRAINT — overrides the career-level default length in the system prompt, including for Senior and Executive candidates):\n${
        options.resumeLength === '1page'
          ? `The optimizedResume MUST fit on ONE page. Hard ceiling: ${LENGTH_BUDGETS['1page'].maxWords} words total, including the name, contact line and all section headers. Aim for ${LENGTH_BUDGETS['1page'].targetWords}.
This is not a preference and not a target to approach from above — going over is a failure.
To hit it, in this order: cut the weakest bullets entirely (keep 2-3 per role, not 4), drop roles older than the most recent 3, keep only the 2 strongest projects, compress the summary to 2 sentences, and put skills on one compact pipe-separated block.
Never shrink it by deleting the name, contact line, education, or certifications.
Before you emit optimizedResume, count its words. If the count is above ${LENGTH_BUDGETS['1page'].maxWords}, cut more and re-check.`
          : options.resumeLength === '2page'
          ? `The optimizedResume MUST fit within TWO pages. Hard ceiling: ${LENGTH_BUDGETS['2page'].maxWords} words total. Aim for ${LENGTH_BUDGETS['2page'].targetWords}. Going over is a failure — cut the weakest bullets until it fits.`
          : options.resumeLength === 'academic'
          ? 'Academic CV format — include all publications, coursework, and research; length not restricted.'
          : ''
      }`
    : '';

  // Keyword-stuffing mode: aggressively maximize ATS keyword density.
  // The user has been explicitly warned this is risky in the UI.
  const keywordStuffBlock = options?.resumeLength === 'keyword-stuffing'
    ? `\n\nKEYWORD-STUFFING MODE (user explicitly opted in, warned of risk):
- Maximize ATS keyword coverage above all else. Weave EVERY important keyword and phrase from the job description into the resume.
- Add a dense "Core Competencies" / "Technical Skills" block near the top listing all JD keywords the candidate can plausibly claim.
- Repeat critical JD keywords naturally across the summary, skills, and bullet points so ATS keyword-frequency scoring is maximized.
- Stay within the bounds of the candidate's real experience — do NOT invent jobs, employers, degrees, or fabricated metrics. Re-frame and surface existing experience using JD vocabulary.
- This optimizes for ATS pass-through (target 90%+ keyword match), accepting that a human recruiter may find the density heavy-handed.`
    : '';

  const skipRisksBlock = options?.skipInterviewRisks
    ? '\n\nNOTE: Free tier active. Omit interviewRisks — return "interviewRisks": [].'
    : '';

  const userPrompt = `Resume:\n${resumeText}\n\nJob Description:\n${jobDescription}${instructionBlock}${lengthBlock}${keywordStuffBlock}${skipRisksBlock}`;

  const outcome = await routeStream('resume-analysis', {
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userPrompt }],
    maxTokens: 8192,
    temperature: 0,
    json: true,
  });

  const usage: UsageCounters = {
    input_tokens: outcome.usage.inputTokens,
    output_tokens: outcome.usage.outputTokens,
    cache_creation_input_tokens: 0,
    cache_read_input_tokens: 0,
  };

  return { textStream: outcome.textStream, usage };
}
