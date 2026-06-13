import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/rate-limit';
import { getAnthropicClient, MODEL_NAME } from '@/lib/anthropic';
import { canScan } from '@/lib/usage';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

interface JobMatch {
  title: string;
  company: string;
  location: string;
  jobUrl: string;
  portal: string;
  fitScore: number;
  fitReason: string;
  matchingSkills: string[];
  missingSkills: string[];
}

export async function POST(req: NextRequest) {
  try {
    const { resumeText, query: reqQuery, location: reqLocation } = await req.json();

    if (!resumeText || resumeText.trim().length < 50) {
      return NextResponse.json({ error: 'Valid resume text is required (min 50 chars).' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // --- Rate limiting ---
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown';
    const rateLimitId = user ? `user:${user.id}` : `ip:${ip}`;
    const { success: withinRateLimit } = await checkRateLimit(rateLimitId);
    if (!withinRateLimit) {
      return NextResponse.json({ error: 'Too many requests — try again in an hour.' }, { status: 429 });
    }

    // --- Usage Quota Verification & Increment (Bypassed for testing) ---
    /*
    if (user) {
      // Reset monthly usage if it's a new month
      await supabase.rpc('reset_monthly_usage_if_needed', { profile_id: user.id });

      // Fetch user profile plan and usage
      const { data: profile } = await supabase
        .from('profiles')
        .select('plan, scans_used')
        .eq('id', user.id)
        .single();

      const plan = profile?.plan || 'free';
      const scansUsed = profile?.scans_used || 0;

      // Check scan limit
      if (!canScan(plan, scansUsed)) {
        return NextResponse.json(
          { error: 'limit_reached', message: 'You have reached your monthly scan limit. Please upgrade to Pro for unlimited scans.' },
          { status: 403 }
        );
      }

      // Increment scans_used
      const limit = plan === 'pro' ? 30 : plan === 'power' ? 100 : plan === 'team' ? -1 : 0;
      const { data: incremented } = await supabase.rpc('try_increment_scans_used', {
        p_user_id: user.id,
        p_limit: limit,
      });

      if (!incremented && limit !== -1) {
        return NextResponse.json(
          { error: 'limit_reached', message: 'Could not increment scan usage. Usage limit exceeded.' },
          { status: 403 }
        );
      }
    }
    */

    const anthropic = getAnthropicClient();

    // --- Extract target role & location if not provided ---
    let searchRole = reqQuery?.trim() || '';
    let searchLocation = reqLocation?.trim() || '';

    if (!searchRole && user) {
      // Attempt to retrieve from profile target roles
      const { data: profile } = await supabase
        .from('profiles')
        .select('target_roles, location')
        .eq('id', user.id)
        .single();

      if (profile?.target_roles && profile.target_roles.length > 0) {
        searchRole = profile.target_roles[0];
      }
      if (profile?.location) {
        searchLocation = profile.location;
      }
    }

    // If still empty, call Claude to extract target role
    if (!searchRole || !searchLocation) {
      try {
        const extractRes = await anthropic.messages.create({
          model: MODEL_NAME,
          max_tokens: 150,
          system: 'Extract the single most appropriate target job title/role for this candidate (e.g. "React Developer", "Data Analyst", "Node.js Developer") and their preferred location. Return ONLY a JSON object: {"role": "extracted title", "location": "extracted location"}. No other text or markdown code fences.',
          messages: [{ role: 'user', content: `Resume:\n${resumeText.slice(0, 4000)}` }],
        });

        const textRes = extractRes.content[0].type === 'text' ? extractRes.content[0].text : '';
        const cleanedText = textRes.replace(/^\s*```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
        const extracted = JSON.parse(cleanedText);
        
        if (!searchRole && extracted.role) searchRole = extracted.role;
        if (!searchLocation && extracted.location) searchLocation = extracted.location;
      } catch (e) {
        console.error('[job-scan] Failed to extract role/location:', e);
      }
    }

    // Default Fallbacks
    if (!searchRole) searchRole = 'Software Engineer';
    if (!searchLocation) searchLocation = 'India';

    // --- Call Jina Search ---
    const searchQuery = `${searchRole} jobs in ${searchLocation}`;
    const jinaUrl = `https://s.jina.ai/${encodeURIComponent(searchQuery)}`;
    
    console.log(`[job-scan] Query: ${searchQuery}`);
    let searchMarkdown = '';

    const jinaHeaders = {
      Authorization: `Bearer ${process.env.JINA_API_KEY}`,
      Accept: 'text/plain',
      'X-With-Images-Summary': 'false',
      'X-With-Links-Summary': 'false',
    };

    try {
      const jinaRes = await fetch(jinaUrl, {
        headers: jinaHeaders,
        signal: AbortSignal.timeout(20000), // 20s timeout
      });

      if (jinaRes.ok) {
        searchMarkdown = await jinaRes.text();
      } else {
        throw new Error(`Jina Search failed with status ${jinaRes.status}`);
      }
    } catch (e) {
      console.error('[job-scan] Jina Search fetch failed or timed out:', e);
    }

    if (!searchMarkdown || searchMarkdown.length < 200) {
      return NextResponse.json({ error: 'No job search results found. Try adjusting role or location.' }, { status: 404 });
    }

    console.log(`[job-scan] Jina Search results length: ${searchMarkdown.length}`);
    console.log(`[job-scan] Search result snippet:\n`, searchMarkdown.slice(0, 1000));

    // Truncate search results to keep within token limit (~90,000 chars)
    const truncatedMarkdown = searchMarkdown.slice(0, 90000);

    // --- Evaluate Fit with Claude 4.5 ---
    const evaluationPrompt = `You are an expert AI job matcher.
Your task is to take a candidate's resume and a list of job search results from the web (in Markdown format).
You will analyze the candidate's resume, and select up to 10 jobs from the search results that are the best potential matches for the candidate. For each of these selected jobs, you will:
1. Extract the Job Title, Company Name, Location, Job Application URL (jobUrl), and the Portal Source (e.g. LinkedIn, Naukri, Indeed, Glassdoor, Internshala).
2. Calculate a "Job Fit Score" (0 to 100) based on how well the candidate's skills, qualifications, and experience match the job requirements. Be realistic and honest:
   - Match exact tech skills.
   - Match experience level (e.g. if job requires 5+ years and they have 1 year, score is low).
   - Match location (e.g. if hybrid Bangalore and they are remote, score is lower).
3. Provide a brief 1-2 sentence explanation (fitReason) of the score.
4. Extract the matching technical/professional skills (matchingSkills) and missing technical/professional skills (missingSkills).

Output format:
Your output must be a valid JSON object matching this schema:
{
  "jobs": [
    {
      "title": "Job Title",
      "company": "Company Name",
      "location": "Location",
      "jobUrl": "URL to apply",
      "portal": "LinkedIn | Indeed | Naukri | Glassdoor | Internshala | Other",
      "fitScore": 85,
      "fitReason": "Explanation of fit...",
      "matchingSkills": ["React", "JavaScript"],
      "missingSkills": ["TypeScript"]
    }
  ]
}

Return ONLY the JSON object. Do not wrap it in markdown code fences, do not include any other text or explanation. Only return a valid JSON containing at most 10 job matches.`;

    const claudeRes = await anthropic.messages.create({
      model: MODEL_NAME, // Standard Claude 3.5 Sonnet is highly reliable and fast for JSON structured calls
      max_tokens: 4000,
      system: evaluationPrompt,
      messages: [
        {
          role: 'user',
          content: `Resume:\n${resumeText}\n\nSearch Results:\n${truncatedMarkdown}`,
        },
      ],
    });

    const rawText = claudeRes.content[0].type === 'text' ? claudeRes.content[0].text : '';
    console.log(`[job-scan] Claude raw response:`, rawText);
    const cleanedJson = rawText.replace(/^\s*```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
    
    let parsedResult;
    try {
      parsedResult = JSON.parse(cleanedJson);
    } catch (e) {
      console.error('[job-scan] Failed to parse Claude JSON response:', e);
      console.error('Raw response:', rawText);
      return NextResponse.json({ error: 'Failed to parse job matching results. Please try again.' }, { status: 500 });
    }

    // Sort jobs by fitScore descending
    if (parsedResult.jobs && Array.isArray(parsedResult.jobs)) {
      parsedResult.jobs.sort((a: JobMatch, b: JobMatch) => b.fitScore - a.fitScore);
    }

    return NextResponse.json({
      role: searchRole,
      location: searchLocation,
      jobs: parsedResult.jobs || [],
    });
  } catch (e) {
    const errorMsg = e instanceof Error ? e.message : 'Unknown server error';
    console.error('[job-scan] Unexpected error:', e);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
