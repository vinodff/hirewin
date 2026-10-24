import fs from 'fs';
import path from 'path';
import { parseNaukriMarkdown } from '../lib/naukri/cloud-scraper';
import { scoreNaukriJob } from '../lib/naukri/matcher';
import { extractQuickProfile } from '../lib/naukri/resume-analyzer';

const jinaPath = path.resolve(process.cwd(), 'jina-search-result.txt');
if (!fs.existsSync(jinaPath)) {
  console.error('File not found:', jinaPath);
  process.exit(1);
}

const content = fs.readFileSync(jinaPath, 'utf-8');
const jobs = parseNaukriMarkdown(content);
console.log('=== REAL SCRAPE PARSING RESULTS ===');
console.log('Total jobs parsed from real Naukri scrape:', jobs.length);

if (jobs.length > 0) {
  console.log('\n--- Sample Job 1 ---');
  console.log(JSON.stringify(jobs[0], null, 2));

  console.log('\n--- Sample Job 2 ---');
  console.log(JSON.stringify(jobs[1], null, 2));

  // Now test with a real fresher resume
  const fresherResume = `
  VINOD KUMAR
  Frontend Developer / Software Engineer (Fresher)
  Email: vinod@example.com | Phone: +91 9876543210
  Education: B.Tech in Computer Science, 2024 passout
  Skills: React, JavaScript, HTML5, CSS3, Redux, Git, TypeScript, Next.js
  Projects: E-commerce web app built with React.js and Tailwind CSS, REST API integration
  Experience: Fresher / 0 years (Looking for entry-level / junior software developer roles)
  `;

  const profile = extractQuickProfile(fresherResume);
  console.log('\n=== EXTRACTED CANDIDATE PROFILE ===');
  console.log(JSON.stringify(profile, null, 2));

  console.log('\n=== REAL SCORING FOR SCRAPED JOBS ===');
  for (let i = 0; i < Math.min(5, jobs.length); i++) {
    const scored = scoreNaukriJob(profile, jobs[i]);
    console.log(`\nJob #${i + 1}: ${jobs[i].title} at ${jobs[i].company}`);
    console.log(`Experience required: ${jobs[i].experienceText} (${jobs[i].experienceMin}-${jobs[i].experienceMax} yrs)`);
    console.log(`Fit Score: ${scored.fitScore}% [Tier: ${scored.matchTier.toUpperCase()}]`);
    console.log(`Fresher Friendly: ${scored.isFresherFriendly}`);
    console.log(`Matching Skills: ${scored.matchingSkills.join(', ') || 'None'}`);
    console.log(`Missing Skills: ${scored.missingSkills.join(', ') || 'None'}`);
    console.log(`Fit Reason: ${scored.fitReason}`);
    console.log(`Prep Tips:`);
    scored.interviewPrepTips.forEach(tip => console.log(` - ${tip}`));
  }
}
