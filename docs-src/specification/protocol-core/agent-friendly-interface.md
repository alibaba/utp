---
title: Agent友好接口
section: protocol-core
owner: protocol-architecture
status: drafting
version: 2026-07-29
---

# 第 19 章：Agent 友好接口设计（Agent-Friendly Interface Design） {#s-19-agent-friendly-interface-design}

UTP 协议假设调用方 100% 是 AI Agent。所有原本由人类隐式承担的认知负荷——理解前置条件、推断下一步动作、处理异常恢复、协调多方——MUST 被显式编码进协议本身。本章定义协议层面的 Agent 友好接口规范。

接口设计遵循三条基本原则：**契约最小化**（MUST 层只保留跨方语义必须一致的字段）、**静态与动态分离**（会话内不变的信息在握手时下发并冻结，运行时通过引用携带）、**核心闭合与扩展开放**（核心字段取值枚举封闭，领域差异走命名空间扩展）。每个字段按 MUST（跨方契约）/ SHOULD（运行时提示）/ MAY（客户端策略）三档分层，而非一律进入 MUST。这三条原则是本章所有字段设计判定的依据。

**章节边界**：本章不定义新的交易原语，也不穷举各业务阶段的 Action 列表。Source / Negotiate / Purchase / Pay / Fulfill / Resolve 等原语章节负责定义其业务对象、状态迁移和规范 Action 集合；本章只定义这些状态、数据、错误和 Action 面向 Agent 暴露时必须遵循的统一接口契约。所有原语章节在暴露可执行动作时 MUST 使用本章定义的 Action Object 结构。

---

## 19.1 自描述协议响应 {#s-19-1}
### 19.1.1 设计原则 {#s-19-1-1}
每个 UTP 协议响应 MUST 包含完整的自描述信息，使 Agent 无需查阅外部文档即可理解当前状态和可用操作。这是从传统 API 到 Agent 协议的关键范式转变：人类开发者可以读文档，Agent 只能解析结构化数据。

### 19.1.2 响应结构 {#s-19-1-2}
每个协议响应按下表分层携带字段。**Mode 与 Topology 采用会话内快照引用机制**：完整的 Mode Object 与 Topology 结构在 `session.init` 握手时一次性下发并冻结（参见第四章 MessageEnvelope 与第二十一章 §20.1），运行时响应 MUST 通过 `mode_ref` / `topology_ref` 引用握手快照，避免每次内联全量对象。该引用不得指向外部文档或未下发对象；Agent MUST 能够仅凭当前 session 上下文解析引用。

| 字段名 | 类型 | 必填等级 | 描述 |
|----|----|----|----|
| `session_id` | string | MUST | 当前交易会话的唯一标识（跨方语义锚点） |
| `response_id` | string | MUST | 当前响应的唯一标识，用于审计、排错、重放保护和争议取证 |
| `action` | string | MUST | 本次响应对应的操作标识，与请求中的 `action` 一致（同 P0 响应骨架，见[第 10 章 §10.2.3](/documentation/specification/protocol-core/primitive-framework.html#s-1023-action-definition-format)） |
| `idempotency_key` | string | MAY | 原样回显请求中的幂等键，用于关联重试请求及其响应（同 P0 响应骨架） |
| `idempotency` | object | SHOULD | 幂等处理结果，说明本次响应是首次执行（`applied`）还是重复请求命中（`duplicate`），语义见 §19.3 |
| `state` | enum | MUST | 当前全局状态（参见第 17 章，枚举封闭） |
| `state_version` | integer | MUST | 当前响应所属业务锚点（`trade_context_id` / `transaction_id`）的 StateView 迁移版本，锚点与递增规则见[第 17 章 §17.1.4](/documentation/specification/protocol-core/global-state-machine.html#s-1714)；同一锚点内单调递增，Agent MUST NOT 基于旧版本执行写操作 |
| `hai` | object | 条件必填 | 当存在活跃 HAI 控制，或当前响应需要表达 HAI 控制结果时 MUST 存在；用于并行表达人机协同控制信息，MUST NOT 作为 `state` 的子状态承载 |
| `server_time` | datetime | MUST | 服务端生成响应时间，作为有效期、重试和审计判断的时间基准 |
| `mode_ref` | SnapshotRef | MUST | 指向 session.init 握手快照的 Mode 引用（替代运行时全量 Mode Object） |
| `topology_ref` | SnapshotRef | MUST | 指向 session.init 握手快照的 Topology 引用（替代运行时全量 Topology） |
| `action_matrix_ref` | SnapshotRef | SHOULD | 指向 session.init 下发的静态动作矩阵；当响应未内联 `valid_next_actions` 时 MUST 存在 |
| `valid_next_actions` | Action\[\] | 场景分层（见 §19.1.3） | 当前状态下可执行的动作列表；关键节点 MUST，一般状态迁移 SHOULD，稳态 MAY |
| `warnings` | Warning\[\] | SHOULD | 当前存在的警告信息，`type` 取自协议级 Warning Vocabulary |
| `output` | object | MUST（错误响应 MAY 省略） | 当前操作的业务输出，字段定义以 P0 响应骨架的 `output` 为准（见[第 10 章 §10.2.3](/documentation/specification/protocol-core/primitive-framework.html#s-1023-action-definition-format)） |
| `error` | Error\|null | MUST | 成功响应为 `null`；失败响应 MUST 使用 P0 原语通用框架定义的标准错误响应格式，并按 §19.2 携带 Agent 可恢复路径 |
| `extensions` | object | MAY | 领域扩展入口，命名空间遵循[第 8 章 §8.3.4](/documentation/specification/protocol-core/procurement-models.html#s-834-m3) M3 领域维度的 reverse-domain 规则 |

`SnapshotRef` 是会话内快照句柄，类型为对象：`{ snapshot_id, version, digest }`。其中 `snapshot_id` 和 `version` 为 MUST，`digest` 为 SHOULD，用于校验各方持有的快照内容一致。若接收方无法解析 `mode_ref` / `topology_ref` / `action_matrix_ref`，MUST 将响应视为协议错误。

> **过渡兼容说明**：v1.x 允许服务端在响应中同时携带 `mode` / `topology` 全量对象与 `mode_ref` / `topology_ref`；客户端 Agent MUST 优先使用 ref 引用握手快照。v2.0 起响应仅保留 ref，全量对象仅在 session.init 中出现。

### 19.1.3 valid_next_actions 结构 {#s-19-1-3}
#### 19.1.3.1 场景分层 {#s-19-1-3-1}
`valid_next_actions` 在不同响应场景下承担不同职责，因此按场景分层，而非一律 MUST。

| 场景 | 必填等级 | 职责说明 |
|----|----|----|
| 存在活跃 HAI 挂起控制的响应（参见 Ch.20） | MUST | **协议级安全白名单**：存在活跃 HAI 挂起控制时，`valid_next_actions` MUST 只包含 HAI 允许暴露给 Agent 的只读动作；`resume` / `cancel` / `inspect` 等控制动作若被表达，MUST 标注其触发方不属于 Agent，并应被客户端视为 control-only action，防止在等待人工审批期间越权操作 |
| 错误响应（`error.recovery_actions` 场景） | MUST | 提供结构化恢复路径，Agent 可直接消费（详见 §19.2） |
| 状态一致性对账响应（参见[第 17 章 §17.5](/documentation/specification/protocol-core/global-state-machine.html#s-175-state-consistency)） | MUST | 状态不一致时显式指导修复路径 |
| 状态迁移刚发生的响应（primary state 变化或 HAI 控制结果刚形成） | SHOULD | 帮助 Agent 快速理解新状态下的行动空间 |
| 稳态运行时响应（同一 state 内的普通查询） | MAY（推荐用 `action_matrix_ref` 替代） | 静态可缓存，避免重复内联；由 Agent 基于 state + 静态动作矩阵自主推导 |

配套机制：session.init 握手时下发静态 `action_matrix`（每个 `state` 允许的动作全集），运行时响应仅在关键节点内联 `valid_next_actions`，其余时候通过 `action_matrix_ref` 引用静态矩阵。若响应未内联 `valid_next_actions`，则 `action_matrix_ref` MUST 存在且可解析；Agent MUST 能够基于 `state`、并行的 HAI 控制对象、`mode_ref`、`topology_ref`、业务对象状态和权限上下文计算当前行动空间。

#### 19.1.3.2 单个 Action 字段 {#s-19-1-3-2}
Action Object 是 UTP 面向 Agent 的核心执行单元。它表示"当前状态下协议允许执行的一个业务动作"，可被 Agent 选择、被运行时映射为 Tool 调用，也可被 UI 消费为按钮、表单或确认弹窗。每个可用动作按下表分层携带字段：

| 字段名 | 类型 | 必填等级 | 描述 |
|----|----|----|----|
| `action` | string | MUST | 动作标识（如 `utp.negotiate.inquiry`） |
| `label` | string | SHOULD | 短展示名，可供 UI 按钮、菜单和 Agent 摘要使用 |
| `description` | string | MUST | 人类可读的动作描述 |
| `invoke` | Invocation | MUST unless human-only | 执行入口，例如 `{ method, href }`；human-only 动作 MUST 给出人工处理入口或审批路径 |
| `trigger` | string | MUST when agent cannot invoke directly | 声明动作的触发主体；例如 HAI 控制动作 MUST 标注 `platform_control_channel`，表示该动作不允许 Agent 自行调用 |
| `input_schema` | JSON Schema | MUST when input required | 动作输入参数的机器可读 schema；替代自由文本式 `requires_input` |
| `data_visibility` | enum | SHOULD | 该 Action 在[原语定义文件](/documentation/specification/protocol-core/primitive-framework.html#s-1026-primitive-declaration-schema)中声明的最高数据可见性等级（`V0` / `V1` / `V2`）；用于客户端预先判断数据处理边界，不替代运行时 Surface 的具体声明。 |
| `interaction_level` | enum | MAY | 该 Action 在[原语定义文件](/documentation/specification/protocol-core/primitive-framework.html#s-1026-primitive-declaration-schema)中声明的控制等级（`AUTONOMOUS` / `SUPERVISED` / `CONFIRMED`）；省略 `hai` 的 Action MAY 省略本字段或视为 `AUTONOMOUS` |
| `agent_hint` | string | MAY | 供 Agent 决策参考的上下文提示 |
| `preconditions` | string\[\] | SHOULD | 执行该动作的前置条件（形式化表达） |
| `postconditions` | object\[\] | SHOULD | 动作成功后的状态迁移、业务副作用或承诺变化摘要 |
| `risk` | Risk | MUST when material | 涉及资金、合同、库存锁定、合规、履约或不可逆后果时 MUST 存在 |
| `confirmation` | Confirmation | MUST when required | 是否需要人类确认；需要确认时 MUST 包含 `summary_for_human` |
| `authorization` | Authorization | SHOULD | 当前 actor 是否可执行、缺少什么权限、是否需要审批人或更高授权 |
| `idempotency` | IdempotencyPolicy | MUST for write actions | 幂等策略；对象存在即表示该 Action 要求幂等键，结构定义见 [§19.3.1](#s-19-3-1) |
| `validity` | Validity | MUST when expiring | 动作有效期、依赖报价/库存/授权的过期时间 |
| `recovery` | Recovery | SHOULD for risky actions | 超时、结果不确定、状态冲突时的恢复路径 |
| `display` | object | MAY | UI 渲染提示，如排序、分组、样式；不得改变协议语义 |
| `estimated_duration` | string | MAY | 预估执行时间 |

**条件 MUST 规则**：若 Action 会变更状态或产生副作用，`idempotency` MUST 存在；若 Action 会产生资金、合同、库存、履约、合规或不可逆后果，`risk` MUST 存在；若 Action 需要用户或审批人确认，`confirmation.required` MUST 为 `true` 且 `confirmation.summary_for_human` MUST 存在；若 Action 需要输入，`input_schema` MUST 存在；若 Action 依赖会过期的报价、库存、授权或窗口期，`validity.expires_at` MUST 存在。

### 19.1.4 完整响应示例 {#s-19-1-4}
下方示例为 **SOURCING → NEGOTIATING 状态迁移刚发生** 的响应，因此 `valid_next_actions` 按 §19.1.3.1 场景分层为 **SHOULD**，服务端选择内联以帮助 Agent 理解新状态。示例同时展示 v1.x 过渡形式：`mode_ref` / `topology_ref` 与全量 `mode` / `topology` 并存，客户端 MUST 优先使用 ref。

```json
{
  "session_id": "utp-session-abc123",
  "response_id": "resp-utp-session-abc123-0008",
  "action": "utp.negotiate.inquiry",
  "state": "NEGOTIATING",
  "state_version": 2,
  "hai": null,
  "server_time": "2026-07-15T10:20:00Z",
  "mode_ref": {
    "snapshot_id": "mode-utp-session-abc123-v1",
    "version": 1,
    "digest": "sha256:modehash..."
  },
  "topology_ref": {
    "snapshot_id": "topo-utp-session-abc123-v1",
    "version": 1,
    "digest": "sha256:topohash..."
  },
  "action_matrix_ref": {
    "snapshot_id": "actmx-utp-session-abc123-v1",
    "version": 1,
    "digest": "sha256:actmxhash..."
  },
  "mode": {
    "pricing_mode": "L2",
    "decision_path": "L2",
    "payment_structure": "L1",
    "fulfillment_structure": "L1",
    "relationship_mode": "L0",
    "compliance_level": "L1",
    "combination_name": "b2b_negotiated_std"
  },
  "topology": {
    "participants": 2,
    "roles": ["Buyer", "Seller"]
  },
  "valid_next_actions": [
    {
      "action": "utp.negotiate.inquiry",
      "label": "提交询盘",
      "description": "向供应商提交询盘请求",
      "invoke": {
        "method": "POST",
        "href": "/sessions/utp-session-abc123/actions/utp.negotiate.inquiry"
      },
      "agent_hint": "当前已收到 0 份报价，建议先提交询盘获取报价",
      "preconditions": [
        "session.state == 'NEGOTIATING'",
        "discover.output.candidate_set.size > 0"
      ],
      "postconditions": [
        { "type": "STATE_TRANSITION", "to": "NEGOTIATING" }
      ],
      "estimated_duration": "2-24h",
      "input_schema": {
        "type": "object",
        "required": ["item_id", "quantity"],
        "properties": {
          "item_id": { "type": "string" },
          "quantity": { "type": "integer", "minimum": 1 },
          "requirements": { "type": "string" }
        }
      },
      "risk": {
        "level": "LOW",
        "summary": "提交询盘不形成采购义务"
      },
      "confirmation": {
        "required": false
      },
      "idempotency": {
        "key_scope": "session+action+item"
      }
    },
    {
      "action": "utp.negotiate.query",
      "description": "查看已收到的供应商报价列表",
      "agent_hint": null,
      "preconditions": [
        "session.state == 'NEGOTIATING'"
      ],
      "estimated_duration": "< 1s"
    },
    {
      "action": "utp.negotiate.counter-offer",
      "description": "对收到的报价提出反报价",
      "agent_hint": "建议基于历史成交价和市场行情提出反报价",
      "preconditions": [
        "session.state == 'NEGOTIATING'",
        "negotiate.quotes.size > 0"
      ],
      "input_schema": {
        "type": "object",
        "required": ["quote_id", "counter_price"],
        "properties": {
          "quote_id": { "type": "string" },
          "counter_price": { "type": "number" },
          "counter_quantity": { "type": "integer" }
        }
      }
    },
    {
      "action": "utp.source.search",
      "description": "返回搜索更多供应商",
      "agent_hint": "如对当前候选集不满意，可返回发现阶段扩展搜索",
      "preconditions": [],
      "estimated_duration": "1-5s"
    },
    {
      "action": "utp.resolve.raise-dispute",
      "description": "发起争议解决",
      "agent_hint": "如发现供应商存在欺诈或不合规行为，可发起争议",
      "preconditions": [],
      "estimated_duration": "varies"
    }
  ],
  "warnings": [
    {
      "type": "QUOTE_EXPIRING",
      "message": "供应商 A 的报价将在 2 小时后过期",
      "severity": "medium",
      "affected_entity": "quote-001",
      "expires_at": "2026-07-15T12:00:00Z",
      "suggested_action": "utp.negotiate.binding"
    }
  ],
  "output": {
    "candidate_set_size": 3,
    "quotes_received": 1,
    "negotiation_round": 1
  },
  "error": null
}
```

### 19.1.5 人机协同（HAI）联动 {#s-19-1-5}
人机协同控制语义（执行门、挂起记录、确认续跑、控制结果投递、数据隔离）由[第 20 章](/documentation/specification/protocol-core/human-agent-interaction.html)统一定义；本节不重复其规则，只声明 Agent 接口侧的承载位置：

- **响应信封承载**：HAI 挂起控制 MUST NOT 写入 `state` / `sub_state`，而通过信封的并行 `hai` 对象表达（信封字段见 §19.1.2；`hai` 对象结构与各 `interaction_level` 下的信封行为见第 20 章 [§20.1.3](/documentation/specification/protocol-core/human-agent-interaction.html#s-1913)、[§20.7.2](/documentation/specification/protocol-core/human-agent-interaction.html#s-1942)）。
- **Action Object 承载**：`interaction_level`（信息性副本，权威声明在实现方的原语定义文件，见[第 10 章原语声明](/documentation/specification/protocol-core/primitive-framework.html#s-1026-primitive-declaration-schema)；省略 `hai` 声明视为 `AUTONOMOUS`）与 `trigger` 字段已由 §19.1.3.2 定义。
- **挂起期行动空间**：存在活跃 HAI 挂起时 `valid_next_actions` 的只读白名单规则由 §19.1.3.1 定义；续跑成功后的响应属于状态迁移响应链，同样适用 §19.1.3.1 的场景分层。
- **运行时交接**：Agent 运行时收到含活跃挂起的响应后，MUST 向 Host 传递 `surface_id`（或 Host 侧 HAI 副本）、`session_id`、`transaction_id` 及 Host 安全上下文中的 `suspend_id`，供 Surface 渲染与 Principal 确认续跑；`suspend_id` 对 LLM 的数据隔离规则见第 20 章 [§20.2.3](/documentation/specification/protocol-core/human-agent-interaction.html#s-1923) 与 [§20.12](/documentation/specification/protocol-core/human-agent-interaction.html#s-19-11)。
- **请求与响应链**：CONFIRMED 首次挂起响应、Platform 续跑请求的 `hai` attachment（`suspend_id` / `integrity` / `evidence`）、控制结果及其经 Host 回流 Agent 运行时的投递要求，见第 20 章 [§20.7.1](/documentation/specification/protocol-core/human-agent-interaction.html#s-1941)–[§20.7.6](/documentation/specification/protocol-core/human-agent-interaction.html#s-1946)。

---

## 19.2 Agent 友好的错误恢复 {#s-19-2}
### 19.2.1 设计原则 {#s-19-2-1}
UTP 的标准错误响应格式由 P0 原语通用框架定义（参见 [10.4.3 标准错误响应格式](/documentation/specification/protocol-core/primitive-framework.html#s-1043-standard-error-response)）并在 Schema 章节提供机器可读定义（`common/error.json`）。本节不重新定义基础 Error Object，而是规定错误响应面向 Agent 时必须携带的恢复语义，使 Agent 能够直接执行恢复动作，而非需要人类介入判断。这是 UTP 达到 L4 Agent 友好度的关键要求。

### 19.2.2 错误响应结构 {#s-19-2-2}
错误响应在 P0 标准错误格式之上增加 Agent 恢复语义。`error.code` 的格式、注册和基础字段由 P0 定义；`recovery_actions` 在可恢复时承担"错了怎么办"的契约化恢复路径，其余字段按用途归入 SHOULD / MAY。`error.recovery_actions[]` MUST 复用 §19.1.3.2 定义的 Action Object 结构；恢复动作可以额外携带 `priority` 与已知默认输入。补偿链细节改为引用（`compensation_log_ref`），指向[第 7 章 Evidence Bundle](/documentation/specification/protocol-core/security-trust.html#s-73-evidence-bundle) 中的补偿链审计记录；补偿链的执行与审计规则见[第 17 章 §17.3](/documentation/specification/protocol-core/global-state-machine.html#s-173-saga)。

| 字段名 | 类型 | 必填等级 | 描述 |
|----|----|----|----|
| `error.code` | string | MUST | 错误码，取自协议级错误码词汇表（Appendix B，枚举封闭） |
| `error.recoverable` | boolean | MUST | 是否可恢复 |
| `error.recovery_actions` | Action\[\] | MUST when `recoverable=true` | 结构化恢复动作列表，复用 Action Object；恢复排序可通过 `priority` 表达 |
| `error.message` | string | SHOULD | 人类可读的错误描述（供适配器透传底层文本，协议一致性判定以 `code` 为准） |
| `error.details` | object | SHOULD | 错误的附加上下文数据（自由字段，供调试与决策），即 P0 [§10.4.3](/documentation/specification/protocol-core/primitive-framework.html#s-1043-standard-error-response) 定义的 `details` 字段 |
| `error.compensation_log_ref` | string | MAY | 补偿链审计引用（替代内联 `compensation_taken`）：取值为记录补偿 Action 响应的 Evidence Bundle 的 `bundle_id`（见第 7 章 §7.3.3） |
| `error.reference` | string | MAY | 错误文档引用 URL（实现方特殊场景补充链接，一般错误由 `code` 在协议注册中心自动定位） |

> **字段位置说明**：原顶层 `error.agent_hint` 融入每个 `recovery_actions[]` 项内部，决策提示挂在具体动作上而非独立顶层字段，避免"通用提示"与"针对特定恢复动作的提示"混淆。若恢复动作需要参数，MUST 使用 `input_schema` 表达参数结构；若服务端已知推荐默认值，MAY 通过 `default_input` 提供。该机制同样适用于 HAI Resume/Cancel 后返回的标准状态迁移响应：当服务端已经知道下一步动作的权威默认参数时，SHOULD 在响应链中内联 `default_input`，避免 Agent 从先前上下文“猜”参数。

### 19.2.3 完整错误响应示例 {#s-19-2-3}
库存不足错误（可恢复）：

```json
{
  "error": {
    "code": "INVENTORY_INSUFFICIENT",
    "message": "供应商库存不足（需求 1000 件，可用 600 件）",
    "recoverable": true,
    "recovery_actions": [
      {
        "action": "utp.negotiate.counter-offer",
        "description": "以可用数量 600 件重新议价",
        "input_schema": {
          "type": "object",
          "required": ["quantity"],
          "properties": {
            "quantity": { "type": "integer", "maximum": 600 }
          }
        },
        "default_input": {
          "quantity": 600
        },
        "agent_hint": "该供应商历史按时交付率 94%，建议优先以 600 件重新议价",
        "priority": 1
      },
      {
        "action": "utp.source.search",
        "description": "搜索替代供应商",
        "default_input": {
          "query": "同类替代供应商",
          "min_quantity": 1000
        },
        "agent_hint": "如需足量 1000 件，建议搜索替代供应商",
        "priority": 2
      }
    ],
    "compensation_log_ref": "bundle-20260715-001",
    "details": {
      "requested_quantity": 1000,
      "available_quantity": 600,
      "supplier_id": "supplier-A",
      "item_id": "item-XYZ-001",
      "historical_on_time_rate": 0.94
    }
  }
}
```

支付失败错误（可恢复）：

```json
{
  "error": {
    "code": "PAYMENT_DECLINED",
    "message": "支付被拒绝：买方账户余额不足",
    "recoverable": true,
    "recovery_actions": [
      {
        "action": "utp.pay.switch-method",
        "description": "切换支付方式",
        "default_input": {
          "available_methods": ["credit_line", "escrow", "term"]
        },
        "agent_hint": "买方企业信用额度充足（¥500,000），建议优先切换至信用支付",
        "priority": 1
      },
      {
        "action": "utp.pay.request-extension",
        "description": "向卖方申请延期付款",
        "default_input": {
          "proposed_extension_days": 7
        },
        "agent_hint": "若信用支付不可用，可申请 7 天延期",
        "priority": 2
      }
    ],
    "compensation_log_ref": "bundle-20260715-002",
    "details": {
      "payment_amount": 85000.00,
      "currency": "CNY",
      "declined_reason": "INSUFFICIENT_BALANCE",
      "available_credit_line": 500000.00
    }
  }
}
```

不可恢复错误：

```json
{
  "error": {
    "code": "TOPOLOGY_CORRUPTED",
    "message": "交易拓扑完整性校验失败：topology_hash 不匹配",
    "recoverable": false,
    "recovery_actions": [],
    "compensation_log_ref": "bundle-20260715-003",
    "details": {
      "expected_hash": "sha256:a1b2c3...",
      "actual_hash": "sha256:d4e5f6...",
      "session_id": "utp-session-abc123"
    },
    "reference": "https://utp.dev/docs/errors/TOPOLOGY_CORRUPTED"
  }
}
```

---

## 19.3 幂等性与重试 {#s-19-3}
### 19.3.1 幂等键机制 {#s-19-3-1}
UTP 协议的所有写操作（所有会变更状态或产生副作用的 Action）MUST 支持幂等键（Idempotency Key）。幂等机制用于解决 Agent 在超时、中断、任务恢复或并发调用后"不知道上一次是否成功"的问题：Agent 可以用同一个 `idempotency_key` 安全重试同一业务意图，协议引擎 MUST 保证不重复产生下单、支付、退款、库存锁定等业务副作用。

幂等相关字段按位置分层：Action Object 声明幂等策略，请求携带具体幂等键，响应 SHOULD 返回幂等处理结果。幂等机制是协议级 MUST；响应中的幂等状态是 Agent 友好审计信息，SHOULD 返回但不是所有成功响应的 MUST。

| 位置 | 字段 | 必填等级 | 描述 |
|----|----|----|----|
| `valid_next_actions[].idempotency` | IdempotencyPolicy | MUST for write actions | 对象存在即表示该 Action 要求幂等键，MAY 通过 `key_scope` 声明判重作用域（重复请求行为与 TTL 由协议内定，见 §19.3.2 与下方说明） |
| 请求体顶层（P0 请求骨架） | `idempotency_key` | MUST for write actions | 由调用方为本次业务意图生成的唯一标识，格式为 UUID v4 或符合 RFC 4122 的变体 |
| 响应体顶层（响应信封，见 §19.1.2） | `idempotency` | SHOULD | 说明本次响应是首次执行结果还是重复请求命中结果；用于审计、解释和停止无意义重试 |
| 只读请求 / 只读响应 | N/A | MAY | 不改变状态的查询通常不需要幂等键 |

`IdempotencyPolicy` 结构如下。该对象的**存在本身**即为幂等要求声明：会变更状态或产生副作用的 Action MUST 携带该对象（MAY 为空对象 `{}`），只读 Action MAY 省略。重复请求行为由 §19.3.2 统一定义，TTL 由协议内定（见下方说明），二者 MUST NOT 由 Action 逐个声明。

| 字段名 | 类型 | 必填等级 | 描述 |
|----|----|----|----|
| `key_scope` | string | SHOULD | 幂等键判重作用域，由 `+` 连接的维度组合（如 `session+action+item`），声明服务端判重时参与组合的维度；省略时仅以 `idempotency_key` 本身判重 |

> **TTL 由协议内定**：幂等键有效期统一为 **24 小时**，写入 Appendix 术语表。协议不允许实现方自选 `idempotency_expires_at`——否则一方认为过期、另一方认为仍有效，跨方语义会漂移。

### 19.3.2 幂等行为规则 {#s-19-3-2}
1.  **首次请求**：协议引擎 MUST 记录 `idempotency_key` 与规范化请求内容的 SHA-256 哈希。
2.  **重复请求（内容一致）**：协议引擎 MUST 返回首次执行产生的规范业务响应，MUST NOT 再次执行业务副作用。响应不应暴露实现细节为"缓存结果"，而应仍然是标准 UTP 响应。
3.  **重复请求（内容不一致）**：协议引擎 MUST 返回 `IDEMPOTENCY_CONFLICT` 错误，表明同一幂等键被用于不同的请求内容。
4.  **过期清理**：幂等键过期后，协议引擎 MAY 清除相关记录。

下例展示 Agent 执行下单 Action。Action 本身已经在 `valid_next_actions[]` 中携带 `idempotency` 声明，因此 Agent 在执行请求中携带 `idempotency_key`：

```json
{
  "action": "utp.purchase.create",
  "session_id": "utp-session-abc123",
  "idempotency_key": "550e8400-e29b-41d4-a716-446655440000",
  "input": {
    "line_items": [
      { "item_id": "item-001", "quantity": 100, "unit_price": 50.00 }
    ]
  }
}
```

首次执行成功时，服务端返回标准 UTP 响应。响应中的 `idempotency` 为 SHOULD，用于告诉 Agent 这是首次执行结果：

```json
{
  "session_id": "utp-session-abc123",
  "response_id": "resp-order-create-001",
  "action": "utp.purchase.create",
  "state": "PURCHASING",
  "state_version": 1,
  "server_time": "2026-07-15T10:30:00Z",
  "mode_ref": {
    "snapshot_id": "mode-utp-session-abc123-v1",
    "version": 1,
    "digest": "sha256:modehash..."
  },
  "topology_ref": {
    "snapshot_id": "topo-utp-session-abc123-v1",
    "version": 1,
    "digest": "sha256:topohash..."
  },
  "action_matrix_ref": {
    "snapshot_id": "actmx-utp-session-abc123-v1",
    "version": 1,
    "digest": "sha256:actmxhash..."
  },
  "output": {
    "purchase_id": "purchase-20260715-001",
    "purchase_status": "draft",
    "terms_snapshot": {
      "total": 5000.00,
      "currency": "CNY"
    }
  },
  "idempotency": {
    "status": "applied",
    "key": "550e8400-e29b-41d4-a716-446655440000"
  },
  "error": null
}
```

若 Agent 因超时或任务恢复使用相同 `idempotency_key` 重试，协议引擎 MUST 返回首次执行产生的同一业务结果，并 SHOULD 标记 `status=duplicate`。Agent 可据此确认没有重复下单，并停止继续重试：

```json
{
  "session_id": "utp-session-abc123",
  "response_id": "resp-order-create-002",
  "action": "utp.purchase.create",
  "state": "PURCHASING",
  "state_version": 1,
  "server_time": "2026-07-15T10:31:00Z",
  "mode_ref": {
    "snapshot_id": "mode-utp-session-abc123-v1",
    "version": 1,
    "digest": "sha256:modehash..."
  },
  "topology_ref": {
    "snapshot_id": "topo-utp-session-abc123-v1",
    "version": 1,
    "digest": "sha256:topohash..."
  },
  "action_matrix_ref": {
    "snapshot_id": "actmx-utp-session-abc123-v1",
    "version": 1,
    "digest": "sha256:actmxhash..."
  },
  "output": {
    "purchase_id": "purchase-20260715-001",
    "purchase_status": "draft",
    "terms_snapshot": {
      "total": 5000.00,
      "currency": "CNY"
    }
  },
  "idempotency": {
    "status": "duplicate",
    "key": "550e8400-e29b-41d4-a716-446655440000",
    "original_response_id": "resp-order-create-001",
    "original_request_at": "2026-07-15T10:30:00Z"
  },
  "error": null
}
```

### 19.3.3 重试规则 {#s-19-3-3}
重试规则以 UTP 结构化错误语义为准，而不是以传输层状态码为准。协议只定义"是否可重试"、"是否必须使用相同幂等键"与"服务端节流提示"三项跨方契约；具体退避算法、最大次数和抖动策略属客户端 Agent 策略，不进协议核心。HTTP 4xx/5xx 等状态码仅是具体传输绑定的映射结果，不能替代 `error.retryable` 与 `error.recovery_actions`。

| 字段名 | 类型 | 必填等级 | 描述 |
|----|----|----|----|
| `error.retryable` | boolean | MUST | "相同请求以相同 `idempotency_key` 再次发送可能成功"；与 `error.recoverable` 语义有交集但侧重不同，后者表示"存在恢复路径（不一定是重试）" |
| `error.retry_after` | integer | SHOULD when retryable | 服务端建议等待时间（秒），即 P0 [§10.4.3](/documentation/specification/protocol-core/primitive-framework.html#s-1043-standard-error-response) 定义的 `retry_after` 字段，语义对齐 RFC 7231 `Retry-After`；客户端 Agent 可根据自身可靠性预算决定是否遵守 |
| `error.recovery_actions[]` | Action\[\] | SHOULD when retryable | 当推荐的恢复方式是重试时，SHOULD 包含 `retry` 动作，并通过 `default_input.idempotency_key = "SAME_KEY"` 或等价表达提示 Agent 使用相同幂等键 |

> **已移出核心的字段**：`max_retries` 与 `backoff_strategy`（如 `exponential` / `linear` / `fixed`）属客户端策略。买方 Agent 可以激进（指数退避 + 抖动），卖方 Agent 可以保守（固定间隔），两者不需要协议对齐，因此不在协议核心中定义。实现方如需向对端表达策略偏好，可通过 `extensions` 命名空间挂载。

重试决策规则：

1.  **`error.retryable=true`**：Agent MAY 重试；若原请求是写操作或有副作用 Action，重试 MUST 携带相同 `idempotency_key`。
2.  **`error.retryable=false`**：Agent MUST NOT 对同一请求做盲重试；若 `error.recoverable=true`，MUST 改为执行 `recovery_actions` 中提供的恢复动作。
3.  **`TIMEOUT`**：Agent SHOULD 先查询 Action Result 或 Session 状态；若协议未提供查询入口，Agent MAY 使用相同 `idempotency_key` 重试同一请求。
4.  **`RATE_LIMITED` / `SERVICE_TEMPORARILY_UNAVAILABLE`**：若 `retryable=true`，Agent SHOULD 等待 `retry_after` 秒后重试。
5.  **`IDEMPOTENCY_CONFLICT`**：Agent MUST NOT 使用同一 `idempotency_key` 重试；该错误表示同一 key 被用于不同请求内容，必须刷新状态并重新建立业务意图。

```json
{
  "error": {
    "code": "SERVICE_TEMPORARILY_UNAVAILABLE",
    "message": "供应商 Agent 暂时不可用",
    "recoverable": true,
    "retryable": true,
    "retry_after": 5,
    "recovery_actions": [
      {
        "action": "retry",
        "description": "等待后重试相同操作",
        "default_input": {
          "idempotency_key": "SAME_KEY"
        }
      }
    ]
  }
}
```

---

## 19.4 Agent 友好设计原则（L4 要求） {#s-19-4}
### 19.4.1 L4 Agent 友好度定义 {#s-19-4-1}
UTP 协议要求实现方达到 L4 Agent 友好度。这里的 L4 不是指 Agent 可以无条件自动执行所有交易动作，而是指协议响应提供足够的结构化语义，使 Agent 能够在权限、风险、确认、幂等和恢复规则约束下安全行动。各等级定义如下：

| 等级 | 名称 | 特征 | 典型代表 |
|----|----|----|----|
| L0 | 无结构化 | 纯 HTML/文本，无 API | 传统网页 |
| L1 | 结构化接口 | RESTful API + JSON，但语义靠文档 | OpenAPI 规范 |
| L2 | 自描述 | 响应包含状态和可用操作 | HATEOAS |
| L3 | 语义契约 | 接口携带前置/后置条件 | Protocol-style |
| L4 | Agent 自主 | 自描述响应 + Action 语义契约 + 风险/确认 + 幂等重试 + 结构化恢复路径 | UTP |

### 19.4.2 L4 实现要求 {#s-19-4-2}
达到 L4 Agent 友好度，协议实现方 MUST 满足以下要求：

| 要求编号 | 要求描述 | 必要性 |
|----|----|----|
| L4-01 | 状态型响应 MUST 携带响应信封；关键节点响应（活跃 HAI 挂起 / error / 对账）MUST 内联 `valid_next_actions`；状态迁移响应 SHOULD 内联，稳态响应 MAY 用可解析的 `action_matrix_ref` 引用（详见 §19.1.3.1）。HAI 的 `§20.7.4 / §20.7.5` Cancel/Resume 响应同样属于状态迁移响应链的一环。 | 必须 |
| L4-02 | 错误响应 MUST 使用 P0 标准错误格式；当 `error.recoverable=true` 时，MUST 包含可执行的 `recovery_actions` | 必须 |
| L4-03 | 每个可执行 Action MUST 使用 §19.1.3.2 的 Action Object；其中 `description` 与执行入口 MUST 存在，`preconditions` / `postconditions` SHOULD 存在 | 必须 |
| L4-04 | 每个写操作或有副作用 Action MUST 声明幂等策略，执行请求 MUST 携带 `idempotency_key`（详见 §19.3） | 必须 |
| L4-05 | 涉及 Saga 或已产生副作用的失败 MUST 暴露补偿状态；若已执行补偿，MUST 通过 `compensation_log_ref` 或等价审计引用暴露链路 | 必须 |
| L4-06 | 涉及资金、合同、库存、履约、合规或不可逆后果的 Action MUST 携带 `risk`；需要用户或审批人确认时 MUST 携带 `confirmation.summary_for_human` | 必须 |
| L4-07 | 响应 SHOULD 包含 `warnings` 预告潜在问题（`type` 取自协议级 Warning Vocabulary） | 建议 |
| L4-08 | 每个 `recovery_actions[]` 项 SHOULD 内嵌 `agent_hint` 或等价说明，辅助 Agent 在多条恢复路径中选择 | 建议 |
| L4-09 | 协议实现方 MAY 提供操作推荐、排序或 `agent_hint`；推荐信息不得覆盖 `risk`、`confirmation`、`authorization` 等硬约束 | 可选 |

### 19.4.3 Agent 决策支持模式 {#s-19-4-3}
UTP 协议通过以下机制支持 Agent 自主决策：

**前置条件检查**：Agent 在执行任何动作前 SHOULD 校验 `preconditions` 中列出的条件。协议引擎在接收到请求后 MUST 做权威校验；如果前置条件不满足，MUST 返回结构化错误并在可恢复时提供 `recovery_actions`。

**后果预判**：Action Object SHOULD 包含 `postconditions` 摘要；涉及实质风险的 Action MUST 通过 `risk` 与 `confirmation` 表达后果和人工确认要求：

```json
{
  "action": "utp.purchase.complete",
  "postconditions": [
    {
      "type": "STATE_TRANSITION",
      "from": "PURCHASING",
      "to": "PAYING"
    },
    {
      "type": "INVENTORY_LOCK",
      "item_id": "item-001",
      "quantity": 1000
    }
  ],
  "risk": {
    "level": "HIGH",
    "financial_impact": {
      "amount": "85000.00",
      "currency": "CNY"
    },
    "reversible": false
  },
  "confirmation": {
    "required": true,
    "summary_for_human": "确认提交订单并锁定库存：1000 件 item-001，总金额 85,000.00 CNY。"
  }
}
```

**决策提示**：`agent_hint` 字段提供基于上下文的决策建议，不影响 Agent 的自主权，也不得覆盖风险、确认、权限和幂等约束：

```json
{
  "action": "utp.negotiate.binding",
  "agent_hint": "供应商 A 的报价 ¥48.5/件低于市场均价 ¥52/件（来源：行业价格指数 2026-Q3），建议接受。报价有效期剩余 4 小时。"
}
```

### 19.4.4 Profile 中的友好度声明 {#s-19-4-4}
本规范不在 UTPProfile 中定义友好度声明字段。L4 的各项"必须"要求（§19.4.2）均为本章各节的规范性要求，合规的 UTP 实现天然满足 L4，无需额外声明；实现方的能力边界通过 Profile 既有的能力声明（见[第 3 章 §3.3.2](/documentation/specification/protocol-core/discovery-negotiation.html#s-332)）与 HAI 会话能力声明（见[第 20 章 §20.10](/documentation/specification/protocol-core/human-agent-interaction.html#s-199)）表达。L0–L3 等级（§19.4.1）仅作为与现有行业接口形态对照的非规范性参照。
