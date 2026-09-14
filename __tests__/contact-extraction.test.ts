import { describe, it, expect } from 'vitest';
import { extractContactInfo, extractQuickProfile } from '@/lib/naukri/resume-analyzer';

describe('extractContactInfo & Resume Contact Extraction', () => {
  it('extracts real email, phone, and name from a realistic resume', () => {
    const resume = `
    Vinod Kumar Kondeti
    Email: vinodkondeti081@gmail.com | Phone: +91 9390234567
    Bengaluru, Karnataka, India

    PROFESSIONAL SUMMARY
    Passionate Frontend / Fullstack Developer with expertise in React, Next.js, and TypeScript.
    `;

    const contact = extractContactInfo(resume);
    expect(contact.name).toBe('Vinod Kumar Kondeti');
    expect(contact.email).toBe('vinodkondeti081@gmail.com');
    expect(contact.phone).toBe('9390234567');
  });

  it('handles Indian numbers with hyphens and spaces', () => {
    const resume = `
    Rahul Sharma
    rahul.sharma@example.in
    +91-98765-43210
    Hyderabad, India
    `;

    const contact = extractContactInfo(resume);
    expect(contact.name).toBe('Rahul Sharma');
    expect(contact.email).toBe('rahul.sharma@example.in');
    expect(contact.phone).toBe('9876543210');
  });

  it('extracts labeled phone numbers cleanly', () => {
    const resume = `
    PRIYA ANAND
    priya@gmail.com
    Mobile No: 9123456789
    Chennai, India
    `;

    const contact = extractContactInfo(resume);
    expect(contact.name).toBe('Priya Anand');
    expect(contact.email).toBe('priya@gmail.com');
    expect(contact.phone).toBe('9123456789');
  });

  it('populates candidate profile directly with real contact data', () => {
    const resume = `
    Vinod Kumar Kondeti
    vinodkondeti081@gmail.com | 9390234567
    Education: B.Tech in Computer Science, 2024
    Skills: React, JavaScript, TypeScript, Node.js
    Experience: Fresher (0 years)
    `;

    const profile = extractQuickProfile(resume);
    expect(profile.name).toBe('Vinod Kumar Kondeti');
    expect(profile.email).toBe('vinodkondeti081@gmail.com');
    expect(profile.phone).toBe('9390234567');
    expect(profile.experienceLevel).toBe('fresher');
  });

  it('safely handles resumes without phone or email without crashing', () => {
    const resume = `
    Priya Sharma
    B.Tech graduate
    Skills: Python, Django
    `;

    const contact = extractContactInfo(resume);
    expect(contact.name).toBe('Priya Sharma');
    expect(contact.email).toBeUndefined();
    expect(contact.phone).toBeUndefined();
  });
});
