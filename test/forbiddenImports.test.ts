import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const srcDir = join(here, '..', 'src');

function collectTsFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...collectTsFiles(full));
    } else if (full.endsWith('.ts')) {
      out.push(full);
    }
  }
  return out;
}

// These must never appear in a headless runtime (spec §3, §23, acceptance §25.3).
const FORBIDDEN: Array<{ label: string; pattern: RegExp }> = [
  { label: 'pixi.js', pattern: /from\s+['"]pixi\.js['"]|require\(['"]pixi\.js['"]\)/ },
  { label: 'react', pattern: /from\s+['"]react['"]|require\(['"]react['"]\)/ },
  { label: 'react-dom', pattern: /from\s+['"]react-dom['"]/ },
  { label: 'canvas', pattern: /from\s+['"]canvas['"]/ },
  { label: 'window', pattern: /\bwindow\./ },
  { label: 'document', pattern: /\bdocument\./ },
  { label: 'HTMLElement', pattern: /\bHTMLElement\b/ },
];

describe('forbidden imports / no browser APIs', () => {
  const files = collectTsFiles(srcDir);

  it('finds source files to scan', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  for (const { label, pattern } of FORBIDDEN) {
    it(`does not reference "${label}" anywhere in src/`, () => {
      const offenders = files.filter((f) => pattern.test(readFileSync(f, 'utf8')));
      expect(offenders, `Found "${label}" in: ${offenders.join(', ')}`).toEqual([]);
    });
  }

  it('declares no runtime dependency other than zod', () => {
    const pkg = JSON.parse(readFileSync(join(here, '..', 'package.json'), 'utf8')) as {
      dependencies?: Record<string, string>;
    };
    expect(Object.keys(pkg.dependencies ?? {})).toEqual(['zod']);
  });
});
