/**
 * Does this survive 10 users? 100?
 *
 *   npm run ai:loadtest              # 1 → 5 → 10 → 25
 *   npm run ai:loadtest -- 100       # add a 100-concurrent stage
 *   npm run ai:loadtest -- 10 --paid # allow the paid fallback
 *
 * Ramps real concurrent requests at the real APIs through the real router, and
 * reports where it breaks. Free tiers are rate-limited per MINUTE — OpenRouter
 * 20, Groq 30 — so the interesting question is not whether one call works. It
 * is what the hundredth simultaneous call does, and whether the failover
 * absorbs it or the user sees an error.
 *
 * Defaults to --free-only. The paid fallback would mask exactly the failure
 * this is built to measure: with Anthropic behind it almost everything
 * succeeds, and the report would say "fine" while quietly spending money.
 *
 * This burns free quota. On a 50/day account a single 100-stage exhausts it,
 * which is itself a finding worth seeing once.
 */
import { readFileSync } from 'node:fs';

loadEnvLocal();

const { route } = await import('../lib/ai/router');
const { AllProvidersFailedError } = await import('../lib/ai/types');
const { hasKey, PROVIDERS } = await import('../lib/ai/providers');
const { limiterAvailable } = await import('../lib/ai/limiter');
import type { AiAttempt } from '../lib/ai/types';

function loadEnvLocal() {
  try {
    for (const line of readFileSync('.env.local', 'utf-8').split('\n')) {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (!match) continue;
      if (process.env[match[1]]) continue;
      process.env[match[1]] = match[2].replace(/^["']|["']$/g, '');
    }
  } catch {
    console.error('No .env.local found — run from the project root.');
    process.exit(1);
  }
}

interface Outcome {
  ok: boolean;
  ms: number;
  provider: string | null;
  model: string | null;
  paid: boolean;
  attempts: AiAttempt[];
  error: string | null;
}

/**
 * One simulated user.
 *
 * `improve-summary` is the task under test: it is the smallest real prompt in
 * the product, so the result measures the CONCURRENCY ceiling rather than how
 * long a big generation takes. A load test that spends 90s per call measures
 * the model, not the limit.
 */
async function oneUser(index: number, freeOnly: boolean): Promise<Outcome> {
  const started = Date.now();
  try {
    const result = await route(
      'improve-summary',
      {
        system: 'You tighten resume summaries. Reply with the rewritten summary only.',
        messages: [
          {
            role: 'user',
            content: `Tighten this to one sentence (request ${index}): "I am a hard working software developer with experience in many different technologies and a passion for learning new things."`,
          },
        ],
        maxTokens: 120,
      },
      { freeOnly, budgetMs: 60_000 }
    );

    return {
      ok: true,
      ms: Date.now() - started,
      provider: result.provider,
      model: result.model,
      paid: result.usedPaidFallback,
      attempts: result.attempts,
      error: null,
    };
  } catch (error) {
    const attempts = error instanceof AllProvidersFailedError ? error.attempts : [];
    return {
      ok: false,
      ms: Date.now() - started,
      provider: null,
      model: null,
      paid: false,
      attempts,
      error: error instanceof Error ? error.message.slice(0, 120) : String(error),
    };
  }
}

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))];
}

async function stage(concurrency: number, freeOnly: boolean) {
  process.stdout.write(`\n${concurrency} concurrent … `);
  const started = Date.now();

  // All at once, deliberately. Staggering would measure a queue, and the
  // question is what a genuine simultaneous spike does.
  const outcomes = await Promise.all(
    Array.from({ length: concurrency }, (_, i) => oneUser(i + 1, freeOnly))
  );

  const wall = Date.now() - started;
  const ok = outcomes.filter((o) => o.ok);
  const failed = outcomes.filter((o) => !o.ok);
  const latencies = ok.map((o) => o.ms);

  console.log(`${ok.length}/${concurrency} succeeded in ${(wall / 1000).toFixed(1)}s`);
  console.log(
    `    latency  p50 ${percentile(latencies, 50)}ms · p95 ${percentile(latencies, 95)}ms · max ${Math.max(0, ...latencies)}ms`
  );

  // Which model actually served each request — the failover, made visible.
  const served = new Map<string, number>();
  for (const o of ok) {
    const key = `${o.provider}/${o.model}`;
    served.set(key, (served.get(key) ?? 0) + 1);
  }
  for (const [key, n] of [...served].sort((a, b) => b[1] - a[1])) {
    console.log(`    served   ${String(n).padStart(4)}  ${key}`);
  }

  // How often the first choice was NOT the one that answered. This is the
  // number that says whether failover is doing real work.
  const failedOver = ok.filter((o) => o.attempts.filter((a) => !a.ok).length > 0).length;
  if (failedOver > 0) {
    console.log(`    failover ${failedOver}/${ok.length} succeeded only after an earlier candidate failed`);
  }

  const reasons = new Map<string, number>();
  for (const o of outcomes) {
    for (const attempt of o.attempts) {
      if (attempt.ok) continue;
      const reason = attempt.skipped
        ? 'local limiter (predicted 429)'
        : attempt.status === 429
          ? 'provider 429'
          : attempt.status && attempt.status >= 500
            ? `provider ${attempt.status}`
            : (attempt.error ?? 'unknown').slice(0, 48);
      reasons.set(reason, (reasons.get(reason) ?? 0) + 1);
    }
  }
  if (reasons.size > 0) {
    console.log('    rejections:');
    for (const [reason, n] of [...reasons].sort((a, b) => b[1] - a[1]).slice(0, 6)) {
      console.log(`      ${String(n).padStart(4)}  ${reason}`);
    }
  }

  if (failed.length > 0) {
    console.log(`    FAILED   ${failed.length} request(s) got no answer at all`);
    console.log(`      e.g. ${failed[0].error}`);
  }

  return { concurrency, ok: ok.length, failed: failed.length, p95: percentile(latencies, 95) };
}

async function main() {
  const args = process.argv.slice(2);
  const allowPaid = args.includes('--paid');
  const extra = args.filter((a) => /^\d+$/.test(a)).map(Number);
  const stages = extra.length > 0 ? extra : [1, 5, 10, 25];

  const free = Object.values(PROVIDERS).filter((p) => !p.paid && hasKey(p.name));
  if (free.length === 0 && !allowPaid) {
    console.error('No FREE provider keys set. Add OPENROUTER_API_KEY or GROQ_API_KEY to .env.local.');
    process.exit(1);
  }

  console.log('AI load test — real calls, real keys\n');
  console.log(`  free providers : ${free.map((p) => p.name).join(', ') || 'none'}`);
  console.log(`  paid fallback  : ${allowPaid ? 'ENABLED (--paid)' : 'disabled — measuring free capacity only'}`);
  console.log(`  shared limiter : ${limiterAvailable() ? 'active' : 'OFF (no Upstash creds)'}`);
  console.log(
    `  combined ceiling: ${free.reduce((n, p) => n + p.limits.requestsPerMinute, 0)} requests/min across free providers`
  );
  console.log(`  stages         : ${stages.join(' → ')}`);

  const summary = [];
  for (const concurrency of stages) {
    summary.push(await stage(concurrency, !allowPaid));
    // A full minute between stages so each one starts with a fresh window.
    // Without it, stage N inherits stage N-1's exhausted budget and the report
    // blames concurrency for what was really leftover throttling.
    if (concurrency !== stages[stages.length - 1]) {
      process.stdout.write('    (waiting 60s for rate-limit windows to reset)');
      await new Promise((r) => setTimeout(r, 60_000));
      process.stdout.write('\r' + ' '.repeat(60) + '\r');
    }
  }

  console.log('\n\nSUMMARY\n');
  console.log('  users   ok   failed   p95');
  for (const s of summary) {
    console.log(
      `  ${String(s.concurrency).padStart(5)} ${String(s.ok).padStart(4)} ${String(s.failed).padStart(8)} ` +
        `${String(s.p95).padStart(6)}ms`
    );
  }

  const broke = summary.find((s) => s.failed > 0);
  console.log(
    broke
      ? `\nFirst failures at ${broke.concurrency} concurrent users (${broke.failed} of ${broke.concurrency} got no answer).`
      : `\nNo request went unanswered up to ${stages[stages.length - 1]} concurrent users.`
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
