/**
 * Probe every board in the ATS registry and report what it returns.
 *
 * A company migrating from one ATS to another does not announce it — the old
 * board simply starts 404ing, and the nightly harvest gets quietly smaller
 * rather than failing. Run this after editing ATS_BOARDS, and periodically:
 *
 *   npm run ats:check
 *
 * Exits non-zero when any board is unreachable, so it can gate a deploy.
 */
import { ATS_BOARDS, harvestBoard } from '../lib/opportunities/ats';

async function main() {
  const results = await Promise.all(ATS_BOARDS.map(harvestBoard));

  let dead = 0;
  let empty = 0;
  let total = 0;

  for (const { board, candidates, error } of results) {
    const label = `${board.vendor.padEnd(15)} ${board.slug.padEnd(32)}`;
    if (error) {
      dead += 1;
      console.log(`DEAD  ${label} ${error}`);
      continue;
    }
    if (candidates.length === 0) {
      empty += 1;
      console.log(`EMPTY ${label} board responded with zero postings`);
      continue;
    }
    total += candidates.length;
    const india = candidates.filter((c) => /india|bengaluru|bangalore|hyderabad|mumbai|pune|delhi|chennai|gurgaon|noida|kolkata/i.test(c.location ?? '')).length;
    console.log(`OK    ${label} ${String(candidates.length).padStart(4)} postings, ${String(india).padStart(3)} look Indian`);
  }

  console.log(`\n${results.length} boards · ${total} postings · ${dead} dead · ${empty} empty`);
  if (dead > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
