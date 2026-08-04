---
title: M5 MP3 报价原语
section: merchant
owner: merchant-team
status: review
version: 2026-07-30
format: html
---

<h1 id="s-m5">M5 · MP3 报价原语（Quote）</h1>
    <h2 id="s-m5-toc">目录</h2>
    <ul>
      <li><a href="#s-m51">M5.1 Overview（概述）</a></li>
      <li><a href="#s-m52">M5.2 Lifecycle / State Machine（生命周期 / 状态机）</a></li>
      <li><a href="#s-m53">M5.3 Error Handling（错误处理）</a></li>
      <li><a href="#s-m54">M5.4 Scopes（权限范围）</a></li>
      <li><a href="#s-m55">M5.5 Guidelines（角色职责指引）</a></li>
      <li><a href="#s-m56">M5.6 与 P2 询盘原语的衔接</a></li>
      <li><a href="#s-m57">M5.7 询盘路由（Inquiry Routing）</a></li>
      <li><a href="#s-m58">M5.8 Mode-Driven Behavior（模式驱动行为）</a></li>
      <li><a href="#s-m59">M5.9 Operations 与 Transport Bindings</a></li>
      <li><a href="#s-m510">M5.10 Entities（实体定义）</a></li>
      <li><a href="#s-m511">M5.11 Use Case Walkthroughs（用例演练）</a></li>
    </ul>
    <hr />
    <h2 id="s-m5-identity">原语身份</h2>
<pre class="highlight"><code>primitive_id:   utp.quote
version:        2026-07-30
status:         draft（本原语为 2026-07-30 草案新增；既有四原语 MP1/MP2/MP4/MP5 的稳定性承诺不受影响）
initiator_role: Seller
handler_role:   Marketplace
intent:         供应商对路由到达的买方询盘给出可核验的报价/应答（报价/修订/投标/谢绝）
state_delta:    inquiry_routed → quote_record（资源作用域）
actions:        quote, revise, bid, decline, query, list
compensation:   应答超时 → 按 quote_policy 自动谢绝并通知双方
service:        dev.utp.merchant
</code></pre>

    <hr />
    <h2 id="s-m51">M5.1 Overview（概述）</h2>
    <h3 id="s-m511a">M5.1.1 意图</h3>
    <p>Quote 是 UTP-M 第三个供应商原语（MP3），其意图是让供应商对买方发起的询盘给出<strong>显式、签名、可审计的报价与应答</strong>。主规范 <a href="/documentation/specification/primitives/negotiate/index.html">P2 询盘原语</a>的 <code>utp.negotiate.quote</code> 方向为 <code>seller_to_buyer</code>（回调至买方 <code>{callback_base}</code>）。平台托管拓扑下供应商既无买方回调地址、也无与买方的直接会话，报价交付因此是<strong>串联两跳</strong>：<code>utp.quote.quote</code>（供应商 → Marketplace，本原语）→ <code>utp.negotiate.quote</code>（Marketplace → 买方，主规范 P2）。本原语标准化第一跳，使供应商报价成为显式、签名、可审计的协议动作；<strong>报价内容复用主规范权威 Quote 实体，Action 集按卖方任务视角独立命名</strong>（与 P2 不复用命名，两侧各自声明、互不混淆）。衔接细节见 <a href="#s-m56">M5.6</a>。</p>
    <h3 id="s-m512">M5.1.2 关键设计原则</h3>
    <ul>
      <li><strong>MP3 不替代 P2，而是 P2 报价交付的第一跳。</strong>协商的权威状态机在 P2（询盘/报价/议价/条款绑定）；MP3 <code>quote</code> 的产出（卖方 ES256 签名，覆盖主规范 <code>Quote.terms_hash</code>）由 Marketplace 以 <code>utp.negotiate.quote</code> 原样交付买方，条款绑定仍由 P2 完成并产出订购 <code>terms_hash</code> 进入 P3。</li>
      <li><strong>报价是有时效的承诺。</strong><code>quote</code> 在 <code>quote.validity</code> 内对供应商有约束力（买方在时效内接受即绑定）；到期自动失效，不产生义务。</li>
      <li><strong>应答超时必有确定性处置。</strong>每条路由询盘 MUST 关联应答时限；超时按 <code>quote_policy.on_timeout</code> 自动谢绝（询盘不同于订单，超时缺省为 <code>auto_decline</code>，不存在 auto_accept）。</li>
      <li><strong>可选能力。</strong>MP3 为 MAY 级能力：仅服务一口价直购（pricing_mode = L0）的供应商可不声明本原语，不影响 MP1/MP2/MP4/MP5 闭环（M1.8 Mode 接触点不新增）。</li>
    </ul>
    <h3 id="s-m513">M5.1.3 范围</h3>
    <ul>
      <li><strong>报价（quote）</strong>：对询盘给出结构化报价（分档价、MOQ、交期、有效期），附卖方签名。</li>
      <li><strong>修订（revise）</strong>：对买方还价或自身原因修订在途报价（新版本，旧版本保留可溯）。</li>
      <li><strong>投标（bid）</strong>：应答招投标类询盘（RFQ/招标），在投标窗口内提交密封报价。</li>
      <li><strong>谢绝（decline）</strong>：以结构化原因码谢绝询盘（区域不可服务、MOQ 不满足、产能不足等）。</li>
      <li><strong>查询（query / list）</strong>：待应答与历史应答记录检索。</li>
    </ul>
    <p>MP3 不覆盖：询盘的发起与撤回（Buyer 专属，P2）、条款绑定核查与 <code>terms_hash</code> 生成（P2 权威）、订购受理（MP4）。</p>
    <h3 id="s-m514">M5.1.4 前置条件</h3>
    <table>
      <thead><tr><th>条件</th><th>必需？</th><th>说明</th></tr></thead>
      <tbody>
        <tr><td>存在有效的询盘路由通知（InquiryRouting）</td><td>MUST</td><td>Marketplace 已将买方 P2 询盘路由给供应商（M5.7）。</td></tr>
        <tr><td><code>merchant.status == ACTIVE</code></td><td>MUST</td><td>与 MP4 不同：<code>RESTRICTED</code> 商户 MUST NOT 产生新报价承诺（无既有履约义务可言）。</td></tr>
        <tr><td><code>inquiry.deadline &gt; now()</code></td><td>MUST</td><td>应答时限内；投标另受 <code>bid_window</code> 约束。</td></tr>
        <tr><td>Profile 已声明 <code>utp.quote</code></td><td>MUST</td><td>未声明本原语的商户不接收询盘路由。</td></tr>
      </tbody>
    </table>
    <h3 id="s-m515">M5.1.5 后置条件与语义契约</h3>
<pre class="highlight"><code class="language-json">{
  "primitive": "utp.quote",
  "postconditions": [
    "quote.record_id != null",
    "conclusion ∈ {QUOTED, BOUND, DECLINED, EXPIRED}",
    "status == 'QUOTED' → seller_signature 覆盖 quote.terms_hash 且 quote.validity.end_at > decided_at",
    "conclusion == 'BOUND' → P2 条款绑定完成，terms_hash 生成（进入 P3）",
    "quote_record ∈ evidence_bundle"
  ],
  "invariants": [
    "同一 inquiry_id 的在途有效报价至多一份（revise 产生新版本并使旧版本失效）",
    "valid_until 内买方接受报价，供应商即受报价条款约束（时效性承诺）",
    "应答 MUST 在 deadline 前给出，否则按 quote_policy 自动谢绝"
  ],
  "side_effects": [
    "QUOTED：报价推送买方（P2 quote 语义），进入买方决策窗口",
    "BOUND：协商结果落入 NegotiationResult，衔接 P3 订购（主规范 3.7）",
    "DECLINED/EXPIRED：买方收到结构化谢绝/失效通知，P2 侧协商终止"
  ],
  "compensation": {
    "on_timeout": "按 quote_policy.on_timeout 执行 auto_decline，推送 utp.quote.expired",
    "on_buyer_withdraw": "询盘撤回 → 在途报价作废（无补偿义务），推送 utp.quote.withdrawn"
  }
}
</code></pre>

    <hr />
    <h2 id="s-m52">M5.2 Lifecycle / State Machine（生命周期 / 状态机）</h2>
    <h3 id="s-m521">M5.2.1 应答任务状态机</h3>
<div class="diagram"><img src="/documentation/assets/diagrams/m-quote-state-machine.svg" alt="询盘应答状态机：INQUIRY_PENDING/BUYER_COUNTERED 经 quote 进入 QUOTED，买方接受至 BOUND 终态；decline/超时收敛至 DECLINED/EXPIRED 终态" style="max-width: 100%; height: auto;"></div>
    <h3 id="s-m522">M5.2.2 状态定义与迁移规则</h3>
    <table>
      <thead><tr><th>状态</th><th>含义</th><th>进入条件</th><th>允许的操作</th></tr></thead>
      <tbody>
        <tr><td><code>INQUIRY_PENDING</code></td><td>待应答</td><td>询盘路由送达</td><td><code>quote</code>, <code>bid</code>, <code>decline</code>, <code>query</code></td></tr>
        <tr><td><code>QUOTED</code></td><td>已报价（买方决策窗口）</td><td><code>quote</code>/<code>bid</code> 签名验证通过</td><td><code>revise</code>, <code>decline</code>, <code>query</code>（revise 产生新版本）</td></tr>
        <tr><td><code>BUYER_COUNTERED</code></td><td>买方还价（回到可应答）</td><td>买方 P2 还价事件</td><td><code>quote</code>（新一轮报价）, <code>decline</code>, <code>query</code></td></tr>
        <tr><td><code>BOUND</code></td><td>条款绑定（终态）</td><td>买方在时效内接受报价，P2 绑定核查通过</td><td><code>query</code>；衔接 P3 订购与 MP4 受理</td></tr>
        <tr><td><code>DECLINED</code></td><td>已谢绝（终态）</td><td><code>decline</code>；或超时策略 auto_decline</td><td><code>query</code>（只读）</td></tr>
        <tr><td><code>EXPIRED</code></td><td>报价失效（终态）</td><td><code>valid_until</code> 到期买方未接受；或询盘撤回</td><td><code>query</code>（只读）</td></tr>
      </tbody>
    </table>
    <p><strong>确定性约束：</strong>终态到达后任何写操作 MUST 返回 <code>QUOTE.STATE_CONFLICT</code>（幂等重放同一 <code>idempotency_key</code> 除外）。多轮议价 = <code>QUOTED ⇄ BUYER_COUNTERED</code> 循环，轮次 <code>round_no</code> 单调递增；<strong>轮次上限由主规范 P2 引擎执行</strong>（拒绝超限的买方 <code>counter-offer</code> 并返回 <code>NEGOTIATE.COUNTER_OFFER.MAX_ROUNDS</code>，协商停留 <code>QUOTED</code>），本原语不因轮次超限产生迁移。各状态与主规范 P2 协商状态的对应见 <a href="#s-m562">M5.6.2</a>。</p>

    <hr />
    <h2 id="s-m53">M5.3 Error Handling（错误处理）</h2>
    <table>
      <thead><tr><th>错误码</th><th>严重级别</th><th>HTTP 映射</th><th>描述</th><th>建议处理</th></tr></thead>
      <tbody>
        <tr><td><code>QUOTE.NOT_FOUND</code></td><td>error</td><td>404</td><td>应答任务不存在或不属于调用方。</td><td>以 <code>list</code> 核对待应答队列。</td></tr>
        <tr><td><code>QUOTE.EXPIRED</code></td><td>error</td><td>410</td><td>应答时限已过或报价已失效。</td><td><code>query</code> 查看终局状态。</td></tr>
        <tr><td><code>QUOTE.STATE_CONFLICT</code></td><td>warning</td><td>409</td><td>应答任务已达终态。</td><td>幂等返回既有结论。</td></tr>
        <tr><td><code>QUOTE.SIGNATURE_INVALID</code></td><td>error</td><td>400</td><td><code>quote</code>/<code>bid</code> 携带的卖方签名无效或未覆盖 <code>quote.terms_hash</code>。</td><td>用正确密钥按 M1.10 统一规则重签。</td></tr>
        <tr><td><code>QUOTE.PRICE_OUT_OF_POLICY</code></td><td>error</td><td>422</td><td>报价超出平台价格治理边界（如低于成本预警线、超出类目波动阈值）。</td><td>调整报价或走人工审核通道。</td></tr>
        <tr><td><code>QUOTE.BID.WINDOW_CLOSED</code></td><td>error</td><td>410</td><td>投标窗口已关闭。</td><td>不可恢复；等待下一次招标。</td></tr>
        <tr><td><code>QUOTE.DECLINE.REASON_REQUIRED</code></td><td>error</td><td>400</td><td><code>decline</code> 缺少结构化原因码。</td><td>按 M5.10.2 原因码枚举补充。</td></tr>
        <tr><td><code>QUOTE.MERCHANT_RESTRICTED</code></td><td>error</td><td>403</td><td>商户状态不允许产生新报价承诺（M5.1.4）。</td><td>恢复 ACTIVE 后重试。</td></tr>
      </tbody>
    </table>

    <hr />
    <h2 id="s-m54">M5.4 Scopes（权限范围）</h2>
    <table>
      <thead><tr><th>Scope</th><th>类型</th><th>描述</th><th>授予方</th><th>默认分配</th></tr></thead>
      <tbody>
        <tr><td><code>quote:quote</code></td><td>Action Scope</td><td>提交报价并附卖方签名。</td><td>Marketplace</td><td>Seller 角色（仅本方路由询盘）</td></tr>
        <tr><td><code>quote:revise</code></td><td>Action Scope</td><td>修订在途报价。</td><td>Marketplace</td><td>Seller 角色</td></tr>
        <tr><td><code>quote:bid</code></td><td>Action Scope</td><td>提交招投标报价。</td><td>Marketplace</td><td>Seller 角色</td></tr>
        <tr><td><code>quote:decline</code></td><td>Action Scope</td><td>谢绝询盘。</td><td>Marketplace</td><td>Seller 角色</td></tr>
        <tr><td><code>quote:query</code></td><td>Action Scope</td><td>查询应答任务与历史记录。</td><td>Marketplace</td><td>Seller 角色</td></tr>
      </tbody>
    </table>
    <p><strong>约束：</strong><code>quote</code>/<code>bid</code> 的签名主体 MUST 是 Seller 的 Profile 公钥对应私钥。Merchant Agent 代签时 MUST 满足 M11.4 授权链要求（operation Mandate 覆盖 <code>quote:quote</code>，且报价金额在授权限额内）。</p>

    <hr />
    <h2 id="s-m55">M5.5 Guidelines（角色职责指引）</h2>
    <h3 id="s-m551">M5.5.1 Seller 角色职责</h3>
    <table>
      <thead><tr><th>职责</th><th>级别</th><th>说明</th></tr></thead>
      <tbody>
        <tr><td>时限内应答</td><td>MUST</td><td>MUST 在 <code>deadline</code> 前给出应答（报价或谢绝）；依赖超时自动谢绝 SHOULD 仅作为兜底。</td></tr>
        <tr><td>报价可履行</td><td>MUST</td><td><code>quote</code> 前 MUST 确认价格、MOQ、交期在报价有效期内可履行；报价口径 MUST 与 Listing <code>pricing</code> 一致（M3 价格一致性）。</td></tr>
        <tr><td>结构化谢绝</td><td>MUST</td><td><code>decline</code> MUST 携带 M5.10.2 原因码；SHOULD 附替代建议。</td></tr>
        <tr><td>报价纪律</td><td>SHOULD</td><td>SHOULD 避免频繁修订在途报价；高失效率/高谢绝率是平台治理信号。</td></tr>
      </tbody>
    </table>
    <h3 id="s-m552">M5.5.2 Marketplace 角色职责</h3>
    <table>
      <thead><tr><th>职责</th><th>级别</th><th>说明</th></tr></thead>
      <tbody>
        <tr><td>及时路由</td><td>MUST</td><td>P2 询盘定向到达后 MUST 立即推送 <code>inquiry_routed</code>（M5.7）；仅路由给 Profile 声明 <code>utp.quote</code> 的商户。</td></tr>
        <tr><td>如实转达</td><td>MUST</td><td>报价 MUST 原样进入 P2 买方侧（金额、有效期、条款不得改写）；平台加价/补贴 MUST 以独立条目呈现，不得混入卖方报价。</td></tr>
        <tr><td>投标密封</td><td>MUST</td><td>招投标场景，投标窗口关闭前 MUST NOT 向任何买方或其他竞标者披露报价内容。</td></tr>
        <tr><td>证据归档</td><td>MUST</td><td>QuoteRecord（含签名、轮次、时间戳）MUST 纳入协商 Evidence Bundle，供 P6 争议举证。</td></tr>
      </tbody>
    </table>

    <hr />
    <h2 id="s-m56">M5.6 与 P2 询盘原语的衔接（Interlock with P2）</h2>
    <h3 id="s-m561">M5.6.1 串联两跳（Two-Hop Delivery）</h3>
    <p>主规范 P2 的 <code>utp.negotiate.quote</code> 的方向是 <code>seller_to_buyer</code>（供应商交付报价，回调至买方 <code>{callback_base}</code>）。平台托管拓扑下，供应商既没有买方的回调地址，也没有与买方的直接会话，因此报价交付是<strong>串联两跳</strong>而非并列的两个通道：</p>
    <ol>
      <li><strong>第一跳（本原语）：</strong>Seller → Marketplace，<code>utp.quote.quote</code> 提交带签名的报价事实。</li>
      <li><strong>第二跳（主规范 P2）：</strong>Marketplace 以 Seller 侧 handler 身份执行 <code>utp.negotiate.quote</code>，把<strong>同一份 Quote 实体</strong>交付买方。Marketplace MUST NOT 改写报价内容（金额、有效期、条款、<code>terms_hash</code> 逐字节保持）；平台加价或补贴 MUST 以独立条目呈现。</li>
    </ol>
    <p>自托管拓扑（<a href="../../overview.html#s-m142">M1.4.2</a>）下本原语不适用：供应商 Endpoint 直接作为 P2 的 handler 执行 <code>utp.negotiate.quote</code> 回调，本原语是其内部模型的参考。</p>
    <h3 id="s-m562">M5.6.2 状态映射（State Correspondence）</h3>
    <p>本原语状态机是同一协商在供应商侧的<strong>任务视图</strong>，与主规范 P2 协商状态机（<code>primitives/negotiate/state_machine.json</code>）逐状态对应：</p>
    <table>
      <thead><tr><th>本原语（应答任务）</th><th>主规范 P2（协商）</th><th>说明</th></tr></thead>
      <tbody>
        <tr><td><code>INQUIRY_PENDING</code></td><td><code>INQUIRED</code></td><td>询盘已提交、等待供应商报价。</td></tr>
        <tr><td><code>QUOTED</code></td><td><code>QUOTED</code></td><td>报价已交付买方（两跳完成）。</td></tr>
        <tr><td><code>BUYER_COUNTERED</code></td><td><code>COUNTERED</code></td><td>买方经 <code>utp.negotiate.counter-offer</code> 还价。</td></tr>
        <tr><td><code>BOUND</code>（终）</td><td><code>BOUND</code></td><td>买方经 <code>utp.negotiate.binding</code> 绑定条款，全局状态迁移至 PURCHASING。</td></tr>
        <tr><td><code>DECLINED</code> / <code>EXPIRED</code>（终）</td><td><code>RELEASED</code></td><td>协商失败、超时或买方退出。</td></tr>
      </tbody>
    </table>
    <p><strong>终态不可逆与协商重启的关系：</strong>主规范允许 <code>RELEASED</code> 后买方重新发起 <code>utp.negotiate.inquiry</code>。此时协议引擎 MUST 生成<strong>新的 <code>inquiry_id</code></strong>，即产生一个新的应答任务；本原语的终态不可逆<strong>不妨碍</strong>协商重启（新询盘 = 新任务，历史记录仍可 <code>query</code>）。</p>
    <h3 id="s-m563">M5.6.3 职责边界</h3>
    <ol>
      <li><strong>条款绑定是 P2 的权威职责。</strong>买方在 <code>quote.validity</code> 内接受报价后，由 P2 执行绑定核查并产出 <code>terms_hash</code> 与 NegotiationResult（主规范 3.7），随后进入 P3 订购；本原语 MUST NOT 自行宣称绑定成立。</li>
      <li><strong>签名与哈希同源。</strong>本原语 <code>quote</code> 的签名覆盖主规范 <code>Quote.terms_hash</code>（计算规则见 M5.10.1.1）。绑定后 MP4 <code>accept</code> 的签名覆盖订购 <code>terms_hash</code>，二者构成完整价格证据链；<strong>MP4 <code>accept</code> MUST NOT 偏离已绑定条款</strong>。</li>
      <li><strong>轮次上限由 P2 引擎执行。</strong>会话锁定轮次约束时，超限的买方 <code>counter-offer</code> 由 P2 引擎拒绝并返回 <code>NEGOTIATE.COUNTER_OFFER.MAX_ROUNDS</code>，协商停留在 <code>QUOTED</code>；<strong>本原语不因轮次超限产生迁移，供应商无需为此 <code>decline</code></strong>。</li>
      <li><strong>报价修订的第二跳表达。</strong><code>revise</code> 产生新版本后，Marketplace MUST 以新的 <code>utp.negotiate.quote</code> 交付修订报价，主规范协商状态停留 <code>QUOTED</code>。主规范状态机当前未定义 <code>QUOTED</code> 自环，该表达已登记为跨规范协调项（附录 ME）。</li>
      <li><strong>L3 竞价的分支独立性。</strong>多供应商竞价时各报价分支相互独立（主规范 P2 约束），买方 <code>binding</code> 只能选择其中一个分支；未被选中的分支收敛为 <code>EXPIRED</code>。</li>
    </ol>

    <hr />
    <h2 id="s-m57">M5.7 询盘路由（Inquiry Routing）</h2>
    <p>询盘路由是 Marketplace → Seller 的推送事件（回调 Service，M2.6.1），不是供应商可调用的 Action。</p>
    <h3 id="s-m571">M5.7.1 InquiryRouting 事件载荷</h3>
    <table>
      <thead><tr><th>字段名</th><th>类型</th><th>必填</th><th>描述</th></tr></thead>
      <tbody>
        <tr><td><code>inquiry_id</code></td><td>string</td><td>是</td><td>路由事件唯一标识（应答任务标识）。</td></tr>
        <tr><td><code>negotiation_id</code></td><td>string</td><td>是</td><td>P2 协商上下文标识（跨 B/M 共享）。</td></tr>
        <tr><td><code>trade_context_id</code></td><td>string</td><td>是</td><td>交易上下文标识（询盘阶段尚无 transaction_id）。</td></tr>
        <tr><td><code>inquiry_type</code></td><td>enum</td><td>是</td><td><code>standard</code>（标准询盘）/ <code>rfq_bid</code>（招投标；附 <code>bid_window</code>）。</td></tr>
        <tr><td><code>items</code></td><td>array</td><td>是</td><td>询盘商品项（<code>listing_id</code>/<code>sku_id</code>、<code>external_ref</code> 回传、数量区间、目标价 MAY）。</td></tr>
        <tr><td><code>buyer_ref</code></td><td>object</td><td>是</td><td>买方脱敏信息（<code>agent_id</code>、资质摘要；PII 按权限裁剪）。</td></tr>
        <tr><td><code>requirements</code></td><td>object</td><td>否</td><td>交期/合规/物流等结构化要求。</td></tr>
        <tr><td><code>deadline</code></td><td>ISO-8601</td><td>是</td><td>应答截止时间（超时 auto_decline）。</td></tr>
        <tr><td><code>round_no</code></td><td>integer</td><td>是</td><td>当前轮次（首轮为 1；<code>buyer_countered</code> 事件递增）。</td></tr>
      </tbody>
    </table>
    <p>推送遵循主规范 4.3.1（MessageEnvelope + 签名 + 指数退避重试）；供应商 MUST 以 <code>2xx</code> 确认。推送不可达时，供应商可通过 <code>quote.list</code>（<code>status=INQUIRY_PENDING</code>）轮询兜底。</p>

    <hr />
    <h2 id="s-m58">M5.8 Mode-Driven Behavior（模式驱动行为）</h2>
    <table>
      <thead><tr><th>Mode 配置</th><th>应答行为</th></tr></thead>
      <tbody>
        <tr><td>pricing=L0（一口价）</td><td>MP3 不适用：询盘不产生、不路由；价格事实由 Listing <code>pricing</code> 直接承载。</td></tr>
        <tr><td>pricing=L1（分档价）</td><td><code>quote_policy.mode</code> SHOULD 为 <code>auto</code>：按 PricingTiers 即时报价（毫秒级）。</td></tr>
        <tr><td>pricing=L2—L3（协商价/动态价）</td><td>策略预筛 + 人工/Agent 复核；多轮议价激活，轮次上限按会话 Mode 配置。</td></tr>
        <tr><td>relationship=L2+（框架协议）</td><td>报价 MUST 引用框架价基线；偏离基线 MUST 显式标注偏差与理由。</td></tr>
        <tr><td>compliance=L2+（跨境）</td><td>报价 SHOULD 声明贸易术语（Incoterms）与单证费用归属。</td></tr>
      </tbody>
    </table>

    <hr />
    <h2 id="s-m59">M5.9 Operations 与 Transport Bindings</h2>
    <h3 id="s-m591">M5.9.1 操作矩阵</h3>
    <table>
      <thead><tr><th>操作</th><th>适用状态</th><th>状态影响</th><th><code>valid_next_actions</code></th><th>关键约束</th></tr></thead>
      <tbody>
        <tr><td><code>utp.quote.quote</code></td><td><code>INQUIRY_PENDING</code>, <code>BUYER_COUNTERED</code></td><td>进入 <code>QUOTED</code></td><td><code>revise</code>, <code>decline</code>, <code>query</code></td><td>Seller；签名 MUST 覆盖 <code>quote.terms_hash</code>；SHOULD 声明 <code>quote.validity</code>（缺省时平台按默认有效期补全）。</td></tr>
        <tr><td><code>utp.quote.revise</code></td><td><code>QUOTED</code></td><td>停留 <code>QUOTED</code>（新版本，旧版本失效并保留）</td><td><code>revise</code>, <code>decline</code>, <code>query</code></td><td>Seller；新版本 MUST 重新签名；<code>version</code> 递增；仅适用于 <code>quote</code> 产生的 <code>QUOTED</code>（<code>bid</code> 产生的密封报价 MUST 返回 <code>QUOTE.STATE_CONFLICT</code>）。第二跳表达见 M5.6.3 第 4 项。</td></tr>
        <tr><td><code>utp.quote.bid</code></td><td><code>INQUIRY_PENDING</code>（<code>inquiry_type=rfq_bid</code>）</td><td>进入 <code>QUOTED</code>（密封）</td><td><code>query</code></td><td>Seller；投标窗口内；窗口关闭前平台 MUST NOT 向任何买方或竞标者披露，窗口关闭后统一开标；<strong>投标 MUST NOT 通过 <code>revise</code> 修订</strong>（密封不可变；需变更 MUST 先 <code>decline</code> 再在窗口内重新 <code>bid</code>）。</td></tr>
        <tr><td><code>utp.quote.decline</code></td><td><code>INQUIRY_PENDING</code>, <code>QUOTED</code>, <code>BUYER_COUNTERED</code></td><td>进入 <code>DECLINED</code> 终态</td><td><code>query</code></td><td>Seller；MUST 携带结构化原因码。</td></tr>
        <tr><td><code>utp.quote.query</code></td><td>任意</td><td>无</td><td>当前状态下可执行动作</td><td>Seller；按 <code>inquiry_id</code>/<code>negotiation_id</code> 查询。</td></tr>
        <tr><td><code>utp.quote.list</code></td><td>—</td><td>无</td><td><code>quote</code>, <code>decline</code>, <code>query</code></td><td>Seller；按状态/时间筛选，分页；轮询降级通道。</td></tr>
      </tbody>
    </table>
    <h3 id="s-m592">M5.9.2 传输绑定</h3>
    <table>
      <thead><tr><th>操作</th><th>REST</th><th>MCP Tool</th><th>A2A Task</th></tr></thead>
      <tbody>
        <tr><td><code>quote</code></td><td><code>POST /utp/m/v1/quotes/{inquiry_id}/quote</code></td><td><code>utp_quote_quote</code></td><td><code>utp:quote:quote</code></td></tr>
        <tr><td><code>revise</code></td><td><code>POST /utp/m/v1/quotes/{inquiry_id}/revisions</code></td><td><code>utp_quote_revise</code></td><td><code>utp:quote:revise</code></td></tr>
        <tr><td><code>bid</code></td><td><code>POST /utp/m/v1/quotes/{inquiry_id}/bid</code></td><td><code>utp_quote_bid</code></td><td><code>utp:quote:bid</code></td></tr>
        <tr><td><code>decline</code></td><td><code>POST /utp/m/v1/quotes/{inquiry_id}/decline</code></td><td><code>utp_quote_decline</code></td><td><code>utp:quote:decline</code></td></tr>
        <tr><td><code>query</code></td><td><code>GET /utp/m/v1/quotes/{inquiry_id}</code></td><td><code>utp_quote_query</code></td><td><code>utp:quote:query</code></td></tr>
        <tr><td><code>list</code></td><td><code>GET /utp/m/v1/quotes?status=&amp;from=&amp;cursor=&amp;limit=</code></td><td><code>utp_quote_list</code></td><td><code>utp:quote:list</code></td></tr>
      </tbody>
    </table>
    <p>REST Binding 为 MUST（基线）；MCP / A2A 为 MAY（M1.10）。全部写操作 MUST 携带 <code>idempotency_key</code>；响应 MUST 包含 <code>X-UTP-Quote-Status</code> 头部。</p>

    <hr />
    <h2 id="s-m510">M5.10 Entities（实体定义）</h2>
    <h3 id="s-m5101">M5.10.1 QuoteRecord</h3>
    <p><strong>报价内容复用主规范权威实体。</strong>本原语 MUST NOT 重复定义报价结构：报价以主规范 P2 的 <code>Quote</code> 实体承载（<code>primitives/negotiate/entities/quote.json</code>，字段 <code>quote_id</code>/<code>inquiry_ref</code>/<code>supplier_id</code>/<code>round</code>/<code>line_items</code>/<code>prices</code>/<code>lead_time</code>/<code>available_trade_modes</code>/<code>answers</code>/<code>validity</code>/<code>stock_guaranteed</code>/<code>terms_hash</code>）。QuoteRecord 只增加供应商侧的任务状态、版本与审计维度：</p>
    <table>
      <thead><tr><th>字段名</th><th>类型</th><th>必填</th><th>描述</th></tr></thead>
      <tbody>
        <tr><td><code>record_id</code></td><td>string</td><td>是</td><td>应答记录唯一标识。</td></tr>
        <tr><td><code>inquiry_id</code></td><td>string</td><td>是</td><td>询盘路由标识（本原语状态机的资源键）。</td></tr>
        <tr><td><code>negotiation_id</code></td><td>string</td><td>是</td><td>P2 协商上下文标识（跨买卖双侧共享，M5.6）。</td></tr>
        <tr><td><code>trade_context_id</code></td><td>string</td><td>否</td><td>交易上下文标识；询盘阶段尚无 <code>transaction_id</code>。</td></tr>
        <tr><td><code>status</code></td><td>enum</td><td>是</td><td><code>INQUIRY_PENDING</code> / <code>QUOTED</code> / <code>BUYER_COUNTERED</code> / <code>BOUND</code> / <code>DECLINED</code> / <code>EXPIRED</code>。</td></tr>
        <tr><td><code>round_no</code></td><td>integer</td><td>是</td><td>议价轮次（对应主规范 <code>Quote.round</code>）；买方还价事件递增。</td></tr>
        <tr><td><code>version</code></td><td>integer</td><td>是</td><td>本轮报价版本；<code>revise</code> 递增，旧版本失效并保留可溯。</td></tr>
        <tr><td><code>quote</code></td><td>Quote</td><td>条件</td><td>报价内容（主规范权威实体，见上）。<code>status == QUOTED</code> 时必填。</td></tr>
        <tr><td><code>seller_signature</code></td><td>Signature</td><td>条件</td><td>Seller 业务签名（<code>primitives/common/entities/signature.json</code>，<code>algorithm</code> MUST 为 <code>ES256</code>），覆盖 <code>quote.terms_hash</code>。<code>status == QUOTED</code> 时必填。</td></tr>
        <tr><td><code>decline_reason</code></td><td>DeclineReason</td><td>条件</td><td><code>status == DECLINED</code> 时必填（M5.10.2）。</td></tr>
        <tr><td><code>quote_note</code></td><td>string</td><td>否</td><td>补充说明（贸易术语、单证费用归属、替代建议等）。</td></tr>
        <tr><td><code>decided_by</code></td><td>enum</td><td>是</td><td><code>human</code> / <code>agent</code> / <code>policy_auto</code>（审计维度，M11.5）。</td></tr>
        <tr><td><code>decided_at</code></td><td>ISO-8601</td><td>是</td><td>应答时间。</td></tr>
      </tbody>
    </table>
    <h4 id="s-m5101a">M5.10.1.1 terms_hash 计算规则（补充主规范留白）</h4>
    <p>主规范 <code>Quote.terms_hash</code> 的计算范围此前未定义。本规范给出规范化规则，供应商与 Marketplace MUST 一致执行：</p>
    <ul>
      <li>取 <code>Quote</code> 实体，<strong>移除</strong> <code>terms_hash</code> 自身与任何签名字段；</li>
      <li>按 RFC 8785（JCS）规范化序列化，计算 SHA-256；</li>
      <li>格式为 <code>sha256:&lt;64 位小写十六进制&gt;</code>（与主规范 <code>Quote.terms_hash</code> 的 pattern 一致）；</li>
      <li><code>seller_signature</code> 的 JWS payload MUST 为该哈希串（M1.10 业务签名统一规则）；实现方 MUST NOT 自行选择签名覆盖范围。</li>
    </ul>
    <h3 id="s-m5102">M5.10.2 DeclineReason 原因码枚举</h3>
    <table>
      <thead><tr><th>原因码</th><th>含义</th><th>建议买方处理</th></tr></thead>
      <tbody>
        <tr><td><code>moq_not_met</code></td><td>询盘量低于 MOQ</td><td>提高数量或更换供应商</td></tr>
        <tr><td><code>capacity_full</code></td><td>产能排期已满</td><td>放宽交期或更换供应商</td></tr>
        <tr><td><code>region_unserved</code></td><td>目标区域不可服务</td><td>更换收货区域</td></tr>
        <tr><td><code>spec_unsupported</code></td><td>规格/定制要求无法满足</td><td>调整规格或寻找定制供应商</td></tr>
        <tr><td><code>compliance_unable</code></td><td>无法满足合规/单证要求</td><td>更换供应商或降低合规要求</td></tr>
        <tr><td><code>risk_control</code></td><td>供应商侧风控拦截</td><td>联系供应商或平台</td></tr>
        <tr><td><code>other</code></td><td>其他（MUST 附 <code>detail</code> 说明）</td><td>阅读说明</td></tr>
      </tbody>
    </table>

    <hr />
    <h2 id="s-m511">M5.11 Use Case Walkthroughs（用例演练）</h2>
    <h3 id="s-m5111">M5.11.1 标准询盘报价至条款绑定</h3>
<pre class="highlight"><code class="language-json">// 1. 回调：询盘路由
{
  "event": "utp.quote.inquiry_routed",
  "inquiry_id": "inq-20260730-0812",
  "negotiation_id": "neg-01J5AB2C3D4E",
  "trade_context_id": "tc-01J5AB0XYZ",
  "inquiry_type": "standard",
  "items": [ { "listing_id": "item-BT-NC-001", "sku_id": "sku-X3-BLK",
               "external_ref": "ERP-MAT-004512",
               "quantity_range": { "min": 500, "max": 1000 },
               "target_price": { "amount": "255.00", "currency": "CNY" } } ],
  "deadline": "2026-07-31T10:00:00Z",
  "round_no": 1
}

// 2. Seller 报价（策略核验通过，Agent 代签）——报价体为主规范 Quote 实体
POST /utp/m/v1/quotes/inq-20260730-0812/quote
{
  "idempotency_key": "idem-quo-20260730-003",
  "quote": {
    "quote_id": "q-20260730-0812-1",
    "inquiry_ref": "inq-20260730-0812",
    "supplier_id": "did:web:supplier.example.com",
    "round": 1,
    "line_items": [ { "item_id": "item-BT-NC-001", "sku_id": "sku-X3-BLK",
                      "quantity": 800,
                      "unit_price": { "amount": "258.00", "currency": "CNY" } } ],
    "prices": [ { "type": "total", "amount": { "amount": "206400.00", "currency": "CNY" } } ],
    "lead_time": { "preparation_days": 7, "shipping_days": 3, "total_days": 10 },
    "available_trade_modes": [ { "mode_id": "tm-fullpay-alipay", "type": "full_payment" } ],
    "validity": { "start_at": "2026-07-30T10:00:00Z", "end_at": "2026-08-03T10:00:00Z" },
    "stock_guaranteed": true,
    "terms_hash": "sha256:7c9e2b4a1f08d3c5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9"
  },
  "seller_signature": { "algorithm": "ES256", "key_id": "supplier-key-1",
                        "value": "eyJhbGciOiJFUzI1NiJ9..." },
  "decided_by": "agent"
}

// 3. 响应
{
  "record_id": "quo-20260730-0812",
  "status": "QUOTED",
  "round_no": 1, "version": 1,
  "valid_next_actions": ["utp.quote.revise", "utp.quote.decline", "utp.quote.query"]
}

// 4. 买方接受（P2 条款绑定）→ 回调通知
{ "event": "utp.quote.bound", "inquiry_id": "inq-20260730-0812",
  "terms_hash": "sha256:d4e5f6a7b8c9...",   // 进入 P3；MP4 受理签名覆盖此值
  "next": "订单路由后按 M6 受理（accept 不得偏离已绑定条款）" }
</code></pre>
    <h3 id="s-m5112">M5.11.2 谢绝与超时兜底</h3>
<pre class="highlight"><code>谢绝：POST .../decline { "decline_reason": { "code": "moq_not_met",
      "detail": "该 SKU 起订量 500，询盘量 200；如可拼单请重新询盘" } }
      → P2 侧协商终止，买方收到结构化通知

超时：deadline 到期未应答 → 按 quote_policy=auto_decline 自动 DECLINED，
      推送 utp.quote.expired 给供应商（decided_by 记录 policy_auto）
</code></pre>
