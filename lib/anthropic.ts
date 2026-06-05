import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

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

export const AnalysisResultSchema = z.object({
  atsScore: z.number().min(0).max(100),
  optimizedAtsScore: z.number().min(0).max(100),
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

export const SYSTEM_PROMPT = `You are an expert resume strategist. Your mission: take a candidate's resume and rewrite it to be the strongest honest version of itself — optimized for ATS systems and the specific job description, without fabricating experience or inflating credentials.

YOUR CORE PRINCIPLE: Surface genuine value clearly. A student who built a to-do app learned real skills — component architecture, API integration, debugging, responsive design. Your job is to articulate those real skills using the exact language recruiters and ATS systems look for. Never invent metrics, projects, or experience that isn't in the original resume.

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
  atsScore -> optimizedAtsScore -> jobFitScore -> trustScore -> careerLevel -> keywordsMatched -> keywordsMissing -> skillGaps -> skillEvidence -> interviewRisks -> company -> role -> companyType -> optimizedResume

FIELD DEFINITIONS:
- atsScore: 0-100. Score the ORIGINAL (unmodified) resume against the JD. This is the "before" score. Be honest — most unoptimized resumes score 20-50%.
- optimizedAtsScore: 0-100. Score the OPTIMIZED resume (the one you are writing in optimizedResume) against the JD. This is the "after" score and should be HIGH — typically 82-95 — because the optimized resume is tailored to the JD, embeds matched keywords, and uses ATS-friendly formatting. It must always be meaningfully higher than atsScore (the whole point is to show improvement). Never make it lower than atsScore.
- jobFitScore: 0-100. How well candidate's actual underlying experience matches role requirements (independent of resume wording).
- trustScore: 0-100. Score the OPTIMIZED resume on how well its claims are backed by the original resume. 100 = every skill and claim is directly supported by the original. Lower the score for: skills added without project/coursework basis, inflated language, generic claims with no evidence. Be strict — a resume that adds "AWS" or "React" without proof should score below 70.
- skillEvidence: Map EVERY key technical skill in the optimized resume to its evidence in the ORIGINAL resume. Format: { skill, evidence, confidence }. Confidence levels:
    high = built a project / used in internship / production work in original
    medium = coursework or academic project in original
    low = brief mention or implicit only in original
    claimed_only = listed as a skill but no project/coursework supports it (this is risky — flag honestly)
  Include 5-12 of the most important skills for this JD. This is the trust layer — be honest.
- interviewRisks: 0-5 entries. Skills or claims in the optimized resume that a recruiter could probe in interview where the candidate may struggle (e.g., listed React but no React project; mentioned AWS but only coursework). Each: { skill, reason } — reason should be one sentence explaining why this is a risk.
- careerLevel: Infer from years of experience and seniority. Students/freshers = Junior.
- keywordsMatched: Important JD keywords found in the original resume (max 15).
- keywordsMissing: Important JD keywords NOT in the original resume (max 15).
- skillGaps: Top 3-5 gaps ordered by importance. Each: skill, importance (Critical/High/Medium), reason (one actionable sentence).
- company: Company name extracted from JD.
- role: Job title extracted from JD.
- companyType: Classification from above.

- optimizedResume: A polished, ATS-optimized resume document built from the candidate's REAL experience.

  === MANDATORY STRUCTURE (in this exact order) ===

  1. CANDIDATE'S FULL NAME
  2. CONTACT LINE — phone | email | LinkedIn | GitHub | location (copy exactly from original; do not invent)

  3. PROFESSIONAL SUMMARY (3-4 sentences)
     - Opening: honest seniority label + role title + key strength (e.g., "Entry-level Web Developer with hands-on experience building...")
     - Middle: 2-3 relevant skills or technologies from their actual background, woven with JD keywords
     - Close: what they bring to the role
     - Junior/fresher tone: confident and grounded, NOT inflated ("proven track record of enterprise-scale...")

  4. TECHNICAL SKILLS
     - Single compact block — do NOT use multi-line rows. Format: "Languages: Python, JavaScript | Frontend: React, HTML5, CSS3 | Backend: Node.js, REST APIs | Tools: Git, VS Code"
     - Use pipe "|" to separate categories on the same line — keeps it scannable and space-efficient
     - Include every skill from the original resume; add JD keywords the candidate can genuinely claim from coursework or projects
     - Do NOT add skills with no basis in their background

  5. EXPERIENCE (for paid roles/internships) — use the EXACT employer names and dates from the original
     - 3-4 bullet points per role maximum — quality beats quantity
     - Each bullet = ONE line (under 15 words). Format: Verb + what + how/outcome. Example: "Built REST API endpoints with Node.js, reducing data fetch time by 30%"
     - Metrics: use ONLY numbers that appear verbatim in the original resume. If no metric exists, describe the impact qualitatively ("enabling faster data retrieval") — NEVER invent percentages, user counts, uptime figures, or request rates
     - Power verbs scaled to seniority — Junior: Built, Developed, Implemented, Designed, Integrated, Debugged, Created; Senior: Architected, Led, Spearheaded, Scaled
     - Embed JD keywords naturally where the actual work supports it — do not force-fit keywords that don't match

  6. PROJECTS (only projects present in the original resume)
     - Format: Project Name | Tech Stack | (Year if available)
     - 2-3 bullets per project — each under 15 words
     - Honest framing: describe what was actually built and what skills it demonstrates. Example: "Implemented JWT authentication with bcrypt password hashing for secure user login"
     - NEVER add projects not mentioned by the candidate
     - NEVER invent scale claims ("10,000 users", "99% uptime") for student/personal projects

  7. EDUCATION — copy exactly from original, add relevant coursework aligned with JD

  8. CERTIFICATIONS — copy exactly from original; do not add certifications not listed

  9. ACHIEVEMENTS (if present in original) — keep honest, expand context if helpful

  === CRITICAL RULES ===
  - NEVER fabricate metrics. No invented percentages, user counts, uptime figures, request rates, or team sizes unless the original resume states them explicitly
  - NEVER add projects, employers, certifications, or skills not present in the original resume
  - NEVER use enterprise-scale language for student/fresher projects — phrases like "serving 50,000 users", "99.9% uptime", "reduced latency by 40%" are fabricated and will embarrass the candidate in interviews
  - ALWAYS start with the candidate's name
  - Bullet length: keep every bullet under 15 words. If you find yourself writing a long bullet, split it or cut the weaker half
  - Target length by career level:
      Junior/Fresher: ~350-500 words — tight, clean, fits 1 page
      Mid (2-5 years): ~550-800 words — 1 to 1.5 pages
      Senior (5+ years): ~800-1,200 words — up to 2 pages
  - Use plain text with \\n for line breaks. Section headers in UPPERCASE.
  - Incorporate JD keywords naturally — do not keyword-stuff or pad bullets
  - The resume must be something the candidate can speak to confidently and honestly in an interview

EXAMPLE (Fresher -> Web Developer role):
Input resume: B.Tech CS student, Python/React/Node.js basics, 1 ML internship, 2 small projects
Input JD: Web Developer — HTML, CSS, JavaScript, React, Node.js, REST APIs, responsive design, Git
Output: {"atsScore":32,"optimizedAtsScore":88,"jobFitScore":38,"careerLevel":"Junior","keywordsMatched":["HTML","CSS","JavaScript","ReactJS","Node.js","MongoDB","SQL","Git","REST APIs"],"keywordsMissing":["Responsive Design","API Integration","Debugging","Cross-browser Compatibility","Version Control","Agile","TypeScript","Testing","Performance Optimization","SEO"],"skillGaps":[{"skill":"Responsive Design","importance":"Critical","reason":"JD emphasizes mobile/tablet/desktop layouts; candidate's projects don't demonstrate this explicitly."},{"skill":"API Integration","importance":"High","reason":"REST API integration is core to the role; worth highlighting from existing project work."},{"skill":"Testing & Debugging","importance":"High","reason":"Quality checks and bug fixing are listed requirements; debugging experience should be surfaced."}],"company":"General","role":"Web Developer","companyType":"startup","optimizedResume":"N V S VAMSI TEJA\\n+91 8143597697 | Email | github.com/nvsvamsiteja | linkedin.com/in/nvsvamsiteja | Pedapatnam, Andhra Pradesh\\n\\nPROFESSIONAL SUMMARY\\nEntry-level Web Developer with hands-on experience building full-stack web applications using React, Node.js, and JavaScript. Skilled in responsive design, REST API integration, and writing clean, maintainable code across frontend and backend layers. Backed by a B.Tech in Computer Science (CGPA: 8.2) and additional exposure to machine learning and AI technologies.\\n\\nTECHNICAL SKILLS\\nFrontend: HTML5, CSS3, JavaScript (ES6+), ReactJS, Responsive Design, Flexbox, CSS Grid\\nBackend: Node.js, REST APIs, API Integration, Authentication & Authorization\\nDatabases: MongoDB, SQL, MySQL\\nTools: Git, GitHub, VS Code, Android Studio, Postman\\nConcepts: Data Structures & Algorithms, OOP, Agile Development, Debugging & Optimization\\nAdditional: Python, Flutter, Machine Learning Fundamentals, OpenAI GPT Models, Prompt Engineering\\n\\nEXPERIENCE\\nMachine Learning Intern — Talent Shine (July 2025)\\n• Implemented supervised learning algorithms in Python including regression and classification models, applying data preprocessing and feature engineering techniques\\n• Built and evaluated ML models using real datasets, debugging performance issues and applying optimization techniques to improve accuracy\\n• Completed multiple mini-projects in a fully remote environment within a 1-month internship timeline, demonstrating self-directed learning and time management\\n• Documented model evaluation results and presented findings, practicing structured technical communication\\n\\nPROJECTS\\nWeb Application | React, Node.js, MongoDB\\n• Developed a full-stack web application with user authentication and REST API integration, implementing JWT-based authorization and session management\\n• Designed responsive layouts using Flexbox and CSS Grid, ensuring compatibility across mobile, tablet, and desktop viewports\\n• Integrated third-party API services and applied basic security practices for user data protection during authentication flows\\n• Performed manual testing and debugging across key user flows to identify and resolve UI and logic issues\\n\\nAndroid Application | Flutter\\n• Built a cross-platform mobile application using Flutter with a clean, user-friendly interface following Material Design principles\\n• Applied responsive design principles and conducted debugging to deliver a stable, functional product across Android devices\\n\\nEDUCATION\\nB.Tech in Computer Science Engineering — Bonna Venkata Chalamayya Institute | CGPA: 8.2/10.0\\nRelevant Coursework: Data Structures & Algorithms, OOP, Database Management Systems, Computer Networks, Web Technologies\\nDiploma in Computer Science — Bonna Venkata Chalamayya Institute | 67%\\nSSC — ZPHS Boys High School | CGPA: 7.7/10.0\\n\\nCERTIFICATIONS\\n• Machine Learning Internship Certificate — Talent Shine (July 2025)\\n• Introduction to OpenAI GPT Models — Infosys Springboard\\n• Prompt Engineering — Infosys Springboard\\n• GPT-3 for Developers\\n• AI-First Software Engineering\\n\\nACHIEVEMENTS\\n• Solved 50+ problems on LeetCode, HackerRank, and coding platforms\\n• Achieved 5-star rating in Python on HackerRank"}`;

// claude-sonnet-4-5 pricing: $3/M input, $15/M output (as of 2026-04)
const SONNET_INPUT_USD_PER_TOKEN = 3 / 1_000_000;
const SONNET_OUTPUT_USD_PER_TOKEN = 15 / 1_000_000;

export const MODEL_NAME = 'claude-sonnet-4-5';

export function costUsd(inputTokens: number, outputTokens: number): number {
  return (
    inputTokens * SONNET_INPUT_USD_PER_TOKEN +
    outputTokens * SONNET_OUTPUT_USD_PER_TOKEN
  );
}

export type UsageCounters = { input_tokens: number; output_tokens: number };

export type AnalysisStream = {
  textStream: AsyncIterable<string>;
  usage: UsageCounters; // mutated as the stream consumes; read after iteration completes
};

export async function streamAnalysis(
  resumeText: string,
  jobDescription: string,
  options?: { instructions?: string; resumeLength?: string }
): Promise<AnalysisStream> {
  const instructionBlock = options?.instructions
    ? `\n\nCANDIDATE NOTES (incorporate these into the optimized resume):\n${options.instructions}`
    : '';

  const lengthBlock = options?.resumeLength && options.resumeLength !== 'auto'
    ? `\n\nRESUME LENGTH PREFERENCE: ${
        options.resumeLength === '1page' ? 'Target exactly 1 page (350-500 words max)' :
        options.resumeLength === '2page' ? 'Target 1-2 pages (up to 800 words)' :
        options.resumeLength === 'academic' ? 'Academic CV format — include all publications, coursework, and research; length not restricted' :
        ''
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

  const stream = await getAnthropicClient().messages.create({
    model: MODEL_NAME,
    max_tokens: 8192,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `Resume:\n${resumeText}\n\nJob Description:\n${jobDescription}${instructionBlock}${lengthBlock}${keywordStuffBlock}`,
      },
    ],
    stream: true,
  });

  const usage: UsageCounters = { input_tokens: 0, output_tokens: 0 };

  async function* textStream() {
    for await (const event of stream) {
      if (event.type === 'message_start') {
        usage.input_tokens = event.message.usage.input_tokens;
        usage.output_tokens = event.message.usage.output_tokens;
      } else if (event.type === 'message_delta') {
        usage.output_tokens = event.usage.output_tokens;
      } else if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        yield event.delta.text;
      }
    }
  }

  return { textStream: textStream(), usage };
}
