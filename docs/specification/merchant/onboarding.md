---
title: M2 入驻与能力声明
section: merchant
owner: merchant-team
status: review
version: 2026-07-30
format: html
---

<h1 id="s-m2">M2 · 入驻与能力声明（Merchant Onboarding &amp; Profile Declaration）</h1>

    <h2 id="s-m21">M2.1 入驻总流程（Onboarding Flow）</h2>
    <p>供应商接入 UTP 网络（平台托管拓扑）MUST 依次完成五个步骤。每一步产出的凭证是下一步的前置条件：</p>
<div class="diagram"><img src="/documentation/assets/diagrams/m-onboarding-flow.svg" alt="供应商入驻五步流程：身份密钥、Profile 发布、注册、资质合规、回调与沙箱验收，全部通过后 ACTIVE" style="max-width: 100%; height: auto;"></div>
    <p>全部步骤完成前，Marketplace MUST 拒绝该供应商的 MP1 <code>publish</code> 请求（返回 <code>LISTING.PUBLISH.MERCHANT_NOT_ACTIVE</code>，见附录 MB）。</p>

    <h2 id="s-m22">M2.2 Step 1：身份与密钥（Identity &amp; Keys）</h2>
    <ul>
      <li>供应商 MUST 持有全局唯一 <code>agent_id</code>。SHOULD 采用可验证标识形式（如 <code>did:web:supplier.example.com</code>）；<code>agent_id</code> 与法人主体的绑定由 Step 4 资质审核确认（<code>legal_name</code> 与资质文件一致，M2.4.1）。</li>
      <li>供应商 MUST 生成 ES256（P-256）密钥对，公钥以 JWK 形式进入 Profile 的 <code>signing_keys</code>；私钥 MUST NOT 交给 Marketplace 或任何第三方。</li>
      <li>密钥轮换：新增 JWK MUST 保留旧 <code>kid</code> 至少 30 天用于验证存量凭证；轮换后 MUST 更新并重新发布 Profile（<code>signing_keys</code> 仅用于验证后续认证消息与业务签名，不对 Profile 本身签名，主规范 3.3.2）。</li>
      <li>身份验证与授权（WIT/WPT、OAuth）遵循主规范<a href="/documentation/specification/protocol-core/identity-authorization.html">第 6 章</a>，本规范不重复定义。</li>
    </ul>

    <h2 id="s-m23">M2.3 Step 2：Profile 发布（Profile Declaration）</h2>
<div class="diagram"><img src="/documentation/assets/diagrams/m-profile-exchange.svg" alt="双 Profile 互读：供应商与平台各自在自己 Domain 发布 Profile，注册时平台反向拉取验证，建会话前供应商拉取协商" style="max-width: 100%; height: auto;"></div>
    <p>供应商 MUST 在自己的 Endpoint 上按主规范 <a href="/documentation/specification/protocol-core/discovery-negotiation.html#s-331">3.3.1</a> 发布 Profile（<code>GET {utp_endpoint}/.well-known/utp</code>）。UTP-M 对 Profile 的增量要求：</p>
    <ul>
      <li><code>utp.primitives</code> MUST 声明其支持的 MP 原语及版本；<code>utp.supported_mode_range</code> MUST 声明适用于全部 Role 与 Primitive 的六维 Mode 范围（六维均必须存在且非空，主规范 3.3.2）。Profile 只声明能力事实，不声明调用方向；方向由原语定义文件的 <code>initiator_role=Seller</code> 固定（主规范 <a href="/documentation/specification/protocol-core/primitive-framework.html#s-1023-action-definition-format">10.2.3</a>）。</li>
      <li>供应商若需接收订单路由与结算账单推送（M6.7、M8.4），MUST 在 <code>utp.services</code> 中声明自己的回调 Service（<code>dev.utp.merchant_callback</code>）。</li>
    </ul>
    <p><strong>供应商 Profile 示例（仅示 UTP-M 增量部分，结构遵循主规范 3.3.2）：</strong></p>
<pre class="highlight"><code class="language-json">{
  "$schema": "https://schemas.utp.dev/profile/2026-07-01.json",
  "display_name": "上海示例供应链有限公司",
  "utp": {
    "version": "2026-07-01",
    "supported_mode_range": {
      "pricing_mode": ["L0", "L1", "L2"],
      "decision_path": ["L0", "L1", "L2"],
      "payment_structure": ["L0", "L1"],
      "fulfillment_structure": ["L0", "L1", "L2"],
      "relationship_mode": ["L0", "L1", "L2"],
      "compliance_level": ["L0", "L1"]
    },
    "services": {
      "dev.utp.merchant_callback": [
        {
          "id": "merchant-callback-rest",
          "version": "2026-07-01",
          "spec": "https://utp.dev/2026-07-01/services/merchant_callback",
          "transport": "rest",
          "endpoint": "https://supplier.example.com/utp-m/callback",
          "schema": "https://schemas.utp.dev/services/merchant_callback/2026-07-01/rest.openapi.json"
        }
      ]
    },
    "primitives": {
      "utp.listing":    [ { "version": "2026-07-01", "spec": "https://utp.dev/2026-07-01/primitives/listing", "schema": "https://schemas.utp.dev/primitives/listing/2026-07-01.json", "authorization": { "scope": "listing", "required": true } } ],
      "utp.inventory":  [ { "version": "2026-07-01", "spec": "https://utp.dev/2026-07-01/primitives/inventory", "schema": "https://schemas.utp.dev/primitives/inventory/2026-07-01.json", "authorization": { "scope": "inventory", "required": true } } ],
      "utp.acceptance": [ { "version": "2026-07-01", "spec": "https://utp.dev/2026-07-01/primitives/acceptance", "schema": "https://schemas.utp.dev/primitives/acceptance/2026-07-01.json", "authorization": { "scope": "acceptance", "required": true } } ],
      "utp.shipment":   [ { "version": "2026-07-01", "spec": "https://utp.dev/2026-07-01/primitives/shipment", "schema": "https://schemas.utp.dev/primitives/shipment/2026-07-01.json", "authorization": { "scope": "shipment", "required": true } } ],
      "utp.quote":      [ { "version": "2026-07-30", "spec": "https://utp.dev/2026-07-30/primitives/quote", "schema": "https://schemas.utp.dev/primitives/quote/2026-07-30.json", "authorization": { "scope": "quote", "required": true } } ]
    },
    "roles": {
      "seller": {
        "primitives": ["utp.listing", "utp.inventory", "utp.acceptance", "utp.shipment", "utp.quote"]
      }
    }
  },
  "signing_keys": [
    {
      "kid": "key-2026-07",
      "alg": "ES256",
      "public_key_jwk": { "kty": "EC", "crv": "P-256", "x": "f83OJ3GkZvBmN0kR2lXqW8YpA7dC5eF1gH9iJ3kL5mN", "y": "oP7qR9sT1uV3wX5yZ0aB2cD4eF6gH8iJ0kL2mN4oP6q" }
    }
  ]
}
</code></pre>
    <p>说明：示例仅展示 UTP-M 增量部分；<code>utp.quote</code>（MP3 询盘响应）为 MAY 级能力，仅服务一口价直购的商家可不声明（M5.1.2）；兼营买卖双方角色或同时提供 P1—P6 能力时，按主规范 3.3.2 在同一 Profile 的 <code>utp.primitives</code> / <code>utp.roles</code> 下一并声明；<code>agent_authentication</code>、<code>user_authorization</code>、<code>mandates</code> 等安全能力声明同主规范 3.3.3，不因角色而变。</p>
    <p>对应地，Marketplace 的 Profile MUST 在 <code>utp.supported_mode_range</code> 中声明其适用于全部 Role 与 Primitive 的 Mode 范围（处理方向由原语定义文件的 <code>handler_role=Marketplace</code> 固定），并在 <code>utp.services</code> 中声明承载 MP 原语的 <code>dev.utp.merchant</code> Service。供应商在建立会话前 MUST 按主规范 <a href="/documentation/specification/protocol-core/discovery-negotiation.html#s-34">3.4</a>—3.7 完成协议版本解析、Profile 验证与角色对协商，Mode 范围交集的计算规则见 3.6.2。</p>
    <p><strong>Marketplace（平台）Profile 示例（仅示与 UTP-M 相关部分；平台同时声明买方侧 <code>dev.utp.trade</code> Service 与 P1—P6，结构同主规范 3.3.3）：</strong></p>
<pre class="highlight"><code class="language-json">{
  "$schema": "https://schemas.utp.dev/profile/2026-07-01.json",
  "display_name": "1688 Marketplace",
  "utp": {
    "version": "2026-07-01",
    "supported_mode_range": {
      "pricing_mode": ["L0", "L1", "L2", "L3"],
      "decision_path": ["L0", "L1", "L2", "L3"],
      "payment_structure": ["L0", "L1", "L2"],
      "fulfillment_structure": ["L0", "L1", "L2", "L3"],
      "relationship_mode": ["L0", "L1", "L2"],
      "compliance_level": ["L0", "L1", "L2"]
    },
    "services": {
      "dev.utp.merchant": [
        {
          "id": "merchant-rest-primary",
          "version": "2026-07-01",
          "spec": "https://utp.dev/2026-07-01/services/merchant",
          "transport": "rest",
          "endpoint": "https://marketplace.example.com/utp/m",
          "schema": "https://schemas.utp.dev/services/merchant/2026-07-01/rest.openapi.json"
        }
      ],
      "dev.utp.trade": [
        {
          "id": "trade-rest-primary",
          "version": "2026-07-01",
          "spec": "https://utp.dev/2026-07-01/services/trade",
          "transport": "rest",
          "endpoint": "https://marketplace.example.com/utp",
          "schema": "https://schemas.utp.dev/services/trade/2026-07-01/rest.openapi.json"
        }
      ]
    },
    "primitives": {
      "utp.listing":    [ { "version": "2026-07-01", "spec": "https://utp.dev/2026-07-01/primitives/listing", "schema": "https://schemas.utp.dev/primitives/listing/2026-07-01.json", "authorization": { "scope": "listing", "required": true } } ],
      "utp.inventory":  [ { "version": "2026-07-01", "spec": "https://utp.dev/2026-07-01/primitives/inventory", "schema": "https://schemas.utp.dev/primitives/inventory/2026-07-01.json", "authorization": { "scope": "inventory", "required": true } } ],
      "utp.acceptance": [ { "version": "2026-07-01", "spec": "https://utp.dev/2026-07-01/primitives/acceptance", "schema": "https://schemas.utp.dev/primitives/acceptance/2026-07-01.json", "authorization": { "scope": "acceptance", "required": true } } ],
      "utp.shipment":   [ { "version": "2026-07-01", "spec": "https://utp.dev/2026-07-01/primitives/shipment", "schema": "https://schemas.utp.dev/primitives/shipment/2026-07-01.json", "authorization": { "scope": "shipment", "required": true } } ],
      "utp.quote":      [ { "version": "2026-07-30", "spec": "https://utp.dev/2026-07-30/primitives/quote", "schema": "https://schemas.utp.dev/primitives/quote/2026-07-30.json", "authorization": { "scope": "quote", "required": true } } ]
    },
    "roles": {
      "marketplace": {
        "primitives": ["utp.listing", "utp.inventory", "utp.acceptance", "utp.shipment", "utp.quote"]
      },
      "seller": {
        "primitives": ["utp.source", "utp.negotiate", "utp.purchase", "utp.pay", "utp.fulfill", "utp.resolve"]
      }
    }
  },
  "signing_keys": [ { "kid": "mkt-key-2026-07", "alg": "ES256", "public_key_jwk": { "kty": "EC", "crv": "P-256", "x": "...", "y": "..." } } ]
}
</code></pre>
    <p>说明：<code>roles.marketplace</code> 列出其作为 MP 原语 handler 的承接集；<code>roles.seller</code> 是平台在买方侧的处理身份（平台托管拓扑，M1.4.1）。同一 Profile、同一 <code>supported_mode_range</code>、同一安全能力声明覆盖全部角色（主规范 3.3.2）；<code>marketplace</code> 为 R3 领域角色试点命名，进入 R2 后不变（M1.3.1）。</p>
    <h3 id="s-m231">M2.3.1 UTP-M Service 规格（Service Registry）</h3>
    <p>UTP-M 定义两个 Service，规格如下（命名遵循主规范反域名风格，同 <code>dev.utp.trade</code>）：</p>
    <table>
      <thead><tr><th>Service</th><th>提供方</th><th>承载内容</th><th>绑定要求</th><th>定义位置</th></tr></thead>
      <tbody>
        <tr><td><code>dev.utp.merchant</code></td><td>Marketplace</td><td>MP1—MP5 全部操作 + M8 结算扩展只读操作（供应商 → 平台方向）</td><td>REST MUST；MCP/A2A MAY（M1.10）</td><td>各原语章传输绑定小节；机读定义见附录 MD 原语定义文件</td></tr>
        <tr><td><code>dev.utp.merchant_callback</code></td><td>Seller（供应商自己部署）</td><td>M2.6.1 全部回调事件（平台 → 供应商方向），信封/签名/重试同主规范 4.3.1</td><td>REST MUST（单一 webhook 端点即可，事件类型在信封内区分）</td><td>M2.6.1 事件表；事件 Schema 见 merchant/events.json</td></tr>
      </tbody>
    </table>
    <p>边界声明：两个 Service 与主规范 <code>dev.utp.trade</code> 完全分离，平台 MAY 独立部署与限流；供应商兼营买方时，买卖两侧 Service 在同一 Profile 中并列声明，互不影响。</p>

    <h2 id="s-m24">M2.4 Step 3：Marketplace 注册（Registration）</h2>
    <p>供应商向 Marketplace 提交注册请求，建立商户档案并获取 <code>merchant_id</code>。注册是一次性管理动作，不是原语；本规范定义其标准接口以保证跨平台可互操作。</p>
    <h3 id="s-m241">M2.4.1 MerchantRegistration 实体</h3>
    <table>
      <thead><tr><th>字段名</th><th>类型</th><th>必填</th><th>描述</th></tr></thead>
      <tbody>
        <tr><td><code>agent_id</code></td><td>string</td><td>是</td><td>供应商全局标识，MUST 与注册请求的身份主体一致。</td></tr>
        <tr><td><code>utp_endpoint</code></td><td>string</td><td>是</td><td>供应商 Endpoint URI，Marketplace 由此获取并验证 Profile。</td></tr>
        <tr><td><code>legal_name</code></td><td>string</td><td>是</td><td>法人名称，MUST 与资质文件一致。</td></tr>
        <tr><td><code>contact</code></td><td>object</td><td>是</td><td>运营联系人（<code>name</code>、<code>email</code>、<code>phone</code>）。</td></tr>
        <tr><td><code>categories</code></td><td>array</td><td>是</td><td>申请经营的类目标识列表。</td></tr>
        <tr><td><code>settlement_account</code></td><td>object</td><td>是</td><td>结算收款账户引用（脱敏形式，详见 M8.2）。</td></tr>
        <tr><td><code>erp_integration_mode</code></td><td>enum</td><td>否</td><td><code>none</code> / <code>bridge</code> / <code>native</code> / <code>agent_embedded</code>，声明 ERP 集成形态（与 M9.2 四种部署形态一一对应）。</td></tr>
        <tr><td><code>delegation_policy</code></td><td>object</td><td>否</td><td>按原语声明 Handler 侧执行模式：键为原语 ID（<code>utp.negotiate</code> / <code>utp.resolve</code>），值为 <code>{mode: direct|passthrough, on_timeout: direct_fallback|structured_timeout}</code>；缺省全部为 <code>direct</code>。语义见 <a href="overview.html#s-m144">M1.4.4</a>。</td></tr>
      </tbody>
    </table>
    <h3 id="s-m242">M2.4.2 注册接口与结果</h3>
<pre class="highlight"><code>POST {marketplace_endpoint}/utp/m/v1/merchants/registrations
Content-Type: application/json
（RFC 9421 签名，覆盖请求体）
</code></pre>
    <p>响应 MUST 包含 <code>merchant_id</code>、<code>status</code>（<code>PENDING_QUALIFICATION</code>）与 <code>valid_next_actions</code>。<code>merchant_id</code> 是 Marketplace 域内标识；协议消息中的身份主体始终是 <code>agent_id</code>，<code>merchant_id</code> 仅用于平台侧资源寻址。</p>
    <p>Marketplace 在注册受理时 MUST：验证 <code>utp_endpoint</code> 可达且 Profile 结构与发布 Domain 满足主规范 <a href="/documentation/specification/protocol-core/discovery-negotiation.html#s-351">3.5.1</a> 的验证规则；对同一 <code>agent_id</code> 的重复注册返回既有 <code>merchant_id</code>（幂等）。</p>
    <h3 id="s-m243">M2.4.3 注册边界与访问凭证</h3>
    <ul>
      <li><strong>注册不可委托：</strong>平台账号注册与商户协议签署 MUST 由商家主体（Principal）自行完成，MUST NOT 委托给 Agent（对应 <a href="merchant-agent.html#s-m105">M10.5</a> 控制点）；注册完成后的资料提交、资质维护等操作 MAY 在授权下由 Agent 代办（M2.5）。</li>
      <li><strong>身份复用：</strong>同一 <code>agent_id</code> MAY 同时承担买方与卖方身份——在 Profile 的 <code>utp.roles</code> 中同时声明 <code>buyer</code> 与 <code>seller</code>（复用主规范 <a href="/documentation/specification/protocol-core/discovery-negotiation.html#s-332">3.3.2</a>“同一 Business Domain MAY 承担多个 Role，共用同一份版本化 Profile”）；入驻仅叠加 Seller 侧能力，不要求独立账号。</li>
      <li><strong>访问凭证：</strong>商户状态进入 <code>ACTIVE</code> 后，按主规范<a href="/documentation/specification/protocol-core/identity-authorization.html">第 6 章</a>的身份与授权框架颁发访问凭证；后续全部 MP 原语调用 MUST 携带有效凭证。凭证的吊销与失效是 <code>RESTRICTED</code>/<code>TERMINATED</code>（M2.7）的技术执行手段。</li>
    </ul>

    <h2 id="s-m25">M2.5 Step 4：资质与合规（Qualification &amp; Compliance）</h2>
    <ul>
      <li><strong>资质内容不进协议：</strong>具体需要哪些资质文件由 Marketplace 按类目与商业场景公示（平台策略域，各平台对商家要求不同）；协议层只标准化资质的<strong>提交通道、审核状态与引用结构</strong>（复用主规范 SupplierCredentials 实体与 <code>credential_id</code> 引用，<a href="/documentation/specification/primitives/source/index.html#s-1195-suppliercredentials">11.9.5</a>）。供应商 MUST 按平台公示清单提交。</li>
      <li>Marketplace MUST 审核资质并给出结论：<code>QUALIFIED</code> / <code>REJECTED</code>（附结构化原因码）。审核期间状态为 <code>PENDING_QUALIFICATION</code>。</li>
      <li><strong>资质维护是持续义务：</strong>资质的更新、补充与到期换证与首次提交使用同一提交通道与状态机；在商家授权下 MAY 由 Merchant Agent 代办（M10.2），但账号注册与商户协议签署除外（M2.4.3）。</li>
      <li>当交易 <code>compliance_level ≥ L1</code> 时，Marketplace 在 P1 Source 响应中返回的供应商资质摘要 MUST 来自本步骤审核通过的文件；过期或吊销的资质 MUST 触发对应商品自动下架（M3.5 的 <code>SUSPENDED_BY_PLATFORM</code> 路径）。</li>
      <li>资质有效期到期前 30 天，Marketplace SHOULD 通过回调通知供应商换证。</li>
    </ul>

    <h2 id="s-m26">M2.6 Step 5：回调登记与连通性验收（Callback &amp; Readiness）</h2>
    <p>订单路由（M6.7）、结算账单（M8.4）、审核结论（M3.4）等 Marketplace → Seller 的异步通知，统一通过供应商声明的 <code>dev.utp.merchant_callback</code> Service 推送，遵循主规范 <a href="/documentation/specification/protocol-core/transport-communication.html#s-431">4.3.1 Push Notification</a> 的信封、签名与重试规则。</p>
    <h3 id="s-m261">M2.6.1 回调事件类型注册表</h3>
    <table>
      <thead><tr><th>事件类型</th><th>触发方</th><th>触发时机</th><th>对应章节</th></tr></thead>
      <tbody>
        <tr><td><code>utp.listing.review_result</code></td><td>Marketplace</td><td>商品审核通过/驳回</td><td>M3.4</td></tr>
        <tr><td><code>utp.inventory.hold_created</code> / <code>hold_released</code></td><td>Marketplace</td><td>P3 触发库存占用/释放</td><td>M4.7</td></tr>
        <tr><td><code>utp.acceptance.order_routed</code></td><td>Marketplace</td><td>买方订购草案待受理</td><td>M6.7</td></tr>
        <tr><td><code>utp.acceptance.expired</code></td><td>Marketplace</td><td>受理超时自动处置</td><td>M6.3</td></tr>
        <tr><td><code>utp.negotiate.inquiry_routed</code></td><td>Marketplace</td><td>询盘透传路由（<code>delegation_policy</code> 为 <code>passthrough</code> 时）</td><td>M1.4.4</td></tr>
        <tr><td><code>utp.resolve.dispute_routed</code></td><td>Marketplace</td><td>争议答辩透传路由（同上）</td><td>M1.4.4</td></tr>
        <tr><td><code>utp.shipment.delivery_receipt</code></td><td>Marketplace</td><td>物流妥投/买方收货回执</td><td>M7.7</td></tr>
        <tr><td><code>utp.settlement.statement_issued</code></td><td>Marketplace</td><td>结算账单出具</td><td>M8.4</td></tr>
      </tbody>
    </table>
    <p>接收方 MUST 返回 <code>2xx</code> 确认；推送失败按主规范指数退避重试（最多 5 次）后转入轮询降级——供应商可通过各原语的 <code>query</code>/<code>list</code> 操作主动拉取，保证推送丢失不阻塞业务（与主规范 4.3.2 一致）。</p>
    <h3 id="s-m262">M2.6.2 沙箱验收清单（Readiness Checklist）</h3>
    <p>Marketplace MUST 提供沙箱环境。供应商转为 <code>ACTIVE</code> 前 MUST 通过以下验收：</p>
    <table>
      <thead><tr><th>#</th><th>验收项</th><th>通过标准</th></tr></thead>
      <tbody>
        <tr><td>1</td><td>签名互验</td><td>双向 RFC 9421 验签通过；Seller JWS 业务签名可被 Marketplace 用 Profile 公钥验证</td></tr>
        <tr><td>2</td><td>商品发布</td><td><code>listing.publish → list</code> 全流程成功，商品在沙箱 Source 可搜索</td></tr>
        <tr><td>3</td><td>库存同步</td><td><code>inventory.set/adjust</code> 生效且 <code>query</code> 一致</td></tr>
        <tr><td>4</td><td>接单闭环</td><td>模拟订单路由 → <code>acceptance.accept</code> → 沙箱订购成立</td></tr>
        <tr><td>5</td><td>发货闭环</td><td><code>shipment.ship</code> → 沙箱买方收到 <code>fulfill.notify(SHIPPED)</code></td></tr>
        <tr><td>6</td><td>回调可达</td><td>全部 M2.6.1 事件推送返回 <code>2xx</code>，验签通过</td></tr>
        <tr><td>7</td><td>幂等</td><td>重复 <code>idempotency_key</code> 返回缓存结果，无重复副作用</td></tr>
      </tbody>
    </table>

    <h2 id="s-m27">M2.7 商户生命周期状态（Merchant Lifecycle）</h2>
<div class="diagram"><img src="/documentation/assets/diagrams/m-merchant-lifecycle.svg" alt="商户生命周期：PENDING_QUALIFICATION→SANDBOX→ACTIVE，治理触发 RESTRICTED（可整改恢复）或 TERMINATED，义务连续性约束" style="max-width: 100%; height: auto;"></div>
    <table>
      <thead><tr><th>状态</th><th>含义</th><th>进入条件</th><th>允许的操作</th></tr></thead>
      <tbody>
        <tr><td><code>PENDING_QUALIFICATION</code></td><td>注册已受理，资质审核中</td><td>注册请求通过基本校验</td><td>补充资质、查询状态</td></tr>
        <tr><td><code>SANDBOX</code></td><td>资质通过，沙箱验收中</td><td>资质审核 <code>QUALIFIED</code></td><td>沙箱内全部 MP 操作</td></tr>
        <tr><td><code>ACTIVE</code></td><td>正式营业</td><td>沙箱验收全部通过</td><td>全部 MP 原语生产操作</td></tr>
        <tr><td><code>RESTRICTED</code></td><td>受限（违规/资质过期/风控）</td><td>Marketplace 依据治理规则触发</td><td>只允许 <code>query</code> 类与既有订单的 MP4/MP5 履行操作；MUST NOT <code>publish</code>/<code>list</code></td></tr>
        <tr><td><code>TERMINATED</code></td><td>退出</td><td>供应商申请或治理裁决</td><td>只读；存量订单 MUST 履行完毕或经 P6 Resolve 处置</td></tr>
      </tbody>
    </table>
    <p>状态变更 MUST 通过回调通知供应商，并附结构化原因码与申诉路径。<code>RESTRICTED</code>/<code>TERMINATED</code> MUST NOT 影响已成立订单的履约义务——这是与主规范"Purchase 后不可单方面撤回"一致的义务连续性原则。</p>
