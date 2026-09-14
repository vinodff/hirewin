/**
 * Real Candidate Profile Vault for automated Naukri application filling.
 * Holds canonical personal, educational, and compensation preferences.
 */

export interface RealApplicantVault {
  fullName: string;
  email: string;
  phone: string;
  currentLocation: string;
  totalExperienceYears: number; // 0 for fresher
  noticePeriod: 'Immediate' | '15 Days' | '30 Days' | '60 Days' | '90 Days';
  currentCtcLpa: number; // e.g. 0 for fresher
  expectedCtcLpa: number; // e.g. 5.5
  highestDegree: string; // e.g. 'B.Tech / B.E.'
  specialization: string; // e.g. 'Computer Science'
  collegeName: string;
  graduationYear: number; // e.g. 2026
  skills: string[];
  resumeText: string;
  resumePdfPath?: string; // Optional path to local PDF file for attachment
}

export function validateApplicantVault(data: Partial<RealApplicantVault>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!data.fullName || data.fullName.trim().length < 2) {
    errors.push('Full name is required.');
  }
  if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.push('Valid email address is required.');
  }
  if (!data.phone || !/^\+?[0-9]{10,14}$/.test(data.phone.replace(/[\s-]/g, ''))) {
    errors.push('Valid 10-digit mobile number is required.');
  }
  if (data.totalExperienceYears === undefined || data.totalExperienceYears < 0) {
    errors.push('Total experience must be 0 (fresher) or positive.');
  }
  if (!data.currentLocation) {
    errors.push('Current location is required.');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * A blank template, NOT a usable applicant.
 *
 * The defaults were a real person's name and a placeholder phone number, so a
 * partly-filled vault submitted a genuine job application under that name with
 * a number that is not theirs. Identity is now required: no argument, no vault.
 *
 * validateApplicantVault() still has to pass before anything is submitted —
 * this only stops the shape being convincing enough to slip through.
 */
export function createBlankVault(
  name: string,
  email: string,
  phone: string
): RealApplicantVault {
  return {
    fullName: name,
    email: email,
    phone: phone,
    currentLocation: 'Bengaluru',
    totalExperienceYears: 0,
    noticePeriod: 'Immediate',
    currentCtcLpa: 0,
    expectedCtcLpa: 6.0,
    highestDegree: 'B.Tech / B.E.',
    specialization: 'Computer Science and Engineering',
    collegeName: 'University / Institute of Technology',
    graduationYear: 2026,
    skills: ['React.js', 'Next.js', 'TypeScript', 'Tailwind CSS', 'Node.js', 'JavaScript'],
    resumeText: '',
  };
}
