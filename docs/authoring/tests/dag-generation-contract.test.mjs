import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const projectRoot = resolve(import.meta.dirname, '..', '..', '..');
const document = readFileSync(
  resolve(projectRoot, 'docs/specification/protocol-core/path-orchestration.md'),
  'utf8',
);

test('execution_dag transparently carries the negotiated service catalog snapshot', () => {
  const match = document.match(
    /### 运行期执行 DAG 示例[\s\S]*?```json\n([\s\S]*?)\n```/,
  );

  assert.ok(match, 'missing execution_dag JSON example');
  const dag = JSON.parse(match[1]);

  assert.ok(Array.isArray(dag.service_catalogs));
  assert.ok(dag.service_catalogs[0].roles.includes('Seller'));
  assert.equal(dag.service_catalogs[0].services[0].endpoint, 'https://seller.example.com/utp');
  assert.ok(dag.nodes.every((node) => !('selected_service_id' in node)));
  assert.ok(dag.nodes.every((node) => !('endpoint' in node)));
});

test('DAG generation defines the core skeleton and does not select transport', () => {
  assert.match(document, /primitive_dag_skeleton/);
  assert.match(document, /Source\s*→\s*Negotiate\s*→\s*Purchase\s*→\s*Pay\s*→\s*Fulfill/);
  assert.match(document, /Source\s*→\s*Purchase/);
  assert.match(document, /生成算法/);
  assert.match(document, /NegotiationResult\.service_catalogs/);
  assert.match(document, /不得选择具体的 Service、Endpoint 或传输绑定/);
});
