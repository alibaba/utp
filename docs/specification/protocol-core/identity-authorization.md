---
title: 认证与授权
section: protocol-core
owner: protocol-architecture
status: drafting
format: html
---

<h1 id="s-6-identity">第 6 章：认证与授权（Identity and Authorization — L2）</h1>

<p>本章为 UTP 协议 Layer 2 的身份基础层，系统定义 Agent 身份认证（Agent Authentication）、用户授权委托（User Authorization）与操作级授权（Operation-Level Authorization）三类机制。通过将机器身份、人类委托与单笔交易授权解耦，本章为 UTP 交易构建一条从「谁发起请求」到「谁允许执行」再到「本次允许做什么」的可验证信任链。</p>

<hr />

<h2 id="s-61">6.1 概述与分层模型（Overview and Layered Model）</h2>

<h3 id="s-611">6.1.1 背景与问题域</h3>

<p>在 AI Agent 驱动的商业环境中，交易的发起方从单一人类用户演变为「人类委托 + Agent 代理 + 多方 workload」的分布式执行体。一个完整交易可能跨越买家 Agent 平台、商家服务、支付网络、物流系统与争议仲裁方，每一方都需要回答三个根本性问题：通信对端的 workload 是否可信、该 workload 是否获得用户授权、以及本次具体请求是否被允许执行。</p>

<p>认证与授权层的设计目标，是在不预设具体传输协议、不绑定单一云平台、不强制统一信任根的前提下，为 UTP 交易提供可验证、可审计、可机器判定的信任基础。本章定义的机制覆盖从沙箱 POC 到金融级强合规场景的连续谱系，使低门槛接入与高安全保证能够在同一协议框架内共存。</p>

<h3 id="s-612">6.1.2 三层身份授权模型</h3>

<p>UTP 将认证与授权拆分为三个正交层级，分别对应不同的凭证类型、签发方与验证责任：</p>

<ol>
<li><strong>代理层（Agent Layer）—— Agent Authentication</strong>：回答「哪个 workload 实例正在发起请求」。该层面向机器身份，证明通信对端是一个被正确部署、持有合法密钥且未被篡改的 Agent workload。</li>
<li><strong>委托层（Principal Layer）—— User Authorization</strong>：回答「用户是否允许该 Agent 代表自己执行操作」。该层面向人类委托，将用户身份与 Agent 身份建立受控链接，并界定 Agent 可访问的资源范围。</li>
<li><strong>操作层（Operation Layer）—— Operation-Level Authorization</strong>：回答「本次请求被允许做什么」。该层面向单笔交易，通过 Mandate Chain 将用户授权从通用权限收窄为具体交易内容的密码学承诺。</li>
</ol>

<table>
<thead>
<tr>
<th>层级</th>
<th>问题</th>
<th>凭证 / 机制</th>
<th>签发方</th>
</tr>
</thead>
<tbody>
<tr>
<td>代理层</td>
<td>Agent 是谁？</td>
<td>mTLS / API Key / HTTP Message Signatures / WIMSE（WIT/WIC + WPT）</td>
<td>Agent 平台 / Agent Identity Server（AIS）</td>
</tr>
<tr>
<td>委托层</td>
<td>用户是否授权？</td>
<td>OAuth 2.0 / 2.1 Access Token</td>
<td>商家（Seller/Business）提供的 Authorization Server</td>
</tr>
<tr>
<td>操作层</td>
<td>本次允许做什么？</td>
<td>适用的 Mandate（Checkout / Payment；+ optional Operation）</td>
<td>用户、商家、支付凭证主体或操作授权方按各自凭证职责签名</td>
</tr>
</tbody>
</table>

<p>三层模型遵循<strong>正交不可互替</strong>原则：Agent 拥有合法身份并不意味着用户已授权；用户完成 OAuth 授权也不意味着任意 workload 均可代表该用户；即便用户与 Agent 身份均成立，具体交易仍需操作层 Mandate 的逐笔确认。</p>

<h3 id="s-613">6.1.3 设计原则与约束</h3>

<p>本章机制的设计遵循以下原则：</p>

<ul>
<li><strong>传输无关性</strong>：认证与授权语义不依赖特定传输绑定。mTLS、HTTP Message Signatures、WIMSE 的 WIT/WPT 均可在不同网络拓扑与云平台间复用。</li>
<li><strong>向后兼容</strong>：新增身份机制 MUST 作为 OPTIONAL 能力声明引入。轻量机制与强认证机制可在同一 Profile 中并列声明，由目标操作的准入要求选择。</li>
<li><strong>私钥不可导出</strong>：当目标操作要求不可导出私钥、硬件隔离或运行时证明时，认证机制 MUST 提供相应的密钥保护与证明材料。</li>
<li><strong>协议引擎独立判定</strong>：操作准入结论必须由协议引擎根据双方 Profile、运行时证据、授权凭证与 Mandate 内容独立判定，请求方不得自行声明。</li>
<li><strong>最小权限与窄授权</strong>：OAuth scope 与 Mandate Chain 均遵循最小权限原则。scope 限定原语级操作范围，Mandate 限定单笔交易的内容与边界。</li>
<li><strong>可审计性</strong>：所有身份验证、授权决策、密钥轮换与 Mandate 签发事件 MUST 进入 Evidence Bundle，确保事后可追溯、可举证。</li>
</ul>

<h2 id="s-62">6.2 身份认证机制（Agent Authentication）</h2>

<p>Agent 身份认证回答「哪个 Platform、Agent 或 workload 正在发起请求」。它证明机器身份和密钥控制权，不证明终端用户已授权，也不证明某笔交易已经获准：前者由 <a href="#s-63">6.3 User Authorization</a> 处理，后者由 <a href="#s-64">6.4 Mandate Chain</a> 处理。Business SHOULD 对调用其 API 的 Agent 进行认证，以降低冒充、重放和篡改风险。</p>

<p>UTP 将 Agent 视为可验证的 workload。认证按<strong>传输层</strong>与<strong>应用层</strong>分类：mTLS 在安全通道建立时认证对端；HTTP Message Signatures 与 WIMSE 在请求级保留端到端身份。API Key 保留为兼容性机制，仅适用于明确允许的低风险场景。Profile 的 <code>AgentAuthenticationConfig</code> / <code>AgentAuthenticationMechanism</code> 结构由<a href="/documentation/specification/protocol-core/security-trust.html#s-522">第 5 章 5.2.2 节</a>定义；本节说明其使用边界。</p>

<p id="s-620"><strong>UTP 支持的机制与标准依据</strong></p>

<table>
<thead>
<tr>
<th>Profile type</th>
<th>分类与基本使用</th>
<th>适用边界</th>
<th>标准依据</th>
</tr>
</thead>
<tbody>
<tr>
<td><code>api_keys</code></td>
<td>兼容性机制；双方带外安全分发并在 TLS 中携带预共享密钥。</td>
<td>沙箱、POC 或内部低风险操作；不得单独满足订单提交、支付或关键要素变更等强认证要求。</td>
<td>实现方约定；<a href="https://datatracker.ietf.org/doc/draft-klrc-aiagent-auth/">IETF AI Agent Authentication and Authorization</a> 将静态 API Key 视为不适合安全 Agent 身份的反模式。</td>
</tr>
<tr>
<td><code>mtls</code></td>
<td>传输层认证；握手时以客户端 X.509 证书认证 workload，并验证至声明的信任锚。</td>
<td>固定伙伴和稳定拓扑；TLS 在代理处终止时，须叠加应用层请求证明。</td>
<td><a href="https://www.rfc-editor.org/rfc/rfc8446">RFC 8446</a>（TLS 1.3）、<a href="https://www.rfc-editor.org/rfc/rfc5280">RFC 5280</a>（X.509 PKI）</td>
</tr>
<tr>
<td><code>http_message_signatures</code></td>
<td>应用层认证；Agent 用 Profile / JWKS 对应私钥签名请求，接收方按可信 Profile 公钥验签。</td>
<td>HTTP 基线、回调与异步通知；签名须绑定方法、目标 URI、时间窗和请求摘要。</td>
<td><a href="https://www.rfc-editor.org/rfc/rfc9421">RFC 9421</a>（HTTP Message Signatures）、<a href="https://www.rfc-editor.org/rfc/rfc9530">RFC 9530</a>（Content-Digest）</td>
</tr>
<tr>
<td><code>wimse</code></td>
<td>应用层 workload 认证；issuer 签发 WIT/WIC，workload 用绑定私钥为每次请求生成 WPT，提供 Proof of Possession（PoP）。</td>
<td>高价值交易、动态云环境或要求运行时证明的场景；应使用短寿命凭证并校验请求绑定和重放标识。</td>
<td><a href="https://datatracker.ietf.org/doc/draft-klrc-aiagent-auth/">draft-klrc-aiagent-auth-03，第 9 节</a>（工作草案）；其中将 WPT 和 HTTP Message Signatures 列为应用层认证机制。</td>
</tr>
</tbody>
</table>

<p><strong>基本使用方式</strong>：</p>
<ul>
<li>响应方在 Profile 的 <code>agent_authentication.supported_mechanisms</code> 中声明可接受的机制；请求方先验证 Profile 与 Trust Anchor，再选择双方可用且满足目标操作准入要求的机制。</li>
<li>每次受保护请求携带所选机制的凭证或证明；HTTP 请求还须遵循<a href="/documentation/specification/protocol-core/transport-communication.html#s-44">第 4 章 4.4 节</a>的消息签名与防重放规则。</li>
<li>接收方验证凭证有效期、撤销状态、身份绑定、请求完整性和 nonce / <code>jti</code>；高风险操作应使用 WIMSE，或使用 mTLS 与应用层签名的组合。</li>
<li>OAuth 客户端认证和 Access Token 属于用户授权流程，不作为 <code>agent_authentication</code> 的机制类型，也不得替代请求级签名或 PoP。</li>
</ul>

<h2 id="s-63">6.3 用户授权机制（User Authorization）</h2>

<h3 id="s-631">6.3.1 设计目标</h3>

<p>用户授权回答「用户是否允许该 Agent 代表自己执行操作」。UTP 将 Agent 映射为 OAuth 2.0 / 2.1 Client，将用户映射为 Resource Owner，将商家（Seller/Business）映射为 Authorization Server 提供方。</p>

<p>Profile 声明层结构（<code>UserAuthorizationConfig</code> / <code>UserAuthorizationMechanism</code>）由<a href="/documentation/specification/protocol-core/security-trust.html#s-523">第 5 章 5.2.3 节</a>定义；本节以 <code>type = oauth2</code> 为默认实现，重点讲解基于 <code>endpoint</code> 的发现、授权流程、Token 验证、Scope 设计与错误处理等技术实现细节。</p>

<p><strong>关键原则</strong>：</p>
<ul>
<li>用户授权机制由<strong>商家提供</strong>，Agent 平台通过商家 Profile 中声明的 Authorization Server 完成授权；</li>
<li>OAuth Access Token 中的 <code>client_id</code> SHOULD 等于 Agent 的 <code>agent_id</code>，<code>sub</code> SHOULD 等于用户的 <code>principal_id</code>；</li>
<li>OAuth 只解决「用户是否委托了 Agent」，不解决单笔交易的操作边界；操作边界由 Mandate Chain 在 6.4 节定义。</li>
</ul>

<h3 id="s-632">6.3.2 Profile 声明（type = oauth2）</h3>

<p>商家在 Profile 中通过 <code>user_authorization</code> 声明其授权能力。<a href="/documentation/specification/protocol-core/security-trust.html#s-523">第 5 章 5.2.3 节</a>采用 <code>UserAuthorizationConfig</code> / <code>UserAuthorizationMechanism</code> 两层结构；本节展示 <code>type = oauth2</code> 时的 Profile 声明与技术实现要点。Profile 只声明 Authorization Server 入口 <code>endpoint</code>；授权流程、scope 目录与 JWKS 等细节由该入口对应的 RFC 8414 metadata 提供。</p>

<pre><code class="language-json">{
  "user_authorization": {
    "version": "2026-04-08",
    "schema": "https://schemas.utp.example/common/user_authorization.json",
    "supported_mechanisms": [
      {
        "type": "oauth2",
        "endpoint": "https://merchant.example.com"
      }
    ]
  }
}
</code></pre>

<p><strong>UserAuthorizationConfig 字段：</strong></p>

<table>
<thead>
<tr><th>字段</th><th>类型</th><th>必填</th><th>说明</th></tr>
</thead>
<tbody>
<tr><td><code>version</code></td><td>string</td><td>是</td><td>配置格式版本，如 <code>"2026-04-08"</code></td></tr>
<tr><td><code>schema</code></td><td>string</td><td>是</td><td>该配置块对应的 JSON Schema URI</td></tr>
<tr><td><code>supported_mechanisms</code></td><td>UserAuthorizationMechanism[]</td><td>是</td><td>商家支持的用户授权机制列表</td></tr>
</tbody>
</table>

<p><strong>UserAuthorizationMechanism 字段：</strong></p>

<table>
<thead>
<tr><th>字段</th><th>类型</th><th>必填</th><th>说明</th></tr>
</thead>
<tbody>
<tr><td><code>type</code></td><td>string</td><td>是</td><td>机制类型。固定值 <code>"oauth2"</code>，未来可扩展</td></tr>
<tr><td><code>endpoint</code></td><td>URI</td><td>是</td><td>Authorization Server 入口，MUST 为 HTTPS URL。实现方从该入口发现 OAuth metadata。</td></tr>
</tbody>
</table>

<p><strong>实现要点：</strong></p>
<ol>
<li>Agent 平台 MUST 校验 <code>endpoint</code> 为 HTTPS URL，且其域名与 Profile 发布域同属一个治理登记的信任域，或具备有效的跨域信任锚背书；</li>
<li>协议引擎 MUST 通过 <code>endpoint</code> 获取 Authorization Server metadata，并验证 metadata 中的 <code>issuer</code>、授权端点、token 端点与 <code>jwks_uri</code>；</li>
<li>协议引擎 MUST 验证后续收到的 Access Token 的 <code>iss</code> 与 metadata 中的 <code>issuer</code> 一致，不一致时 MUST 拒绝该委托凭证；</li>
<li>Profile 层 MUST NOT 在 <code>user_authorization</code> 中声明 scope、flow 或强制门槛；这些信息由 Authorization Server metadata、协议规范、原语定义、运行时授权挑战或本地策略表达。</li>
</ol>

<h3 id="s-633">6.3.3 Discovery</h3>

<p>OAuth 2 授权流程开始前，Platform 买家 Agent MUST 从 Business UTPProfile 的 <code>user_authorization.supported_mechanisms[]</code> 中发现并校验 Authorization Server，具体步骤如下：</p>

<ol>
<li>获取 Business UTPProfile（参见 <a href="/documentation/specification/protocol-core/discovery-negotiation.html">第 3 章</a>），定位 <code>user_authorization.supported_mechanisms</code> 中 <code>type="oauth2"</code> 的条目；</li>
<li>校验该条目的 <code>endpoint</code> 为 HTTPS URL，且其域名与 Profile 发布域同属一个治理登记的信任域，或具备有效的跨域信任锚背书；</li>
<li>按 RFC 8414 从 <code>endpoint</code> 发现 Authorization Server Metadata：
<pre><code>GET {endpoint}/.well-known/oauth-authorization-server</code></pre>
若该端点返回 404，实现 MAY 回退到同一主机的 <code>/.well-known/openid-configuration</code>，但回退路径 MUST 与 Profile 声明的 <code>endpoint</code> 主机一致；</li>
<li>从返回的 metadata 读取 <code>issuer</code>、<code>authorization_endpoint</code>、<code>token_endpoint</code>、<code>revocation_endpoint</code>、<code>introspection_endpoint</code> 与 <code>jwks_uri</code>；</li>
<li>验证返回的 <code>issuer</code> 为 HTTPS URL，且其 trust domain 与 <code>endpoint</code> 一致或具备跨域信任锚背书；不一致时 MUST 中止授权流程；</li>
<li>平台 SHOULD 在发起授权请求前，验证本次操作所需 scope 是 <code>scopes_supported</code> 的子集；需要请求的 scope 由原语定义、运行时授权挑战、本地策略或 Mandate Chain 上下文确定。</li>
</ol>

<p><strong>要求</strong>：</p>
<ol>
<li>非 404 / issuer 不匹配等错误 MUST 中止授权流程；</li>
<li>metadata 端点 MUST 使用 HTTPS，且域名 MUST 与 Profile 发布域同属一个治理登记的信任域，或具备跨域信任锚背书；</li>
<li>协议引擎 MUST 缓存 metadata 与 JWKS，并支持合理的 TTL 与密钥轮换；缓存失效后 MUST 重新执行发现流程，不得在已知 issuer 已变更的情况下使用过期公钥验证 Access Token。</li>
</ol>

<h3 id="s-634">6.3.4 授权流程</h3>

<p>采用 OAuth 2.1 Authorization Code + PKCE（S256）标准流程：</p>

<pre><code>Agent Platform                          Merchant AS
     |                                      |
     |-- (1) RFC 8414 Discovery ----------&gt;|
     |&lt;-- authorization_endpoint,           |
     |     token_endpoint, scopes_supported |
     |                                      |
     |-- (2) Authorization Request --------&gt;|
     |     response_type=code               |
     |     client_id=&lt;agent_id&gt;             |
     |     redirect_uri=&lt;platform callback&gt; |
     |     scope=&lt;derived scopes&gt;           |
     |     code_challenge=S256(...)         |
     |     state=&lt;unguessable&gt;              |
     |                                      |
     |     [用户认证并授权]                  |
     |                                      |
     |&lt;-- (3) Authorization Response --------
     |     code, state, iss                 |
     |                                      |
     |-- (4) Token Request ----------------&gt;|
     |     grant_type=authorization_code    |
     |     code, redirect_uri               |
     |     code_verifier                    |
     |     client auth                      |
     |                                      |
     |&lt;-- (5) Token Response ----------------
     |     access_token, refresh_token      |
     |     token_type=Bearer, scope         |
</code></pre>

<p><strong>要求</strong>：</p>
<ol>
<li><code>client_id</code> SHOULD 使用 Agent 的 <code>agent_id</code>；</li>
<li>PKCE <code>code_challenge_method</code> MUST 为 <code>S256</code>；</li>
<li>平台 MUST 验证 <code>state</code> 与 <code>iss</code> 匹配；</li>
<li>机密客户端 SHOULD 优先使用 <code>private_key_jwt</code> 或 <code>tls_client_auth</code>；</li>
<li>公共客户端 MUST 使用 <code>none</code> + PKCE，禁止嵌入 <code>client_secret</code>。</li>
</ol>

<p><strong>实现要点（Token 生命周期与验证）</strong>：</p>
<ol>
<li><strong>Access Token 验证</strong>：Business 收到请求后，MUST 使用 Discovery 获取的 <code>jwks_uri</code> 验证 Access Token 的 JWS 签名，并校验 <code>iss</code>（与 metadata <code>issuer</code> 一致）、<code>aud</code>、<code>exp</code>、<code>nbf</code>、<code>scope</code>；对于本次操作实际要求的 scope，MUST 确认 token 已授予。</li>
<li><strong>Token 与身份绑定</strong>：Access Token 中的 <code>client_id</code> SHOULD 等于当前 Agent 的 <code>agent_id</code>；<code>sub</code> SHOULD 等于发起交易的 <code>principal_id</code>。不一致时 Business MUST 拒绝该委托凭证。</li>
<li><strong>短寿命与刷新</strong>：Access Token SHOULD 为短寿命（如 ≤ 1 小时）；Refresh Token MUST 被安全存储，Business SHOULD 在每次使用时轮换 Refresh Token，并在检测到异常时撤销全部派生 token。</li>
<li><strong>吊销与 introspection</strong>：当用户撤回授权、logout 或 Agent 行为异常时，平台 SHOULD 调用 <code>revocation_endpoint</code> 吊销 Refresh / Access Token；Business 对 opaque token SHOULD 提供 <code>introspection_endpoint</code>，供资源服务器实时校验活跃状态。</li>
<li><strong>Sender-constrained token</strong>：执行资金、高风险授权或状态迁移操作时，Business SHOULD 要求 DPoP 或 mTLS 绑定的 sender-constrained Access Token，将 token 与 Agent 的 signing key 绑定，防止 token 被盗后重放。</li>
<li><strong>密钥与 metadata 缓存</strong>：平台 MUST 缓存 JWKS 与 metadata 并设置 TTL；验证失败且因密钥轮换导致时，MUST 先刷新 JWKS 再重试一次，避免偶发拒真。</li>
</ol>

<h3 id="s-635">6.3.5 Scope 设计</h3>

<p>UTP scope 命名遵循 <code>{primitive}:{action}</code> 格式，与 P1–P6 原语对齐。Profile 的 <code>user_authorization</code> 只声明 Authorization Server 入口，不列出 scope 清单；scope 的可用集合来自 Authorization Server metadata 的 <code>scopes_supported</code>，具体操作需要哪些 scope 由协议规范、原语定义、运行时授权挑战或本地策略表达。</p>

<table>
<thead>
<tr>
<th>Scope</th>
<th>含义</th>
<th>覆盖操作</th>
</tr>
</thead>
<tbody>
<tr><td><code>source:read</code></td><td>读取寻源结果</td><td>P1 寻源查询</td></tr>
<tr><td><code>negotiate:write</code></td><td>发起询盘与还价</td><td>P2 协商</td></tr>
<tr><td><code>purchase:manage</code></td><td>管理订单</td><td>P3 订购提交、修改、取消</td></tr>
<tr><td><code>pay:initiate</code></td><td>发起支付</td><td>P4 支付</td></tr>
<tr><td><code>fulfill:read</code></td><td>读取履约状态</td><td>P5 履约查询</td></tr>
</tbody>
</table>

<p><strong>规则</strong>：</p>
<ul>
<li>Profile 的 <code>user_authorization</code> MUST NOT 直接声明 <code>scopes</code> 或 <code>required</code> 字段；</li>
<li>Authorization Server metadata 中的 <code>scopes_supported</code> SHOULD 包含该授权服务可授予的稳定 scope 名称；</li>
<li>平台 MUST 仅请求当前操作所需的 scope，不得请求超集；</li>
<li>若 Access Token 中的 scope 不足以覆盖本次 Mandate Chain 所需的原语操作，Business MUST 拒绝请求并返回 <code>INSUFFICIENT_SCOPE</code>。</li>
</ul>

<h3 id="s-636">6.3.6 错误处理</h3>

<p>当用户身份缺失或 scope 不足时，商家 MUST 返回标准 OAuth 挑战：</p>

<p><strong>身份缺失（401）</strong>：</p>

<pre><code class="language-http">HTTP/1.1 401 Unauthorized
WWW-Authenticate: Bearer realm="https://merchant.example.com"
Content-Type: application/json

{
  "error": {
    "code": "IDENTITY_REQUIRED",
    "message": "该操作需要用户身份认证。"
  }
}
</code></pre>

<p><strong>Scope 不足（403）</strong>：</p>

<pre><code class="language-http">HTTP/1.1 403 Forbidden
WWW-Authenticate: Bearer realm="https://merchant.example.com",
                   error="insufficient_scope",
                   scope="purchase:manage pay:initiate"
Content-Type: application/json

{
  "error": {
    "code": "INSUFFICIENT_SCOPE",
    "message": "当前 token 缺少必要 scope。"
  }
}
</code></pre>

<h3 id="s-637">6.3.7 局限</h3>

<ul>
<li><strong>商家基础设施依赖</strong>：OAuth 授权体验与安全性完全由商家 Authorization Server 实现决定，Agent 平台无法强制要求商家的 MFA、会话时长、token 格式等细节。</li>
<li><strong>scope 是粗粒度授权</strong>：OAuth scope 只能表达「允许 Agent 执行某类原语操作」，无法表达单笔交易的具体约束（如预算、商品清单、收款方）。具体约束由 Mandate Chain 补充。</li>
<li><strong>用户确认体验不可控</strong>：授权页面由商家渲染，跨平台一致性差；钓鱼风险依赖商家域名与 AS 元数据校验。</li>
<li><strong>Refresh Token 生命周期长</strong>：长期 refresh token 增加了泄露后的潜在危害，需要配合吊销端点与客户级密钥保护。</li>
</ul>

<h2 id="s-64">6.4 操作级授权：Mandate Chain（Operation-Level Authorization）</h2>
<h3 id="s-641">6.4.1 概述（Overview）</h3>

<p>Mandate Chain 是 UTP 协议的操作级授权机制，以可验证数字凭证（Verifiable Digital Credential, VDC）的形式记录用户对特定商业操作的授权事实。每个 Mandate 采用 SD-JWT+kb（Selective Disclosure JWT with Key Binding）格式，具备防篡改、不可否认、跨系统可验证三项核心属性，使任何持有公钥的参与方均可独立验证凭证真实性。Mandate 与 Agent authentication、User authorization 共同构成操作准入的完整证据链——前两者分别证明"谁在执行"和"是否被委托"，Mandate 则证明"该具体操作是否被授权"。</p>

<p>Mandate 在 UTP 中并非孤立运行。它与 OAuth 委托关系、WIMSE workload 身份共同构成三层可审计信任链，确保从用户委托到 Agent 执行再到具体操作的每一步均可追溯、可验证。UTP 通过 Intent、Checkout 与 Payment 三类凭证，将用户意图、订单确认和支付授权关联为可验证的授权链。</p>

<p>UTP v1.0 的 Mandate 版本范围与完整链路流程详见 <a href="#s-645">§6.4.5</a>。各类型凭证的定义与字段规范详见 <a href="#s-642">§6.4.2</a>，签名与规范化规则详见 <a href="#s-643">§6.4.3</a>，验证规则详见 <a href="#s-644">§6.4.4</a>，审计消费语义与 Evidence Bundle 规范详见 <a href="/documentation/specification/protocol-core/risk-audit.html#s-72-evidence-bundle">§7.2</a>。操作响应中 Mandate 凭证的回传格式详见 <a href="#s-646">§6.4.6</a>。</p>

<h3 id="s-642">6.4.2 凭证分类</h3>

<p>UTP 将 Mandate 分为两类核心凭证与一类可选扩展：下单凭证（Checkout Mandate）与支付凭证（Payment Mandate）MUST 成对签发，通过同一哈希值（Checkout Mandate 的 <code>checkout_hash</code> 与 Payment Mandate 的 <code>transaction_id</code>）绑定，构成从「授权下单」到「授权支付」的凭证对；操作凭证（Operation Mandate）用于补充 Checkout Mandate 与 Payment Mandate 无法自然覆盖的具体操作授权，通过 <code>parent_mandate_refs</code> 链接上游 Mandate 或交易凭证锚点，形成可审计的 Mandate Chain。各类凭证的字段规范见本节；签发、传递与验证流程详见 §6.4.5。</p>

<table>
<thead>
<tr>
<th>凭证类型</th>
<th>触发操作</th>
<th>签署执行方</th>
<th>前置条件</th>
<th>说明</th>
</tr>
</thead>
<tbody>
<tr>
<td>下单凭证（Checkout Mandate）</td>
<td>P3 Purchase <code>complete</code> / <code>contract-complete</code>；P4 Pay <code>initiate</code></td>
<td>买方用户；由受信平台代理或用户钱包执行签名</td>
<td>商家已签署 <code>checkout_jwt</code>（含最终订单条款），买方已在受信确认面审阅</td>
<td>授权完成一笔具体 checkout（订单）。以 SD-JWT+kb 格式签发，内嵌商家签名的 <code>checkout_jwt</code> 并携带其 <code>checkout_hash</code>；Payment Mandate 通过同一 <code>checkout_hash</code> 绑定</td>
</tr>
<tr>
<td>支付凭证（Payment Mandate）</td>
<td>P4 Pay <code>initiate</code> / <code>confirm</code></td>
<td>买方用户；由受信平台代理或用户钱包执行签名</td>
<td>下单凭证已签发，<code>checkout_hash</code> 已确定</td>
<td>授权对特定订单的支付。以 <code>transaction_id</code>（与下单凭证 <code>checkout_hash</code> 指向同一哈希）绑定，由 PSP / Payment Handler 独立验证</td>
</tr>
<tr>
<td>操作凭证（Operation Mandate）</td>
<td>目标 action 的准入声明需要额外授权（如验收确认 <code>fulfill.receive</code>、分期触发 <code>pay.term</code>、争议发起 <code>resolve.raise</code> 等）</td>
<td>操作授权主体：买方用户 / 企业审批代理 / 供应商代理 / 第三方履约代理</td>
<td>存在作为授权锚点的上游 Mandate 或交易凭证；通过 <code>parent_mandate_refs</code> 形成 Mandate Chain</td>
<td>面向自定义 action 的授权票据。以 SD-JWT+kb 格式签发，绑定 <code>operation</code> + <code>subject_ref</code> + <code>constraints</code>，在上游授权边界内收窄</td>
</tr>
</tbody>
</table>

<p>上述顺序不可颠倒：商家 MUST 先创建并签署包含最终商品、数量、价格、收货和适用条款的订单对象；买方用户 MUST 在受信确认面基于该商家签名对象签发下单凭证（Checkout Mandate），再签发以同一哈希值（<code>transaction_id</code>）绑定的支付凭证（Payment Mandate）。缺少商家签名或买方用户确认的 Mandate MUST 判为无效。</p>

<p id="s-6421"><strong>下单凭证（Checkout Mandate）</strong></p>

<p>Checkout Mandate 用于授权完成一笔具体 checkout（订单）。商家 MUST 先创建并签署订单对象；Checkout Mandate 以 SD-JWT+kb 格式承载该商家签名的 <code>checkout_jwt</code> 及其 <code>checkout_hash</code>，将商家确认的交易条款与用户授权绑定。买方用户在受信确认面审阅该商家签名对象后签发凭证。</p>

<p>Checkout Mandate 的 <code>vct</code> MUST 为 <code>mandate.checkout.1</code>。核心声明包括：</p>

<ul>
<li><code>checkout_jwt</code>：商家对订单对象签名的 JWT（base64url 序列化），含最终交易条款。</li>
<li><code>checkout_hash</code>：<code>checkout_jwt</code> 值的 base64url 编码哈希，唯一标识该 checkout，并作为 Payment Mandate 的绑定锚点。</li>
<li><code>iat</code> / <code>exp</code>：签发与过期时间，以 Unix epoch 整数表示。</li>
</ul>

<p>订单对象的具体字段（merchant、line_items、totals 等）由交易协议定义，不在 Mandate 格式本身范围内。验证方 MUST 先验证 <code>checkout_jwt</code> 的商家签名，再核对 <code>checkout_hash</code> 与 <code>checkout_jwt</code> 值一致，最后验证用户签发的 Mandate 签名、key binding 与有效期。</p>

<p><strong>Checkout Mandate 示例（解码后的 SD-JWT 声明）：</strong></p>

<pre><code>{
  "vct": "mandate.checkout.1",
  "checkout_jwt": "eyJhbGciOiJFUzI1NiIsImtpZCI6Im1lcmNoYW50LWtleS0xIn0...",
  "checkout_hash": "NivWhuqfzcvZNapvIEJ2-3tsdQLkiuIcye2g46WVgX8",
  "iat": 1777342376,
  "exp": 1777345976
}</code></pre>

<p id="s-6422"><strong>支付凭证（Payment Mandate）</strong></p>

<p>Payment Mandate 用于授权对特定订单的支付。买方用户在受信确认面签发凭证，绑定交易标识、收款方、最终金额与支付工具；商家支付处理方、PSP / Tokenizer 与支付网络各自独立验证。</p>

<p>Payment Mandate 的 <code>vct</code> MUST 为 <code>mandate.payment.1</code>。核心声明包括：</p>

<ul>
<li><code>transaction_id</code>：<code>checkout_jwt</code> 值的 base64url 编码哈希，唯一标识关联的 checkout。哈希算法 MUST 与 SD-JWT 的 <code>sd_hash</code> 算法一致，缺省为 SHA-256。该字段与 Checkout Mandate 的 <code>checkout_hash</code> 指向同一哈希值，构成从「授权下单」到「授权支付」的绑定锚点。</li>
<li><code>payee</code>：收款方（商家），包含标识、名称等信息。Payment Mandate 的 <code>payee</code> MUST 与关联订单对象中的商家标识一致。</li>
<li><code>payment_amount</code>：本次支付金额，以 ISO 4217 三位字母货币码与最小单位整数表示（如 <code>{"amount": 27999, "currency": "CNY"}</code> 表示 ¥279.99）。<code>payment_amount.amount</code> MUST 与关联订单的最终应付总额一致。</li>
<li><code>payment_instrument</code>：支付工具，包含 <code>id</code>（工具唯一标识）、<code>type</code>（工具类型，如 <code>card</code>、<code>escrow</code>、<code>upi</code>）和可选的 <code>description</code>。验证方 MUST 核对工具标识与 PSP / Tokenizer 侧的令牌发行方一致。</li>
<li><code>execution_date</code>：支付执行日期，ISO 8601 格式。缺省表示立即执行。用于预约付款或分期付款场景。</li>
<li><code>risk_data</code>：受信确认面在签发凭证时采集的风险信号（可选），供 PSP 与支付网络进行风控评估。</li>
<li><code>iat</code> / <code>exp</code>：签发与过期时间，以 Unix epoch 整数表示。</li>
</ul>

<p>Payment Mandate 在 UTP Pay 原语的 <code>pay.initiate</code> action 中提交。支付处理方收到后 MUST 独立验证（不依赖商家已完成的验证结果）：</p>

<ol>
<li>验证 Payment Mandate 的 SD-JWT+kb 签名与 <code>exp</code> 时效性；</li>
<li>验证 <code>transaction_id</code> 与关联 Checkout Mandate 的 <code>checkout_hash</code> 一致；</li>
<li>验证 <code>payment_amount</code> 与最终订单应付总额一致；</li>
<li>验证 <code>payee</code> 与订单收款方标识一致；</li>
<li>验证 <code>payment_instrument</code> 与 PSP 支付网络的令牌发行方一致；</li>
<li>若含 <code>tee_attestation</code>，验证运行时证明的有效性（详见第 20 章 HAI 等级要求）。</li>
</ol>

<p>验证失败时，PSP MUST 拒绝支付并返回对应错误码（通常为 <code>MANDATE_INVALID_SIGNATURE</code> 或 <code>MANDATE_SCOPE_MISMATCH</code>）。支付成功后，Pay 原语产出 PaymentConfirmation，其中 <code>transaction_id</code> MUST 与 Payment Mandate 的 <code>transaction_id</code> 一致，形成从授权到确认的完整审计链。</p>

<p><strong>Payment Mandate 示例（解码后的 SD-JWT 声明）：</strong></p>

<pre><code>{
  "vct": "mandate.payment.1",
  "transaction_id": "NivWhuqfzcvZNapvIEJ2-3tsdQLkiuIcye2g46WVgX8",
  "payee": {
    "id": "merchant-shenzhen-digital-001",
    "name": "深圳数码科技有限公司",
    "website": "https://sz-digital.example.com"
  },
  "payment_amount": {
    "amount": 2799900,
    "currency": "CNY"
  },
  "payment_instrument": {
    "id": "card-token-xK9mZqR3w",
    "type": "card",
    "description": "银联 •••• 4242"
  },
  "iat": 1777342376,
  "exp": 1777345976
}</code></pre>

<p><strong>Payment Receipt（支付回执）：</strong></p>

<p>支付处理完成后，PSP 或支付网络向买方 Agent 签发 Payment Receipt，作为支付结果的密码学凭证。Payment Receipt 通过 <code>reference</code> 字段绑定对应的 closed Payment Mandate 哈希，确保回执与授权凭证的不可分割关联。核心声明包括：</p>

<ul>
<li><code>status</code>：支付结果状态，有效值为 <code>Success</code> 或 <code>Error</code>。</li>
<li><code>iss</code>：回执签发方标识（PSP 或支付网络）。</li>
<li><code>iat</code>：签发时间，Unix epoch 整数。</li>
<li><code>reference</code>：所绑定的 closed Payment Mandate 哈希。</li>
<li><code>payment_id</code>：本次支付的唯一标识。</li>
<li><code>psp_confirmation_id</code>：PSP 侧的交易确认标识（仅当 <code>status</code> 为 <code>Success</code> 时存在）。</li>
<li><code>network_confirmation_id</code>：支付网络侧的交易确认标识（仅当 <code>status</code> 为 <code>Success</code> 时存在）。</li>
<li><code>error</code> / <code>error_description</code>：错误码与描述（仅当 <code>status</code> 为 <code>Error</code> 时存在）。</li>
</ul>

<p>Payment Receipt 与 UTP Pay 原语产出的 PaymentConfirmation 互补：PaymentConfirmation 是协议级交易记录（含 <code>transaction_id</code>、金额、时间戳与证据包引用），Payment Receipt 是支付基础设施侧的密码学确认。争议裁决时，两者 MUST 同时提交至 Evidence Bundle。</p>

<p id="s-6423"><strong>操作凭证（Operation Mandate）</strong></p>

<p>Operation Mandate 是面向自定义 action 的授权票据。当某个 UTP primitive action（如 <code>fulfill.notify</code>、<code>fulfill.receive</code>、<code>pay.term</code>、<code>resolve.raise</code>、<code>negotiate.counter_offer</code> 等）的准入声明要求超出 Checkout / Payment Mandate 覆盖范围的额外授权时，授权方为该 action 签发一张 Operation Mandate 票据，提交方在执行 action 时携带，接收方验证票据的签名、操作绑定、约束与 Mandate Chain 后放行。</p>

<p>Operation Mandate 的 <code>vct</code> MUST 为 <code>mandate.operation.1</code>。核心声明包括：</p>

<ul>
<li><code>operation</code>：被授权的具体 action，格式为 <code>utp.{primitive}.{action}</code>。接收方 MUST 核对该字段与当前请求的 primitive action 完全一致。</li>
<li><code>subject_ref</code>：本次操作绑定的交易对象引用（如 PurchaseCredential、PaymentSchedule、FulfillmentOrder、DisputeCase 的标识）。一个 Operation Mandate MUST 绑定一个具体交易对象。</li>
<li><code>parent_mandate_refs</code>：上游 Mandate 或交易凭证锚点的哈希列表，用于构造 Mandate Chain。若操作依赖上游授权，MUST 至少引用一个上游凭证；链式场景下可逐级引用多个 Operation Mandate。该字段使每一步操作都可追溯至原始用户授权。</li>
<li><code>constraints</code>：操作授权约束，含 <code>max_amount_effect</code>（金额影响上限）、<code>resource_scope</code>（资源范围，如允许验收的履约单或允许取消的订单项）和 <code>requires_hai_level</code>（最低人机协同控制等级）。约束只能收窄，MUST NOT 扩大上游授权边界。</li>
<li><code>iat</code> / <code>exp</code>：签发与过期时间，以 Unix epoch 整数表示。过期的 Operation Mandate MUST NOT 被用于执行新操作。</li>
</ul>

<p>Operation Mandate 的签发主体因场景而异：买方用户为企业审批或验收确认签发；企业审批代理在其委托权限内为审批操作签发；供应商或第三方代理在其 Profile 授权范围内为履约操作签发。签发方 MUST 使用其私钥以 SD-JWT+kb 格式签名凭证。</p>

<p>典型场景包括：企业采购审批、验收确认（<code>fulfill.receive</code>）、分期付款触发（<code>pay.term</code>）、退款或取消授权、接受报价或 counter-offer（<code>negotiate.counter_offer</code>）、争议发起（<code>resolve.raise</code>）、第三方履约委托，以及行业合规确认。协议引擎在处理上述 action 时 MUST 验证 Operation Mandate 的签名、<code>operation</code> 绑定、约束一致性与 Mandate Chain 完整性。</p>

<p><strong>Operation Mandate 示例（解码后的 SD-JWT 声明）：</strong></p>

<pre><code>{
  "vct": "mandate.operation.1",
  "operation": "utp.fulfill.receive",
  "subject_ref": {
    "type": "fulfillment_order",
    "id": "fulfill-20260720-001"
  },
  "parent_mandate_refs": [
    "NivWhuqfzcvZNapvIEJ2-3tsdQLkiuIcye2g46WVgX8"
  ],
  "constraints": {
    "max_amount_effect": { "amount": 27268800, "currency": "CNY" },
    "resource_scope": { "fulfillment_order_id": "fulfill-20260720-001" },
    "requires_hai_level": "CONFIRMED"
  },
  "iat": 1753005600,
  "exp": 1753869600
}</code></pre>

<h3 id="s-643">6.4.3 签名与规范化（Signing and Canonicalization）</h3>

<p>UTP 的 Checkout 授权按三个层次组织：商家先对 Checkout 条款作出签名承诺；用户或其受信签署方再签发 Mandate；两类签名都按相同的规范化规则重建载荷。三者共同将商家确认的条款、用户授权和后续支付关联起来。</p>

<h4>商家授权（Business Authorization）</h4>

<p>商家 MUST 在每个 Checkout 响应的 <code>merchant_authorization</code> 字段中写入对 Checkout 条款的签名。该值采用 JWS Detached Payload 格式（RFC 7515 Appendix F），格式为 <code>&lt;base64url(header)&gt;..&lt;base64url(signature)&gt;</code>；双点表示 Checkout 载荷不在 JWS 字符串中，而是随 Checkout 响应单独传递。</p>

<p>商家签名的载荷 MUST 为创建订单 input 的完整业务内容。签名输入 MUST 同时覆盖 JWS Protected Header 与该规范化载荷；Protected Header MUST 包含 <code>alg</code> 和 <code>kid</code>，其中 <code>kid</code> 指向商家在 Profile <code>signing_keys</code> 中登记的公钥。商家授权使用 <code>ES256</code>、<code>ES384</code> 或 <code>ES512</code>，且实现 MUST 支持 <code>ES256</code>。</p>

<p>受信确认面 MUST 在向用户展示 Checkout 前验证 <code>merchant_authorization</code>，并核对签名载荷与创建订单 input 的完整业务内容一致。该签名证明商品、金额、收款方及适用条款由商家确认；它本身不构成用户对交易或资金的授权。</p>

<h4>Mandate 签名（Mandate Signing）</h4>

<p>用户确认后，用户钱包或受信平台代理使用其授权签名密钥签发 Mandate。Checkout Mandate 与 Payment Mandate 使用 SD-JWT+kb；Operation Mandate 也使用与其授权主体绑定的可验证凭证。Mandate 签名证明授权主体同意其所覆盖的交易或操作，不能替代商家对 Checkout 条款的签名。</p>

<table>
<thead>
<tr><th>签名对象</th><th>签名方</th><th>签名覆盖范围</th><th>验签方</th></tr>
</thead>
<tbody>
<tr><td>Checkout Mandate</td><td>买方用户或其受信签署方</td><td>包含 <code>merchant_authorization</code> 的完整 Checkout、<code>checkout_jwt</code>、<code>checkout_hash</code>、有效期与 Key Binding。</td><td>商家、支付方、争议裁决方。</td></tr>
<tr><td>Payment Mandate</td><td>买方用户</td><td>订单哈希、收款方、金额、支付工具和风险数据。</td><td>支付原语执行方、PSP / Tokenizer、支付网络或发卡方、争议裁决方。</td></tr>
<tr><td>Operation Mandate</td><td>操作授权主体</td><td>具体 <code>utp.{primitive}.{action}</code>、交易对象引用、上游 Mandate 引用、操作约束与有效期。</td><td>该操作的接收方、协议引擎、争议裁决方。</td></tr>
</tbody>
</table>

<p>Checkout Mandate MUST 包含带有 <code>merchant_authorization</code> 的完整 Checkout。用户或受信签署方的 Mandate 签名由此绑定商家已经签署的条款，形成由用户签名覆盖商家签名所在 Checkout 上下文的嵌套关系。支付场景中，Payment Mandate 的 <code>transaction_id</code> MUST 与 Checkout Mandate 的 <code>checkout_hash</code> 指向同一哈希值。</p>

<p>提交 Checkout 时，请求方携带 Checkout Mandate；支付凭证令牌中携带 Payment Mandate。接收方 MUST 先验证 Mandate 的 SD-JWT+kb 签名、Key Binding 和有效期，再从已验证的 Checkout Mandate 中取出完整 Checkout，验证其中的 <code>merchant_authorization</code>，并核对其与当前 Checkout 状态的条款一致性。</p>

<p>实现方 MAY 将 Mandate 打包为具备 Key Binding 的选择性披露凭证，但接收方验证后 MUST 能还原出与本节实体表一致的逻辑字段。无论采用何种可验证凭证包装，协议层验证语义均以本节定义的 Mandate 字段、引用关系和约束为准。</p>

<h4>规范化要求（Canonicalization）</h4>

<p>所有参与商家授权或 Mandate 签名的 JSON 载荷 MUST 按 RFC 8785 JSON Canonicalization Scheme（JCS）规范化。JCS 将逻辑等价的 JSON 转换为确定性字节序列，使签名在跨系统传递、重新序列化和长期存证后仍可重放验证。</p>

<h3 id="s-644">6.4.4 验证规则</h3>

<p>本小节定义 Mandate 验证的必要条件集合（策略层）与推荐的验证执行顺序，适用于所有验证场景。</p>

<p>协议引擎在每次状态转换时 MUST 验证：</p>

<ol>
<li><strong>适用凭证完整性</strong>：交易模式、会话协商结果和目标操作所要求的 Mandate 是否齐全；不得将未被要求的某类 Mandate 作为拒绝依据。若操作声明需要 Operation Mandate，则对应 Operation Mandate MUST 存在；</li>
<li><strong>签名有效性</strong>：密码学验证通过；</li>
<li><strong>主体与条款一致性</strong>：买方用户身份、Agent 身份、商家身份、支付工具和收款方等已声明主体 MUST 与所引用或嵌入的交易条款一致；商家签署的订单对象、Checkout Mandate 和 Payment Mandate MUST 分别可验证；</li>
<li><strong>状态与引用一致性</strong>：Checkout Mandate 与 Payment Mandate MUST 由买方用户签发并使用同一哈希（Checkout Mandate 的 <code>checkout_hash</code> 与 Payment Mandate 的 <code>transaction_id</code>）；</li>
<li><strong>金额一致性</strong>：Payment Mandate 的 <code>payment_amount</code> MUST 与关联订单总额一致；</li>
<li><strong>操作边界一致性</strong>：Operation Mandate 的 <code>operation</code> MUST 与当前执行的 primitive action 一致，且 <code>constraints</code> MUST NOT 扩大其引用的上游 Mandate 或交易凭证边界；</li>
<li><strong>时效性</strong>：未过期；</li>
<li><strong>受信确认或运行时证明</strong>：当目标操作要求硬件隔离、受信确认或运行时证明时，MUST 附通过验证的相应证据；资金、高风险授权或状态迁移操作 SHOULD 提供远程证明。</li>
</ol>

<p><strong>验证执行流程（Verification Flow）：</strong>接收方在处理任何依赖 Mandate 的请求前 MUST 先执行 Mandate 验证，再执行状态迁移或资金操作。下述八步顺序为推荐的实现流程，适用于业务接收方（商家）、PSP / Tokenizer、支付网络与争议裁决方：</p>

<ol>
<li><strong>协商结果校验</strong>：确认本会话是否锁定要求 Mandate；若要求存在但请求缺失 Mandate，MUST 拒绝。</li>
<li><strong>公钥解析</strong>：根据 JWS header 的 <code>kid</code>、Profile <code>signing_keys</code>、JWKS 或 Trust Anchor 解析公钥；无法解析时 MUST 拒绝。</li>
<li><strong>签名验证</strong>：验证 Mandate 签名、JWS header、算法白名单与规范化载荷；签名无效时 MUST 拒绝。</li>
<li><strong>关联验证</strong>：验证 Checkout、Payment、Operation 之间已声明的引用可解析且内容一致；Checkout Mandate 的 <code>checkout_hash</code> 与 Payment Mandate 的 <code>transaction_id</code> MUST 指向同一哈希。</li>
<li><strong>条款一致性验证</strong>：验证当前 Purchase / Payment / Fulfill / Resolve 请求中的金额、商品、收款方、操作、交易对象与 Mandate 内容一致。</li>
<li><strong>时效验证</strong>：验证 <code>iat</code> / <code>exp</code>、订单对象有效期与商家条款承诺。</li>
<li><strong>操作准入与 HAI 验证</strong>：根据第 5 章确认目标操作的准入要求是否满足，并根据第 20 章确认是否需要人类确认或升级控制等级。</li>
<li><strong>审计落库</strong>：将验证结果、Mandate 哈希、签名方主体、使用操作与异常原因写入 Evidence Bundle；验证失败亦 MUST 记录为 Authorization Decision。</li>
</ol>

<p><strong>PSP / Tokenizer 独立验证：</strong>对于支付场景，业务接收方 MUST 将 Payment Mandate、支付凭证令牌和关联订单哈希传递给 PSP / Tokenizer。支付处理方收到 Payment Mandate 后 MUST 独立执行以下验证（不依赖商家已完成的验证结果）：</p>

<ol>
<li>验证 Payment Mandate 的 SD-JWT+kb 签名与 <code>exp</code> 时效性</li>
<li>验证 <code>transaction_id</code> 与商家提交的 Checkout Mandate 中的 <code>checkout_hash</code> 一致</li>
<li>验证 <code>payment_amount</code> 与最终订单应付总额一致</li>
<li>验证 <code>payee</code> 与订单收款方标识一致</li>
<li>验证支付工具（<code>payment_instrument</code>）与 PSP 支付网络的令牌发行方一致（token issuer validation）</li>
<li>若 Payment Mandate 含有 <code>tee_attestation</code>，验证运行时证明的有效性（详见第 20 章 HAI 等级要求）</li>
</ol>

<p>验证失败时，PSP MUST 拒绝支付并返回对应错误码（通常为 <code>MANDATE_INVALID_SIGNATURE</code> 或 <code>MANDATE_SCOPE_MISMATCH</code>）。完整的错误码定义详见 <a href="#s-647">§6.4.7</a>。</p>

<h3 id="s-645">6.4.5 Mandate Chain 完整链路</h3>

<p>Mandate Chain 不是一条独立业务流程，而是附着在 UTP 会话和原语请求上的授权证据链。其顺序为：能力激活后锁定；商家先签署最终交易条款；用户或其受信签署方再生成绑定该条款的 Mandate；业务方与支付方分别验证后才执行操作。该机制适用于 Purchase、Pay 及需要额外操作授权的原语。</p>

<p id="s-6451"><strong>发现（Discovery）</strong></p>

<p>Profile 只声明能力与验签入口，不产生 Mandate，也不单独决定某个操作是否需要 Mandate。支持或要求 Mandate 的参与方 MUST 声明支持的类型及可解析的签名材料；接收方 MUST 在使用前验证 Profile 与 Trust Anchor。具体操作是否需要 Mandate，仍由其准入要求决定。</p>

<table>
<thead>
<tr><th>发现项</th><th>Profile 来源</th><th>用途</th></tr>
</thead>
<tbody>
<tr><td>Mandate 类型支持</td><td><code>mandates.supported_mandate_types</code></td><td>声明是否支持 <code>"checkout"</code>、<code>"payment"</code>、<code>"operation"</code>。</td></tr>
<tr><td>签名公钥</td><td><code>signing_keys</code> / JWKS / Trust Anchor</td><td>解析买方用户、Agent、商家和支付相关主体的签名公钥，验证订单对象与 Mandate。</td></tr>
<tr><td>授权入口</td><td><code>user_authorization</code></td><td>发现 OAuth Authorization Server、scope 与授权流程；OAuth 提供一般性用户委托，具体下单与支付授权仍须由成对的 Mandate 证明。</td></tr>
</tbody>
</table>

<p>若目标操作需要 Mandate，而双方不存在所需类型或无法解析验签公钥，接收方 MUST 拒绝该操作。只读或低风险操作是否免于 Mandate，由其自身准入要求决定。</p>

<p id="s-6452"><strong>协商与会话锁定（Negotiation and Session Locking）</strong></p>

<p>双方从 Profile 能力交集中选择可用的 Mandate 类型，并结合目标操作准入要求确定是否启用。启用后，会话对相应操作进入安全锁定状态：请求缺少所需 Mandate 时 MUST 被拒绝，MUST NOT 回退到无 Mandate 的流程。</p>

<p>会话授权上下文记录所需类型和验签入口。对支付，Checkout Mandate 与 Payment Mandate 构成成对凭证；验收、分期触发、退款、取消或企业审批等独立操作 MAY 另外要求 Operation Mandate。失败时按 <a href="#s-647">§6.4.7</a> 返回对应错误并记录决策。</p>

<p id="s-6453"><strong>生成与确认（Generation and Consent）</strong></p>

<p>商家 MUST 先创建包含最终商品、金额、收款方及适用条款的订单对象，并对创建订单 input 的完整业务内容生成 Detached JWT（JWS Detached Payload）签名。商家 MUST 将该签名写入订单的 <code>merchant_authorization</code> 字段，并随订单一并返回。买方用户或其受信签署方 MUST 在验证该签名并确认订单后，生成两项核心凭证：Checkout Mandate 证明对该签名订单的确认；Payment Mandate 证明对该订单付款的授权。二者 MUST 以同一订单哈希绑定。平台、钱包、TEE 或企业审批系统可以执行签名，但 MUST 有可验证的授权事件。</p>

<p>当目标操作需要超出该订单或付款授权范围的额外同意时，授权方 MAY 签发 Operation Mandate。它通过 <code>parent_mandate_refs</code> 关联上游 Mandate 或交易凭证，并且 MUST 只收窄、不扩大上游授权边界。</p>

<p id="s-6455"><strong>验证与处理（Verification and Processing）</strong></p>

<p>业务接收方验证商家签名、Checkout Mandate 及其与当前交易条款的一致性；PSP / Tokenizer 独立验证 Payment Mandate、支付工具和金额。Operation Mandate 仅由需要该额外授权的接收方消费。完整验证规则见 <a href="#s-644">§6.4.4</a>；任一验证失败时，接收方 MUST 在执行状态迁移或资金操作前拒绝请求、返回 <a href="#s-647">§6.4.7</a> 定义的错误，并将决策纳入 Evidence Bundle。</p>

<h3 id="s-646">6.4.6 UTP 凭证携带（Credential Carriage）</h3>

<p>前文（§6.4.2-§6.4.5）定义了 Mandate 的凭证结构、签名机制、验证规则与完整链路。本节规定这些凭证在 UTP 请求和响应消息中的物理携带位置——即凭证从签发方传递到消费方时，在协议消息信封中的具体嵌入方式。</p>

<p><strong>请求侧：</strong>Mandate 凭证随使用它的原语请求传递。Ch.10 请求骨架（参见 <a href="/documentation/specification/protocol-core/primitive-framework.html#s-1023">§10.2.3</a>）声明了请求体 <code>mandate</code> 字段的位置；当目标操作的准入要求 Mandate 时 MUST 提供。请求体中可携带完整凭证（JWS / SD-JWT+kb 字符串），也可传递可解析的凭证引用；接收方无法解析引用时，请求方 MUST 提供完整凭证原文。传递位置详见 §6.4.5 传递段。</p>

<p><strong>响应侧：</strong>当响应涉及 Mandate 的签发、消费或更新时，响应体 MUST 在 <code>mandate</code> 字段回传授权凭证上下文。Ch.10 响应骨架（参见 <a href="/documentation/specification/protocol-core/primitive-framework.html#s-1023">§10.2.3</a>）声明了 <code>mandate</code> 字段的存在位置；其内部凭证结构由本节定义。</p>

<p><code>mandate</code> 响应对象按分层结构回传本次操作产出或消费的 Mandate 凭证，每个字段对应一类凭证：</p>

<ul>
<li><code>merchant_authorization</code>：商家对最终订单对象的密码学签名（JWS Detached Payload），证明交易条款真实未篡改。接收方可独立验证商品、金额、收款方及适用条款的完整性。Checkout Mandate 通过 <code>checkout_jwt</code> 声明内嵌该签名，构成嵌套凭证链。</li>
<li><code>checkout</code>：Checkout Mandate 凭证令牌（SD-JWT+kb 编码），证明买方用户对该订单的确认授权。仅在 <code>purchase.complete</code> 等签发 Checkout Mandate 的操作响应中返回。</li>
<li><code>payment</code>：Payment Mandate 凭证令牌（SD-JWT+kb 编码），证明买方用户对该订单付款的授权。仅在 <code>pay.initiate</code> / <code>pay.confirm</code> 等支付操作的响应中返回。</li>
<li><code>operation</code>：Operation Mandate 凭证令牌（SD-JWT+kb 编码）。仅当本次操作消费或签发了 Operation Mandate 时返回。</li>
</ul>

<pre><code>{
  "mandate": {
    "merchant_authorization": "eyJhbGciOiJFUzI1NiJ9..dGVzdC1zaWduYXR1cmU",
    "checkout": "eyJhbGciOiJFUzI1NiIsInR5cCI6ImtiK3NkLWp3dCJ9...",
    "payment": "eyJhbGciOiJFUzI1NiIsInR5cCI6ImtiK3NkLWp3dCJ9..."
  }
}</code></pre>

<p><code>mandate</code> 与响应 <code>output</code> 职责分离：<code>output</code> 承载业务实体（如 PurchaseCredential、PaymentConfirmation），<code>mandate</code> 承载授权凭证上下文，两者通过 <code>transaction_id</code> 或凭证哈希关联。接收方 SHOULD 保存凭证原文、哈希、验证结果和使用操作，并纳入 Evidence Bundle。</p>

<h3 id="s-647">6.4.7 错误处理（Error Handling）</h3>

<p>Mandate Chain 的生命周期（声明、传递、验证）中可能发生多类故障。本节集中汇总所有 Mandate 相关的错误码，覆盖权限缺失、密码学验证失败、时效性、作用域不匹配与委托链断裂等场景，为协议实现者提供统一的错误处理参考。</p>

<p>协议引擎在返回下述任何错误时，MUST 按第 10 章 P0 原语通用框架的标准错误响应结构返回足够的诊断信息（失败的具体 <code>mandate_id</code>、失败验证步骤、期望与实际的差异），帮助调用方快速定位问题根源。</p>

<table>
<thead>
<tr><th>错误码</th><th>HTTP Status</th><th>触发条件</th><th>错误标识</th></tr>
</thead>
<tbody>
<tr><td><code>MANDATE_REQUIRED</code></td><td>403</td><td>会话已协商锁定 Mandate，但请求未携带所需凭证</td><td><code>mandate_required</code></td></tr>
<tr><td><code>MANDATE_INVALID_SIGNATURE</code></td><td>403</td><td>Mandate 密码学签名验证失败</td><td><code>mandate_invalid_signature</code></td></tr>
<tr><td><code>MANDATE_EXPIRED</code></td><td>403</td><td>Mandate 的 <code>exp</code> 已超过当前时间</td><td><code>mandate_expired</code></td></tr>
<tr><td><code>MANDATE_SCOPE_MISMATCH</code></td><td>403</td><td>Mandate 的作用域（商家、金额、商品项、操作）与当前请求不匹配</td><td><code>mandate_scope_mismatch</code></td></tr>
<tr><td><code>MANDATE_CHAIN_BROKEN</code></td><td>403</td><td>Mandate 委托链验证失败（凭证签名链不完整或引用绑定断裂）</td><td>—</td></tr>
<tr><td><code>MERCHANT_AUTHORIZATION_INVALID</code></td><td>403</td><td>商家签署的订单对象（merchant_authorization）签名验证失败</td><td><code>merchant_authorization_invalid</code></td></tr>
<tr><td><code>MERCHANT_AUTHORIZATION_MISSING</code></td><td>403</td><td>Mandate-active 模式下缺少商家签署的订单对象</td><td><code>merchant_authorization_missing</code></td></tr>
<tr><td><code>AGENT_MISSING_KEY</code></td><td>403</td><td>Agent Profile 缺少有效的 <code>signing_keys</code> 条目，无法验签</td><td><code>agent_missing_key</code></td></tr>
</tbody>
</table>

<h2 id="s-65">6.5 信任根基础设施（Trust Anchor Infrastructure）</h2>

<h3 id="s-651">6.5.1 Trust Anchors</h3>

<p>Trust Anchor 是验证 Profile、WIT、OAuth AS 签名公钥的权威来源。UTP 支持以下类型：</p>

<ol>
<li><strong>Registry</strong>：UTP 生态注册中心，对 Agent Profile 和 AIS 公钥进行登记与签名；
<p>在 Registry 承载的登记能力之上，UTP 定义<strong>跨域信任锚背书（Cross-domain Trust Anchor Endorsement）</strong>机制：治理域以带外方式登记受背书 trust domain 及其信任锚获取方式，形成受背书信任锚名录。该名录服务于任何需要跨域信任锚的验证场景；信任锚的承载格式与获取协议由实现方与治理域约定，本规范不作约束（业界既有实践如 SPIFFE Federation、OpenID Federation 1.0 等，实现方 MAY 参考）。名录本身 MUST 通过带外安全渠道分发或预置（呼应 6.5.2 第 2 条）；受背书 trust domain 的准入、撤销与失效治理复用第 23 章 23.3.6 的认证与准入治理规则，不引入新的治理角色。名录提供的是「验证用信任锚集合」，MUST NOT 被用作证书签发或 enrollment 通道。</p></li>
<li><strong>CA</strong>：传统 PKI 证书颁发机构，用于 mTLS 证书链验证；</li>
<li><strong>AIS JWKS</strong>：Agent Identity Server 发布的公钥集合，验证 WIT 签名；</li>
<li><strong>OAuth AS JWKS</strong>：商家 Authorization Server 通过 RFC 8414 发布的公钥集合。</li>
</ol>

<h3 id="s-652">6.5.2 验证原则</h3>

<ol>
<li>每个签名 MUST 可追溯到明确的 Trust Anchor；</li>
<li>Trust Anchor 本身 MUST 通过带外安全渠道分发或预置；</li>
<li>涉及资金、高风险授权或状态迁移的操作 SHOULD 使用可验证的 Trust Anchor；接收方 MAY 按本地治理策略要求更强 Trust Anchor。</li>
<li>Trust Anchor 的公钥 MUST 支持轮换，旧公钥保留合理窗口用于验证历史签名。</li>
<li>本地信任锚不足以验证跨域凭证时，接收方 MAY 使用 6.5.1 定义的受背书信任锚作为附加 Trust Anchor；该过程 MUST NOT 弱化本节第 1-4 条的任何要求。接收方 SHOULD 保证所用信任锚的新鲜度，MUST NOT 使用已撤销或已过期的信任锚；新鲜度的实现机制由实现方与治理域约定，本规范不作约束。</li>
</ol>

<h2 id="s-66">6.6 Profile 声明汇总（Profile Declaration Summary）</h2>

<p>商家 Profile 中与本章相关的顶层字段如下：</p>

<table>
<thead>
<tr>
<th>字段路径</th>
<th>语义</th>
<th>对应章节</th>
</tr>
</thead>
<tbody>
<tr><td><code>agent_authentication</code></td><td>Agent 身份认证机制配置块</td><td>6.2</td></tr>
<tr><td><code>agent_authentication.version</code> / <code>schema</code></td><td>配置格式版本与 JSON Schema URI</td><td>6.2 / 第 5 章 5.2.2</td></tr>
<tr><td><code>agent_authentication.supported_mechanisms[]</code></td><td>支持的 Agent 认证机制列表</td><td>6.2</td></tr>
<tr><td><code>user_authorization</code></td><td>用户授权机制配置块（默认 OAuth 2.1）</td><td>6.3</td></tr>
<tr><td><code>user_authorization.version</code> / <code>schema</code></td><td>配置格式版本与 JSON Schema URI</td><td>6.3 / 第 5 章 5.2.3</td></tr>
<tr><td><code>user_authorization.supported_mechanisms[].endpoint</code></td><td>Authorization Server 入口；metadata、issuer、授权端点与 scope 目录由该入口发现</td><td>6.3.3</td></tr>
<tr><td><code>signing_keys</code></td><td>HTTP Message Signatures 公钥</td><td>6.2</td></tr>
<tr><td><code>mandates.version</code> / <code>schema</code></td><td>Mandate 能力配置格式版本与 JSON Schema URI</td><td>6.4.8.1 / 第 5 章 5.2.4</td></tr>
<tr><td><code>mandates.supported_mandate_types</code></td><td>支持的 Mandate 类型列表，用于 Mandate Chain 能力发现</td><td>6.4.8.1 / 第 5 章 5.2.4</td></tr>
</tbody>
</table>

<h2 id="s-67">6.7 实体定义（Entity Definitions）</h2>

<p>本章涉及的声明层实体由第 5 章定义，实现层实体由本章定义。完整实体列表如下：</p>

<table>
<thead>
<tr>
<th>实体名称</th>
<th>定义章节</th>
<th>描述</th>
</tr>
</thead>
<tbody>
<tr><td>AgentAuthenticationConfig</td><td>第 5 章 5.2.2 / 6.2</td><td>Agent 身份认证配置块，声明版本、Schema 与支持的机制列表</td></tr>
<tr><td>AgentAuthenticationMechanism</td><td>第 5 章 5.2.2 / 6.2</td><td>单个 Agent 认证机制，包含 type、issuer、config</td></tr>
<tr><td>UserAuthorizationConfig</td><td>第 5 章 5.2.3 / 6.3</td><td>用户授权配置块，声明版本、Schema 与支持的机制列表</td></tr>
<tr><td>UserAuthorizationMechanism</td><td>第 5 章 5.2.3 / 6.3</td><td>单个用户授权机制，当前仅 type = oauth2，包含 Authorization Server <code>endpoint</code></td></tr>
<tr><td>MandatesConfig</td><td>第 5 章 5.2.4 / 6.4.8.1</td><td>Mandate 能力配置块，声明版本、Schema 与支持的 Mandate 类型列表</td></tr>
<tr><td>CheckoutMandate</td><td>6.4.2</td><td>授权完成商家签署的具体订单</td></tr>
<tr><td>PaymentMandate</td><td>6.4.2</td><td>授权支付特定订单，绑定订单哈希、收款方、金额和支付工具</td></tr>
<tr><td>PaymentInstrument</td><td>6.4.2</td><td>支付工具标识（<code>id</code>、<code>type</code>、<code>description</code>）</td></tr>
<tr><td>OperationMandate</td><td>6.4.2</td><td>面向自定义 action 的授权票据（<code>vct: mandate.operation.1</code>），绑定 operation、subject_ref、constraints 与 parent_mandate_refs</td></tr>
<tr><td>OperationMandateConstraints</td><td>6.4.2</td><td>操作授权约束（max_amount_effect、resource_scope、requires_hai_level）</td></tr>
</tbody>
</table>

<p><strong>AgentAuthenticationConfig 字段：</strong></p>

<table>
<thead>
<tr>
<th>字段名</th>
<th>类型</th>
<th>必填</th>
<th>描述</th>
</tr>
</thead>
<tbody>
<tr><td><code>version</code></td><td>string</td><td>是</td><td>配置格式版本，如 <code>"2026-04-08"</code>。</td></tr>
<tr><td><code>schema</code></td><td>string</td><td>是</td><td>该配置块对应的 JSON Schema URI。</td></tr>
<tr><td><code>supported_mechanisms</code></td><td>AgentAuthenticationMechanism[]</td><td>是</td><td>Business 支持的 Agent 认证机制列表。</td></tr>
</tbody>
</table>

<p><strong>AgentAuthenticationMechanism 字段：</strong></p>

<table>
<thead>
<tr>
<th>字段名</th>
<th>类型</th>
<th>必填</th>
<th>描述</th>
</tr>
</thead>
<tbody>
<tr><td><code>type</code></td><td>enum</td><td>是</td><td>机制类型。有效值：<code>"mtls"</code>、<code>"api_keys"</code>、<code>"http_message_signatures"</code>、<code>"wimse"</code>。</td></tr>
<tr><td><code>issuer</code></td><td>string</td><td>条件</td><td>凭证签发方标识。除具备跨域信任锚背书外，issuer MUST 与 <code>agent_id</code> 同属一个 trust domain。</td></tr>
<tr><td><code>config</code></td><td>object</td><td>是</td><td>机制类型特定参数。不同 <code>type</code> 的 <code>config</code> 结构不同，见下表。</td></tr>
</tbody>
</table>

<p><strong>AgentAuthenticationMechanism.config 按 type 的结构：</strong></p>

<table>
<thead>
<tr>
<th>type</th>
<th>config 字段</th>
<th>必填</th>
<th>描述</th>
</tr>
</thead>
<tbody>
<tr><td><code>api_keys</code></td><td><code>key_distribution</code></td><td>是</td><td>key 分发方式，如 <code>"out_of_band"</code>。API Key 属于预共享密钥机制，适用于沙箱、内部或低风险调用。</td></tr>
<tr><td><code>mtls</code></td><td><code>ca_issuer</code></td><td>是</td><td>受信任 CA 的 issuer 或证书分发地址。</td></tr>
<tr><td><code>http_message_signatures</code></td><td><code>jwks_uri</code></td><td>是</td><td>签名公钥 JWKS 端点（RFC 7517），用于动态拉取当前有效公钥。</td></tr>
<tr><td><code>http_message_signatures</code></td><td><code>profile</code></td><td>否</td><td>支持的签名 profile 列表，如 <code>["rsa-v1", "ecdsa-v1"]</code>。</td></tr>
<tr><td><code>http_message_signatures</code></td><td><code>key_protection</code></td><td>否</td><td>私钥保护方式，供实现方判断该机制可满足的操作准入要求。有效值：<code>"software"</code>、<code>"os-keystore"</code>、<code>"tee"</code>、<code>"hsm"</code>；默认 <code>"software"</code>。</td></tr>
<tr><td><code>wimse</code></td><td><code>workload_identifier_scheme</code></td><td>是</td><td>workload 标识方案，如 <code>"spiffe"</code>、<code>"dns"</code>、<code>"urn"</code> 或 <code>"did"</code>。</td></tr>
</tbody>
</table>

<p><strong>UserAuthorizationConfig 字段：</strong></p>

<table>
<thead>
<tr>
<th>字段名</th>
<th>类型</th>
<th>必填</th>
<th>描述</th>
</tr>
</thead>
<tbody>
<tr><td><code>version</code></td><td>string</td><td>是</td><td>配置格式版本，如 <code>"2026-04-08"</code>。</td></tr>
<tr><td><code>schema</code></td><td>string</td><td>是</td><td>该配置块对应的 JSON Schema URI。</td></tr>
<tr><td><code>supported_mechanisms</code></td><td>UserAuthorizationMechanism[]</td><td>是</td><td>Business 支持的用户授权机制列表。</td></tr>
</tbody>
</table>

<p><strong>UserAuthorizationMechanism 字段：</strong></p>

<table>
<thead>
<tr>
<th>字段名</th>
<th>类型</th>
<th>必填</th>
<th>描述</th>
</tr>
</thead>
<tbody>
<tr><td><code>type</code></td><td>enum</td><td>是</td><td>机制类型。有效值：<code>"oauth2"</code>（未来可扩展）。</td></tr>
<tr><td><code>endpoint</code></td><td>string</td><td>是</td><td>Authorization Server 入口，MUST 为 HTTPS URL。实现方从该入口发现 OAuth metadata。</td></tr>
</tbody>
</table>

<p><strong>MandatesConfig 字段：</strong></p>

<table>
<thead>
<tr>
<th>字段名</th>
<th>类型</th>
<th>必填</th>
<th>描述</th>
</tr>
</thead>
<tbody>
<tr><td><code>version</code></td><td>string</td><td>是</td><td>配置格式版本，如 <code>"2026-04-08"</code>。</td></tr>
<tr><td><code>schema</code></td><td>string</td><td>是</td><td>该配置块对应的 JSON Schema URI。</td></tr>
<tr><td><code>supported_mandate_types</code></td><td>string[]</td><td>是</td><td>支持的 Mandate 类型列表。有效值包含：<code>"checkout"</code>、<code>"payment"</code>、<code>"operation"</code>。</td></tr>
</tbody>
</table>

<p><strong>交叉引用：</strong></p>
<ul>
<li>Agent Authentication 机制详情见 6.2 节；</li>
<li>User Authorization 流程、Discovery、Token 验证与 Scope 设计见 6.3 节；</li>
<li>Mandate Chain 字段与示例见 6.4 节；</li>
<li>Trust Anchor 与 Evidence Bundle 要求见 <a href="/documentation/specification/protocol-core/risk-audit.html">第 7 章</a>。</li>
</ul>

<h2 id="s-68">6.8 不变约束与反模式（Invariants and Anti-Patterns）</h2>

<h3 id="s-681">6.8.1 不变约束</h3>

<ol>
<li>Agent authentication 与 User authorization MUST 分别验证，不得混用；</li>
<li>操作准入结论 MUST 由协议引擎基于目标操作的准入要求独立判定；</li>
<li>当目标操作要求不可导出私钥时，私钥 MUST 不可导出；</li>
<li>WPT MUST 绑定当前 HTTP 请求的 <code>aud</code>/<code>ath</code>/<code>tth</code>；</li>
<li>OAuth Access Token 的作用域 MUST 大于等于 Mandate Chain 的作用域；</li>
<li>所有凭证验证事件 MUST 进入 Evidence Bundle；</li>
<li>新增身份机制 MUST 作为 OPTIONAL 能力声明。</li>
</ol>

<h3 id="s-682">6.8.2 反模式</h3>

<ul>
<li>❌ 用 API Key 执行支付、下单提交、变更收款/收货要素等需要强认证或授权证据的操作；</li>
<li>❌ 仅依赖 mTLS 而放弃应用层签名或 WPT；</li>
<li>❌ 让 LLM / Agent 推理链接触私钥或 Access Token；</li>
<li>❌ 由请求方自行声明已满足目标操作的准入要求；</li>
<li>❌ 将 OAuth scope 当作单笔交易授权边界（边界应由 Mandate Chain 定义）。</li>
</ul>

<h2 id="s-69">6.9 引用关系（References）</h2>

<table>
<thead>
<tr>
<th>章节</th>
<th>关系</th>
</tr>
</thead>
<tbody>
<tr><td><a href="/documentation/specification/protocol-core/security-trust.html">第 5 章</a></td><td>操作准入语义、Profile 机制声明与信任画像</td></tr>
<tr><td><a href="/documentation/specification/protocol-core/discovery-negotiation.html">第 3 章</a></td><td>Profile 结构与 <code>/.well-known/utp</code> 获取路径</td></tr>
<tr><td><a href="/documentation/specification/protocol-core/procurement-models.html">第 8 章</a></td><td>交易模式参与目标操作准入要求的选择</td></tr>
<tr><td><a href="/documentation/specification/primitives/pay/index.html">第 14 章</a></td><td>支付原语的安全前置条件与 Mandate 要求</td></tr>
<tr><td><a href="/documentation/specification/protocol-core/human-agent-interaction.html">第 20 章</a></td><td>目标操作需要人工介入时触发 Human Confirmation</td></tr>
<tr><td><a href="/documentation/specification/protocol-core/risk-audit.html">第 7 章</a></td><td>Evidence Bundle 与审计</td></tr>
<tr><td><a href="https://datatracker.ietf.org/doc/draft-klrc-aiagent-auth/">IETF draft-klrc-aiagent-auth-03</a></td><td>AI Agent 认证与授权的指导性框架；第 9 节按传输层与应用层说明 mTLS、WPT 与 HTTP Message Signatures。该文档为 Internet-Draft（work in progress），不构成已发布 RFC 标准。</td></tr>
<tr><td><a href="/documentation/specification/reference/glossary.html">附录</a></td><td>新增术语与错误码需同步更新</td></tr>
</tbody>
</table>

<h2 id="s-610">6.10 结论（Conclusion）</h2>

<p>UTP 第 6 章通过<strong>三层分离</strong>的设计，将 Agent 身份认证、用户授权与操作级授权清晰解耦：</p>

<ul>
<li><strong>Agent authentication</strong> 提供从 API Key、mTLS 到 HTTP Message Signatures、WIMSE 的分层机制，由目标操作的准入要求决定采用何种机制；</li>
<li><strong>User authorization</strong> 采用商家提供的 OAuth 2.1 协议，将用户身份与 Agent 身份链接；</li>
<li><strong>Mandate Chain</strong> 在操作层将通用授权收窄为单笔交易的具体授权。</li>
</ul>

<p>三者通过 Profile 声明、操作准入判定与 Evidence Bundle 审计形成完整闭环，使 UTP 既能支持轻量级快速接入，也能满足金融级强合规要求。</p>
