import fs from 'node:fs';
import path from 'node:path';
import { harvestAts } from '../lib/opportunities/ats';
import { harvestUnstop } from '../lib/opportunities/unstop';
import { CURATED_LIVE_OPPORTUNITIES } from '../lib/opportunities/curated-live';
import { verifyCandidate } from '../lib/opportunities/verify';
import { rankOpportunities } from '../lib/opportunities/score';
import { filterLiveOpportunities } from '../lib/opportunities/link-validator';
import { evaluateOpportunityQuality } from '../lib/opportunities/quality-engine';
import type { OpportunityRecord, OpportunityCandidate } from '../lib/opportunities/types';

const KIND_LABELS: Record<string, string> = {
  internship: 'Internship',
  job: 'Job',
  hackathon: 'Hackathon',
  competition: 'Competition',
  event: 'Event',
  webinar: 'Webinar',
  workshop: 'Workshop',
  ambassador: 'Campus Ambassador',
  scholarship: 'Scholarship',
  fellowship: 'Fellowship',
};

async function main() {
  const now = new Date();
  console.log('Starting Verified Fresher-Focused Build Pipeline with Pre-Flight Link Validation...');

  const [atsRes, unstopRes] = await Promise.all([
    harvestAts({ deadline: Date.now() + 60000 }),
    harvestUnstop(),
  ]);

  console.log(`ATS postings harvested: ${atsRes.candidates.length}`);
  console.log(`Unstop active postings harvested: ${unstopRes.length}`);
  console.log(`Curated flagship programs: ${CURATED_LIVE_OPPORTUNITIES.length}`);

  const allCandidates: OpportunityCandidate[] = [
    ...CURATED_LIVE_OPPORTUNITIES,
    ...unstopRes,
    ...atsRes.candidates,
  ];

  const candidatePool: OpportunityCandidate[] = [];
  const seenUrls = new Set<string>();

  for (const candidate of allCandidates) {
    const canonical = candidate.applyUrl.toLowerCase().trim();
    if (seenUrls.has(canonical)) continue;
    seenUrls.add(canonical);

    // Verification check (scam patterns, student level, reachable domain)
    const verdict = verifyCandidate(candidate, { now, reachability: 'ok' });
    if (verdict.status === 'verified') {
      candidatePool.push(candidate);
    }
  }

  console.log(`Verified candidates before link liveness probe: ${candidatePool.length}`);
  console.log('Running Pre-Flight Link Liveness & Tombstone validation on all links...');

  // Probe every URL in parallel (ensures 100% 200 OK links)
  const liveCandidates = await filterLiveOpportunities(candidatePool, 12);
  console.log(`Candidates that passed 100% active link validation: ${liveCandidates.length}`);

  const verifiedRecords: OpportunityRecord[] = liveCandidates.map((candidate, i) => {
    const verdict = verifyCandidate(candidate, { now, reachability: 'ok' });
    return {
      id: `live-${i}-${candidate.organization.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      title: candidate.title,
      organization: candidate.organization,
      kind: candidate.kind,
      applyUrl: candidate.applyUrl,
      sourceUrl: candidate.sourceUrl ?? candidate.applyUrl,
      location: candidate.location ?? null,
      workMode: candidate.workMode ?? null,
      eligibility: candidate.eligibility ?? null,
      skills: candidate.skills ?? [],
      description: candidate.description ?? null,
      compensation: candidate.compensation ?? null,
      deadline: candidate.deadline ?? null,
      postedAt: candidate.postedAt ?? null,
      status: 'verified',
      sourceTier: verdict.sourceTier,
      signals: verdict.signals,
      discoveredAt: now.toISOString(),
      corroborations: 1,
      lastCheckedAt: now.toISOString(),
    };
  });

  const ranked = rankOpportunities(verifiedRecords, now).map((r) => r.opportunity);

  // Write live-feed-cache.json
  const cachePath = path.resolve(process.cwd(), 'lib/opportunities/live-feed-cache.json');
  fs.writeFileSync(
    cachePath,
    JSON.stringify(
      {
        lastUpdated: now.toISOString(),
        count: ranked.length,
        records: ranked,
      },
      null,
      2
    )
  );
  console.log(`Saved ${ranked.length} 100% working opportunities to ${cachePath}`);

  // Write fallback.json with full fresher & batch metadata
  const cards = ranked.map((r) => {
    const type = KIND_LABELS[r.kind] || 'Job';
    const days = r.deadline ? Math.ceil((new Date(r.deadline).getTime() - Date.now()) / 86400000) : null;
    const quality = evaluateOpportunityQuality(r, now);

    return {
      id: r.id,
      company: r.organization,
      category: r.workMode === 'remote' ? 'Remote' : type,
      type,
      title: r.title,
      url: r.applyUrl,
      deadline: r.deadline,
      deadlineIso: r.deadline ? `${r.deadline}T00:00:00.000Z` : null,
      daysLeft: days,
      status: days !== null && days <= 7 ? 'Closing soon' : 'Open',
      urgency: days !== null && days <= 7 ? 'closing' : 'open',
      benefits: r.compensation || r.description,
      notes: r.location,
      location: r.location,
      workMode: r.workMode,
      skills: r.skills,
      eligibility: r.eligibility,
      source: r.applyUrl.includes('unstop.com')
        ? 'Unstop'
        : r.sourceTier === 'official'
          ? 'Direct ATS'
          : 'Verified Direct Link',
      verified: true,
      compensation: r.compensation,
      isFresher: quality.isFresher,
      batchEligibility: quality.batchYears.length > 0 ? `Batches ${quality.batchYears.join(' · ')}` : null,
      experienceLevel: r.kind === 'internship' ? '0 YOE (College Students)' : '0-1 Years (Freshers & College)',
    };
  });

  const fallbackPath = path.resolve(process.cwd(), 'lib/opportunities/fallback.json');
  fs.writeFileSync(fallbackPath, JSON.stringify(cards, null, 2));
  console.log(`Synchronized ${cards.length} cards to ${fallbackPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
