import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, extname, join, normalize, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// 目录布局：本脚本位于 docs-src/authoring/tests/
//   authoringRoot → docs-src/authoring（模板/评审清单/治理文件，不参与发布）
//   specRoot      → public/documentation/specification（构建产物，先执行 npm run docs:build）
//   assetsRoot    → public/documentation/assets（全站公共渲染资产）
const authoringRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const projectRoot = resolve(authoringRoot, '..', '..');
const specRoot = join(projectRoot, 'public', 'documentation', 'specification');
const assetsRoot = join(projectRoot, 'public', 'documentation', 'assets');
// css/js 产物经 esbuild 压缩（标识符重命名、注释剔除），编写规范断言针对源码
const sourceAssetsRoot = join(projectRoot, 'docs-src', 'assets');

assert.ok(
  existsSync(specRoot),
  'missing build output: run `npm run docs:build` before validate-site.mjs',
);

const primitives = [
  ['source', 'P1'],
  ['negotiate', 'P2'],
  ['purchase', 'P3'],
  ['pay', 'P4'],
  ['fulfill', 'P5'],
  ['resolve', 'P6'],
];
const transports = ['rest', 'mcp', 'a2a', 'embedded'];
const transportTitles = ['REST', 'MCP', 'A2A', 'Embedded'];
const statuses = new Set(['skeleton', 'drafting', 'review', 'approved', 'published']);
const manifestStatuses = new Set(['draft', 'review', 'approved', 'published']);
const legacyCorePages = [
  'core/architecture.html',
  'core/discovery-negotiation.html',
  'core/identity-trust.html',
  'core/modes-topology.html',
  'core/security-versioning.html',
  'core/transport.html',
];
const coreSectionIds = [
  'normative-language',
  'architecture-roles',
  'discovery-governance-negotiation',
  'identity-trust',
  'modes-topology',
  'transport-layer',
  'standard-primitives',
  'security',
  'versioning-compatibility',
  'glossary',
];
const coreSubsections = [
  ['architecture-scope', '范围'],
  ['participants', '参与方'],
  ['protocol-layers', '协议层次'],
  ['design-boundaries', '设计边界'],
  ['discovery-entry', '发现入口'],
  ['primitive-declaration', '原语声明'],
  ['session-negotiation', '协商流程'],
  ['negotiation-failure', '失败处理'],
  ['mode-governance', '治理'],
  ['identity-model', '身份模型'],
  ['authentication', '认证'],
  ['authorization-delegation', '授权与委托'],
  ['evidence', '证据'],
  ['transaction-modes', '交易模式'],
  ['commercial-topology', '商业拓扑'],
  ['mode-topology-negotiation', '协商'],
  ['mapping-principles', '映射原则'],
  ['envelope-mapping', '信封映射'],
  ['transport-errors', '状态和错误'],
  ['transport-security', '安全'],
  ['security-baseline', '安全基线'],
  ['date-version', '日期版本'],
  ['compatibility', '兼容性'],
  ['release-lifecycle', '发布生命周期'],
];
const templateContracts = {
  'templates/core.html': {
    section: 'core',
    headings: coreSectionIds,
  },
  'templates/guide.html': {
    section: 'guide',
    headings: ['audience', 'flow', 'example', 'validation'],
  },
  'templates/orchestration.html': {
    section: 'orchestration',
    headings: ['scope', 'composition', 'state', 'security'],
  },
  'templates/primitive.html': {
    section: 'primitive',
    primitive: true,
    headings: [
      'identity',
      'boundary',
      'participants',
      'lifecycle',
      'operations',
      'entities',
      'errors',
      'security',
      'relationships',
      'transports',
      'conformance',
      'examples',
    ],
  },
  'templates/reference.html': {
    section: 'reference',
    headings: ['scope', 'entries', 'maintenance'],
  },
  'templates/transport.html': {
    section: 'transport',
    primitive: true,
    headings: ['fundamentals', 'mapping', 'envelope', 'errors', 'reliability', 'security', 'examples'],
  },
};
const requiredFiles = [
  'index.html',
  'core/index.html',
  'manifest.json',
  'protocol-core/primitive-framework.html',
  'protocol-core/global-state-machine.html',
  'protocol-core/agent-friendly-interface.html',
  'protocol-core/human-agent-interaction.html',
  'schemas/index.html',
  'services/index.html',
  'services/trade/index.html',
];
const requiredAuthoringFiles = [
  'CONTRIBUTING.md',
  'OWNERS.yaml',
  'CHANGELOG.md',
  'templates/core.html',
  'templates/primitive.html',
  'templates/transport.html',
  'templates/orchestration.html',
  'templates/guide.html',
  'templates/reference.html',
  'review-checklists/normative.md',
  'review-checklists/security.md',
  'review-checklists/publication.md',
];
const requiredAssetFiles = [
  'styles/site.css',
  'scripts/site.js',
];

function walk(directory) {
  return readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

function read(path) {
  return readFileSync(join(specRoot, path), 'utf8');
}

function readAuthoring(path) {
  return readFileSync(join(authoringRoot, path), 'utf8');
}

function meta(html, name) {
  const pattern = new RegExp(
    `<meta\\s+name=["']${name}["']\\s+content=["']([^"']+)["']\\s*/?>`,
    'i',
  );
  return html.match(pattern)?.[1] ?? '';
}

for (const path of requiredFiles) {
  assert.ok(existsSync(join(specRoot, path)), `missing required file: ${path}`);
}
for (const path of requiredAuthoringFiles) {
  assert.ok(existsSync(join(authoringRoot, path)), `missing authoring file: ${path}`);
}
for (const path of requiredAssetFiles) {
  assert.ok(existsSync(join(assetsRoot, path)), `missing shared asset: assets/${path}`);
}

for (const path of legacyCorePages) {
  assert.ok(!existsSync(join(specRoot, path)), `legacy core page must be removed: ${path}`);
}

assert.deepEqual(
  readdirSync(join(authoringRoot, 'templates'))
    .filter((name) => extname(name) === '.html')
    .map((name) => `templates/${name}`)
    .filter((name) => name in templateContracts)
    .sort(),
  Object.keys(templateContracts).sort(),
  'templates must contain the six approved page types',
);

for (const [path, contract] of Object.entries(templateContracts)) {
  const html = readAuthoring(path);
  assert.equal(meta(html, 'utp-section'), contract.section, `${path}: incorrect utp-section`);
  if (contract.primitive) {
    assert.equal(
      meta(html, 'utp-primitive'),
      '{{PRIMITIVE_ID}}',
      `${path}: missing primitive placeholder`,
    );
  }
  assert.deepEqual(
    [...html.matchAll(/<h2\s+id=["']([^"']+)["']/g)].map((match) => match[1]),
    contract.headings,
    `${path}: incorrect H2 skeleton`,
  );
  assert.match(html, /<meta\s+name=["']utp-owner["']/, `${path}: missing owner placeholder`);
  assert.match(html, /<meta\s+name=["']utp-status["']/, `${path}: missing status metadata`);
  assert.match(html, /content=["']\{\{VERSION\}\}["']/, `${path}: missing version placeholder`);
  assert.match(html, /assets\/styles\/site\.css/, `${path}: missing shared stylesheet`);
  assert.match(html, /assets\/scripts\/site\.js/, `${path}: missing shared script`);
  assert.match(html, /data-site-nav/, `${path}: missing site navigation container`);
  assert.match(html, /data-doc-meta/, `${path}: missing document metadata container`);
  assert.match(html, /data-page-navigation/, `${path}: missing previous/next navigation container`);
  assert.match(html, /data-page-toc/, `${path}: missing page TOC container`);
  assert.match(html, /class=["']site-header["']/, `${path}: missing site header`);
  assert.match(html, /class=["']skip-link["']/, `${path}: missing skip link`);
  assert.match(html, /href=["']\/search["']/, `${path}: missing project search link`);
  assert.doesNotMatch(html, /data-theme-toggle/, `${path}: theme toggle is not allowed`);
  assert.match(html, /<article\s+class=["']spec-content["']/, `${path}: missing content article`);
}

assert.ok(
  existsSync(join(specRoot, 'protocol-core/primitive-framework.html')),
  'missing P0 overview: protocol-core/primitive-framework.html',
);
for (const [name, id] of primitives) {
  const overview = `primitives/${name}/index.html`;
  assert.ok(existsSync(join(specRoot, overview)), `missing ${id} overview: ${overview}`);

  for (const transport of transports) {
    const binding = `primitives/${name}/transports/${transport}.html`;
    assert.ok(existsSync(join(specRoot, binding)), `missing ${id} ${transport} binding`);
  }
}

const manifest = JSON.parse(read('manifest.json'));
assert.equal(manifest.protocol, 'UTP', 'manifest protocol must be UTP');
assert.match(manifest.version, /^\d{4}-\d{2}-\d{2}$/, 'manifest version must be YYYY-MM-DD');
assert.ok(manifestStatuses.has(manifest.status), 'manifest status is invalid');

function navigationLeaves(items) {
  return items.flatMap((item) => (item.children ? navigationLeaves(item.children) : [item]));
}

const leaves = navigationLeaves(manifest.navigation);
assert.ok(leaves.length > 0, 'manifest navigation must not be empty');
assert.equal(
  new Set(leaves.map(({ path }) => path)).size,
  leaves.length,
  'manifest navigation leaf paths must be unique',
);
for (const leaf of leaves) {
  assert.ok(leaf.path, `navigation leaf is missing a path: ${leaf.title}`);
  assert.ok(
    manifest.pages.some(({ path }) => path === leaf.path),
    `navigation leaf is not registered in pages: ${leaf.path}`,
  );
  assert.ok(existsSync(join(specRoot, leaf.path)), `navigation leaf does not exist: ${leaf.path}`);
}

const owners = readAuthoring('OWNERS.yaml');
const ownerMappings = new Map(
  [...owners.matchAll(/^ {2}([^:\n]+):\n {4}owner: ([^\n]+)$/gm)].map((match) => [
    match[1],
    match[2].trim(),
  ]),
);
for (const section of [
  'schemas',
  'services',
  'assets',
  'templates',
  'review-checklists',
  'tests',
  'manifest.json',
  'CONTRIBUTING.md',
  'OWNERS.yaml',
  'CHANGELOG.md',
]) {
  assert.ok(ownerMappings.has(section), `OWNERS.yaml: missing owner mapping for ${section}`);
}

const primitiveCommons = read('protocol-core/primitive-framework.html');
assert.match(primitiveCommons, /\bMUST\b/, 'P0 must contain normative requirements');
assert.match(
  primitiveCommons,
  /severity[\s\S]*recoverable/,
  'P0 error example must separate severity from recoverability',
);

for (const page of manifest.pages) {
  assert.ok(existsSync(join(specRoot, page.path)), `manifest page does not exist: ${page.path}`);
}
assert.equal(
  new Set(manifest.pages.map(({ path }) => path)).size,
  manifest.pages.length,
  'manifest page paths must be unique',
);

const htmlFiles = walk(specRoot).filter((path) => extname(path) === '.html');
for (const page of manifest.pages) {
  assert.ok(
    htmlFiles.some((path) => relative(specRoot, path) === page.path),
    `manifest page missing from build output: ${page.path}`,
  );
}

for (const path of htmlFiles) {
  const html = readFileSync(path, 'utf8');
  const localPath = relative(specRoot, path);
  const ownerSection = [...ownerMappings.keys()]
    .filter(
      (section) =>
        (section === 'index' && localPath === 'index.html') ||
        localPath === `${section}.html` ||
        localPath.startsWith(`${section}/`),
    )
    .sort((left, right) => right.length - left.length)[0];

  assert.match(manifest.version, /^\d{4}-\d{2}-\d{2}$/, 'manifest version format');
  assert.match(meta(html, 'utp-version'), /^\d{4}-\d{2}-\d{2}$/, `${localPath}: invalid version`);
  assert.ok(meta(html, 'utp-owner'), `${localPath}: missing utp-owner`);
  assert.ok(ownerSection, `${localPath}: no matching section in OWNERS.yaml`);
  assert.equal(
    meta(html, 'utp-owner'),
    ownerMappings.get(ownerSection),
    `${localPath}: owner does not match OWNERS.yaml section ${ownerSection}`,
  );
  assert.ok(statuses.has(meta(html, 'utp-status')), `${localPath}: invalid utp-status`);
  assert.match(html, /<article\s+class=["']spec-content["']/, `${localPath}: missing content article`);
  assert.match(html, /assets\/styles\/site\.css/, `${localPath}: missing shared stylesheet`);
  assert.match(html, /assets\/scripts\/site\.js/, `${localPath}: missing shared script`);
  assert.match(html, /class=["']site-header["']/, `${localPath}: missing site header`);
  assert.match(html, /class=["']skip-link["']/, `${localPath}: missing skip link`);
  assert.match(html, /data-site-nav/, `${localPath}: missing site navigation container`);
  // 静态预渲染导航：每页必须内联完整导航树；导航叶子页面高亮当前页
  assert.match(html, /<details class="nav-group/, `${localPath}: missing prerendered navigation tree`);
  if (leaves.some((leaf) => leaf.path === localPath)) {
    assert.match(
      html,
      /aria-current="page"/,
      `${localPath}: current page must be highlighted in prerendered navigation`,
    );
    // 位于分组内的叶子，所属分组必须静态展开；顶级直链叶子无此要求
    const inGroup = manifest.navigation.some(
      (item) => item.children && navigationLeaves([item]).some((leaf) => leaf.path === localPath),
    );
    if (inGroup) {
      assert.match(
        html,
        /<details class="nav-group[^>]* open>/,
        `${localPath}: active navigation group must be open`,
      );
    }
  }
  assert.match(html, /data-doc-meta/, `${localPath}: missing document metadata container`);
  assert.match(html, /data-page-navigation/, `${localPath}: missing previous/next navigation container`);
  assert.match(html, /data-page-toc/, `${localPath}: missing page TOC container`);
  assert.match(html, /href=["']\/search["']/, `${localPath}: missing project search link`);
  assert.doesNotMatch(html, /data-theme-toggle/, `${localPath}: theme toggle is not allowed`);
  if (!localPath.startsWith('merchant/')) {
    assert.doesNotMatch(html, /\bcapabilit(?:y|ies)\b/i, `${localPath}: use Primitive/原语`);
  }
  assert.doesNotMatch(html, /\b(?:TODO|TBD)\b/i, `${localPath}: ambiguous placeholder`);
  assert.doesNotMatch(html, /\.\.\/spec-enhance\.js/, `${localPath}: outside script dependency`);

  const ids = new Set([...html.matchAll(/\sid=["']([^"']+)["']/g)].map((match) => match[1]));
  const references = [...html.matchAll(/\s(?:href|src)=["']([^"']+)["']/g)].map(
    (match) => match[1],
  );

  for (const reference of references) {
    if (reference === '/search' || reference === '/documentation') {
      continue;
    }

    if (
      reference.startsWith('#') ||
      reference.startsWith('http:') ||
      reference.startsWith('https:') ||
      reference.startsWith('mailto:') ||
      reference.startsWith('data:')
    ) {
      if (reference.startsWith('#')) {
        assert.ok(ids.has(reference.slice(1)), `${localPath}: missing anchor ${reference}`);
      }
      continue;
    }

    const withoutQuery = reference.split(/[?#]/, 1)[0];
    if (
      reference.startsWith('/') &&
      reference !== '/documentation' &&
      !reference.startsWith('/documentation/specification/') &&
      !reference.startsWith('/documentation/assets/')
    ) {
      assert.fail(`${localPath}: unexpected site-root reference: ${reference}`);
    }
    let target;
    if (reference.startsWith('/documentation/specification/')) {
      target = join(specRoot, withoutQuery.slice('/documentation/specification/'.length));
    } else if (reference.startsWith('/documentation/assets/')) {
      target = join(assetsRoot, withoutQuery.slice('/documentation/assets/'.length));
    } else {
      target = resolve(dirname(path), withoutQuery);
    }
    const normalizedTarget = normalize(target);

    assert.ok(
      normalizedTarget === specRoot ||
        normalizedTarget.startsWith(`${specRoot}/`) ||
        normalizedTarget === assetsRoot ||
        normalizedTarget.startsWith(`${assetsRoot}/`),
      `${localPath}: reference escapes specification: ${reference}`,
    );
    assert.ok(existsSync(normalizedTarget), `${localPath}: broken reference ${reference}`);
  }
}

const core = read('core/index.html');
assert.equal(meta(core, 'utp-owner'), 'protocol-architecture', 'core index owner is incorrect');
assert.equal(meta(core, 'utp-status'), 'skeleton', 'core index status is incorrect');
assert.match(core, /<h1>UTP 协议核心<\/h1>/, 'core index H1 is incorrect');
assert.deepEqual(
  [...core.matchAll(/<h2\s+id=["']([^"']+)["']/g)].map((match) => match[1]),
  coreSectionIds,
  'core index H2 ids and order must remain stable',
);
assert.deepEqual(
  [...core.matchAll(/<h3\s+id=["']([^"']+)["']>([^<]+)<\/h3>/g)].map((match) => [
    match[1],
    match[2],
  ]),
  coreSubsections,
  'core index must preserve all 24 reviewed subsection slots in order',
);
assert.match(
  core,
  /href=["']\/documentation\/specification\/protocol-core\/primitive-framework\.html["']/,
  'core index must link P0 overview',
);
for (const [name, id] of primitives) {
  assert.match(
    core,
    new RegExp(`href=["']/documentation/specification/primitives/${name}/index\\.html["']`),
    `core index must link ${id} overview`,
  );
}

const siteScript = readFileSync(join(sourceAssetsRoot, 'scripts', 'site.js'), 'utf8');
// 导航树/面包屑/前后页由构建脚本静态写入 html（SEO 可抓取）；
// site.js 只保留交互逻辑，不得再在运行时拉取 manifest 或动态渲染导航
assert.doesNotMatch(
  siteScript,
  /fetch\(/,
  'site script must not fetch manifest at runtime (navigation is prerendered)',
);
assert.doesNotMatch(
  siteScript,
  /createElement\(['"]details['"]\)/,
  'site script must not render navigation groups at runtime',
);
assert.match(
  siteScript,
  /h2\[id\], h3\[id\], h4\[id\]/,
  'page TOC must include H2-H4',
);
assert.match(
  siteScript,
  /IntersectionObserver|addEventListener\(["']scroll["']/,
  'page TOC must track the current section while scrolling',
);
assert.match(
  siteScript,
  /matchMedia\(["']\(max-width: 767px\)["']\)\.matches[\s\S]*closeMenu\(\)/,
  'mobile navigation must close after a leaf is opened',
);
assert.match(
  siteScript,
  /event\.key === ["']Escape["'][\s\S]*closeMenu\(\)/,
  'Escape must close the mobile navigation drawer',
);
assert.doesNotMatch(siteScript, /localStorage/, 'site script must not persist theme state');
assert.doesNotMatch(siteScript, /prefers-color-scheme/, 'site script must not infer a dark theme');
assert.doesNotMatch(siteScript, /data-theme-toggle/, 'site script must not implement theme toggling');

const siteStyles = readFileSync(join(sourceAssetsRoot, 'styles', 'site.css'), 'utf8');
assert.doesNotMatch(siteStyles, /data-theme=["']?dark/i, 'stylesheet must not contain a dark theme');
assert.doesNotMatch(siteStyles, /color-scheme:\s*dark/i, 'stylesheet must be light-only');
assert.match(siteStyles, /--header-height:\s*48px/, 'site header must be 48px high');
assert.match(siteStyles, /--sidebar-width:\s*242px/, 'left navigation must be approximately 242px');
assert.match(siteStyles, /--toc-width:\s*242px/, 'right TOC must be approximately 242px');
assert.match(siteStyles, /--accent:\s*#4051b5/i, 'links must use the approved UCP accent');
assert.match(
  siteStyles,
  /grid-template-columns:\s*var\(--sidebar-width\)\s+minmax\(0,\s*1fr\)\s+var\(--toc-width\)/,
  'desktop layout must contain three columns',
);
assert.match(
  siteStyles,
  /@media\s*\(max-width:\s*1219px\)[\s\S]*\.page-toc\s*\{\s*display:\s*none;/,
  'tablet layout must hide the right TOC below 1220px',
);
assert.match(
  siteStyles,
  /@media\s*\(max-width:\s*767px\)[\s\S]*\.site-sidebar[\s\S]*transform:\s*translateX\(-101%\)/,
  'mobile layout must turn the left navigation into a drawer',
);

// 发布产物中不允许出现 md/yaml 等非文档文件（指南与工具已隔离到 docs-src/authoring/）
const productionFiles = walk(join(projectRoot, 'public', 'documentation'));
for (const path of productionFiles) {
  if (!['.html', '.css', '.js', '.json', '.svg'].includes(extname(path))) {
    throw new Error(`unexpected production file type: ${relative(projectRoot, path)}`);
  }
  const content = readFileSync(path, 'utf8');
  const productionPath = relative(projectRoot, path);
  if (!productionPath.startsWith('public/documentation/specification/merchant/')) {
    assert.doesNotMatch(
      content,
      /\bcapabilit(?:y|ies)\b/i,
      `${productionPath}: use Primitive/原语`,
    );
  }
  // CDN 发布检查器（no-source-comment）：css/js 产物不得含注释
  if (extname(path) === '.css' || extname(path) === '.js') {
    assert.doesNotMatch(
      content,
      /\/\*[^*]|(?:^|[^:'"])\/\/ /m,
      `${relative(projectRoot, path)}: production css/js must not contain comments`,
    );
  }
}

console.log(
  `Validated ${manifest.pages.length} manifest pages, ${htmlFiles.length} HTML files, and P0-P6.`,
);
