---
title: M5 MP3 订单受理原语
section: merchant
owner: merchant-team
status: review
version: 2026-07-29
format: html
---

<h1 id="s-m5">M5 · MP3 订单受理原语（Acceptance）</h1>
    <h2 id="s-m5-toc">目录</h2>
    <ul>
      <li><a href="#s-m51">M5.1 Overview（概述）</a></li>
      <li><a href="#s-m52">M5.2 Lifecycle / State Machine（生命周期 / 状态机）</a></li>
      <li><a href="#s-m53">M5.3 Error Handling（错误处理）</a></li>
      <li><a href="#s-m54">M5.4 Scopes（权限范围）</a></li>
      <li><a href="#s-m55">M5.5 Guidelines（角色职责指引）</a></li>
      <li><a href="#s-m56">M5.6 与 P3 Purchase 签名流程的衔接</a></li>
      <li><a href="#s-m57">M5.7 订单路由（Order Routing）</a></li>
      <li><a href="#s-m58">M5.8 Mode-Driven Behavior（模式驱动行为）</a></li>
      <li><a href="#s-m59">M5.9 Operations 与 Transport Bindings</a></li>
      <li><a href="#s-m510">M5.10 Entities（实体定义）</a></li>
      <li><a href="#s-m511a2">M5.11 Use Case Walkthroughs（用例演练）</a></li>
    </ul>
    <hr />
    <h2 id="s-m5-identity">原语身份</h2>
<pre class="highlight"><code>primitive_id:   utp.acceptance
version:        2026-07-01
initiator_role: Seller
handler_role:   Marketplace
intent:         供应商对路由到达的订购请求给出可核验的受理结论（接受/拒绝/挂起/交期变更）
state_delta:    order_routed → acceptance_record（资源作用域）
actions:        accept, reject, hold, amend_leadtime, query, list
compensation:   受理超时 → 按 acceptance_policy 自动处置并通知双方
service:        dev.utp.merchant
</code></pre>

    <hr />
    <h2 id="s-m51">M5.1 Overview（概述）</h2>
    <h3 id="s-m511a">M5.1.1 意图</h3>
    <p>Acceptance 是 UTP-M 第三个供应商原语（MP3），其意图是让供应商对买方发起的订购给出<strong>显式、签名、可审计的受理结论</strong>。主规范 P3 将卖方接受抽象为"卖方完成自身承诺处理"（<a href="/documentation/specification/primitives/purchase/index.html#s-1323">13.2.3</a>），并要求卖方在 complete 前"确认可行性"（<a href="/documentation/specification/primitives/purchase/index.html#s-1352-seller">13.5.2</a>），但未定义承诺处理的产生机制，拒绝只能以错误码被动表达。MP3 将这一留白定义为显式协议动作，使供应商 Agent、ERP 审批流和人工后台都能以统一接口参与接单决策。</p>
    <h3 id="s-m512">M5.1.2 关键设计原则</h3>
    <ul>
      <li><strong>MP3 不替代 P3，而是喂给 P3。</strong>订购成立的唯一路径仍然是主规范 <code>purchase.complete</code> 的原子迁移（<code>SIGNING → PURCHASED</code>）；MP3 <code>accept</code> 即 13.2.3 所要求的"卖方承诺处理"在平台托管拓扑下的规范化实现，其产出（卖方 ES256 签名，覆盖 <code>terms_hash</code>）是承诺处理完成的可审计证据。MP3 <code>reject</code> 则触发 P3 既有补偿链（释放库存 → <code>CANCELLED</code>）。</li>
      <li><strong>受理结论是不可撤销承诺。</strong><code>accept</code> 一经提交，供应商即受条款约束（与买方签名对称）；反悔只能走 P6 Resolve。</li>
      <li><strong>超时必有确定性处置。</strong>每笔路由订单 MUST 关联受理时限与超时策略（自动接受 / 自动拒绝），杜绝订单悬挂。</li>
    </ul>
    <h3 id="s-m513">M5.1.3 范围</h3>
    <ul>
      <li><strong>接受（accept）</strong>：确认库存、交期、Trade Method 可执行，提交卖方签名。</li>
      <li><strong>拒绝（reject）</strong>：以结构化原因码拒绝（库存不足、区域限售、风控、价格失效等）。</li>
      <li><strong>挂起（hold）</strong>：在受理时限内暂缓（等待 ERP 审批/人工确认），MUST 声明预计答复时间。</li>
      <li><strong>交期变更申报（amend_leadtime）</strong>：接受订单但申报与 Listing 承诺不同的交期，交买方确认。</li>
      <li><strong>查询（query / list）</strong>：待受理与历史受理记录检索。</li>
    </ul>
    <p>MP3 不覆盖：订购草案的创建与修改（Buyer 专属，主规范 13.4）、价格协商（P2 Negotiate）、发货（MP4）。</p>
    <h3 id="s-m514">M5.1.4 前置条件</h3>
    <table>
      <thead><tr><th>条件</th><th>必需？</th><th>说明</th></tr></thead>
      <tbody>
        <tr><td>存在有效的订单路由通知（OrderRouting）</td><td>MUST</td><td>Marketplace 已将买方订购草案/签名请求路由给供应商（M5.7）。</td></tr>
        <tr><td><code>purchase.status ∈ {DRAFT, SIGNING}</code></td><td>MUST</td><td>受理窗口仅存在于订购成立之前。</td></tr>
        <tr><td><code>merchant.status ∈ {ACTIVE, RESTRICTED}</code></td><td>MUST</td><td><code>RESTRICTED</code> 商户 MUST 仍可履行既有路由订单的受理义务。</td></tr>
        <tr><td><code>acceptance.deadline > now()</code></td><td>MUST</td><td>受理时限内。</td></tr>
      </tbody>
    </table>
    <h3 id="s-m515">M5.1.5 后置条件与语义契约</h3>
<pre class="highlight"><code class="language-json">{
  "primitive": "utp.acceptance",
  "postconditions": [
    "acceptance.record_id != null",
    "acceptance.conclusion ∈ {ACCEPTED, REJECTED, LEADTIME_AMENDED}",
    "conclusion == 'ACCEPTED' → seller_signature 覆盖 purchase.terms_hash",
    "conclusion == 'REJECTED' → P3 补偿链已触发（释放 hold → CANCELLED）",
    "acceptance_record ∈ evidence_bundle"
  ],
  "invariants": [
    "同一 purchase_id 至多存在一个终局受理结论（ACCEPTED/REJECTED）",
    "accept 后条款对供应商不可单方面撤回",
    "受理结论 MUST 在 deadline 前给出，否则按 timeout_policy 自动处置"
  ],
  "side_effects": [
    "ACCEPTED：卖方签名注入 purchase.complete 流程，库存 hold → LOCKED（M4.7）",
    "REJECTED：hold → RELEASED，买方收到结构化拒绝通知",
    "LEADTIME_AMENDED：买方收到确认请求，确认后按新交期成立"
  ],
  "compensation": {
    "on_timeout": "按 acceptance_policy.on_timeout 执行 auto_accept 或 auto_reject，推送 utp.acceptance.expired",
    "on_amend_rejected_by_buyer": "视同 REJECTED，走拒绝补偿路径"
  }
}
</code></pre>

    <hr />
    <h2 id="s-m52">M5.2 Lifecycle / State Machine（生命周期 / 状态机）</h2>
    <h3 id="s-m521">M5.2.1 受理任务状态机</h3>
<div class="diagram"><img src="/documentation/assets/diagrams/m-acceptance-state-machine.svg" alt="受理任务状态机：PENDING_ACCEPT/ON_HOLD/AMEND_PROPOSED 收敛至 ACCEPTED/REJECTED，超时按 timeout_policy 兜底" style="max-width: 100%; height: auto;"></div>
    <h3 id="s-m522">M5.2.2 状态定义与迁移规则</h3>
    <table>
      <thead><tr><th>状态</th><th>含义</th><th>进入条件</th><th>允许的操作</th></tr></thead>
      <tbody>
        <tr><td><code>PENDING_ACCEPT</code></td><td>待受理</td><td>订单路由送达</td><td><code>accept</code>, <code>reject</code>, <code>hold</code>, <code>amend_leadtime</code>, <code>query</code></td></tr>
        <tr><td><code>ON_HOLD</code></td><td>供应商挂起（内部审批中）</td><td><code>hold</code> 成功执行</td><td><code>accept</code>, <code>reject</code>, <code>amend_leadtime</code>, <code>query</code>（时限不因挂起延长）</td></tr>
        <tr><td><code>AMEND_PROPOSED</code></td><td>交期变更待买方确认</td><td><code>amend_leadtime</code> 成功执行</td><td><code>query</code>；等待买方确认/拒绝或超时</td></tr>
        <tr><td><code>ACCEPTED</code></td><td>已接受（终态）</td><td><code>accept</code> 签名验证通过；或买方确认交期变更；或超时策略 auto_accept</td><td><code>query</code>；衔接 <code>purchase.complete</code>（M5.6）</td></tr>
        <tr><td><code>REJECTED</code></td><td>已拒绝（终态）</td><td><code>reject</code>；或买方拒绝交期变更；或超时策略 auto_reject</td><td><code>query</code>（只读）</td></tr>
      </tbody>
    </table>
    <p><strong>确定性约束：</strong>终态到达后任何写操作 MUST 返回 <code>ACCEPTANCE.STATE_CONFLICT</code>（幂等重放同一 <code>idempotency_key</code> 除外）。<code>deadline</code> 由订单路由时的 Mode 超时配置决定（主规范 <a href="/documentation/specification/protocol-core/transport-communication.html#s-424">4.2.4</a> Mode 协商确定的超时配置），挂起不延长时限；延时需求 MUST 走 <code>amend_leadtime</code> 或买方侧 HAI 超时扩展。</p>

    <hr />
    <h2 id="s-m53">M5.3 Error Handling（错误处理）</h2>
    <table>
      <thead><tr><th>错误码</th><th>严重级别</th><th>HTTP 映射</th><th>描述</th><th>建议处理</th></tr></thead>
      <tbody>
        <tr><td><code>ACCEPTANCE.NOT_FOUND</code></td><td>error</td><td>404</td><td>受理任务不存在或不属于调用方。</td><td>以 <code>list</code> 核对待受理队列。</td></tr>
        <tr><td><code>ACCEPTANCE.EXPIRED</code></td><td>error</td><td>410</td><td>受理时限已过，已按超时策略自动处置。</td><td><code>query</code> 查看自动处置结论。</td></tr>
        <tr><td><code>ACCEPTANCE.STATE_CONFLICT</code></td><td>warning</td><td>409</td><td>受理任务已达终态。</td><td>幂等返回既有结论。</td></tr>
        <tr><td><code>ACCEPTANCE.SIGNATURE_INVALID</code></td><td>error</td><td>400</td><td><code>accept</code> 携带的卖方签名无效或未覆盖 <code>terms_hash</code>。</td><td>用正确密钥重签（同主规范 <code>PURCHASE.COMPLETE.SIGNATURE_INVALID</code> 语义）。</td></tr>
        <tr><td><code>ACCEPTANCE.INVENTORY_INSUFFICIENT</code></td><td>error</td><td>409</td><td><code>accept</code> 时最终库存校验失败。</td><td>拒绝或先补货；对应 hold 已失效需重路由。</td></tr>
        <tr><td><code>ACCEPTANCE.REJECT.REASON_REQUIRED</code></td><td>error</td><td>400</td><td><code>reject</code> 缺少结构化原因码。</td><td>按 M5.10.2 原因码枚举补充。</td></tr>
        <tr><td><code>ACCEPTANCE.AMEND.OUT_OF_RANGE</code></td><td>error</td><td>422</td><td>申报交期超出平台允许的变更幅度。</td><td>调整交期或直接 <code>reject</code>。</td></tr>
        <tr><td><code>ACCEPTANCE.HOLD.LIMIT_EXCEEDED</code></td><td>error</td><td>429</td><td>同一订单重复挂起超过上限（MUST ≤ 1 次）。</td><td>在时限内给出终局结论。</td></tr>
      </tbody>
    </table>

    <hr />
    <h2 id="s-m54">M5.4 Scopes（权限范围）</h2>
    <table>
      <thead><tr><th>Scope</th><th>类型</th><th>描述</th><th>授予方</th><th>默认分配</th></tr></thead>
      <tbody>
        <tr><td><code>acceptance:accept</code></td><td>Action Scope</td><td>接受订单并提交卖方签名。</td><td>Marketplace</td><td>Seller 角色（仅本方路由订单）</td></tr>
        <tr><td><code>acceptance:reject</code></td><td>Action Scope</td><td>拒绝订单。</td><td>Marketplace</td><td>Seller 角色</td></tr>
        <tr><td><code>acceptance:hold</code></td><td>Action Scope</td><td>挂起待内部审批。</td><td>Marketplace</td><td>Seller 角色</td></tr>
        <tr><td><code>acceptance:amend</code></td><td>Action Scope</td><td>申报交期变更。</td><td>Marketplace</td><td>Seller 角色</td></tr>
        <tr><td><code>acceptance:query</code></td><td>Action Scope</td><td>查询受理任务与历史结论。</td><td>Marketplace</td><td>Seller 角色</td></tr>
      </tbody>
    </table>
    <p><strong>约束：</strong><code>accept</code> 的签名主体 MUST 是 Seller 的 Profile 公钥对应私钥。Merchant Agent 代签时 MUST 满足 M9.4 的授权链要求（Agent 持有覆盖 <code>acceptance:accept</code> 的有效授权）。</p>

    <hr />
    <h2 id="s-m55">M5.5 Guidelines（角色职责指引）</h2>
    <h3 id="s-m551">M5.5.1 Seller 角色职责</h3>
    <table>
      <thead><tr><th>职责</th><th>级别</th><th>说明</th></tr></thead>
      <tbody>
        <tr><td>时限内答复</td><td>MUST</td><td>MUST 在 <code>deadline</code> 前给出终局结论；依赖超时自动处置 SHOULD 仅作为兜底。</td></tr>
        <tr><td>接受前核验</td><td>MUST</td><td><code>accept</code> 前 MUST 确认库存充足、交期可行、Trade Method 可执行（对应主规范 13.5.2"确认可行性"）。</td></tr>
        <tr><td>结构化拒绝</td><td>MUST</td><td><code>reject</code> MUST 携带 M5.10.2 原因码；SHOULD 附替代建议（如可供替代 SKU、预计到货时间）。</td></tr>
        <tr><td>低拒单率</td><td>SHOULD</td><td>SHOULD 通过 MP2 及时同步库存降低拒单率；持续高拒单率是平台治理依据。</td></tr>
        <tr><td>订单映射</td><td>MUST（实现层）</td><td>ACCEPTED 后 MUST 在业务层生成订单/合同记录并建立 <code>purchase_id ↔ 内部单号</code> 映射（M8.3）。</td></tr>
      </tbody>
    </table>
    <h3 id="s-m552">M5.5.2 Marketplace 角色职责</h3>
    <table>
      <thead><tr><th>职责</th><th>级别</th><th>说明</th></tr></thead>
      <tbody>
        <tr><td>及时路由</td><td>MUST</td><td>订购进入受理窗口后 MUST 立即推送 <code>order_routed</code>（M5.7），推送失败按重试与轮询降级兜底。</td></tr>
        <tr><td>结论转发</td><td>MUST</td><td>受理结论 MUST 如实转换为买方可见结果：ACCEPTED → 推进 <code>purchase.complete</code>；REJECTED → 结构化取消通知 + P3 补偿。</td></tr>
        <tr><td>超时执行</td><td>MUST</td><td>MUST 按订单路由时声明的 <code>timeout_policy</code> 执行自动处置，并推送 <code>utp.acceptance.expired</code>。</td></tr>
        <tr><td>证据归档</td><td>MUST</td><td>AcceptanceRecord（含签名、原因码、时间戳）MUST 纳入交易 Evidence Bundle。</td></tr>
      </tbody>
    </table>

    <hr />
    <h2 id="s-m56">M5.6 与 P3 Purchase 签名流程的衔接（Interlock with P3）</h2>
    <p>本节是闭环不变式 3（<a href="overview.html#s-m16">M1.6</a>）的规范定义：</p>
    <ol>
      <li>买方 <code>purchase.complete</code> 通过第 5 章 Mandate 操作准入后，P3 进入 <code>SIGNING</code>；平台托管拓扑下，协议引擎 MUST 生成受理任务并路由给供应商（M5.7）。</li>
      <li>MP3 <code>accept</code> 请求 MUST 携带卖方 ES256 签名（JWS），签名内容 MUST 覆盖该订购的 <code>terms_hash</code>。主规范未规定"卖方承诺处理"的具体形式（13.2.3 留白）；<strong>本规范将带签名的 <code>accept</code> 定义为平台托管拓扑下承诺处理的规范形式</strong>，AcceptanceRecord 即其可审计凭证。</li>
      <li>协议引擎确认卖方承诺处理完成后，按主规范 13.2.3 执行 <code>SIGNING → PURCHASED</code> 原子迁移（承诺处理完成、最终库存锁定、terms_hash 与条款快照一致）；任一失败按 13.3.2 补偿链处理，MP3 侧受理任务保持 ACCEPTED（签名事实不回滚，重试由引擎负责）。</li>
      <li>B2C 全 L0 模式的"自动承诺处理"（主规范 13.6.2）在本模型中实现为：<code>acceptance_policy.mode == "auto"</code> 时由 Merchant Agent 或平台代理组件按预授权策略即时调用 <code>accept</code>（M9.3），协议语义完全一致，无特殊路径。</li>
      <li><code>amend_leadtime</code> 被买方确认后，协议引擎 MUST 以 <code>purchase.update</code> 语义刷新履约条款（交期属于可变履约信息），再走签名收集；买方拒绝则视同 REJECTED。</li>
    </ol>

    <hr />
    <h2 id="s-m57">M5.7 订单路由（Order Routing）</h2>
    <p>订单路由是 Marketplace → Seller 的推送事件（回调 Service，M2.6.1），不是供应商可调用的 Action。</p>
    <h3 id="s-m571">M5.7.1 OrderRouting 事件载荷</h3>
    <table>
      <thead><tr><th>字段名</th><th>类型</th><th>必填</th><th>描述</th></tr></thead>
      <tbody>
        <tr><td><code>routing_id</code></td><td>string</td><td>是</td><td>路由事件唯一标识（受理任务标识）。</td></tr>
        <tr><td><code>purchase_id</code></td><td>string</td><td>是</td><td>关联订购标识。</td></tr>
        <tr><td><code>transaction_id</code></td><td>string</td><td>是</td><td>全局事务标识。</td></tr>
        <tr><td><code>terms_hash</code></td><td>string</td><td>是</td><td>条款快照哈希；<code>accept</code> 签名 MUST 覆盖此值。</td></tr>
        <tr><td><code>order_summary</code></td><td>object</td><td>是</td><td>商品项（含 <code>external_ref</code> 回传）、数量、金额、收货地址、Trade Method、发票要求。</td></tr>
        <tr><td><code>buyer_ref</code></td><td>object</td><td>是</td><td>买方脱敏信息（<code>agent_id</code>、资质摘要；PII 按权限裁剪）。</td></tr>
        <tr><td><code>framework_agreement_ref</code></td><td>string</td><td>否</td><td>框架协议引用（<code>relationship_mode ≥ L2</code>）。</td></tr>
        <tr><td><code>deadline</code></td><td>ISO-8601</td><td>是</td><td>受理截止时间。</td></tr>
        <tr><td><code>timeout_policy</code></td><td>enum</td><td>是</td><td><code>auto_accept</code> / <code>auto_reject</code>（订单路由时按商户配置与 Mode 确定）。</td></tr>
      </tbody>
    </table>
    <p>推送遵循主规范 4.3.1（MessageEnvelope + 签名 + 指数退避重试）；供应商 MUST 以 <code>2xx</code> 确认。推送不可达时，供应商可通过 <code>acceptance.list</code>（<code>status=PENDING_ACCEPT</code>）轮询兜底，确保推送丢失不导致订单悬挂。</p>

    <hr />
    <h2 id="s-m58">M5.8 Mode-Driven Behavior（模式驱动行为）</h2>
    <table>
      <thead><tr><th>Mode 配置</th><th>受理行为</th></tr></thead>
      <tbody>
        <tr><td>decision=L0（B2C 闪购）</td><td><code>acceptance_policy.mode</code> SHOULD 为 <code>auto</code>：策略核验通过即时 <code>accept</code>（毫秒级），买方无感知。</td></tr>
        <tr><td>decision=L1—L2（标准 B2B）</td><td>策略预筛 + 人工/Agent 复核；<code>deadline</code> 按 Mode 超时配置（小时级）。</td></tr>
        <tr><td>payment=L1+（分期）</td><td><code>accept</code> 响应 MUST 确认 TradeMethod 全部子步骤可执行；任一子步骤不可执行 MUST <code>reject</code>（原因码 <code>trade_method_unavailable</code>）。</td></tr>
        <tr><td>relationship=L2+（框架协议）</td><td>MUST 校验框架配额余量；配额不足 MUST <code>reject</code>（原因码 <code>quota_exceeded</code>）。框架内订单 SHOULD 自动接受。</td></tr>
        <tr><td>compliance=L2+（跨境）</td><td><code>accept</code> 前 MUST 确认出口单证能力；SHOULD 在 <code>acceptance_note</code> 中声明单证办理时线。</td></tr>
      </tbody>
    </table>

    <hr />
    <h2 id="s-m59">M5.9 Operations 与 Transport Bindings</h2>
    <h3 id="s-m591">M5.9.1 操作矩阵</h3>
    <table>
      <thead><tr><th>操作</th><th>适用状态</th><th>状态影响</th><th><code>valid_next_actions</code></th><th>关键约束</th></tr></thead>
      <tbody>
        <tr><td><code>utp.acceptance.accept</code></td><td><code>PENDING_ACCEPT</code>, <code>ON_HOLD</code></td><td>进入 <code>ACCEPTED</code> 终态；卖方签名注入 P3</td><td><code>query</code>, <code>utp.shipment.prepare</code></td><td>Seller；签名 MUST 覆盖 <code>terms_hash</code>；接受前 MUST 完成可行性核验。</td></tr>
        <tr><td><code>utp.acceptance.reject</code></td><td><code>PENDING_ACCEPT</code>, <code>ON_HOLD</code></td><td>进入 <code>REJECTED</code> 终态；触发 P3 补偿</td><td><code>query</code></td><td>Seller；MUST 携带结构化原因码。</td></tr>
        <tr><td><code>utp.acceptance.hold</code></td><td><code>PENDING_ACCEPT</code></td><td>进入 <code>ON_HOLD</code>；不延长 deadline</td><td><code>accept</code>, <code>reject</code>, <code>amend_leadtime</code>, <code>query</code></td><td>Seller；每单至多一次；MUST 声明 <code>expected_reply_at</code>。</td></tr>
        <tr><td><code>utp.acceptance.amend_leadtime</code></td><td><code>PENDING_ACCEPT</code>, <code>ON_HOLD</code></td><td>进入 <code>AMEND_PROPOSED</code>，等待买方确认</td><td><code>query</code></td><td>Seller；新交期 MUST 在平台允许幅度内；MUST 提供 <code>amended_leadtime_days</code>（相对交期）或 <code>promised_ship_at</code>（绝对发货时间）至少其一；买方确认后视同 ACCEPTED。</td></tr>
        <tr><td><code>utp.acceptance.query</code></td><td>任意</td><td>无</td><td>当前状态下可执行动作</td><td>Seller；按 <code>routing_id</code>/<code>purchase_id</code> 查询。</td></tr>
        <tr><td><code>utp.acceptance.list</code></td><td>—</td><td>无</td><td><code>accept</code>, <code>reject</code>, <code>hold</code>, <code>query</code></td><td>Seller；按状态/时间筛选，分页；轮询降级通道。</td></tr>
      </tbody>
    </table>
    <h3 id="s-m592">M5.9.2 传输绑定</h3>
    <table>
      <thead><tr><th>操作</th><th>REST</th><th>MCP Tool</th><th>A2A Task</th></tr></thead>
      <tbody>
        <tr><td><code>accept</code></td><td><code>POST /utp/m/v1/acceptances/{routing_id}/accept</code></td><td><code>utp_acceptance_accept</code></td><td><code>utp:acceptance:accept</code></td></tr>
        <tr><td><code>reject</code></td><td><code>POST /utp/m/v1/acceptances/{routing_id}/reject</code></td><td><code>utp_acceptance_reject</code></td><td><code>utp:acceptance:reject</code></td></tr>
        <tr><td><code>hold</code></td><td><code>POST /utp/m/v1/acceptances/{routing_id}/hold</code></td><td><code>utp_acceptance_hold</code></td><td><code>utp:acceptance:hold</code></td></tr>
        <tr><td><code>amend_leadtime</code></td><td><code>POST /utp/m/v1/acceptances/{routing_id}/amendments</code></td><td><code>utp_acceptance_amend</code></td><td><code>utp:acceptance:amend</code></td></tr>
        <tr><td><code>query</code></td><td><code>GET /utp/m/v1/acceptances/{routing_id}</code></td><td><code>utp_acceptance_query</code></td><td><code>utp:acceptance:query</code></td></tr>
        <tr><td><code>list</code></td><td><code>GET /utp/m/v1/acceptances?status=&amp;from=&amp;page=</code></td><td><code>utp_acceptance_list</code></td><td><code>utp:acceptance:list</code></td></tr>
      </tbody>
    </table>
    <p>全部写操作 MUST 携带 <code>idempotency_key</code>；响应 MUST 包含 <code>X-UTP-Acceptance-Status</code> 头部。</p>

    <hr />
    <h2 id="s-m510">M5.10 Entities（实体定义）</h2>
    <h3 id="s-m5101">M5.10.1 AcceptanceRecord</h3>
    <table>
      <thead><tr><th>字段名</th><th>类型</th><th>必填</th><th>描述</th></tr></thead>
      <tbody>
        <tr><td><code>record_id</code></td><td>string</td><td>是</td><td>受理记录唯一标识。</td></tr>
        <tr><td><code>routing_id</code></td><td>string</td><td>是</td><td>关联路由任务。</td></tr>
        <tr><td><code>purchase_id</code> / <code>transaction_id</code></td><td>string</td><td>是</td><td>关联订购与全局事务标识。</td></tr>
        <tr><td><code>conclusion</code></td><td>enum</td><td>是</td><td><code>ACCEPTED</code> / <code>REJECTED</code> / <code>LEADTIME_AMENDED</code>。</td></tr>
        <tr><td><code>arrived_via</code></td><td>enum</td><td>是</td><td><code>explicit</code>（显式操作）/ <code>timeout_auto</code>（超时自动处置）/ <code>buyer_confirm</code>（交期变更被确认）。</td></tr>
        <tr><td><code>terms_hash</code></td><td>string</td><td>是</td><td>受理时的条款快照哈希。</td></tr>
        <tr><td><code>seller_signature</code></td><td>string</td><td>条件</td><td>Seller ES256 签名（JWS）；<code>conclusion == ACCEPTED</code> 时必填。</td></tr>
        <tr><td><code>reject_reason</code></td><td>RejectReason</td><td>条件</td><td><code>conclusion == REJECTED</code> 时必填（M5.10.2）。</td></tr>
        <tr><td><code>amended_leadtime_days</code></td><td>integer</td><td>条件</td><td>交期变更申报值（相对交期，自然日）。</td></tr>
        <tr><td><code>promised_ship_at</code></td><td>ISO-8601</td><td>条件</td><td>承诺发货时间（绝对时间）。<code>conclusion == LEADTIME_AMENDED</code> 时，本字段与 <code>amended_leadtime_days</code> MUST 至少提供其一；两者同时存在时 MUST 语义一致。</td></tr>
        <tr><td><code>acceptance_note</code></td><td>string</td><td>否</td><td>补充说明（单证时线、替代建议等）。</td></tr>
        <tr><td><code>decided_by</code></td><td>enum</td><td>是</td><td><code>human</code> / <code>agent</code> / <code>policy_auto</code>（审计维度，见 M9.5）。</td></tr>
        <tr><td><code>decided_at</code></td><td>ISO-8601</td><td>是</td><td>结论时间。</td></tr>
      </tbody>
    </table>
    <h3 id="s-m5102">M5.10.2 RejectReason 原因码枚举</h3>
    <table>
      <thead><tr><th>原因码</th><th>含义</th><th>建议买方处理</th></tr></thead>
      <tbody>
        <tr><td><code>inventory_insufficient</code></td><td>库存不足</td><td>减少数量或更换供应商</td></tr>
        <tr><td><code>price_stale</code></td><td>价格已失效（原材料波动等）</td><td>回到 P2 重新议价</td></tr>
        <tr><td><code>region_restricted</code></td><td>收货区域限售/不可达</td><td>更换收货地址</td></tr>
        <tr><td><code>trade_method_unavailable</code></td><td>所选 Trade Method 当前不可执行</td><td>更换支付/贸易方式</td></tr>
        <tr><td><code>quota_exceeded</code></td><td>框架协议配额不足</td><td>协商增额或走一次性采购</td></tr>
        <tr><td><code>compliance_unable</code></td><td>无法满足合规/单证要求</td><td>更换供应商或降低合规要求</td></tr>
        <tr><td><code>risk_control</code></td><td>供应商侧风控拦截</td><td>联系供应商或平台</td></tr>
        <tr><td><code>other</code></td><td>其他（MUST 附 <code>detail</code> 说明）</td><td>阅读说明</td></tr>
      </tbody>
    </table>

    <hr />
    <h2 id="s-m511a2">M5.11 Use Case Walkthroughs（用例演练）</h2>
    <h3 id="s-m5111">M5.11.1 标准接单</h3>
<pre class="highlight"><code class="language-json">// 1. 回调：订单路由
{
  "event": "utp.acceptance.order_routed",
  "routing_id": "route-20260722-0335",
  "purchase_id": "ORD-20260722-88721",
  "transaction_id": "utp-txn-01J4X7K9M2P5Q8R3V6W0YZ",
  "terms_hash": "sha256:d4e5f6a7b8c9...",
  "order_summary": {
    "items": [ { "listing_id": "item-BT-NC-001", "sku_id": "sku-X3-BLK",
                 "external_ref": "ERP-MAT-004512", "quantity": 100,
                 "unit_price": { "amount": "268.00", "currency": "CNY" } } ],
    "total_amount": { "amount": "26800.00", "currency": "CNY" },
    "trade_method": { "method_id": "tm-fullpay-alipay", "type": "full_payment" }
  },
  "deadline": "2026-07-22T18:00:00Z",
  "timeout_policy": "auto_reject"
}

// 2. Seller 接受（ERP 核验库存与交期通过后）
POST /utp/m/v1/acceptances/route-20260722-0335/accept
{
  "idempotency_key": "idem-acc-20260722-007",
  "terms_hash": "sha256:d4e5f6a7b8c9...",
  "seller_signature": "eyJhbGciOiJFUzI1NiJ9...",
  "decided_by": "agent"
}

// 3. 响应：结论 + 引擎推进 P3
{
  "record_id": "acc-20260722-0335",
  "conclusion": "ACCEPTED",
  "purchase_status": "PURCHASED",        // SIGNING → PURCHASED 原子迁移完成
  "valid_next_actions": ["utp.acceptance.query", "utp.shipment.prepare"]
}
</code></pre>
    <h3 id="s-m5112">M5.11.2 缺货拒单与超时兜底</h3>
<pre class="highlight"><code>拒单：POST .../reject { "reject_reason": { "code": "inventory_insufficient",
      "detail": "黑色缺货，白色 sku-X3-WHT 可 48h 内发货" } }
      → P3 补偿链：释放 hold → 订购 CANCELLED → 买方收到结构化通知

超时：deadline 到期未答复 → 按 timeout_policy=auto_reject 自动 REJECTED，
      arrived_via=timeout_auto，推送 utp.acceptance.expired 给供应商
</code></pre>
