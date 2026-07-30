---
title: 发现与协商
section: protocol-core
owner: protocol-architecture
status: skeleton
# 存量页面迁移：正文为 HTML 原样嵌入；后续编写新内容时可改为纯 Markdown（去掉 format 行）
format: html
---

<h1>发现与协商</h1>

      <h2 id="scope">目标与边界</h2>
      <p>发现与协商（Discovery and Negotiation）确定本次交易中每个相关 Role 由哪个逻辑 Agent 承担，以及每一对角色共同支持的 Primitive、Primitive 版本、扩展和 Mode 范围。Buyer Agent 是本流程的协调方。</p>
      <p>本流程接收两个参数：<code>role_domain_bindings</code> 用于定位 Profile，<code>role_relationships</code> 定义必须完成兼容性校验的无方向角色对。它不生成商业拓扑，不选择调用方或处理方；它只验证并输出可用 Service 的目录，不选择具体的 Service、Endpoint 或传输方式。路径编排也不参与这些选择；通信层在每次请求前依据该目录确认本次投递所用的 Service、Endpoint 和传输方式。</p>

      <h2 id="discovery-scope">发现范围</h2>
      <p><code>role_domain_bindings</code> 是 Role 到 Business Domain 的映射，<code>role_relationships</code> 是本次必须校验的无方向角色对集合。Buyer MUST 从全部角色对端点推导相关 Role；不参与任何角色对的绑定 MUST 被忽略，且不得导致发现失败。</p>
      <table><thead><tr><th>参数</th><th>类型</th><th>必填</th><th>说明</th></tr></thead><tbody><tr><td><code>role_domain_bindings</code></td><td>object</td><td>是</td><td>相关 Role 到不含路径、查询参数和片段的 DNS Domain 映射。</td></tr><tr><td><code>role_relationships</code></td><td>array</td><td>是</td><td>待协商的无方向角色对集合；每项 MUST 是恰好包含两个不同 Role 的数组。</td></tr></tbody></table>
      <pre><code>{
  "role_domain_bindings": {
    "Payer": "buyer.example.com",
    "PaymentProcessor": "payment.example.com",
    "Seller": "seller.example.com"
  },
  "role_relationships": [
    [
      "Payer",
      "PaymentProcessor"
    ]
  ]
}</code></pre>

      <h2 id="profile-discovery">Profile 发现</h2>
      <p>每个参与发现的 Business Domain MUST 在 <code>https://{business_domain}/.well-known/utp</code> 发布当前 UTP Profile。Buyer MUST 从全部角色对端点推导 <code>involved_roles</code>，校验其 Domain 绑定，按规范化 Domain 去重；同一 Domain 承担多个 Role 时，MUST 只解析一次并复用同一版本化 Profile。</p>
      <p>Buyer 以自身当前 Profile 的 <code>utp.version</code> 作为唯一提出版本。若远端当前 Profile 不匹配，Buyer MAY 通过 <code>supported_versions</code> 获取该版本的完整 Profile；找不到匹配版本时，发现事务 MUST 以 <code>UTP_VERSION_UNSUPPORTED</code> 失败。版本化 Profile 是自包含叶子文档，MUST NOT 再声明 <code>supported_versions</code>。</p>

      <h2 id="declaration-model">声明模型与可信来源</h2>
      <p>UTP Profile 是某个协议版本下的能力声明。它声明 <code>utp.version</code>、独立的 <code>supported_mode_range</code>、传输配置、Primitive、Role、安全能力、Mandate 能力和 <code>signing_keys</code>。Primitive 与扩展声明中的 <code>spec</code>、<code>schema</code> URI 是后续实现与校验的权威来源。</p>
      <p>本版本不定义跨垂直领域的 Service 拆分。Profile 的 <code>utp.services</code> MUST 是唯一服务配置数组，数组项用于声明同一贸易 API 面可用的 REST、MCP、A2A 或 Embedded 配置。数组项是传输配置，不是命名 Service、业务领域或路径编排候选。</p>
      <p><code>supported_mode_range</code> 是 Profile 级字段，适用于该 Participant 声明的全部 Role 与 Primitive；Role 和 Primitive 不得重复或覆盖该字段。Buyer 在采用 Profile 前 MUST 校验 JSON 结构、Domain 的部署信任绑定、协议版本、Service 传输及 HTTPS Endpoint、Role 对 Primitive 的引用和六维 Mode 范围。<code>signing_keys</code> 用于验证后续认证消息，不用于对 Profile 本身签名；每个用于消息签名的键 MUST 声明 <code>kid</code>、<code>alg</code>，并提供 <code>public_key_jwk</code> 或可经 HTTPS 获取的稳定 <code>key_uri</code>。</p>

      <h3 id="profile-example">Profile 示例</h3>
      <pre><code>{
  "$schema": "https://schemas.utp.dev/profile.json",
  "utp": {
    "version": "2026-07-01",
    "supported_mode_range": {
      "pricing_mode": ["L2"],
      "decision_path": ["L1", "L2"],
      "payment_structure": ["L1"],
      "fulfillment_structure": ["L1"],
      "relationship_mode": ["L2"],
      "compliance_level": ["L2"]
    },
    "services": [
      {
        "id": "seller-rest",
        "transport": "rest",
        "endpoint": "https://seller.example.com/utp"
      }
    ],
    "primitives": {
      "utp.source": [
        {
          "version": "2026-07-01",
          "spec": "https://utp.dev/primitives/source",
          "schema": "https://schemas.utp.dev/source.json"
        }
      ]
    },
    "roles": {
      "seller": {
        "primitives": ["utp.source"]
      }
    }
  },
  "signing_keys": [
    {
      "kid": "seller-key-1",
      "alg": "ES256",
      "public_key_jwk": {
        "kty": "EC",
        "crv": "P-256",
        "x": "TBwFvJR3loZ6zU6sJQff-fVaB-LtiAw3Z7r7---22zg",
        "y": "9p1p19fUJ38JRgc7tlaglGABPslbUt8Y3_CPNdfw1PQ"
      }
    }
  ]
}</code></pre>
      <p><code>utp.supported_mode_range</code> MUST 声明六个核心维度，且每个维度数组 MUST 非空；协商阶段对关系两端 Profile 的范围逐维求交集。</p>

      <h2 id="negotiation-flow">协商流程</h2>
      <ol>
        <li>校验发现范围：角色对集合非空且唯一，每个角色对恰含两个不同端点，所有相关 Role 都有合法 Domain 绑定。</li>
        <li>加载 Buyer Profile，提出唯一 UTP 版本，并解析所有相关 Domain 的匹配版本 Profile。</li>
        <li>验证 Profile，完成 Role 到 Participant 的绑定，并收集按 Domain 去重的 Service 目录。</li>
        <li>按规范化角色对顺序，对每个无方向角色对计算兼容 Primitive。</li>
        <li>所有关系成功时生成 <code>NegotiationResult</code>；任一相关 Domain、Role 或关系失败时，事务 MUST 原子失败，不得输出部分成功结果。</li>
      </ol>
      <pre><code>Buyer → 读取发现范围参数 → 解析相关 Domain
Buyer → 获取版本化 Profile → 验证结构、发布 Domain 与能力声明
Buyer → 按角色对求能力交集 → NegotiationResult
                                           └─失败：唯一错误结果</code></pre>

      <h2 id="intersection">能力交集算法</h2>
      <p>对每个角色对，Buyer MUST 先对其两端 Role 声明的 Primitive 名称求交集；对每个共同 Primitive，再对版本求交集并选择最高共同日期版本。双方选中版本的 <code>spec</code> 或 <code>schema</code> URI 不一致时，该 Primitive MUST 被过滤。</p>
      <p>对每个角色对，Buyer MUST 对两端 Profile 的 <code>supported_mode_range</code> 逐维求交集。该交集属于关系级能力范围，与具体 Primitive 无关；结果 MUST 保留完整六维对象，空维度以空数组表达。扩展按名称、共同版本与一致 URI 求交集；扩展不兼容仅过滤扩展，不得使其父 Primitive 失败。若某角色对最终没有兼容 Primitive，整个事务 MUST 返回 <code>ROLE_RELATION_INCOMPATIBLE</code>。</p>

      <h2 id="result-schema">协商结果与 Schema 解析</h2>
      <p><code>NegotiationResult</code> 是 Buyer 本地持有的确定性结果。成功结果包含提出的 <code>utp_version</code>、<code>service_catalogs</code>、<code>role_domain_bindings</code> 以及每个角色对的 <code>compatible_primitives</code> 和 <code>common_mode_range</code>；后者是角色对两端 Profile 的六维 Mode 交集，独立于每个 Primitive。<code>service_catalogs</code> 按已验证 Profile 去重，每项以 <code>roles</code> 关联该 Profile 承担的 Role，并原样保留其 <code>services</code> 唯一服务配置数组；<code>roles</code> MUST 使用 <code>role_domain_bindings</code> 中使用的规范化 Role 名称。它不是关系级交集，也不是已选择的传输。结果中的 <code>role_domain_bindings</code> MUST 保留本次发现实际采用的 Role 到 Business Domain 映射。</p>
      <p>实现方在调用 Primitive 前 MUST 使用协商结果中的规范与 Schema URI 获取对应定义，并按选中的基础 Primitive、有效扩展和 Mode 范围完成请求与响应校验。协商结果只描述可用集合：路径编排据此确定调用方向、业务 Mode 与状态迁移；通信层在每次请求前从 <code>service_catalogs</code> 确认具体 Service、Endpoint 和传输方式。它不替代调用期的授权、风控和状态迁移校验。</p>
      <p><code>negotiated_extensions</code> 位于每个兼容 Primitive 中，表示双方对该 Primitive 最终共同启用的扩展集合，而非任一 Participant 单独声明的全部支持能力。数组中的每项均已通过扩展名称、共同版本和一致的规范与 Schema URI 校验；未出现在此数组的扩展不得用于后续调用。</p>
      <table><thead><tr><th>字段</th><th>类型</th><th>必填</th><th>说明</th></tr></thead><tbody><tr><td><code>status</code></td><td>enum</td><td>是</td><td><code>succeeded</code> 或 <code>failed</code>。</td></tr><tr><td><code>utp_version</code></td><td>string</td><td>成功时是</td><td>Buyer 提出且全部采用的协议版本。</td></tr><tr><td><code>service_catalogs</code></td><td>array</td><td>成功时是</td><td>按已验证 Profile 去重的 Service 目录；每项含 <code>roles</code> 与原始 <code>services</code> 声明。</td></tr><tr><td><code>role_domain_bindings</code></td><td>object</td><td>成功时是</td><td>本次发现实际采用的 Role 到 Business Domain 映射。</td></tr><tr><td><code>relation_compatibilities</code></td><td>array</td><td>成功时是</td><td>每个角色对的兼容 Primitive。</td></tr><tr><td><code>error</code></td><td>object</td><td>失败时是</td><td>唯一失败原因；不得与成功数组并存。</td></tr></tbody></table>
      <h3 id="result-example">成功结果示例</h3>
      <pre><code>{
  "status": "succeeded",
  "utp_version": "2026-07-01",
  "role_domain_bindings": {
    "Payer": "buyer.example.com",
    "PaymentProcessor": "payment.example.com",
    "Seller": "seller.example.com"
  },
  "service_catalogs": [
    {
      "roles": ["Seller"],
      "services": [
        {
          "id": "seller-rest",
          "transport": "rest",
          "endpoint": "https://seller.example.com/utp"
        },
        {
          "id": "seller-mcp",
          "transport": "mcp",
          "endpoint": "https://seller.example.com/mcp"
        }
      ]
    }
  ],
  "relation_compatibilities": [
    {
      "roles": [
        "Payer",
        "PaymentProcessor"
      ],
      "common_mode_range": {
        "pricing_mode": ["L2"],
        "decision_path": ["L1", "L2"],
        "payment_structure": ["L1"],
        "fulfillment_structure": ["L1"],
        "relationship_mode": ["L2"],
        "compliance_level": ["L2"]
      },
      "compatible_primitives": [
        {
          "primitive": "utp.source",
          "selected_version": "2026-07-01",
          "negotiated_extensions": [
            {
              "id": "utp.payment.escrow",
              "version": "1.0",
              "spec": "https://utp.dev/extensions/payment-escrow",
              "schema": "https://schemas.utp.dev/extensions/payment-escrow-1.0.json"
            },
            {
              "id": "utp.audit.trace",
              "version": "1.1",
              "spec": "https://utp.dev/extensions/audit-trace",
              "schema": "https://schemas.utp.dev/extensions/audit-trace-1.1.json"
            }
          ]
        }
      ]
    }
  ]
}</code></pre>

      <h2 id="errors-fallback">失败处理与降级</h2>
      <p>发现失败包括输入参数无效、版本不支持、Profile 不可获取或格式错误和 Role 未声明。协商失败指已验证的 Profile 无法为某一必需角色对留下兼容 Primitive。失败结果 MUST 仅返回规范化的唯一错误，不得携带部分 Service、Role 或关系数组。</p>
      <p>实现 MAY 缓存已验证的当前或版本化 Profile；缓存键 MUST 至少包含规范化 Domain 与 <code>utp.version</code>，并遵循 HTTP 缓存控制策略。Profile 刷新或重新获取后，Buyer MUST 重新执行发现与协商，且不得将旧结果视为对新 Profile 的验证结论。</p>

      <h2 id="determinism">确定性、失效与错误</h2>
      <p>给定相同的发现范围参数、Buyer Profile 字节和远端 Profile 字节，实现 MUST 产生相同的结果或错误。Domain、Role、规范化角色对、Primitive、版本和扩展 MUST 按规范化顺序处理；同一阶段有多个错误时，返回排序后的第一个错误。</p>
      <table><thead><tr><th>错误码</th><th>阶段</th><th>含义</th></tr></thead><tbody><tr><td><code>DISCOVERY_SCOPE_INVALID</code></td><td>输入校验</td><td>角色对或 Domain 绑定不合法。</td></tr><tr><td><code>UTP_VERSION_UNSUPPORTED</code></td><td>版本解析</td><td>相关 Domain 不支持提出版本。</td></tr><tr><td><code>PROFILE_UNAVAILABLE</code></td><td>Profile 获取</td><td>当前或版本化 Profile 不可获取。</td></tr><tr><td><code>PROFILE_MALFORMED</code></td><td>Profile 验证</td><td>Profile 不符合结构要求。</td></tr><tr><td><code>ROLE_RELATION_INCOMPATIBLE</code></td><td>关系协商</td><td>必需角色对没有兼容 Primitive。</td></tr></tbody></table>

      <h2 id="downstream-boundary">下游接口边界</h2>
      <p>发现与协商输出供路径编排和通信层使用。路径编排从 <code>relation_compatibilities</code> 选择关系与 Primitive，并确定 CallerRole、HandlerRole、SelectedMode 与后续状态迁移；它不选择 Service、Endpoint 或传输方式。通信层在每次请求前将 <code>service_catalogs</code> 与目标 Action 的传输声明结合，确认本次投递使用的 Service、Endpoint 和传输方式。调用期的授权、风控和传输处理不属于本章。</p>
