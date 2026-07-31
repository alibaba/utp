---
title: 信任准入评估
section: protocol-core
owner: protocol-architecture
status: drafting
format: html
---

<h1 id="s-5-trust-profile">第 5 章：信任准入评估（Trust Admission Evaluation — L2）</h1>

<hr />

<p>本章是 UTP Layer 2 的<strong>准入声明层</strong>，定义参与方在互操作前应声明的对接能力，以及受保护操作执行前的判定顺序、失败语义与审计责任。协议层只规定能力声明、机制入口与可机器处理的错误响应；具体安全评估、评分模型与实现组件由实现方、网关、风控系统或监管域自行决定。</p>

<p>准入判定围绕三个正交问题展开，分别由本章三节回答：</p>
<ul>
<li><strong>操作声明了哪些准入条件？</strong> —— <a href="#s-51">5.1 操作准入语义</a>：判定顺序、失败语义与审计责任；</li>
<li><strong>响应方声明了哪些对接机制？</strong> —— <a href="#s-52">5.2 认证与授权机制声明</a>：Agent Authentication、User Authorization 与 Mandate 能力的发现入口；</li>
<li><strong>对手方是否可信？</strong> —— <a href="#s-53-trust-profile">5.3 信任画像</a>：参考性声誉信号，用于 Discover / Negotiate 阶段的过滤与排序。</li>
</ul>
<p>三者 MUST NOT 相互替代：5.1 决定操作能否放行，5.2 提供认证与授权入口，5.3 提供声誉参考；涉及单笔授权边界时，Mandate、scope、Human Confirmation 与证据要求仍以目标 primitive action 及相关章节的定义为准。</p>

<hr />

<h2 id="s-51">5.1 操作准入语义（Operation Admission Semantics）</h2>
<h3 id="s-511">5.1.1 概述与定位</h3>
<p>当采购链路由多个 Agent 接力完成时，安全问题最终落到具体操作：调用方身份是否成立，用户或上游主体是否授权，授权边界是否覆盖本次操作，失败后是否留有审计依据。5.1 将这些问题收敛为操作前准入判定，规定受保护操作进入业务处理前的判定顺序、失败语义和审计责任。</p>
<p>准入要求由各原语操作直接表达。原语章节负责声明 action scope、是否需要 Mandate、是否触发 Human Confirmation，以及该操作需要哪些审计记录；Mandate Chain 的结构与验证见第 6 章，Evidence Bundle 的采集、保存和导出见第 7 章，Human Confirmation 的交互语义见第 20 章。本节规定这些机制在执行前如何组合成一次可机器判定的放行检查。</p>
<p>本地安全评估属于策略层输入。平台可以用本地评级做产品分层、生态准入、风控决策或监管报告；治理域也可以把 ISO/IEC 29115、NIST SP 800-63、eIDAS 等 assurance model 映射为本地策略。运行时互操作以具体操作声明、标准错误和审计证据为准；评分结果进入策略层，由各治理域自行解释。</p>

<h3 id="s-512">5.1.2 准入判定顺序</h3>
<p>响应方在处理受保护 primitive action 前，按以下顺序执行准入判定。任一环节失败时，响应方返回标准错误，并保持无业务副作用。</p>
<table>
<thead>
<tr>
<th>顺序</th>
<th>判定项</th>
<th>权威来源</th>
<th>失败语义</th>
</tr>
</thead>
<tbody>
<tr>
<td>1</td>
<td>Profile 与 Trust Anchor 验证</td>
<td>第 3 章 Profile、5.3 信任画像入口、第 6 章 Trust Anchor</td>
<td><code>PROFILE_UNTRUSTED</code> / <code>TRUST_ANCHOR_INVALID</code></td>
</tr>
<tr>
<td>2</td>
<td>Agent Authentication</td>
<td>5.2 机制声明、第 6 章认证机制</td>
<td><code>AUTHENTICATION_REQUIRED</code> / <code>AUTHENTICATION_FAILED</code></td>
</tr>
<tr>
<td>3</td>
<td>User Authorization</td>
<td>5.2 授权入口、第 6 章 OAuth 流程、各原语 action scope</td>
<td><code>AUTHORIZATION_REQUIRED</code> / <code>SCOPE_INSUFFICIENT</code></td>
</tr>
<tr>
<td>4</td>
<td>Mandate / Delegation Scope</td>
<td>第 6 章 Mandate Chain、各原语操作要求</td>
<td><code>MANDATE_REQUIRED</code> / <code>MANDATE_INVALID</code></td>
</tr>
<tr>
<td>5</td>
<td>Human Confirmation</td>
<td>第 20 章 HAI、各原语触发条件</td>
<td><code>CONFIRMATION_REQUIRED</code> / <code>CONFIRMATION_FAILED</code></td>
</tr>
<tr>
<td>6</td>
<td>Audit Evidence</td>
<td>第 7 章 Evidence Bundle、Authorization Decision 与导出规则</td>
<td><code>EVIDENCE_REQUIRED</code> / <code>EVIDENCE_INCOMPLETE</code></td>
</tr>
</tbody>
</table>

<h3 id="s-513">5.1.3 原语操作的准入声明方式</h3>
<p>UTP 将准入要求放在 primitive action 的语义内表达。每个 primitive action 在自身章节中声明与该操作相关的准入差异；全局机制由对应章节统一定义。这些准入项在 P0 原语通用框架的 <a href="/documentation/specification/protocol-core/primitive-framework.html#s-1029-operation-admission">10.2.9 操作准入配置</a> 中形式化为每个 Action 的 <code>admission</code> 对象，供机器读取。推荐的操作准入表包含以下项目：</p>
<table>
<thead>
<tr>
<th>声明项</th>
<th>声明位置</th>
<th>描述</th>
</tr>
</thead>
<tbody>
<tr>
<td>action scope</td>
<td>各原语章节</td>
<td>该操作需要的 OAuth scope 或等价 action permission，例如 <code>purchase:write</code>、<code>payment:execute</code>。</td>
</tr>
<tr>
<td>Agent Authentication</td>
<td>5.2 / 第 6 章 / 各原语章节</td>
<td>该操作是否要求 Agent 身份认证，以及是否要求请求级签名、sender-constrained token、WIMSE 或远程证明。</td>
</tr>
<tr>
<td>User Authorization</td>
<td>5.2 / 第 6 章 / 各原语章节</td>
<td>该操作是否要求用户或上游主体授权，以及 token scope 与授权主体约束。</td>
</tr>
<tr>
<td>Mandate</td>
<td>第 6 章 / 各原语章节</td>
<td>该操作是否要求 Checkout、Payment 或 Operation Mandate，以及 Mandate Chain 的边界校验。</td>
</tr>
<tr>
<td>Human Confirmation</td>
<td>第 20 章 / 各原语章节</td>
<td>该操作是否需要 Confirmation Surface、确认记录或升级控制等级。</td>
</tr>
<tr>
<td>Evidence</td>
<td>第 7 章 / 各原语章节</td>
<td>该操作必须写入的 Authorization Decision、Evidence Bundle 组件和导出要求。证据格式、保留与导出方式由第 7 章定义。</td>
</tr>
</tbody>
</table>

<p><strong>Profile 边界：</strong>UTPProfile 保持发现与能力入口职责。它声明参与方支持哪些认证、授权、Mandate 和信任画像入口；具体操作是否要求这些机制，由原语章节、会话协商结果、运行时授权挑战或实现方本地策略给出。请求方应以目标 primitive action 的准入声明为准；Profile 中的能力入口只提供可发现性。</p>

<h3 id="s-514">5.1.4 准入结果语义</h3>
<ol>
<li>目标操作声明的准入条件全部满足时，受保护操作可以进入业务处理。</li>
<li>任一准入条件校验失败时，响应方 MUST 返回标准错误，且 MUST NOT 产生业务副作用。</li>
<li>需要用户授权、Mandate、人类确认或审计证据的操作，其准入结论 MUST 写入 Authorization Decision，并能在后续审计中追溯。</li>
<li>低风险、只读、无状态副作用的交互可以复用既有安全上下文；该复用不改变受保护操作的准入要求。</li>
</ol>

<h3 id="s-515">5.1.5 实现边界</h3>
<p>UTP 不规定准入条件由哪个内部组件实现。跨 Agent 互操作只依赖以下外部行为：</p>
<ol>
<li>Profile 中可发现对接所需的认证、授权和 Mandate 能力；</li>
<li>请求失败时返回可机器处理的标准错误；</li>
<li>需要人类确认时进入第 20 章定义的 Confirmation Surface；</li>
<li>高风险操作的准入判定和证据引用可在第 7 章 Evidence Bundle 中追溯。</li>
</ol>
<hr />

<h2 id="s-52">5.2 认证与授权机制声明（Authentication and Authorization Mechanism Declaration）</h2>

<h3 id="s-521">5.2.1 概述与定位</h3>

<p>操作准入语义（<a href="#s-51">5.1 节</a>）规定受保护操作进入业务处理前的判定顺序与失败语义；认证与授权机制声明则定义 Profile 发布方向潜在请求方声明的<strong>准入对接机制</strong>，是协议握手阶段交换认证与授权基础设施信息的规范。</p>

<p>UTP 将两个正交问题分开声明：</p>
<ul>
<li><strong>Agent Authentication</strong>：请求方 Agent 以自身身份调用响应方 API 时，如何向响应方证明其 workload 身份。它回答「谁执行的」，对应 <strong>Agent-authenticated</strong> 操作级别。</li>
<li><strong>User Authorization</strong>：请求方 Agent 如何获得代表终端用户或上游授权主体在资源提供方处行事的授权。它回答「谁授权的」，对应 <strong>User-authenticated</strong> 操作级别。</li>
</ul>

<p>本章仅定义两类机制的<strong>声明层</strong>要求：声明哪些字段、如何验证声明一致性、声明缺失时如何降级。认证与授权机制的发现细节与流程执行见 <a href="/documentation/specification/protocol-core/identity-authorization.html">第 6 章</a>。</p>

<h3 id="s-522">5.2.2 Agent Authentication</h3>

<p>Agent Authentication 声明 Profile 发布方作为响应方时接受的、请求方 Agent 用以证明自身身份的 API 认证机制。Profile 发布方通过 <code>agent_authentication</code> 配置块声明这些机制。</p>

<p>响应方 SHOULD 对调用其 API 的请求方 Agent 进行认证，以防止冒充、凭证重放与消息内容被篡改。UTP 的 Profile 声明支持四类 Agent Authentication 机制：<code>mtls</code> 表示基于客户端证书的双向 TLS；<code>api_keys</code> 表示带外交换的预共享密钥；<code>http_message_signatures</code> 表示按 RFC 9421 对 HTTP 消息进行签名；<code>wimse</code> 表示基于 WIMSE（Workload Identity in Multi-System Environments）的 workload identity 凭证与请求级 proof token。OAuth 相关的终端用户授权入口只在 <code>user_authorization</code> 中声明，MUST NOT 作为 Agent Authentication 机制类型表达。</p>

<p>这些机制的信任建立方式不同。<code>api_keys</code>、<code>mtls</code> 通常需要事先交换凭证或建立 CA 信任关系，因此隐含预建立业务关系；<code>http_message_signatures</code> 可通过 Profile/JWKS 中公开声明的签名公钥完成验证，在 Profile 签名链可信时支持较低预协调的接入；<code>wimse</code> 在 Profile 声明 workload 标识方案后，由对应 issuer、Trust Anchor 与运行时凭证完成动态 workload 认证，适合高安全要求和云原生部署。</p>

<p><strong>AgentAuthenticationConfig 实体定义：</strong></p>
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
<tr>
<td><code>version</code></td>
<td>string</td>
<td>是</td>
<td>配置格式版本，如 <code>"2026-04-08"</code>。</td>
</tr>
<tr>
<td><code>schema</code></td>
<td>string</td>
<td>是</td>
<td>该配置块对应的 JSON Schema URI。</td>
</tr>
<tr>
<td><code>supported_mechanisms</code></td>
<td>AgentAuthenticationMechanism[]</td>
<td>是</td>
<td>Profile 发布方作为响应方时支持的 Agent 认证机制列表。</td>
</tr>
</tbody>
</table>

<p><strong>AgentAuthenticationMechanism 实体定义：</strong></p>
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
<tr>
<td><code>type</code></td>
<td>enum</td>
<td>是</td>
<td>机制类型。有效值：<code>"mtls"</code>、<code>"api_keys"</code>、<code>"http_message_signatures"</code>、<code>"wimse"</code>。</td>
</tr>
<tr>
<td><code>issuer</code></td>
<td>string</td>
<td>条件</td>
<td>凭证签发方标识。<code>type="mtls"</code> 时为受信任 CA issuer；<code>type="api_keys"</code> 时为 key 发行方；<code>type="http_message_signatures"</code> 时为签名密钥发布方；<code>type="wimse"</code> 时为 workload identity issuer 或 Agent Identity Server（AIS）。除具备跨域信任锚背书外，issuer MUST 与 <code>agent_id</code> 同属一个 trust domain。跨域信任锚背书的登记与查证机制见<a href="/documentation/specification/protocol-core/identity-authorization.html#s-651">第 6 章 6.5.1 节</a>。</td>
</tr>
<tr>
<td><code>config</code></td>
<td>object</td>
<td>是</td>
<td>机制类型特定参数。不同 <code>type</code> 的 <code>config</code> 结构不同，见下表。</td>
</tr>
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
<tr>
<td><code>api_keys</code></td>
<td><code>key_distribution</code></td>
<td>是</td>
<td>key 分发方式，如 <code>"out_of_band"</code>。API Key 属于预共享密钥机制，适用于沙箱、内部或低风险调用。涉及资金、授权、受限数据或状态迁移的操作 SHOULD 使用请求级签名、mTLS、WIMSE 或等价的强认证机制，MUST NOT 仅依赖静态 API Key。</td>
</tr>
<tr>
<td><code>mtls</code></td>
<td><code>ca_issuer</code></td>
<td>是</td>
<td>受信任 CA 的 issuer 或证书分发地址。</td>
</tr>
<tr>
<td><code>mtls</code></td>
<td><code>trust_anchor_endpoint</code></td>
<td>否</td>
<td>指向受背书信任锚集合的获取端点（HTTPS URL）；返回内容的格式由实现方与治理域约定，本规范不作约束。声明后，接收方在证书链无法于本地 <code>ca_issuer</code> 下验证时 MAY 从该端点获取受背书信任锚重试；未声明时行为与现状一致。参见<a href="/documentation/specification/protocol-core/identity-authorization.html#s-651">第 6 章 6.5.1 节</a>。</td>
</tr>
<tr>
<td><code>http_message_signatures</code></td>
<td><code>jwks_uri</code></td>
<td>是</td>
<td>签名公钥 JWKS 端点（RFC 7517），用于动态拉取当前有效公钥。</td>
</tr>
<tr>
<td><code>http_message_signatures</code></td>
<td><code>profile</code></td>
<td>否</td>
<td>支持的签名 profile 列表，如 <code>["rsa-v1", "ecdsa-v1"]</code>。</td>
</tr>
<tr>
<td><code>http_message_signatures</code></td>
<td><code>key_protection</code></td>
<td>否</td>
<td>私钥保护方式，供实现方本地策略判断认证机制强度。有效值：<code>"software"</code>、<code>"os-keystore"</code>、<code>"tee"</code>、<code>"hsm"</code>；默认 <code>"software"</code>。</td>
</tr>
<tr>
<td><code>wimse</code></td>
<td><code>workload_identifier_scheme</code></td>
<td>是</td>
<td>workload 标识方案，如 <code>"spiffe"</code>、<code>"dns"</code>、<code>"urn"</code> 或 <code>"did"</code>。</td>
</tr>
</tbody>
</table>

<h3 id="s-523">5.2.3 User Authorization</h3>

<p>User Authorization 声明资源提供方支持的终端用户或上游授权主体授权机制。UTP 当前通过 OAuth 2 协议将用户身份与 Agent 身份关联，实现用户授权。资源提供方通过 <code>user_authorization</code> 配置块声明授权机制及其授权服务入口；授权流程、metadata、scope 目录与 token 验证参数由该入口对应的 Authorization Server metadata 提供，不在 Profile 中重复展开。</p>

<p><strong>UserAuthorizationConfig 实体定义：</strong></p>
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
<tr>
<td><code>version</code></td>
<td>string</td>
<td>是</td>
<td>配置格式版本，如 <code>"2026-04-08"</code>。</td>
</tr>
<tr>
<td><code>schema</code></td>
<td>string</td>
<td>是</td>
<td>该配置块对应的 JSON Schema URI。</td>
</tr>
<tr>
<td><code>supported_mechanisms</code></td>
<td>UserAuthorizationMechanism[]</td>
<td>是</td>
<td>资源提供方支持的用户授权机制列表。</td>
</tr>
</tbody>
</table>

<p><strong>UserAuthorizationMechanism 实体定义：</strong></p>
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
<tr>
<td><code>type</code></td>
<td>enum</td>
<td>是</td>
<td>机制类型。有效值：<code>"oauth2"</code>（未来可扩展）。</td>
</tr>
<tr>
<td><code>endpoint</code></td>
<td>string</td>
<td>是</td>
<td>Authorization Server 入口，MUST 为 HTTPS URL。实现方按第 6 章 6.3.3 节从该入口发现 OAuth metadata，并从 metadata 获取 issuer、authorization endpoint、token endpoint、JWKS 与 scopes_supported。</td>
</tr>
</tbody>
</table>

<h3 id="s-524">5.2.4 Mandates Capability</h3>

<p>Mandates Capability 声明 Profile 发布方支持哪些 Mandate 类型。它只表达能力集合，不表达某个操作是否强制要求 Mandate；具体操作的 Mandate 要求由原语定义、会话协商、运行时授权挑战或本地策略表达，Mandate Chain 的结构与验证语义见第 6 章。</p>

<p><strong>MandatesConfig 实体定义：</strong></p>
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
<tr>
<td><code>version</code></td>
<td>string</td>
<td>是</td>
<td>配置格式版本，如 <code>"2026-04-08"</code>。</td>
</tr>
<tr>
<td><code>schema</code></td>
<td>string</td>
<td>是</td>
<td>该配置块对应的 JSON Schema URI。</td>
</tr>
<tr>
<td><code>supported_mandate_types</code></td>
<td>string[]</td>
<td>是</td>
<td>支持的 Mandate 类型列表。有效值包含：<code>"checkout"</code>、<code>"payment"</code>、<code>"operation"</code>。</td>
</tr>
</tbody>
</table>

<h3 id="s-525">5.2.5 声明验证规则</h3>

<ol>
<li><code>agent_authentication</code> 与 <code>user_authorization</code> 均为 OPTIONAL。若资源提供方未声明 <code>user_authorization</code>，请求方 Agent 只能执行无需用户授权的操作（Public 或 Agent-authenticated 级别）。</li>
<li>若 Profile 发布方声明 <code>agent_authentication</code>，则 <code>supported_mechanisms</code> MUST 非空，且每个 mechanism 的 <code>type</code>、<code>issuer</code> 与对应 <code>config</code> MUST 满足 5.2.2 的字段要求。</li>
<li>请求方 Agent 与响应方在会话建立时 MUST 从双方 <code>agent_authentication.supported_mechanisms</code> 的交集中选择认证机制；若不存在满足目标操作准入要求的共同机制，响应方 MUST 拒绝建立会话或拒绝对应操作。</li>
<li>webhook、callback 与异步状态通知 MUST 使用 HTTP Message Signatures、WIMSE Workload Proof Token（WPT）或等价的请求级签名机制；接收方 MUST 在处理业务状态变更前验证签名、时间窗、nonce/jti 与消息摘要。</li>
<li>若资源提供方声明 <code>user_authorization</code>，则 <code>supported_mechanisms</code> MUST 非空，且每个 mechanism 的 <code>type</code> 与 <code>endpoint</code> MUST 同时存在。</li>
<li>请求方 Agent MUST 校验 <code>user_authorization.supported_mechanisms[].endpoint</code> 为 HTTPS URL，且其域名 MUST 与 Profile 发布域同属一个治理登记的信任域，或具备跨域信任锚背书。</li>
<li>协议引擎 MUST 通过 <code>endpoint</code> 发现并校验 Authorization Server metadata；后续收到的 Access Token 的 <code>iss</code> MUST 与 metadata 中的 <code>issuer</code> 一致，否则 MUST 拒绝该委托凭证。</li>
<li>若 Profile 发布方声明 <code>mandates</code>，则 <code>supported_mandate_types</code> MUST 非空，且每个取值 MUST 属于 <code>"checkout"</code>、<code>"payment"</code>、<code>"operation"</code>。</li>
</ol>

<h3 id="s-526">5.2.6 授权机制发现（Authorization Mechanism Discovery）</h3>

<p>在 OAuth 2 授权流程开始前，请求方 Agent MUST 先从资源提供方的 UTPProfile 中发现并验证其 Authorization Server。发现流程包括：从 Profile 端点获取 UTPProfile、读取 <code>user_authorization.supported_mechanisms</code>、校验 <code>endpoint</code> 的 HTTPS 与 trust domain 约束、按第 6 章 6.3.3 节获取 RFC 8414 metadata 并验证 issuer 匹配。</p>

<p>本章只声明发现入口与验证要求，详细的 RFC 8414 metadata 请求、响应字段、错误处理与 Access Token 验证流程见 <a href="/documentation/specification/protocol-core/identity-authorization.html#s-633">第 6 章 6.3.3 节</a>；OAuth 2.1 Authorization Code + PKCE 授权流程详见 <a href="/documentation/specification/protocol-core/identity-authorization.html#s-63">第 6 章 6.3 节</a>。</p>

<h3 id="s-527">5.2.7 与操作准入语义的协同</h3>

<p>认证与授权机制声明与操作准入语义（<a href="#s-51">5.1 节</a>）共同构成准入对接的双重要求：</p>
<ul>
<li><strong>操作准入语义</strong>回答「本次操作执行前按什么顺序校验认证、授权、Mandate、确认或证据条件」；</li>
<li><strong>认证与授权机制声明</strong>回答「请求方 Agent 可以通过响应方声明的哪些机制证明自身身份，以及通过哪些入口获得用户授权」。</li>
</ul>
<p>两者 MUST NOT 相互替代。即使请求方 Agent 可通过某种机制完成 Agent Authentication，若目标操作要求 User Authorization、Mandate 或 Human Confirmation，请求方仍必须提供对应凭证；反之，即使 User Authorization 声明完整，若请求方无法满足目标操作的准入要求，响应方 MUST 拒绝建立会话或拒绝对应操作（见 <a href="#s-514">5.1.4 节</a>）。</p>

<h3 id="s-528">5.2.8 陌生 Agent 交互的信任准入视角</h3>

<p>陌生 Agent 交互指双方此前缺少直接业务关系、双边凭证或固定授权入口的场景。该场景的发现、Profile 获取、Participant 绑定、Primitive Edge 选择与 BootstrapGraph 生成由<a href="/documentation/specification/protocol-core/discovery-negotiation.html#s-34">第 3 章 3.4 节</a>定义；Session 三步握手由<a href="/documentation/specification/protocol-core/transport-communication.html#s-421">第 4 章 4.2.1 节</a>定义。本节说明同一交互在信任与安全层面的准入逻辑。</p>

<p>从信任准入角度看，陌生 Agent 首次交互的目标，是把发现阶段得到的 Profile、Trust Anchor、能力入口和目标操作要求收敛为可验证的会话安全上下文。协议引擎在进入受保护操作前需要完成四类判断：对端身份是否由签名 Profile 支撑，双方是否存在可共同使用的 Agent Authentication 机制，目标操作是否需要 User Authorization 或 Mandate，以及相关确认与证据是否可以在运行时生成并追溯。</p>

<p>信任准入上下文应至少包含以下项目：</p>
<table>
<thead>
<tr><th>上下文项</th><th>权威来源</th><th>安全含义</th><th>运行时使用方式</th></tr>
</thead>
<tbody>
<tr><td>Profile 验证结果</td><td>第 3 章 Profile、Registry、Trust Anchor</td><td>确认 <code>agent_id</code>、签名公钥、issuer、trust domain 与撤销状态</td><td>绑定 Participant 身份、Profile 摘要与后续验签材料</td></tr>
<tr><td>Agent Authentication 选择</td><td>双方 <code>agent_authentication.supported_mechanisms</code> 的交集</td><td>确认请求方 workload 可用哪种机制证明自身身份</td><td>每次请求验证 mTLS、HTTP Message Signatures、WIMSE WIT/WPT 或等价凭证</td></tr>
<tr><td>User Authorization 入口</td><td>资源提供方 <code>user_authorization.supported_mechanisms</code></td><td>确认需要代表用户访问资源时应从哪个 Authorization Server 获取授权</td><td>发现 OAuth metadata，获取并校验 Access Token、issuer 与 scope</td></tr>
<tr><td>Mandate 能力边界</td><td>双方 <code>mandates.supported_mandate_types</code> 与第 6 章 Mandate Chain</td><td>确认双方是否支持目标操作所需的 Checkout、Payment 或 Operation Mandate</td><td>在下单、支付、验收、退款、取消等操作前校验 Mandate Chain</td></tr>
<tr><td>操作准入条件</td><td>原语定义、Mode、会话协商、运行时授权挑战或本地策略</td><td>明确本次 action 需要哪些认证、授权、Mandate、人类确认与证据</td><td>按 5.1.2 的顺序执行准入判定，并将结果写入 Authorization Decision</td></tr>
<tr><td>证据引用</td><td>第 7 章 Evidence Bundle 与 AuthorizationArchive</td><td>保留 Profile 验证、机制选择、授权决策和拒绝原因</td><td>支撑审计、争议举证、监管导出与后续风险判断</td></tr>
</tbody>
</table>

<p>该上下文遵循最小权限原则：Agent Authentication 证明「谁在调用」；User Authorization 证明「用户允许该 Agent 代表自己访问资源」；Mandate Chain 证明「本次交易或操作边界已经被授权」；TrustProfileDocument 提供对手方信誉信号，用于过滤、排序或本地策略判断。四者分别进入准入判定，不能相互替代。</p>

<p><strong>设计思想：</strong>陌生 Agent 交互采用“先验身份、再定能力、逐次放行、全程留证”的设计。发现阶段先确认对方是谁以及它声明了哪些能力；会话阶段只锁定双方可共同使用的认证、授权和 Mandate 入口；业务执行阶段每个受保护操作都重新检查目标操作所需的身份、授权、Mandate、人类确认和证据条件。这样既允许两个此前陌生的 Agent 快速建立可用连接，也避免把一次握手误用为后续所有操作的永久授权。</p>

<p><strong>陌生 Agent 交互的信任准入时序：</strong></p>
<figure id="s-528-sequence" style="margin: 20px 0 28px;">
  <div style="max-height: 900px; overflow: auto; border: 1px solid #e5e7eb; border-radius: 8px; background: #ffffff;">
    <img
      src="diagrams/agent-trust-handshake-sequence.svg"
      alt="陌生 Agent 交互的信任准入时序图：用先验身份、确定安全对话方式、获取必要授权、每次操作前重新检查、全程留证五个阶段说明信任准入逻辑"
      style="display: block; width: 100%; min-width: 1120px; height: auto;">
  </div>
  <figcaption style="margin-top: 10px; color: #6b7280; font-size: 13px; text-align: center;">
    图 5-1　陌生 Agent 交互的信任准入时序图（易读版；发现与协商主流程见第 3 章；可在图内滚动查看完整链路）
  </figcaption>
</figure>

<p>该时序的产物是一组可审计的会话安全上下文记录，而不是新的协议实体。记录内容来自已存在的 Profile 摘要、Trust Anchor 验证结果、选定的 Agent Authentication 机制、User Authorization endpoint、Mandate 支持情况、目标操作准入条件和证据引用。会话安全上下文只锁定候选机制与信任入口；每个受保护 primitive action 执行前仍需按 5.1.2 重新验证认证、授权、Mandate、确认与证据条件。</p>

<p>当 Profile 摘要变化、BootstrapGraph 失效、认证凭证过期、授权 scope 不足、Mandate 缺失或运行时风险策略要求升级时，响应方应拦截当前操作，并返回能够说明缺失条件的标准错误。请求方补齐缺失材料后，可以重新发起该操作；所有拒绝和升级决策都应写入 Authorization Decision，并按第 7 章纳入 Evidence Bundle。</p>

<hr />

<h2 id="s-53-trust-profile">5.3 信任画像（Trust Profile）</h2>

<h3 id="s-531">5.3.1 概述</h3>

<p>操作准入语义（<a href="#s-51">5.1 节</a>）定义受保护操作的执行前判定顺序；认证与授权机制声明（<a href="#s-52">5.2 节</a>）定义响应方向潜在请求方声明的准入对接机制；信任画像（Trust Profile）则为任一交互方提供<strong>参考性的对手方信誉描述</strong>，用于在 Discover / Negotiate 阶段过滤与排序候选参与方。</p>

<p>信任画像不属于准入强制校验内容。UTPProfile 只声明 <code>trust_profile</code> 引用入口；完整 Trust Profile 文档通过该入口获取，并由 JWS 签名保证真实性与完整性。完整 Trust Profile 包含 <code>trust_level</code>、<code>trust_score</code> 与 <code>risk_indicators</code> 等字段，供买方 Agent 在候选参与方之间做偏好排序与风险提示，MUST NOT 替代 Profile 签名链、认证与授权机制声明、Mandate 或操作准入判定。</p>

<p>完整的 Profile（定义见<a href="/documentation/specification/protocol-core/discovery-negotiation.html">第 3 章</a>）在 Profile 端点（<code>/.well-known/utp</code>）中发布，并由 AIS 的 ES256 密钥签名。</p>

<h3 id="s-532">5.3.2 UTPProfile 与 TrustProfileReference 的命名边界</h3>

<p><strong>UTPProfile 顶层相关字段摘录：</strong>完整 Profile 的权威结构见<a href="/documentation/specification/protocol-core/discovery-negotiation.html">第 3 章</a>与 <a href="/documentation/specification/schemas/index.html#s-discovery-profile">第 25 章 UTPProfile Schema</a>。本表仅摘录与本章操作准入、认证授权机制声明和信任画像引用相关的顶层字段，用于说明它们在完整 Profile 中的位置。</p>
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
<tr>
<td><code>agent_id</code></td>
<td>string</td>
<td>是</td>
<td>关联的 Profile 的 <code>agent_id</code>，MUST 与已注册的 Profile 一致。</td>
</tr>
<tr>
<td><code>agent_authentication</code></td>
<td>AgentAuthenticationConfig</td>
<td>否</td>
<td>Agent 身份认证机制声明，定义见 <a href="#s-522">5.2.2 节</a>。</td>
</tr>
<tr>
<td><code>user_authorization</code></td>
<td>UserAuthorizationConfig</td>
<td>否</td>
<td>用户授权机制声明，定义见 <a href="#s-523">5.2.3 节</a>。</td>
</tr>
<tr>
<td><code>mandates</code></td>
<td>MandatesConfig</td>
<td>否</td>
<td>Mandate 能力声明，定义见 <a href="#s-524">5.2.4 节</a>。</td>
</tr>
<tr>
<td><code>trust_profile</code></td>
<td>TrustProfileReference</td>
<td>否</td>
<td>信任画像引用入口，包含版本、Schema、endpoint、格式与摘要约束。完整 Trust Profile 文档通过 endpoint 获取并依据其内部签名与证书链验签。</td>
</tr>
</tbody>
</table>
<p><strong>命名约束：</strong>为避免与完整 Profile 混淆，包含身份、认证、授权与 Mandate 能力入口的完整对象统一称为 <code>UTPProfile</code>；UTPProfile 中的 <code>trust_profile</code> 字段统一称为 <code>TrustProfileReference</code>；通过该 endpoint 获取的完整信任画像文档统一称为 <code>TrustProfileDocument</code>。实现 MUST NOT 将完整 <code>UTPProfile</code> 的字段复制到 Trust Profile 文档中，也 MUST NOT 将 Trust Profile 文档作为 Profile 签名链、认证机制声明或用户授权入口的替代来源。</p>

<p><strong>TrustProfileReference 实体定义：</strong></p>

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
<tr>
<td><code>version</code></td>
<td>string</td>
<td>是</td>
<td>Trust Profile 引用格式版本，如 <code>"2026-04-08"</code>。</td>
</tr>
<tr>
<td><code>schema</code></td>
<td>URI</td>
<td>是</td>
<td>Trust Profile Reference JSON Schema URI。</td>
</tr>
<td><code>endpoint</code></td>
<td>URI</td>
<td>是</td>
<td>完整 Trust Profile 文档获取入口，MUST 为 HTTPS URL。</td>
</tr>
<tr>
<td><code>format</code></td>
<td>string</td>
<td>否</td>
<td>返回文档的签名封装格式。默认 <code>"jws-json"</code>。</td>
</tr>
<tr>
<td><code>digest</code></td>
<td>string</td>
<td>否</td>
<td>可选内容摘要，用于 pin 当前版本。若声明，接收方 MUST 校验 endpoint 返回文档的摘要匹配。</td>
</tr>
</tbody>
</table>

<p><strong>TrustProfileDocument 实体定义：</strong></p>

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
<tr>
<td><code>agent_id</code></td>
<td>string</td>
<td>是</td>
<td>该信任画像绑定的 Agent 标识，MUST 与引用它的 UTPProfile 中的 <code>agent_id</code> 一致。</td>
</tr>
<tr>
<td><code>issuer</code></td>
<td>URI</td>
<td>是</td>
<td>签发该信任画像的 AIS、Registry、Profile 发布方或受信第三方，也是公共评分背书方。接收方 MUST 通过 TrustProfileDocument 的签名、证书链或治理登记的信任锚验证该 issuer 具备为该 <code>agent_id</code> 背书的资格。</td>
</tr>
<tr>
<td><code>issued_at</code></td>
<td>datetime</td>
<td>是</td>
<td>签发时间。</td>
</tr>
<tr>
<td><code>expires_at</code></td>
<td>datetime</td>
<td>是</td>
<td>过期时间。接收方 MUST NOT 使用已过期的 Trust Profile 文档。</td>
</tr>
<tr>
<td><code>trust_level</code></td>
<td>string</td>
<td>否</td>
<td>信任等级，声明该参与方可参与的最高信任层级。有效值：<code>"L0"</code>（匿名/一次性）、<code>"L1"</code>（已验证身份）、<code>"L2"</code>（已验证 + Mandate 链）、<code>"L3"</code>（已验证 + 全面合规 + 托管）。</td>
</tr>
<tr>
<td><code>trust_score</code></td>
<td>TrustScore</td>
<td>否</td>
<td>量化信誉评分，基于历史交易表现动态计算。</td>
</tr>
<tr>
<td><code>risk_indicators</code></td>
<td>RiskIndicator[]</td>
<td>否</td>
<td>当前风险指标列表，由参与方或第三方风控服务声明。</td>
</tr>
<tr>
<td><code>evidence_refs</code></td>
<td>string[]</td>
<td>否</td>
<td>支撑该信任画像的证据引用。</td>
</tr>
<tr>
<td><code>signature</code></td>
<td>JWS</td>
<td>是</td>
<td>覆盖除 <code>signature</code> 外完整 payload 的签名。</td>
</tr>
</tbody>
</table>

<p><strong>TrustProfileDocument 返回示例：</strong></p>

<pre><code class="language-json">{
  "agent_id": "cn-unified-social-credit-code-91440300MA5FGH2B",
  "issuer": "https://registry.utp.example",
  "issued_at": "2026-07-14T00:00:00Z",
  "expires_at": "2026-07-15T00:00:00Z",
  "trust_level": "L2",
  "trust_score": {
    "score": 87.5,
    "model": "utp-trust-v1.0",
    "factors": [
      { "name": "transaction_completion", "weight": 0.4, "value": 92.0 },
      { "name": "dispute_resolution", "weight": 0.3, "value": 85.0 },
      { "name": "delivery_timeliness", "weight": 0.3, "value": 84.0 }
    ],
    "computed_at": "2026-07-14T00:00:00Z"
  },
  "risk_indicators": [
    {
      "indicator_type": "dispute_rate",
      "severity": "low",
      "value": "1.2%",
      "updated_at": "2026-07-14T00:00:00Z"
    }
  ],
  "evidence_refs": ["registry-report-2026-07"],
  "signature": "eyJhbGciOiJFUzI1NiIsImtpZCI6InJlZ2lzdHJ5LWtleS0yMDI2LTA3In0..."
}
</code></pre>

<h3 id="s-533">5.3.3 TrustScore 与 RiskIndicator</h3>

<p><strong>TrustScore 实体定义：</strong></p>

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
<tr>
<td><code>score</code></td>
<td>number</td>
<td>是</td>
<td>评分值，范围 0.0 - 100.0。</td>
</tr>
<tr>
<td><code>model</code></td>
<td>string</td>
<td>是</td>
<td>评分模型标识。实现方 MAY 使用自定义模型，但 MUST 声明模型版本。</td>
</tr>
<tr>
<td><code>factors</code></td>
<td>ScoreFactor[]</td>
<td>否</td>
<td>评分因子明细，含因子名称、权重和分值。</td>
</tr>
<tr>
<td><code>computed_at</code></td>
<td>datetime</td>
<td>是</td>
<td>评分计算时间。</td>
</tr>
</tbody>
</table>

<p><strong>RiskIndicator 实体定义：</strong></p>

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
<tr>
<td><code>indicator_type</code></td>
<td>string</td>
<td>是</td>
<td>风险指标类型。有效值：<code>"dispute_rate"</code>（争议率）、<code>"late_delivery_rate"</code>（逾期交付率）、<code>"chargeback_rate"</code>（退款率）、<code>"sanctions_flag"</code>（制裁标记）、<code>"custom"</code>（自定义）。</td>
</tr>
<tr>
<td><code>severity</code></td>
<td>string</td>
<td>是</td>
<td>严重程度。有效值：<code>"low"</code>、<code>"medium"</code>、<code>"high"</code>、<code>"critical"</code>。</td>
</tr>
<tr>
<td><code>value</code></td>
<td>string</td>
<td>否</td>
<td>指标值（如 <code>"2.3%"</code>）。</td>
</tr>
<tr>
<td><code>updated_at</code></td>
<td>datetime</td>
<td>是</td>
<td>指标最近更新时间。</td>
</tr>
</tbody>
</table>

<h3 id="s-534">5.3.4 信任画像验证规则</h3>

<ol>
<li>接收方在交易建立前 MUST 验证对方 Profile 的 JWS 签名有效性。</li>
<li><code>trust_profile</code> 为 OPTIONAL 引用入口，MUST NOT 替代 Profile 签名链、操作准入要求、认证机制声明或用户授权机制声明。买方 Agent MAY 据此过滤或排序候选参与方，但 MUST NOT 因缺失信任画像而拒绝交易。</li>
<li>若 Profile 声明 <code>trust_profile</code>，接收方 MUST 校验 <code>trust_profile.endpoint</code> 为 HTTPS URL，且其域名 MUST 与 Profile 发布域同属一个治理登记的信任域，或具备跨域信任锚背书。</li>
<li>接收方获取 TrustProfileDocument 后 MUST 验证其签名、证书链或等价完整性证明、<code>agent_id</code> 绑定、<code>issuer</code> 信任链、<code>issued_at</code> / <code>expires_at</code> 时间窗，以及可选 <code>digest</code>。TrustProfileDocument 的 <code>issuer</code> 是该信任画像的发放方和公共评分背书方，不在 UTPProfile 的 <code>trust_profile</code> 引用中重复声明。</li>
<li>若买方 Agent 参考 TrustProfileDocument 的 <code>trust_level</code>，该值低于当前交易所需的最低信任等级时，MAY 拒绝交易或要求升级信任等级。</li>
<li>若 TrustProfileDocument 的 <code>risk_indicators</code> 中存在 <code>severity</code> 为 <code>"critical"</code> 的指标，接收方 SHOULD 将其作为本地策略输入，触发更强认证、人机协同确认（参见<a href="/documentation/specification/protocol-core/human-agent-interaction.html">第 20 章</a>）或拒绝该操作。</li>
<li>TrustProfileDocument 的 <code>trust_level</code> 声明 MUST NOT 超过 Registry 为该 <code>agent_id</code> 记录的最高信任等级。</li>
</ol>

<hr />

<h2 id="s-54">5.4 实体定义</h2>
<p>本章定义的完整实体列表：</p>
<table>
<thead>
<tr>
<th>实体名称</th>
<th>定义位置</th>
<th>描述</th>
</tr>
</thead>
<tbody>
<tr>
<td>UTPProfile</td>
<td><a href="#s-532">5.3.2 UTPProfile 顶层字段摘录</a></td>
<td>Participant 发布的签名发现与能力入口文档</td>
</tr>
<tr>
<td>AgentAuthenticationConfig</td>
<td><a href="#s-522">5.2.2 Agent Authentication</a></td>
<td>Agent 身份认证机制配置块，声明 Profile 发布方作为响应方时支持的 Agent 认证机制列表</td>
</tr>
<tr>
<td>AgentAuthenticationMechanism</td>
<td><a href="#s-522">5.2.2 Agent Authentication</a></td>
<td>Agent 身份认证机制条目，描述单一认证机制的类型、能力与端点信息</td>
</tr>
<tr>
<td>UserAuthorizationConfig</td>
<td><a href="#s-523">5.2.3 User Authorization</a></td>
<td>用户授权机制配置块，声明资源提供方支持的用户授权机制列表</td>
</tr>
<tr>
<td>UserAuthorizationMechanism</td>
<td><a href="#s-523">5.2.3 User Authorization</a></td>
<td>用户授权机制条目，包含 type 与 endpoint</td>
</tr>
<tr>
<td>MandatesConfig</td>
<td><a href="#s-524">5.2.4 Mandates Capability</a></td>
<td>Mandate 能力配置块，声明版本、Schema 与支持的 Mandate 类型列表</td>
</tr>
<tr>
<td>TrustProfileReference</td>
<td><a href="#s-532">5.3.2 TrustProfileReference 实体定义</a></td>
<td>Profile 中的信任画像引用入口，声明 endpoint、签名格式和摘要约束</td>
</tr>
<tr>
<td>TrustProfileDocument</td>
<td><a href="#s-532">5.3.2 TrustProfileDocument 实体定义</a></td>
<td>通过 TrustProfileReference endpoint 获取的完整签名信任画像文档</td>
</tr>
<tr>
<td>TrustScore</td>
<td><a href="#s-533">5.3.3 TrustScore 与 RiskIndicator</a></td>
<td>信任评分，量化 Agent 在特定维度的信任值</td>
</tr>
<tr>
<td>RiskIndicator</td>
<td><a href="#s-533">5.3.3 TrustScore 与 RiskIndicator</a></td>
<td>风险指标，标识潜在的风险信号和严重程度</td>
</tr>
</tbody>
</table>
<p><strong>交叉引用：</strong></p>
<ul>
<li>Profile 发布格式见<a href="/documentation/specification/protocol-core/discovery-negotiation.html">第 3 章：发现基础设施</a></li>
<li>Agent 身份令牌与授权机制定义见<a href="/documentation/specification/protocol-core/identity-authorization.html">第 6 章：认证与授权</a></li>
<li>凭证授权保存、资金托管、电子证据包等信任基础设施详见<a href="/documentation/specification/protocol-core/risk-audit.html">第 7 章：风控与审计</a></li>
</ul>

<h2 id="s-55">5.5 Profile 示例</h2>

<p>以下示例展示瘦身后的 Profile 结构：Profile 只承载发现与能力入口，包含 <a href="#s-52">5.2 节</a>认证与授权机制声明、Mandate 能力声明，以及 <a href="#s-53-trust-profile">5.3 节</a>信任画像引用入口。具体操作的准入要求由协议规范、原语定义、运行时授权挑战或本地策略表达，不在主 Profile 中内联发布。</p>

<pre><code class="language-json">{
  "agent_id": "cn-unified-social-credit-code-91440300MA5FGH2B",
  "agent_authentication": {
    "version": "2026-04-08",
    "schema": "https://schemas.utp.example/common/agent_authentication.json",
    "supported_mechanisms": [
      {
        "type": "mtls",
        "issuer": "https://pki.example.com/ca",
        "config": {
          "ca_issuer": "https://pki.example.com/ca"
        }
      },
      {
        "type": "api_keys",
        "issuer": "https://seller.example.com",
        "config": {
          "key_distribution": "out_of_band"
        }
      },
      {
        "type": "http_message_signatures",
        "issuer": "https://agent.supplier.example.com",
        "config": {
          "jwks_uri": "https://agent.supplier.example.com/.well-known/jwks.json",
          "profile": ["rsa-v1", "ecdsa-v1"],
          "key_protection": "os-keystore"
        }
      },
      {
        "type": "wimse",
        "issuer": "https://identity.supplier.example.com",
        "config": {
          "workload_identifier_scheme": "spiffe"
        }
      }
    ]
  },
  "user_authorization": {
    "version": "2026-04-08",
    "schema": "https://schemas.utp.example/common/user_authorization.json",
    "supported_mechanisms": [
      {
        "type": "oauth2",
        "endpoint": "https://auth.supplier.example.com"
      }
    ]
  },
  "mandates": {
    "version": "2026-04-08",
    "schema": "https://schemas.utp.example/common/mandates.json",
    "supported_mandate_types": ["checkout", "payment", "operation"]
  },
  "trust_profile": {
    "version": "2026-04-08",
    "schema": "https://schemas.utp.example/common/trust_profile_reference.json",
    "endpoint": "https://seller.example.com/.well-known/utp/trust-profile",
    "format": "jws-json"
  }
}
</code></pre>

<p><strong>示例说明：</strong>本示例中 <code>agent_authentication</code> 只声明 Agent 机器身份认证机制，<code>user_authorization.supported_mechanisms[].endpoint</code> 指向 Seller/Business 独立的 Authorization Server 入口，<code>mandates</code> 只声明支持的 Mandate 类型集合，<code>trust_profile.endpoint</code> 指向可独立验签的完整信任画像文档；公共评分背书方由 TrustProfileDocument 内部的 <code>issuer</code>、签名与证书链表达。Profile 不内联操作准入规则；受保护操作的准入要求由协议规范、原语定义、运行时授权挑战或本地策略表达。</p>
