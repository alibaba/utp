---
title: M1 供应商侧架构总览
section: merchant
owner: merchant-team
status: review
version: 2026-07-30
format: html
---

<h1 id="s-m1">M1 · 供应商侧架构总览（Merchant-Side Architecture Overview）</h1>

    <h2 id="s-m11">M1.1 问题与边界（Problem &amp; Scope）</h2>
    <p>UTP 主规范是一个<strong>交易执行协议</strong>：P1—P6 原语覆盖从寻源到争议解决的交易过程，但假设商品已经存在于可搜索的目录中、订单会被供应商自动接受、发货由实现层自行完成。对供应商而言，接入 UTP 生态还需要回答四个主规范未定义的问题：</p>
    <table>
      <thead><tr><th>#</th><th>问题</th><th>本规范的回答</th></tr></thead>
      <tbody>
        <tr><td>1</td><td>商品如何进入 UTP 网络并可被 P1 Source 搜索到？</td><td>MP1 <code>utp.listing</code>（<a href="primitives/listing/index.html">M3</a>）+ MP2 <code>utp.inventory</code>（<a href="primitives/inventory/index.html">M4</a>）</td></tr>
        <tr><td>2</td><td>订单成立前，供应商如何显式接单、拒单或申报交期变更？</td><td>MP4 <code>utp.acceptance</code>（<a href="primitives/acceptance/index.html">M6</a>）</td></tr>
        <tr><td>3</td><td>供应商如何以协议动作完成备货、发货、拆单与异常申报？</td><td>MP5 <code>utp.delivery</code>（<a href="primitives/delivery/index.html">M7</a>）</td></tr>
        <tr><td>4</td><td>交付之后出现质量争议、错发漏发时，如何以协议动作给出可判定的处置结论？</td><td>MP6 <code>utp.aftersale</code>（<a href="primitives/aftersale/index.html">M8</a>）</td></tr>
        <tr><td>5</td><td>货款如何对账回款、供应商系统（ERP/WMS）与 Agent 如何接入？</td><td>结算扩展（<a href="settlement.html">M9</a>）、Bridge 规范（<a href="erp-bridge.html">M10</a>）、Merchant Agent（<a href="merchant-agent.html">M11</a>）</td></tr>
      </tbody>
    </table>
    <p><strong>不在本规范范围内：</strong>营销与广告投放、店铺装修、类目治理细则、平台内部审核算法、税务申报。这些属于平台运营域，MAY 由平台以私有 API 提供，不构成协议互操作面。</p>

    <h2 id="s-m12">M1.2 设计原则（Design Principles）</h2>
    <p>本规范在主规范五条核心设计约束（原语正交性、状态机确定性、模式参数化、传输无关性、向后兼容）之上，增加三条供应商侧原则：</p>
    <ol>
      <li><strong>方向一致性（Directional Consistency）：</strong>所有 MP 原语的 <code>initiator_role</code> MUST 为 <code>Seller</code>，<code>handler_role</code> MUST 为 <code>Marketplace</code>（M1.3）。供应商侧能力不通过“给既有原语增加反向 Action”表达，避免破坏主规范 <a href="/documentation/specification/protocol-core/primitive-framework.html#s-1023-action-definition-format">10.2.3</a> 中“每个 Action 恰好声明一个 <code>initiator_role</code> 与一个 <code>handler_role</code>，不得声明多组角色对”的不变式。</li>
      <li><strong>资源状态与交易状态分离（Resource vs. Transaction State）：</strong>商品、库存、发货单是<strong>资源级状态</strong>，其状态机由各 MP 原语在原语内部定义；全局状态机（主规范 <a href="/documentation/specification/protocol-core/global-state-machine.html#s-171">17.1</a>）只管理 <code>transaction_id</code> 生命周期。MP 原语 MUST NOT 定义或迁移任何全局交易状态；MP 原语对交易的影响只能通过主规范已定义的事实（如库存校验结果、卖方签名、履约 Evidence）传导。</li>
      <li><strong>单一事实源（Single Source of Truth）：</strong>供应商通过 MP1/MP2 发布的商品与库存结构，与买方通过 P1 Source 查询到的 <code>item</code>/<code>skus</code>/<code>pricing</code> 结构 MUST 字段对齐（对齐关系见 M3.9 与附录 MD）。"发布的即是被搜到的"，禁止两套商品模型。</li>
    </ol>

    <h2 id="s-m13">M1.3 角色模型（Role Model）</h2>
    <h3 id="s-m131">M1.3.1 新增角色：Marketplace</h3>
    <p>主规范 R2 标准角色集（<a href="/documentation/specification/protocol-core/business-topology.html#s-922-standard-roles">9.2.2</a>）没有承载商品目录与订单路由的平台角色。本规范按 R1 角色元规则（<a href="/documentation/specification/protocol-core/business-topology.html#s-924-r1">9.2.4</a>）论证并新增扩展角色 <code>Marketplace</code>：</p>
    <table>
      <thead><tr><th>R1 条件</th><th>论证</th></tr></thead>
      <tbody>
        <tr><td>职责可区分性</td><td>Marketplace 托管商品目录、执行上架审核、路由订单、代收代付结算——与 Seller（供货）和 Buyer（采购）职责本质不同。</td></tr>
        <tr><td>原语绑定性</td><td>Marketplace 是 MP1—MP6 全部六个原语的 <code>handler_role</code>，并在结算扩展中承担账单出具义务。</td></tr>
        <tr><td>权限差异性</td><td>Marketplace 可见全量商品与订单路由信息，但 MUST NOT 可见供应商成本结构；对买方侧仅暴露已上架（LISTED）商品。</td></tr>
      </tbody>
    </table>
    <p><strong>RoleDefinition（按主规范 <a href="/documentation/specification/protocol-core/business-topology.html#s-921-roledefinition">9.2.1</a> 格式）：</strong></p>
<pre class="highlight"><code class="language-json">{
  "role_id": "Marketplace",
  "display_name": "平台方",
  "description": "托管商品目录与订单路由的 UTP Server 运营方：受理商品发布与上下架、维护库存视图、向供应商路由订单并收集受理结果、汇聚发货事实、出具结算账单",
  "governance_layer": "R2",
  "bound_primitives": ["utp.listing", "utp.inventory", "utp.acceptance", "utp.delivery", "utp.aftersale", "utp.pay"],
  "default_permissions": {
    "visible_primitives": ["utp.listing", "utp.inventory", "utp.acceptance", "utp.delivery", "utp.aftersale", "utp.pay"],
    "visible_fields": ["listing.*", "inventory.*", "order.*", "delivery.*", "aftersale.*", "settlement.*"],
    "executable_actions": ["listing.review", "acceptance.route", "settlement.issue"],
    "data_restrictions": [
      { "field": "seller.cost_structure", "access": "denied" },
      { "field": "seller.profit_margin", "access": "denied" }
    ]
  },
  "validity_conditions": [
    "职责可区分性：Marketplace 托管目录与路由订单，与 Buyer/Seller 职责本质不同",
    "原语绑定性：Marketplace 承担 MP1—MP6 原语的处理方义务",
    "权限差异性：可见全量目录与路由信息，不可见供应商成本结构"
  ]
}
</code></pre>
    <blockquote><p>整合说明：<code>Marketplace</code> 进入主规范 R2 标准角色集 MUST 走 RFC 治理流程（主规范 9.2.2 变更规则）。在进入 R2 前，实现方 MAY 以 R3 领域角色 <code>marketplace.Marketplace</code> 形式先行注册试点。</p></blockquote>

    <h3 id="s-m132">M1.3.2 既有角色的供应商侧职责</h3>
    <table>
      <thead><tr><th>角色</th><th>来源</th><th>在 UTP-M 中的职责</th></tr></thead>
      <tbody>
        <tr><td><code>Seller</code></td><td>主规范 R2 核心角色</td><td>MP1—MP6 全部原语的 <code>initiator_role</code>；商品信息、库存数量、接单结论、交付事实与售后处置结论的责任主体。</td></tr>
        <tr><td><code>Shipper</code></td><td>主规范 R2 扩展角色</td><td>当 <code>fulfillment_structure ≥ L1</code> 时，MP5 <code>delivery.ship</code> 产出的运单移交给 Shipper 执行运输；Shipper 的轨迹回执经 Marketplace 汇聚后转换为买方侧 <code>fulfill.notify</code>。</td></tr>
        <tr><td><code>Payee</code></td><td>主规范 R2 核心角色</td><td>结算扩展中的收款主体，通常与 Seller 为同一实体。</td></tr>
      </tbody>
    </table>
    <p><strong>Merchant Agent 不是拓扑角色。</strong>它是 Seller 的一种运行时实现形态（详见 <a href="merchant-agent.html">M11</a>），与"人工商家后台操作"在协议层不可区分——二者都以 Seller 身份签名并调用 MP 原语。</p>

    <h2 id="s-m14">M1.4 两种部署拓扑（Deployment Topologies）</h2>
    <h3 id="s-m141">M1.4.1 平台托管拓扑（Marketplace-Hosted）</h3>
    <p>本规范的主线拓扑。供应商将商品发布到 Marketplace 运营的 UTP Server；买方的 P1—P6 请求由 Marketplace 的 Endpoint 处理（Marketplace 同时以 <code>Seller</code> 代理身份或路由方式响应），供应商通过 MP 原语与 Marketplace 交互：</p>
<div class="diagram"><img src="/documentation/assets/diagrams/m-hosted-topology.svg" alt="平台托管拓扑：Seller 经 MP1—MP6 对接 Marketplace，买方经 P1—P6 对接 Marketplace，回调反向推送" style="max-width: 100%; height: auto;"></div>
    <ul>
      <li>Marketplace MUST 将 LISTED 状态的商品纳入其 P1 Source 的可搜索范围（<code>handler_role=Seller</code> 的 Source 由 Marketplace 的 Business Domain 承载，见主规范 <a href="/documentation/specification/protocol-core/discovery-negotiation.html#s-332">3.3.2</a>“同一 Business Domain MAY 承担多个 Role”）。</li>
      <li>买方 <code>purchase.create</code>/<code>complete</code> 触发的库存校验与锁定 MUST 落到 MP2 维护的同一库存视图（M4.7）。</li>
      <li>订购成立所需的"卖方承诺处理"（主规范 13.2.3），经 MP4 <code>acceptance.accept</code> 以签名形式完成（M6.6）。</li>
    </ul>
    <h3 id="s-m142">M1.4.2 自托管拓扑（Self-Hosted）</h3>
    <p>供应商自行运营 UTP Endpoint（P=2 直连买方）。此拓扑下 <strong>MP 原语不出现在跨方拓扑中</strong>：商品目录、库存、接单、发货都是供应商 Endpoint 的内部实现，通过主规范既有机制对外表达——商品经其 P1 Source 直接可搜索、接单以 <code>purchase.complete</code> 卖方签名表达、发货以 <code>fulfill.notify</code> 推送表达。</p>
    <p>自托管实现方 SHOULD 参照 MP 原语的实体与状态机（M3—M7）组织内部模型，以保证未来切换到平台托管拓扑时数据结构无损迁移；但协议层 MUST NOT 要求自托管方暴露 MP 端点。</p>
    <h3 id="s-m143">M1.4.3 拓扑选择规则</h3>
    <table>
      <thead><tr><th>条件</th><th>拓扑</th><th>MP 原语</th></tr></thead>
      <tbody>
        <tr><td>商品需进入平台聚合目录、由平台代收代付</td><td>平台托管</td><td>MP1、MP2、MP4、MP5 MUST 全部支持；MP3 报价与 MP6 售后 MAY（MP3 见 M5.1.2、MP6 见 M8.1）</td></tr>
        <tr><td>供应商仅自营渠道、直连买方</td><td>自托管</td><td>不适用（内部实现）</td></tr>
        <tr><td>混合（自营 + 平台分销）</td><td>两者并存</td><td>对平台侧 MUST 支持 MP1、MP2、MP4、MP5（MP3、MP6 MAY）；两侧库存一致性由供应商 ERP 保证（M10.5）</td></tr>
      </tbody>
    </table>
    <h3 id="s-m144">M1.4.4 Handler 侧执行模式：平台代答与透传（Delegation Mode）</h3>
<div class="diagram"><img src="/documentation/assets/diagrams/m-delegation-flow.svg" alt="Handler 执行模式：direct 平台代答与 passthrough 透传，超时按 on_timeout 兜底，买方不感知模式" style="max-width: 100%; height: auto;"></div>
    <p>平台托管拓扑下，<code>handler_role = Seller</code> 的既有原语由 Marketplace 的 Endpoint 承载。其中 P1 Source 的应答 MUST 为平台直接处理（其数据即 MP1/MP2 发布结构的投影，M3.9.6）；对 <strong>P2 询盘（标准应答通道为 MP3 询盘响应，M5）与 P6 Resolve 的卖方应答义务</strong>，商家 MUST 在入驻时（M2.4.1 <code>delegation_policy</code>）逐原语选择一种执行模式：</p>
    <table>
      <thead><tr><th>模式</th><th>语义</th><th>适用</th></tr></thead>
      <tbody>
        <tr><td><code>direct</code>（平台代答）</td><td>Marketplace 依据商家预先声明的数据与策略直接应答：如 Negotiate 基于 Listing <code>pricing</code>（含 PricingTiers）自动报价。</td><td>标准化程度高、时效敏感的场景（B2C、阶梯价询盘）</td></tr>
        <tr><td><code>passthrough</code>（透传）</td><td>Marketplace 将请求经回调事件路由给商家（M2.6.1 的 <code>inquiry_routed</code>/<code>dispute_routed</code>），由商家系统或 Merchant Agent 处理后回传结果，再由 Marketplace 应答买方。</td><td>需要商家实时决策的场景（议价、争议答辩、定制品）</td></tr>
      </tbody>
    </table>
    <p><strong>约束：</strong></p>
    <ul>
      <li>执行模式对买方 MUST 透明：两种模式下的响应语义、Schema 与错误码 MUST 完全一致，买方 MUST NOT 感知或依赖商家的执行模式。</li>
      <li><code>passthrough</code> MUST 受时限约束（按 Mode 超时配置，主规范 4.2.4）；商家未在时限内回传时，Marketplace MUST 按 <code>delegation_policy</code> 预配置的兜底策略降级（<code>direct</code> 代答或返回结构化超时），MUST NOT 让买方请求悬挂。</li>
      <li>MP 原语不适用本节：其方向均为 Seller → Marketplace，天然由商家侧发起（MP3 询盘响应虽应答 P2 询盘，但其提交方向仍是商家侧发起，故同样不适用委派模式）。订单受理路由（M6.7）在结构上等价于 P3 卖方签署义务的 <code>passthrough</code> 特化，其超时兜底由 <code>timeout_policy</code> 承担。</li>
    </ul>

    <h2 id="s-m15">M1.5 MP 原语总表（Primitive Summary）</h2>
    <table>
      <thead><tr><th>原语</th><th>原语 ID</th><th>版本</th><th>initiator_role</th><th>handler_role</th><th>actions</th><th>service</th></tr></thead>
      <tbody>
        <tr><td>MP1 商品原语</td><td><code>utp.listing</code></td><td><code>2026-07-01</code></td><td><code>Seller</code></td><td><code>Marketplace</code></td><td><code>publish, update, list, delist, query, archive, batch</code></td><td><code>dev.utp.merchant</code></td></tr>
        <tr><td>MP2 库存原语</td><td><code>utp.inventory</code></td><td><code>2026-07-01</code></td><td><code>Seller</code></td><td><code>Marketplace</code></td><td><code>set, adjust, query, hold.query, batch</code></td><td><code>dev.utp.merchant</code></td></tr>
        <tr><td>MP3 报价原语（MAY）</td><td><code>utp.quote</code></td><td><code>2026-07-30</code></td><td><code>Seller</code></td><td><code>Marketplace</code></td><td><code>quote, revise, bid, decline, query, list</code></td><td><code>dev.utp.merchant</code></td></tr>
        <tr><td>MP4 接单原语</td><td><code>utp.acceptance</code></td><td><code>2026-08-04</code></td><td><code>Seller</code></td><td><code>Marketplace</code></td><td><code>accept, reject, hold, amend_leadtime, <strong>amend_price</strong>, query, list</code></td><td><code>dev.utp.merchant</code></td></tr>
        <tr><td>MP5 交付原语</td><td><code>utp.delivery</code></td><td><code>2026-08-04</code></td><td><code>Seller</code></td><td><code>Marketplace</code></td><td><code>prepare, ship, split, update, query</code></td><td><code>dev.utp.merchant</code></td></tr>
        <tr><td>MP6 售后原语（新增，MAY）</td><td><code>utp.aftersale</code></td><td><code>2026-08-04</code></td><td><code>Seller</code></td><td><code>Marketplace</code></td><td><code>approve, reject, propose, confirm_return, query, list</code></td><td><code>dev.utp.merchant</code></td></tr>
      </tbody>
    </table>
    <p>六个原语共同挂载在新的 <code>dev.utp.merchant</code> Service 上（Profile 的 <code>utp.services</code> 中声明，见 <a href="onboarding.html#s-m23">M2.3</a>），与主规范 <code>dev.utp.trade</code> Service 分离，便于平台按侧别独立部署与限流。B/M 原语对偶不复用命名（例如买方侧 P2 询盘与卖方侧 MP3 报价各自独立声明），同一 Agent Server 可在一份 Profile 中按角色分别声明两侧原语。</p>
    <p><strong>正交性检查：</strong></p>
    <ul>
      <li>MP1 管商品<strong>信息与生命周期</strong>，不管数量——库存数量的任何变更 MUST 走 MP2。</li>
      <li>MP2 管<strong>数量</strong>，不管商品信息，也不直接锁库存——交易性锁定（hold/lock）由 P3 Purchase 触发、Marketplace 执行，MP2 仅提供数量事实与占用查询。</li>
      <li>MP4 管<strong>受理结论</strong>（接受/拒绝/挂起/交期变更），不管发货——受理产出承诺处理证据（卖方签名），衔接 P3。</li>
      <li>MP5 管<strong>履约执行事实</strong>（备货/发货/拆单/异常），不管验收——验收（receive/reject/inspect）始终是买方侧 P5 的职责。</li>
      <li>MP3 管<strong>报价与应答</strong>（报价/修订/投标/谢绝），不管条款绑定——绑定核查与 <code>terms_hash</code> 生成始终是 P2 的权威职责（M5.6）。</li>
    </ul>

    <h2 id="s-m16">M1.6 商品—交易闭环（End-to-End Loop）</h2>
<div class="diagram"><img src="/documentation/assets/diagrams/m-closed-loop.svg" alt="商品—交易闭环：供应商侧发布/库存/接单/发货与买方侧发现/寻源/订购/履约/支付的咬合关系" style="max-width: 100%; height: auto;"></div>
    <p><strong>闭环不变式（协议引擎 MUST 保证）：</strong></p>
    <ol>
      <li><code>source.lookup</code> 返回的商品结构 == MP1 发布的 Listing 结构在买方可见字段上的投影（M3.9）。</li>
      <li><code>purchase</code> 校验/锁定的库存 == MP2 维护的 <code>available</code> 同一数据源；锁定成功 MUST 反映为 InventoryHold（M4.7）。</li>
      <li>P2 询盘的卖方侧报价事实 == MP3 <code>quote</code> 提交的签名报价（承载同一份主规范 <code>Quote</code> 实体，签名覆盖同一 <code>terms_hash</code>）；条款绑定后 MP4 <code>accept</code> MUST NOT 偏离已绑定条款（M5.6，仅适用于声明 <code>utp.quote</code> 的商户）。</li>
      <li><code>purchase.complete</code> 所需的卖方承诺处理 == MP4 <code>accept</code>（签名覆盖同一 <code>terms_hash</code>，M6.6）。</li>
      <li>MP5 <code>ship</code> 产出的 Shipment == 买方侧 <code>fulfill.notify</code>/<code>track</code> 呈现的同一 <code>shipment_id</code> 与运单（M7.7）。</li>
      <li>MP1 <code>delist</code> 生效后，<code>source.lookup</code> MUST 返回 <code>SOURCE.LOOKUP.ITEM_NOT_FOUND</code>，<code>purchase.create</code> MUST 返回 <code>PURCHASE.CREATE.INVALID_ITEMS</code>（主规范既有错误码的触发源在此闭合）。</li>
      <li>Mode 能力过滤：商品的有效 Mode 范围（商户 Profile 范围 ∩ 商品级 <code>mode_constraints</code>）不包含会话 <code>ModeConfiguration</code> 时，该商品 MUST NOT 出现在 <code>source.search</code> 结果中——“能被搜到即可被履约”（M3.6）。</li>
    </ol>

    <h2 id="s-m17">M1.7 与主规范 P1—P6 的衔接矩阵（Interlock Matrix）</h2>
    <table>
      <thead><tr><th>主规范原语</th><th>衔接点</th><th>UTP-M 提供的事实</th><th>约束级别</th></tr></thead>
      <tbody>
        <tr><td>P1 Source（Ch.11）</td><td><code>search/lookup</code> 的数据源</td><td>LISTED 商品 + 实时 <code>available</code> 快照</td><td>MUST（平台托管）</td></tr>
        <tr><td>P2 询盘（Ch.12）</td><td>询盘的卖方侧应答与报价事实</td><td>MP3 询盘响应（quote/revise/bid/decline，M5）；报价口径与 Listing <code>pricing</code> 一致（M3）</td><td>MAY（声明 <code>utp.quote</code> 的商户 MUST 按 M5 应答）</td></tr>
        <tr><td>P3 Purchase（Ch.13）</td><td>库存校验、临时 hold、最终锁定；卖方承诺处理</td><td>MP2 库存视图；MP4 受理结论与签名</td><td>MUST</td></tr>
        <tr><td>P4 Pay（Ch.14）</td><td>支付确认、Escrow 释放</td><td>M9 结算账单以 PaymentConfirmation 为对账基准</td><td>MUST</td></tr>
        <tr><td>P5 Fulfill（Ch.15）</td><td><code>notify</code> 推送的事实来源</td><td>MP5 的 Shipment 事件（SHIPPED/DELAYED/妥投回执）</td><td>MUST</td></tr>
        <tr><td>P6 Resolve（Ch.16）</td><td>争议证据</td><td>MP1—MP6 全部凭证（ListingSnapshot、AcceptanceRecord、Shipment、AftersaleRecord）MUST 可纳入 Evidence Bundle；<strong>MP6 售后 MUST 先行于 P6 争议</strong>——售后处置记录（含拒绝原因与举证）是争议阶段的证据基础（M8.2）</td><td>MUST</td></tr>
      </tbody>
    </table>

    <h2 id="s-m18">M1.8 Mode 对供应商侧的影响（Mode Awareness）</h2>
    <p>MP 原语复用主规范六个 Mode 维度（<a href="/documentation/specification/protocol-core/procurement-models.html">Ch.8</a>），不新增维度。</p>
    <p><strong>Mode 默认无关性原则（Mode-Agnostic by Default，规范性裁决）：</strong>MP 原语的操作语义、状态机与错误码<strong>默认不随 Mode 变化</strong>（publish 就是 publish，ship 就是 ship）。Mode 对供应商侧的影响被收敛在三个显式接触点：① <strong>数据要求</strong>（如 pricing_mode 决定价格字段，已由 Schema 条件必填机器化）；② <strong>时限配置</strong>（受理/履约 deadline 取自 Mode 协商的超时配置，4.2.4）；③ <strong>搜索可见性</strong>（supported_mode_range ∩ mode_constraints 过滤，M3.6）。下表是 Mode 影响的<strong>穷尽清单</strong>：本表未列出的行为差异不存在，各原语章不再逐一定义六维行为矩阵，实现方 MUST NOT 自行引入未声明的 Mode 分支。该裁决的目的是把供应商接入复杂度锁定在最小值：<strong>零 Mode 配置即可跑通全流程</strong>（mode_constraints 缺省继承 Profile 全量范围）。</p>
    <table>
      <thead><tr><th>Mode 维度</th><th>对 MP 原语的影响</th></tr></thead>
      <tbody>
        <tr><td><code>pricing_mode</code></td><td><strong>数据要求：</strong>L0：Listing MUST 含固定 <code>unit_price</code>。L1+：Listing MUST 含 <code>pricing_tiers</code>（与主规范 PricingTiers 同构）。L2+：MAY 标记 <code>negotiable: true</code>。<strong>适用性：</strong>L0 时 MP3 询盘响应不适用（询盘不产生、不路由）；L1 时 MP3 SHOULD 按分档价自动报价；L2+ 时 MP3 多轮议价生效，轮次上限取自会话 Mode 配置（M5.8）。</td></tr>
        <tr><td><code>decision_path</code></td><td>L0：MP4 MAY 配置自动接单（M6.8、M11.3）。L2+：MP4 SHOULD 人工或策略确认。</td></tr>
        <tr><td><code>payment_structure</code></td><td>L1+：MP4 <code>accept</code> 响应 MUST 确认 TradeMethod 子步骤可执行；M9 账单按期次拆分。</td></tr>
        <tr><td><code>fulfillment_structure</code></td><td>L1：MP5 <code>ship</code> MUST 携带独立履约服务方的交接信息。L2：MP5 产生的履约事实与凭证 MUST 能够关联到其所属履约阶段，并按阶段责任记录交接信息；是否允许 <code>split</code> 分批由已锁定交易条款决定。</td></tr>
        <tr><td><code>relationship_mode</code></td><td>L2+：框架协议客户的订单路由 SHOULD 携带 <code>framework_agreement_ref</code>，MP4 按协议配额校验；MP3 报价 MUST 引用框架价基线，偏离 MUST 显式标注（M5.8）。</td></tr>
        <tr><td><code>compliance_level</code></td><td>L1+：MP1 <code>publish</code> MUST 附合规资质引用（M3.6），Marketplace MUST 审核。L2+：跨境单证进入 MP5 <code>update</code> 事件流；MP3 报价 SHOULD 声明贸易术语（Incoterms）与单证费用归属（M5.8）。</td></tr>
      </tbody>
    </table>

    <h2 id="s-m19">M1.9 全局状态机边界声明（State Machine Boundary）</h2>
    <p>本规范<strong>不新增任何全局状态</strong>。对照主规范 <a href="/documentation/specification/protocol-core/global-state-machine.html#s-1711">17.1.1 状态枚举</a>：</p>
    <ul>
      <li>Listing 状态机（M3.3）、Shipment 状态机（M7.3）、Acceptance 状态机（M6.3）均为<strong>资源级/原语内部状态</strong>，与 <code>trade_context_id</code>/<code>transaction_id</code> 两个作用域并列存在第三个作用域：<strong>资源作用域（resource scope）</strong>，以 <code>listing_id</code>/<code>shipment_id</code> 等资源标识为生命周期锚点。</li>
      <li>MP 原语<strong>不参与买方侧 DAG 的节点生成</strong>：路径编排（主规范 <a href="/documentation/specification/protocol-core/path-orchestration.html">第 18 章</a>，<code>primitive_dag_skeleton</code>）只编排买方侧 P1—P6；MP 原语是 DAG 节点执行时在供应商侧被触发的对偶动作（订单路由、询盘路由）或供应商自主发起的供给侧动作（发品、库存），因此 MUST NOT 出现在 DAG 骨架中。MP 原语的执行结果只能通过主规范已定义的机制影响全局状态：MP4 的受理结论完成 13.2.3 的"卖方承诺处理"，驱动 <code>SIGNING → PURCHASED</code> 原子迁移；MP5 的发货事实经 <code>fulfill.notify</code> 驱动买方可观测状态机。符合主规范 17.0.1 "Binding Terms、商家内部字段、任意 output 字段和 Evidence 内容不得成为公共迁移条件；这些业务条件必须先由对应原语处理，并通过 P0 标准 Action Response 表达"的约束。</li>
    </ul>

    <h2 id="s-m110">M1.10 通用规则继承（Commons Inheritance）</h2>
    <p>MP 原语 MUST 完整继承主规范 P0 原语通用框架（<a href="/documentation/specification/protocol-core/primitive-framework.html">Ch.10</a>）：</p>
    <ul>
      <li><strong>消息信封：</strong>使用 MessageEnvelope（<a href="/documentation/specification/protocol-core/transport-communication.html#s-411">4.1.1</a>），<code>primitive</code> 字段取值扩展为含 <code>utp.listing</code>、<code>utp.inventory</code>、<code>utp.quote</code>、<code>utp.acceptance</code>、<code>utp.delivery</code>（主规范信封 Schema 的 <code>primitive</code> 枚举扩展为发布协调事项，登记于附录 ME 第 4 项；枚举扩展生效前，处理 MP 原语的实现方 MUST 按本分册声明接受上述取值）。</li>
      <li><strong>签名：</strong>全部写操作 MUST 携带 RFC 9421 请求签名；<code>publish</code>/<code>accept</code>/<code>ship</code> 等产生凭证的操作 MUST 附 Seller ES256 业务签名（JWS）。<strong>业务签名统一规则：</strong>JWS payload MUST 是单一 SHA-256 哈希的十六进制小写串；哈希输入由各操作显式定义（accept → 订单路由提供的 <code>terms_hash</code>；publish → <code>version_hash</code>，M3.2.4；ship/split → <code>shipment_hash</code>/<code>plan_hash</code>，M7.9.1；quote/bid → 主规范 <code>Quote.terms_hash</code>，M5.10.1.1）；对象哈希的 JSON 规范化 MUST 使用 RFC 8785（JCS）。实现方 MUST NOT 自行选择签名覆盖范围。</li>
      <li><strong>操作准入：</strong>Marketplace 处理 MP 写操作前 MUST 按主规范<a href="/documentation/specification/protocol-core/security-trust.html#s-5-trust-profile">第 5 章</a> 5.1 节完成操作准入判定，判定顺序与失败语义同主规范；认证与授权失败 MUST 使用全局错误码（<code>UTP.AUTH_UNAUTHORIZED</code> / <code>UTP.AUTH_FORBIDDEN</code>，10.4.2）。Merchant Agent 代理操作时的 Mandate 要求见 M11.4。</li>
      <li><strong>幂等：</strong>全部写操作 MUST 携带 <code>idempotency_key</code>；重复请求 MUST 返回首次执行的缓存结果。幂等键 MUST 保留不短于 24 小时；同一键携带不同请求体 MUST 返回冲突错误（HTTP 409，不执行）。</li>
      <li><strong>错误响应：</strong>使用主规范 10.4.3 标准错误响应格式；本规范错误码统一登记在<a href="appendices.html#s-mb">附录 MB</a>。</li>
      <li><strong>响应自描述：</strong>遵循主规范 <a href="/documentation/specification/protocol-core/agent-friendly-interface.html">第 19 章</a> 自描述响应原则（19.1）：响应 MUST 携带 <code>valid_next_actions</code>，元素 MUST 为全限定 Action 名（如 <code>utp.acceptance.query</code>；Schema 约束见 <code>primitives/common/valid_next_actions.json</code>）。列表操作的分页 MUST 使用游标语义（<code>cursor</code>/<code>limit</code>，<code>primitives/common/pagination.json</code>）。</li>
      <li><strong>传输绑定支持要求：</strong>MP 原语的 REST Binding 为 MUST（基线，所有 Marketplace 必须提供）；MCP / A2A Binding 为 MAY（面向 Agent 原生接入）；Embedded SDK Binding 不适用于供应商侧（无对应场景，不定义）。供应商只需实现 REST 客户端 + 回调接收端即可完整接入。</li>
    </ul>
