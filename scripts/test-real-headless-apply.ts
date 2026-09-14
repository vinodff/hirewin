import path from 'node:path';
import os from 'node:os';
import { applyToNaukriJob } from '../lib/naukri/headless-applier';
import type { NaukriJobListing } from '../lib/naukri/types';
import type { RealApplicantVault } from '../lib/naukri/profile-vault';

const testJob: NaukriJobListing = {
  id: '251125508078',
  title: 'React.js Frontend Intern Fresher Entry Level',
  company: 'Code Inbound',
  experienceText: '0-1 Yrs',
  experienceMin: 0,
  experienceMax: 1,
  salaryText: 'Unpaid',
  location: 'New Delhi',
  workMode: 'onsite',
  skills: ['React', 'JavaScript', 'HTML', 'CSS', 'Frontend'],
  descriptionSnippet: 'React.js frontend intern position for freshers and entry level candidates',
  jobUrl: 'https://www.naukri.com/job-listings-react-js-frontend-intern-fresher-entry-level-code-inbound-llp-new-delhi-0-to-1-years-251125508078',
  postedDateText: '1 day ago',
  applyType: 'naukri_easy_apply',
};

const vault: RealApplicantVault = {
  fullName: 'Test Applicant',
  email: 'test@example.com',
  phone: '9999999999',
  currentLocation: 'Bengaluru',
  totalExperienceYears: 0,
  currentCtcLpa: 0,
  expectedCtcLpa: 5,
  noticePeriod: 'Immediate',
  highestDegree: 'B.Tech / B.E.',
  specialization: 'Computer Science and Engineering',
  collegeName: 'Test Institute of Technology',
  graduationYear: 2026,
  skills: ['React', 'JavaScript', 'TypeScript', 'HTML5', 'CSS3', 'Git', 'Redux'],
  resumeText: 'Test resume content for dry-run only.',
};

async function run() {
  console.log('=== STARTING REAL HEADLESS AUTO-APPLY TEST ===');
  console.log('Target Job:', testJob.title, 'at', testJob.company);
  console.log('URL:', testJob.jobUrl);

  const result = await applyToNaukriJob({
    job: testJob,
    vault,
    // Never false in this script. It drives a real browser at a real posting;
    // a non-dry run would submit an actual application to a real employer.
    dryRun: true,
    headless: true,
    timeoutMs: 35000,
    // Required now. Omitting it used to fall back to one shared browser
    // profile for every caller.
    sessionDir: path.join(os.tmpdir(), 'hirewin-naukri-sessions', 'manual-test'),
  });

  console.log('\n=== HEADLESS AUTO-APPLY EXECUTION RESULT ===');
  console.log(JSON.stringify(result, null, 2));
}

run().catch(console.error);
