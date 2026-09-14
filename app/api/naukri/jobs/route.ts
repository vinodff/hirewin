import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/rate-limit';
import { analyzeResumeForNaukri, buildNaukriSearchStrategy, extractQuickProfile, NAUKRI_CITY_GIDS } from '@/lib/naukri/resume-analyzer';
import { scrapeNaukriJobs } from '@/lib/naukri/cloud-scraper';
import { rankNaukriJobs } from '@/lib/naukri/matcher';
import type { CandidateProfile, NaukriSearchParams } from '@/lib/naukri/types';

export const maxDuration = 45;
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      resumeText,
      query: customQuery,
      location: customLocation,
      experienceYears: customExp,
    } = body;

    /*
     * Authentication first. This route reaches a PAID model, so an
     * unauthenticated caller is an unmetered Anthropic bill with a public
     * endpoint attached.
     */
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Sign in to use this feature.' }, { status: 401 });
    }

    /*
     * Keyed on the user, not on x-forwarded-for.
     *
     * That header is set by the caller, and `?? 'unknown'` collapsed every
     * spoofed request into one shared bucket. This route reaches a paid model
     * via analyzeResumeForNaukri, so it fails closed too.
     */
    const { success: withinRateLimit } = await checkRateLimit(`naukri-jobs:${user.id}`, {
      failClosed: true,
    });
    if (!withinRateLimit) {
      return NextResponse.json(
        { error: 'Too many requests — please slow down.' },
        { status: 429 }
      );
    }

    let profile: CandidateProfile;

    if (resumeText && resumeText.trim().length >= 50) {
      // Analyze resume (uses quick heuristics first, with AI fallback)
      profile = extractQuickProfile(resumeText);
      // If time permits or needed, analyze deeper
      try {
        profile = await analyzeResumeForNaukri(resumeText);
      } catch (e) {
        console.warn('[naukri/jobs] Deep AI profile error, continuing with quick profile:', e);
      }
    } else {
      // Fallback default profile if no resume text provided
      profile = {
        experienceLevel: customExp === 0 ? 'fresher' : 'junior',
        totalYearsExperience: customExp ?? 0,
        targetRoles: [customQuery || 'Software Engineer'],
        coreSkills: ['React', 'JavaScript', 'TypeScript', 'Node.js', 'SQL'],
        domainInterests: ['Web Development'],
        preferredLocations: [customLocation || 'Bengaluru'],
      };
    }

    // Override with custom query / location / experience if specified by user
    if (customExp !== undefined && customExp !== null) {
      profile.totalYearsExperience = Number(customExp);
      profile.experienceLevel = Number(customExp) === 0 ? 'fresher' : 'junior';
    }
    if (customLocation) {
      profile.preferredLocations = [customLocation, ...profile.preferredLocations];
    }
    if (customQuery) {
      profile.targetRoles = [customQuery, ...profile.targetRoles];
    }

    const searchStrategy = buildNaukriSearchStrategy(profile);

    // Build actual search parameters
    const searchKeywords = customQuery
      ? (profile.experienceLevel === 'fresher' && !customQuery.toLowerCase().includes('fresher')
          ? `${customQuery} fresher`
          : customQuery)
      : searchStrategy.primarySearch.keywords;

    const chosenLocation = customLocation || profile.preferredLocations[0] || 'Bengaluru';
    const cityGid = NAUKRI_CITY_GIDS[chosenLocation.toLowerCase()] || 9508;

    const searchParams: NaukriSearchParams = {
      keywords: searchKeywords,
      experienceYears: profile.experienceLevel === 'fresher' ? 0 : Math.floor(profile.totalYearsExperience),
      location: chosenLocation,
      cityTypeGid: cityGid,
      freshnessDays: 15,
    };

    // Scrape live Naukri listings
    const scrapedJobs = await scrapeNaukriJobs(searchParams);

    // Rank by match suitability
    const rankedJobs = rankNaukriJobs(profile, scrapedJobs);

    return NextResponse.json({
      success: true,
      profile,
      searchStrategy,
      searchParams,
      jobs: rankedJobs,
      totalCount: rankedJobs.length,
    });
  } catch (error) {
    console.error('[naukri/jobs] Error:', error);
    const message = error instanceof Error ? error.message : 'An error occurred while fetching Naukri jobs';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
