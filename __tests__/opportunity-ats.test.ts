import { describe, expect, test } from 'vitest';
import { __internal, ATS_BOARDS } from '@/lib/opportunities/ats';

const { readGreenhouse, readLever, readAshby, readSmartRecruiters, kindOf, workModeOf, compensationFrom, plain } =
  __internal;

const board = { vendor: 'greenhouse', slug: 'example', name: 'Example Corp' } as const;

/**
 * The fixtures below are trimmed from real responses captured while building
 * the registry. Keeping them verbatim is the point: these parsers exist to read
 * whatever four vendors actually send, and a hand-tidied fixture would test a
 * shape none of them produce.
 */

describe('readGreenhouse', () => {
  const payload = {
    jobs: [
      {
        absolute_url: 'https://job-boards.greenhouse.io/example/jobs/4731043005',
        title: 'Analyst, Business Operations',
        company_name: 'Razorpay Software Private Limited',
        location: { name: 'Bengaluru' },
        first_published: '2026-09-04T05:02:55-04:00',
        updated_at: '2026-09-05T05:02:55-04:00',
        application_deadline: null,
        content: '<p>Work with the ops team.</p>',
      },
    ],
  };

  test('reads title, url, location and organisation', () => {
    const [row] = readGreenhouse(payload, board);
    expect(row.title).toBe('Analyst, Business Operations');
    expect(row.applyUrl).toBe('https://job-boards.greenhouse.io/example/jobs/4731043005');
    expect(row.location).toBe('Bengaluru');
    // company_name from the API wins over the registry's display name.
    expect(row.organization).toBe('Razorpay Software Private Limited');
  });

  test('strips markup out of the description', () => {
    const [row] = readGreenhouse(payload, board);
    expect(row.description).toBe('Work with the ops team.');
  });

  test('a null application_deadline stays null rather than being invented', () => {
    const [row] = readGreenhouse(payload, board);
    expect(row.deadline).toBeNull();
  });

  test('reads a real application_deadline when the board publishes one', () => {
    const withDeadline = {
      jobs: [{ ...payload.jobs[0], application_deadline: '2026-10-31T00:00:00-04:00' }],
    };
    const [row] = readGreenhouse(withDeadline, board);
    expect(row.deadline).toBe('2026-10-31');
  });

  test('falls back to updated_at when first_published is absent', () => {
    const noPublish = { jobs: [{ ...payload.jobs[0], first_published: null }] };
    const [row] = readGreenhouse(noPublish, board);
    expect(row.postedAt).toBe('2026-09-05');
  });

  test('drops a posting with no title or no url', () => {
    expect(readGreenhouse({ jobs: [{ title: 'No URL' }] }, board)).toHaveLength(0);
    expect(readGreenhouse({ jobs: [{ absolute_url: 'https://x.test/1' }] }, board)).toHaveLength(0);
  });

  test('survives a body that is not the shape it expects', () => {
    expect(readGreenhouse(null, board)).toEqual([]);
    expect(readGreenhouse({ jobs: 'nope' }, board)).toEqual([]);
    expect(readGreenhouse({ jobs: [null, 42] }, board)).toEqual([]);
  });
});

describe('readLever', () => {
  const payload = [
    {
      text: 'Software Engineer Intern',
      hostedUrl: 'https://jobs.lever.co/example/abc-123',
      applyUrl: 'https://jobs.lever.co/example/abc-123/apply',
      categories: { commitment: 'Intern', location: 'Bengaluru, India', team: 'Engineering' },
      createdAt: 1756944000000,
      descriptionPlain: 'Six month internship. Stipend Rs.50,000/month.',
      country: 'IN',
      workplaceType: 'hybrid',
    },
  ];

  test('prefers the hosted URL over the apply URL', () => {
    const [row] = readLever(payload, board);
    // hostedUrl is the human-readable posting; applyUrl jumps straight to a form.
    expect(row.applyUrl).toBe('https://jobs.lever.co/example/abc-123');
  });

  test('reads the title out of `text`, not `title`', () => {
    const [row] = readLever(payload, board);
    expect(row.title).toBe('Software Engineer Intern');
  });

  test('classifies as an internship from the commitment field', () => {
    const [row] = readLever(payload, board);
    expect(row.kind).toBe('internship');
  });

  test('uses the registry name, since Lever carries no employer name', () => {
    const [row] = readLever(payload, board);
    expect(row.organization).toBe('Example Corp');
  });

  test('lifts a published stipend verbatim', () => {
    const [row] = readLever(payload, board);
    expect(row.compensation).toBe('Rs.50,000/month');
  });

  test('leaves the deadline null — Lever exposes no such field', () => {
    const [row] = readLever(payload, board);
    expect(row.deadline).toBeNull();
  });

  test('falls back to country when categories carry no location', () => {
    const [row] = readLever([{ ...payload[0], categories: {} }], board);
    expect(row.location).toBe('IN');
  });
});

describe('readAshby', () => {
  const payload = {
    jobs: [
      {
        id: 'd3bc1ced',
        title: 'Backend Engineer',
        employmentType: 'FullTime',
        location: 'Bengaluru, India',
        publishedAt: '2026-08-20T10:00:00Z',
        isListed: true,
        isRemote: false,
        workplaceType: 'Onsite',
        jobUrl: 'https://jobs.ashbyhq.com/example/d3bc1ced',
        descriptionPlain: 'Build the API.',
      },
    ],
  };

  test('reads a listed posting', () => {
    const [row] = readAshby(payload, board);
    expect(row.title).toBe('Backend Engineer');
    expect(row.location).toBe('Bengaluru, India');
    expect(row.postedAt).toBe('2026-08-20');
  });

  test('skips a posting the employer has unlisted', () => {
    const unlisted = { jobs: [{ ...payload.jobs[0], isListed: false }] };
    expect(readAshby(unlisted, board)).toHaveLength(0);
  });

  test('isRemote overrides whatever the workplace text says', () => {
    const remote = { jobs: [{ ...payload.jobs[0], isRemote: true, workplaceType: 'Onsite' }] };
    const [row] = readAshby(remote, board);
    expect(row.workMode).toBe('remote');
  });
});

describe('readSmartRecruiters', () => {
  const payload = {
    content: [
      {
        id: '744000012345',
        name: 'Graduate Engineer Trainee',
        company: { name: 'Bosch' },
        location: { city: 'Bengaluru', country: 'in' },
        releasedDate: '2026-09-01T00:00:00.000Z',
      },
    ],
  };

  test('builds the public posting URL rather than storing the API ref', () => {
    const [row] = readSmartRecruiters(payload, { ...board, vendor: 'smartrecruiters', slug: 'BoschGroup' });
    expect(row.applyUrl).toBe('https://jobs.smartrecruiters.com/BoschGroup/744000012345');
  });

  test('joins city and country into one location string', () => {
    const [row] = readSmartRecruiters(payload, board);
    expect(row.location).toBe('Bengaluru, in');
  });

  test('reads "Trainee" in the title as an internship', () => {
    const [row] = readSmartRecruiters(payload, board);
    expect(row.kind).toBe('internship');
  });
});

describe('kindOf', () => {
  test('a title saying Intern wins over an employment type saying Full-time', () => {
    expect(kindOf('Software Engineer Intern', 'Full-time')).toBe('internship');
  });

  test('an employment type saying Intern wins over a neutral title', () => {
    expect(kindOf('Software Engineer', 'INTERN')).toBe('internship');
  });

  test('trainee, apprentice and co-op all count', () => {
    expect(kindOf('Graduate Engineer Trainee', null)).toBe('internship');
    expect(kindOf('Apprentice Developer', null)).toBe('internship');
    expect(kindOf('Co-op Software Engineer', null)).toBe('internship');
  });

  test('an ordinary role is a job', () => {
    expect(kindOf('Backend Engineer', 'Full-time')).toBe('job');
  });

  test('does not read "internal" as "intern"', () => {
    // The word boundary is load-bearing: "Internal Audit Analyst" is a job.
    expect(kindOf('Internal Audit Analyst', 'Full-time')).toBe('job');
  });
});

describe('workModeOf', () => {
  test('hybrid is checked before remote, since hybrid postings say both', () => {
    expect(workModeOf('Remote / Hybrid — Bengaluru')).toBe('hybrid');
  });

  test('reads remote, onsite and unknown', () => {
    expect(workModeOf('Remote, India')).toBe('remote');
    expect(workModeOf('On-site, Pune')).toBe('onsite');
    expect(workModeOf('Bengaluru')).toBeNull();
    expect(workModeOf(null)).toBeNull();
  });
});

describe('compensationFrom', () => {
  test('reads rupee, dollar and per-period figures', () => {
    expect(compensationFrom('Stipend of Rs.50,000 per month')).toBe('Rs.50,000');
    expect(compensationFrom('Base salary $120,000/year')).toBe('$120,000/year');
    expect(compensationFrom('We offer ₹12,00,000 LPA')).toBe('₹12,00,000 LPA');
  });

  test('returns null when the page states no figure', () => {
    expect(compensationFrom('Competitive compensation and benefits.')).toBeNull();
    expect(compensationFrom(null)).toBeNull();
  });

  test('ignores a single-digit figure that is not a salary', () => {
    // "$5" is a coffee, not a stipend — two digits is the floor.
    expect(compensationFrom('Team of $5 pizza fame')).toBeNull();
  });
});

describe('plain', () => {
  test('removes scripts, styles and tags, and decodes entities', () => {
    const html = '<style>a{}</style><script>x()</script><p>Team&nbsp;&amp; culture</p>';
    expect(plain(html)).toBe('Team & culture');
  });

  test('truncates to the requested length', () => {
    expect(plain('<p>' + 'a'.repeat(500) + '</p>', 10)).toHaveLength(10);
  });

  test('empty markup reads as absent, not as an empty string', () => {
    // DESIGN.md rule 1: absent is absent. A "" here would render as a blank slot.
    expect(plain('<p></p>')).toBeNull();
    expect(plain(null)).toBeNull();
  });
});

describe('ATS_BOARDS registry', () => {
  test('every board has a vendor, slug and display name', () => {
    for (const entry of ATS_BOARDS) {
      expect(entry.slug.length).toBeGreaterThan(0);
      expect(entry.name.length).toBeGreaterThan(0);
      expect(['greenhouse', 'lever', 'ashby', 'smartrecruiters']).toContain(entry.vendor);
    }
  });

  test('no board is listed twice', () => {
    const keys = ATS_BOARDS.map((entry) => `${entry.vendor}:${entry.slug}`);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
