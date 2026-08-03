---
title: M3 MP1 商品管理原语
section: merchant
owner: merchant-team
status: review
version: 2026-07-30
format: html
---

<h1 id="s-m3">M3 · MP1 商品管理原语（Listing）</h1>
    <h2 id="s-m3-toc">目录</h2>
    <ul>
      <li><a href="#s-m31">M3.1 Overview（概述）</a></li>
      <li><a href="#s-m32">M3.2 Lifecycle / State Machine（生命周期 / 状态机）</a></li>
      <li><a href="#s-m33">M3.3 Error Handling（错误处理）</a></li>
      <li><a href="#s-m34">M3.4 Scopes（权限范围）</a></li>
      <li><a href="#s-m35">M3.5 Guidelines（角色职责指引）</a></li>
      <li><a href="#s-m36">M3.6 Mode-Driven Behavior（模式驱动行为）</a></li>
      <li><a href="#s-m37">M3.7 Operations（操作定义）</a></li>
      <li><a href="#s-m38">M3.8 Transport Bindings（传输绑定）</a></li>
      <li><a href="#s-m39">M3.9 Entities（实体定义）</a></li>
      <li><a href="#s-m310">M3.10 Use Case Walkthroughs（用例演练）</a></li>
    </ul>
    <hr />
    <h2 id="s-m3-identity">原语身份</h2>
<pre class="highlight"><code>primitive_id:   utp.listing
version:        2026-07-01
initiator_role: Seller
handler_role:   Marketplace
intent:         供应商发布、更新并控制商品在 UTP 网络中的可交易状态
state_delta:    ∅ → listing(LISTED)（资源作用域，不产生全局交易状态）
actions:        publish, update, list, delist, query, archive
compensation:   delist（使商品退出可交易范围，不影响已成立订单）
service:        dev.utp.merchant
</code></pre>

    <hr />
    <h2 id="s-m31">M3.1 Overview（概述）</h2>
    <h3 id="s-m311">M3.1.1 意图</h3>
    <p>Listing 是 UTP-M 第一个供应商原语（MP1），其意图是使供应商能够把商品（Goods）或服务（Service）以标准结构发布到 Marketplace，并控制其可交易状态。Listing 的产出是<strong>商品档案（Listing）</strong>及其状态；只有处于 <code>LISTED</code> 状态的商品才进入买方 P1 Source 的可搜索范围。</p>
    <p>Listing 是整个商业闭环的起点：没有 Listing，P1 Source 无货可搜。主规范中"商品已下架"（<code>PURCHASE.CREATE.INVALID_ITEMS</code>）、"商品不存在或已下架"（<code>SOURCE.LOOKUP.ITEM_NOT_FOUND</code>）等既有错误码的触发源，由本原语的 <code>delist</code>/<code>archive</code> 正式闭合。</p>
    <h3 id="s-m312">M3.1.2 关键设计原则</h3>
    <p><strong>"商品发布"与"商品上架"是两个独立动作。</strong><code>publish</code> 建立商品档案并进入平台审核；<code>list</code> 使审核通过的商品进入可交易状态。分离的原因：审核是平台治理动作（时长不可控），上架是供应商经营决策（可反复执行）。供应商 MAY 在 <code>publish</code> 请求中声明 <code>auto_list: true</code>，审核通过后自动上架。</p>
    <p><strong>Listing 管信息，不管数量。</strong>商品的可售数量由 MP2 Inventory（<a href="../../primitives/inventory/index.html">M4</a>）独立管理。<code>publish</code>/<code>update</code> 请求 MUST NOT 携带库存数量字段；实现方若在同一 UI 中同时编辑信息与库存，MUST 在协议层拆分为 MP1 与 MP2 两次调用。</p>
    <h3 id="s-m313">M3.1.3 范围</h3>
    <p>Listing 覆盖以下场景：</p>
    <ul>
      <li><strong>商品发布（Publish）</strong>：创建商品档案（标题、类目、属性、SKU、定价、履约条款、媒体资源、合规资质引用）。发布请求 MAY 携带 AI 辅助录入素材（M3.9.7 SourceMaterials：图片/商品链接/表格），由 Marketplace 解析为结构化草稿供供应商确认。</li>
      <li><strong>商品更新（Update）</strong>：修改商品档案；价格与核心属性变更受版本化快照保护（M3.2.4）。</li>
      <li><strong>上架/下架（List / Delist）</strong>：控制商品是否可被搜索与订购。</li>
      <li><strong>查询（Query）</strong>：查询商品档案、状态与审核结论。</li>
      <li><strong>归档（Archive）</strong>：商品永久退出经营（终态）。</li>
    </ul>
    <p>Listing 不覆盖：库存数量（MP2）、订单处理（MP4）、类目体系治理（平台运营域）、搜索排序与推荐（平台实现域）。</p>
    <h3 id="s-m314">M3.1.4 前置条件</h3>
    <table>
      <thead><tr><th>条件</th><th>必需？</th><th>说明</th></tr></thead>
      <tbody>
        <tr><td><code>merchant.status == 'ACTIVE'</code></td><td>MUST</td><td>供应商已完成入驻五步流程（<a href="../../onboarding.html#s-m27">M2.7</a>）。<code>SANDBOX</code> 状态仅允许沙箱环境操作。</td></tr>
        <tr><td><code>seller.identity.verified == true</code></td><td>MUST</td><td>Seller 身份已验证，请求携带有效 RFC 9421 签名。</td></tr>
        <tr><td><code>category ∈ merchant.qualified_categories</code></td><td>MUST</td><td>商品类目在供应商资质核准范围内。</td></tr>
        <tr><td><code>compliance_level ≥ L1 → compliance_refs != null</code></td><td>MUST</td><td>合规要求类目 MUST 附资质文件引用。</td></tr>
      </tbody>
    </table>
    <h3 id="s-m315">M3.1.5 后置条件</h3>
    <table>
      <thead><tr><th>条件</th><th>说明</th></tr></thead>
      <tbody>
        <tr><td><code>listing.listing_id != null</code></td><td>商品档案已建立，含全局唯一标识。</td></tr>
        <tr><td><code>listing.status == 'LISTED'</code>（完成 <code>list</code> 后）</td><td>商品进入可交易状态。</td></tr>
        <tr><td><code>source.lookup(item_id == listing.listing_id) 可命中</code></td><td>买方 P1 Source 可搜索/查询该商品（平台托管拓扑）。</td></tr>
        <tr><td><code>listing.version_hash</code> 已生成</td><td>当前版本快照的 SHA256 哈希，供订单条款快照引用。</td></tr>
        <tr><td><code>listing_snapshot 已存档</code></td><td>每次生效版本 MUST 存档，可纳入 Evidence Bundle。</td></tr>
      </tbody>
    </table>
    <h3 id="s-m316">M3.1.6 语义契约</h3>
<pre class="highlight"><code class="language-json">{
  "primitive": "utp.listing",
  "preconditions": [
    "merchant.status == 'ACTIVE'",
    "seller.identity.verified == true",
    "category ∈ merchant.qualified_categories",
    "IF mode.compliance_level >= L1 → compliance_refs != null"
  ],
  "postconditions": [
    "listing.listing_id != null",
    "listing.status ∈ {PENDING_REVIEW, PUBLISHED, LISTED}",
    "listing.version_hash == SHA256(JCS(listing))  // JCS = RFC 8785 规范化 JSON",
    "listing.status == 'LISTED' → source.searchable(listing_id) == true"
  ],
  "invariants": [
    "listing 请求与档案 MUST NOT 包含库存数量字段（数量属于 utp.inventory）",
    "LISTED 状态的商品，其买方可见投影 MUST 与最新生效版本一致",
    "已被有效订单引用的 version_hash 对应快照 MUST NOT 被删除"
  ],
  "side_effects": [
    "商品进入/退出 Source 可搜索范围（Marketplace 索引更新）",
    "审核任务创建（publish/重大 update 触发）",
    "版本快照存档（每次生效变更）"
  ],
  "compensation": {
    "on_review_rejected": "状态 → REJECTED，附结构化原因码，供应商修改后重新 publish/update",
    "on_delist": "退出可搜索范围；已成立订单不受影响，MUST 继续履行",
    "on_platform_suspend": "平台依据治理规则强制下架（SUSPENDED_BY_PLATFORM），MUST 通知供应商并附申诉路径"
  }
}
</code></pre>

    <hr />
    <h2 id="s-m32">M3.2 Lifecycle / State Machine（生命周期 / 状态机）</h2>
    <h3 id="s-m321">M3.2.1 Listing 资源状态机</h3>
<div class="diagram"><img src="/documentation/assets/diagrams/m-listing-state-machine.svg" alt="Listing 资源状态机：PENDING_REVIEW/REJECTED/PUBLISHED/LISTED/DELISTED/SUSPENDED_BY_PLATFORM/ARCHIVED 及迁移" style="max-width: 100%; height: auto;"></div>
    <h3 id="s-m322">M3.2.2 状态定义与迁移规则</h3>
    <table>
      <thead><tr><th>状态</th><th>含义</th><th>进入条件</th><th>允许的操作</th></tr></thead>
      <tbody>
        <tr><td><code>PENDING_REVIEW</code></td><td>已提交，平台审核中</td><td><code>publish</code>，或对 LISTED 商品的重大 <code>update</code>（M3.2.4）</td><td><code>query</code>；供应商 MAY 撤回（视为 <code>archive</code>）</td></tr>
        <tr><td><code>REJECTED</code></td><td>审核驳回</td><td>平台审核不通过，附原因码</td><td><code>update</code>（修改后自动重新进入 <code>PENDING_REVIEW</code>）, <code>query</code>, <code>archive</code></td></tr>
        <tr><td><code>PUBLISHED</code></td><td>审核通过，未上架</td><td>审核通过；或从 <code>LISTED</code> 执行 <code>delist</code> 前的历史状态恢复</td><td><code>list</code>, <code>update</code>, <code>query</code>, <code>archive</code></td></tr>
        <tr><td><code>LISTED</code></td><td>已上架，可搜索可订购</td><td><code>list</code> 成功执行</td><td><code>update</code>, <code>delist</code>, <code>query</code></td></tr>
        <tr><td><code>DELISTED</code></td><td>已下架，不可搜索不可订购</td><td><code>delist</code> 成功执行</td><td><code>list</code>（重新上架）, <code>update</code>, <code>query</code>, <code>archive</code></td></tr>
        <tr><td><code>SUSPENDED_BY_PLATFORM</code></td><td>平台强制下架（治理动作）</td><td>资质过期、违规、风控触发</td><td><code>query</code>；整改通过后由平台恢复至 <code>PUBLISHED</code></td></tr>
        <tr><td><code>ARCHIVED</code></td><td>永久退出（终态）</td><td><code>archive</code> 成功执行</td><td><code>query</code>（只读）</td></tr>
      </tbody>
    </table>
    <h3 id="s-m323">M3.2.3 状态迁移的确定性</h3>
    <p>同一状态下同一操作 MUST 产生唯一确定的迁移结果（继承主规范状态机确定性约束）。特别地：</p>
    <ul>
      <li><code>list</code> 仅在 <code>PUBLISHED</code>、<code>DELISTED</code> 状态允许；对 <code>PENDING_REVIEW</code> 执行 <code>list</code> MUST 返回 <code>LISTING.LIST.NOT_REVIEWED</code>。</li>
      <li><code>delist</code> 生效 MUST 是原子的：生效时刻之后的 <code>source.lookup</code> MUST 返回 <code>SOURCE.LOOKUP.ITEM_NOT_FOUND</code>，<code>purchase.create</code> MUST 返回 <code>PURCHASE.CREATE.INVALID_ITEMS</code>；生效时刻之前已创建的订购草案按其条款快照继续（<code>complete</code> 时的最终校验以下架事实为准，失败走 P3 既有补偿链）。</li>
      <li><code>archive</code> 对存在未完结订单的商品 MUST 被拒绝（<code>LISTING.ARCHIVE.OPEN_ORDERS</code>），供应商应先 <code>delist</code> 并待订单完结。</li>
    </ul>
    <h3 id="s-m324">M3.2.4 版本化与变更分级</h3>
    <p>每次生效变更产生新的 <code>version</code>（单调递增整数）与 <code>version_hash</code>。变更分两级：</p>
    <table>
      <thead><tr><th>变更级别</th><th>字段范围</th><th>处理方式</th></tr></thead>
      <tbody>
        <tr><td>轻量变更（minor）</td><td><code>description</code>、<code>media</code>、<code>fulfillment_terms.leadtime_days</code>、SKU 增补</td><td>即时生效，商品保持 <code>LISTED</code>；生成新版本快照</td></tr>
        <tr><td>重大变更（major）</td><td><code>title</code>、<code>category</code>、<code>pricing</code>（降价除外）、SKU 删除、<code>compliance_refs</code></td><td>MUST 重新审核：商品保持旧版本继续可售，新版本进入 <code>PENDING_REVIEW</code>，审核通过后原子切换</td></tr>
      </tbody>
    </table>
    <p>订购条款快照（P3 的 <code>terms_snapshot</code>）MUST 引用下单时刻的 <code>listing_id + version_hash</code>；价格一致性校验（<code>PURCHASE.CREATE.PRICE_CHANGED</code>）以该版本为基准。被任何有效订单引用的版本快照 MUST 保留至争议时效期结束。</p>

    <hr />
    <h2 id="s-m33">M3.3 Error Handling（错误处理）</h2>
    <p>错误响应 MUST 使用主规范 P0 通用框架的标准错误响应格式（<a href="/documentation/specification/protocol-core/primitive-framework.html#s-1043-standard-error-response">10.4.3</a>）。本节定义 Listing 特有错误码：</p>
    <table>
      <thead><tr><th>错误码</th><th>严重级别</th><th>HTTP 映射</th><th>描述</th><th>建议处理</th></tr></thead>
      <tbody>
        <tr><td><code>LISTING.PUBLISH.MERCHANT_NOT_ACTIVE</code></td><td>error</td><td>403</td><td>供应商未完成入驻或处于 <code>RESTRICTED</code>/<code>TERMINATED</code> 状态。</td><td>完成入驻流程或联系平台解除限制。</td></tr>
        <tr><td><code>LISTING.PUBLISH.CATEGORY_NOT_QUALIFIED</code></td><td>error</td><td>403</td><td>商品类目不在供应商资质核准范围内。</td><td>申请类目资质后重试。</td></tr>
        <tr><td><code>LISTING.PUBLISH.SCHEMA_INVALID</code></td><td>error</td><td>400</td><td>商品结构不符合 Listing Schema（缺必填字段、SKU 结构错误、含库存数量字段等）。</td><td>按错误详情修正后重试。</td></tr>
        <tr><td><code>LISTING.PUBLISH.COMPLIANCE_MISSING</code></td><td>error</td><td>422</td><td><code>compliance_level ≥ L1</code> 类目缺少资质文件引用。</td><td>补充 <code>compliance_refs</code> 后重试。</td></tr>
        <tr><td><code>LISTING.PUBLISH.DUPLICATE</code></td><td>error</td><td>409</td><td>幂等键重复但请求内容不一致。</td><td>使用新的幂等键。</td></tr>
        <tr><td><code>LISTING.PUBLISH.INGEST_FAILED</code></td><td>error</td><td>422</td><td>AI 辅助录入素材解析失败或置信度不足（图片不可读、链接不可达、表格结构无法识别）。响应 MUST 附逐素材的解析报告。</td><td>修正素材后重试，或改为结构化字段直接提交。</td></tr>
        <tr><td><code>LISTING.UPDATE.NOT_FOUND</code></td><td>error</td><td>404</td><td>指定 <code>listing_id</code> 不存在或不属于调用方。</td><td>校验 <code>listing_id</code>。</td></tr>
        <tr><td><code>LISTING.UPDATE.VERSION_CONFLICT</code></td><td>error</td><td>409</td><td><code>expected_version</code> 与当前版本不一致（并发修改）。</td><td>重新 <code>query</code> 获取最新版本后重试。</td></tr>
        <tr><td><code>LISTING.UPDATE.IMMUTABLE_FIELD</code></td><td>error</td><td>400</td><td>尝试修改不可变字段（<code>listing_id</code>、<code>merchant_id</code>、库存数量字段）。</td><td>数量走 <code>utp.inventory</code>；其余字段不可改。</td></tr>
        <tr><td><code>LISTING.LIST.NOT_REVIEWED</code></td><td>error</td><td>409</td><td>商品未通过审核（<code>PENDING_REVIEW</code>/<code>REJECTED</code>）不可上架。</td><td>等待或按驳回原因修改。</td></tr>
        <tr><td><code>LISTING.LIST.SUSPENDED</code></td><td>error</td><td>403</td><td>商品处于 <code>SUSPENDED_BY_PLATFORM</code>，供应商不可自行上架。</td><td>按整改要求处理并申诉。</td></tr>
        <tr><td><code>LISTING.DELIST.STATE_CONFLICT</code></td><td>warning</td><td>409</td><td>商品已处于下架/归档状态。</td><td>幂等返回当前状态。</td></tr>
        <tr><td><code>LISTING.ARCHIVE.OPEN_ORDERS</code></td><td>error</td><td>409</td><td>存在未完结订单，不可归档。</td><td>先 <code>delist</code>，待订单完结后归档。</td></tr>
        <tr><td><code>LISTING.QUERY.NOT_FOUND</code></td><td>error</td><td>404</td><td>商品不存在或调用方无权访问。</td><td>校验标识与权限。</td></tr>
        <tr><td><code>LISTING.RATE_LIMITED</code></td><td>warning</td><td>429</td><td>发布/更新频率超过平台限流阈值。</td><td>按 <code>Retry-After</code> 等待后重试；批量场景改用 M3.7.2 批量模式。</td></tr>
      </tbody>
    </table>

    <hr />
    <h2 id="s-m34">M3.4 Scopes（权限范围）</h2>
    <table>
      <thead><tr><th>Scope</th><th>类型</th><th>描述</th><th>授予方</th><th>默认分配</th></tr></thead>
      <tbody>
        <tr><td><code>listing:publish</code></td><td>Action Scope</td><td>发布商品档案。</td><td>Marketplace（入驻通过后）</td><td>Seller 角色</td></tr>
        <tr><td><code>listing:update</code></td><td>Action Scope</td><td>更新商品档案。</td><td>Marketplace</td><td>Seller 角色（仅本方商品）</td></tr>
        <tr><td><code>listing:list</code></td><td>Action Scope</td><td>上架商品。</td><td>Marketplace</td><td>Seller 角色（仅本方商品）</td></tr>
        <tr><td><code>listing:delist</code></td><td>Action Scope</td><td>下架商品。</td><td>Marketplace</td><td>Seller 角色（仅本方商品）</td></tr>
        <tr><td><code>listing:query</code></td><td>Action Scope</td><td>查询商品档案、状态与审核结论。</td><td>Marketplace</td><td>Seller 角色（仅本方商品）</td></tr>
        <tr><td><code>listing:archive</code></td><td>Action Scope</td><td>归档商品。</td><td>Marketplace</td><td>Seller 角色（仅本方商品）</td></tr>
      </tbody>
    </table>
    <p><strong>权限约束：</strong></p>
    <ul>
      <li>全部 Listing 操作 MUST 仅作用于调用方（<code>agent_id</code>）名下的商品；跨商户访问 MUST 返回 <code>LISTING.QUERY.NOT_FOUND</code>（不泄露存在性）。</li>
      <li><code>SUSPENDED_BY_PLATFORM</code> 的进入与解除是 Marketplace 的治理动作，不对应供应商 Scope。</li>
      <li>审核（review）是 Marketplace 内部义务，不是协议 Action；审核结论通过回调事件 <code>utp.listing.review_result</code>（M2.6.1）通知。</li>
    </ul>

    <hr />
    <h2 id="s-m35">M3.5 Guidelines（角色职责指引）</h2>
    <h3 id="s-m351">M3.5.1 Seller 角色职责</h3>
    <table>
      <thead><tr><th>职责</th><th>级别</th><th>说明</th></tr></thead>
      <tbody>
        <tr><td>信息真实准确</td><td>MUST</td><td>商品标题、属性、资质 MUST 真实；虚假信息导致的争议中 ListingSnapshot 将作为对供应商不利的证据。</td></tr>
        <tr><td>结构化发布</td><td>MUST</td><td>MUST 按 Listing Schema 提供结构化字段，MUST NOT 把关键交易条件（价格、交期）只写在描述富文本中。</td></tr>
        <tr><td>价格一致性</td><td>MUST</td><td><code>pricing</code> MUST 与其经 MP3 应答 P2 询盘的报价口径一致（M5.5.1）；<code>pricing_mode ≥ L1</code> 时 MUST 提供 <code>pricing_tiers</code>。</td></tr>
        <tr><td>及时下架</td><td>MUST</td><td>停售、断货长期无法补货、资质失效时 MUST 及时 <code>delist</code>，减少 <code>PURCHASE.CREATE.INVALID_ITEMS</code> 对买方体验的冲击。</td></tr>
        <tr><td>版本自洽</td><td>SHOULD</td><td>重大变更 SHOULD 避开销售高峰；利用 M3.2.4 的"旧版本可售 + 新版本审核"机制平滑切换。</td></tr>
        <tr><td>媒体合规</td><td>SHOULD</td><td>图片/视频资源 SHOULD 使用持久 URI，MUST 拥有合法版权。</td></tr>
      </tbody>
    </table>
    <h3 id="s-m352">M3.5.2 Marketplace 角色职责</h3>
    <table>
      <thead><tr><th>职责</th><th>级别</th><th>说明</th></tr></thead>
      <tbody>
        <tr><td>审核时效</td><td>MUST</td><td>MUST 公示审核 SLA 并在 SLA 内给出结论；驳回 MUST 附结构化原因码（附录 MB 的 <code>REVIEW.*</code> 原因码空间）。</td></tr>
        <tr><td>索引一致性</td><td>MUST</td><td><code>list</code>/<code>delist</code> 生效后，Source 可搜索范围 MUST 在声明的传播时限（SHOULD ≤ 60s）内一致；生效时刻以状态迁移时间戳为准。</td></tr>
        <tr><td>投影保真</td><td>MUST</td><td>Source 返回的商品投影 MUST 来自最新生效版本，MUST NOT 篡改供应商声明的价格与条款。</td></tr>
        <tr><td>快照存档</td><td>MUST</td><td>MUST 存档每个生效版本快照，保存期不低于争议时效期；被订单引用的版本 MUST NOT 删除。</td></tr>
        <tr><td>治理透明</td><td>MUST</td><td>强制下架 MUST 通知供应商，附原因与申诉路径；恢复条件 MUST 可核验。</td></tr>
        <tr><td>限流公示</td><td>SHOULD</td><td>SHOULD 公示发布/更新限流阈值与批量通道规格。</td></tr>
      </tbody>
    </table>

    <hr />
    <h2 id="s-m36">M3.6 Mode-Driven Behavior（模式驱动行为）</h2>
    <table>
      <thead><tr><th>Mode 维度</th><th>对 Listing 的影响</th></tr></thead>
      <tbody>
        <tr><td><code>pricing_mode</code> L0</td><td><code>pricing.unit_price</code> MUST 存在；<code>pricing_tiers</code> MUST NOT 存在。</td></tr>
        <tr><td><code>pricing_mode</code> L1</td><td><code>pricing_tiers</code>（MOQ/MOA 阶梯）MUST 存在，与主规范 PricingTiers 同构。</td></tr>
        <tr><td><code>pricing_mode</code> L2/L3</td><td>MAY 标记 <code>negotiable: true</code>；L3 竞价商品 MUST 提供 <code>bid_starting_price</code> 与 <code>bid_deadline</code>。</td></tr>
        <tr><td><code>fulfillment_structure</code> L1+</td><td><code>fulfillment_terms</code> MUST 声明 <code>ships_from</code>、<code>leadtime_days</code>；L2 的阶段划分、前置条件和完成条件 MUST 在交易条款锁定时确定。Listing 已知相关条件时 MAY 预告，但不得仅因 L2 自动推导可分批。</td></tr>
        <tr><td><code>relationship_mode</code> L2+</td><td>MAY 发布仅对框架协议客户可见的协议价商品（<code>visibility: "framework_only"</code>）。</td></tr>
        <tr><td><code>compliance_level</code> L1+</td><td><code>compliance_refs</code> MUST 存在且审核通过；L2+（跨境）MUST 含原产地与进出口许可引用；L3 MUST 附审计报告引用。</td></tr>
      </tbody>
    </table>
    <p><strong>搜索可见性规则（Mode 过滤）：</strong>商品的有效 Mode 范围 = 商户 Profile 中对应原语的 <code>supported_mode_range</code>（<code>utp.roles.seller.primitives</code>，主规范 3.3.2） ∩ 商品 <code>mode_constraints</code>（缺省为前者）。Marketplace 的 P1 Source MUST 按会话 <code>ModeConfiguration</code> 过滤：会话 Mode 任一维度不在商品有效范围内的商品，MUST NOT 出现在携带任意 <code>filters</code> 的 <code>search</code> 结果中，对其 <code>lookup</code> MUST 返回 <code>SOURCE.MODE.UNSUPPORTED</code>（主规范 11.3.1）。该规则将主规范的运行时错误前置为搜索期过滤，消除“能搜到却无法按该模式成交”的供需错配（闭环不变式 6，见 <a href="../../overview.html#s-m16">M1.6</a>）。</p>

    <hr />
    <h2 id="s-m37">M3.7 Operations（操作定义）</h2>
    <p>Listing 的核心操作为 <code>publish</code>、<code>update</code>、<code>list</code>、<code>delist</code>、<code>query</code>、<code>archive</code>，复用主规范 <a href="/documentation/specification/protocol-core/primitive-framework.html#s-1023-action-definition-format">10.2.3 操作定义格式</a>。</p>
    <h3 id="s-m371">M3.7.1 Listing 操作矩阵</h3>
    <table>
      <thead><tr><th>操作</th><th>适用状态</th><th>状态影响</th><th><code>valid_next_actions</code></th><th>关键约束</th></tr></thead>
      <tbody>
        <tr><td><code>utp.listing.publish</code></td><td>（新建）</td><td>创建档案并进入 <code>PENDING_REVIEW</code>；<code>auto_list: true</code> 时审核通过后自动 <code>LISTED</code></td><td><code>query</code></td><td>Seller；MUST 通过 Schema 校验与类目资质校验；MUST 携带 Seller JWS 签名覆盖 <code>version_hash</code>；MAY 携带 <code>source_materials</code>（AI 解析产出的字段与显式提交字段冲突时，显式字段 MUST 优先）。</td></tr>
        <tr><td><code>utp.listing.update</code></td><td><code>REJECTED</code>, <code>PUBLISHED</code>, <code>LISTED</code>, <code>DELISTED</code></td><td>minor：即时生效新版本；major：新版本进入 <code>PENDING_REVIEW</code>，旧版本继续可售</td><td><code>query</code>, <code>list</code>, <code>delist</code></td><td>Seller；MUST 携带 <code>expected_version</code> 乐观锁；MUST NOT 修改库存数量。</td></tr>
        <tr><td><code>utp.listing.list</code></td><td><code>PUBLISHED</code>, <code>DELISTED</code></td><td>进入 <code>LISTED</code>，纳入 Source 可搜索范围</td><td><code>update</code>, <code>delist</code>, <code>query</code>, <code>utp.inventory.set</code></td><td>Seller；上架前 SHOULD 已通过 <code>utp.inventory.set</code> 设置可售数量，否则商品可搜索但不可订购。</td></tr>
        <tr><td><code>utp.listing.delist</code></td><td><code>LISTED</code></td><td>进入 <code>DELISTED</code>，原子退出可搜索/可订购范围</td><td><code>list</code>, <code>update</code>, <code>query</code>, <code>archive</code></td><td>Seller；已成立订单不受影响；幂等。</td></tr>
        <tr><td><code>utp.listing.query</code></td><td>任意</td><td>无状态影响</td><td>当前状态下可执行的动作</td><td>Seller；支持按 <code>listing_id</code> 单查、按状态/类目/时间的列表查询（分页）及按 <code>batch_id</code> 轮询批量任务逐条结果（M3.7.2）。</td></tr>
        <tr><td><code>utp.listing.archive</code></td><td><code>PUBLISHED</code>, <code>DELISTED</code>, <code>REJECTED</code></td><td>进入 <code>ARCHIVED</code> 终态</td><td><code>query</code></td><td>Seller；存在未完结订单 MUST 拒绝；不可逆。</td></tr>
        <tr><td><code>utp.listing.batch</code></td><td>同 <code>publish</code>/<code>update</code></td><td>逐条同单条操作</td><td><code>query</code>（按 <code>batch_id</code>）</td><td>Seller；批量提交通道，单批 ≤ 500 条、逐条独立成败，MAY 异步；规则见 M3.7.2。</td></tr>
      </tbody>
    </table>
    <h3 id="s-m372">M3.7.2 批量模式（Batch Mode）</h3>
    <p>面向 ERP 全量/增量同步场景（<a href="../../erp-bridge.html#s-m94">M9.4</a>），<code>publish</code> 与 <code>update</code> MUST 支持批量提交：</p>
    <ul>
      <li>批量请求为条目数组（单批 MUST ≤ 500 条），整批共享一个 <code>idempotency_key</code>，逐条独立校验、独立成败。</li>
      <li>响应 MUST 逐条返回 <code>{index, listing_id | error}</code>；部分失败不影响其余条目（部分成功语义）。</li>
      <li>批量任务 MAY 异步执行：响应返回 <code>batch_id</code>，供应商以 <code>query</code>（<code>batch_id</code> 维度）轮询结果；推送模式下以回调通知完成。</li>
    </ul>

    <hr />
    <h2 id="s-m38">M3.8 Transport Bindings（传输绑定）</h2>
    <h3 id="s-m381">M3.8.1 REST Binding</h3>
    <p>供应商侧 REST 端点统一使用 <code>/utp/m/v1/</code> 前缀，与买方侧 <code>/utp/v1/</code> 区分。</p>
    <table>
      <thead><tr><th>操作</th><th>HTTP 方法</th><th>端点</th><th>Content-Type</th></tr></thead>
      <tbody>
        <tr><td><code>utp.listing.publish</code></td><td><code>POST</code></td><td><code>/utp/m/v1/listings</code></td><td><code>application/json</code></td></tr>
        <tr><td><code>utp.listing.update</code></td><td><code>PATCH</code></td><td><code>/utp/m/v1/listings/{listing_id}</code></td><td><code>application/json</code></td></tr>
        <tr><td><code>utp.listing.list</code></td><td><code>POST</code></td><td><code>/utp/m/v1/listings/{listing_id}/list</code></td><td><code>application/json</code></td></tr>
        <tr><td><code>utp.listing.delist</code></td><td><code>POST</code></td><td><code>/utp/m/v1/listings/{listing_id}/delist</code></td><td><code>application/json</code></td></tr>
        <tr><td><code>utp.listing.query</code></td><td><code>GET</code></td><td><code>/utp/m/v1/listings/{listing_id}</code> 或 <code>/utp/m/v1/listings?status=&amp;category=&amp;page=</code></td><td>—</td></tr>
        <tr><td><code>utp.listing.archive</code></td><td><code>POST</code></td><td><code>/utp/m/v1/listings/{listing_id}/archive</code></td><td><code>application/json</code></td></tr>
        <tr><td>批量 publish/update</td><td><code>POST</code></td><td><code>/utp/m/v1/listings/batch</code></td><td><code>application/json</code></td></tr>
      </tbody>
    </table>
    <p><strong>REST 特殊规则：</strong>列表查询 MUST 支持分页（<code>X-Total-Count</code> 等响应头，同主规范 11.8.1）；全部响应 MUST 包含 <code>X-UTP-Listing-Status</code> 头部标识当前商品状态。</p>
    <h3 id="s-m382">M3.8.2 MCP / A2A Binding</h3>
    <table>
      <thead><tr><th>操作</th><th>MCP Tool Name</th><th>A2A Task Name</th></tr></thead>
      <tbody>
        <tr><td><code>publish</code></td><td><code>utp_listing_publish</code></td><td><code>utp:listing:publish</code></td></tr>
        <tr><td><code>update</code></td><td><code>utp_listing_update</code></td><td><code>utp:listing:update</code></td></tr>
        <tr><td><code>list</code></td><td><code>utp_listing_list</code></td><td><code>utp:listing:list</code></td></tr>
        <tr><td><code>delist</code></td><td><code>utp_listing_delist</code></td><td><code>utp:listing:delist</code></td></tr>
        <tr><td><code>query</code></td><td><code>utp_listing_query</code></td><td><code>utp:listing:query</code></td></tr>
        <tr><td><code>archive</code></td><td><code>utp_listing_archive</code></td><td><code>utp:listing:archive</code></td></tr>
      </tbody>
    </table>
    <p>批量模式在 A2A 下 MUST 使用异步 Task，通过 Artifact 返回逐条结果。</p>

    <hr />
    <h2 id="s-m39">M3.9 Entities（实体定义）</h2>
    <h3 id="s-m391">M3.9.1 Listing</h3>
    <table>
      <thead><tr><th>字段名</th><th>类型</th><th>必填</th><th>描述</th></tr></thead>
      <tbody>
        <tr><td><code>listing_id</code></td><td>string</td><td>是</td><td>商品全局唯一标识，由 Marketplace 在 <code>publish</code> 时生成。买方侧 P1 Source 的 <code>item_id</code> 与此同值。</td></tr>
        <tr><td><code>merchant_id</code></td><td>string</td><td>是</td><td>所属供应商在平台域内的标识（M2.4.2）。</td></tr>
        <tr><td><code>status</code></td><td>enum</td><td>是</td><td>M3.2.2 定义的状态枚举。</td></tr>
        <tr><td><code>version</code></td><td>integer</td><td>是</td><td>版本号，单调递增。</td></tr>
        <tr><td><code>version_hash</code></td><td>string</td><td>是</td><td>当前版本规范化 JSON 的 SHA256 哈希。</td></tr>
        <tr><td><code>type</code></td><td>enum</td><td>是</td><td><code>goods</code>（实物）/ <code>service</code>（服务）/ <code>digital</code>（虚拟）。</td></tr>
        <tr><td><code>title</code></td><td>string</td><td>是</td><td>商品标题。</td></tr>
        <tr><td><code>category</code></td><td>string</td><td>是</td><td>平台类目标识。</td></tr>
        <tr><td><code>description</code></td><td>string</td><td>否</td><td>商品描述（富文本引用或纯文本）。</td></tr>
        <tr><td><code>attributes</code></td><td>object</td><td>否</td><td>类目属性键值对（品牌、型号、材质等），键空间由类目 Schema 定义。</td></tr>
        <tr><td><code>skus</code></td><td>ListingSku[]</td><td>是</td><td>SKU 列表，MUST 至少一条（M3.9.2）。</td></tr>
        <tr><td><code>pricing</code></td><td>ListingPricing</td><td>是</td><td>定价结构（M3.9.3）。</td></tr>
        <tr><td><code>fulfillment_terms</code></td><td>FulfillmentTerms</td><td>是</td><td>履约条款（M3.9.4）。</td></tr>
        <tr><td><code>trade_methods</code></td><td>array</td><td>是</td><td>支持的 Trade Method 列表，结构同主规范（<a href="/documentation/specification/primitives/purchase/index.html#s-139-entities">13.9</a> 引用的 TradeMethod）。</td></tr>
        <tr><td><code>media</code></td><td>ListingMedia[]</td><td>否</td><td>图片/视频资源（M3.9.5）。</td></tr>
        <tr><td><code>compliance_refs</code></td><td>array</td><td>否</td><td>资质文件引用列表（<code>credential_id</code> + 类型）；<code>compliance_level ≥ L1</code> 时必填。</td></tr>
        <tr><td><code>visibility</code></td><td>enum</td><td>否</td><td><code>public</code>（默认）/ <code>framework_only</code>（仅框架协议客户可见）。</td></tr>
        <tr><td><code>mode_constraints</code></td><td>object</td><td>否</td><td>商品级 Mode 能力收窄声明：六个核心维度各为 Level 数组，MUST 为商户 Profile 对应原语 <code>supported_mode_range</code> 对应维度的非空子集；缺省继承 Profile 全量范围。驱动 Source 搜索可见性过滤（M3.6）。</td></tr>
        <tr><td><code>auto_list</code></td><td>boolean</td><td>否</td><td>审核通过后是否自动上架，默认 <code>false</code>。</td></tr>
        <tr><td><code>seller_signature</code></td><td>string</td><td>是</td><td>Seller ES256 签名（JWS），覆盖 <code>version_hash</code>。</td></tr>
        <tr><td><code>created_at</code> / <code>updated_at</code></td><td>ISO-8601</td><td>是</td><td>创建/最近生效变更时间。</td></tr>
      </tbody>
    </table>
    <blockquote><p>Listing MUST NOT 含任何库存数量字段。库存见 <a href="../../primitives/inventory/index.html#s-m49">M4.9 InventoryRecord</a>。</p></blockquote>
    <h3 id="s-m392">M3.9.2 ListingSku</h3>
    <table>
      <thead><tr><th>字段名</th><th>类型</th><th>必填</th><th>描述</th></tr></thead>
      <tbody>
        <tr><td><code>sku_id</code></td><td>string</td><td>是</td><td>SKU 标识，商品内唯一。买方侧 P1/P3 的 <code>sku_id</code> 与此同值。</td></tr>
        <tr><td><code>spec</code></td><td>object</td><td>是</td><td>规格键值对（如 <code>{"color": "黑色", "size": "L"}</code>）。</td></tr>
        <tr><td><code>price_offset</code></td><td>Money</td><td>否</td><td>相对 <code>pricing.unit_price</code> 的差价；缺省为零差价。</td></tr>
        <tr><td><code>barcode</code></td><td>string</td><td>否</td><td>商品条码（EAN/UPC）。</td></tr>
        <tr><td><code>external_ref</code></td><td>string</td><td>否</td><td>供应商内部编码（ERP 物料号），用于 M9 ID 映射；平台 MUST 原样保存并在订单路由中回传。</td></tr>
        <tr><td><code>status</code></td><td>enum</td><td>是</td><td><code>active</code> / <code>inactive</code>（SKU 级停售，不影响其它 SKU）。</td></tr>
      </tbody>
    </table>
    <h3 id="s-m393">M3.9.3 ListingPricing</h3>
    <table>
      <thead><tr><th>字段名</th><th>类型</th><th>必填</th><th>描述</th></tr></thead>
      <tbody>
        <tr><td><code>pricing_mode</code></td><td>enum</td><td>是</td><td>本商品支持的最低定价模式：<code>L0</code>—<code>L3</code>，MUST 落在会话 Mode 协商范围内。</td></tr>
        <tr><td><code>unit_price</code></td><td>Money</td><td>条件</td><td>固定单价；<code>pricing_mode == L0</code> 时必填。Money 结构同主规范 <a href="/documentation/specification/schemas/index.html#s-common-money">25.2 Money</a>。</td></tr>
        <tr><td><code>pricing_tiers</code></td><td>array</td><td>条件</td><td>阶梯价数组 <code>{min_quantity, unit_price}</code>；<code>pricing_mode ≥ L1</code> 时必填，与主规范 PricingTiers 同构。</td></tr>
        <tr><td><code>negotiable</code></td><td>boolean</td><td>否</td><td>是否可议价（对应 <code>pricing_mode ≥ L2</code>）。</td></tr>
        <tr><td><code>bid_starting_price</code> / <code>bid_deadline</code></td><td>Money / ISO-8601</td><td>条件</td><td>竞价起拍价与截止时间；<code>pricing_mode == L3</code> 时必填。</td></tr>
        <tr><td><code>currency</code></td><td>string</td><td>是</td><td>ISO 4217 币种，商品内全部价格 MUST 同币种。</td></tr>
      </tbody>
    </table>
    <h3 id="s-m394">M3.9.4 FulfillmentTerms</h3>
    <table>
      <thead><tr><th>字段名</th><th>类型</th><th>必填</th><th>描述</th></tr></thead>
      <tbody>
        <tr><td><code>ships_from</code></td><td>string</td><td>是</td><td>发货地。</td></tr>
        <tr><td><code>leadtime_days</code></td><td>integer</td><td>是</td><td>标准备货交期（自然日）。MP4 <code>amend_leadtime</code> 的变更基准。</td></tr>
        <tr><td><code>shipping_fee_policy</code></td><td>object</td><td>是</td><td>运费策略（<code>type</code>: <code>free</code>/<code>flat</code>/<code>threshold_free</code>，及金额参数）。</td></tr>
        <tr><td><code>return_policy</code></td><td>string</td><td>是</td><td>退换货政策声明。</td></tr>
        <tr><td><code>splittable</code></td><td>boolean</td><td>否</td><td>是否支持分批发货，默认 <code>false</code>；MP5 <code>split</code> 的前提。</td></tr>
        <tr><td><code>moq</code></td><td>integer</td><td>否</td><td>最小起订量；P3 校验 <code>PURCHASE.CREATE.INVALID_ITEMS</code>（数量不满足 MOQ）的依据。</td></tr>
      </tbody>
    </table>
    <h3 id="s-m395">M3.9.5 ListingMedia 与 ListingSnapshot</h3>
    <p><code>ListingMedia</code> 记录 <code>media_id</code>、<code>type</code>（<code>image</code>/<code>video</code>）、<code>uri</code>、<code>sort_order</code>。<code>ListingSnapshot</code> 是版本快照存档实体，包含 <code>listing_id</code>、<code>version</code>、<code>version_hash</code>、完整 Listing 规范化 JSON、<code>effective_from</code>/<code>effective_to</code> 与 <code>seller_signature</code>；被订单条款快照引用时 MUST 可按 <code>listing_id + version_hash</code> 检索，并可纳入 Evidence Bundle。</p>
    <h3 id="s-m396">M3.9.6 与买方侧 Source 投影的字段对齐</h3>
    <table>
      <thead><tr><th>买方侧字段（P1 Source lookup）</th><th>供应商侧来源（本章）</th></tr></thead>
      <tbody>
        <tr><td><code>item.item_id</code></td><td><code>listing.listing_id</code></td></tr>
        <tr><td><code>item.title</code> / <code>specifications</code></td><td><code>listing.title</code> / <code>listing.attributes</code></td></tr>
        <tr><td><code>item.skus[]</code>（<code>sku_id</code>/<code>spec</code>/<code>price</code>）</td><td><code>listing.skus[]</code>（价格 = <code>unit_price + price_offset</code>；<code>stock</code> 来自 MP2 <code>available</code> 快照）</td></tr>
        <tr><td><code>item.pricing</code>（含 <code>tiered_pricing</code>）</td><td><code>listing.pricing</code></td></tr>
        <tr><td><code>item.fulfillment</code></td><td><code>listing.fulfillment_terms</code></td></tr>
        <tr><td><code>item.trade_methods</code></td><td><code>listing.trade_methods</code></td></tr>
        <tr><td><code>item.seller</code>（资质摘要）</td><td>M2.5 审核通过的 SupplierCredentials</td></tr>
      </tbody>
    </table>
    <h3 id="s-m397">M3.9.7 SourceMaterials（AI 辅助录入素材）</h3>
    <p>面向研发能力较弱或商品资料非结构化的供应商，<code>publish</code> 请求 MAY 携带原始素材，由 Marketplace 的解析能力生成结构化商品草稿。本实体<strong>仅存在于请求侧</strong>：解析产出 MUST 落为标准 Listing 字段后才能生效，素材本身 MUST NOT 作为商品语义存储或进入买方投影；解析失败返回 <code>LISTING.PUBLISH.INGEST_FAILED</code>（M3.3）。</p>
    <table>
      <thead><tr><th>字段名</th><th>类型</th><th>必填</th><th>描述</th></tr></thead>
      <tbody>
        <tr><td><code>image_urls</code></td><td>array</td><td>否</td><td>产品原始图片 URI 列表；用于自动预测类目、属性与规格。</td></tr>
        <tr><td><code>product_urls</code></td><td>array</td><td>否</td><td>商品原始链接列表；用于自动解析链接内商品信息。</td></tr>
        <tr><td><code>spreadsheet_url</code></td><td>string</td><td>否</td><td>供应商自维护的货品信息表格 URI（Excel/CSV）。</td></tr>
      </tbody>
    </table>
    <p>约束：三个字段 MUST 至少提供其一；解析产出与请求中显式提交的字段冲突时，显式字段 MUST 优先；解析置信度信息 SHOULD 随响应返回供供应商/Agent 复核（对应 M10.5 控制点：价格类解析结果 SHOULD 经确认后生效）。</p>

    <hr />
    <h2 id="s-m310">M3.10 Use Case Walkthroughs（用例演练）</h2>
    <h3 id="s-m3101">M3.10.1 发布并上架一个多 SKU 商品</h3>
<pre class="highlight"><code class="language-json">// 请求：utp.listing.publish
POST /utp/m/v1/listings
{
  "session_id": "utp-session-m-20260722-s01",
  "idempotency_key": "idem-pub-20260722-001",
  "listing": {
    "type": "goods",
    "title": "ProSound X3 主动降噪蓝牙耳机",
    "category": "electronics/audio",
    "attributes": { "brand": "ProSound", "model": "X3", "bluetooth_version": "5.3" },
    "skus": [
      { "sku_id": "sku-X3-BLK", "spec": { "color": "黑色" }, "external_ref": "ERP-MAT-004512", "status": "active" },
      { "sku_id": "sku-X3-WHT", "spec": { "color": "白色" }, "external_ref": "ERP-MAT-004513", "status": "active" }
    ],
    "pricing": {
      "pricing_mode": "L1",
      "currency": "CNY",
      "pricing_tiers": [
        { "min_quantity": 1,   "unit_price": { "amount": "299.00", "currency": "CNY" } },
        { "min_quantity": 100, "unit_price": { "amount": "268.00", "currency": "CNY" } }
      ]
    },
    "fulfillment_terms": {
      "ships_from": "上海",
      "leadtime_days": 3,
      "shipping_fee_policy": { "type": "threshold_free", "threshold": { "amount": "99.00", "currency": "CNY" } },
      "return_policy": "7天无理由退换",
      "splittable": true,
      "moq": 1
    },
    "trade_methods": [
      { "method_id": "tm-fullpay-alipay", "type": "full_payment", "channel": "alipay" }
    ],
    "auto_list": true
  },
  "seller_signature": "eyJhbGciOiJFUzI1NiJ9..."
}

// 响应
{
  "listing_id": "item-BT-NC-001",
  "status": "PENDING_REVIEW",
  "version": 1,
  "version_hash": "sha256:9f2c4e...",
  "valid_next_actions": ["utp.listing.query"]
}

// 审核通过后回调：utp.listing.review_result（auto_list 生效，直接 LISTED）
{
  "event": "utp.listing.review_result",
  "listing_id": "item-BT-NC-001",
  "result": "APPROVED",
  "status": "LISTED",
  "effective_at": "2026-07-22T10:30:00Z"
}
</code></pre>
    <h3 id="s-m3102">M3.10.2 下架与闭环验证</h3>
<pre class="highlight"><code>1. Seller: POST /utp/m/v1/listings/item-BT-NC-001/delist  → status = DELISTED
2. Buyer:  GET  /utp/v1/source/items/item-BT-NC-001       → 404 SOURCE.LOOKUP.ITEM_NOT_FOUND
3. Buyer:  POST /utp/purchase/create（含该 item）          → 400 PURCHASE.CREATE.INVALID_ITEMS
4. 既有订单（下架前 PURCHASED）：MP4/MP5 义务不变，继续履行
</code></pre>
