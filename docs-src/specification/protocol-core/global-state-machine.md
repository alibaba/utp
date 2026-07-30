---
title: 全局状态机
section: protocol-core
owner: protocol-architecture
status: drafting
version: 2026-07-29
---

# 全局状态机（Global State Machine）

全局状态机定义 UTP 参与方共同识别的交易阶段。参与方可以拥有不同的内部资源状态，但跨方交换和状态同步时，必须使用本页定义的 `StateView`、全局状态枚举、基础迁移定义和状态同步操作。

全局状态机读取当前 `StateView`、被执行的 Action、P0 `ActionResponse.execution_result`、当前已锁定的 Mode，以及当前协议版本对应的状态机定义。路径编排通过 `initialize_state_view` 取得当前 `StateView`：未提供 `trade_context_id` 时创建初始上下文，已提供 `trade_context_id` 时按 `/utp/state/query` 语义查询本方状态，已有交易继续推进时必须同时提供 `transaction_id`。

## 状态视图（StateView）

`StateView` 是某个商业意图上下文或独立交易当前的全局状态视图。

| 字段 | 类型 | 必填 | 描述 |
| --- | --- | --- | --- |
| `trade_context_id` | string | 是 | 商业意图上下文标识。上下文级和交易级 `StateView` 均携带。 |
| `transaction_id` | string | 条件必填 | 交易全生命周期标识。交易级 `StateView` 必须携带；上下文级 `StateView` 不携带。 |
| `state` | enum | 是 | 当前全局状态，取值见下一节。 |
| `state_version` | integer | 是 | 同一状态锚点下的版本号，从 `1` 开始。 |
| `previous_state` | enum | 条件必填 | 仅当 `state = DISPUTED` 时携带，取值为 `PURCHASING`、`PAYING` 或 `FULFILLING`。 |

上下文级 `StateView` 用于 `INIT`、`SOURCING` 和 `NEGOTIATING`。交易级 `StateView` 用于从 `PURCHASING` 开始的交易阶段。

```json
{
  "trade_context_id": "utp-ctx-7f3c2d10-9a64-4b81-8e25-6d0f4c3a9127",
  "transaction_id": "utp-txn-2b6e8f41-3c95-47ad-a120-9e5d7b4c6813",
  "state": "FULFILLING",
  "state_version": 4
}
```

## 状态枚举

| 状态 | 作用域 | 是否终态 | 含义 |
| --- | --- | --- | --- |
| `INIT` | 上下文 | 否 | 商业意图上下文已初始化。 |
| `SOURCING` | 上下文 | 否 | 正在寻源或维护候选集合。 |
| `NEGOTIATING` | 上下文 | 否 | 正在形成或确认交易条款。 |
| `PURCHASING` | 交易 | 否 | 独立交易边界已确认，订购确认或订单生成仍在推进。 |
| `PAYING` | 交易 | 否 | 支付义务正在推进。 |
| `FULFILLING` | 交易 | 否 | 履约义务正在推进。 |
| `SETTLED` | 交易 | 是 | 交易完成并收敛。 |
| `DISPUTED` | 交易 | 否 | 交易进入争议处理阶段。 |
| `FAILED` | 交易 | 是 | 交易未完成并进入终态。 |
| `CANCELLED` | 交易 | 是 | 交易被取消并进入终态。 |

## 状态迁移图

![UTP 交易上下文级与交易级状态迁移图：上下文级状态从 INIT、SOURCING、NEGOTIATING 推进到交易级 PURCHASING，并在交易级状态中流转 PAYING、FULFILLING、SETTLED、DISPUTED、FAILED 和 CANCELLED。](/documentation/assets/diagrams/global-state-machine-transition.svg)

## 状态迁移约定

状态迁移 MUST 遵循以下约定：

1. 路径编排在完整路径确定后统一调用 `initialize_state_view`。未提供 `trade_context_id` 时，该函数形成全局唯一 `trade_context_id`，并形成 `state = INIT`、`state_version = 1` 的上下文级 `StateView`。
2. 延续已有商业意图时，调用方 MUST 提供已有 `trade_context_id`，`initialize_state_view` 按 `/utp/state/query` 的上下文级语义查询本方当前 `StateView`。
3. 首次 `utp.source.search` 或 `utp.source.lookup` 返回 `SUCCESS` 时，上下文级状态从 `INIT` 推进到 `SOURCING`，`state_version` 从 `1` 递增到 `2`。`REJECTED` 或保持结果不改变状态版本。
4. `purchase.create` 和 `purchase.update` MUST 携带来源 `trade_context_id`。二者可以调整 Purchase 草案和拆单结果，但不会形成交易级 `StateView`。
5. `purchase.complete` 返回 `SUCCESS` 且已经确认独立交易边界后，为每个独立交易边界形成一份交易级 `PURCHASING` StateView。同一个 `trade_context_id` 可以派生一笔或多笔独立交易，每笔交易拥有独立 `transaction_id` 和独立交易级状态链。
6. 交易边界已经存在后，调用方 MUST 同时提供对应的 `trade_context_id` 和 `transaction_id`，`initialize_state_view` 按 `/utp/state/query` 的交易级语义查询本方当前 `StateView`。仅提供 `transaction_id`，或遗漏已有交易的 `transaction_id`，接收方 MUST 拒绝。
7. 交易级正向状态按 `PURCHASING -> PAYING -> FULFILLING -> SETTLED` 推进。是否在 `PAYING` 与 `FULFILLING` 之间交错推进，由付款结构、履约结构和已锁定交易条款共同确定。
8. 任意交易级非终态 MAY 进入 `DISPUTED`。争议处理完成后，状态恢复到进入争议前的状态，或进入 `FAILED` / `CANCELLED`。
9. `SETTLED`、`FAILED`、`CANCELLED` 为终态，MUST NOT 迁出。

## 最小标识与交易边界

全局状态机只使用两个业务标识作为状态锚点。请求追踪标识、幂等键，以及商品、订单、支付、物流和合同资源引用可以由传输层或对应原语使用，但不作为全局状态锚点。

| 标识符 | 中文名称 | 作用 | 生命周期 | 状态作用域 |
| --- | --- | --- | --- | --- |
| `trade_context_id` | 商业意图上下文标识 | 标识一次商业意图上下文，用于关联寻源、选择、询盘、议价及其派生交易。 | 从首份上下文级 `StateView` 形成，到该上下文结束或过期。 | 承载 `INIT`、`SOURCING`、`NEGOTIATING`。 |
| `transaction_id` | 交易全生命周期标识 | 标识一笔可独立成败的 UTP 交易，该交易具有独立支付、履约、取消和争议边界。 | 从 `purchase.complete` 返回 `SUCCESS` 且确认交易边界，到交易进入终态。 | 承载 `PURCHASING` 及后续交易级状态。 |

ID 生成与沿用 MUST 符合下表：

| 输入情况 | 状态处理 | 输出要求 |
| --- | --- | --- |
| 未提供 `trade_context_id` 且未提供 `transaction_id` | `initialize_state_view` 创建新的上下文级状态 | 形成一个全局唯一 `trade_context_id` 和 `INIT` StateView。 |
| 已提供 `trade_context_id`，未提供 `transaction_id` | `initialize_state_view` 按 `/utp/state/query` 的上下文级请求语义查询本方状态 | 不得生成或替换 `trade_context_id`。 |
| 已提供 `trade_context_id` 和 `transaction_id` | `initialize_state_view` 按 `/utp/state/query` 的交易级请求语义查询本方状态 | 不得生成或替换 `transaction_id`。 |
| 未提供 `trade_context_id` 但提供 `transaction_id` | 拒绝；交易级状态必须同时由两个业务 ID 定位 | 不得查询或生成状态。 |
| `purchase.complete` 确认新交易且未提供 `transaction_id` | 仅在 `SUCCESS` 结果对应 `CREATE_TRANSACTIONS` 时处理 | 每个独立交易边界形成一个全局唯一 `transaction_id` 和一份 `PURCHASING` StateView。 |

`trade_context_id` 与初始 `StateView` MUST 在 `initialize_state_view` 的创建分支中作为同一次状态结果形成。`initialize_state_view` 的查询分支只返回本方已有 `StateView`，不得修改状态或版本。`transaction_id` 与对应 `PURCHASING` StateView MUST 作为 `purchase.complete` 的 `SUCCESS` 结果被接受后的同一次状态结果形成；同一 `purchase.complete` 的重复完成响应不得再次形成交易 ID。相同 Action Response 被重复处理时，MUST 返回首次接受的 ID 和 `StateView`，不得形成另一组 ID。

商家本地订单 ID 不是 UTP 核心标识，可以作为资源引用关联到 `transaction_id`。如果多个本地订单共同承担同一交易义务并共享成败边界，可以关联到同一个 `transaction_id`；如果它们可以独立成功、取消或争议，则 MUST 拆分为不同的 `transaction_id`。

## 正向状态迁移

以下表格定义正向状态推进和无状态变化结果。

| ID | 作用域 / 当前状态 | Action | `execution_result` | Mode / 条件 | 结果 StateView | ID 与版本 |
| --- | --- | --- | --- | --- | --- | --- |
| S1 | 上下文 / `INIT` | `utp.source.search` | `SUCCESS` | 任意合法 Mode | `SOURCING` | 沿用 `trade_context_id`；版本 `1 -> 2` |
| S2 | 上下文 / `INIT` | `utp.source.lookup` | `SUCCESS` | 任意合法 Mode | `SOURCING` | 沿用 `trade_context_id`；版本 `1 -> 2` |
| S3 | 上下文 / `SOURCING` | `utp.source.search` | `SUCCESS` | 任意合法 Mode | 保持 `SOURCING` | 版本不变 |
| S4 | 上下文 / `SOURCING` | `utp.source.lookup` | `SUCCESS` | 任意合法 Mode | 保持 `SOURCING` | 版本不变 |
| N1 | 上下文 / `SOURCING` | `utp.negotiate.inquiry` | `SUCCESS` | `pricing_mode = L3` 或 `decision_path ∈ {L2,L3}` | `NEGOTIATING` | 版本 +1 |
| N2 | 上下文 / `NEGOTIATING` | `utp.negotiate.quote` | `SUCCESS` | Negotiate 已接受报价 | 保持 `NEGOTIATING` | 版本不变 |
| N3 | 上下文 / `NEGOTIATING` | `utp.negotiate.counter-offer` | `SUCCESS` | Negotiate 已接受反报价 | 保持 `NEGOTIATING` | 版本不变 |
| N4 | 上下文 / `NEGOTIATING` | `utp.negotiate.binding` | `SUCCESS` | Binding Terms 已形成 | 保持 `NEGOTIATING` | 版本不变 |
| P1 | 上下文 / `SOURCING` 或 `NEGOTIATING` | `utp.purchase.create` | `SUCCESS` | Purchase 已接受创建草案；拆单结果仍可调整 | 保持当前上下文状态 | 版本不变 |
| P2 | 上下文 / `SOURCING` 或 `NEGOTIATING` | `utp.purchase.update` | `SUCCESS` | Purchase 已接受草案更新；拆单结果仍可调整 | 保持当前上下文状态 | 版本不变 |
| P3 | 上下文 / `SOURCING` 或 `NEGOTIATING` | `utp.purchase.complete` | `SUCCESS` | Purchase 确认最终独立交易边界 | 派生 `PURCHASING` × `1..N` | 为每笔交易创建 `transaction_id`；版本 = 1 |
| P4 | 交易 / `PURCHASING` | `utp.purchase.complete` | `SUCCESS` | 同一订购完成请求的重复完成结果；交易边界已形成 | 保持 `PURCHASING` | 版本不变；不得再次生成 `transaction_id` |
| P5 | 上下文 / `SOURCING` 或 `NEGOTIATING` | `utp.purchase.cancel` | `SUCCESS` | Purchase 草案取消，未创建订单，返回渲染页或可继续调整的上下文 | 保持当前上下文状态 | 版本不变 |
| Y1 | 交易 / `PURCHASING` | `utp.pay.initiate` | `SUCCESS` | 支付发起完成，交易进入支付阶段 | `PAYING` | 版本 +1 |
| Y2 | 交易 / `PAYING` | `utp.pay.initiate`、`utp.pay.confirm` 或 `utp.pay.term` | `SUCCESS` | 当前付款步骤完成，仍停留在支付阶段 | 保持 `PAYING` | 版本不变 |
| Y3 | 交易 / `PAYING` | `utp.pay.initiate`、`utp.pay.confirm` 或 `utp.pay.term` | `SUCCESS` | 当前付款步骤满足履约前置条件，或全部付款义务完成，但尚未收到 Fulfill 履约事件 | 保持 `PAYING`；后续可执行 Fulfill Action | 版本不变 |
| Y4 | 交易 / `PAYING` | `utp.pay.confirm` 或 `utp.pay.term` | `SUCCESS` | 本次付款是履约完成后的最后义务 | `SETTLED` | 版本 +1；终态 |
| Y5 | 交易 / `FULFILLING` | `utp.pay.initiate` 或 `utp.pay.term` | `SUCCESS` | 已锁定交易条款要求在当前履约结果后启动下一付款阶段 | `PAYING` | 版本 +1 |
| F1 | 交易 / `PAYING` | `utp.fulfill.notify` | `SUCCESS` | 已收到发货、延迟、妥投或其他履约事件；履约阶段开始 | `FULFILLING` | 版本 +1 |
| F2 | 交易 / `FULFILLING` | `utp.fulfill.notify` | `SUCCESS` | 履约仍在进行 | 保持 `FULFILLING` | 版本不变 |
| F3 | 交易 / `FULFILLING` | `utp.fulfill.receive` | `SUCCESS` | 仍有履约批次 | 保持 `FULFILLING` | 版本不变 |
| F4 | 交易 / `FULFILLING` | `utp.fulfill.receive` | `SUCCESS` | 付款义务已完成 | `SETTLED` | 版本 +1；终态 |
| F6 | 交易 / `FULFILLING` | `utp.fulfill.reject` | `SUCCESS` | Fulfill 已接受拒收结果 | 保持 `FULFILLING` | 版本不变 |
| R1 | 任意交易级非终态 | `utp.resolve.raise` | `SUCCESS` | Resolve 已登记争议 | `DISPUTED` | 版本 +1；设置 `previous_state` |
| R2 | 交易 / `DISPUTED` | `utp.resolve.mediate` 或 `utp.resolve.arbitrate` | `SUCCESS` | Resolve 结果要求继续履行 | 恢复 `previous_state` | 版本 +1 |
| X1 | 任意非终态 | 任意原语 Action | `REJECTED` | Action 未被受理且无业务副作用 | 保持当前状态 | 版本不变 |

Y3 只表示付款结果已经满足后续履约前置条件，或全部付款义务已经完成；它不代表发货或履约已经开始。交易进入 `FULFILLING` 必须由 Fulfill 原语结果触发，通常是 `utp.fulfill.notify` 返回 `SUCCESS` 并表达发货、延迟、妥投或其他履约事件已经被接受。

## 模式分支（Mode）

Mode 决定全局状态路径实际经过哪些阶段。简单交易和复杂交易使用同一组全局状态。

| Mode 维度 | 条件 | 分支行为 | 影响的状态迁移 |
| --- | --- | --- | --- |
| `pricing_mode` + `decision_path` | `pricing_mode ∈ {L0,L1,L2}`；`decision_path ∈ {L0,L1}` | Source 阶段已完成定价，不需要询报价，跳过 `NEGOTIATING` | `SOURCING -> purchase.complete -> PURCHASING × 1..N` |
| `pricing_mode` + `decision_path` | `pricing_mode = L3` 或 `decision_path ∈ {L2,L3}` | 进入 `NEGOTIATING`：取得正式 Quote 或按决策链路形成 Binding Terms | `SOURCING -> NEGOTIATING -> purchase.complete -> PURCHASING × 1..N` |
| `decision_path` | `decision_path ∈ {L2,L3}` | 说明询报价内部决策方式：L2 双方议价，L3 多方竞价 | 这些步骤不改变全局主状态；Binding Terms 形成前一直保持 `NEGOTIATING` |
| `payment_structure` + `fulfillment_structure` | `payment_structure = L0` 且 `fulfillment_structure = L0` | 一次性付款和直接履约，按正向链路推进 | `PURCHASING -> PAYING -> FULFILLING -> SETTLED`；不出现 `FULFILLING -> PAYING` |
| `payment_structure` + `fulfillment_structure` | `payment_structure = L1` 且 `fulfillment_structure ∈ {L2,L3}` | 分阶段付款遇到分阶段或复杂履约，付款触发点可绑定履约阶段 | 履约结果满足下一付款条件后，后续 Pay Action 可触发 `FULFILLING -> PAYING`；否则继续 `FULFILLING` 或进入 `SETTLED` |
| `payment_structure` + `fulfillment_structure` | `payment_structure = L1` 且 `fulfillment_structure ∈ {L0,L1}` | 付款可以分阶段，但履约本身不是分阶段完成 | 是否允许后续 Pay Action 触发 `FULFILLING -> PAYING` 只取决于已锁定条款是否把后续付款绑定到履约事件；默认不因履约结构产生回跳 |
| `payment_structure` + `fulfillment_structure` | `payment_structure ∈ {L2,L3}` | 账期或信用证流程可能把付款义务放在履约事件之后 | 是否允许后续 Pay Action 触发 `FULFILLING -> PAYING` 由账期、信用证和履约条款共同决定；不得仅凭付款结构或履约结构单独回跳 |
| `relationship_mode` | `relationship_mode = L1` | 后续订单可以引用已签采购合同；合同资源不是全局状态 | 每次后续订单仍通过新的 `purchase.complete` 形成独立交易级 `StateView` |
| `relationship_mode` | `relationship_mode ∈ {L2,L3}` | 框架协议或战略合作资源可以创建多笔独立交易 | 每次 `purchase.complete` 确认独立交易级 `StateView` |
| `compliance_level` | `compliance_level ∈ {L1,L2,L3}` | L1 增加资质核验；L2 增加跨境清关合规校验；L3 增加全面审计证据要求 | 这些步骤由原语结果表达，不新增全局状态 |

## 全局状态机规则定义

全局状态机规则定义描述状态、Action 允许条件、状态结果和 Mode 分支。当前版本包含四个顶层成员：

| 成员 | 描述 |
| --- | --- |
| `states` | 全局状态声明集合 |
| `action_guards` | Action 执行前的允许条件声明 |
| `transitions` | 不依赖 Mode 的状态结果声明 |
| `branches` | 依赖 Mode 的状态结果声明 |

规则定义中的 `result_type` 表达 `evaluate_result` 的状态效果：

| `result_type` | 含义 |
| --- | --- |
| `KEEP` | 当前 `StateView` 保持不变。 |
| `TRANSITION` | 当前 `StateView` 进入 `to_state` 指定的状态。 |
| `CREATE_TRANSACTIONS` | `purchase.complete` 返回 `SUCCESS` 且确认一笔或多笔交易级 `StateView`，目标状态为 `PURCHASING`。 |

`execution_result` 来自 P0 `ActionResponse`。`output` 和 `valid_next_actions` 也属于 P0 `ActionResponse`，不是 `StateView` 字段。

```json
{
  "states": [
    { "name": "INIT", "scope": "trade_context", "terminal": false },
    { "name": "SOURCING", "scope": "trade_context", "terminal": false },
    { "name": "NEGOTIATING", "scope": "trade_context", "terminal": false },
    { "name": "PURCHASING", "scope": "transaction", "terminal": false },
    { "name": "SETTLED", "scope": "transaction", "terminal": true }
  ],
  "action_guards": [{
    "action": "utp.source.search",
    "from_states": ["INIT", "SOURCING"]
  }],
  "transitions": [{
    "id": "S1",
    "from_state": "INIT",
    "action": "utp.source.search",
    "execution_result": "SUCCESS",
    "result_type": "TRANSITION",
    "to_state": "SOURCING"
  }],
  "branches": [{
    "id": "B-DIRECT-PURCHASE",
    "mode": {
      "pricing_mode": ["L0", "L1", "L2"],
      "decision_path": ["L0", "L1"]
    },
    "from_state": "SOURCING",
    "action": "utp.purchase.complete",
    "execution_result": "SUCCESS",
    "result_type": "CREATE_TRANSACTIONS",
    "to_state": "PURCHASING"
  }]
}
```

对应的 Schema 入口为：

```text
https://ut-protocol.com/global-state-machine/state_machine.json
```

## 路径编排函数

路径编排围绕原语 Action 执行使用以下概念函数。这些函数只定义协议可见行为。

### `initialize_state_view`

| 方向 | 字段 | 类型 | 必填 | 描述 |
| --- | --- | --- | --- | --- |
| 输入 | `trade_context_id` | string | 否 | 已有商业意图继续推进时提供；新商业意图不提供。 |
| 输入 | `transaction_id` | string | 否 | 已有交易继续推进时与 `trade_context_id` 同时提供；上下文级状态或新商业意图不提供。 |
| 输入 | `mode` | Mode | 是 | 当前商业意图已经锁定的 Mode。 |
| 输出 | `state_view` | StateView | 是 | 新建的 INIT StateView，或按输入业务 ID 查询到的本方当前 StateView。 |
| 输出 | `error` | Error \| null | 是 | 成功时为 `null`；ID 组合非法或本方状态不存在时返回 P0 标准错误结构。 |

判断方式：未提供 `trade_context_id` 且未提供 `transaction_id` 时，形成新的 `trade_context_id` 和初始 `StateView`。已提供 `trade_context_id` 且未提供 `transaction_id` 时，按 `/utp/state/query` 的上下文级请求语义查询本方 `StateView`。同时提供 `trade_context_id` 与 `transaction_id` 时，按 `/utp/state/query` 的交易级请求语义查询本方 `StateView`。只提供 `transaction_id` MUST 被拒绝；查询不到本方状态时返回 P0 标准错误结构。查询分支不得修改状态或版本。

### `validate_action_by_state`

| 方向 | 字段 | 类型 | 必填 | 描述 |
| --- | --- | --- | --- | --- |
| 输入 | `state_view` | StateView | 是 | Action 执行前的当前状态。 |
| 输入 | `action` | string | 是 | 准备执行的 Action 标识。 |
| 输入 | `mode` | Mode | 是 | 当前商业意图已经锁定的 Mode。 |
| 输出 | `accepted` | boolean | 是 | 是否允许本次 Action 进入执行。 |
| 输出 | `error` | Error \| null | 是 | 拒绝时使用 P0 标准错误结构；允许时为 `null`。 |

判断方式：先依据 `StateView` 的作用域校验标识是否完整；上下文级状态只使用 `trade_context_id`，交易级状态必须同时携带 `trade_context_id` 和 `transaction_id`。随后检查当前状态是否为终态；终态不得再执行会改变交易状态的 Action。最后根据状态机定义中的 `action_guards`、`branches` 与当前 Mode 判断该 Action 是否可以从当前状态执行。某个 Action 出现在 `valid_next_actions` 中，不代表它可以绕过本次状态校验。

### `evaluate_result`

| 方向 | 字段 | 类型 | 必填 | 描述 |
| --- | --- | --- | --- | --- |
| 输入 | `state_view` | StateView | 是 | Action 执行前固定的状态视图。 |
| 输入 | `action_response` | ActionResponse | 是 | P0 标准响应；状态判定读取 Action 标识和 `execution_result`。 |
| 输入 | `mode` | Mode | 是 | 当前商业意图已经锁定的 Mode。 |
| 输出 | `result_type` | enum | 是 | `KEEP`、`TRANSITION` 或 `CREATE_TRANSACTIONS`。 |
| 输出 | `to_state` | enum | 条件必填 | 当结果需要进入单一目标状态时提供。 |

判断方式：先读取 `ActionResponse.execution_result`。`REJECTED` 表示 Action 未被受理且无业务副作用，状态和版本保持不变；`SUCCESS` 必须按当前状态、Action 和 Mode 唯一匹配状态机定义。`purchase.complete` 的 `SUCCESS` 结果确认最终独立交易边界后，由后续提交形成交易级 `StateView`。除该场景按 P3 标准响应确认独立交易边界外，状态结果不得由任意业务字段重新推断。

### `commit_state_transition`

| 方向 | 字段 | 类型 | 必填 | 描述 |
| --- | --- | --- | --- | --- |
| 输入 | `state_view` | StateView | 是 | Action 执行前固定的状态视图。 |
| 输入 | `action_response` | ActionResponse | 是 | 触发状态判定的 P0 标准响应。 |
| 输入 | `mode` | Mode | 是 | 当前商业意图已经锁定的 Mode。 |
| 输出 | `accepted` | boolean | 是 | 本次状态结果是否被接受。 |
| 输出 | `result_type` | enum | 否 | 接受时返回 `evaluate_result` 的结果类别。 |
| 输出 | `state_views` | StateView[] | 是 | 本次提交后形成或保持的完整状态视图集合。 |
| 输出 | `error` | Error \| null | 是 | 拒绝时使用 P0 标准错误结构；接受时为 `null`。 |

判断方式：先执行 `evaluate_result`。若结果为 `KEEP`，返回当前 `StateView`，`state_version` 不变。若结果为 `TRANSITION`，沿用原有标识，状态进入 `to_state`，`state_version` 递增。若结果为 `CREATE_TRANSACTIONS`，保留上下文级 `StateView`，并为每个独立交易边界形成一份 `state = PURCHASING`、`state_version = 1` 的交易级 `StateView`。同一 Action Response 已被接受过时，返回首次接受的 `state_views`，不得重复形成交易 ID。状态结果被接受后，通过 `/utp/state/notify` 同步给相关参与方。

## 状态同步

状态同步采用“变更时推送、需要时查询”的方式。

| 操作 | HTTP Path | 调用时机 |
| --- | --- | --- |
| 状态通知 | `POST /utp/state/notify` | 接受 Action Response 并形成新 `StateView` 后 |
| 状态查询 | `POST /utp/state/query` | 继续交易、重新连接或发现版本缺口时 |

### `/utp/state/notify`

`/utp/state/notify` 传输触发状态变化的完整 P0 `ActionResponse`，以及该响应一次形成的完整 `state_views` 数组。

```json
{
  "action_response": {
    "action": "utp.fulfill.notify",
    "session_id": "utp-session-20260729-001",
    "execution_result": "SUCCESS",
    "output": {},
    "valid_next_actions": ["utp.fulfill.receive"]
  },
  "state_views": [{
    "trade_context_id": "utp-ctx-7f3c2d10-9a64-4b81-8e25-6d0f4c3a9127",
    "transaction_id": "utp-txn-2b6e8f41-3c95-47ad-a120-9e5d7b4c6813",
    "state": "FULFILLING",
    "state_version": 4
  }]
}
```

通知顶层 MUST NOT 重复传输 `trade_context_id` 或 `transaction_id`；这些标识由每个 `StateView` 携带。一次 `purchase.complete` 确认多笔交易时，所有交易级 `StateView` MUST 放在同一个 `state_views` 数组中。

### `/utp/state/query`

上下文级查询只提供 `trade_context_id`。

```json
{
  "trade_context_id": "utp-ctx-7f3c2d10-9a64-4b81-8e25-6d0f4c3a9127"
}
```

交易级查询同时提供两个标识。

```json
{
  "trade_context_id": "utp-ctx-7f3c2d10-9a64-4b81-8e25-6d0f4c3a9127",
  "transaction_id": "utp-txn-2b6e8f41-3c95-47ad-a120-9e5d7b4c6813"
}
```

成功响应返回当前 `StateView`。

```json
{
  "state_view": {
    "trade_context_id": "utp-ctx-7f3c2d10-9a64-4b81-8e25-6d0f4c3a9127",
    "transaction_id": "utp-txn-2b6e8f41-3c95-47ad-a120-9e5d7b4c6813",
    "state": "FULFILLING",
    "state_version": 4
  }
}
```

## 一致性边界

全局状态机保证同一协议输入下的状态判定一致。UTP 不要求存在中心状态权威。

| 边界 | 要求 |
| --- | --- |
| 确定性判定 | 相同的当前 `StateView`、Action、`ActionResponse`、Mode 和协议版本 MUST 得到相同的可接受结果。 |
| 本地校验 | `/utp/state/notify` 的接收方 MUST 根据本地当前状态上下文校验收到的 `state_views`，校验通过后才能接受。 |
| 版本单调 | 只有全局状态变化时，`state_version` 才递增；状态保持结果沿用当前版本。 |
| 通知幂等 | 同一已接受状态结果被重复投递时，MUST 返回已经接受的 `StateView` 数据。 |
| 版本缺口处理 | 接收方发现版本缺口时，MUST 停止依赖缺口状态的 Action，并通过 `/utp/state/query` 取得当前 `StateView`。 |
| 禁止内部状态覆盖 | 参与方 MUST NOT 使用内部订单状态、时间戳或未校验的目标状态覆盖 `StateView`。 |

如果同一前置版本出现相互冲突的状态结果，参与方保留最后一份已校验的 `StateView`，并停止依赖冲突结果的 Action，直到状态可以被校验。
