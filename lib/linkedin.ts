import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { getAnthropicClient } from './anthropic';

/* ──────────────────────────────────────────────────────────
   LinkedIn Optimizer — turns a scraped/pasted LinkedIn profile
   (plus optional resume + target role/JD) into recruiter-ready,
   keyword-rich content for every editable profile section.
   ────────────────────────────────────────────────────────── */

const ExperienceRewriteSchema = z.object({
  title: z.string(),
  company: z.string(),
  bullets: z.array(z.string()), // 3-4 optimized bullet points
});

export const LinkedInResultSchema = z.object({
  // Headline: 3 variations, each ≤ 220 chars (LinkedIn limit)
  headlines: z.array(z.string()).min(1).max(3),
  // About / Summary: first-person, 250-350 words
  about: z.string(),
  // Experience: rewritten bullets per role
  experience: z.array(ExperienceRewriteSchema),
  // Skills to add to the LinkedIn Skills section (max 20)
  skills: z.array(z.string()),
  // Quick-win profile tips specific to this person
  tips: z.array(z.string()),
});

export type LinkedInResult = z.infer<typeof LinkedInResultSchema>;

const JSON_SCHEMA = JSON.stringify(
  zodToJsonSchema(LinkedInResultSchema, 'LinkedInResult'),
  null,
  2
);

/* Raw profile the extension scrapes (or the user pastes). All optional —
   the optimizer works with whatever is provided. */
export type LinkedInProfileInput = {
  name?: string;
  headline?: string;
  about?: string;
  experience?: { title?: string; company?: string; description?: string }[];
  skills?: string[];
  education?: string;
  // Supporting context
  resumeText?: string;
  targetRole?: string;
  jobDescription?: string;
};

const SYSTEM_PROMPT = `You are an elite LinkedIn profile strategist. Recruiters use LinkedIn search and keyword matching to find candidates, and a strong profile gets 5-10x more recruiter views. Your job: rewrite a person's LinkedIn profile sections so they rank higher in recruiter search and read as compelling, credible, and human — WITHOUT fabricating experience.

CORE PRINCIPLES:
- LinkedIn is NOT a resume. It is first-person, warmer, and tells a career story. Write "I" not bullet fragments in the About section.
- Maximize keyword coverage for recruiter search (role titles, skills, tools) using ONLY skills the person genuinely has, drawn from their profile and resume.
- Never invent jobs, employers, metrics, degrees, or skills with no basis in the provided material. Reframe and surface real experience.
- Sound like a real person, not a buzzword generator. Avoid "results-driven synergistic thought leader" clichés.

SECTION RULES:

1. HEADLINES (generate exactly 3 variations, each ≤ 220 characters):
   - Formula options: "[Role] | [Specialty/Stack] | [Value or Outcome]" or "[Role] helping [who] [achieve what]"
   - Pack in the most important searchable keywords (role title + top skills) near the front.
   - If a target role is given, orient headlines toward it. Vary the three: one keyword-dense, one outcome-focused, one personality-forward.

2. ABOUT (250-350 words, first person):
   - Hook in the first 2 lines (this is all that shows before "see more").
   - Tell the career story: what they do, the skills/tools they use, what drives them, and what they want next.
   - Weave in searchable keywords naturally. End with a soft call to action ("Open to ... / Let's connect about ...").
   - Use short paragraphs and the occasional line break for readability. No corporate jargon.

3. EXPERIENCE (rewrite each role; 3-4 bullets each):
   - Each bullet: strong verb + what you did + impact. Keep LinkedIn-friendly (slightly fuller than resume bullets but still tight).
   - Use ONLY metrics present in the source. If none, describe impact qualitatively. Never fabricate numbers.
   - Embed role-relevant keywords. Keep the exact title and company from the source.
   - SOURCE PRIORITY: If LinkedIn experience entries are provided, rewrite those. If none are provided but a RESUME is, derive 2-4 experience entries (title, company, bullets) directly from the resume's work history, internships, or projects. Only return an empty experience array if there is genuinely no work history in either source.

4. SKILLS (up to 20):
   - The most valuable, searchable skills for this person and (if given) the target role.
   - Order by importance for recruiter search. Only skills supported by their profile/resume.

5. TIPS (3-5 short, specific quick wins):
   - Concrete actions for THIS profile (e.g., "Add a banner image", "Turn on Open to Work for [role]", "Request 2 recommendations from past managers").

JSON SCHEMA (your output MUST match exactly):
${JSON_SCHEMA}

OUTPUT RULES:
- Return ONLY the JSON object. No markdown fences, no preamble, no trailing commentary.
- Field order: headlines -> about -> experience -> skills -> tips`;

/* Free tier gets a lighter prompt (headline + skills + tips only) to save
   tokens; About + Experience rewrites are the paid upgrade. */
const FREE_TIER_NOTE = `

TIER: FREE PREVIEW. Generate strong headlines, skills, and tips. For "about" return a single compelling 2-sentence teaser (not the full summary). Return an empty "experience" array. The full About rewrite and per-role Experience rewrites are reserved for paid plans.`;

function buildUserMessage(input: LinkedInProfileInput): string {
  const parts: string[] = [];

  if (input.name) parts.push(`NAME: ${input.name}`);
  if (input.headline) parts.push(`CURRENT HEADLINE:\n${input.headline}`);
  if (input.about) parts.push(`CURRENT ABOUT:\n${input.about}`);

  if (input.experience?.length) {
    const exp = input.experience
      .map((e, i) => {
        const head = [e.title, e.company].filter(Boolean).join(' at ');
        return `  ${i + 1}. ${head || 'Role'}\n     ${e.description ?? '(no description)'}`;
      })
      .join('\n');
    parts.push(`CURRENT EXPERIENCE:\n${exp}`);
  }

  if (input.skills?.length) parts.push(`CURRENT SKILLS: ${input.skills.join(', ')}`);
  if (input.education) parts.push(`EDUCATION:\n${input.education}`);
  if (input.resumeText) parts.push(`RESUME (supporting evidence — use to surface real skills):\n${input.resumeText}`);
  if (input.targetRole) parts.push(`TARGET ROLE: ${input.targetRole}`);
  if (input.jobDescription) parts.push(`TARGET JOB DESCRIPTION:\n${input.jobDescription}`);

  return parts.join('\n\n');
}

export type LinkedInOptimizeResult = {
  result: LinkedInResult;
  usage: { input_tokens: number; output_tokens: number };
};

export async function optimizeLinkedIn(
  input: LinkedInProfileInput,
  opts: { freeTier: boolean }
): Promise<LinkedInOptimizeResult> {
  const system = SYSTEM_PROMPT + (opts.freeTier ? FREE_TIER_NOTE : '');

  const message = await getAnthropicClient().messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 4096,
    system,
    messages: [{ role: 'user', content: buildUserMessage(input) }],
  });

  const block = message.content?.[0];
  const raw = block?.type === 'text' ? block.text.trim() : '';

  // Strip any accidental code fences before parsing
  const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error('Model returned invalid JSON');
  }

  const result = LinkedInResultSchema.parse(parsed);

  return {
    result,
    usage: {
      input_tokens: message.usage?.input_tokens ?? 0,
      output_tokens: message.usage?.output_tokens ?? 0,
    },
  };
}
