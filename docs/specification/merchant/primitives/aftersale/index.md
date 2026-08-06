---
title: 售后原语
section: merchant
owner: merchant-team
status: review
version: 2026-07-31
---

# 售后原语（Aftersale） {#s-m8}

供应商侧售后处置原语。对买方提出的退款、退货退款、换货、补发与维修请求作出结构化处置结论，并在需要退货的方案下确认退货收货与验货结果。本原语规范的是**买卖双方在协议层的售后协商与执行**，与 UTP-B 规范 [P6 Resolve（争议解决）](../../../primitives/resolve/index.md)分工明确：售后先行，协商不成才升级争议裁决。

## 原语身份 {#s-m8-identity}

```
primitive_id:   utp.aftersale
version:        2026-07-31
initiator_role: Seller
handler_role:   Marketplace
intent:         对买方售后请求（退款/退货退款/换货/补发/维修）给出结构化处置结论，并确认退货收货与验货结果
state_delta:    aftersale_request → aftersale_record（资源作用域：aftersale_id）
actions:        approve, reject, propose, confirm_return, query, list
compensation:   处置超时 → 按 timeout_policy 自动收敛（auto_approve / auto_reject），推送 utp.aftersale.closed
```

## Overview（定位与意图） {#s-m81}

**意图**。Aftersale 是 UTP-M 第六个供应商原语（MP6）。交付完成不等于交易结束。质量争议、错发漏发、运输损坏在 B2B 场景中是常态，而这些请求的处置结论直接决定资金去向（退款金额）与货物归属（是否退回）。若不在协议层规范，买方 Agent 无法预期"申请多久有回应""拒绝的理由是否可判定"，供应商也无法把售后决策交给 Agent 自动化。本原语把售后处置从平台私有流程提升为可协商、可审计、可自动化的协议动作。

**原语判据**。本原语通过 与 UTP-B 规范 P1—P6 的衔接矩阵（Interlock Matrix） 三关判据：

- **T1 运行时性**：售后请求在交易运行时产生，处置结论有 deadline 约束，不是签约前的一次性配置。
- **T2 双边对手性**：买方提出诉求、供应商给出结论，双方可多轮协商——存在真实的对手方与合意过程。
- **T3 可重复交易性**：每笔已交付订单都可能触发售后，动作可重复执行且需幂等。

**职责边界（本原语不做什么）**

| 不属于本原语 | 归属 | 理由 |
| --- | --- | --- |
| 执行退款资金动作 | Marketplace（代收代付方） | 平台托管拓扑下资金在平台账户，供应商无退款通道；供应商只通过 `utp.aftersale.refund_completed` 观测结果 |
| 换货与补发的发货动作 | MP5 交付原语 `utp.delivery.ship` | 原语正交性——发货能力已在 MP5 定义，售后场景携带 `aftersale_ref` 复用即可，MUST NOT 重复定义 |
| 争议裁决与补偿裁定 | UTP-B 规范 P6 Resolve | 裁决需第三方（Arbiter）介入并产出约束性结论，本原语只表达双方合意 |
| 买方发起售后申请 | 买方侧（经 Marketplace 路由） | 本原语是供应商侧应答面，申请动作在买方侧 |
| 退货物流的承运与轨迹 | Shipper 角色 | 退货物流单号经 `utp.aftersale.return_shipped` 透传，供应商是消费方 |

## 与 P6 Resolve 的边界（Aftersale vs Dispute） {#s-m82}

这是本章最容易被误解的部分。售后与争议解决**不是同一件事的两种叫法**，而是两个前后衔接、性质不同的阶段：

| 维度 | MP6 售后原语（本章） | P6 Resolve（UTP-B 规范争议解决原语） |
| --- | --- | --- |
| 性质 | 双方**协商执行** | 第三方**裁决** |
| 参与方 | Buyer ↔ Marketplace ↔ Seller | Buyer ↔ Arbiter（Seller 应答） |
| 触发条件 | 买方提出售后诉求 | 售后协商不成、供应商拒绝后买方不服、验货结论有异议 |
| 产出 | `AftersaleResolution`（双方合意方案） | `ResolutionOutcome` + `CompensationOrder`（约束性裁定） |
| 资源标识 | `aftersale_id` | `dispute_id` |
| 供应商动作 | 本原语 6 个 Action | 无新增原语——经 `utp.resolve.dispute_routed` 回调答辩（见 Agent 授权链（Delegation & Mandate）） |

**衔接规则（MUST）**

- 售后 MUST 先行。买方 SHOULD 先提交售后申请；平台 MAY 对未经售后直接发起争议的请求要求先走售后（严重违约场景例外）。
- 升级后本售后单 MUST 收敛至 `CLOSED`（`close_reason = escalated_to_dispute`），并在 `dispute_ref` 中记录争议标识。争议在 dispute 资源上独立演进，本原语 MUST NOT 表达裁决过程。
- 本原语的处置记录（含拒绝原因与举证）MUST 可作为争议阶段的 Evidence Bundle 组成部分——这是"售后先行"的实际价值：**拒绝时不举证，升级后将处于举证不利地位**。
- 裁决产出的补偿 MUST 通过结算调整项落地（见 [账单出具与查询（Statements）](../../settlement.md#s-m94)），不在本原语内表达。

## Lifecycle / State Machine（售后单生命周期） {#s-m83}

状态作用域为 `resource`，锚点 `aftersale_id`。本状态机 MUST NOT 与 UTP-B 规范全局状态机混同——售后的执行结果通过退款事实与结算冲销影响交易，**不新增任何全局状态**（见 全局状态机边界声明（State Machine Boundary））。

图 M8-1 售后单状态机：处置协商（含多轮提议）→ 退货验货 → 退款完成，三个终态覆盖完成、拒绝与关闭

| 状态 | 语义 | 终态 | 本状态下供应商可执行 |
| --- | --- | --- | --- |
| `REQUESTED` | 售后请求已路由，等待处置结论 | 否 | `approve` / `reject` / `propose` / `query` |
| `PROPOSED` | 已提替代方案，等待买方回应 | 否 | 仅 `query` |
| `APPROVED` | 方案已成立，待执行（退货或退款） | 否 | 仅 `query`（需重发时用 `utp.delivery.ship`） |
| `RETURNING` | 买方退货在途 | 否 | `confirm_return` / `query` |
| `RETURN_RECEIVED` | 退货已收且验货结论已提交，待退款 | 否 | 仅 `query` |
| `COMPLETED` | 售后完成（退款到账 / 换货已发 / 补发完成） | **是** | 仅 `query` |
| `REJECTED` | 供应商拒绝，本售后单终结 | **是** | 仅 `query` |
| `CLOSED` | 买方撤回 / 回应超时 / 退货逾期 / 升级争议 | **是** | 仅 `query` |

**迁移触发的三类载体**

下表「触发」列包含三类载体，机读定义中 MUST NOT 混用（与其余 MP 原语及 UTP-B 规范 P1—P6 一致）：

| 类型 | 机读载体 | 命名 | 供应商能否调用 |
| --- | --- | --- | --- |
| **Action** | `primitive.json` 迁移的 `action` 字段 | 全限定名 `utp.aftersale.*` | **可调用**，定义见 [Actions（动作定义）](#s-m84) |
| **回调事件** | `primitive.json` 迁移的 `event` 字段 | 裸名，对应 [Callbacks（回调事件）](#s-m88) 的全限定事件名 | **不可调用**，只能接收推送 |
| **系统事件** | `primitive.json` 迁移的 `event` 字段 | 裸名 | **不可调用**，由平台时限与资金事实触发 |

> `deadline_expired`、`buyer_accept_proposal`、`refund_completed` 等 MUST NOT 被理解为本原语的 Action——供应商无法调用它们，只能通过回调或 `query`/`list` 观测其结果。供应商可调用的动作仅限 [Actions（动作定义）](#s-m84) 列出的六个。

**迁移规则**

| From | 类型 | 触发 | To | 条件 |
| --- | --- | --- | --- | --- |
| — | 回调事件 | `request_routed` | `REQUESTED` | Marketplace 校验售后窗口与订单状态后路由 |
| `REQUESTED` | **Action** | `utp.aftersale.approve` | `APPROVED` | 方案未超出买方诉求范围且签名覆盖 `resolution_hash` |
| `REQUESTED` | **Action** | `utp.aftersale.reject` | `REJECTED` | 已提供结构化拒绝原因码 |
| `REQUESTED` | **Action** | `utp.aftersale.propose` | `PROPOSED` | 未超出协商轮次上限 |
| `REQUESTED` | 回调事件 | `buyer_withdraw` | `CLOSED` | 买方主动撤回售后申请（`close_reason = buyer_withdrawn`） |
| `REQUESTED` | 系统事件 | `deadline_expired` | `APPROVED` | `timeout_policy = auto_approve`（方案取买方诉求原样，`arrived_via = timeout_auto`） |
| `REQUESTED` | 系统事件 | `deadline_expired` | `REJECTED` | `timeout_policy = auto_reject`（`arrived_via = timeout_auto`） |
| `PROPOSED` | 回调事件 | `buyer_accept_proposal` | `APPROVED` | 买方接受替代方案；对应回调 `utp.aftersale.proposal_result`（`result = accepted`） |
| `PROPOSED` | 回调事件 | `buyer_counter_proposal` | `REQUESTED` | 买方再议，`round_no` 递增；对应回调 `proposal_result`（`result = countered`） |
| `PROPOSED` | 回调事件 | `buyer_reject_proposal` | `CLOSED` | 买方拒绝方案并撤回或升级 P6；对应回调 `proposal_result`（`result = rejected`） |
| `PROPOSED` | 系统事件 | `deadline_expired` | `CLOSED` | 买方回应超时按关闭收敛（`arrived_via = timeout_auto`） |
| `APPROVED` | 回调事件 | `buyer_return_shipped` | `RETURNING` | 方案 `return_required = true` 且买方已寄回 |
| `APPROVED` | 回调事件 | `refund_completed` | `COMPLETED` | 方案 `return_required = false`，Marketplace 已退款或换货/补发已发出 |
| `APPROVED` | 系统事件 | `return_window_expired` | `CLOSED` | 方案 `return_required = true` 但买方在退货窗口内未寄回 |
| `RETURNING` | **Action** | `utp.aftersale.confirm_return` | `RETURN_RECEIVED` | 已提交验货结论 |
| `RETURNING` | 系统事件 | `return_window_expired` | `CLOSED` | 退货逾期未达 |
| `RETURN_RECEIVED` | 回调事件 | `refund_completed` | `COMPLETED` | 验货 `pass` 或 `partial`，Marketplace 已按结论执行退款 |
| `RETURN_RECEIVED` | 回调事件 | `dispute_escalated` | `CLOSED` | 验货 `fail` 且供应商已通过 P6 Resolve 提出异议，由裁决接管 |

**确定性保证**。同一状态下同一触发 MUST 只有一条可用迁移。`deadline_expired` 的多目标迁移由互斥的 `timeout_policy` 条件区分（见 通用规则继承（Commons Inheritance） 通用规则）。

**退款权限边界**。退款资金动作 MUST 由 Marketplace（代收代付方）执行；**供应商侧不存在退款 Action**，只通过 `refund_completed` 回调观测结果。

**轮次上限**。协商轮次上限由 Marketplace 受理策略声明。超限后 Marketplace MUST 拒绝新的 `propose` 并返回 `AFTERSALE.MAX_ROUNDS`，售后单停留在 `REQUESTED`——**本原语不因轮次超限自动迁移，供应商无需为此 `reject`**。

## Actions（动作定义） {#s-m84}

| Action | 语义 | 幂等 | 签名要求 |
| --- | --- | --- | --- |
| `utp.aftersale.approve` | 同意售后并给出最终方案（类型、退款金额、是否退货、运费责任） | 是 | MUST 覆盖 `resolution_hash` |
| `utp.aftersale.reject` | 拒绝售后请求，MUST 附结构化原因码 | 是 | — |
| `utp.aftersale.propose` | 提出替代方案，等待买方回应 | 是 | MUST 覆盖 `resolution_hash` |
| `utp.aftersale.confirm_return` | 确认退货收货并给出验货结论 | 是 | MUST 覆盖验货结论快照 |
| `utp.aftersale.query` | 查询单个售后单权威档案 | 是 | — |
| `utp.aftersale.list` | 筛选售后单，游标分页（轮询降级通道） | 是 | — |

**approve — 处置方案的约束**

- 方案退款金额 MUST NOT 大于 `AftersaleRequest.requested_amount`；超出时返回 `AFTERSALE.RESOLUTION_EXCEEDS_REQUEST`。需要提出更优或结构不同的方案时 MUST 使用 `propose`。
- `aftersale_type` MAY 与买方请求类型不同（如买方请求退货退款、方案为仅退款折让），此时 **MUST 视为提议性质**——实现上 SHOULD 使用 `propose` 以获得买方明确确认。
- `return_required = true` 时 MUST 提供 `return_address`，响应 MUST 返回 `return_deadline`。
- `replacement_required = true` 时，重发 MUST 通过 `utp.delivery.ship` 携带 `aftersale_ref` 执行——本原语不定义发货动作。

**reject — 举证义务**

原因码为 `no_defect_found` / `buyer_damage` / `used_or_altered` 时 SHOULD 附举证材料（`EvidenceReference`）。**这不是形式要求**：拒绝记录会进入争议阶段的证据包，缺失举证将使供应商在裁决中处于不利地位。`reason_code = other` 时 MUST 提供 `reason_note`。

**confirm_return — 验货结论的资金后果**

| `inspection_result` | 语义 | 退款执行 |
| --- | --- | --- |
| `pass` | 退回货物与方案一致 | 按方案 `refund_amount` 全额退款 |
| `partial` | 部分符合（数量短少、轻微损耗） | 按 `accepted_amount` 退款，MUST 提供 `discrepancy_note` |
| `fail` | 与方案严重不符 | 暂不退款，供应商 MAY 升级 P6；本售后单收敛 `CLOSED` |

结果非 `pass` 时 MUST 提供 `discrepancy_note`，并 SHOULD 附开箱照片等举证。`received_lines` 的数量 MUST NOT 超过方案涉及数量，否则返回 `AFTERSALE.QUANTITY_EXCEEDS_RETURN`。

## Entities（实体定义） {#s-m85}

| 实体 | 用途 | 关键约束 |
| --- | --- | --- |
| `AftersaleRequest` | 买方售后请求（回调载荷核心） | `requested_amount` 构成方案金额上限 |
| `AftersaleResolution` | 处置方案 | `resolution_hash` 为签名对象；`return_required` 决定后续状态路径 |
| `AftersaleRecord` | 售后单权威档案 | 含历史提议、验货结论、退款凭据与关闭原因，支持按 `aftersale_id` 幂等重放 |
| `ReturnReceipt` | 退货收货与验货结论 | 非 `pass` 时 MUST 提供差异说明 |
| `AftersaleType` | 售后类型枚举 | `refund_only` / `return_refund` / `exchange` / `replenish` / `repair` |
| `AftersaleReason` | 买方申请原因码 | 9 项，供 Agent 自动决策判定 |
| `AftersaleRejectReason` | 供应商拒绝原因码 | 7 项，MUST 结构化 |
| `InspectionResult` | 验货结论 | `pass` / `partial` / `fail` |
| `FreightResponsibility` | 退货运费责任方 | 质量问题类 SHOULD 由卖方承担 |

**通用类型复用（MUST NOT 自建副本）：**`Money`、`Address`、`Signature`、`EvidenceReference` 全部引用 UTP 规范通用实体（见 [Schema 索引](../../../schemas/index.md)）。分页复用 `common/pagination.json`（游标制）。

## Error Handling（错误码） {#s-m86}

错误码格式继承 UTP 规范 [标准错误响应格式](../../../protocol-core/primitive-framework.md#s-1043-standard-error-response) 标准错误响应。

| 错误码 | HTTP | 语义 | 恢复建议 |
| --- | --- | --- | --- |
| `AFTERSALE.NOT_FOUND` | 404 | 售后单不存在或无权访问 | 核对 `aftersale_id`；用 `list` 拉取当前待处理队列 |
| `AFTERSALE.STATE_CONFLICT` | 409 | 当前状态不允许该动作（含终态后写操作） | `query` 获取权威状态与 `valid_next_actions` |
| `AFTERSALE.DEADLINE_PASSED` | 409 | 处置截止时间已过，已按 `timeout_policy` 自动收敛 | `query` 确认自动处置结论 |
| `AFTERSALE.RESOLUTION_EXCEEDS_REQUEST` | 422 | 方案退款金额超过买方诉求上限 | 下调金额，或改用 `propose` 提出结构不同的方案 |
| `AFTERSALE.MAX_ROUNDS` | 409 | 已达协商轮次上限 | `approve` 或 `reject` 收敛；不可继续 `propose` |
| `AFTERSALE.RETURN_NOT_REQUIRED` | 422 | 方案不需退货，`confirm_return` 不适用 | 核对方案 `return_required` |
| `AFTERSALE.QUANTITY_EXCEEDS_RETURN` | 422 | 验货数量超过方案涉及数量 | 核对 `received_lines` 与方案 `lines` |
| `AFTERSALE.REASON_REQUIRED` | 422 | 缺少必需的原因码或原因说明 | 补充结构化 `reason_code`（`other` 时补 `reason_note`） |
| `AFTERSALE.SIGNATURE_INVALID` | 401 | 业务签名验证失败或未覆盖应签哈希 | 核对签名对象与 `key_id`；重新签署 |
| `AFTERSALE.INVALID_CURSOR` | 422 | 分页游标无效或已过期 | 从首页重新拉取 |

## Scopes（授权范围） {#s-m87}

| Scope | 覆盖动作 | Mandate 类型 |
| --- | --- | --- |
| `aftersale:write` | `approve` / `reject` / `propose` / `confirm_return` | `operation` |
| `aftersale:read` | `query` / `list` | `operation` |

写操作 MUST 先完成 UTP 规范《安全与信任》的[操作准入](../../../protocol-core/security-trust.md#s-5-trust-profile)判定，并持有 `operation` Mandate（见 通用规则继承（Commons Inheritance））。Agent 自主处置时 MUST 记录决策审计（见 决策审计（Decision Audit）），`decided_by = policy_auto` 时 MUST 提供 `policy_ref`。

## Callbacks（回调事件） {#s-m88}

| 事件 | 触发时机 | 供应商动作 |
| --- | --- | --- |
| `utp.aftersale.request_routed` | 买方售后请求已路由 | **deadline 内 approve / reject / propose** |
| `utp.aftersale.proposal_result` | 买方对替代方案的回应 | `countered` 时需重新处置；`accepted` / `rejected` 为只读 |
| `utp.aftersale.return_shipped` | 买方已寄回退货（附物流单号） | 准备收货，收货后 `confirm_return` |
| `utp.aftersale.refund_completed` | 平台退款完成（附退款凭据） | 只读——冲销 ERP 应收，核对结算调整项 |
| `utp.aftersale.closed` | 售后关闭（撤回 / 超时 / 逾期 / 升级） | 只读；`escalated_to_dispute` 时准备争议答辩 |

推送失败按指数退避重试（≤5 次）后转轮询降级——`list` 与 `query` 是兜底通道，**推送丢失 MUST NOT 阻塞业务**（见 [Step 5：回调登记与连通性验收（Callback & Readiness）](../../onboarding.md#s-m26)）。

## Mode 影响（Mode Sensitivity） {#s-m810}

本原语默认 Mode 无关（见 Mode 对供应商侧的影响（Mode Awareness））。Mode 仅在以下三处影响行为，未列出的差异 MUST 视为不存在：

| Mode 维度 | 影响点 | 行为 |
| --- | --- | --- |
| `settlement_mode` | 退款执行路径 | `escrow`：退款从平台托管账户直接退回，冲销结算未打款条目；`direct`：若已打款，退款生成结算负向调整项在后续账期扣回 |
| `fulfillment_mode` | 退货收货方 | `platform_warehouse`：退货寄回平台仓，验货由平台执行，供应商收到验货结论后确认；`seller_direct`：退货直寄供应商，由供应商验货 |
| `trade_scale` | 处置时限与轮次 | 大额/批量订单的 `deadline` 与协商轮次上限 SHOULD 更宽松，具体值由 Marketplace 受理策略声明 |

## Examples（示例） {#s-m811}

**示例 1：质量问题退货退款（完整闭环）**

```
// ① 回调：售后请求路由
{ "event": "utp.aftersale.request_routed",
  "event_id": "evt-as-8891", "occurred_at": "2026-08-04T09:12:00Z",
  "payload": {
    "aftersale_id": "as-7721", "purchase_id": "po-5580",
    "transaction_id": "txn-3310", "delivery_ref": "shp-9042",
    "aftersale_type": "return_refund", "reason_code": "quality_defect",
    "requested_amount": { "amount": "4800.00", "currency": "CNY" },
    "evidence_count": 3, "round_no": 1,
    "deadline": "2026-08-06T09:12:00Z", "timeout_policy": "auto_approve" } }

// ② 供应商同意（方案：退货退款，卖方承担运费）
POST /utp/m/v1/aftersales/as-7721/approve
{ "idempotency_key": "as-7721-approve-1",
  "resolution": {
    "aftersale_type": "return_refund",
    "refund_amount": { "amount": "4800.00", "currency": "CNY" },
    "return_required": true, "replacement_required": false,
    "freight_responsibility": "seller",
    "return_address": { "country": "CN", "province": "浙江省", "city": "金华市",
                        "detail": "义乌市××工业区 3 号仓 退货组" },
    "resolution_hash": "b41c…8ff2" },
  "seller_signature": { "algorithm": "ES256", "key_id": "sup-key-01", "value": "eyJhbGc…" },
  "decided_by": "agent", "policy_ref": "aftersale-policy-v3" }

→ 200 { "aftersale_id": "as-7721", "status": "APPROVED",
        "return_deadline": "2026-08-11T23:59:59Z",
        "refund_execution_owner": "marketplace",
        "valid_next_actions": ["utp.aftersale.query"] }

// ③ 回调：买方寄回 → ④ 供应商确认收货与验货
POST /utp/m/v1/aftersales/as-7721/return-receipt
{ "idempotency_key": "as-7721-return-1",
  "return_receipt": {
    "received_at": "2026-08-08T14:30:00Z",
    "received_lines": [ { "line_no": 1, "quantity": 200 } ],
    "inspection_result": "pass", "inspector": "human" },
  "seller_signature": { "algorithm": "ES256", "key_id": "sup-key-01", "value": "eyJhbGc…" },
  "decided_by": "human" }

→ 200 { "status": "RETURN_RECEIVED", "inspection_result": "pass",
        "refund_amount_to_execute": { "amount": "4800.00", "currency": "CNY" },
        "refund_execution_owner": "marketplace" }

// ⑤ 回调：平台退款完成 → COMPLETED
{ "event": "utp.aftersale.refund_completed",
  "payload": { "aftersale_id": "as-7721", "refund_ref": "rfd-20260808-4471",
               "refund_amount": { "amount": "4800.00", "currency": "CNY" },
               "settlement_adjustment_ref": "adj-88301",
               "completed_at": "2026-08-08T16:05:00Z" } }
```

**示例 2：替代方案协商（供应商提议部分退款免退货）**

```
POST /utp/m/v1/aftersales/as-7902/proposals
{ "idempotency_key": "as-7902-propose-1",
  "resolution": {
    "aftersale_type": "refund_only",
    "refund_amount": { "amount": "600.00", "currency": "CNY" },
    "return_required": false, "freight_responsibility": "seller",
    "compensation_note": "保留货物，按 12.5% 折让补偿外观瑕疵",
    "resolution_hash": "77ad…c105" },
  "rationale": "经比对买方举证照片，瑕疵属表面划痕，不影响功能使用；退货运费与再包装成本高于折让金额，折让方案对双方更优。",
  "evidence": [ { "evidence_id": "ev-insp-5512" } ],
  "valid_until": "2026-08-05T18:00:00Z",
  "seller_signature": { "algorithm": "ES256", "key_id": "sup-key-01", "value": "eyJhbGc…" },
  "decided_by": "agent", "policy_ref": "aftersale-policy-v3" }

→ 200 { "aftersale_id": "as-7902", "status": "PROPOSED", "round_no": 1,
        "buyer_confirmation_required": true,
        "valid_next_actions": ["utp.aftersale.query"] }

// 买方回应（回调）
{ "event": "utp.aftersale.proposal_result",
  "payload": { "aftersale_id": "as-7902", "round_no": 1, "buyer_response": "accepted" } }
→ 售后单进入 APPROVED，平台执行 600.00 退款
```

**示例 3：拒绝售后（附举证）**

```
POST /utp/m/v1/aftersales/as-8033/reject
{ "idempotency_key": "as-8033-reject-1",
  "reason_code": "buyer_damage",
  "reason_note": "退回样品的断裂面呈外力冲击特征，与出厂检测记录（ev-qc-2201）及发货前影像（ev-img-7740）不一致。",
  "evidence": [ { "evidence_id": "ev-qc-2201" }, { "evidence_id": "ev-img-7740" } ],
  "decided_by": "human" }

→ 200 { "aftersale_id": "as-8033", "status": "REJECTED",
        "reject_reason": "buyer_damage",
        "valid_next_actions": [] }

// 买方不服 → 通过 P6 Resolve 发起争议（新 dispute 资源）
// 本售后单保持 REJECTED；供应商经 utp.resolve.dispute_routed 回调答辩，
// 本次拒绝的原因码与举证 MUST 可作为 Evidence Bundle 组成部分。
```

**示例 4：换货（复用 MP5 交付原语重发）**

```
① approve  → resolution { aftersale_type: "exchange",
                          return_required: true, replacement_required: true }
② 回调 return_shipped → 买方寄回
③ confirm_return（inspection_result: pass）→ RETURN_RECEIVED
④ 重发 MUST 用 MP5：
   POST /utp/m/v1/deliveries
   { "purchase_ref": "po-5580", "aftersale_ref": "as-7721", … }
   ↑ 携带 aftersale_ref 建立关联；本原语不定义发货动作（原语正交性）
⑤ 回调 refund_completed（换货场景表达"重发已完成"）→ COMPLETED
```
