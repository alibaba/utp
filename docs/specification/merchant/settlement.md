---
title: M9 结算与对账
section: merchant
owner: merchant-team
status: review
version: 2026-07-31
format: html
---

<h1 id="s-m9">M9 · 结算与对账（Settlement &amp; Reconciliation）</h1>

    <h2 id="s-m91">M9.1 定位与设计选择（Positioning）</h2>
    <p>平台托管拓扑下，货款通常经 Marketplace（或其委托的 PaymentProcessor/Escrow）代收，再按结算周期与分账规则支付给供应商。本章定义供应商侧结算能力的协议表达。</p>
    <p><strong>设计选择：结算不是新原语，而是 P4 Pay 的只读扩展域。</strong>理由：</p>
    <ol>
      <li>资金转移的协议语义（支付、确认和退款）已由主规范 P4 Pay 完整定义；供应商结算是这些事实的<strong>汇总视图</strong>，不产生新的资金转移语义。</li>
      <li>本章按主规范原语扩展规范（<a href="../protocol-core/primitive-framework.md#s-105-extension-spec">10.5</a>）挂载 <code>utp.pay.settlement</code> 扩展：命名遵循 10.5.2（<code>utp.{primitive}.{extension_domain}</code>），Marketplace 在 Profile 的 <code>utp.primitives["utp.pay"][].extensions</code> 中声明 <code>{ "name": "utp.pay.settlement" }</code>（同主规范 3.3.3 示例中 <code>utp.source.cart</code> 的声明方式）；双方声明兼容版本后扩展生效（10.5.6）。扩展只新增只读操作，不改变 P4 核心语义与状态迁移（10.5.1）。</li>
      <li>差异申报（M9.5）虽是写操作，但其语义是"对账异议登记"，不改变任何支付状态；异议的资金后果 MUST 经 P4 <code>refund</code> 或 P6 Resolve 产生。</li>
    </ol>
    <p>扩展动作：<code>settlement.statement.list</code>、<code>settlement.statement.detail</code>、<code>settlement.entry.query</code>、<code>settlement.discrepancy.submit</code>。调用方向：caller=Seller（Payee），handler=Marketplace（或其 PaymentProcessor）。</p>

    <h2 id="s-m92">M9.2 结算模型（Settlement Model）</h2>
    <h3 id="s-m921">M9.2.1 结算要素</h3>
    <table>
      <thead><tr><th>要素</th><th>说明</th><th>确定时机</th></tr></thead>
      <tbody>
        <tr><td>结算账户</td><td>供应商收款账户引用（脱敏），入驻时登记（M2.4.1 <code>settlement_account</code>）</td><td>入驻；变更需重新验证</td></tr>
        <tr><td>结算周期</td><td><code>T+n</code>（确认收货后 n 日）/ 半月结 / 月结</td><td>入驻时从 Marketplace 公示的账期选项中选择；MUST 在商户协议中签署并可查询</td></tr>
        <tr><td>佣金与费用</td><td>平台佣金率（类目维度）、支付通道费、增值服务费</td><td>商户协议 + 账单逐笔明示</td></tr>
        <tr><td>结算触发条件</td><td>默认：买方 <code>fulfill.receive</code> 确认收货 + 无未决争议；Escrow 拓扑下等价于 Escrow 释放条件（Escrow 角色见主规范 <a href="../protocol-core/business-topology.md#s-922-standard-roles">9.2.2</a>；释放约束见第 14 章 P4，Seller MUST NOT 直接触发资金释放）</td><td>Mode/拓扑锁定时</td></tr>
      </tbody>
    </table>
    <h3 id="s-m922">M9.2.2 结算金额构成不变式</h3>
<pre class="highlight"><code>payable(entry) = gross_amount            // 订单实收（PaymentConfirmation 金额）
               - platform_commission     // 平台佣金
               - channel_fee             // 支付通道费
               - service_fee             // 增值服务费（可为 0）
               ± adjustment              // 争议裁决/补偿指令产生的调整项

不变式：
1. gross_amount MUST 与该 transaction_id 下 PaymentConfirmation 合计一致
2. 每笔扣减项 MUST 有费率依据引用（商户协议条款 ID）
3. adjustment MUST 引用 P6 CompensationOrder 或 P4 refund 凭证
4. Σ(entries.payable) == statement.total_payable
</code></pre>

    <h2 id="s-m93">M9.3 结算条目生命周期（Entry Lifecycle）</h2>
<div class="diagram"><img src="../../assets/diagrams/m-entry-lifecycle.svg" alt="结算条目生命周期：SETTLEABLE 经账单出账至 BILLED、确认后 PAID_OUT；争议冻结 FROZEN 裁决后回归；打款失败 PAYOUT_FAILED 重试" style="max-width: 100%; height: auto;"></div>
    <table>
      <thead><tr><th>状态</th><th>含义</th><th>进入条件</th></tr></thead>
      <tbody>
        <tr><td><code>SETTLEABLE</code></td><td>满足结算触发条件</td><td>收货确认且无未决争议</td></tr>
        <tr><td><code>FROZEN</code></td><td>争议冻结</td><td>关联交易进入 DISPUTED（与 Escrow 冻结语义一致）</td></tr>
        <tr><td><code>BILLED</code></td><td>已列入某期账单</td><td>结算周期出账</td></tr>
        <tr><td><code>PAID_OUT</code></td><td>已打款</td><td>打款成功，附 <code>payout_ref</code> 流水</td></tr>
        <tr><td><code>PAYOUT_FAILED</code></td><td>打款失败</td><td>账户异常等；MUST 通知供应商并重试</td></tr>
      </tbody>
    </table>

    <h2 id="s-m94">M9.4 账单出具与查询（Statements）</h2>
    <ul>
      <li>Marketplace MUST 按结算周期出具 SettlementStatement，并推送回调事件 <code>utp.settlement.statement_issued</code>（M2.6.1）。</li>
      <li>账单 MUST 逐笔可追溯：每个条目 MUST 携带 <code>transaction_id</code>、<code>purchase_id</code>、<code>shipment_id</code>、PaymentConfirmation 引用与费用依据。</li>
      <li>供应商 MAY 在异议期（SHOULD ≥ 7 天）内提交差异申报（M9.5）；异议期满未申报视为确认。</li>
      <li>账单与打款流水 MUST 归档，保存期不低于所在法域的财务凭证要求与争议时效期两者较长者。</li>
    </ul>
    <h3 id="s-m941">M9.4.1 操作与传输绑定</h3>
    <table>
      <thead><tr><th>操作</th><th>语义</th><th>REST</th><th>MCP Tool</th></tr></thead>
      <tbody>
        <tr><td><code>utp.pay.settlement.statement.list</code></td><td>账单列表（按周期/状态筛选，分页）</td><td><code>GET /utp/m/v1/settlements/statements</code></td><td><code>utp_pay_settlement_statement_list</code></td></tr>
        <tr><td><code>utp.pay.settlement.statement.detail</code></td><td>单期账单全量条目</td><td><code>GET /utp/m/v1/settlements/statements/{statement_id}</code></td><td><code>utp_pay_settlement_statement_detail</code></td></tr>
        <tr><td><code>utp.pay.settlement.entry.query</code></td><td>按交易维度查结算条目</td><td><code>GET /utp/m/v1/settlements/entries?transaction_id=</code></td><td><code>utp_pay_settlement_entry_query</code></td></tr>
        <tr><td><code>utp.pay.settlement.discrepancy.submit</code></td><td>差异申报</td><td><code>POST /utp/m/v1/settlements/statements/{statement_id}/discrepancies</code></td><td><code>utp_pay_settlement_discrepancy_submit</code></td></tr>
      </tbody>
    </table>
    <p>A2A Task 命名遵循 <code>utp:pay:settlement:{...}</code>。查询类操作 MUST NOT 改变任何状态；<code>discrepancy.submit</code> 仅登记异议，资金后果走 P4/P6。</p>

    <h2 id="s-m95">M9.5 对账闭环与差异处理（Reconciliation Loop）</h2>
<div class="diagram"><img src="../../assets/diagrams/m-reconciliation-loop.svg" alt="对账闭环：三方核对后一致确认、不一致逐条差异申报，平台 SLA 内答复更正或维持，仍有异议升级 P6 Resolve" style="max-width: 100%; height: auto;"></div>
    <p>差异申报 MUST 引用具体 <code>entry_id</code> 并附证据引用（ERP 单据、收货凭证等）；Marketplace 的答复与更正 MUST 生成新账单版本（旧版本保留），全部过程纳入审计记录。</p>

    <h2 id="s-m96">M9.6 实体定义（Entities）</h2>
    <h3 id="s-m961">M9.6.1 SettlementStatement</h3>
    <table>
      <thead><tr><th>字段名</th><th>类型</th><th>必填</th><th>描述</th></tr></thead>
      <tbody>
        <tr><td><code>statement_id</code></td><td>string</td><td>是</td><td>账单唯一标识。</td></tr>
        <tr><td><code>merchant_id</code></td><td>string</td><td>是</td><td>供应商标识。</td></tr>
        <tr><td><code>period</code></td><td>object</td><td>是</td><td>结算周期（<code>from</code> / <code>to</code>，ISO-8601）。</td></tr>
        <tr><td><code>version</code></td><td>integer</td><td>是</td><td>账单版本（差异更正递增）。</td></tr>
        <tr><td><code>entries</code></td><td>SettlementEntry[]</td><td>是</td><td>结算条目列表。</td></tr>
        <tr><td><code>total_gross</code> / <code>total_fees</code> / <code>total_payable</code></td><td>Money</td><td>是</td><td>汇总金额；MUST 满足 M9.2.2 不变式。</td></tr>
        <tr><td><code>status</code></td><td>enum</td><td>是</td><td><code>ISSUED</code> / <code>CONFIRMED</code> / <code>IN_DISPUTE</code> / <code>PAID_OUT</code>。</td></tr>
        <tr><td><code>dispute_deadline</code></td><td>ISO-8601</td><td>是</td><td>异议截止时间。</td></tr>
        <tr><td><code>payout_ref</code></td><td>string</td><td>否</td><td>打款流水引用（<code>PAID_OUT</code> 后必有）。</td></tr>
        <tr><td><code>issuer_signature</code></td><td>string</td><td>是</td><td>Marketplace ES256 签名（JWS），覆盖账单哈希。</td></tr>
      </tbody>
    </table>
    <h3 id="s-m962">M9.6.2 SettlementEntry</h3>
    <table>
      <thead><tr><th>字段名</th><th>类型</th><th>必填</th><th>描述</th></tr></thead>
      <tbody>
        <tr><td><code>entry_id</code></td><td>string</td><td>是</td><td>条目唯一标识。</td></tr>
        <tr><td><code>transaction_id</code> / <code>purchase_id</code></td><td>string</td><td>是</td><td>关联交易与订购。</td></tr>
        <tr><td><code>shipment_id</code></td><td>string</td><td>否</td><td>关联发货单（分批或多阶段付款时定位阶段）。</td></tr>
        <tr><td><code>payment_confirmation_ref</code></td><td>string</td><td>是</td><td>PaymentConfirmation 引用（主规范 25.x pay Schema）。</td></tr>
        <tr><td><code>gross_amount</code></td><td>Money</td><td>是</td><td>订单实收金额。</td></tr>
        <tr><td><code>fees</code></td><td>array</td><td>是</td><td>扣减项数组 <code>{type, amount, basis_ref}</code>；<code>basis_ref</code> 引用商户协议条款。</td></tr>
        <tr><td><code>adjustments</code></td><td>array</td><td>否</td><td>调整项数组 <code>{direction, amount, order_ref}</code>；<code>direction</code> 枚举 <code>credit</code>（增加应结）/ <code>debit</code>（减少应结），<code>amount</code> 恒为非负 Money，方向由 <code>direction</code> 表达；<code>order_ref</code> 引用 CompensationOrder 或退款凭证。</td></tr>
        <tr><td><code>payable_amount</code></td><td>Money</td><td>是</td><td>应结金额。</td></tr>
        <tr><td><code>status</code></td><td>enum</td><td>是</td><td>M9.3 条目状态枚举。</td></tr>
      </tbody>
    </table>
    <h3 id="s-m963">M9.6.3 SettlementDiscrepancy</h3>
    <table>
      <thead><tr><th>字段名</th><th>类型</th><th>必填</th><th>描述</th></tr></thead>
      <tbody>
        <tr><td><code>discrepancy_id</code></td><td>string</td><td>是</td><td>差异申报唯一标识。</td></tr>
        <tr><td><code>statement_id</code> / <code>entry_id</code></td><td>string</td><td>是</td><td>关联账单与条目。</td></tr>
        <tr><td><code>type</code></td><td>enum</td><td>是</td><td><code>gross_mismatch</code> / <code>fee_mismatch</code> / <code>entry_missing</code> / <code>should_be_settleable</code> / <code>wrongly_frozen</code> / <code>adjustment_dispute</code>。</td></tr>
        <tr><td><code>expected</code> / <code>actual</code></td><td>object</td><td>是</td><td>期望值与账单值对照。</td></tr>
        <tr><td><code>evidence_refs</code></td><td>array</td><td>是</td><td>证据引用列表。</td></tr>
        <tr><td><code>status</code></td><td>enum</td><td>是</td><td><code>SUBMITTED</code> / <code>ACCEPTED</code>（账单更正）/ <code>MAINTAINED</code>（维持并说明）/ <code>ESCALATED</code>（升级 Resolve）。</td></tr>
        <tr><td><code>seller_signature</code></td><td>string</td><td>是</td><td>Seller ES256 签名。</td></tr>
        <tr><td><code>submitted_at</code></td><td>ISO-8601</td><td>是</td><td>提交时间。</td></tr>
      </tbody>
    </table>

    <h2 id="s-m97">M9.7 错误码（Error Codes）</h2>
    <table>
      <thead><tr><th>错误码</th><th>HTTP</th><th>描述</th><th>建议处理</th></tr></thead>
      <tbody>
        <tr><td><code>SETTLEMENT.UNSUPPORTED</code></td><td>404</td><td>Marketplace 未声明 <code>settlement</code> 扩展域。</td><td>回退为线下对账。</td></tr>
        <tr><td><code>SETTLEMENT.STATEMENT_NOT_FOUND</code></td><td>404</td><td>账单不存在或无权访问。</td><td>校验 <code>statement_id</code>。</td></tr>
        <tr><td><code>SETTLEMENT.DISCREPANCY_WINDOW_CLOSED</code></td><td>410</td><td>异议期已过。</td><td>后续期次核对或走 Resolve。</td></tr>
        <tr><td><code>SETTLEMENT.DISCREPANCY_EVIDENCE_REQUIRED</code></td><td>400</td><td>差异申报缺少证据引用。</td><td>补充证据。</td></tr>
        <tr><td><code>SETTLEMENT.LIST_EMPTY</code></td><td>200</td><td>无匹配账单（info，非错误）。</td><td>调整筛选条件。</td></tr>
      </tbody>
    </table>

    <h2 id="s-m98">M9.8 Scope 与授权</h2>
    <table>
      <thead><tr><th>Scope</th><th>类型</th><th>描述</th><th>默认分配</th></tr></thead>
      <tbody>
        <tr><td><code>pay:settlement:read</code></td><td>Data Scope</td><td>账单与条目查询（list/detail/entry.query）。</td><td>Seller（Payee）角色，仅本方数据</td></tr>
        <tr><td><code>pay:settlement:discrepancy</code></td><td>Action Scope</td><td>提交差异申报。</td><td>Seller（Payee）角色</td></tr>
      </tbody>
    </table>
    <p>结算数据含资金敏感信息：服务端 MUST 仅返回调用方本方数据；Merchant Agent 访问结算数据 MUST 持有覆盖 <code>pay:settlement:read</code> 的显式授权（M11.4），且 SHOULD 在授权中单列（不随经营类 Scope 默认捆绑）。</p>

    <hr />
    <h2 id="s-m99">M9.9 打款动作（Payout）</h2>
    <p>打款是资金流的最后一跳：平台（代收主体，经 PaymentProcessor）将已确认账单的 <code>total_payable</code> 打至供应商收款账户。<strong>协议定位：打款不是新原语</strong>——它是 P4 Pay（意图：执行资金转移）在结算扩展 <code>utp.pay.settlement</code> 内的<strong>平台驱动 Action</strong>，对应条目生命周期（M9.3）的 <code>BILLED → PAID_OUT</code> 迁移；在全局 DAG 中挂接在买方确认收货（P5 receive）与账单确认之后，作为交易闭环的收尾节点。</p>
    <table>
      <thead><tr><th>要素</th><th>规定</th></tr></thead>
      <tbody>
        <tr><td>触发条件</td><td>账单 <code>CONFIRMED</code>（供应商确认或异议期满自动确认）且条目非 <code>FROZEN</code>。打款 MUST 由平台驱动，供应商无可调用的打款 Action（只读观测）。</td></tr>
        <tr><td>执行语义</td><td>每次打款 MUST 生成 <code>PayoutInstruction</code>（含 <code>statement_id</code>、金额、收款账户摘要、发起时间）；成功后 MUST 回写 <code>payout_ref</code>（支付渠道流水）并推送 <code>utp.settlement.paid</code> 回调；失败进入 <code>PAYOUT_FAILED</code>，MUST 通知供应商并重试（M9.3）。</td></tr>
        <tr><td>金额不变式</td><td><code>payout.amount == statement.total_payable</code>（分次打款 MAY，但 Σ 打款 MUST 等于账单应付，每笔均需独立 <code>payout_ref</code>）。</td></tr>
        <tr><td>可追溯性</td><td><code>payout_ref</code> MUST 可关联到账单、条目与原始 PaymentConfirmation，构成“买方付款 → 平台代收 → 平台打款”的完整资金证据链，纳入 Evidence Bundle 供 P6 争议举证。</td></tr>
        <tr><td>拓扑适用</td><td>仅平台代收模式（escrow/担保交易）适用；买卖直付（买方直接付至卖方账户）无打款环节，结算仅剩对账职能。</td></tr>
      </tbody>
    </table>
