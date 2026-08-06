import { describe, it, expect } from 'vitest';
import { scoreResume } from '@/lib/ats-score';

const JD = ['React', 'JavaScript', 'SQL', 'HTML5', 'Git', 'Node.js', 'Docker', 'Kubernetes'];

/** The shape our own optimizer emits: real sections, certs, achievements. */
const OPTIMIZED = `VINOD KUMAR KONDETI
+91 8019238515 | vinod@example.com | linkedin.com/in/vinod | github.com/vinod

PROFESSIONAL SUMMARY
B.Tech Computer Science student with full-stack web development experience
building responsive interfaces and backend systems using JavaScript, React,
HTML5 and SQL, with Git-based collaboration across a hackathon-winning team.

TECHNICAL SKILLS
Frontend: HTML5, CSS3, JavaScript, React | Backend: Python, SQL | Tools: Git

PROJECTS
College Website - Full-Stack Web Platform | JavaScript, HTML5, SQL
• Designed and developed a complete web application for college operations, implementing new modules to improve administrative efficiency
• Built responsive user interfaces with HTML5, CSS3 and JavaScript, ensuring cross-browser compatibility
• Integrated SQL database for data management and implemented backend logic for student records
• Applied AI prompt engineering techniques to streamline content workflows and improve productivity

EDUCATION
B.Tech in Computer Science - BVC Institute of Technology | 3rd Year

CERTIFICATIONS
• Salesforce Certified - Salesforce
• Web Development - Infosys Springboard
• Ethical Hacking - NPTEL

ACHIEVEMENTS
• 1st Prize - College Hackathon: built a complete college website with operational modules
• Solved 40+ coding problems on LeetCode, strengthening algorithmic thinking
• Grew Instagram tech education account to 2,800+ followers through consistent content`;

const WEAK = `Jane Doe
jane@example.com

I am a computer science student looking for opportunities in the software field.
I have done some coursework and a few small assignments during college. I am a
quick learner and a good team player interested in technology and building things.`;

describe('scoreResume calibration', () => {
  it('scores a genuinely well-built resume in the 80s', () => {
    expect(scoreResume(OPTIMIZED, JD)).toBeGreaterThanOrEqual(80);
  });

  it('still scores a weak resume far below an optimized one', () => {
    // The gap is the product. If inflation ever closes it, the number is decoration.
    expect(scoreResume(WEAK, JD)).toBeLessThan(40);
    expect(scoreResume(OPTIMIZED, JD) - scoreResume(WEAK, JD)).toBeGreaterThan(30);
  });

  it('does not grade certifications and achievements as experience bullets', () => {
    // "Salesforce Certified - Salesforce" opens with no verb because that is how
    // a certification is written. Dropping those sections must not change the score.
    const withoutTrailingSections = OPTIMIZED.slice(0, OPTIMIZED.indexOf('CERTIFICATIONS'));
    expect(scoreResume(OPTIMIZED, JD)).toBeGreaterThanOrEqual(
      scoreResume(withoutTrailingSections, JD) - 5
    );
  });

  it('gives full keyword credit at strong-match coverage, not only at 100%', () => {
    // Docker and Kubernetes are absent — this candidate does not have them, and an
    // honest rewrite cannot invent them. 6/8 must not be treated as a 75% failure.
    expect(scoreResume(OPTIMIZED, JD)).toBeGreaterThan(scoreResume(OPTIMIZED, [...JD, 'Rust', 'Go']));
  });

  it('is deterministic', () => {
    expect(scoreResume(OPTIMIZED, JD)).toBe(scoreResume(OPTIMIZED, JD));
  });
});
