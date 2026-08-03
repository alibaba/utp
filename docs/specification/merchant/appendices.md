---
title: UTP-M 附录（MA—MF）
section: merchant
owner: merchant-team
status: review
version: 2026-07-30
format: html
---

<h1 id="s-m-appendices">UTP-M 附录（Appendices）</h1>

    <h2 id="s-ma">附录 MA：术语表（Glossary）</h2>
    <p>以下术语为 UTP-M 新增，与主规范附录 A 术语表（术语的唯一权威来源）共用同一命名空间，不与既有术语冲突；合并登记路线见附录 ME 第 12 项。</p>
    <table>
      <thead><tr><th>术语</th><th>英文</th><th>定义</th><th>定义位置</th></tr></thead>
      <tbody>
        <tr><td>供应商侧规范</td><td>Merchant-Side Specification（UTP-M）</td><td>一组 <code>initiator_role = Seller</code> 的原语与供应商运营规范的编辑分组名称；不构成角色方向的推断依据。</td><td>M1.1</td></tr>
        <tr><td>平台方</td><td>Marketplace</td><td>托管商品目录与订单路由的 UTP Server 运营方角色，MP1—MP5 原语的 handler_role。</td><td>M1.3.1</td></tr>
        <tr><td>询盘路由</td><td>Inquiry Routing</td><td>Marketplace 将买方 P2 询盘定向推送给声明 <code>utp.quote</code> 商户的回调事件；MP3 应答任务的起点。</td><td>M5.7</td></tr>
        <tr><td>报价记录</td><td>QuoteRecord</td><td>供应商对询盘的签名应答存档（报价/谢绝，含轮次与版本）；纳入协商 Evidence Bundle。</td><td>M5.10.1</td></tr>
        <tr><td>打款</td><td>Payout</td><td>平台将已确认账单应付金额打至供应商收款账户的平台驱动动作（P4 结算扩展内，非原语）。</td><td>M8.9</td></tr>
        <tr><td>商品档案</td><td>Listing</td><td>供应商发布到 Marketplace 的商品/服务标准结构，含 SKU、定价、履约条款；MP1 的核心实体。</td><td>M3.9.1</td></tr>
        <tr><td>商品发布</td><td>Publish</td><td>创建商品档案并进入平台审核的动作（<code>utp.listing.publish</code>）。</td><td>M3.7.1</td></tr>
        <tr><td>上架</td><td>List</td><td>使审核通过的商品进入可搜索、可订购状态（<code>LISTED</code>）的动作。</td><td>M3.7.1</td></tr>
        <tr><td>下架</td><td>Delist</td><td>使商品原子退出可搜索、可订购范围的动作；不影响既有订单义务。</td><td>M3.7.1 / M3.2.3</td></tr>
        <tr><td>版本快照</td><td>ListingSnapshot</td><td>商品每次生效版本的规范化存档，以 <code>version_hash</code> 被订单条款快照引用。</td><td>M3.9.5</td></tr>
        <tr><td>可售数量</td><td>Available</td><td>供应商声明的渠道可售总量，MP2 的权威写入值。</td><td>M4.2</td></tr>
        <tr><td>可下单量</td><td>Sellable</td><td>派生只读值：<code>available − Σ(active_holds)</code>。</td><td>M4.2</td></tr>
        <tr><td>库存占用</td><td>Inventory Hold</td><td>P3 交易触发的临时（HELD）或最终（LOCKED）数量占用记录，供应商只读核验。</td><td>M4.9.3</td></tr>
        <tr><td>订单路由</td><td>Order Routing</td><td>Marketplace 将待受理订购推送给供应商的回调事件。</td><td>M6.7</td></tr>
        <tr><td>受理结论</td><td>Acceptance Conclusion</td><td>供应商对路由订单的签名结论：ACCEPTED / REJECTED / LEADTIME_AMENDED。</td><td>M6.10.1</td></tr>
        <tr><td>受理策略</td><td>AcceptancePolicy</td><td>Principal 签名的自动接单策略配置，自动决策的授权书面化。</td><td>M10.3.1</td></tr>
        <tr><td>发货凭证</td><td>Shipment</td><td>供应商签名的发货事实凭证（承运商、运单、包裹明细、批次）。</td><td>M7.9.1</td></tr>
        <tr><td>批次</td><td>Batch</td><td>分批交付场景下的独立交付单元，独立走发货状态机。</td><td>M7.2.1</td></tr>
        <tr><td>结算账单</td><td>SettlementStatement</td><td>Marketplace 按结算周期出具的签名账单，逐笔可追溯到交易与支付凭证。</td><td>M8.6.1</td></tr>
        <tr><td>差异申报</td><td>Settlement Discrepancy</td><td>供应商对账单条目的结构化异议登记；资金后果经 P4/P6 产生。</td><td>M8.6.3</td></tr>
        <tr><td>商户桥接器</td><td>Merchant Bridge</td><td>连接供应商内部系统（ERP/WMS）与 UTP-M 原语的集成组件。</td><td>M9.1</td></tr>
        <tr><td>供应商代理</td><td>Merchant Agent</td><td>代表供应商 Principal 自主执行经营决策的 AI Agent；协议层以 Seller 身份出现。</td><td>M10.1</td></tr>
        <tr><td>渠道配额</td><td>Channel Quota</td><td>ERP 分配给单一销售渠道的库存份额；平台 <code>available</code> 是其镜像。</td><td>M9.5</td></tr>
        <tr><td>资源作用域</td><td>Resource Scope</td><td>与交易上下文/交易生命周期并列的第三个状态作用域，以资源标识（listing_id 等）为生命周期锚点。</td><td>M1.9</td></tr>
        <tr><td>Handler 执行模式</td><td>Delegation Mode</td><td>平台托管拓扑下卖方应答义务（P2/P6）的两种执行方式：<code>direct</code>（平台代答）与 <code>passthrough</code>（透传商家回调）；对买方透明，超时必有兜底。</td><td>M1.4.4</td></tr>
        <tr><td>商品级 Mode 收窄</td><td>mode_constraints</td><td>Listing 上对商户 Profile Mode 范围的商品级子集声明，驱动 Source 搜索可见性过滤（“能被搜到即可被履约”）。</td><td>M3.9.1 / M3.6</td></tr>
      </tbody>
    </table>

    <h2 id="s-mb">附录 MB：错误码总表（Error Code Registry）</h2>
    <p>UTP-M 错误码沿用主规范 <code>PRIMITIVE.ACTION.REASON</code> 命名与标准错误响应格式（主规范 10.4.3），与主规范附录 B 错误码总表共用同一注册表体系（<code>registries/error-codes.registry.json</code>）；合并登记路线见附录 ME 第 12 项。</p>
    <table>
      <thead><tr><th>错误码空间</th><th>数量</th><th>定义位置</th><th>代表条目</th></tr></thead>
      <tbody>
        <tr><td><code>LISTING.*</code></td><td>15</td><td><a href="primitives/listing/index.html#s-m33">M3.3</a></td><td><code>LISTING.PUBLISH.MERCHANT_NOT_ACTIVE</code>、<code>LISTING.PUBLISH.INGEST_FAILED</code>、<code>LISTING.UPDATE.VERSION_CONFLICT</code>、<code>LISTING.LIST.NOT_REVIEWED</code>、<code>LISTING.ARCHIVE.OPEN_ORDERS</code></td></tr>
        <tr><td><code>INVENTORY.*</code></td><td>7</td><td><a href="primitives/inventory/index.html#s-m43">M4.3</a></td><td><code>INVENTORY.REVISION_CONFLICT</code>、<code>INVENTORY.NEGATIVE_RESULT</code>、<code>INVENTORY.HOLD_NOT_FOUND</code></td></tr>
        <tr><td><code>ACCEPTANCE.*</code></td><td>8</td><td><a href="primitives/acceptance/index.html#s-m63">M6.3</a></td><td><code>ACCEPTANCE.EXPIRED</code>、<code>ACCEPTANCE.SIGNATURE_INVALID</code>、<code>ACCEPTANCE.AMEND.OUT_OF_RANGE</code></td></tr>
        <tr><td><code>SHIPMENT.*</code></td><td>8</td><td><a href="primitives/shipment/index.html#s-m73">M7.3</a></td><td><code>SHIPMENT.PAYMENT_PRECONDITION</code>、<code>SHIPMENT.QUANTITY_MISMATCH</code>、<code>SHIPMENT.SPLIT_NOT_ALLOWED</code></td></tr>
        <tr><td><code>SETTLEMENT.*</code></td><td>5</td><td><a href="settlement.html#s-m87">M8.7</a></td><td><code>SETTLEMENT.DISCREPANCY_WINDOW_CLOSED</code>、<code>SETTLEMENT.STATEMENT_NOT_FOUND</code></td></tr>
      </tbody>
    </table>
    <p><strong>与主规范既有错误码的触发闭环：</strong><code>SOURCE.LOOKUP.ITEM_NOT_FOUND</code> 与 <code>PURCHASE.CREATE.INVALID_ITEMS</code>（"商品已下架"）的触发源由 MP1 <code>delist</code>/<code>archive</code> 正式定义（M3.2.3）；<code>PURCHASE.COMPLETE.INVENTORY_UNAVAILABLE</code> 的供给侧对应为 <code>ACCEPTANCE.INVENTORY_INSUFFICIENT</code>。</p>

    <h2 id="s-mc">附录 MC：Scope 总表（Scope Registry）</h2>
    <table>
      <thead><tr><th>Scope</th><th>类型</th><th>原语/扩展</th><th>定义位置</th></tr></thead>
      <tbody>
        <tr><td><code>listing</code> / <code>inventory</code> / <code>acceptance</code> / <code>shipment</code> / <code>quote</code></td><td>Primitive 级聚合</td><td>MP1—MP5（Profile <code>primitives[].authorization.scope</code> 声明用，蕴含该原语全部 Action Scope）</td><td>M2.3</td></tr>
        <tr><td><code>listing:publish</code> / <code>listing:update</code> / <code>listing:list</code> / <code>listing:delist</code> / <code>listing:query</code> / <code>listing:archive</code></td><td>Action</td><td>MP1 <code>utp.listing</code></td><td>M3.4</td></tr>
        <tr><td><code>inventory:set</code> / <code>inventory:adjust</code> / <code>inventory:query</code> / <code>inventory:hold:query</code></td><td>Action</td><td>MP2 <code>utp.inventory</code></td><td>M4.4</td></tr>
        <tr><td><code>quote:quote</code> / <code>quote:revise</code> / <code>quote:bid</code> / <code>quote:decline</code> / <code>quote:query</code></td><td>Action</td><td>MP3 <code>utp.quote</code>（草案）</td><td>M5.4</td></tr>
        <tr><td><code>acceptance:accept</code> / <code>acceptance:reject</code> / <code>acceptance:hold</code> / <code>acceptance:amend</code> / <code>acceptance:query</code></td><td>Action</td><td>MP4 <code>utp.acceptance</code></td><td>M6.4</td></tr>
        <tr><td><code>shipment:prepare</code> / <code>shipment:ship</code> / <code>shipment:split</code> / <code>shipment:update</code> / <code>shipment:query</code></td><td>Action</td><td>MP5 <code>utp.shipment</code></td><td>M7.4</td></tr>
        <tr><td><code>pay:settlement:read</code></td><td>Data</td><td><code>utp.pay.settlement</code> 扩展</td><td>M8.8</td></tr>
        <tr><td><code>pay:settlement:discrepancy</code></td><td>Action</td><td><code>utp.pay.settlement</code> 扩展</td><td>M8.8</td></tr>
      </tbody>
    </table>
    <p>全部 Scope 仅作用于调用方本方资源；Merchant Agent 持有的授权 MUST 显式枚举 Scope 并声明金额上限与时效（M10.4）。</p>

    <h2 id="s-md">附录 MD：Schema 索引（Schema Index）</h2>
    <p>UTP-M 的机器可读 Schema 与买方侧原语 Schema <strong>同仓同标准</strong>（JSON Schema draft 2020-12）：每个原语一个目录，<code>primitive.json</code> 承载 Action 定义与内部状态机，<code>entities/</code> 下每个实体与每个操作的输入/输出各一个文件；<code>$id</code> 权威地址前缀为 <code>https://ut-protocol.com/schemas/</code>。通用类型（Money、LineItem、Price、TradeMode、Signature、EvidenceReference、Address 等）MUST 复用 <code>primitives/common/entities/</code>，MUST NOT 在商家侧重复定义；分页 MUST 复用 <code>primitives/common/pagination.json</code>（游标语义），响应导航 MUST 复用 <code>primitives/common/valid_next_actions.json</code>（全限定 Action 名）。</p>
    <table>
      <thead><tr><th>范围</th><th>Schema 位置（<code>schemas/</code>）</th><th>说明</th></tr></thead>
      <tbody>
        <tr><td>MP1 商品管理</td><td><code>primitives/listing/primitive.json</code> + <code>primitives/listing/entities/</code></td><td>Listing、Sku、Pricing、FulfillmentTerms、ListingSnapshot、SourceMaterials 与各操作 <code>*_input</code>/<code>*_output</code>（M3）</td></tr>
        <tr><td>MP2 库存管理</td><td><code>primitives/inventory/primitive.json</code> + <code>entities/</code></td><td>InventoryRecord、Adjustment、Hold 与 set/adjust/query/batch 输入输出（M4）</td></tr>
        <tr><td>MP3 询盘响应（草案）</td><td><code>primitives/quote/primitive.json</code> + <code>entities/</code></td><td>QuoteRecord、DeclineReason 与 quote/decline 输入输出；<strong>报价体复用 <code>primitives/negotiate/entities/quote.json</code>（主规范权威 Quote 实体）</strong>（M5）</td></tr>
        <tr><td>MP4 订单受理</td><td><code>primitives/acceptance/primitive.json</code> + <code>entities/</code></td><td>OrderRouting、AcceptanceRecord、RejectReason 与 accept/reject/hold/amend 输入输出（M6）</td></tr>
        <tr><td>MP5 发货执行</td><td><code>primitives/shipment/primitive.json</code> + <code>entities/</code></td><td>Shipment、Package、SplitPlan、Event 与 prepare/ship/split/update 输入输出（M7；与主规范 Fulfill 侧 Shipment 的合并见 ME 第 7 项）</td></tr>
        <tr><td>入驻与回调、结算（非原语）</td><td><code>merchant/entities/</code></td><td>MerchantRegistration、DelegationPolicy、AcceptancePolicy、回调 Envelope 与各事件载荷（M2.6）、SettlementStatement/Entry/Discrepancy（M8）——非原语能力，与 <code>discovery/</code>、<code>transport/</code> 同级安置</td></tr>
      </tbody>
    </table>
    <p>状态机的机器可读定义内嵌于各 <code>primitive.json</code> 的 <code>state_machine</code>（<code>scope: resource</code>，以 <code>listing_id</code>/<code>inquiry_id</code>/<code>routing_id</code>/<code>shipment_id</code> 为资源键），与正文各章状态机表逐条一致；Action 迁移以全限定名（<code>utp.acceptance.accept</code>）表达，外部与系统事件以 <code>event</code> 字段表达。</p>

    <h2 id="s-me">附录 ME：与主规范的章节对应与整合路线（Integration Map，资料性）</h2>
    <p>本附录为<strong>资料性（Informative）</strong>：给出商家侧分册各章与主规范章节体系的对应位置，以及 MP 原语升入主规范正式章节序列（需 RFC 治理流程）时的联动修改清单。对应关系的落地与否不影响本分册条款的规范效力；若执行整合，MUST 遵循主规范 README 第 3 节新增章节流程与第 4 节全局一致性检查。</p>
    <table>
      <thead><tr><th>#</th><th>本规范内容</th><th>整合目标</th><th>联动修改</th></tr></thead>
      <tbody>
        <tr><td>1</td><td>M1 架构总览</td><td>并入主规范 Ch.2（架构总览新增"供应商侧视图"小节）+ Ch.9（角色）</td><td>architecture.html 六层图补充供应商侧调用方向</td></tr>
        <tr><td>2</td><td>Marketplace 角色（M1.3.1）</td><td>主规范 9.2.2 R2 标准角色表（走 RFC 治理流程；过渡期 R3 <code>marketplace.Marketplace</code>，9.2.5）</td><td>topology.html 角色表、加入规则表、RoleDefinition 示例；<code>registries/roles.registry.json</code></td></tr>
        <tr><td>3</td><td>M2 入驻与能力声明</td><td>新章节（建议插在 Ch.3 发现与协商之后，作为"商户接入"章）</td><td>全部 26 个页面 sidebar + 编号 +1 联动；discovery.html 3.3 Profile 增补 <code>dev.utp.merchant_callback</code> Service 说明</td></tr>
        <tr><td>4</td><td>M3 MP1 / M4 MP2 / M5 MP3 / M6 MP4 / M7 MP5 五个原语章</td><td>交易原语组新增五章（P0 通用框架之后、或独立"供应商原语"分组）</td><td>index.html 目录表与统计；治理侧发布五个 <code>PrimitiveDefinition</code>；MessageEnvelope <code>primitive</code> 枚举扩展（transport.html 4.1.1 + schemas.html 24.4 两处）</td></tr>
        <tr><td>4a</td><td>MP3 与 P2 对偶（M5.6）</td><td>primitive-negotiate.html 增补"卖方侧应答经 utp.quote 完成"的规范通道说明（平台托管拓扑）</td><td>negotiation_id 上下文共享、Quote 实体复用与 terms_hash 计算规则（M5.10.1.1）的双向交叉引用</td></tr>
        <tr><td>4b</td><td>MP3 <code>revise</code> 的第二跳表达（M5.6.3 第 4 项）</td><td><code>primitives/negotiate/state_machine.json</code> 增补 <code>QUOTED --utp.negotiate.quote--&gt; QUOTED</code> 自环（修订报价的重复交付），或在 <code>constraints</code> 中明确“同一 inquiry 的后续 quote 视为版本更新、不改变协商状态”</td><td>本分册 M5.6.3 已声明当前处理方式；主规范补充后引用即可，MP3 语义不变</td></tr>
        <tr><td>5</td><td>MP4 与 P3 衔接（M6.6）</td><td>primitive-purchase.html 13.5.2 / 13.8.1 增补"卖方承诺处理经 utp.acceptance 完成"的规范通道说明</td><td>13.6.2 自动承诺处理脚注指向 AcceptancePolicy</td></tr>
        <tr><td>6</td><td>MP2 与 P3 库存契约（M4.7）</td><td>primitive-purchase.html 13.5.2（锁定库存职责）与 state-machine.html required_evidence 说明处增加交叉引用</td><td>inventory_receipt / inventory_release_receipt 的生成来源注明 InventoryHold</td></tr>
        <tr><td>7</td><td>MP5 与 P5 事实传导（M7.7）</td><td>primitive-fulfill.html 15.7.1（notify 的事实来源）增加交叉引用。<strong>历史不一致已修复</strong>：主规范早期版本中 topology/scenarios 引用的未定义操作 <code>fulfill.ship</code> 已全部清除，发货事实的唯一产生通道即 <code>utp.shipment.ship</code>（MP5），Ch.15 保持纯买方视角</td><td>fulfill/shipment 两个 Shipment Schema 合并为单一权威定义</td></tr>
        <tr><td>8</td><td>M8 结算扩展</td><td>primitive-pay.html 新增"settlement 扩展"小节（按 10.5 扩展规范格式）</td><td>Profile <code>primitives[].extensions</code> 声明说明；错误码表</td></tr>
        <tr><td>9</td><td>M9 ERP Bridge</td><td>compatibility.html（Ch.22）新增"供应商侧 Bridge"小节</td><td>与既有 Bridge/Adapter 模式图并列</td></tr>
        <tr><td>10</td><td>M10 Merchant Agent 与 HAI</td><td>human-agent-interaction.html（Ch.20）新增供应商侧控制点小节；identity.html（Ch.6）授权链示例增补</td><td>AcceptancePolicy 作为授权书面化的示例</td></tr>
        <tr><td>11</td><td>M11 全链路演练</td><td>scenarios.html（Ch.21）新增"供应商侧全链路"场景，或独立章与 Ch.24 并列互链</td><td>与 procurement-walkthrough.html 互为镜像的交叉引用</td></tr>
        <tr><td>12</td><td>附录 MA/MB/MC/MD</td><td>并入主规范附录 A（术语）/ B（错误码）/ Schema 索引（Ch.25 + 附录 D.8）</td><td>registries 三个注册表文件同步</td></tr>
        <tr><td>13</td><td>回调事件注册表（M2.6.1）</td><td>transport.html 4.3 异步通信增补"供应商侧事件类型"表</td><td>—</td></tr>
      </tbody>
    </table>
    <blockquote><p>整合原则重申：全部新增字段 OPTIONAL（向后兼容）；不改变任何既有 MUST/SHOULD/MAY 等级；不修改既有锚点 ID；MessageEnvelope 枚举扩展属于"只增不删"的兼容变更。</p></blockquote>

    <h2 id="s-mf">附录 MF：开放问题（Open Issues）</h2>
    <table>
      <thead><tr><th>#</th><th>问题</th><th>当前 RC 立场</th><th>待决策方</th></tr></thead>
      <tbody>
        <tr><td>1</td><td>Marketplace 进入 R2 核心角色集还是保持 R3 领域角色？</td><td>目标 R2（多数平台托管场景默认需要），过渡期 R3 试点</td><td>RFC 治理流程（≥3 个独立实现方支持）</td></tr>
        <tr><td>2</td><td><code>fulfill.ship</code> 的既有不一致（ME 第 7 项）</td><td><strong>已解决</strong>：主规范已清除全部 <code>fulfill.ship</code> 残留，Ch.15 保持纯买方视角，发货动作统一由 <code>utp.shipment.ship</code> 承载</td><td>已闭环（保留备忘）</td></tr>
        <tr><td>3</td><td>MP1 与 MP2 是否合并为单一原语？</td><td>保持分离（变更频率、授权粒度、限流特征差异大；见 M1.5 正交性检查）</td><td>整合评审</td></tr>
        <tr><td>4</td><td>多仓（<code>warehouse_id</code>）与区域库存的 Source 投影规则</td><td>本版仅预留字段，投影规则未定义（Experimental）</td><td>后续版本</td></tr>
        <tr><td>5</td><td>竞价商品（pricing L3）的供应商侧竞价管理动作</td><td>未覆盖（Listing 仅承载起拍价与截止时间）</td><td>后续版本</td></tr>
        <tr><td>6</td><td>逆向物流（退货执行）的供应商侧原语化</td><td>本版由 P6 CompensationOrder 驱动、实现层执行；不原语化</td><td>视 P6 演进</td></tr>
        <tr><td>7</td><td>Marketplace 联邦（一个供应商多平台分发）的目录同步标准</td><td>由供应商 Bridge 自行多路复用 MP 原语；不定义平台间同步</td><td>生态成熟后评估</td></tr>
        <tr><td>8</td><td>履约卖家视角（妥投确认响应、拒收处理、逆向物流协同）扩展 MP5 还是独立原语？</td><td>2026-07-30 会议：M 侧目标六原语（四个 + 询盘 + 履约）；本分册立场为扩展 MP5（发货即履约的卖家半边，硬拆违反正交性），MP3 询盘响应已本版落地</td><td>M 侧专项会</td></tr>
        <tr><td>9</td><td>入驻（M2）与结算（M8）是否原语化？</td><td>2026-07-30 会议结论：均不原语化——入驻是准入基础设施（Profile 自指悖论），结算是协议事实的簿记视图；打款作为 P4 结算扩展内的平台驱动 Action 已补定义（M8.9）</td><td>已裁决（M 侧专项会可复议）</td></tr>
      </tbody>
    </table>
