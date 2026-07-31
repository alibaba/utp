import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const projectRoot = resolve(import.meta.dirname, '..', '..', '..');
const docsRoot = resolve(projectRoot, 'docs');

function walk(directory) {
  return readdirSync(directory).flatMap((entry) => {
    const path = resolve(directory, entry);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

test('published documentation excludes forbidden editable and backup artifacts', () => {
  const forbidden = walk(docsRoot).filter((path) => /\.(puml|bak)$/i.test(path));

  assert.deepEqual(forbidden, []);
});

test('published pages do not link to PlantUML source files', () => {
  const markdown = walk(resolve(docsRoot, 'specification'))
    .filter((path) => path.endsWith('.md'))
    .map((path) => readFileSync(path, 'utf8'))
    .join('\n');

  assert.doesNotMatch(markdown, /href=["'][^"']+\.puml["']/i);
});
