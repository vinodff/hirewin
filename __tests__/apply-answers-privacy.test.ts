/** Contact details never reach the AI prompt, even when they are inside the resume text. */
import { describe, expect, test } from 'vitest';
import { buildFormPrompt, redactContact } from '@/lib/apply/answers/ai';
import type { AnswerContext, FormQuestion } from '@/lib/apply/types';

const resume = `Priya Sharma
priya.sharma+jobs@example.co.in | +91 98765 43210 | 080-4123-4567
B.Tech CSE (2022 - 2026), CGPA 8.5
Built a 10000-row ETL pipeline in 2025.`;

const ctx: AnswerContext = {
  profile: {
    fullName: 'Priya Sharma',
    email: 'priya.sharma+jobs@example.co.in',
    phone: '9876543210',
    currentLocation: 'Hyderabad',
    totalExperienceYears: 0,
    noticePeriod: 'Immediate',
    currentCtcLpa: 0,
    expectedCtcLpa: 4.5,
    highestDegree: 'B.Tech',
    specialization: 'CSE',
    collegeName: '',
    graduationYear: 2026,
    skills: ['SQL'],
    resumeText: resume,
  },
  job: { title: 'Data Analyst', company: 'Acme', description: 'Mail hr@acme.in or call 9123456789.' },
};

const questions: FormQuestion[] = [
  { id: 'q', label: 'Are you comfortable with night shifts?', kind: 'radio', options: [{ label: 'Yes', value: 'y' }, { label: 'No', value: 'n' }], required: true },
];

describe('AI prompt privacy', () => {
  test('no email or phone number from the resume, profile or job text', () => {
    const { user } = buildFormPrompt(questions, ctx);
    expect(user).not.toMatch(/@example\.co\.in|hr@acme\.in/);
    expect(user.replace(/\D/g, ' ')).not.toMatch(/98765\s+43210|9876543210|9123456789|4123/);
    expect(user).toContain('[email]');
    expect(user).toContain('[phone]');
  });

  test('years, CGPA and ordinary numbers survive', () => {
    const out = redactContact(resume);
    expect(out).toContain('2022 - 2026');
    expect(out).toContain('CGPA 8.5');
    expect(out).toContain('10000-row');
    expect(out).toContain('2025');
  });
});
