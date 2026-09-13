/**
 * Does every key work, and does every model in the registry still exist?
 *
 *   npm run ai:verify
 *
 * Run this BEFORE trusting the router with a route, and again whenever a model
 * is added. Free models are retired without notice, and the failure mode is
 * quiet: the router just fails over to the next candidate and the bill starts
 * creeping back up while every page still works.
 *
 * Sends one deliberately tiny prompt per model, sequentially with a pause, so
 * verifying does not itself trip the per-minute ceilings it is checking.
 */
import { readFileSync } from 'node:fs';

loadEnvLocal();

const { callProvider, PROVIDERS, hasKey } = await import('../lib/ai/providers');
const { allCandidates, TASK_SPECS, TASKS } = await import('../lib/ai/models');
const { limiterAvailable } = await import('../lib/ai/limiter');

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

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  console.log('KEYS\n');
  let anyKey = false;
  for (const spec of Object.values(PROVIDERS)) {
    const present = hasKey(spec.name);
    if (present) anyKey = true;
    const limits = spec.limits;
    console.log(
      `  ${present ? 'SET    ' : 'MISSING'} ${spec.name.padEnd(12)} ${spec.envKey.padEnd(20)}` +
        ` ${limits.requestsPerMinute}/min` +
        `${limits.requestsPerDay ? ` · ${limits.requestsPerDay}/day` : ''}` +
        `${limits.tokensPerMinute ? ` · ${limits.tokensPerMinute} TPM` : ''}`
    );
    if (present && spec.caveat) console.log(`          note: ${spec.caveat}`);
  }

  console.log(
    `\n  Shared rate limiter: ${limiterAvailable() ? 'ACTIVE (Upstash)' : 'OFF — no Upstash creds, limits are per-instance only'}`
  );

  if (!anyKey) {
    console.error('\nNo provider keys are set. Add at least one to .env.local and re-run.');
    process.exit(1);
  }

  console.log('\n\nMODELS — one tiny call each\n');
  const candidates = allCandidates();
  const results: { provider: string; model: string; ok: boolean; ms: number; detail: string }[] = [];

  for (const candidate of candidates) {
    if (!hasKey(candidate.provider)) {
      results.push({
        provider: candidate.provider,
        model: candidate.model,
        ok: false,
        ms: 0,
        detail: 'no key — skipped',
      });
      continue;
    }

    const started = Date.now();
    const outcome = await callProvider(candidate.provider, candidate.model, {
      // Short, unambiguous, and cheap to check. A model that cannot do this is
      // not a model this project should be routing real work to.
      messages: [{ role: 'user', content: 'Reply with exactly the word: READY' }],
      maxTokens: 16,
      temperature: 0,
      timeoutMs: 45_000,
    });
    const ms = Date.now() - started;

    const detail = outcome.ok
      ? `"${outcome.text.trim().slice(0, 24).replace(/\n/g, ' ')}"`
      : (outcome.error ?? 'unknown error');

    results.push({ provider: candidate.provider, model: candidate.model, ok: outcome.ok, ms, detail });
    console.log(
      `  ${outcome.ok ? 'OK  ' : 'FAIL'} ${String(ms).padStart(6)}ms  ` +
        `${candidate.provider.padEnd(11)} ${candidate.model.padEnd(48)} ${detail}`
    );

    // Spacing out keeps the verifier from tripping the 20/min ceiling it is
    // meant to be measuring against.
    await sleep(1200);
  }

  console.log('\n\nTASK COVERAGE — can each task still be served?\n');
  let uncovered = 0;
  let freeUncovered = 0;

  for (const task of TASKS) {
    const spec = TASK_SPECS[task];
    const live = spec.candidates.filter((c) =>
      results.some((r) => r.provider === c.provider && r.model === c.model && r.ok)
    );
    const freeLive = live.filter((c) => !PROVIDERS[c.provider].paid);

    if (live.length === 0) uncovered += 1;
    if (freeLive.length === 0) freeUncovered += 1;

    const label = live.length === 0 ? 'NONE' : freeLive.length === 0 ? 'PAID' : 'FREE';
    console.log(
      `  ${label}  ${task.padEnd(20)} ${freeLive.length} free + ` +
        `${live.length - freeLive.length} paid working of ${spec.candidates.length}`
    );
    if (freeLive.length === 0 && live.length > 0) {
      console.log(`        every free model for this task is down — it will bill to Anthropic`);
    }
  }

  const working = results.filter((r) => r.ok).length;
  console.log(`\n${working}/${results.length} models answered · ${uncovered} tasks have no working model`);

  if (freeUncovered > 0) {
    console.log(
      `${freeUncovered} task(s) have no working FREE model and would fall through to paid.`
    );
  }

  // Exit non-zero only when something is genuinely unserveable. A free model
  // being down is worth reporting but is precisely what the fallback is for.
  if (uncovered > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
