---
title: M11 供应商 Agent 与人机协同
section: merchant
owner: merchant-team
status: review
version: 2026-07-31
format: html
---

<h1 id="s-m11">M11 · 供应商 Agent 与人机协同（Merchant Agent &amp; Human-Agent Interaction）</h1>

    <h2 id="s-m111">定位（Positioning）</h2>
    <p><strong>Merchant Agent</strong> 是代表供应商（Principal：商家法人或其授权经营者）自主执行经营决策的 AI Agent。它不是拓扑角色（既有角色的供应商侧职责）——协议交互中它以 <code>Seller</code> 身份出现，与人工后台操作在协议层不可区分；区别在于<strong>授权链、决策审计与人机控制点</strong>，这正是本章的规范对象。</p>
    <p>本章将 UTP 规范人机协同框架（<a href="../protocol-core/human-agent-interaction.md">Ch.20</a>）与身份授权框架（<a href="../protocol-core/identity-authorization.md">Ch.6</a>）应用到供应商侧，遵循同一交互控制等级与 HAI 挂起语义，不新造机制。</p>

    <h2 id="s-m112">Merchant Agent 职责边界（Responsibility Boundary）</h2>
    <table>
      <thead><tr><th>职责域</th><th>Agent 可执行的动作</th><th>对应原语</th></tr></thead>
      <tbody>
        <tr><td>入驻资料与资质维护</td><td>在授权下代办资料提交、资质更新与换证（<a href="onboarding.md#s-m25">Step 4：资质与合规（Qualification & Compliance）</a>）；平台账号注册与商户协议签署除外（<a href="onboarding.md#s-m243">注册边界与访问凭证</a> / <a href="#s-m115">人机控制点（HAI Control Points）</a>）</td><td>入驻管理接口（非原语）</td></tr>
        <tr><td>商品运营</td><td>依据 ERP 主数据与销售策略发布/更新/上下架商品；类目属性补全；低销量商品下架建议</td><td>MP1</td></tr>
        <tr><td>库存运营</td><td>渠道配额分配、低库存预警响应（补货/下架）、全量校准调度</td><td>MP2</td></tr>
        <tr><td>询盘与报价</td><td>响应买方 P2 询盘经 MP3 应答（<a href="primitives/quote/index.md">M5</a>）：<code>delegation_policy</code> 为 <code>passthrough</code> 时接收 <code>inquiry_routed</code> 回调，依据定价策略生成 <code>quote</code>/还盘并回传；框架协议客户按协议价自动报价</td><td>P2（Seller 作为 handler 侧的应答方，执行模式见 Handler 侧执行模式：平台代答与透传（Delegation Mode））</td></tr>
        <tr><td>接单决策</td><td>按 AcceptancePolicy 自动接单/拒单/挂起/申报交期</td><td>MP4</td></tr>
        <tr><td>履约调度</td><td>备货申报、选择承运商、发货上报、延迟预警与申报</td><td>MP5</td></tr>
        <tr><td>结算核对</td><td>三方对账（<a href="settlement.md#s-m95">对账闭环与差异处理（Reconciliation Loop）</a>）、差异申报草案生成</td><td>settlement 扩展</td></tr>
        <tr><td>争议应对</td><td>整理证据包、生成答辩草案</td><td>P6（提交前 MUST 人工确认，见 <a href="#s-m115">人机控制点（HAI Control Points）</a>）</td></tr>
      </tbody>
    </table>

    <h2 id="s-m113">自动决策策略（AcceptancePolicy 与定价策略）</h2>
    <h3 id="s-m1131">AcceptancePolicy 实体</h3>
    <p>自动接单策略是 MP4 <code>acceptance_policy.mode == "auto"</code>（<a href="primitives/acceptance/index.md#s-m66">与 P3 Purchase 签名流程的衔接（Interlock with P3）</a>/<a href="primitives/acceptance/index.md#s-m68">Mode-Driven Behavior（模式驱动行为）</a>）的供应商侧配置。策略 MUST 以结构化形式定义、版本化存档，使每次自动决策可回溯到策略版本：</p>
    <table>
      <thead><tr><th>字段名</th><th>类型</th><th>必填</th><th>描述</th></tr></thead>
      <tbody>
        <tr><td><code>policy_id</code> / <code>version</code></td><td>string / integer</td><td>是</td><td>策略标识与版本（变更递增，旧版本存档）。</td></tr>
        <tr><td><code>mode</code></td><td>enum</td><td>是</td><td><code>auto</code>（策略通过即自动 accept）/ <code>assisted</code>（策略给建议，人工/上级 Agent 终审）/ <code>manual</code>（仅路由通知）。</td></tr>
        <tr><td><code>auto_accept_rules</code></td><td>array</td><td>条件</td><td>自动接单条件组（AND 语义）：如 <code>order_amount &lt;= limit</code>、<code>sellable 覆盖率 == 100%</code>、<code>buyer.trust_score &gt;= 阈值</code>、<code>region ∈ 可达区域</code>、<code>framework_agreement_ref 存在</code>。</td></tr>
        <tr><td><code>auto_reject_rules</code></td><td>array</td><td>否</td><td>自动拒单条件组（命中即 reject，附映射的 <a href="primitives/acceptance/index.md#s-m6102">RejectReason 原因码枚举</a> 原因码）。</td></tr>
        <tr><td><code>escalation</code></td><td>object</td><td>是</td><td>不满足自动规则时的升级路径：<code>hold + 人工工单</code> 或 <code>assisted 建议</code>；MUST 声明升级后的答复时限策略。</td></tr>
        <tr><td><code>amount_ceiling</code></td><td>Money</td><td>是</td><td>自动决策金额上限；超过 MUST 升级人工（<a href="#s-m115">人机控制点（HAI Control Points）</a> 控制点）。</td></tr>
        <tr><td><code>owner_signature</code></td><td>string</td><td>是</td><td>Principal（商家授权人）对策略版本的 ES256 签名——策略即授权的书面化。</td></tr>
      </tbody>
    </table>
    <h3 id="s-m1132">报价策略约束</h3>
    <p>Merchant Agent 代表 Seller 经 MP3 应答 P2 询盘时（报价原语）：</p>
    <ul>
      <li>报价 MUST 以 Listing 的 <code>pricing</code>（含 <code>pricing_tiers</code>）为基准，偏离幅度 MUST 在策略声明的折扣边界内（如 <code>max_discount_pct</code>）。</li>
      <li>生成的 Quote/Binding Terms 遵循 UTP-B 规范 P2 的实体与签名要求；Agent 签名的授权要求见 <a href="#s-m114">Agent 授权链（Delegation & Mandate）</a>。</li>
      <li>金额或折扣超出策略边界的还盘 MUST 升级人工确认（SUSPENDED 控制点）。</li>
    </ul>

    <h2 id="s-m114">Agent 授权链（Delegation &amp; Mandate）</h2>
<div class="diagram"><img src="../../assets/diagrams/m-agent-authorization.svg" alt="Agent 授权链：Principal 主密钥签发 Mandate（Scope/金额/时效）授予 Agent 工作密钥，签名动作带 decided_by 进入审计，可回溯可吊销" style="max-width: 100%; height: auto;"></div>
    <p>Merchant Agent 的每次签名动作 MUST 可回溯到 Principal 授权，复用 UTP 规范 Ch.6 的身份与授权框架（Agent 身份凭证 + 授权链），供应商侧的授权要素：</p>
    <table>
      <thead><tr><th>要素</th><th>要求</th></tr></thead>
      <tbody>
        <tr><td>授权主体</td><td>Principal（商家法人/授权经营者）以 Profile 主密钥签发对 Agent 工作密钥的授权凭证。凭证类型 MUST 为 UTP 规范 <code>operation</code> Mandate（Profile <code>mandates.supported_mandate_types</code> 中的既有类型，不新增类型），结构与验证规则同 UTP 规范第 6 章；供应商侧仅约束其 Scope、金额与时效内容如下。</td></tr>
        <tr><td>授权范围</td><td>MUST 按 Scope 枚举（附录 MC）：如 <code>listing:*</code>、<code>inventory:*</code>、<code>acceptance:accept</code>（含金额上限）、<code>delivery:*</code>；结算读取 <code>pay:settlement:read</code> SHOULD 单独授予。</td></tr>
        <tr><td>金额与时效</td><td>涉及承诺性签名（<code>acceptance:accept</code>、P2 报价）的授权 MUST 声明单笔金额上限与累计限额，MUST 有过期时间。</td></tr>
        <tr><td>可撤销</td><td>Principal MAY 随时吊销授权；吊销后 Agent 既有签名仍有效（不可撤销承诺），新签名 MUST 被拒绝。</td></tr>
        <tr><td>审计</td><td>每条 AcceptanceRecord/Quote/Shipment 的 <code>decided_by</code> 维度（<code>human</code>/<code>agent</code>/<code>policy_auto</code>）+ 授权凭证引用 MUST 进入审计记录。</td></tr>
      </tbody>
    </table>

    <h2 id="s-m115">人机控制点（HAI Control Points）</h2>
    <p>复用 UTP 规范 Ch.20 的三级交互控制等级（AUTONOMOUS &lt; SUPERVISED &lt; CONFIRMED，<a href="../protocol-core/human-agent-interaction.md#s-19-1-2">交互控制等级（interaction_level）</a>：自动执行 / 监督执行（非阻断，倒计时窗口内可人工撤回）/ 人工确认（阻断执行门））与 HAI 挂起语义（Suspend Record，《人机交互协同》；执行前控制，《全局状态机》.6），定义供应商侧默认控制点矩阵：</p>
    <table>
      <thead><tr><th>决策场景</th><th>默认交互等级</th><th>说明</th></tr></thead>
      <tbody>
        <tr><td>商品发布/上下架（常规）</td><td>AUTONOMOUS</td><td>Agent 自主执行，事后可查。</td></tr>
        <tr><td>价格调整（降价超阈值 / 任何涨价 major 变更）</td><td>CONFIRMED</td><td>MUST 经 Principal 确认后提交 <code>update</code>。</td></tr>
        <tr><td>询盘报价（策略内，MP3）</td><td>AUTONOMOUS</td><td>按报价策略自动 quote 并签名（报价原语）；策略外或超授权限额升级 CONFIRMED。</td></tr>
        <tr><td>价格调整（降价、阈值内）</td><td>SUPERVISED</td><td>非阻断执行：SHOULD 提供倒计时窗口供人工撤回，窗口结束自动提交 update。</td></tr>
        <tr><td>自动接单（策略内）</td><td>AUTONOMOUS</td><td>策略内自动执行并事后通知 Principal（通知属运营实践，不构成 HAI 确认点）；策略外升级 CONFIRMED。</td></tr>
        <tr><td>接单金额超 <code>amount_ceiling</code> / 低毛利 / 黑名单区域</td><td>CONFIRMED</td><td>受理任务 <code>hold</code>，等待人工结论；MUST 在 M6 deadline 内完成，否则超时策略兜底。</td></tr>
        <tr><td>交期变更申报</td><td>AUTONOMOUS</td><td>Agent 可自主申报，SHOULD 同步通知 Principal（通知属运营实践，不构成 HAI 确认点）。</td></tr>
        <tr><td>发货（常规）</td><td>AUTONOMOUS</td><td>随 ERP 出库事实自动上报。</td></tr>
        <tr><td>结算差异申报 / 争议答辩提交</td><td>CONFIRMED</td><td>涉及资金与法律立场，MUST 人工确认。</td></tr>
        <tr><td>平台账号注册、商户协议签署、密钥轮换、授权变更</td><td>CONFIRMED（仅 Principal）</td><td>MUST NOT 委托给 Agent（<a href="onboarding.md#s-m243">注册边界与访问凭证</a>）。</td></tr>
      </tbody>
    </table>
    <p><strong>与买方侧 HAI 挂起的关系：</strong>供应商侧人工确认发生在 MP4 受理窗口内（<code>ON_HOLD</code> 状态），属于供应商内部流程，<strong>不产生</strong>买方会话的 HAI 挂起记录（Suspend Record）——后者是买方 Principal 对待确认 Action 的控制语义（UTP 规范 《人机交互协同》，执行前控制见 《全局状态机》.6）。两侧时限的衔接由 M6 的 <code>deadline</code> 统一约束。</p>

    <h2 id="s-m116">决策审计（Decision Audit）</h2>
    <p>本节审计要求继承 UTP 规范<a href="../protocol-core/risk-audit.md">第 7 章</a>（风控与审计）：审计记录结构、保留期限与风控信号采集规则以该章为准，本节只补充供应商侧的决策来源维度。</p>
    <ul>
      <li>每次 Agent 自主决策 MUST 记录：输入摘要（路由订单/询盘要点）、命中的策略规则与版本、输出动作、授权凭证引用、时间戳。</li>
      <li>审计记录 SHOULD 以追加式存储（append-only）保存，保存期不低于争议时效期；争议中 MAY 作为证据提交（Evidence Bundle）。</li>
      <li>Marketplace 对 <code>decided_by == 'agent' | 'policy_auto'</code> 的决策 MAY 施加额外风控采样（UTP 规范 Ch.7 风控信号框架）；供应商 MUST NOT 将人工决策伪标为自动或反之。</li>
    </ul>

    <h2 id="s-m117">Agent 失效与降级（Failure &amp; Fallback）</h2>
    <table>
      <thead><tr><th>失效场景</th><th>降级行为</th></tr></thead>
      <tbody>
        <tr><td>Agent 不可用（宕机/授权过期）</td><td>回调事件积压由 Bridge 队列承接；受理任务按 M6 <code>timeout_policy</code> 兜底；Principal SHOULD 收到不可用告警并可切换人工后台。</td></tr>
        <tr><td>策略配置错误（异常批量拒单/异常报价）</td><td>Principal MAY 紧急吊销授权并回滚策略版本；已产生的承诺性签名不可撤销，善后走 P6。</td></tr>
        <tr><td>Agent 与 ERP 数据不一致</td><td>以 ERP 为南向权威、协议凭证为北向事实，按 对账钩子（Reconciliation Hooks） 对账钩子收敛；决策暂降级为 <code>assisted</code>。</td></tr>
      </tbody>
    </table>
