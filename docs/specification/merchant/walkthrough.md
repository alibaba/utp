---
title: M11 供应商全链路演练
section: merchant
owner: merchant-team
status: review
version: 2026-07-30
format: html
---

<h1 id="s-m11">M11 · 供应商全链路演练（Merchant End-to-End Walkthrough）</h1>
    <blockquote><p><strong>本章为资料性（Informative）。</strong>演练序列与 JSON 报文示例用于说明各章规范性条款的组合使用方式，不新增任何规范性要求；示例与各章条款或机读 Schema 不一致时，以条款与 Schema 为准。M11.9 验证清单是对 M1.6 闭环不变式（规范性，定义于各引用章节）的检查索引。</p></blockquote>

    <h2 id="s-m111">M11.1 场景设定（Scenario Setup）</h2>
    <p>本章以一家电子产品制造商"上海示例供应链有限公司"接入 Marketplace 为主线，演练<strong>入驻 → 发布 → 上架 → 被寻源 → 报价 → 接单 → 发货 → 结算</strong>的完整闭环。它是主规范<a href="/documentation/specification/guides/procurement-walkthrough.html">第 24 章标准采购全链路</a>的<strong>供应商侧镜像</strong>——主规范第 24 章从买方视角走完同一笔交易，两章互为对照。</p>
    <table>
      <thead><tr><th>项目</th><th>设定</th></tr></thead>
      <tbody>
        <tr><td>供应商</td><td><code>agent_id: did:web:supplier.example.com</code>；ERP 集成形态 <code>bridge</code>；Merchant Agent 启用（<code>assisted</code> 接单）</td></tr>
        <tr><td>Marketplace</td><td><code>marketplace.example.com</code>，承载 <code>dev.utp.merchant</code> 与 <code>dev.utp.trade</code> 两个 Service</td></tr>
        <tr><td>商品</td><td>ProSound X3 降噪耳机（阶梯价，L1 定价）</td></tr>
        <tr><td>交易 Mode</td><td><code>(L1, L1, L0, L1, L0, L0)</code>：阶梯定价 + 简单询价 + 全额支付 + 委托物流</td></tr>
      </tbody>
    </table>
    <h3 id="s-m1111">M11.1.1 全链路时序总览</h3>
<div class="diagram"><img src="/documentation/assets/diagrams/m-e2e-sequence.svg" alt="供应商全链路时序总览：Phase 0—6 从入驻、发布、被寻源、报价、接单、发货到结算的三方交互" style="max-width: 100%; height: auto;"></div>

    <h2 id="s-m112">M11.2 Phase 0：入驻（Onboarding）</h2>
    <p>按 M2 五步流程完成：生成 ES256 密钥对 → 发布 Profile（声明 Seller 角色 + MP1—MP5 原语 + <code>dev.utp.merchant_callback</code> Service，示例见 <a href="onboarding.html#s-m23">M2.3</a>）→ 注册获取 <code>merchant_id: mch-sh-00812</code> → 资质审核 <code>QUALIFIED</code> → 沙箱验收 7 项全过 → 状态 <code>ACTIVE</code>。</p>

    <h2 id="s-m113">M11.3 Phase 1：发布商品与设置库存</h2>
    <p>Bridge 从 ERP 物料主数据生成发布请求（完整示例见 <a href="primitive-listing.html#s-m3101">M3.10.1</a>）：</p>
<pre class="highlight"><code>1. POST /utp/m/v1/listings           → listing_id=item-BT-NC-001, PENDING_REVIEW
2. 回调 utp.listing.review_result    → APPROVED, auto_list 生效 → LISTED
3. PUT  /utp/m/v1/inventory/item-BT-NC-001/sku-X3-BLK
   { "available": 500, "expected_revision": 0 }
   → { available:500, sellable:500, revision:1 }
</code></pre>
    <p><strong>闭环检查点 ①（对应 M1.6 不变式 1/2）：</strong>此刻买方侧 <code>source.lookup(item-BT-NC-001)</code> 返回的 <code>skus[].stock=500</code>、<code>pricing.tiered_pricing</code> 与供应商发布结构逐字段对齐。</p>

    <h2 id="s-m114">M11.4 Phase 2—3：被寻源与报价（买方视角对照）</h2>
    <p>买方按主规范流程 <code>source.search → source.lookup → negotiate.inquiry</code>（询 100 件价格与交期）。供应商侧：</p>
<pre class="highlight"><code class="language-json">// Marketplace 将询盘转给供应商回调（P2 的 Seller handler 侧）；
// Merchant Agent 按 M10.3.2 策略生成报价（阶梯价内，无需人工）：
// negotiate.quote 应答
{
  "quote": {
    "subject_ref": { "listing_id": "item-BT-NC-001", "sku_id": "sku-X3-BLK" },
    "quantity": 100,
    "unit_price": { "amount": "268.00", "currency": "CNY" },
    "leadtime_days": 3,
    "valid_until": "2026-07-23T18:00:00Z"
  },
  "decided_by": "agent"
}
</code></pre>
    <p>买方接受报价形成 Binding Terms（主规范 P2），报价与 Listing <code>pricing_tiers</code> 一致（100 件档 268 元）——报价不越界，Agent 自主完成。</p>

    <h2 id="s-m115">M11.5 Phase 4：下单、路由与接单</h2>
<pre class="highlight"><code class="language-json">// 1. 买方 purchase.create（100 件）→ 协议引擎创建临时 hold
//    供应商收到回调：
{ "event": "utp.inventory.hold_created", "hold_id": "hold-20260722-0091",
  "quantity": 100, "status": "HELD", "expires_at": "2026-07-22T20:00:00Z" }
//    此刻库存视图：available=500, held=100, sellable=400

// 2. 买方 purchase.complete（买方签名）→ P3 进入 SIGNING
//    → Marketplace 路由受理任务（M6.7）：
{ "event": "utp.acceptance.order_routed", "routing_id": "route-20260722-0335",
  "purchase_id": "ORD-20260722-88721",
  "transaction_id": "utp-txn-01J4X7K9M2P5Q8R3V6W0YZ",
  "terms_hash": "sha256:d4e5f6a7b8c9...",
  "deadline": "2026-07-22T18:00:00Z", "timeout_policy": "auto_reject" }

// 3. assisted 模式：Agent 核验（ERP 库存/交期/金额 26,800 &lt; ceiling 50,000）
//    → 建议 accept → 运营点击确认 → Bridge 提交：
POST /utp/m/v1/acceptances/route-20260722-0335/accept
{ "terms_hash": "sha256:d4e5f6a7b8c9...",
  "seller_signature": "eyJhbGciOiJFUzI1NiJ9...", "decided_by": "human" }

// 4. 协议引擎完成 SIGNING → PURCHASED 原子迁移（承诺处理/库存锁定/terms_hash 校验，主规范 13.2.3）
//    hold-20260722-0091: HELD → LOCKED；ERP 创建 SO-2026-07553 并建立映射
</code></pre>
    <p><strong>闭环检查点 ②（不变式 3）：</strong>MP4 提交的卖方签名覆盖订购 <code>terms_hash</code>，与买方侧 Mandate 操作准入共同构成双边承诺，订购凭证成立，全局状态 <code>PURCHASING → PAYING</code>。买方支付（P4，全额 alipay）确认后进入 <code>FULFILLING</code>。</p>

    <h2 id="s-m116">M11.6 Phase 5：发货与买方收货</h2>
<pre class="highlight"><code class="language-json">// 1. ERP 出库单确认 → Bridge 幂等键 ship-OUT-20260723-081 → 发货：
POST /utp/m/v1/shipments
{ "transaction_id": "utp-txn-01J4X7K9M2P5Q8R3V6W0YZ",
  "purchase_id": "ORD-20260722-88721",
  "shipment": { "carrier_code": "SF", "tracking_number": "SF1234567890123",
    "ships_from": "上海", "estimated_delivery_at": "2026-07-26T18:00:00Z",
    "packages": [ { "package_no": "PKG-001",
      "items": [ { "listing_id": "item-BT-NC-001", "sku_id": "sku-X3-BLK",
                   "external_ref": "ERP-MAT-004512", "quantity": 100 } ] } ] },
  "seller_signature": "eyJhbGciOiJFUzI1NiJ9..." }
// → SHIPPED；lock 100 → CONSUMED；available 500→400

// 2. Marketplace 转换为买方 fulfill.notify(SHIPPED)（M7.7 映射表）
// 3. 承运商妥投回执 → DELIVERED → 买方 fulfill.receive 确认收货
// 4. 供应商收到回调：
{ "event": "utp.shipment.delivery_receipt",
  "shipment_id": "shp-20260723-0442",
  "receipt": { "result": "ACCEPTED", "received_quantity": 100,
               "received_at": "2026-07-26T15:20:00Z" } }
// → 批次 CLOSED；全局状态 FULFILLING → SETTLED（全局状态机判定）
</code></pre>
    <p><strong>闭环检查点 ③（不变式 4）：</strong>买方 <code>fulfill.query</code> 与供应商 <code>shipment.query</code> 呈现同一 <code>shipment_id / tracking_number</code> 的两个投影。</p>

    <h2 id="s-m117">M11.7 Phase 6：结算与对账</h2>
<pre class="highlight"><code class="language-json">// T+7 账单出具回调 → 供应商拉取明细：
GET /utp/m/v1/settlements/statements/stmt-202607-C-0031
{
  "statement_id": "stmt-202607-C-0031",
  "period": { "from": "2026-07-20", "to": "2026-07-26" },
  "entries": [ {
    "entry_id": "ent-88721-01",
    "transaction_id": "utp-txn-01J4X7K9M2P5Q8R3V6W0YZ",
    "payment_confirmation_ref": "payconf-20260722-5501",
    "gross_amount": { "amount": "26800.00", "currency": "CNY" },
    "fees": [
      { "type": "platform_commission", "amount": { "amount": "1340.00", "currency": "CNY" }, "basis_ref": "agmt-fee-3.2" },
      { "type": "channel_fee", "amount": { "amount": "160.80", "currency": "CNY" }, "basis_ref": "agmt-fee-4.1" }
    ],
    "payable_amount": { "amount": "25299.20", "currency": "CNY" },
    "status": "BILLED"
  } ],
  "total_payable": { "amount": "25299.20", "currency": "CNY" },
  "dispute_deadline": "2026-08-02T00:00:00Z",
  "issuer_signature": "eyJhbGciOiJFUzI1NiJ9..."
}
// Bridge 三方核对（ERP 应收 × 账单 × PaymentConfirmation）一致 → 确认
// → PAID_OUT（附打款流水 payout-20260803-771）→ ERP 应收核销
</code></pre>
    <p><strong>闭环检查点 ④（不变式 M8.2.2）：</strong><code>gross_amount</code> 与 PaymentConfirmation 一致；每笔扣减有协议条款引用；账单可逐笔回溯到 <code>transaction_id</code>。至此货、款、单三流闭合。</p>

    <h2 id="s-m118">M11.8 异常支线演练（Exception Paths）</h2>
    <table>
      <thead><tr><th>支线</th><th>触发</th><th>协议路径</th><th>收敛结果</th></tr></thead>
      <tbody>
        <tr><td>缺货拒单</td><td>接单核验发现 ERP 实际库存不足</td><td><code>acceptance.reject(inventory_insufficient)</code> → P3 补偿链释放 hold → 订购 <code>CANCELLED</code>；Bridge 随即 <code>inventory.set</code> 校准</td><td>买方收到结构化拒绝与替代建议；无资金损失</td></tr>
        <tr><td>受理超时</td><td>ERP 审批流卡住超过 deadline</td><td><code>timeout_policy=auto_reject</code> 自动处置 + <code>acceptance.expired</code> 回调</td><td>订单不悬挂；供应商复盘审批时效</td></tr>
        <tr><td>发货延迟</td><td>原料短缺，无法按 3 天交期发货</td><td><code>shipment.update(delay, new_eta)</code> → 买方侧 <code>DELAYED</code>；买方可等待或 <code>resolve.raise</code></td><td>延迟事实留痕；争议按证据裁决</td></tr>
        <tr><td>买方拒收</td><td>到货外观破损</td><td>买方 <code>fulfill.reject</code>（P5）→ Resolve 激活 → 裁决退款 → CompensationOrder 进入结算 <code>adjustments</code>（M8.6.2）</td><td>结算条目冻结 → 裁决后按调整项出账</td></tr>
        <tr><td>账单差异</td><td>佣金费率与商户协议不符</td><td><code>settlement.discrepancy.submit(fee_mismatch)</code> → Marketplace 更正账单新版本</td><td>新版账单确认后打款</td></tr>
        <tr><td>商品强制下架</td><td>资质到期未换证</td><td>平台 <code>SUSPENDED_BY_PLATFORM</code> + 回调通知 → 供应商补证 → 恢复 <code>PUBLISHED</code> → 重新 <code>list</code></td><td>存量订单履约义务不变（M2.7）</td></tr>
      </tbody>
    </table>

    <h2 id="s-m119">M11.9 闭环总验证清单（Loop Verification Checklist）</h2>
    <table>
      <thead><tr><th>#</th><th>不变式（M1.6）</th><th>本章验证位置</th></tr></thead>
      <tbody>
        <tr><td>1</td><td>Source 投影 == Listing 发布结构</td><td>M11.3 检查点 ①</td></tr>
        <tr><td>2</td><td>Purchase 库存校验/锁定 == MP2 同一数据源</td><td>M11.5（hold→LOCKED→CONSUMED 全程可查）</td></tr>
        <tr><td>3</td><td>卖方承诺处理经 MP4 完成并注入 P3 原子迁移</td><td>M11.5 检查点 ②</td></tr>
        <tr><td>4</td><td>MP5 Shipment == 买方 fulfill 同一记录</td><td>M11.6 检查点 ③</td></tr>
        <tr><td>5</td><td>delist 后 Source/Purchase 既有错误码生效</td><td>M3.10.2（专项演练）</td></tr>
        <tr><td>—</td><td>结算三流闭合（货/款/单）</td><td>M11.7 检查点 ④</td></tr>
      </tbody>
    </table>
