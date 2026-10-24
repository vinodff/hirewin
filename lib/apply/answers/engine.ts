/**
 * The answer engine: guards → profile rules → cache → AI, per question.
 *
 * The order is the trust order. A guard can refuse a question outright, a
 * profile fact beats any remembered answer, a remembered answer (from this
 * same profile) beats a fresh model call, and the model only sees what
 * nothing more reliable could settle — in one batched call per form.
 *
 * A required question left null is still returned as null. Deciding that the
 * job therefore needs review is the caller's call, not something to paper over
 * here with a plausible value.
 */
import { answerCachePath } from '@/lib/apply/paths';
import type { Answer, AnswerContext, AnswerEngine, FormQuestion } from '@/lib/apply/types';
import { answerWithAi, type AiCall } from './ai';
import { AnswerCache, profileFingerprint } from './cache';
import { applyGuard } from './guards';
import { answerFromProfile } from './profile-rules';

export interface AnswerEngineOptions {
  /** Cache file; defaults to answerCachePath() resolved at answer time. */
  cachePath?: string;
  /** Default true. When false, unanswered questions stay null. */
  useAi?: boolean;
  /** Injected in tests so they never hit the network. Defaults to routeJson. */
  aiCall?: AiCall;
  /**
   * Non-fatal problems (cache unreadable or unwritable, a question that threw).
   * The engine keeps answering; this is how the caller hears about it.
   */
  onWarning?: (message: string) => void;
}

function none(q: FormQuestion, reason: string): Answer {
  return { questionId: q.id, label: q.label, value: null, source: 'none', confidence: 0, reason };
}

const errorText = (err: unknown) => (err instanceof Error ? err.message : String(err));

export function createAnswerEngine(options: AnswerEngineOptions = {}): AnswerEngine {
  const useAi = options.useAi ?? true;
  const warn = options.onWarning ?? (() => undefined);

  return {
    async answer(questions: FormQuestion[], ctx: AnswerContext): Promise<Answer[]> {
      const results: (Answer | null)[] = questions.map(() => null);
      const cache = new AnswerCache(options.cachePath ?? answerCachePath());
      let cacheUsable = true;
      try {
        await cache.load();
      } catch (err) {
        cacheUsable = false;
        warn(`answer cache could not be read: ${errorText(err)}`);
      }
      const profileHash = profileFingerprint(ctx.profile);

      const pending: number[] = [];
      questions.forEach((q, i) => {
        try {
          const decided =
            applyGuard(q, ctx) ??
            answerFromProfile(q, ctx.profile) ??
            (cacheUsable ? cache.lookup(q, profileHash) : null);
          if (decided) results[i] = decided;
          else if (q.kind === 'file') results[i] = none(q, 'No file in the profile for this upload.');
          else pending.push(i);
        } catch (err) {
          warn(`question "${q.label}" failed: ${errorText(err)}`);
          results[i] = none(q, `Could not evaluate this question: ${errorText(err)}`);
        }
      });

      if (pending.length > 0) {
        const asked = pending.map((i) => questions[i]);
        if (!useAi) {
          pending.forEach((i) => {
            results[i] = none(questions[i], 'No profile rule or cached answer, and AI is disabled.');
          });
        } else {
          const aiAnswers = await answerWithAi(asked, ctx, options.aiCall);
          pending.forEach((qi, k) => {
            results[qi] = aiAnswers[k];
            if (cacheUsable) cache.remember(questions[qi], aiAnswers[k], profileHash, ctx.job);
          });
          try {
            await cache.save();
          } catch (err) {
            warn(`answer cache could not be saved: ${errorText(err)}`);
          }
        }
      }

      return results.map((a, i) => a ?? none(questions[i], 'Not answered.'));
    },
  };
}
