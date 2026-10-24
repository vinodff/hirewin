import fs from 'fs';
import path from 'path';
import { parseNaukriMarkdown } from '../lib/naukri/cloud-scraper';
import { rankNaukriJobs } from '../lib/naukri/matcher';
import { extractQuickProfile } from '../lib/naukri/resume-analyzer';

const text = fs.readFileSync(path.resolve(process.cwd(), 'fresher-scrape.txt'), 'utf-8');
const jobs = parseNaukriMarkdown(text);
console.log('Parsed jobs count from real fresher scrape:', jobs.length);

const fresherResume = `
VINOD KUMAR
Frontend Developer / React Developer
Skills: React, JavaScript, HTML5, CSS3, Redux, Git, TypeScript, Next.js, REST APIs
Education: B.Tech in CSE, 2024 passout
Experience: Fresher / 0 years (Looking for entry-level React developer or Software Engineer trainee)
`;

const profile = extractQuickProfile(fresherResume);
const ranked = rankNaukriJobs(profile, jobs);

console.log('\n================ RANKED LIVE FRESHER JOBS ================');
ranked.forEach((j, idx) => {
  console.log(`\n#${idx + 1} [${j.fitScore}% - ${j.matchTier.toUpperCase()}] ${j.title} at ${j.company}`);
  console.log(`   Experience: ${j.experienceText} (${j.experienceMin}-${j.experienceMax} yrs) | Mode: ${j.workMode} | Location: ${j.location}`);
  console.log(`   Fit Reason: ${j.fitReason}`);
  console.log(`   Matching Skills: ${j.matchingSkills.join(', ') || 'None'}`);
  console.log(`   Missing Skills: ${j.missingSkills.join(', ') || 'None'}`);
  console.log(`   URL: ${j.jobUrl}`);
});
