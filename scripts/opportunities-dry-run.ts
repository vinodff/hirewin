/**
 * Run the discovery pipeline for real and print what it WOULD publish.
 *
 *   npm run opportunities:dry-run
 *
 * Harvests every ATS board, runs each posting through the same verification the
 * cron uses, and reports the verdicts — without a database, a key, or a write.
 * This is the check to run before deploying a change to the registry, the trust
 * list or the verifier, because it answers the only question that matters:
 * would a reader see something worth clicking?
 */
import { harvestAts } from '../lib/opportunities/ats';
import { verifyCandidate } from '../lib/opportunities/verify';
import { regionVerdict } from '../lib/opportunities/region';
import { scoreOpportunity } from '../lib/opportunities/score';
import type { OpportunityRecord } from '../lib/opportunities/types';

const NOW = new Date();

function bar(count: number, total: number, width = 28): string {
  const filled = total === 0 ? 0 : Math.round((count / total) * width);
  return '█'.repeat(filled) + '·'.repeat(width - filled);
}

async function main() {
  console.log('Harvesting every ATS board…\n');
  const started = Date.now();
  const harvest = await harvestAts();
  const elapsed = ((Date.now() - started) / 1000).toFixed(1);

  console.log(
    `${harvest.boardsPolled} boards polled in ${elapsed}s · ` +
      `${harvest.candidates.length} postings returned · ${harvest.boardsFailed} boards failed\n`
  );

  const verdicts = { verified: 0, pending: 0, rejected: 0 };
  const rejectionReasons = new Map<string, number>();
  const published: { candidate: (typeof harvest.candidates)[number]; score: number }[] = [];

  for (const candidate of harvest.candidates) {
    const verdict = verifyCandidate(candidate, { now: NOW, reachability: 'ok' });
    verdicts[verdict.status] += 1;

    if (verdict.status === 'rejected') {
      const reason = verdict.signals[0] ?? 'unspecified';
      rejectionReasons.set(reason, (rejectionReasons.get(reason) ?? 0) + 1);
      continue;
    }
    if (verdict.status !== 'verified') continue;

    // Scoring wants a stored row; everything it reads is already known here.
    const asRecord = {
      ...candidate,
      id: 'dry-run',
      skills: candidate.skills ?? [],
      deadline: candidate.deadline ?? null,
      compensation: candidate.compensation ?? null,
      status: 'verified',
      sourceTier: verdict.sourceTier,
      signals: verdict.signals,
      discoveredAt: NOW.toISOString(),
      corroborations: 1,
      lastCheckedAt: null,
    } as OpportunityRecord;

    published.push({ candidate, score: scoreOpportunity(asRecord, NOW).total });
  }

  const total = harvest.candidates.length;
  console.log('VERDICTS');
  console.log(`  verified  ${String(verdicts.verified).padStart(5)}  ${bar(verdicts.verified, total)}`);
  console.log(`  pending   ${String(verdicts.pending).padStart(5)}  ${bar(verdicts.pending, total)}`);
  console.log(`  rejected  ${String(verdicts.rejected).padStart(5)}  ${bar(verdicts.rejected, total)}`);

  console.log('\nWHY THINGS WERE REJECTED');
  for (const [reason, count] of [...rejectionReasons].sort((a, b) => b[1] - a[1]).slice(0, 8)) {
    console.log(`  ${String(count).padStart(5)}  ${reason}`);
  }

  const byRegion = new Map<string, number>();
  for (const candidate of harvest.candidates) {
    const fit = regionVerdict(candidate).fit;
    byRegion.set(fit, (byRegion.get(fit) ?? 0) + 1);
  }
  console.log('\nREGION MIX');
  for (const [fit, count] of [...byRegion].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${String(count).padStart(5)}  ${fit}`);
  }

  console.log(`\nWOULD PUBLISH ${published.length} — top 25 by rank\n`);
  published.sort((a, b) => b.score - a.score);
  for (const { candidate, score } of published.slice(0, 25)) {
    const where = candidate.location ?? 'location not stated';
    const pay = candidate.compensation ? `  ${candidate.compensation}` : '';
    console.log(
      `  ${String(score).padStart(3)}  ${candidate.organization.slice(0, 22).padEnd(23)}` +
        `${candidate.title.slice(0, 46).padEnd(47)}${where.slice(0, 26)}${pay}`
    );
  }

  const kinds = new Map<string, number>();
  for (const { candidate } of published) {
    kinds.set(candidate.kind, (kinds.get(candidate.kind) ?? 0) + 1);
  }
  console.log('\nPUBLISHABLE BY KIND');
  for (const [kind, count] of [...kinds].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${String(count).padStart(5)}  ${kind}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
