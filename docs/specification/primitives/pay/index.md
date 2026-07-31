---
title: 支付原语
section: primitives
owner: payment-team
status: drafting
version: 2026-07-29
---

# Pay 支付原语 {#s-14-p4-pay}

## 原语身份 {#s-_1}

```
primitive_id:   utp.pay
version:        2026-07-01
intent:         执行资金转移
state_delta:    purchase → payment_confirmed
actions:        initiate, confirm, term, query, refund
compensation:   refund + release_authorization
precondition:   valid PurchaseCredential exists
```

---

## Overview（概述） {#s-141-overview}

### 意图 {#s-1411}

Pay 是 UTP 第四个交易原语（P4），其意图是**执行资金转移** —— 将采购方（或其指定的支付方）的资金按照 PurchaseCredential 中约定的条款转移至供应商（或其指定的收款方）。Pay 的产出是** 支付确认凭证（PaymentConfirmation）**，包含支付请求、采购聚合、金额、时间戳、支付工具标识和证据包引用；协议级 `transaction_id` 由统一 Action 信封承载。

Pay 是交易从"订购确认"走向"执行"的第一个实质动作。在 P3 标准响应确认独立交易边界，且该响应被 `evaluate_result` 接受并由路径编排生成 `transaction_id` 后，Pay 原语负责将财务义务转化为实际的资金流动。Pay 原语的设计核心是**安全**（敏感支付凭证不明文传输）和** 可收敛性**（渠道回调、主动查询与退款补偿必须收敛到同一交易锚点）。

### 关键设计原则 {#s-1412}

**Tokenizer 模式保障支付安全。** 卡号、账户余额、钱包凭证等敏感信息 MUST NOT 在业务层明文传输。所有支付凭证 MUST 通过 Tokenizer 机制进行令牌化处理 —— 支付工具的真实凭证由 Tokenizer 服务安全存储，业务层仅传递令牌（token）。这一设计确保即使业务层通信被截获，攻击者也无法获取支付工具的真实信息。

**Mandate 凭证保障 Agent 参与支付的可验证性。** 支付请求 MUST 携带成对的 Closed Checkout Mandate 与 Closed Payment Mandate：前者授权完成商家签署的具体结算，后者授权该结算的支付，二者 MUST 以结算哈希绑定。用户在场时由用户直接签发 closed 凭证；用户不在场时，还 MUST 携带成对的 Open Checkout Mandate 与 Open Payment Mandate，由用户预先确定 Agent 可执行的结算和支付边界。对精确结算的受信确认或运行时证明仅在目标操作声明要求时提供。

若支付前置的企业审批、付款阶段触发、退款/取消或验收放款等操作需要额外授权，Payment Request MAY 同时携带 Operation Mandate；但 Operation Mandate MUST NOT 替代支付工具、支付凭证或支付方策略所要求的资金授权。

**分阶段支付与 Fulfill 交叉编排。** 当 `payment_structure >= L2` 时，Pay 原语分解为多个子步骤。每个子步骤对应 TradeMethod 中的一个 `sub_step`（如定金、进度款、尾款），子步骤之间可以穿插 Fulfill 原语的子步骤（如备货完成触发进度款、验收通过触发尾款）。

**Agent 支付安全纵深防御。** Agent 代用户执行支付时，MUST 满足以下四层安全约束：

- **L1 凭证隔离层：** 原始支付凭证 MUST NOT 暴露给 Agent。所有支付工具引用 MUST 通过 Tokenizer 令牌化或 PaymentBinding 受限绑定传递。
- **L2 授权边界层：** Agent 的支付权限 MUST 受 DelegationCredential 或 MandateChain 显式约束，包括金额上限、商户范围、有效期。超出边界的支付请求 MUST 被拒绝。
- **L3 执行可信层：** 涉及资金变动的关键操作（支付授权签名）MUST 在 TEE 或等效安全执行环境中完成，确保 WYSIWYS 字节级确认。
- **L4 审计追溯层：** 所有支付安全事件（授权、扣款、吊销、异常）MUST 生成不可篡改的审计日志，并追加至证据包（EvidenceBundle）。

### 范围 {#s-1413}

Pay 覆盖以下场景：

- **B2C 即时全额支付**：采购方一次性支付全部金额，支付工具为支付宝、微信支付、云闪付等。
- **B2B 分阶段支付**：按 TradeMethod 约定的付款阶段计划（如 30% 定金 → 50% 进度款 → 20% 尾款）分次执行支付。
- **B2B 账期支付**：在约定的账期内（如 Net-30、Net-60）完成支付。
- **Escrow 托管支付**：资金先转入托管方（Escrow），待验收通过后由托管方释放给供应商。
- **信用证支付**：跨境场景下通过银行信用证完成支付。

### 前置条件 {#s-1414}

| 条件 | 必需？ | 说明 |
| --- | --- | --- |
| 存在有效的 PurchaseCredential | MUST | Pay MUST 在 Purchase 原语成功完成后才能执行。PurchaseCredential 中的 `payment_due` 指明下一付款阶段待付金额。 |
| `session.state == 'PURCHASING'` 或后续支付阶段 | MUST | 会话已完成订购确认，处于可支付状态。 |
| 支付工具已配置（TokenizerConfig 存在） | MUST | 采购方 MUST 在 Profile 或运行时声明至少一种可用的支付工具及其 Tokenizer 配置。 |
| 适用 Mandate 齐备（当 Agent 代付时） | MUST | 支付请求 MUST 携带成对的 Closed Checkout Mandate 与 Closed Payment Mandate；用户不在场时，还 MUST 携带关联的 open 凭证对，并证明 closed 凭证未超出其约束。 |
| 支付方式绑定已完成（当使用绑定模式时） | SHOULD | 若采用支付方式绑定机制，Buyer Agent MUST 持有有效的 `PaymentBinding` 引用，且绑定状态为 `active`。绑定关系将支付工具与 Agent 身份建立受限关联，避免原始账户信息暴露。 |
| 委托授权凭证有效（当使用委托支付模式时） | SHOULD | 若 Buyer Agent 在用户不在场场景下发起支付，MUST 持有有效的 `DelegationCredential`，且凭证未过期、未吊销、授权额度充足。凭证由用户预先签发，定义支付的金额上限、商户范围和有效期。 |

### 后置条件 {#s-1415}

| 条件 | 说明 |
| --- | --- |
| `session.state == 'FULFILLING'`（全额支付完成且进入履约阶段时） | 所有应付款项均已确认到账。 |
| 或 `session.state` 保持 `'PAYING'`（分阶段支付中） | 部分款项已付，仍有未付阶段。 |
| PaymentConfirmation 已生成 | 每笔支付均产出独立的确认凭证。 |
| `evidence_bundle` 已追加支付证据 | 支付凭证、时间戳、Tokenizer 审计日志已追加至证据包。 |
| Escrow 资金已入托管（若适用） | 当拓扑中包含 Escrow 角色时，资金 MUST 先入托管账户。 |

### 语义契约 {#s-1416}

```json
{
  "primitive": "utp.pay",
  "preconditions": [
    "session.state ∈ {PURCHASING, PAYING}",
    "transaction_id != null",
    "purchase_credential != null && purchase_credential.status == 'purchased'",
    "payment_due.next_term != null",
    "tokenizer_config != null || payment_instrument.type == 'escrow'",
    "IF agent_paying → mandate_chain.complete(Intent, Cart, Payment)"
  ],
  "postconditions": [
    "payment_confirmation != null",
    "payment_confirmation.amount == payment_due.amount",
    "payment_confirmation.status == 'confirmed'",
    "evidence_bundle.append(['payment_token_hash', 'payment_timestamp', 'instrument_type'])",
    "IF all_steps_paid → session.state == 'FULFILLING'",
    "IF escrow_mode → escrow.status == 'funded' || escrow.status == 'released'"
  ],
  "invariants": [
    "Σ(payment_confirmations.amount) <= purchase_credential.total",
    "action_request.transaction_id == purchase_credential.transaction_id",
    "payment_request.purchase_id == purchase_credential.purchase_id (标的物一经绑定不可篡改)",
    "payment_request.amount_breakdown != null → (amount_breakdown.subtotal + amount_breakdown.shipping_fee + amount_breakdown.tax - amount_breakdown.discount == payment_request.amount)",
    "payment_request.settlement != null → Σ(payment_request.settlement.splits[].amount) == payment_request.amount",
    "payment_request.escrow_mode == true AND payment_request.settlement != null → payment_request.settlement.settlement_type == 'escrow'",
    "payment_request.settlement.settlement_type IN ('instant','deferred') → payment_request.escrow_mode == false",
    "payment_confirmation.token != plaintext_credential (Tokenizer 安全不变式)",
    "mandate_chain.verify() == true (Agent 支付场景)",
    "payment_binding.status == 'active' → binding.constraints.amount_limit >= payment_request.amount",
    "delegation_credential.consumed_amount + payment_request.amount <= delegation_credential.amount_limit",
    "audit_log.append(payment_event) == true (所有支付安全事件)"
  ],
  "side_effects": [
    "资金从采购方账户扣款或冻结",
    "供应商收到到账通知（或 Escrow 托管确认）",
    "支付工具侧生成交易流水号",
    "证据包追加支付事件记录"
  ],
  "compensation": {
    "on_payment_failure": "解除支付授权 → 通知采购方 → 状态保持 PAYING",
    "on_tokenizer_error": "中止支付 → 记录审计日志 → 返回结构化错误",
    "on_escrow_timeout": "释放托管冻结 → 通知各方 → 状态回退",
    "on_dispute_during_payment": "冻结当前支付 → 激活 Resolve 原语"
  }
}
```

### Dynamic Linking（支付授权动态关联） {#s-1417-dynamic-linking}

参照强客户认证（Strong Customer Authentication, SCA）的**动态关联（Dynamic Linking）** 原则：用户对支付的授权与认证 MUST 与本笔交易的**（金额 + 收款方）** 密码学绑定，使一次认证结果 MUST NOT 被复用到另一金额或另一收款方。

1. Payment Mandate 的用户签名（在 TEE 内经 WYSIWYS 确认生成，见[Payment Mandate 规则](/documentation/specification/protocol-core/identity-authorization.html#s-6423)）MUST 覆盖 `authorized_amount` 与收款方标识；二者任一变化 MUST 使既有确认与签名失效并重新确认。
2. 用户认证因子（生物识别 / PIN，见[人机交互协同](/documentation/specification/protocol-core/human-agent-interaction.html)确认面）的确认结果 MUST 绑定到该 Payment Mandate 的内容哈希（`confirmed_hash`，见[确认内容绑定规则](/documentation/specification/protocol-core/identity-authorization.html#s-643)），MUST NOT 以“仅确认过一次”的形式复用于不同金额或收款方。
3. 强确认下限：交易金额达到或超过 `confirmation_threshold`，或目标支付操作要求 Human Confirmation / Payment Mandate 强确认时（见[安全与信任规则](/documentation/specification/protocol-core/security-trust.html)），MUST 要求多因子 / 生物识别确认，MUST NOT 仅凭点击放行大额支付。协议 MUST 设默认下限，实现方 MAY 收紧但 MUST NOT 放宽至无强确认即可完成大额支付。
4. B2C 一次性授权复用 MUST 设协议级上限：单次授权的累计金额、复用次数与时间窗 MUST 有明确上界，超出 MUST 重新进行用户强确认。

动态关联将“该用户授权了这笔金额支付给这个收款方”钉死在认证凭证中，防止认证结果被移花接木到其他交易；其确认要求由 Checkout Mandate、Payment Mandate、Human Confirmation 与目标支付操作的准入声明共同确定（见[安全与信任规则](/documentation/specification/protocol-core/security-trust.html)）。

---

## Lifecycle / State Machine（生命周期 / 状态机） {#s-142-lifecycle-state-machine}

### Pay 原语内部状态机 {#s-1421-pay}

![Pay 原语内部状态机](/documentation/assets/diagrams/pay-state-machine.svg)

### 状态定义与迁移规则 {#s-1422}

| 状态 | 含义 | 进入条件 | 允许的操作 |
| --- | --- | --- | --- |
| `INIT` | 尚未发起支付 | 会话进入 `PAYING` 阶段，PurchaseCredential 已就绪 | `pay.initiate` |
| `AUTHORIZED` | 支付授权已冻结 | `pay.initiate` 成功，支付工具已授权（如预授权冻结）。当使用支付方式绑定时，表示绑定关系已验证且支付工具引用有效。 | `pay.confirm`, `pay.term` |
| `PROCESSING` | 支付正在处理中 | `pay.confirm` 或 `pay.term` 已调用，等待支付渠道确认 | 等待支付渠道回调 |
| `CONFIRMED` | 当期支付已确认到账 | 支付渠道返回 `PAYMENT_CAPTURED` | 自动判定后续付款阶段；经授权可执行 `pay.refund` |
| `PARTIAL` | 部分款项已付 | 至少一个付款阶段已完成，但仍有未付阶段 | `pay.term`（下一付款阶段）或经授权执行 `pay.refund` |
| `COMPLETED` | 全部支付完成 | 所有付款阶段均已 `CONFIRMED` | 只读查询，或经授权执行 `pay.refund`；全局状态迁移至 `FULFILLING` |
| `FAILED` | 支付失败 | 支付渠道返回失败 | 补偿链执行后可重试 `pay.initiate` |
| `COMPENSATED` | 补偿完成 | 补偿链执行完毕（退款/解除授权） | 可重新发起 `pay.initiate` |

### 分阶段支付的状态编排 {#s-1423}

当 `payment_structure >= L2` 时，Pay 与 Fulfill 原语交叉执行。协议引擎 MUST 按 TradeMethod 中的 `sub_steps` 定义编排执行顺序：

```
payment_structure = L2 示例（定金 30% / 进度款 50% / 尾款 20%）

  pay.term (定金 30%)
       |
       v
  CONFIRMED → fulfill.notify（订单发货）
       |
       v
  fulfill.notify（订单发货） → pay.term (进度款 50%)
       |
       v
  CONFIRMED → fulfill.notify（验货结论） → fulfill.receive (收货)
       |
       v
  pay.term (尾款 20%)
       |
       v
  COMPLETED
```

### 与全局状态机的关系 {#s-1424}

Pay 对应全局状态 `PAYING`。当全额支付完成（Pay 原语内部状态 `COMPLETED`）后，全局状态迁移至 `FULFILLING`，进入 Fulfill 原语阶段。若支付失败（Pay 原语内部状态 `FAILED`），全局状态保持 `PAYING`，允许重试或激活 Resolve 原语。

**事务标识符行为：** Pay 阶段 MUST 携带 `transaction_id`，同时引入支付渠道层的 `channel_transaction_id`（如支付宝交易号、SWIFT 报文号）。两者是不同层级的标识：`transaction_id` 是协议级事务标识，`channel_transaction_id` 是支付基础设施的流水号。一个 `transaction_id` 下可能关联多个 `channel_transaction_id`（如多阶段付款场景）。Bridge 在此阶段记录 `transaction_id` ↔ 内部付款单号的映射。

### 支付事件与渠道适配契约 {#s-1425}

Pay 的公共语义以 `transaction_id`、`payment_request_id` 和标准 PaymentEvent 收敛，不直接暴露渠道私有状态。支付渠道、银行、钱包或 Escrow Provider 返回的回调 MUST 先由 Payment Adapter 映射为标准事件，再参与 Pay 内部状态机和全局状态机判定。

| 标准事件 | 触发来源 | Pay 状态影响 | 全局状态影响 |
| --- | --- | --- | --- |
| `PAYMENT_AUTHORIZED` | 支付工具预授权或余额冻结成功 | `AUTHORIZED` | 保持 `PAYING` |
| `PAYMENT_CAPTURED` | 渠道确认扣款或入托管成功 | `CONFIRMED` / `PARTIAL` / `COMPLETED` | 按付款义务是否完成保持 `PAYING` 或进入 `FULFILLING` |
| `PAYMENT_FAILED` | 渠道拒绝、授权失效、风控拒绝或超时后最终状态确认失败 | `FAILED` | 保持 `PAYING`，可重试或进入 Resolve |
| `PAYMENT_REFUNDED` | `utp.pay.refund` 或 Escrow 退款完成 | 全额终止性退款进入 `COMPENSATED`；部分退款保留 `CONFIRMED`、`PARTIAL` 或 `COMPLETED` | 由 Resolve 或 Saga 规则决定恢复、继续或终止交易 |

Payment Adapter Contract（支付适配契约）至少包含三项职责：验证渠道回调签名；将渠道状态映射为标准 PaymentEvent；保证同一 `idempotency_key` 与渠道流水不会重复触发资金变动。公共协议不得把渠道原始枚举作为全局迁移条件。

---

## Error Handling（错误处理） {#s-143-error-handling}

### 错误码定义 {#s-1431}

| 错误码 | 严重级别 | HTTP 映射 | 描述 | 建议处理 |
| --- | --- | --- | --- | --- |
| `PAY.INITIATE.NO_INSTRUMENT` | error | 400 | 未配置有效的支付工具（TokenizerConfig 缺失或所有支付工具均不可用）。 | 配置支付工具后重试。 |
| `PAY.INITIATE.INVALID_PURCHASE` | error | 400 | PurchaseCredential 无效或已过期。 | 检查订购凭证状态。 |
| `PAY.INITIATE.AMOUNT_MISMATCH` | error | 400 | 请求支付金额与 `payment_due.amount` 不一致。 | 使用 `payment_due.amount` 中的金额。 |
| `PAY.INITIATE.MANDATE_INCOMPLETE` | error | 403 | 缺少本会话或支付方要求的 Mandate，或凭证与交易模式不匹配。 | 补充适用的 Mandate，或按要求完成用户确认后重试。 |
| `PAY.INITIATE.MANDATE_EXPIRED` | error | 410 | Mandate 凭证已过期（超过有效期或被撤销）。 | 重新获取用户授权。 |
| `PAY.CONFIRM.CHANNEL_FAILED` | error | 502 | 支付渠道返回失败（余额不足、银行拒绝、网络超时等）。 | 检查支付渠道状态，更换支付工具后重试。 |
| `PAY.CONFIRM.TOKEN_INVALID` | error | 400 | Tokenizer 令牌无效或已过期。 | 重新获取支付令牌。 |
| `PAY.CONFIRM.TEE_VERIFICATION_FAILED` | error | 403 | TEE 环境验证失败（WYSIWYS 确认内容与实际支付内容不一致）。 | 重新在 TEE 中执行用户确认流程。 |
| `PAY.CONFIRM.ESCROW_REJECTED` | error | 409 | Escrow 托管方拒绝接收资金（账户异常、合规检查未通过等）。 | 联系 Escrow 方处理异常。 |
| `PAY.TERM.ORDER_VIOLATION` | error | 400 | 付款阶段顺序违规（跳过前置阶段或重复支付同一阶段）。 | 按 `sub_steps` 顺序依次支付。 |
| `PAY.TERM.PRECONDITION_UNMET` | error | 409 | 当前付款阶段的前置条件未满足（如进度款需要 Fulfill 备货完成作为前置条件）。 | 完成前置的 Fulfill 步骤后重试。 |
| `PAY.TERM.ALL_COMPLETED` | warning | 409 | 所有付款阶段均已完成，无剩余待付阶段。 | 无需操作。 |
| `PAY.TIMEOUT` | error | 504 | 支付操作超时（等待支付渠道确认超时）。 | 补偿链自动解除授权。可在确认支付渠道状态后重试。 |
| `PAY.DUPLICATE` | error | 409 | 幂等键重复但请求内容不一致。 | 使用新的幂等键。 |
| `PAY.RISK_REJECTED` | warning | 403 | 风控系统拒绝本次支付（可疑交易、限额超限等）。 | 联系支付服务方解除风控限制。 |
| `PAY.BINDING.INVALID` | error | 400 | 支付方式绑定无效、已过期或已吊销。绑定状态非 `active` 或与当前 Agent 身份不匹配。 | 重新完成支付方式绑定流程，获取有效的 `PaymentBinding`。 |
| `PAY.DELEGATION.CREDENTIAL_EXPIRED` | error | 410 | 委托授权凭证已过期、已吊销或已暂停，不可继续作为支付授权依据。 | 由用户重新签发有效的 `DelegationCredential`。 |
| `PAY.DELEGATION.AMOUNT_EXCEEDED` | error | 400 | 本次支付金额与已确认累计金额之和超出 `DelegationCredential` 定义的授权总额上限。 | 调整支付金额，或由用户重新签发更高额度的委托凭证。 |
| `PAY.AUTONOMOUS.PAYMENT_PROOF_INVALID` | error | 403 | 支付授权结果凭证无效、已过期、不存在，或与当前资源访问请求不一致。 | 重新调用 `utp.pay.request_payment` 获取有效凭证。 |
| `PAY.QUERY.NOT_FOUND` | error | 404 | 指定的 `payment_request_id` 或 `purchase_id` 不存在，或不属于当前可访问会话。 | 核对标识符，或改用其他查询维度。 |

### 补偿链执行 {#s-1432}

当 Pay 执行失败时，协议引擎 MUST 根据失败阶段自动执行补偿：

```
失败原因                    补偿动作序列
─────────────────────────────────────────────────────────
支付渠道失败           →    解除支付授权冻结
                          → 记录审计日志
                          → 通知采购方
                          → 状态 → FAILED

Tokenizer 令牌异常      →    中止支付流程
                          → 撤销已发出的令牌
                          → 记录安全审计日志
                          → 状态 → FAILED

Escrow 入托管超时       →    解除资金冻结
                          → 通知各方
                          → 状态 → FAILED

TEE 验证失败            →    中止支付
                          → 记录安全事件
                          → 通知用户（非 Agent 通道）
                          → 状态 → FAILED

超时                  →    解除所有授权冻结
                          → 查询支付渠道最终状态
                          → 若已扣款则以渠道最终状态确认并记录证据
                          → 状态 → FAILED 或 CONFIRMED（依据最终查询结果）
```

### 错误响应格式 {#s-1433}

```json
{
  "error": {
    "code": "PAY.CONFIRM.CHANNEL_FAILED",
    "severity": "error",
    "message": "Payment channel returned failure: insufficient balance in linked account.",
    "details": {
      "purchase_id": "pur-20260718-001",
      "transaction_id": "utp-txn-20260718-001",
      "payment_request_id": "pay-req-20260720-001",
      "payment_term_id": "定金",
      "amount": { "amount": "25074.40", "currency": "CNY" },
      "instrument_type": "alipay",
      "channel_error_code": "INSUFFICIENT_BALANCE",
      "compensation_executed": ["auth_release", "audit_log"]
    },
    "retryable": true,
    "request_id": "req-pay-confirm-20260720-001",
    "timestamp": "2026-07-20T10:05:40Z",
    "recovery_actions": [
      {
        "action": "switch_instrument",
        "description": "切换至其他支付工具（如微信支付、云闪付）后重试"
      },
      {
        "action": "top_up",
        "description": "充值后重试当前支付"
      }
    ]
  }
}
```

---

## 角色与访问约束 {#s-144-scopes}

Pay 不定义固定的 OAuth scope。能力提供方必须在 Profile 的 `utp.pay` 声明中决定是否配置 `authorization`；支付记录、凭证与托管信息的可见性由能力提供方策略控制。

| 操作 | 描述 | 授予方 | 默认分配 |
| --- | --- | --- | --- |
| `initiate` | 发起支付请求。 | 协议默认 | Buyer（或 Payer 角色） |
| `confirm` | 确认支付完成（验证支付渠道回调）。 | 协议默认 | 协议引擎自动执行；Buyer 可手动确认 |
| `term` | 执行一个付款阶段。 | 协议默认 | Buyer（或 Payer 角色） |
| `view` | 查看支付状态和支付凭证详情。 | 协议默认 | Buyer、Seller 角色；Escrow 角色可见托管相关字段 |
| `refund` | 发起退款（补偿链的一部分）。 | 协议按需触发 | 协议引擎（自动补偿）或 Resolve 原语 |
| 支付证据 | 访问支付相关的完整证据包。 | 协议按需授予 | Buyer、Seller 角色；Resolve 原语激活时对 Arbiter 角色开放 |

**权限约束：**

- Seller MUST NOT 执行 `initiate` 或 `term` 操作 —— 支付的发起方始终是 Buyer（或其指定的 Payer 角色）。
- 当拓扑中包含 Escrow 角色时，资金流向为 Buyer → Escrow → Seller。Seller 仅可在 Escrow 释放后查看到账信息，MUST NOT 直接触发资金释放。
- `refund` 操作仅可由协议引擎（补偿链自动触发）或 Resolve 原语（争议解决裁定）调用。Buyer 和 Seller MUST NOT 直接调用 `refund`。

---

## Guidelines（角色职责指引） {#s-145-guidelines}

### Buyer 角色职责 {#s-1451-buyer}

| 职责 | 级别 | 说明 |
| --- | --- | --- |
| 配置支付工具 | MUST | 在 `pay.initiate` 前 MUST 确保至少一种支付工具可用（TokenizerConfig 有效、余额/额度充足）。 |
| 发起支付 | MUST | 调用 `pay.initiate` 发起支付请求。金额 MUST 与 `payment_due.amount` 一致。 |
| 提供 Mandate 链 | 取决于目标操作准入要求 | Agent 代用户支付时 MUST 携带成对的 Closed Checkout Mandate 与 Closed Payment Mandate；用户不在场时，还 MUST 携带关联的 open 凭证对。 |
| TEE 确认 | 取决于目标操作准入要求 | 当目标操作要求受信确认时，用户对 closed 凭证（人在场）或 open 凭证对（人不在场）的确认 MUST 在受信环境中可验证。 |
| 按期支付 | SHOULD | 多阶段付款场景下 SHOULD 按 TradeMethod 约定的时间节点完成各期支付。逾期可能触发违约条款。 |
| 确认支付结果 | SHOULD | 收到支付确认通知后 SHOULD 核实金额与预期一致。若发现异常 MUST 及时发起 Resolve。 |
| 维护支付方式绑定 | SHOULD（绑定模式时） | 当采用支付方式绑定机制时，Buyer Agent SHOULD 主动维护 `PaymentBinding` 的有效性，包括监控绑定状态、在过期前续期、在失效时重新绑定。绑定关系确保支付工具与 Agent 身份的受限关联。 |
| 执行委托支付本地预检 | MUST（委托支付模式时） | 当使用 `DelegationCredential` 发起委托支付时，Buyer Agent MUST 在构造请求前执行本地预检，验证凭证有效性、授权额度充足、目标商户在允许范围内、当前时间在有效期内。预检未通过时 MUST NOT 继续发起支付请求。 |

### Seller 角色职责 {#s-1452-seller}

| 职责 | 级别 | 说明 |
| --- | --- | --- |
| 提供收款信息 | MUST | 在拓扑协商或 Purchase 阶段 MUST 提供有效的收款账户信息（通过 Tokenizer 令牌化）。 |
| 确认到账 | SHOULD | 收到支付确认通知后 SHOULD 核实到账金额。若有差异 MUST 通知 Buyer 并记录。 |
| 配合 Escrow | MUST（Escrow 模式时） | 当拓扑包含 Escrow 角色时，MUST 遵守托管规则，MUST NOT 在 Escrow 释放前要求 Buyer 直接付款。 |
| 触发条件支付 | SHOULD | 分阶段支付中，Seller SHOULD 在完成对应 Fulfill 步骤（如备货完成、发货）后通知协议引擎，触发下一付款阶段支付条件。 |
| 维护证据 | MUST | 收款确认、到账通知等 MUST 存入证据包。 |
| 支持自主支付请求响应 | MAY（自主支付模式时） | 当采用自主支付模式时，Seller 服务方 MAY 在资源或服务需要付费时返回 HTTP 402 Payment Required 状态码，并通过 `Payment-Needed` 响应头声明支付核心参数（金额、币种、支付截止时间、资源标识）。该响应用于向 Buyer Agent 明确本次访问的支付要求。 |
| 验证支付授权结果凭证 | MUST（自主支付模式时） | 当收到携带 `Payment-Proof` 请求头的资源访问请求时，Seller 服务方 MUST 向支付服务方验证凭证有效性、防重复性及与当前请求的一致性。验证通过后通过 `Payment-Validation` 响应头返回结果并放行资源；验证失败时 MUST 拒绝访问并返回可识别的错误语义。 |

### Escrow 角色职责（当拓扑包含 Escrow 时） {#s-1453-escrow-escrow}

| 职责 | 级别 | 说明 |
| --- | --- | --- |
| 接收托管资金 | MUST | 收到 Buyer 的托管资金后 MUST 确认并入账。 |
| 冻结保管 | MUST | 托管期间 MUST 冻结资金，MUST NOT 擅自释放或挪用。 |
| 按条件释放 | MUST | 仅在收到协议引擎的释放指令（由 Fulfill 验收通过或 Resolve 裁定触发）后释放资金。 |
| 按条件退回 | MUST | 仅在收到协议引擎的退回指令（由 Resolve 裁定或补偿链触发）后退回资金给 Buyer。 |
| 提供托管凭证 | MUST | 每次资金变动 MUST 生成托管凭证并存入证据包。 |

---

## Mode-Driven Behavior（模式驱动行为） {#s-146-mode-driven-behavior}

### 支付模式概览 {#s-1460-payment-modes-overview}

Pay 原语支持多种支付模式，以适应从用户在场即时支付到智能体全自主采购的完整谱系。各模式可独立启用或组合使用，通过 Mode 维度参数化控制：

| 支付模式 | 核心机制 | 适用场景 | 关键约束 |
| --- | --- | --- | --- |
| **标准支付模式** | 用户在场确认，遵循 `pay.initiate` → `pay.confirm` 标准流程 | B2C 即时支付、B2B 人工审批支付 | MandateChain 完整；TEE 字节级确认 |
| **支付绑定模式**；`PaymentBinding` | 将支付工具与 Agent 身份建立受限绑定，原始账户信息不暴露给 Agent | Agent 代付、多 Agent 共享支付工具、商户预授权 | 绑定 MUST 经用户显式确认；约束条件（金额/商户/有效期）MUST 显式声明；吊销 30 秒内传播 |
| **委托支付模式**；`delegation_mode=enabled` | 用户预先签发 `DelegationCredential`，Agent 在授权边界内自主完成支付 | 用户不在场代付、定期订阅、批量采购 | 凭证 MUST 在 TEE 中签发生成；额度原子扣减防超额；吊销即时生效；MUST 含 nonce 防重放 |
| **自主支付模式**；`autonomous_mode=enabled` | Seller 返回 HTTP 402 Payment Required，Agent 自主调用 `pay.request_payment` 获取 `PaymentProof` 后访问资源 | API 付费访问、智能体自主采购、按需资源解锁 | 402 响应来源 MUST 验证；金额一致性 MUST 校验；签名 MUST 用 ES256/Ed25519；超时保护 SHOULD ≤30s |

**模式组合：** 上述模式可正交组合。例如，Agent 可同时使用「支付绑定 + 委托支付」模式：通过 `PaymentBinding` 引用绑定的支付工具，再基于 `DelegationCredential` 在授权额度内自主完成支付。

### Mode 驱动行为矩阵 {#s-1461-mode}

| Mode 维度 | Level | Pay 原语行为 |
| --- | --- | --- |
| **payment_structure** | L0（即时全额） | 单次 `pay.initiate` + `pay.confirm` 完成全部支付。无多阶段付款逻辑。 |
|  | L1（两阶段） | `pay.initiate` + `pay.confirm` × 2（如预付 + 到货付款）。两阶段之间可穿插 Fulfill。 |
|  | L2（多阶段付款） | `pay.initiate` + `pay.term` × N。每个付款阶段可与 Fulfill 步骤交叉编排。 |
|  | L3（信用证） | 通过银行信用证完成支付。`pay.initiate` 发起信用证申请，`pay.confirm` 在交单确认后触发。 |
| **fulfillment_structure** | L0（直接履约） | 无独立履约里程碑，Pay 不因履约结构增加条件性支付步骤。 |
|  | L1+（委托、复合或跨境履约） | 运单、分批、验收、清关等履约事件 MAY 作为付款条件或放款证据；是否使用 Escrow 及资金如何流转由 `payment_structure` 和商业拓扑决定。 |
| **compliance_level** | L0 | 无额外合规要求。 |
|  | L1+ | 支付 MUST 附带发票信息引用。跨境支付 MUST 附带外汇合规声明。 |
|  | L2+ | 支付 MUST 经过反洗钱（AML）检查。大额支付 MUST 经过风控审批。 |
|  | L3 | 支付 MUST 支持审计追踪（完整证据包可导出为 JSON+JWS）。 |
| **relationship_mode** | L0（一次性） | 单次支付，无历史记录关联。 |
|  | L2+（框架协议） | 支付关联 `framework_agreement_ref`。累计支付金额 MUST NOT 超过框架配额。 |
| **delegation_mode** | disabled（默认） | 用户在场确认支付，无需委托授权凭证。支付流程遵循标准 `pay.initiate` + `pay.confirm` 路径。 |
|  | enabled | 用户不在场时，Buyer Agent 基于 `DelegationCredential` 发起支付。Agent MUST 执行本地预检（凭证有效性、额度充足、商户范围匹配）。支付请求 MUST 携带委托凭证，支付服务方核验通过后方可执行扣款。累计支付金额 MUST NOT 超出凭证定义的授权上限。 |
| **autonomous_mode** | disabled（默认） | Seller 不主动发起支付请求，Buyer 按既定流程完成支付。 |
|  | enabled | Seller 服务方可在资源访问时返回 HTTP 402 Payment Required，并通过 `Payment-Needed` 响应头声明支付参数。Buyer Agent 收到 402 后调用 `pay.request_payment` 获取支付授权结果凭证（`PaymentProof`），再携带 `Payment-Proof` 请求头重新访问资源。Seller 验证凭证通过后放行资源。该模式适用于智能体自主采购、API 付费访问等场景。 |

### B2C 退化行为详解 {#s-1462-b2c}

当 Mode 为全 L0 时（典型 B2C），Pay 的行为极大简化：

1. **单次即时支付**：`pay.initiate` 和 `pay.confirm` 在同一操作中完成。无需多阶段付款逻辑。
2. **Agent Mandate 简化**：在 B2C 低金额场景下（由平台风控策略决定阈值），用户可通过成对的 Open Checkout Mandate 与 Open Payment Mandate 对限定范围内的后续购买作出预先确认；超出其中的金额、商品、收款方、支付工具、有效期或频次边界 MUST 重新确认。
3. **无 Escrow**：资金直接从 Buyer 到 Seller，不经过托管。

**B2C 等效流程：**

```
pay.initiate (选择支付工具 + 令牌化凭证)
       |
       v
  pay.confirm (支付渠道确认到账)
       |
       v
  COMPLETED → 进入 Fulfill
```

### 支付工具与 Tokenizer 配置 {#s-1463-tokenizer}

每种支付工具对应一个 TokenizerConfig，定义了令牌化方式和通信协议：

| 支付工具 | Tokenizer 模式 | 适用场景 | 备注 |
| --- | --- | --- | --- |
| 支付宝（Alipay） | 钱包 Token 化 | 国内 B2C/B2B | OAuth2 授权 + 支付令牌 |
| 微信支付（WeChat Pay） | 钱包 Token 化 | 国内 B2C/B2B | JSAPI/H5 支付令牌 |
| 云闪付（UnionPay） | 卡号令牌化 | 国内 B2C/B2B | 银行卡号 token + CVV 脱敏 |
| 数字人民币（e-CNY） | 钱包 Token 化 | 国内 B2C/B2B | 央行数字货币钱包令牌 |
| SWIFT | 银行信用令牌化 | 国际 B2B | 信用证/电汇指令令牌 |
| SEPA | 银行 IBAN 令牌化 | 欧洲 B2B | IBAN 令牌 + 直接借记授权 |

---

## Actions（操作定义） {#s-147-operations}

Pay 原语包含以下核心子操作：`initiate`（发起支付）、`confirm`（确认支付）、`term`（付款阶段执行）、`query`（支付状态查询）、`refund`（退款执行）。`request_payment` 属于 Autonomous Payment Profile 的扩展操作，仅在 HTTP 402 自主资源付费场景启用，不参与 PurchaseCredential 驱动的标准电商交易全局状态迁移。

`query` 为只读性质的观测操作：用于随时获取某笔支付或某个 PurchaseCredential 下的实时支付状态，MUST NOT 触发资金变动或状态迁移。`refund` 是有资金副作用的受限操作，MUST 由 Resolve、Saga 补偿规则或具备协议授权的资金服务触发，Buyer 与 Seller MUST NOT 直接调用。各 Action 是否携带[原语声明](/documentation/specification/protocol-core/primitive-framework.html#s-1026-primitive-declaration-schema)（`hai`）及具体 `interaction_level`，由**实现方** 在其原语定义文件中决定，本原语章不作逐 Action 规定。

### utp.pay.initiate {#s-1471-utppayinitiate}

**意图：** 发起支付请求。根据 PurchaseCredential 中的 `payment_due` 信息，构造 PaymentRequest 并提交至支付渠道。对于即时全额支付，此操作同时触发 `confirm`。对于分阶段支付，此操作为第一期支付做准备。

**与 HAI 的协同：** 当支付工具、支付方式或绑定关系已在 HAI Confirmation Surface 中由 Principal 完成选择时，后续 `utp.pay.initiate` 的必填输入 SHOULD 直接来自 HAI `§20.7.4` 续跑响应中的 `data` / `valid_next_actions[].default_input`。实现 MAY 支持 post-resume 的 session-bound invoke（即由引擎根据当前交易权威状态补齐支付相关输入），但该增强能力 MUST NOT 替代 HAI 在续跑响应中提供连续权威引用链的职责。

**请求：**

```json
{
  "action": "utp.pay.initiate",
  "session_id": "utp-session-b2b-001",
  "transaction_id": "utp-txn-20260718-001",
  "idempotency_key": "pay-init-20260720-001",
  "input": {
    "purchase_id": "pur-20260718-001",
    "payment_instrument": {
      "type": "alipay",
      "tokenizer_ref": "tok-alipay-buyer-2026-001",
      "token": "eyJhbGciOiJFUzI1NiJ9.dG9rLWFsaXBheS1idXllci0yMDI2LTAwMT...",
      "currency": "CNY"
    },
    "mandate_chain": {
      "open_checkout_mandate": "eyJhbGciOiJFUzI1NiIsImtpZCI6InVzZXIta2V5In0...",
      "open_payment_mandate": "eyJhbGciOiJFUzI1NiIsImtpZCI6InVzZXIta2V5In0...",
      "closed_checkout_mandate": "eyJhbGciOiJFUzI1NiIsImtpZCI6ImFnZW50LWtleSJ9...",
      "closed_payment_mandate": "eyJhbGciOiJFUzI1NiIsImtpZCI6ImFnZW50LWtleSJ9..."
    },
    "amount": { "amount": "25074.40", "currency": "CNY" },
    "payment_term_id": "定金",
    "escrow_mode": false,
    "payment_binding_ref": "bnd-alipay-agent-2026-001",
    "delegation_credential": "eyJhbGciOiJFUzI1NiIsImtpZCI6InVzZXIta2V5In0..."
  }
}
```

**响应：**

```json
{
  "action": "utp.pay.initiate",
  "session_id": "utp-session-b2b-001",
  "transaction_id": "utp-txn-20260718-001",
  "idempotency_key": "pay-init-20260720-001",
  "primitive_state": "AUTHORIZED",
  "execution_result": "SUCCESS",
  "output": {
    "payment_request_id": "pay-req-20260720-001",
    "purchase_id": "pur-20260718-001",
    "status": "authorized",
    "amount": { "amount": "25074.40", "currency": "CNY" },
    "payment_term_id": "定金",
    "instrument_type": "alipay",
    "authorization_code": "auth-alipay-20260720-abc123",
    "channel_transaction_id": "2026072022001423450500000001",
    "mandate_verified": true,
    "tee_verified": true,
    "binding_verified": true
  },
  "valid_next_actions": [
    "utp.pay.confirm"
  ]
}
```

### utp.pay.confirm {#s-1472-utppayconfirm}

**意图：** 确认支付完成。验证支付渠道的回调结果，确认资金已成功转移（或已入 Escrow 托管）。此操作可在 `initiate` 之后立即调用，也可在异步支付回调到达后由协议引擎自动调用。

**请求（支付渠道回调确认）：**

```json
{
  "action": "utp.pay.confirm",
  "session_id": "utp-session-b2b-001",
  "transaction_id": "utp-txn-20260718-001",
  "idempotency_key": "pay-confirm-20260720-001",
  "input": {
    "payment_request_id": "pay-req-20260720-001",
    "channel_callback": {
      "status": "success",
      "channel_transaction_id": "2026072022001423450500000001",
      "settled_amount": { "amount": "25074.40", "currency": "CNY" },
      "settled_at": "2026-07-20T10:05:32Z",
      "channel_signature": "eyJhbGciOiJSUzI1NiJ9..."
    }
  }
}
```

**响应：**

```json
{
  "action": "utp.pay.confirm",
  "session_id": "utp-session-b2b-001",
  "transaction_id": "utp-txn-20260718-001",
  "idempotency_key": "pay-confirm-20260720-001",
  "primitive_state": "PARTIAL",
  "execution_result": "SUCCESS",
  "output": {
    "status": "confirmed",
    "payment_confirmation": {
      "payment_confirmation_id": "pay-cfm-20260720-001",
      "payment_request_id": "pay-req-20260720-001",
      "purchase_id": "pur-20260718-001",
      "status": "confirmed",
      "amount": { "amount": "25074.40", "currency": "CNY" },
      "payment_term_id": "定金",
      "instrument_type": "alipay",
      "channel_transaction_id": "2026072022001423450500000001",
      "settled_at": "2026-07-20T10:05:32Z",
      "evidence_ref": "evd-pay-20260720-001"
    },
    "payment_progress": {
      "total_amount": { "amount": "125372.00", "currency": "CNY" },
      "paid_amount": { "amount": "25074.40", "currency": "CNY" },
      "remaining_amount": { "amount": "100297.60", "currency": "CNY" },
      "completed_terms": ["定金"],
      "next_term": {
        "payment_term_id": "发货前",
        "amount": { "amount": "62686.00", "currency": "CNY" },
        "fulfillment_trigger": {
          "trigger_type": "fulfillment_event_ref",
          "fulfillment_action": "utp.fulfill.notify",
          "order_id": "ord-20260718-001",
          "event_status": "SHIPPED"
        }
      }
    },
    "payment_event": {
      "payment_event_id": "payevt-capture-20260720-001",
      "payment_request_id": "pay-req-20260720-001",
      "event_type": "PAYMENT_CAPTURED",
      "amount": { "amount": "25074.40", "currency": "CNY" },
      "channel": "alipay",
      "channel_transaction_id": "2026072022001423450500000001",
      "occurred_at": "2026-07-20T10:05:32Z",
      "evidence_ref": "evd-pay-20260720-001"
    }
  },
  "valid_next_actions": [
    "utp.fulfill.query"
  ]
}
```

### utp.pay.term {#s-1473-utppayterm}

**意图：** 执行一个付款阶段。在多阶段付款场景中，每个付款阶段调用一次 `term`。每个阶段的前置条件由 TradeMethod 定义，并通过结构化 FulfillmentEventRef 或 MilestoneRef 引用 Fulfill 已定义的事件（如 `notify.status == SHIPPED`、`receive.result == ACCEPTED`），不得引用 Fulfill 原语未定义的内部动作。

**请求：**

```json
{
  "action": "utp.pay.term",
  "session_id": "utp-session-b2b-001",
  "transaction_id": "utp-txn-20260718-001",
  "idempotency_key": "pay-term-20260728-001",
  "input": {
    "purchase_id": "pur-20260718-001",
    "payment_term_id": "发货前",
    "payment_instrument": {
      "type": "alipay",
      "tokenizer_ref": "tok-alipay-buyer-2026-001",
      "token": "eyJhbGciOiJFUzI1NiJ9.dG9rLWFsaXBheS1idXllci0yMDI2LTAwMi0...",
      "currency": "CNY"
    },
    "fulfillment_trigger": {
      "trigger_type": "fulfillment_event_ref",
      "fulfillment_action": "utp.fulfill.notify",
      "fulfillment_event_ref": "fulfill-event-ship-20260725-001",
      "order_id": "ord-20260718-001",
      "event_status": "SHIPPED",
      "occurred_at": "2026-07-25T09:30:00Z",
      "evidence_ref": "evd-fulfill-ship-20260725-001"
    },
    "amount": { "amount": "62686.00", "currency": "CNY" }
  }
}
```

**响应：**

```json
{
  "action": "utp.pay.term",
  "session_id": "utp-session-b2b-001",
  "transaction_id": "utp-txn-20260718-001",
  "idempotency_key": "pay-term-20260728-001",
  "primitive_state": "PARTIAL",
  "execution_result": "SUCCESS",
  "output": {
    "status": "confirmed",
    "payment_confirmation": {
      "payment_confirmation_id": "pay-cfm-20260728-001",
      "payment_request_id": "pay-req-20260728-001",
      "purchase_id": "pur-20260718-001",
      "status": "confirmed",
      "amount": { "amount": "62686.00", "currency": "CNY" },
      "payment_term_id": "发货前",
      "instrument_type": "alipay",
      "channel_transaction_id": "2026072822001423450500000042",
      "settled_at": "2026-07-28T14:22:18Z",
      "evidence_ref": "evd-pay-20260728-001"
    },
    "payment_progress": {
      "total_amount": { "amount": "125372.00", "currency": "CNY" },
      "paid_amount": { "amount": "87760.40", "currency": "CNY" },
      "remaining_amount": { "amount": "37611.60", "currency": "CNY" },
      "completed_terms": ["定金", "发货前"],
      "next_term": {
        "payment_term_id": "验收后30天",
        "amount": { "amount": "37611.60", "currency": "CNY" },
        "fulfillment_trigger": {
          "trigger_type": "fulfillment_event_ref",
          "fulfillment_action": "utp.fulfill.receive",
          "order_id": "ord-20260718-001",
          "event_status": "RECEIVED"
        }
      }
    },
    "payment_event": {
      "payment_event_id": "payevt-capture-20260728-001",
      "payment_request_id": "pay-req-20260728-001",
      "event_type": "PAYMENT_CAPTURED",
      "amount": { "amount": "62686.00", "currency": "CNY" },
      "channel": "alipay",
      "channel_transaction_id": "2026072822001423450500000042",
      "occurred_at": "2026-07-28T14:22:18Z",
      "evidence_ref": "evd-pay-20260728-001"
    }
  },
  "valid_next_actions": [
    "utp.fulfill.query"
  ]
}
```

### utp.pay.request_payment {#s-1474-utppayrequestpayment}

**意图：** 自主支付模式下，Buyer Agent 在收到 Seller 服务方返回的 HTTP 402 Payment Required 响应后，主动发起支付请求以获取支付授权结果凭证（`PaymentProof`）。该凭证用于后续携带 `Payment-Proof` 请求头重新访问付费资源。

**前置条件：**

- `autonomous_mode == enabled`
- Seller 已返回 HTTP 402 响应，且 `Payment-Needed` 响应头中包含有效的支付参数
- Buyer Agent 持有有效的 `PaymentBinding`
- 若使用委托支付，`DelegationCredential` MUST 有效且额度充足

**请求：**

```json
{
  "action": "utp.pay.request_payment",
  "session_id": "utp-session-auto-001",
  "idempotency_key": "pay-req-auto-20260705-001",
  "input": {
    "resource_id": "res-api-premium-2026-001",
    "amount": { "amount": "99.00", "currency": "CNY" },
    "payment_binding_ref": "bnd-alipay-agent-2026-001",
    "pay_before": "2026-07-05T14:00:00Z"
  }
}
```

**响应：**

```json
{
  "action": "utp.pay.request_payment",
  "session_id": "utp-session-auto-001",
  "idempotency_key": "pay-req-auto-20260705-001",
  "execution_result": "SUCCESS",
  "output": {
    "payment_proof": {
      "proof_id": "prf-auto-20260705-001",
      "trade_no": "2026070522001423450500000099",
      "resource_id": "res-api-premium-2026-001",
      "amount": { "amount": "99.00", "currency": "CNY" },
      "expires_at": "2026-07-05T14:30:00Z",
      "signature": "eyJhbGciOiJFUzI1NiJ9..."
    }
  },
  "valid_next_actions": []
}
```

> **与标准支付流程的区别：** `utp.pay.request_payment` 不依赖 `PurchaseCredential`，而是基于 Seller 返回的 HTTP 402 响应动态构造支付请求。该操作仅产出 `PaymentProof`，不触发全局状态机迁移至 `FULFILLING`。支付完成后，PSP 宜异步上报存证事件以支持审计追溯。

### 自主支付安全指南 {#s-1475-autonomous-payment-security}

当 `autonomous_mode == enabled` 时，Buyer Agent 可自主响应 HTTP 402 Payment Required 并完成支付。此模式下 MUST 满足以下额外安全约束：

| 安全要求 | 级别 | 说明 |
| --- | --- | --- |
| PaymentProof 防重放 | MUST | PaymentProof MUST 包含唯一 nonce 和签发时间戳。接收方 MUST 校验 nonce 未在有效期内重复使用。 |
| 签名算法 | MUST | PaymentProof 的签名 MUST 使用 ES256（ECDSA P-256 + SHA-256）或 Ed25519 算法。RSA-SHA256 MAY 用于兼容遗留系统。 |
| 响应来源验证 | MUST | Buyer Agent MUST 验证 HTTP 402 响应来自已认证的 Seller 服务端点。未经验证的 402 响应 MUST 被忽略。 |
| 金额一致性校验 | MUST | PaymentProof 中的金额 MUST 与原始 HTTP 402 响应中声明的金额完全一致。不一致时 MUST 中止支付并记录异常。 |
| 超时保护 | SHOULD | 自主支付请求 SHOULD 设置合理的超时阈值（建议不超过 30 秒）。超时后 MUST 中止并返回结构化错误。 |
| 频率限制 | SHOULD | 同一 Buyer Agent 对同一 Seller 的自主支付请求频率 SHOULD 受到限制，防止异常高频调用。 |

### utp.pay.query {#s-1476-utppayquery}

**意图：** 查询支付状态。调用方可按 `payment_request_id` 查询单笔支付的实时状态，或按 `purchase_id` 查询某个 PurchaseCredential 下全部支付阶段的汇总状态。此操作为只读操作，MUST NOT 触发任何资金变动或状态机迁移，可安全地重复调用。

**意图澄清：** `query` 返回的是** 协议引擎侧**记录的支付状态。当协议侧状态为 `AUTHORIZED`（已授权待确认）等非终态，或调用方需要以支付渠道的权威流水为准时，支付适配器 SHOULD 通过渠道状态查询或回调补偿取得最终状态证据；若协议侧与渠道侧事实持续不一致，MUST 升级至 Resolve 处理。

**前置条件：**

- 调用方为该支付记录的可见参与方
- `payment_request_id` 与 `purchase_id` 必须且只能提供一个

**请求（按订购凭证查询汇总状态）：**

```json
{
  "action": "utp.pay.query",
  "session_id": "utp-session-b2b-001",
  "transaction_id": "utp-txn-20260718-001",
  "input": {
    "purchase_id": "pur-20260718-001",
    "include_terms": true
  }
}
```

**响应：**

```json
{
  "action": "utp.pay.query",
  "session_id": "utp-session-b2b-001",
  "transaction_id": "utp-txn-20260718-001",
  "primitive_state": "PARTIAL",
  "execution_result": "SUCCESS",
  "output": {
    "purchase_id": "pur-20260718-001",
    "status": "partial",
    "total_amount": { "amount": "125372.00", "currency": "CNY" },
    "paid_amount": { "amount": "25074.40", "currency": "CNY" },
    "outstanding_amount": { "amount": "100297.60", "currency": "CNY" },
    "terms": [
      {
        "payment_term_id": "定金",
        "payment_request_id": "pay-req-20260720-001",
        "status": "confirmed",
        "amount": { "amount": "25074.40", "currency": "CNY" },
        "confirmed_at": "2026-07-20T10:15:32Z",
        "payment_confirmation_id": "pcf-20260720-001"
      },
      {
        "payment_term_id": "进度款",
        "payment_request_id": null,
        "status": "pending",
        "amount": { "amount": "62686.00", "currency": "CNY" },
        "fulfillment_trigger": {
          "trigger_type": "fulfillment_event_ref",
          "fulfillment_action": "utp.fulfill.notify",
          "order_id": "ord-20260718-001",
          "event_status": "SHIPPED"
        }
      },
      {
        "payment_term_id": "尾款",
        "payment_request_id": null,
        "status": "pending",
        "amount": { "amount": "37611.60", "currency": "CNY" },
        "fulfillment_trigger": {
          "trigger_type": "fulfillment_event_ref",
          "fulfillment_action": "utp.fulfill.receive",
          "order_id": "ord-20260718-001",
          "event_status": "RECEIVED"
        }
      }
    ],
    "as_of": "2026-07-21T08:00:00Z"
  },
  "valid_next_actions": [
    "utp.pay.term",
    "utp.pay.query"
  ]
}
```

> **缓存与时效：** `query` 响应 MUST 包含 `as_of` 时间戳标识数据快照时刻。调用方 SHOULD NOT 将 `query` 结果用作资金结算的最终依据；涉及资金结算或争议举证时 MUST 以 PaymentConfirmation、PaymentEvent、渠道状态证据和 EvidenceBundle 中的签名材料为准。

### Reserved（保留编号） {#s-1477-reserved}

本小节保留编号，不定义 Pay Action。

### utp.pay.refund {#s-1478-utppayrefund}

**意图：** 执行退款或解除支付授权。`refund` 是 Pay 原语中唯一允许逆向资金变动的核心 Action，用于承接 Resolve 裁决、Saga 补偿或具备协议授权的资金服务退款指令。该操作 MUST 绑定原支付的 `transaction_id`，并通过 `payment_request_id` 或 `payment_confirmation_id` 定位支付。只有渠道完成退款后才能生成 `PAYMENT_REFUNDED` PaymentEvent；`processing` 或 `failed` 结果不得提前改变原支付事实状态。

**调用约束：** Buyer 与 Seller MUST NOT 直接调用 `utp.pay.refund`。该操作只能由协议引擎、Resolve 原语、Escrow Provider 或具备资金服务授权的 Platform 发起。退款金额 MUST NOT 超过原支付可退余额；多阶段付款或部分收货场景下，退款 MUST 绑定具体付款阶段、订单或批次范围。

**请求：**

```json
{
  "action": "utp.pay.refund",
  "session_id": "utp-session-b2b-001",
  "transaction_id": "utp-txn-20260718-001",
  "idempotency_key": "pay-refund-20260821-001",
  "input": {
    "payment_confirmation_id": "pay-cfm-20260720-001",
    "source_instruction_ref": "res-outcome-20260820-001",
    "refund_amount": { "amount": "2430.00", "currency": "CNY" },
    "refund_reason": "resolve.partial_quality_compensation",
    "scope_ref": {
      "order_id": "ord-20260718-001",
      "batch_id": "batch-20260805-A",
      "item_refs": ["item-servo-200w-001"]
    }
  }
}
```

**响应：**

```json
{
  "action": "utp.pay.refund",
  "session_id": "utp-session-b2b-001",
  "transaction_id": "utp-txn-20260718-001",
  "idempotency_key": "pay-refund-20260821-001",
  "primitive_state": "PARTIAL",
  "execution_result": "SUCCESS",
  "output": {
    "refund_id": "rfnd-20260821-001",
    "status": "refunded",
    "refunded_amount": { "amount": "2430.00", "currency": "CNY" },
    "channel_refund_id": "refund-alipay-20260821-001",
    "payment_event_ref": "payevt-refund-20260821-001",
    "evidence_ref": "evd-refund-20260821-001"
  },
  "valid_next_actions": [
    "utp.fulfill.receive",
    "utp.pay.term"
  ]
}
```

---

## Escrow（资金托管） {#s-1410-escrow}

**结算担保模型是可选升级项，而非协议默认。** UTP 默认采用即时到账直付（[SettlementInstruction](#s-14914-settlementinstruction) 的 `settlement_type == "instant"`）：资金在支付授权成功后直接进入收款方账户，无第三方托管介入。协议 MUST NOT 假设一切交易都需要平台担保。Escrow（资金托管，`settlement_type == "escrow"`）与账期结算（`settlement_type == "deferred"`）是面向高信任门槛或跨境合规场景的** 可选**增强，仅当交易的 `trust_level`、`compliance_level` 或对手方风险要求引入第三方信用中介时才启用。本节描述的 Escrow 机制仅在 [PaymentRequest](#s-1491-paymentrequest) 的 `escrow_mode == true`（即 `settlement_type == "escrow"`）时生效；即时直付与账期结算路径不经过本节所述的托管账户与条件释放流程。

### 概述 {#s-14101}

在 `trust_level` 要求较高或 `compliance_level >= L2` 的交易中，UTP 支持引入 Escrow（托管方）作为拓扑中的参与方。Escrow 方独立于买卖双方，负责资金的托管与条件释放。

Escrow 方的角色和权限在拓扑协商阶段确定（参见[商业拓扑](/documentation/specification/protocol-core/business-topology.html)），其参与使资金流转模式变为：

![Escrow 托管资金流转：采购方付款进托管方，验收通过后托管方释放资金给供应商（绿色主路径）；若争议发生则冻结资金，由仲裁结果决定资金归属（橙色分支）。](/documentation/assets/diagrams/escrow-flow.svg)

### EscrowConfig 实体 {#s-14102-escrowconfig}

**EscrowConfig 实体定义：**

| 字段名 | 类型 | 必需？ | 描述 |
| --- | --- | --- | --- |
| `escrow_provider` | string | MUST | Escrow 方的 `agent_id`。该参与方 MUST 持有有效 Profile 且承担 `Escrow` 角色。 |
| `escrow_model` | string | MUST | 托管模式。有效值：`"full"`（全额托管）、`"deposit"`（定金托管）、`"milestone"`（里程碑托管）。 |
| `release_conditions` | ReleaseCondition[] | MUST | 资金释放条件列表。每个条件 MUST 可机器判定。 |
| `dispute_timeout` | duration | SHOULD | 争议超时时间。若争议在指定时间内未解决，Escrow 方按预设规则处置资金。 |
| `fees` | EscrowFees | SHOULD | 托管费用结构。 |
| `currency` | string | MUST | 托管币种，ISO 4217 代码。 |

**ReleaseCondition 实体定义：**

| 字段名 | 类型 | 必需？ | 描述 |
| --- | --- | --- | --- |
| `condition_type` | string | MUST | 条件类型。有效值：`"buyer_confirm"`（买家确认收货）、`"inspector_approval"`（检验方验收通过）、`"delivery_verified"`（物流签收确认）、`"time_based"`（到期自动释放）。 |
| `required_role` | string | MUST | 触发该条件所需的角色（如 `"Buyer"`, `"Inspector"`）。 |
| `auto_release_after` | duration | SHOULD | 条件未满足时的自动释放等待时间。超时后自动释放。 |

**EscrowConfig 示例：**

```json
{
  "escrow_provider": "escrow-agent-cn-001",
  "escrow_model": "milestone",
  "release_conditions": [
    {
      "condition_type": "delivery_verified",
      "required_role": "Shipper",
      "auto_release_after": "P30D"
    },
    {
      "condition_type": "buyer_confirm",
      "required_role": "Buyer",
      "auto_release_after": "P7D"
    },
    {
      "condition_type": "inspector_approval",
      "required_role": "Inspector",
      "auto_release_after": "P14D"
    }
  ],
  "dispute_timeout": "P30D",
  "fees": {
    "fee_model": "percentage",
    "rate": "0.005",
    "paid_by": "seller"
  },
  "currency": "CNY"
}
```

### Escrow 操作规则 {#s-14103-escrow}

1. 托管资金 MUST 在 Purchase 原语完成前到位（全额托管模式）或按比例到位（定金/里程碑模式）。
2. Escrow 方 MUST NOT 在未满足任何 `release_conditions` 的情况下释放资金。
3. 当争议（Resolve 原语）被触发时，Escrow 方 MUST 冻结相关资金，直至争议解决。
4. 所有 Escrow 操作（资金到账、释放、冻结、退回）MUST 记录在 Evidence Bundle 中。

### Escrow 生命周期状态 {#s-14104-escrow-lifecycle}

Escrow 托管资金在交易生命周期内遵循确定性状态机。每个状态迁移 MUST 由明确的触发事件驱动，且迁移结果 MUST 唯一确定。

```
┌──────────┐
  │   init   │
  └────┬─────┘
       │ create
       ▼
  ┌──────────┐
  │ pending  │──────────────────┐
  └────┬─────┘                  │
       │ fund                   │ cancel
       ▼                        ▼
  ┌──────────┐           ┌────────────┐
  │ funded   │── freeze ─▶│  frozen    │
  └────┬─────┘           └─────┬──────┘
       │ release               │ unfreeze
       ▼                       ▼
  ┌───────────┐          ┌──────────┐
  │ releasing │          │ funded   │
  └─────┬─────┘          └──────────┘
        │ confirm
        ▼
  ┌───────────┐
  │ released  │
  └───────────┘

  分支路径：
  funded ──── timeout ────▶ refunded
  funded ──── cancel  ────▶ cancelled
  frozen ──── timeout ────▶ refunded (或 released，依仲裁结果)
```

**状态定义表：**

| 状态 | 触发条件 | 允许操作 | 迁移目标 |
| --- | --- | --- | --- |
| `init` | EscrowConfig 创建 | 配置校验 | pending |
| `pending` | 配置校验通过，等待资金注入 | fund, cancel | funded, cancelled |
| `funded` | 托管资金到账确认 | release, freeze, refund, extend, cancel | releasing, frozen, refunded, cancelled |
| `releasing` | 释放条件满足，资金正在结算 | confirm | released |
| `released` | 资金释放完成 | —（终态） | — |
| `frozen` | 争议触发冻结 | unfreeze, refund | funded, refunded, released（依仲裁结果） |
| `refunded` | 资金退回买方 | —（终态） | — |
| `cancelled` | 托管取消 | —（终态） | — |
| `timeout` | 超时事件触发自动处置 | 自动迁移 | refunded 或 released（取决于超时规则） |

**状态迁移规则：**

1. Escrow 状态机 MUST 遵循确定性迁移：同一状态下同一输入 MUST 产生唯一的迁移结果。
2. 从 `funded` 到 `frozen` 的迁移 MUST 在 Resolve 原语触发争议时自动执行，Escrow 方 MUST NOT 拒绝冻结请求。
3. 终态（`released`、`refunded`、`cancelled`）MUST NOT 发生进一步迁移。
4. 每次状态迁移 MUST 生成 EscrowOperation 记录（见 Escrow 操作规范），并写入 Evidence Bundle（见[风控与审计](/documentation/specification/protocol-core/risk-audit.html#s-73-evidence-bundle)）。

### Escrow 操作规范 {#s-14105-escrow-operations}

**EscrowOperation 实体定义：**

| 字段名 | 类型 | 必需 | 描述 |
| --- | --- | --- | --- |
| `operation_id` | string | MUST | 操作唯一标识，UUID v4 格式。 |
| `escrow_id` | string | MUST | 关联的 EscrowConfig 标识。 |
| `operation_type` | string | MUST | 操作类型。有效值：`"fund"`、`"release"`、`"freeze"`、`"unfreeze"`、`"refund"`、`"extend"`、`"cancel"`。 |
| `amount` | object | MUST | 操作涉及的金额，含 `value`（数值）和 `currency`（ISO 4217）。 |
| `operator_id` | string | MUST | 执行操作的参与方 Agent ID。 |
| `reason` | string | SHOULD | 操作原因说明。争议相关操作 MUST 提供原因。 |
| `timestamp` | datetime | MUST | 操作时间戳，ISO 8601 格式。 |
| `signature` | string | MUST | 操作方对操作内容的 JWS 签名（ES256）。 |
| `metadata` | object | MAY | 扩展元数据，用于记录特定操作的附加信息。 |

**操作权限矩阵：**

| 操作 | 允许状态 | 触发方 | 迁移结果 |
| --- | --- | --- | --- |
| `fund` | pending | Buyer | funded |
| `release` | funded | Escrow（条件满足时） | releasing |
| `freeze` | funded | Escrow / Resolve 原语 | frozen |
| `unfreeze` | frozen | Escrow / Resolve 原语 | funded 或 released（依仲裁结果） |
| `refund` | funded, frozen | Escrow / Resolve 原语 | refunded |
| `extend` | funded | Buyer / Seller（双方同意） | funded（更新超时时间） |
| `cancel` | pending, funded | Buyer（双方同意） | cancelled |

**操作规则：**

1. 每个 EscrowOperation MUST 包含操作方的 JWS 签名，签名覆盖 `operation_type`、`amount` 和 `timestamp` 字段。
2. 操作权限矩阵定义了各操作在特定状态下的允许性。不在矩阵中的操作-状态组合 MUST 被拒绝。
3. `freeze` 操作 MUST 在 Resolve 原语触发争议时由协议引擎自动发起，Escrow 方 MUST NOT 延迟执行。
4. 所有 EscrowOperation 记录 MUST 追加到 Evidence Bundle（见[风控与审计](/documentation/specification/protocol-core/risk-audit.html#s-73-evidence-bundle)），作为交易凭证链的组成部分。

### 超时与自动处置 {#s-14106-escrow-timeout}

为防止交易因参与方不响应而无限期停滞，Escrow 机制 MUST 支持超时自动处置。

**超时场景定义：**

| 场景 | 默认时限 | 可配置 | 自动处置 |
| --- | --- | --- | --- |
| 买方确认超时 | P7D（7 天） | 是，在 ReleaseCondition.auto_release_after 中配置 | 自动释放资金给卖方 |
| 卖方发货超时 | P30D（30 天） | 是，在 EscrowConfig 中配置 | 自动退款给买方 |
| 争议冻结超时 | P30D（30 天） | 是，在 EscrowConfig.dispute_timeout 中配置 | 按预设仲裁规则处置（默认退款） |
| 托管延期超时 | P90D（90 天） | 是，双方协商延期 | 自动退款给买方 |

**超时处理规则：**

1. 超时时限 MUST 在 EscrowConfig 创建时确定，交易进行中 MUST NOT 单方面缩短已设定的超时时限。
2. 超时事件触发时，Escrow 方 MUST 自动执行预设的处置操作，并生成对应的 EscrowOperation 记录。
3. 超时时限 MAY 通过 `extend` 操作延长，但 MUST 获得买卖双方同意（双方签名确认）。
4. 超时处置结果 MUST 记录在 Evidence Bundle 中，包含超时触发时间、预设处置规则和实际执行操作。

---
