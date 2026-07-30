---
title: 原语框架
section: protocol-core
owner: protocol-architecture
status: drafting
version: 2026-07-29
---

# 原语通用框架（Primitive Commons） {#s-10-primitive-commons}

## 总体设计原则（Design Principles） {#s-101-design-principles}

UTP 交易原语是协议层对交易基本动作的标准化封装。每个原语具备独立的状态生命周期与补偿边界，可在不同交易模式下组合使用。每个原语的规范定义包含以下六个要素：

| 要素 | 职责 | 说明 |
| --- | --- | --- |
| **identity** | 原语标识 | 原语唯一标识符与版本号 |
| **intent** | 业务意图 | 原语的业务目的，Agent 执行决策的语义依据 |
| **contract** | 语义契约 | 前置条件（preconditions）、后置条件（postconditions）、不变量（invariants） |
| **state_machine** | 状态机 | 原语内部状态定义与迁移规则 |
| **actions** | 操作集合 | 原语包含的操作及其请求、响应、副作用定义 |
| **compensation** | 补偿动作 | 各操作对应的幂等回滚动作，供 Saga 补偿链调用 |

---

## 原语规范格式（Specification Format） {#s-102-specification-format}

### 命名规范 {#s-1021-naming-conventions}

**标识命名规范：** UTP Profile 的 `utp.services` 是唯一服务配置数组，但原语与 Action 不以传输配置编码。它们使用独立的稳定协议标识：

```
Profile 传输配置: utp.services[]
Primitive:        utp.{primitive}
Action:           utp.{primitive}.{action}
```

`utp.services` 只提供本次投递可选的传输配置，不是 Primitive、扩展或 Action 的前缀，也不得由 Action 标识推导。Action 的所属 Primitive 或扩展必须在已协商的 Primitive ID 与扩展包名中执行最长匹配后确定；扩展 Action 的宿主 Primitive 再由扩展定义中的 `extends` 确定。`transport_bindings` 只声明与 Profile 传输配置组合时所需的 REST path、MCP Tool、A2A Task 或 Embedded SDK 投影。

示例：`utp.source.search`、`utp.negotiate.inquiry`、`utp.purchase.create`。

### 语义契约格式 {#s-1022-contract-format}

语义契约（contract）由以下三部分构成：

| 字段 | 含义 | 示例 |
| --- | --- | --- |
| **preconditions** | 原语激活的前提条件 | 全局状态机处于 SOURCING 阶段 |
| **postconditions** | 原语完成后成立的结果断言 | Action 结果已关联当前 trade_context_id，全局状态迁移至 NEGOTIATING |
| **invariants** | 原语执行全程保持的约束 | 同一预交易上下文中的 trade_context_id 保持不变 |

### 操作定义格式 {#s-1023-action-definition-format}

每个 Action（操作）的规范定义应聚焦操作语义，而不是重复展开完整业务样例。原语章节 MUST 为每个 Action 使用独立的操作说明块，依次说明角色绑定、执行说明、适用状态、状态影响、可暴露的 `valid_next_actions` 与关键约束；不得将这些信息压缩进宽表。具体请求/响应中的业务字段由对应实体定义和用例演练承载。

**角色绑定：** 每个 Action MUST 恰好声明一个 `initiator_role`（发起角色）和一个 `handler_role`（处理角色）。两者均必须是[标准角色](/documentation/specification/protocol-core/business-topology.html#s-922-standard-roles)或按[领域扩展角色规则](/documentation/specification/protocol-core/business-topology.html#s-925-r3)登记的角色。若不同角色需要发起相近业务，或需要由不同角色处理相近业务，协议 MUST 使用不同 Action，而不得在同一 Action 中声明多个发起角色、多个处理角色或多组角色对。运行时参与方必须按已锁定拓扑将该唯一角色对解析为具体主体。

**执行说明：** 应说明发起角色为何触发该 Action、处理角色必须完成的协议处理或校验，以及成功执行后产生的业务结果。执行说明不重复请求/响应字段、传输端点或实体细节。

所有原语操作共享下列请求体骨架：

```json
{
  "action": "utp.{primitive}.{action}",
  "session_id": "utp-session-20260715-001",
  "idempotency_key": "optional-idempotency-key",
  "input": {
    "...": "action-specific input fields"
  }
}
```

该对象是跨传输的唯一 ActionRequest 业务契约；MessageEnvelope 在跨进程或跨网络投递时 MUST 将其作为完整 `payload` 携带，不得在信封顶层重复其中的业务字段。

| 字段 | 类型 | 必需？ | 说明 |
| --- | --- | --- | --- |
| `action` | string | MUST | 完整操作标识，格式为 `utp.{primitive}.{action}`；扩展包新增 Action 使用 `{extension_package_name}.{action}`。 |
| `session_id` | string | MUST | 当前协议会话标识，用于关联原语内状态和上下文。 |
| `idempotency_key` | string | 写操作 MUST | 幂等键。对产生副作用的写操作 MUST 提供，只读操作 MAY 省略；键格式与幂等行为的完整规则见[幂等性规则](/documentation/specification/protocol-core/agent-friendly-interface.html#s-183)。 |
| `input` | object | MUST | 操作特有输入。字段由所属原语的实体定义、Mode 约束和具体操作语义决定。 |

所有原语操作共享下列响应体骨架：

```json
{
  "action": "utp.{primitive}.{action}",
  "session_id": "utp-session-20260715-001",
  "idempotency_key": "optional-idempotency-key",
  "primitive_state": "NEXT_INTERNAL_STATE",
  "execution_result": "SUCCESS",
  "output": {
    "...": "action-specific output fields"
  },
  "valid_next_actions": ["utp.{primitive}.{next_action}"]
}
```

在启用执行编排和约束的会话中，响应 MUST 携带 `execution_result` 与 `valid_next_actions`；`primitive_state` 按实际处理结果返回。没有后续操作时，`valid_next_actions` MUST 返回空数组。其他会话仍可按本节字段的适用条件返回。

| 字段 | 类型 | 必需？ | 说明 |
| --- | --- | --- | --- |
| `action` | string | MUST | 本次响应对应的操作标识。 |
| `session_id` | string | MUST | 当前协议会话标识。 |
| `idempotency_key` | string | MAY | 对请求中携带的幂等键原样回显，用于关联重试请求及其响应。 |
| `primitive_state` | string | 按执行结果 | 操作完成后的原语内部状态。该字段不表示全局 StateView。 |
| `execution_result` | enum | 执行编排和约束场景 MUST；其他场景 MAY | 本次 Action 的执行结果。取值为 `SUCCESS`、`REJECTED` 或 `FAILURE`；该字段不表示全局状态机是否迁移。 |
| `output` | object | MUST | 操作特有输出。字段由所属原语的实体定义和当前 Mode 决定。 |
| `valid_next_actions` | string[] | 执行编排和约束场景 MUST；其他场景按需 | 当前响应可继续执行的后续操作。数组元素 MUST 使用完整 Action 名称，例如 `utp.pay.initiate`；无后续操作时返回空数组。 |

`execution_result` 的取值语义如下：

| 取值 | 含义 |
| --- | --- |
| `SUCCESS` | 本次 Action 已完成。原语是否仍处于可继续操作的业务状态，由 `primitive_state` 表示。 |
| `REJECTED` | 本次 Action 未被执行方受理，例如输入、权限、资源或原语内部前置条件不满足。执行方未产生该 Action 的业务副作用。 |
| `FAILURE` | 本次 Action 已进入执行，但未形成预期的业务结果；失败原因及可恢复信息按本节和 10.4 的错误框架在 `output` 或 `error` 中表达。 |

本响应骨架是 Agent 响应信封的**子集**：信封在骨架之上增加 `response_id`、`state_version`、`server_time`、`mode_ref` / `topology_ref`、`error` 等自描述字段。面向 Agent 的动作展示、自然语言说明和输入提示由 Agent 友好接口统一定义。

### valid_next_actions 约定 {#s-1024-valid-next-actions}

`valid_next_actions` 是 Action Response 的后续操作声明。数组元素为完整 Action 名称；本节规定其原语响应中的编码和返回要求。

原语响应一旦携带 `valid_next_actions`，MUST 使用 `string[]`，且每个元素 MUST 是完整 Action 名称；MUST NOT 使用相对操作名。原语章节中的操作说明块可继续以相对操作名说明业务流程，但该表述不是运行时响应字段的编码定义。

### 状态命名规范 {#s-1025-state-naming}

状态命名采用大写字母与下划线（UPPER_SNAKE_CASE）。协议定义下列通用状态，各原语在语义相符时沿用同名状态：

| 状态 | 含义 | 说明 |
| --- | --- | --- |
| `INIT` | 初始状态 | 原语刚被激活，尚未执行任何操作 |
| `PROCESSING` | 处理中 | 操作正在执行，等待结果 |
| `COMPLETED` | 已完成 | 原语成功完成，产出凭证 |
| `FAILED` | 已失败 | 原语执行失败且无法通过重试恢复 |
| `COMPENSATED` | 已补偿 | 原语已通过 Saga 补偿链成功回滚 |
| `SKIPPED` | 已跳过 | 原语因 Mode 配置被驱动跳过，为不可逆终态 |

`SKIPPED` 为不可逆终态，被跳过的原语不再参与后续流程。

### 原语声明 {#s-1026-primitive-declaration-schema}

能力发现中的 Profile 通过原语声明表明端点支持某个核心原语版本。声明某个原语版本，即表示支持该版本定义的完整核心操作集合；Profile MUST NOT 逐项裁剪或枚举核心操作。用户授权是否为该原语的预先条件由能力提供方在此声明中配置，不属于原语的固有语义。

```json
{
  "schema": "https://schemas.utp.dev/primitives/purchase/2026-07-01.json",
  "version": "2026-07-01",
  "extensions": [],
  "authorization": {
    "scope": "merchant.purchase",
    "required": true
  },
  "actions": {
    "complete": {
      "hai": {
        "interaction_level": "CONFIRMED"
      },
      "mandate": "checkout"
    }
  }
}
```

| 字段 | 约束 | 说明 |
| --- | --- | --- |
| `schema` | MUST | 可访问的核心原语定义文件 URL。URL 固定该原语契约版本；Profile 中的原语声明键仍用于标识原语名称。 |
| `version` | MUST | 实现方支持的最高兼容核心原语版本，必须与 `schema` 所指定义文件一致。 |
| `extensions` | MAY | 支持的扩展包声明数组，详见扩展能力声明。 |
| `authorization` | MAY | 能力提供方的用户授权要求。缺省表示不声明预先授权要求；存在时必须包含稳定的 `scope` 名称与 `required` 标记。 |
| `actions` | MAY | 对完整核心 Action 集合的逐项特殊声明；MUST NOT 用于裁剪核心 Action。键为相对 Action 名，值可声明 `hai` 与 `mandate`。 |
| `actions.{action}.hai` | MAY | 该 Action 的人机协同控制声明；存在时 MUST 包含 `interaction_level`，取值与执行语义见[人机协同交互控制](/documentation/specification/protocol-core/human-agent-interaction.html#s-19-1-2)。省略时视为 `AUTONOMOUS`。 |
| `actions.{action}.mandate` | MAY | 该 Action 所需的 Mandate 类型。取值为 `checkout`、`payment` 或 `operation`；存在时该 Action MUST 携带可验证的对应 Mandate，完整协商、签名与验证规则见[身份与授权](/documentation/specification/protocol-core/identity-authorization.html)。 |

`authorization.required=true` 表示调用方 MUST 在执行该原语前取得 `authorization.scope`；`false` 表示原语允许未授权访问，但能力提供方 MAY 在具体资源、角色或风控条件不满足时返回结构化授权挑战。运行时挑战 MUST 引用已声明的 `scope`，不得临时引入 Profile 未声明的新 scope。角色、组织、资源归属、字段可见性和风控规则由能力提供方控制，不定义为 UTP 固定 Scope。

`actions` 只补充能力提供方对特定 Action 的控制要求，不改变核心原语定义文件中的请求、响应、传输绑定或业务语义。`hai` 与 `mandate` 可同时存在：前者决定 Agent 的执行门，后者决定该 Action 是否必须携带经签名验证的 Mandate；二者相互独立。

### 核心原语 Schema 标准 {#s-1027-primitive-schema-standard}

原语声明中的 `schema` MUST 解析为**核心原语定义文件**。该文件是机器读取原语接口的入口，必须定义完整核心 Action 集合、各 Action 的请求/响应 Schema URL、传输绑定及状态机 Schema URL。URL 本身固定所引用文件的版本；请求、响应与状态机文件各自独立演进。

```json
{
  "name": "utp.source",
  "version": "2026-07-01",
  "actions": {
    "search": {
      "initiator_role": "Buyer",
      "handler_role": "Seller",
      "input_schema": "https://schemas.utp.dev/primitives/source/search-request/2026-07-01.json",
      "output_schema": "https://schemas.utp.dev/primitives/source/search-response/2026-07-01.json",
      "transport_bindings": [{
        "type": "rest",
        "method": "POST",
        "path": "/utp/source/search"
      }]
    }
  },
  "state_machine": "https://schemas.utp.dev/primitives/source/state-machine/2026-07-01.json"
}
```

| 字段 | 约束 | 说明 |
| --- | --- | --- |
| `name` | MUST | 完整 Primitive ID，格式为 `utp.{primitive}`，供机器与开发者识别。 |
| `version` | MUST | 原语版本，必须与 Profile 原语声明的 `version` 一致。 |
| `actions` | MUST | 该版本完整核心 Action 集合。每项 MUST 定义单值 `initiator_role`、`handler_role`、`input_schema`、`output_schema` URL，以及至少一个 `transport_bindings`。 |
| `state_machine` | MUST | 可访问的状态机定义文件 URL。 |

核心原语定义文件只描述稳定的接口契约，不包含实体清单、错误码或能力提供方的授权策略；状态机语义由其引用文件定义，授权策略由 Profile 原语声明中的 `authorization` 提供。Action 的 `initiator_role` 与 `handler_role` 定义静态职责，不直接填写具体 Agent 或 Endpoint；具体主体由拓扑与握手结果绑定。UTP 官方核心原语定义文件的 URL MUST 使用 `https://schemas.utp.dev/primitives/{primitive}/{version}.json`。可复用实体模型的 URL MUST 使用 `https://schemas.utp.dev/entities/{entity}/{version}.json`；生态扩展使用其受控域名下的等价路径，并在扩展声明中给出权威 URL。


## 协议行为约定（Protocol Behavior Conventions） {#s-103-protocol-behavior-conventions}

### trade_context_id 与 transaction_id 生成规则 {#s-1031-transaction-id}

UTP 使用两个不同作用域的协议标识符。`trade_context_id` 是 INIT、SOURCING 与 NEGOTIATING 阶段的交易上下文锚点；`transaction_id` 是从 PURCHASING 开始的一笔可独立成败、支付、履约、取消和争议的交易生命周期锚点。两者的生成规则以[标识符生成规则](/documentation/specification/protocol-core/global-state-machine.html#s-1715)为权威定义。

| 标识符 | 生成时机 | 生成责任 | 作用域 |
| --- | --- | --- | --- |
| `trade_context_id` | 应用层确认新的商业意图，路径编排生成 DAG 并锁定各角色的业务目标（不含传输 Service 或 Endpoint）后 | 路径编排调用 UTP SDK 的上下文创建代码 | INIT、SOURCING、NEGOTIATING |
| `transaction_id` | `purchase.create` 的标准成功响应被 `evaluate_result` 接受后 | `evaluate_result` 调用 UTP SDK 的交易 ID 生成代码，为 P3 确认的每个独立交易边界分别生成 | PURCHASING 及后续交易级状态 |

```
trade_context_id = "utp-ctx-" uuid_v4
transaction_id   = "utp-txn-" uuid_v4
```

UUID 后缀 MUST 使用 RFC 9562 定义的 UUID v4 小写标准文本，并由密码学安全随机源生成。Source 与 Negotiate 属于预交易阶段，MUST 使用 `trade_context_id`，MUST NOT 生成或携带 `transaction_id`。`purchase.create` 请求也 MUST NOT 预先携带 `transaction_id`；P3 Endpoint 的标准响应只确认一个或多个独立交易边界。只有 `evaluate_result` 接受该响应并得到 `CREATE_TRANSACTIONS` 后，才为每个边界生成 `transaction_id`，并与首份 PURCHASING StateView 作为同一个幂等结果保存。

一个 `trade_context_id` MAY 派生多个 `transaction_id`。每个 `transaction_id` 一经生成，在对应交易的所有后续原语中保持不变；重复处理同一 `purchase.create` 成功结果时 MUST 返回首次保存的 ID 与 StateView，不得重新生成。

### 幂等性要求 {#s-1032-idempotency}

产生副作用的写操作（创建、修改、删除等）MUST 携带 `idempotency_key`，携带相同幂等键的重复请求返回相同结果、不产生额外副作用；只读操作 MAY 省略。

幂等机制的完整规则——键格式、有效期、内容判重与 `IDEMPOTENCY_CONFLICT` 冲突行为——由[幂等性规则](/documentation/specification/protocol-core/agent-friendly-interface.html#s-183)统一定义，本节不再重复。

### 分页约定 {#s-1033-pagination}

列表操作使用 [`Pagination`](https://schemas.utp.dev/primitives/common/pagination.json) 传递分页参数与响应元数据。请求携带 `page` 与 `page_size`；响应在此基础上返回 `total`。

---

## 错误码框架（Error Code Framework） {#s-104-error-code-framework}

### 错误码格式 {#s-1041-error-code-format}

UTP 协议采用统一的错误码格式，按来源分为两种形态：

```
{PRIMITIVE}.{ACTION}.{DETAIL}   // 原语特有错误（三段式）
UTP.{CATEGORY}_{DETAIL}         // 全局通用错误（两段式）
```

- **PRIMITIVE**：原语名称（如 `SOURCE`、`NEGOTIATE`、`PURCHASE`），表示原语特有错误。
- **ACTION**：触发错误的操作或子域（如 `SEARCH`、`CREATE`、`QUOTE`）。跨操作的通用错误 MAY 省略该段，退化为 `{PRIMITIVE}.{DETAIL}`。
- **DETAIL**：错误的具体描述标识符。
- **CATEGORY**：全局错误类别（见 10.4.2）。全局通用错误无操作维度，统一使用 `UTP.{CATEGORY}_{DETAIL}` 两段式。

示例：`SOURCE.SEARCH.RATE_LIMITED`、`NEGOTIATE.QUOTE.TIMEOUT`、`PURCHASE.CREATE.PRICE_CHANGED`、`UTP.INVALID_PARAM_FORMAT`。

### 全局错误类别 {#s-1042-global-error-categories}

下列错误类别适用于所有原语，其语义由本章统一定义。

| 类别 | 前缀 | 含义 | 建议处理 |
| --- | --- | --- | --- |
| 请求无效 | `UTP.INVALID_*` | 请求参数格式或语义错误 | 修正参数后重试 |
| 权限不足 | `UTP.AUTH_FORBIDDEN` | 调用方权限不足 | 检查角色/Scope 授权 |
| 身份未验证 | `UTP.AUTH_UNAUTHORIZED` | 身份凭证无效或缺失 | 完成身份验证 |
| 超时 | `UTP.TIMEOUT` | 操作执行超时 | 使用指数退避重试 |
| 服务不可用 | `UTP.UNAVAILABLE_*` | 服务暂时不可达 | 跳过或延迟重试 |
| 资源冲突 | `UTP.CONFLICT_*` | 资源状态冲突 | 解决冲突后重试 |
| 限流 | `UTP.RATE_LIMITED` | 请求频率超出限制 | 按 `Retry-After` 等待 |

### 标准错误响应格式 {#s-1043-standard-error-response}

UTP 错误响应采用统一的 JSON 结构：

```json
{
  "error": {
    "code": "UTP.INVALID_PARAM_FORMAT",
    "severity": "error",
    "message": "Parameter 'quantity' must be a positive integer.",
    "details": {
      "field": "quantity",
      "provided_value": "-5",
      "expected": "positive integer"
    },
    "retryable": false,
    "retry_after": null,
    "request_id": "req-abc123-def456",
    "timestamp": "2026-07-04T10:30:00Z"
  }
}
```

| 字段 | 类型 | 必需？ | 描述 |
| --- | --- | --- | --- |
| `code` | string | MUST | 结构化错误码，遵循 `{SCOPE}.{CATEGORY}_{DETAIL}` 格式。 |
| `severity` | string | MUST | 严重级别。有效值：`"error"`、`"warning"`、`"info"`。 |
| `message` | string | MUST | 人类可读的错误描述，通常为英文。 |
| `details` | object | SHOULD | 错误的附加上下文信息（键值对）。 |
| `retryable` | boolean | MUST | 该错误是否可通过重试解决。 |
| `retry_after` | integer | SHOULD（当 `retryable == true`） | 建议重试等待秒数。 |
| `request_id` | string | MUST | 原始请求的标识符，用于问题追踪。 |
| `timestamp` | datetime | MUST | 错误发生时间（ISO 8601，UTC）。 |

面向 Agent 的错误恢复语义（`recoverable`、`recovery_actions`、`compensation_log_ref` 等字段）叠加在本结构之上，由[错误恢复语义](/documentation/specification/protocol-core/agent-friendly-interface.html#s-182)定义。

### 原语特有错误 {#s-1044-primitive-specific-errors}

原语特有错误码以原语名称（大写）作为 SCOPE，仅覆盖该原语专有的错误，不重复全局错误码。例如：

- `SOURCE.SEARCH.INVALID_QUERY` — Source 原语特有
- `NEGOTIATE.COUNTER_LIMIT_EXCEEDED` — Negotiate 原语特有
- `PURCHASE.STOCK_INSUFFICIENT` — Purchase 原语特有

**非错误结果约定：** 业务可预期但未达成目标的结果（如反报价被拒绝、报价锁定已释放）MUST 通过正常响应的 `execution_result = SUCCESS`、`output.status` 与 `valid_next_actions` 表达；原语因 Mode 被跳过等生命周期通知 MUST 使用状态或事件表达。此类结果 MUST NOT 编码为错误响应。

---

## 原语扩展规范（Primitive Extension Specification） {#s-105-extension-spec}

原语扩展以扩展包（Extension Package）为唯一声明和协商单元。扩展包不构成新的原语，而是在宿主原语上新增 Action，或通过 Schema 叠加增强既有 Action 使用的核心实体。各扩展的具体能力由其定义文件描述。

### 扩展概念与边界 {#s-1051-extension-definition}

扩展与核心原语的区别如下：

| 判定维度 | 核心原语 | 扩展包 |
| --- | --- | --- |
| 交易意图 | 具备独立的交易意图 | 无独立意图，服务于宿主原语 |
| transaction_id | 预交易原语省略；P3 成功结果被状态机接受后由路径编排生成，交易级原语携带 | 不独立生成，复用宿主当前的 `trade_context_id` 或 `transaction_id` |
| 状态机 | 拥有独立主干 | 仅在新增 Action 时增补宿主状态分支 |
| 默认启用 | 是 | 否，按需声明启用 |

扩展包 MUST NOT 改写核心 Action 的名称、语义、既有字段含义或核心状态迁移；MUST NOT 生成独立的 `transaction_id` 或引入脱离宿主的独立终态。Schema 叠加只增加可选字段或更具体的子实体约束。

### 扩展命名 {#s-1052-extension-naming}

官方扩展包名采用 `utp.{primitive}_{extension-domain}`，例如 `utp.source_cart`、`utp.purchase_service`。`_` 仅用于分隔宿主原语与扩展域；`primitive` 与 `extension-domain` 均 MUST 使用全小写 kebab-case，MUST NOT 包含 `_`。生态扩展 MUST 使用其受控反向域名，例如 `com.example.utp.purchase_warranty`；不得使用保留的 `utp` 官方前缀。

核心 Action 标识采用 `utp.{primitive}.{action}`；扩展 Action 标识采用 `utp.{primitive}_{extension-domain}.{action}`。`action` MUST 使用全小写 kebab-case，MUST NOT 包含 `_`。例如核心 Action `utp.negotiate.counter-offer`，以及扩展 Action `utp.source_cart.add`、`utp.source_cart.query`。`extension-domain` 在同一宿主原语下 MUST 唯一。

实体 Schema 叠加时，新增字段直接写入被增强实体，不使用通用 `extensions` 容器。扩展包 MUST 通过受控注册或双方协商确保同一目标实体上的新增字段名不冲突。

### 原语声明中的扩展能力 {#s-1053-extension-declaration}

Profile 在原语声明的 `extensions` 中声明扩展包。每个声明包含扩展包全局名称、可访问的定义文件 URL 和最高兼容版本；`schema` 用于获取定义，`version` 用于双方选择共同可理解的最高版本。Profile MUST NOT 枚举或裁剪扩展内的具体 Action、实体或字段，也 MUST NOT 在扩展声明中配置独立授权要求。

```json
{
  "schema": "https://schemas.utp.dev/primitives/source/2026-07-01.json",
  "authorization": {
    "scope": "merchant.source",
    "required": false
  },
  "extensions": [{
    "name": "utp.source_cart",
    "version": "2026-07-01",
    "schema": "https://schemas.utp.dev/extensions/source/cart/2026-07-01.json"
  }]
}
```

| 字段 | 约束 | 说明 |
| --- | --- | --- |
| `extensions` | MAY | 支持的扩展包声明数组。 |
| `name` | MUST | 扩展包的全局唯一名称，符合 10.5.2。 |
| `version` | MUST | 实现方支持的最高兼容扩展版本，必须与 `schema` 所指定义文件一致。 |
| `schema` | MUST | 可访问的扩展定义文件 URL。 |

扩展不单独声明授权。若扩展中的操作或资源存在按需授权要求，能力提供方 MUST 在宿主原语的 `authorization` 中以 `required=false` 预先声明稳定 scope；运行时仅在受限条件实际触发时返回引用该 scope 的结构化授权错误。

### 新增 Action {#s-1054-operation-extension}

- **扩展定义**

扩展包只有在需要新增操作路径时才声明 `actions`。新增 Action 与核心 Action 具有相同的请求、响应、传输绑定和状态影响定义；仅当扩展已共同协商且当前状态、访问策略与对象条件均满足时，才可出现在 `valid_next_actions` 中。

新增 Action 与核心 Action 在协议层地位一致：同样具备请求、响应、副作用与补偿定义。已发布核心 Action 的语义、状态影响、错误语义和既有字段含义 MUST NOT 改变。

- **对状态机影响**

新增 Action MAY 对宿主状态机追加扩展专有状态和迁移。宿主基础状态机的既有状态与迁移在扩展启用后依然有效；未启用扩展时，基础状态机必须独立完整。扩展追加的路径最终 MUST 回到宿主状态机，不形成脱离宿主的独立终态。

```
基础状态机：  S1 ──▶ S2 ──▶ … ──▶ 终态
                     │       ▲
            追加迁移  │       │  追加迁移
                     ▼       │
                 ┌───────────────┐
                 │    扩展状态     │
                 └───────────────┘
```

- **扩展定义文件**

扩展定义文件 MUST 定义 `name`、`extends`、可选的 `entities` 与可选的 `actions`。Action 键为动作名，其完整标识由扩展包名自动组合；每项 Action MUST 给出单值 `initiator_role`、`handler_role`、请求/响应 Schema URL、至少一种传输绑定及状态影响。传输绑定只定义同一语义 Action 在不同传输中的调用投影，不改变其语义。

```json
{
  "name": "utp.source_cart",
  "extends": "utp.source",
  "version": "2026-07-01",
  "entities": {
    "cart": "https://schemas.utp.dev/extensions/source/cart/2026-07-01/cart.schema.json"
  },
  "actions": {
    "add": {
      "initiator_role": "Buyer",
      "handler_role": "Seller",
      "input_schema": "https://schemas.utp.dev/extensions/source/cart/2026-07-01/add-request.schema.json",
      "output_schema": "https://schemas.utp.dev/extensions/source/cart/2026-07-01/add-response.schema.json",
      "transport_bindings": {
        "rest": { "method": "POST", "path": "/utp/v1/source/cart/items" },
        "mcp": { "tool": "utp_source_cart_add" },
        "a2a": { "skill": "utp:source:cart:add" }
      },
      "state_effect": { "from": ["DETAIL_VIEWING"], "to": "DETAIL_VIEWING" }
    }
  },
  "state_machine": "https://schemas.utp.dev/extensions/source/cart/2026-07-01/state-machine.json"
}
```

### 实体增补（Entity Augmentation） {#s-1055-entity-extension}

- **扩展定义**

无需新增操作路径时，扩展包仅在 `entities` 中指向增强后的核心实体 Schema。增强 Schema 使用 JSON Schema Draft 2020-12 的 `allOf` 引用核心实体，并只增加可选字段或将嵌套实体替换为其严格超集。核心字段 MUST NOT 被覆盖、删除、重定义或放宽约束。

- **对既有 Action 的影响**

核心 Action 已通过其请求和响应 Schema 引用核心实体。双方启用扩展后，该实体自动按扩展 Schema 组合，因此无需额外的 Action 绑定表。新增字段使用 `utp_request` 注解表明其在各 Action 请求中的要求：`required`、`optional` 或 `omit`；响应方向使用 JSON Schema 标准 `readOnly` 与 `writeOnly` 表达。

| Schema | 作用 | 示例 |
| --- | --- | --- |
| `https://schemas.utp.dev/entities/service/2026-07-01.json` | 可复用的服务数据模型 | 加工定制或交易保障服务。 |
| `https://schemas.utp.dev/extensions/purchase/service/2026-07-01/purchase.schema.json` | Purchase 的增强 Schema | 将服务字段叠加到 `Purchase` 或其嵌套 `LineItem`。 |

- **嵌套实体示例**

以下扩展为 `purchase.line_items` 的每个 `LineItem` 增加 `service` 字段。核心 `purchase.update` 不允许修改 `line_items`，因此该字段在 `update` 请求中标记为 `omit`；若业务需要创建后变更服务，扩展包必须新增专用 Action。

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$defs": {
    "service_line_item": {
      "allOf": [
        { "$ref": "https://schemas.utp.dev/primitives/purchase/2026-07-01/entities/line-item.schema.json" },
        { "type": "object", "properties": {
          "service": {
            "$ref": "https://schemas.utp.dev/entities/purchase-service/2026-07-01.json",
            "utp_request": { "create": "optional", "update": "omit", "complete": "omit", "query": "omit" }
          }
        }, "additionalProperties": true }
      ]
    }
  },
  "allOf": [
    { "$ref": "https://schemas.utp.dev/primitives/purchase/2026-07-01/entities/purchase.schema.json" },
    { "type": "object", "properties": {
      "line_items": { "type": "array", "items": { "$ref": "#/$defs/service_line_item" } }
    }, "additionalProperties": true }
  ]
}
```

### 版本协商与生效规则 {#s-1056-extension-versioning}

扩展包版本协商与会话生效遵循[按 RoleRelation 协商](/documentation/specification/protocol-core/discovery-negotiation.html#s-36)。扩展包作为已选原语版本的能力声明参与该关系的协商；双方必须在同一宿主原语版本下声明同名、兼容的扩展包，才可在当前会话生效。

高版本扩展 MUST 向下兼容同名扩展的低版本契约。Profile 中的 `version` 表示实现方支持的最高兼容版本；协商结果确定后，调用方 MUST NOT 发送仅在高于该版本中出现的数据或 Action，所选 `schema` URL MUST 指向对应定义文件。未共同支持的新增 Action 不得出现在 `valid_next_actions` 中；未共同支持的 Schema 叠加字段不得出现在请求或响应中，接收方 MUST NOT 静默忽略。

---
