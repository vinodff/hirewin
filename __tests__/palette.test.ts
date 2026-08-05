import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

/**
 * Guards the palette migration. 207 hard-coded colours across 45 files became
 * CSS custom properties; without a check, one copy-pasted violet hex quietly
 * undoes it and nobody notices until a screenshot looks wrong.
 */

const OLD_BRAND = [
  /#7c3aed/i,        // violet accent
  /#3b82f6/i,        // blue gradient partner
  /#a78bfa/i,
  /#c4b5fd/i,
  /#080d1a/i,        // old ground
  /#0f1629/i,        // old surface
  /rgba\(\s*124\s*,\s*58\s*,\s*237/,
  /rgba\(\s*59\s*,\s*130\s*,\s*246/,
  /\b(?:text|bg|border|from|to|via|ring)-purple-\d{2,3}\b/,

  // "Verified" must be ONE green. Tailwind's green-400 (#4ade80) is a
  // different hue from our signal (#34D399), so the same meaning was
  // rendering in two colours depending on the component.
  /#4ade80/i,
  /rgba\(\s*34\s*,\s*197\s*,\s*94/,
  /rgba\(\s*74\s*,\s*222\s*,\s*128/,
  /\b(?:text|bg|border)-green-\d{2,3}\b/,
];

// LinkedIn's own blue is contextual branding, not ours.
const ALLOWED = [/#0a66c2/i, /#0284c7/i];

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === '.next' || entry.startsWith('.')) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (['.ts', '.tsx', '.css', '.html'].includes(extname(entry))) out.push(full);
  }
  return out;
}

const FILES = ['app', 'components', 'lib', 'extension'].flatMap((d) => {
  try { return walk(d); } catch { return []; }
});

describe('palette migration', () => {
  it('finds source files to scan', () => {
    expect(FILES.length).toBeGreaterThan(20);
  });

  it('no file reintroduces an old brand colour', () => {
    const offenders: string[] = [];

    for (const file of FILES) {
      if (file.includes('__tests__')) continue;
      const text = readFileSync(file, 'utf-8');

      for (const line of text.split('\n')) {
        if (ALLOWED.some((a) => a.test(line))) continue;
        const hit = OLD_BRAND.find((p) => p.test(line));
        if (hit) offenders.push(`${file}: ${line.trim().slice(0, 90)}`);
      }
    }

    expect(offenders, `Old palette reintroduced:\n${offenders.join('\n')}`).toEqual([]);
  });

  it('globals.css defines the tokens every file now depends on', () => {
    const css = readFileSync('app/globals.css', 'utf-8');
    for (const token of [
      '--ground', '--surface', '--accent', '--accent-rgb',
      '--accent-soft', '--on-accent', '--signal',
    ]) {
      expect(css, `missing ${token}`).toContain(`${token}:`);
    }
  });

  it('emails carry a literal palette because mail clients lack CSS variables', () => {
    const email = readFileSync('lib/email.ts', 'utf-8');
    expect(email).not.toContain('var(--accent');
    expect(email.toLowerCase()).toContain('#10b981');
  });
});
