import assert from 'node:assert/strict';
import { scoreResume } from './ats-score';

const JD_KEYWORDS = [
  'React', 'Node.js', 'JavaScript', 'REST APIs', 'MongoDB',
  'Git', 'HTML5', 'CSS3', 'Responsive Design', 'Debugging',
];

// A resume in the shape HireWin produces: full sections, contact line,
// short action-verb bullets, JD keywords woven in.
const OPTIMIZED = `JANE DOE
+91 9876543210 | jane@example.com | github.com/janedoe | linkedin.com/in/janedoe | Pune, India

PROFESSIONAL SUMMARY
Entry-level Web Developer with hands-on experience building full-stack applications
using React, Node.js and JavaScript. Skilled in Responsive Design, REST APIs and
writing clean, maintainable code. Backed by a B.Tech in Computer Science.

TECHNICAL SKILLS
Frontend: HTML5, CSS3, JavaScript, React, Responsive Design | Backend: Node.js, REST APIs
Databases: MongoDB, SQL | Tools: Git, VS Code, Postman | Concepts: Debugging, OOP, Agile

EXPERIENCE
Web Development Intern - Talent Shine (July 2025)
• Built REST APIs with Node.js serving the application data layer
• Implemented JWT authentication with bcrypt password hashing
• Debugged cross-browser layout issues across mobile and desktop
• Collaborated with two engineers using Git branching workflows

PROJECTS
Task Manager | React, Node.js, MongoDB (2025)
• Developed a full-stack task app with user authentication
• Designed responsive layouts using Flexbox and CSS Grid
• Integrated third-party REST APIs for calendar sync

Portfolio Site | HTML5, CSS3, JavaScript (2024)
• Created a static portfolio with semantic HTML5 markup
• Optimized page load by compressing images and inlining CSS3

EDUCATION
B.Tech in Computer Science Engineering - Pune Institute of Technology | CGPA: 8.2/10.0
Relevant Coursework: Data Structures, Algorithms, Database Management, Web Technologies

CERTIFICATIONS
• Full Stack Web Development - Infosys Springboard
• Responsive Design Fundamentals - freeCodeCamp

ACHIEVEMENTS
• Solved 200+ problems on LeetCode and HackerRank
• Achieved 5-star Python rating on HackerRank`;

// A raw, unoptimized resume: no sections, no bullets, almost no JD keywords.
const RAW = `Jane Doe
jane@example.com

I am a computer science student looking for opportunities in the software field.
I have done some coursework and a few small assignments during college. I am a
quick learner and a good team player, and I am interested in technology and
building things. I would like to work at a company where I can grow my skills
and contribute to meaningful work over time.`;

function run() {
  // 1. Deterministic — the whole point. Same input, same number, every call.
  const a = scoreResume(OPTIMIZED, JD_KEYWORDS);
  const b = scoreResume(OPTIMIZED, JD_KEYWORDS);
  assert.equal(a, b, 'same resume must score identically across calls');

  // 2. A well-structured, keyword-matched resume scores high.
  assert.ok(a > 80, `optimized resume should score > 80, got ${a}`);

  // 3. A raw resume with no structure and no keywords scores low.
  const rawScore = scoreResume(RAW, JD_KEYWORDS);
  assert.ok(rawScore < 40, `raw resume should score < 40, got ${rawScore}`);

  // 4. THE REPORTED BUG: re-uploading an already-optimized resume as a new
  //    "before" must return the same score it earned as an "after". Previously
  //    the prompt told the model before-resumes score 20-50%, so an 85 came
  //    back as a 40 on the second run.
  const asAfter = scoreResume(OPTIMIZED, JD_KEYWORDS);
  const asBefore = scoreResume(OPTIMIZED, JD_KEYWORDS);
  assert.equal(asBefore, asAfter, 're-uploaded resume must keep its score');

  // 5. Improvement is measured, not assumed — the gap is real.
  assert.ok(a - rawScore > 30, 'optimization must show a real, measured gain');

  // 6. Empty input is 0, not a crash.
  assert.equal(scoreResume('', JD_KEYWORDS), 0);
  assert.equal(scoreResume('   ', JD_KEYWORDS), 0);

  // 7. No JD keywords must not zero out a good resume (no JD signal to judge).
  assert.ok(scoreResume(OPTIMIZED, []) > 40, 'empty keyword list must not tank the score');

  // 8. Word-boundary matching — "react" must not be satisfied by "reactive".
  const decoy = RAW + '\nI am very reactive and proactive about nodejsing.';
  assert.ok(
    scoreResume(decoy, ['React']) <= scoreResume(RAW + '\nI build React apps.', ['React']),
    'substring matches must not count as keyword hits'
  );

  // 9. A few em-dashes are cosmetic and must NOT meaningfully move the score.
  const lightlyDirty = OPTIMIZED.replace(/ - /g, ' — ');
  assert.ok(
    Math.abs(scoreResume(lightlyDirty, JD_KEYWORDS) - a) <= 1,
    'a handful of em-dashes should not swing the score'
  );

  // ...but a PDF copy-paste that turns every space into a non-breaking space
  // genuinely breaks ATS parsers, and must cost real points.
  const mangled = OPTIMIZED.replace(/ /g, ' ');
  assert.ok(
    scoreResume(mangled, JD_KEYWORDS) < a - 5,
    `nbsp-mangled resume must lose real points, got ${scoreResume(mangled, JD_KEYWORDS)} vs ${a}`
  );

  console.log(`ok — raw ${rawScore}, optimized ${a}, gain +${a - rawScore}`);
}

run();
