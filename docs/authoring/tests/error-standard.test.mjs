import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const projectRoot = resolve(import.meta.dirname, '..', '..', '..');

function read(relativePath) {
  return readFileSync(resolve(projectRoot, relativePath), 'utf8');
}

test('MessageEnvelope error payload uses the standard ErrorResponse wrapper', () => {
  const envelope = JSON.parse(read('schemas/transport/message_envelope.json'));
  const errorBranch = envelope.allOf.find(
    ({ if: condition }) => condition?.properties?.message_type?.const === 'error',
  );

  assert.equal(
    errorBranch.then.properties.payload.$ref,
    '../primitives/common/error_response.json',
  );
});

test('transport and primitive documents define separate error-code ownership', () => {
  const transport = read('docs/specification/protocol-core/transport-communication.md');
  const primitive = read('docs/specification/protocol-core/primitive-framework.md');
  const index = read('docs/specification/reference/errors.md');

  assert.match(transport, /TRANSPORT\.MESSAGE_INVALID/);
  assert.match(transport, /P0 ErrorResponse/);
  assert.match(primitive, /TRANSPORT\.\{CATEGORY\}_\{DETAIL\}/);
  assert.match(primitive, /UTP\.\{CATEGORY\}_\{DETAIL\}/);
  assert.match(index, /TRANSPORT\.\*/);
  assert.match(index, /\{PRIMITIVE\}\.\{ACTION\}\.\{DETAIL\}/);
});
