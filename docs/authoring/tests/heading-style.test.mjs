import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const projectRoot = resolve(import.meta.dirname, '..', '..', '..');
const specificationRoot = resolve(projectRoot, 'docs/specification');
const numberedHeading = /^(?:#{1,6}\s+|<h[1-6][^>]*>)(?:第\s*\d+\s*章[：:]?\s*|\d+(?:\.\d+)*\s+)/im;

function markdownFiles(directory) {
  return readdirSync(directory).flatMap((name) => {
    const path = resolve(directory, name);
    return statSync(path).isDirectory() ? markdownFiles(path) : path.endsWith('.md') ? [path] : [];
  });
}

test('published specification headings use names instead of visible chapter numbers', () => {
  const violations = markdownFiles(specificationRoot)
    .filter((path) => numberedHeading.test(readFileSync(path, 'utf8')))
    .map((path) => path.slice(projectRoot.length + 1));

  assert.deepEqual(violations, []);
});
