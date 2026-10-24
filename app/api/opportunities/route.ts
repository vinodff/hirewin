import { NextRequest, NextResponse } from 'next/server';
import { getMergedFeed } from '@/lib/opportunities';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const forceRefresh = url.searchParams.get('refresh') === '1' || url.searchParams.get('sync') === '1';

    if (forceRefresh) {
      try {
        const { harvestAts } = await import('@/lib/opportunities/ats');
        const { harvestUnstop } = await import('@/lib/opportunities/unstop');
        const { CURATED_LIVE_OPPORTUNITIES } = await import('@/lib/opportunities/curated-live');
        const { verifyCandidate } = await import('@/lib/opportunities/verify');
        const { rankOpportunities } = await import('@/lib/opportunities/score');
        const { filterLiveOpportunities } = await import('@/lib/opportunities/link-validator');
        const fs = await import('node:fs');
        const path = await import('node:path');

        const now = new Date();
        const [atsRes, unstopRes] = await Promise.all([
          harvestAts({ deadline: Date.now() + 30000 }),
          harvestUnstop(),
        ]);

        const allCandidates = [
          ...CURATED_LIVE_OPPORTUNITIES,
          ...unstopRes,
          ...atsRes.candidates,
        ];

        const candidatePool = [];
        const seen = new Set<string>();

        for (const c of allCandidates) {
          const key = c.applyUrl.toLowerCase().trim();
          if (seen.has(key)) continue;
          seen.add(key);

          const verdict = verifyCandidate(c, { now, reachability: 'ok' });
          if (verdict.status === 'verified') {
            candidatePool.push(c);
          }
        }

        // Pre-flight link probe validation (drop any dead/closed/404 URLs)
        const liveCandidates = await filterLiveOpportunities(candidatePool, 8);

        const verifiedRecords = liveCandidates.map((c, i) => {
          const verdict = verifyCandidate(c, { now, reachability: 'ok' });
          return {
            id: `live-${i}-${c.organization.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
            title: c.title,
            organization: c.organization,
            kind: c.kind,
            applyUrl: c.applyUrl,
            sourceUrl: c.sourceUrl ?? c.applyUrl,
            location: c.location ?? null,
            workMode: c.workMode ?? null,
            eligibility: c.eligibility ?? null,
            skills: c.skills ?? [],
            description: c.description ?? null,
            compensation: c.compensation ?? null,
            deadline: c.deadline ?? null,
            postedAt: c.postedAt ?? null,
            status: 'verified',
            sourceTier: verdict.sourceTier,
            signals: verdict.signals,
            discoveredAt: now.toISOString(),
            corroborations: 1,
            lastCheckedAt: now.toISOString(),
          };
        });

        const ranked = rankOpportunities(verifiedRecords as any, now).map((r) => r.opportunity);
        const cachePath = path.resolve(process.cwd(), 'lib/opportunities/live-feed-cache.json');
        fs.writeFileSync(
          cachePath,
          JSON.stringify({ lastUpdated: now.toISOString(), count: ranked.length, records: ranked }, null, 2)
        );

        // Also update fallback.json with full fresher cards
        const { evaluateOpportunityQuality } = await import('@/lib/opportunities/quality-engine');
        const fallbackCards = ranked.map((r) => {
          const type = r.kind === 'internship' ? 'Internship' : r.kind === 'hackathon' ? 'Hackathon' : 'Job';
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
            source: r.applyUrl.includes('unstop.com') ? 'Unstop' : 'Direct ATS',
            verified: true,
            compensation: r.compensation,
            isFresher: quality.isFresher,
            batchEligibility: quality.batchYears.length > 0 ? `Batches ${quality.batchYears.join(' · ')}` : null,
            experienceLevel: r.kind === 'internship' ? '0 YOE (College Students)' : '0-1 Years (Freshers & College)',
          };
        });
        const fallbackPath = path.resolve(process.cwd(), 'lib/opportunities/fallback.json');
        fs.writeFileSync(fallbackPath, JSON.stringify(fallbackCards, null, 2));
      } catch (err) {
        console.warn('[api/opportunities] Background refresh warning:', (err as Error).message);
      }
    }

    const feed = await getMergedFeed();
    return NextResponse.json({
      ok: true,
      opportunities: feed.opportunities,
      count: feed.opportunities.length,
      isStale: feed.isStale,
      agentCount: feed.agentCount,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[api/opportunities] Error fetching opportunities:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  return GET(req);
}
