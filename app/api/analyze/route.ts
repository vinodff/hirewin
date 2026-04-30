import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/rate-limit';
import { streamAnalysis, AnalysisResultSchema } from '@/lib/anthropic';
import { logUsage } from '@/lib/usage-log';
import { fetchJobDescription, isKnownAtsDomain } from '@/lib/jina';
import { parsePdf } from '@/lib/pdf-parser';
import { parse as parsePartial } from 'partial-json';
import { v4 as uuidv4 } from 'uuid';
import type { AnalysisResult } from '@/types';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

function sse(data: object): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

export async function POST(req: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const emit = (data: object) => {
        try {
          controller.enqueue(encoder.encode(sse(data)));
        } catch {
          // client disconnected
        }
      };

      try {
        // --- Parse request ---
        const formData = await req.formData();
        const resumeText = formData.get('resumeText') as string | null;
        const resumeFile = formData.get('resumeFile') as File | null;
        const jdText = formData.get('jdText') as string | null;
        const jdUrl = formData.get('jdUrl') as string | null;

        // --- Build resume content ---
        let finalResume = resumeText?.trim() ?? '';
        if (!finalResume && resumeFile) {
          if (resumeFile.size > 5 * 1024 * 1024) {
            emit({ type: 'error', message: 'File too large — paste text or upload a smaller PDF.' });
            controller.close();
            return;
          }
          const bytes = await resumeFile.arrayBuffer();
          try {
            finalResume = await parsePdf(Buffer.from(bytes));
          } catch {
            emit({ type: 'error', message: "Can't read this PDF — paste your resume text instead." });
            controller.close();
            return;
          }
        }
        if (!finalResume) {
          emit({ type: 'error', message: 'Resume is required.' });
          controller.close();
          return;
        }

        // --- Build JD content ---
        let finalJd = jdText?.trim() ?? '';
        if (!finalJd && jdUrl) {
          if (isKnownAtsDomain(jdUrl)) {
            emit({ type: 'error', message: "This ATS site can't be auto-fetched — paste the job description below." });
            controller.close();
            return;
          }
          try {
            finalJd = await fetchJobDescription(jdUrl);
          } catch {
            emit({ type: 'error', message: "Couldn't fetch that URL — paste the job description text below." });
            controller.close();
            return;
          }
        }
        if (!finalJd) {
          emit({ type: 'error', message: 'Job description is required.' });
          controller.close();
          return;
        }

        // --- Auth check (optional — free tier works without auth) ---
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        // --- Rate limiting ---
        const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown';
        const rateLimitId = user ? `user:${user.id}` : `ip:${ip}`;
        const { success: withinRateLimit } = await checkRateLimit(rateLimitId);
        if (!withinRateLimit) {
          emit({ type: 'error', message: 'Too many requests — try again in an hour.' });
          controller.close();
          return;
        }

        // Improvements are unlimited and free — paywall lives on download (PDF/DOCX) routes.
        // Track usage for analytics so plan dashboards remain accurate.
        if (user) {
          await supabase.rpc('reset_monthly_usage_if_needed', { profile_id: user.id });
          await supabase.rpc('try_increment_improvements_used', {
            p_user_id: user.id,
            p_limit: -1,
          });
        }

        // --- Stream from Claude ---
        let buffer = '';
        const emittedFields = new Set<string>();
        let fullResult: Partial<AnalysisResult> = {};
        let streamError = false;
        const totalUsage = { input_tokens: 0, output_tokens: 0 };

        async function consumeStream(textStream: AsyncIterable<string>) {
          for await (const text of textStream) {
            buffer += text;
            try {
              // Strip potential markdown fences before parsing
              const cleaned = buffer.replace(/^\s*```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '');
              const partial = parsePartial(cleaned) as Partial<AnalysisResult>;
              if (partial && typeof partial === 'object') {
                for (const [field, value] of Object.entries(partial)) {
                  if (!emittedFields.has(field) && value !== undefined) {
                    emit({ type: 'field', field, value });
                    emittedFields.add(field);
                  }
                }
                // Always overwrite fullResult with the latest parse — partial values get refined as more tokens arrive
                fullResult = partial;
              }
            } catch {
              // partial-json failed — continue buffering
            }
          }
        }

        try {
          const { textStream, usage } = await streamAnalysis(finalResume, finalJd);
          await consumeStream(textStream);
          totalUsage.input_tokens += usage.input_tokens;
          totalUsage.output_tokens += usage.output_tokens;
        } catch (e) {
          streamError = true;
          const rawErr = e instanceof Error ? e.message : String(e);
          console.error('[analyze] Claude stream error:', e);

          // Use Anthropic SDK typed errors (more reliable than string matching)
          if (e instanceof Anthropic.AuthenticationError) {
            emit({ type: 'error', message: 'Invalid or missing Anthropic API key. Please check your ANTHROPIC_API_KEY environment variable.' });
            controller.close();
            return;
          }
          if (e instanceof Anthropic.RateLimitError) {
            emit({ type: 'error', message: 'Anthropic rate limit reached — wait a moment and retry.' });
            controller.close();
            return;
          }
          if (e instanceof Anthropic.APIError) {
            // status 529 = overloaded, 500 = internal error, etc.
            if (e.status === 529 || e.status === 503) {
              emit({ type: 'error', message: 'Anthropic is temporarily overloaded — please try again in a moment.' });
              controller.close();
              return;
            }
            if (rawErr.includes('credit balance') || rawErr.includes('billing') || e.status === 402) {
              emit({ type: 'error', message: 'Anthropic credits exhausted — add credits at console.anthropic.com.' });
              controller.close();
              return;
            }
          }
          // Fallback string checks for older SDK or non-API errors
          if (rawErr.includes('credit balance') || rawErr.includes('billing')) {
            emit({ type: 'error', message: 'Anthropic credits exhausted — add credits at console.anthropic.com.' });
            controller.close();
            return;
          }
          if (rawErr.includes('429') || rawErr.includes('rate')) {
            emit({ type: 'error', message: 'Anthropic rate limit — wait a moment and retry.' });
            controller.close();
            return;
          }
          if (rawErr.includes('401') || rawErr.includes('authentication') || rawErr.includes('API key')) {
            emit({ type: 'error', message: 'Invalid or missing Anthropic API key. Please check your ANTHROPIC_API_KEY environment variable.' });
            controller.close();
            return;
          }
          if (rawErr.includes('environment variable is not set')) {
            emit({ type: 'error', message: 'Anthropic API key is not configured on this server.' });
            controller.close();
            return;
          }
          // Retry once with explicit JSON correction
          if (buffer.trim()) {
            try {
              buffer = '';
              emittedFields.clear();
              fullResult = {};
              const retry = await streamAnalysis(
                finalResume,
                finalJd + '\n\nIMPORTANT: Return ONLY valid JSON, no other text.'
              );
              await consumeStream(retry.textStream);
              totalUsage.input_tokens += retry.usage.input_tokens;
              totalUsage.output_tokens += retry.usage.output_tokens;
              streamError = false;
            } catch {
              streamError = true;
            }
          }
        }

        if (streamError) {
          emit({ type: 'error', message: 'Analysis failed — please try again.' });
          controller.close();
          return;
        }

        // --- Validate final result ---
        const parsed = AnalysisResultSchema.safeParse(fullResult);
        if (!parsed.success) {
          console.error('[analyze] Zod validation failed:');
          console.error('  Issues:', JSON.stringify(parsed.error.issues, null, 2));
          console.error('  Received keys:', Object.keys(fullResult));
          console.error('  Raw buffer (last 500 chars):', buffer.slice(-500));
          emit({ type: 'error', message: 'Analysis returned incomplete data — please try again.' });
          controller.close();
          return;
        }

        const result = parsed.data;

        // --- Save to Supabase + increment usage ---
        let versionId = uuidv4();
        if (user) {
          const { data: saved } = await supabase
            .from('resume_versions')
            .insert({
              user_id: user.id,
              company: result.company,
              role: result.role,
              company_type: result.companyType,
              ats_score: result.atsScore,
              job_fit_score: result.jobFitScore,
              career_level: result.careerLevel,
              original_resume: finalResume,
              optimized_resume: result.optimizedResume,
              keywords_matched: result.keywordsMatched,
              keywords_missing: result.keywordsMissing,
              skill_gaps: result.skillGaps,
              outreach_email: null,
              outreach_linkedin: null,
            })
            .select('id')
            .single();

          if (saved) versionId = saved.id;
        }

        // Log Anthropic usage (non-blocking)
        await logUsage({
          userId: user?.id ?? null,
          versionId: user ? versionId : null,
          endpoint: 'analyze',
          inputTokens: totalUsage.input_tokens,
          outputTokens: totalUsage.output_tokens,
        });

        emit({ type: 'complete', versionId, result, originalResume: finalResume });
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Unexpected error';
        emit({ type: 'error', message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
