---
title: 人机交互协同
section: protocol-core
owner: protocol-architecture
status: drafting
version: 2026-07-29
---

# 人机协同交互控制（Human-Agent Interaction Control） {#s-human-agent-interaction-control}

UTP 中，Agent 代理 Principal（人类委托人）经 Agent 接口调用业务原语推进交易。**人机协同交互控制**解决的不是界面体验问题，而是 Agent 交易中的**控制权边界**问题：哪些 Action 可由 Agent 自主推进，哪些 Action 必须保持 Principal 可观察、可中断，哪些 Action 必须等待 Principal 明确确认后再执行。协议以**执行门**（`interaction_level`）、**HAI 信封**与**挂起凭证**（`suspend_id`）约束上述边界：Agent 发起调用为默认路径；当执行门要求人工确认时，Agent 首次调用 MUST 返回 HAI 信封并挂起执行，代表 Principal 的 UTP Runtime 确认续跑 MUST 调用与该挂起绑定的 `suspended_action` 并携带对应 `suspend_id`（见 确认后续跑）。各 Action 的控制等级由**实现方**在其原语定义文件中静态声明。敏感数据 MUST NOT 进入 Agent 推理链路，关键交易事实 MUST 来自权威数据源，并在最终执行前完成一致性校验。

本章定义执行门、HAI 信封、挂起凭证（`suspend_id`）、数据可见性、权威数据读取、一致性校验及其与证据和安全要求的绑定关系。Mandate 范围、信任策略等分别由[认证与授权](identity-authorization.md)、[风控与审计](risk-audit.md)在 Action 执行前校验；本章不定义上述策略求值规则，只规定各 `interaction_level` 下的执行与约束语义。业务 Action 的 input 语义、UI 技术栈及渲染机制不属于本章规范性要求。

---

## 总览（Overview） {#s-19-1}

HAI 规定 Action 执行前后的**可观察控制语义**：如何组合**执行门**、**HAI 信封**与**挂起凭证**，以约束 Agent 执行权并保证关键决策可审计、可验证。路径编排步骤见[全局状态机](global-state-machine.md)。

### HAI 控制剖面（HAI Control Profile） {#s-19-1-1}

对具有 HAI 语义的 Action，交互控制剖面由下列三个要素组成：

- **执行门（execution gate）**：规定 Agent 能否在无 Principal 介入下推进当前 Action；由 Action 在原语定义文件的人机协同扩展中声明的 `interaction_level` 表达（见 交互控制等级）。
- **HAI 信封（HAI envelope）**：Action 响应中承载 Suspend Record、动作承接界面（Action Surface，本章简称 Surface）与 Data Source 等并行协议对象的出站对象（见本节、[Agent友好接口](agent-friendly-interface.md)）。
- **挂起凭证（suspend credential）**：`suspend_id` 及其关联 Suspend Record，用于鉴别 Principal 的确认续跑（见 挂起记录）。身份、授权、证据和完整性要求分别适用相关章节及 Action/Profile 规则。

`data_visibility` 是适用于所有 Action 的顶层静态声明，取值 `V0` / `V1` / `V2`。它不属于 `hai` 对象，也不构成交互控制剖面。HAI 信封、Surface、Data Source 与 Agent 可见响应处理数据时 MUST 遵守 数据可见性规范。运行时 Surface 的 `data_visibility` MUST NOT 高于其所服务 Action 的声明值；若使用 V2，权威读取、`data_source` 与适用的完整性校验仍必须满足 Data Source 的规则。

`interaction_level` 为 Action 级声明：**未声明 `hai` 的 Action 视为 `AUTONOMOUS`**；Action 在原语定义文件携带 `hai` 时 MUST 声明 `interaction_level`（取值 `AUTONOMOUS` / `SUPERVISED` / `CONFIRMED`）。具体配置由**实现方**决定，协议正文不作逐 Action 规定。显式声明 `AUTONOMOUS` 表示该 Action 支持**非阻断 UI 交互**（MAY 返回 HAI 信封供 Surface 或 `submission`，见 AUTONOMOUS 控制语义），但不改变其不以人工确认为继续执行前提的执行门语义。处理方 MUST 按适用的 `interaction_level` 及各控制等级应用相应控制语义。各参与方 MAY 通过最低控制要求所列来源声明 Action 的最低控制要求；若 Action 静态声明严格度低于适用最低要求，处理方 MUST 拒绝执行或返回能力不匹配错误（见能力求值与差异处理）。Mandate 校验以[认证与授权](identity-authorization.md)为准；Mandate 通过或拒绝不改变该 Action 所适用的 `interaction_level` 控制语义。

### 交互控制等级（interaction_level） {#s-19-1-2}

UTP 定义三级 `interaction_level`，严格度排序：`AUTONOMOUS < SUPERVISED < CONFIRMED`。每个 Action 声明其中**唯一**一个等级，作为该 Action 的执行门。

| 等级 | 执行门语义 | Agent 行为 | Principal 行为 |
| --- | --- | --- | --- |
| `AUTONOMOUS` | 该 Action 不以人工确认为继续执行前提 | MAY 直接执行；处理方 MUST NOT 因 HAI 创建活跃挂起控制 | 无需逐次介入 |
| `SUPERVISED` | 该 Action 可观察、可中断，但不要求显式确认 | 执行前 MUST 产生预执行控制事件；不等待确认 | 实时可见，MAY 在窗口内取消 |
| `CONFIRMED` | 该 Action 在 Principal 明确确认前 MUST NOT 继续推进 | 处理方 MUST 创建或复用活跃挂起控制并阻止继续执行 | MUST 完成明确确认（见 CONFIRMED 控制语义） |

> **NOTE（Informative）**：本章中文分别将 `AUTONOMOUS`、`SUPERVISED`、`CONFIRMED` 表述为"自主执行""监督执行""人工确认"。上述三级控制等级与业界通行的人机协作分类对应：`AUTONOMOUS` 对应 Out-of-the-Loop (OOTL，常译为"人在环外")，`SUPERVISED` 对应 Human-on-the-Loop (HOTL，常译为"人在环上")，`CONFIRMED` 对应 Human-in-the-Loop (HITL，常译为"人在环中")。UTP 采用机制描述性命名，以精确表达各等级的协议行为约束。

### HAI 信封（HAI Envelope） {#s-19-1-3}

HAI 信封是 Action 响应中承载 UI 承接与控制状态的并行对象（见 [Agent友好接口](agent-friendly-interface.md)）。

HAI 信封 MUST 至少包含下列语义元素：

| 字段 | 必需性 | 描述 |
| --- | --- | --- |
| `interaction_level` | 是 | `surface.action` 所服务 Action 在原语定义文件中声明的控制等级；它不必等于产生该响应的前序 Action 的等级 |
| `suspend` | 条件必需 | [**Suspend Record**](#s-19-7-2)；`CONFIRMED` 下 MUST 为 `status: ACTIVE`，并含 `suspend_id` 与 `suspended_action` |
| `surface` | 条件必需 | [**Action Surface**](#s-19-4)（见 动作承接界面）；Agent 可见链 MAY 省略，完整对象由 UTP Runtime 自 Surface 存储或注册表解析；`CONFIRMED` 下为 [Confirmation Surface](#s-19-7-3) |
| `data_source` | 条件必需 | [**Data Source**](#s-19-3)；V2 确认场景或确认前需权威重读 / `data_hash` 校验时 MUST 提供；Agent 可见链 MAY 省略 |
| `agent_hint` | SHOULD | 面向 Agent 的控制边界说明；MUST NOT 覆盖 risk、authorization 等协议约束 |

Principal 确认续跑所允许的具名业务 Action 由 Suspend Record 中的 `suspended_action` 唯一确定，MUST NOT 以独立 Action 列表另行声明。

每个 ActionResponse 最多包含一个 HAI 信封，且每个 HAI 信封最多包含一个 Surface。`hai.interaction_level` MUST 等于 `surface.action` 的静态声明等级；存在 `suspend` 时，`surface.action` MUST 等于 `suspend.suspended_action`。若前序 Action 的响应为后续 Action 返回 Surface，则 `surface.action` MUST 位于该响应的 `valid_next_actions` 中。

下列规则规定 `interaction_level` 与 HAI 信封的组合语义：

| `interaction_level` | 执行门 | HAI 信封行为 |
| --- | --- | --- |
| `AUTONOMOUS` | 不因 HAI 创建活跃挂起；Agent MAY 直接执行 | MAY 返回 HAI 信封供 UI 展示或收集 `submission`；MUST NOT 创建活跃挂起 |
| `SUPERVISED` | MUST 提供预执行控制语义（SUPERVISED 控制语义） | MAY 返回 HAI 信封；Surface MAY 承载观察、预执行提示与中断入口 |
| `CONFIRMED` | MUST 创建活跃挂起并阻止继续执行（CONFIRMED 协议行为） | MUST 返回含 `suspend_id` 与 `suspended_action` 的 HAI 信封；Principal 确认 MUST 经 `suspended_action` 完成确认续跑 |

1. 返回 HAI 信封 MUST NOT 改变该 Action 已声明的 `interaction_level`。
2. 各 `interaction_level` 下的完整协议行为，分别见 AUTONOMOUS 控制语义、SUPERVISED 控制语义、CONFIRMED 控制语义 及后续小节。
3. `suspend_id` MAY 存在于响应结构供 UTP Runtime 解析，且 MUST NOT 进入 Agent 推理上下文（见 安全考量）。

## 数据可见性规范（Data Visibility） {#s-19-2}

### 可见性等级 {#s-19-2-1}

协议将交易数据相对于 Agent 推理链路的可见性分为三个等级：

| 等级 | 名称 | Agent 推理链路可见性 | 描述 |
| --- | --- | --- | --- |
| **V0** | Open | 完全可见 | 公开信息，无安全约束 |
| **V1** | Contextual | 摘要/脱敏可见 | 辅助决策的业务数据 |
| **V2** | Protected | **仅资源标识符可见** | 敏感数据，MUST NOT 进入 Agent 推理上下文 |

### 可见性分配原则 {#s-19-2-2}

具体字段属于 V0、V1 或 V2，由 Handler / 角色绑定 Profile、会话能力声明共同确定。协议规定三级可见性语义及其隔离要求；字段级映射由能力声明与数据分类给出。

本节适用于本章所有可能进入 Agent 可见链或其它后续执行链路的界面相关数据，包括 HAI 信封中的 Surface 预览或展示内容，以及 Submission 定义的 Submission 语义。凡是本章要求进入 Agent 可见链的内容，均 MUST 按本节执行可见性裁剪。

- Agent 发起的业务原语调用，其结构化响应 MUST 按本节 V0 / V1 / V2 规则进入 Agent 可见链。
- UTP Runtime 代表 Principal 发起的 HAI 控制读取或 UI 交互，其完整响应默认 MUST NOT 直接进入 Agent 可见链；若协议要求其中部分信息对 Agent 可见，则该部分信息 MUST 先按可见性等级裁剪后再进入 Agent 可见链。

当本章要求某类信息进入 Agent 可见链时，其结构化内容 MAY 为提交事实对象、标准响应对象或其它协议允许的结构化结果；当前控制边界提示使用 `agent_hint`，面向 Agent 的自然语言说明使用 `agent_text`。

### 存在活跃 HAI 挂起时的 Agent 可见最小语义 {#s-19-2-3}

涉及 V2 级数据且存在活跃 HAI 挂起控制的操作，Agent 可见响应 MUST 至少表达以下语义。

下列示例对应 Agent 首次调用声明为 `CONFIRMED` 的原语 Action（如 `utp.purchase.complete`）时，处理方创建活跃 Suspend Record、阻止业务副作用所返回的 [P0 ActionResponse](primitive-framework.md#s-1023-action-definition-format) 之 Agent 可见投影。`data_visibility` 为 ActionResponse 顶层字段（见 `action_response.json`），回显该 Action 的数据可见性上限，不属于 `hai` 对象。示例中 `output` 字段名与业务取值仅作说明，不构成字段级可见性注册表。以下示例不构成唯一合法格式：

```json
{
  "action": "utp.purchase.complete",
  "session_id": "utp-session-abc123",
  "execution_result": "SUCCESS",
  "output": {
    "purchase_id": "purchase-5-001",
    "status": "awaiting_principal_confirmation"
  },
  "valid_next_actions": [],
  "data_visibility": "V2",
  "hai": {
    "interaction_level": "CONFIRMED",
    "suspend": {
      "session_id": "utp-session-abc123",
      "transaction_id": "utp-txn-xyz789",
      "suspended_action": "utp.purchase.complete",
      "reason": "purchase_confirmation",
      "status": "ACTIVE",
      "created_at": "2026-07-20T06:00:00Z",
      "timeout_ms": 300000,
      "surface_id": "surf_01J..."
    },
    "agent_hint": "采购单 purchase-5-001 正等待委托人在 UI 中确认。在挂起解除之前，你可以回答澄清性问题或引导用户进入确认界面，但不得将该采购视为已确认，也不得调用会推进该挂起交易的原语。"
  }
}
```

**规则**：

1. `output` 中 MUST NOT 包含 V2 级数据的实际值（金额、地址、支付凭证等）
2. `output` SHOULD 包含资源标识符与状态；当前控制语义说明 SHOULD 使用 `hai.agent_hint`。
3. `suspend_id` MUST NOT 出现在 Agent 可见响应中供 LLM 复述；UTP Runtime MAY 从完整响应中提取，并仅在代表 Principal 提交后续 Action 时使用（见 安全考量）。
4. V2 数据的完整内容通过 `data_source` 获取，仅进入 Surface renderer，MUST NOT 进入 Agent 可见内容
5. `hai.agent_hint` MAY 出现在响应中，用于说明当前状态、约束与允许的对话边界；它不得覆盖协议中的 risk、confirmation、authorization 与控制通道约束。
6. 若实现另行提供面向 Agent 的自然语言说明，该说明 SHOULD 使用 `agent_text`；`agent_text` 不承担结构化状态表达职责。
7. 当前 StateView 由会话上下文或状态机制与 ActionResponse 并行提供；挂起响应中 StateView 的 `state` 与 `state_version` MUST 保持不变（见 CONFIRMED 协议行为）。活跃挂起控制由 `hai` 表达。
8. Agent 可见响应 MAY 省略 `valid_next_actions`；活跃挂起期间允许的交互由状态语义与本章控制规则确定。

---

## Data Source（权威数据读取） {#s-19-3}

### 定义 {#s-19-3-1}

Data Source 是 HAI 控制语义下对既有 Action 数据的**权威读取对象**。HAI 信封中的 `data_source` 字段承载该对象。Data Source 用于 Surface 展示、确认续跑前的权威重读及适用的一致性校验；HAI 信封涉及 V2 权威读取或受控预览时亦适用。协议固化其 Action 引用、业务锚点、附加参数、完整性字段、刷新语义与会话绑定要求；其承载方式 MAY 为网络端点、回调或等价桥接机制。

- Data Source MUST 指向已声明的完整 Action 所产生或读取的权威资源对象；它不是独立能力、Endpoint 或第四类调用对象。
- 当某权威对象以 Data Source 身份用于 HAI 控制读取时，Agent MUST NOT 请求将受控读取结果交付至其可见链；违反者处理方 MUST 返回 `HAI_DATA_SOURCE_FORBIDDEN_TO_AGENT`。
- 上述限制不限制 Agent 对同一 Action 的正常业务调用及其按可见性裁剪后的响应。
- 请求 MUST 携带会话级凭据或等价绑定，并在适用时验证其与当前 `session_id`、`trade_context_id`、`transaction_id` 的匹配关系。
- 适用完整性 Profile 时，响应 MUST 包含 `data_hash`；高风险场景 SHOULD 包含更高强度的签名或完整性证明。
- V2 数据通过 Data Source 读取时，仅 MAY 进入 Surface renderer 或等价的 UI 渲染边界，MUST NOT 直接进入 Agent 可见内容。

Data Source 表达协议层的 Action 引用、业务锚点、鉴权与完整性要求。UTP Runtime MAY 调用所引用 Action 后交付其数据，也 MAY 交付该 Action 已产生的受控数据；不同实现可采用不同承载形态，但 MUST 满足等价的协议语义。

同一权威数据源 MAY 同时支撑业务原语与 Data Source；协议要求区分的是业务原语路径与 HAI 控制读取路径的调用语义和可见性边界，而非物理拆分为两套无关接口或服务。

下列情形不要求经 Data Source 读取：Agent 已通过业务原语调用取得的 V0/V1 结构化结果，用于界面展示同一权威内容；Submission `submission` 所提交的受控事实；Agent 对业务原语的正常调用及其响应。

### 请求格式 {#s-19-3-2}

Data Source 请求 MUST 能够引用对应原语中已声明的 Action，并绑定当前会话与业务锚点。逻辑字段包括：

| 字段名 | 类型 | 必填 | 描述 | 示例 |
| --- | --- | --- | --- | --- |
| `action_ref` | string | 是 | 直接引用对应原语中已声明的完整 Action，而非实现操作接口或 Endpoint。该 Action MUST 可供 Surface 或 UTP Runtime 读取或取得权威数据。 | `utp.purchase.get_details` |
| `session_id` | string | 是 | 关联的 UTP 会话标识。 | `utp-session-abc123` |
| `trade_context_id` | string | 条件必填 | 关联的交易上下文锚点；当读取对象属于 `SOURCING` 或 `NEGOTIATING` 阶段，或需要按上下文谱系校验归属时提供（见[全局状态机](global-state-machine.md)）。 | `utp-ctx-xyz789` |
| `transaction_id` | string | 条件必填 | 关联的交易级锚点；当读取对象属于 `PURCHASING` 及后续交易事务语义，或需要按交易分支校验归属时提供（见[全局状态机](global-state-machine.md)）。 | `utp-txn-xyz789` |
| `parameters` | object | 否 | 对该 Action 读取或取得数据时的附加参数。其字段由对应原语定义，MAY 承担搜索条件、筛选、分页、对象定位辅助参数或同一协议级 Surface 的初始化上下文；MUST NOT 替代 `session_id`、`trade_context_id` 或 `transaction_id` 的业务锚点职责。 | `{ "purchase_id": "pur-001", "view": "confirmation" }` |

Data Source 采用非网络承载方式时，逻辑上 MUST 保持等价的资源定位、会话绑定与鉴权语义。

例如：读取某个订购确认对象时，可使用 `action_ref=utp.purchase.get_details`，并在 `parameters` 中提供 `purchase_id=pur-001`；若该读取同时要求交易级归属校验，则再提供对应的 `transaction_id`。当同一协议级 Surface 需要指定初始化视图时，可在 `parameters` 中附加如 `view=confirmation` 的初始化上下文。

### 响应格式 {#s-19-3-3}

Data Source 响应在协议层至少应包含：

| 字段名 | 必填 | 描述 |
| --- | --- | --- |
| `data` | 是 | 确认界面或受控预览所需的完整业务数据 |
| `data_hash` | 条件必填 | 适用完整性 Profile 时，用于一致性校验与所见即所签 |
| `refresh_strategy` | 条件必填 | 适用完整性 Profile 时，确认前如何刷新或校验数据 |
| `expires_at` | 否 | 数据有效期控制；与 `refresh_strategy` 一同表达刷新与过期语义 |
| `signature` | 否 | 更高强度的完整性保证；其签名机制应与信任、安全章节保持一致 |

### 数据刷新策略（refresh_strategy） {#s-19-3-4}

| 策略 | 语义 | 默认适用场景 |
| --- | --- | --- |
| `strict` | 确认前 MUST 重新获取或重新校验 data hash | 资金、合同、支付、库存锁定类 Surface 默认 |
| `on_expiry` | `expires_at` 过期后 MUST 阻止确认并重新获取；若重读导致 `data_hash` 变化，MUST 按 一致性校验 作废当前挂起并创建新 `suspend_id` | 中风险展示 |
| `manual` | 由 UTP Runtime 自行决定刷新，但执行前仍需处理方按适用规则完成一致性校验 | 低风险只读展示 |

### 会话绑定与载体形态 {#s-19-3-5}

1. 若采用网络通道，UTP Runtime MUST 使用 UTP 会话建立时获取的 session-level token 或等价会话凭据。
2. 处理方 MUST 验证凭据有效，且请求的 `action_ref`、`parameters` 及其业务锚点归属于对应的 `session_id`、`trade_context_id` / `transaction_id`。
3. 不同通道或承载方式均可承载同一 Data Source 语义。
4. 无论采用何种载体，实现 MUST 提供等价的资源定位、鉴权、完整性与刷新语义。

### 与原语的映射 {#s-19-3-6}

各原语中可供 HAI 引用的 Action、默认 `refresh_strategy` 及确认续跑前须校验的完整性点，由**实现方**在其原语定义或 Profile 中声明；本节仅定义通用 Data Source 契约。

### 错误处理 {#s-19-3-7}

Data Source 读取失败时，协议层 MUST 可观察语义错误码及对应的恢复方向；具体承载形态 MAY 因实现而异。下表 HTTP 映射仅为**Informative**示例：

| 错误场景 | 协议错误码 | 可观察恢复方向 | HTTP 映射（Informative） |
| --- | --- | --- | --- |
| 资源不存在 | `RESOURCE_NOT_FOUND` | 中止当前确认读取；MAY 触发挂起取消或重新发起操作 | 404 |
| 认证失败 | `UNAUTHORIZED` | 重新认证或中止当前确认流程 | 401 |
| 数据已过期 | `DATA_EXPIRED` | 重新获取权威数据并重新进入确认流程 | 410 |
| Data Source 不可用 | `DATA_SOURCE_UNAVAILABLE` | 重试或中止当前确认流程（见[全局状态机](global-state-machine.md)） | 503 |
| 提供方错误 | `INTERNAL_ERROR` | 重试（遵循[全局状态机](global-state-machine.md)超时与重试规则） | 500 |

---

## 动作承接界面（Action Surface） {#s-19-4}

### 定义 {#s-19-41}

动作承接界面（Action Surface，下文简称 Surface）是协议与 UTP Runtime 之间的共同契约，用于表达**可渲染、可验证、可映射**的业务交互语义。HAI 信封中的 `surface` 字段承载该对象（见 HAI 信封）。协议 MUST 约束其语义与安全字段。Action Surface 适用于全部 `interaction_level`：`AUTONOMOUS` 下 MAY 用于非阻断 UI 展示与 `submission` 收集（见 AUTONOMOUS 控制语义）；`SUPERVISED` 下 MAY 承载观察、预执行提示与中断入口（见 SUPERVISED 控制语义）；关联活跃 Suspend Record 的 Action Surface 称为**确认界面（Confirmation Surface）**，其特化约束见 确认界面。

Action Surface 表达 UI 承接语义，本身 MUST NOT 触发状态迁移或产生业务副作用；Surface 上会改变协议状态或推进交易状态的交互，MUST 通过对应原语 action 进入后续链路（见 AUTONOMOUS 协议行为、确认后续跑）。Action Surface 在适用时声明该 Surface 所服务的 UTP action（见 协议互操作要素）；其数据读取上下文由同一 HAI 信封中的 `data_source` 权威定义。Agent 可见链 MAY 省略 `surface` 对象；UTP Runtime MUST 自 Surface 存储或注册表解析完整对象，Surface 与活跃挂起的关联由 Suspend Record 的 `surface_id` 字段表达（见 挂起记录）。Agent MUST NOT 依赖 Surface 内部 UI 结构、sections 或组件树做执行决策；Agent 行为仅由 HAI 信封、`suspended_action`、[Agent友好接口](agent-friendly-interface.md) `valid_next_actions` 及本章控制规则决定。

### 协议互操作要素（Normative） {#s-19-4-2}

下列字段构成跨实现 MUST 互通的 Action Surface 最小字段集合；字段名与类型 MUST 一致，MUST NOT 由实现自行替换为同义字段：

| 字段名 | 类型 | 必需性 | 描述 |
| --- | --- | --- | --- |
| `surface_id` | string | MUST | Action Surface 权威标识；Suspend Record 与审计引用 MUST 使用同一标识；确认续跑请求无需重复提交该字段 |
| `action` | string | MUST | 该 Surface 所服务的 UTP action。当 Surface 关联活跃 Suspend Record（即作为 Confirmation Surface，见 确认界面）时，MUST 等于该 Suspend Record 的 `suspended_action`；无活跃挂起时，表示该 Surface 所服务的 UTP action，不要求等于触发该 Surface 的原始 Action。 |
| `description` | string | SHOULD | 面向人类的中性描述字段。该字段 MUST NOT 作为协议匹配、续跑校验或 Surface 承接识别依据。 |
| `data_visibility` | enum | MUST | 界面所处理数据的最高可见性等级：`V0` / `V1` / `V2`（见 数据可见性规范） |

当 Action Surface 需要权威数据读取或刷新语义时，MUST 使用同一 HAI 信封顶层 `data_source` 所定义的上下文。Surface MUST NOT 内嵌或定义第二套 `data_source`、`refresh_strategy` 或等价字段。

以下示例仅用于说明协议互操作层的最小结构（以确认场景为例），不构成唯一合法封装格式：

```json
{
  "surface_id": "surf_01J...",
  "action": "utp.purchase.complete",
  "description": "purchase confirmation surface",
  "data_visibility": "V2"
}
```

### UI 表达要素（Informative） {#s-19-4-3}

> **以下内容为信息性要求**，不构成跨实现 MUST 互通的字段契约；不影响 Agent 调用、续跑校验或 `data_hash` 计算。

实现 MAY 在 Surface 中自由表达下列 UI 语义；原语章 MAY 提供推荐展示要点（如订单金额、收货地址、支付授权文案），但不得将其上升为本章 normative 字段：

- 必须展示的业务事实或确认要点（sections、卡片、表单字段等）；
- 组件类型、布局、交互流程与无障碍属性；
- 面向 Principal 的提示文案与风险提示样式。

不同实现的 UI 表达 MAY 完全不同；互操作一致性由 协议互操作要素 协议互操作要素、确认完整性绑定 确认完整性绑定及 CS-1～CS-6 行为契约保证。

### 行为契约（CS-1 ~ CS-6） {#s-19-4-4}

任何 Action Surface 的实现 MUST 满足以下契约；其中 CS-1～CS-3 适用于全部 Action Surface，CS-4～CS-6 适用于关联活跃 Suspend Record 的 Confirmation Surface（见 确认界面）：

| 契约编号 | 契约 | 描述 |
| --- | --- | --- |
| CS-1 | 数据来源可信 | 当 Surface 处理 V2 确认数据时，展示数据 MUST 从 `data_source` 指定的权威读取对象获取，MUST NOT 使用 Agent 推理链路中的 V2 字段值；当界面展示的是 Agent 已通过业务原语取得且可见性为 V0/V1 的权威结构化结果时，MAY 直接使用该结果 |
| CS-2 | 渲染隔离 | 渲染过程 MUST 独立于 Agent 推理进程 |
| CS-3 | 不可篡改 | Agent MUST NOT 能修改 Surface 中展示的内容 |
| CS-4 | 所见即所签 | Principal 确认的内容 MUST 与实际提交执行的内容一致（配合 data_hash / recompute） |
| CS-5 | 原子性 | 单次 Principal 确认 MUST 对应单次 `suspended_action` 续跑；MUST NOT 拆分为多个具名业务 Action 共用同一 `suspend_id` |
| CS-6 | 超时安全 | 超时后 MUST 视为未确认处理 |

Surface 的创建、渲染、交互、决策与归档过程 MAY 由实现内部维护；最终决策及其证据 MUST 可归档到 Evidence Bundle。

---

## AUTONOMOUS 控制语义 {#s-19-5}

### 协议行为 {#s-19-5-1}

`AUTONOMOUS` 表示该 Action 不以人工确认为继续执行前提。Action 声明为 `AUTONOMOUS` 时，协议行为 MUST 满足 HAI 信封 中 `AUTONOMOUS` 行的执行门与 HAI 信封规则，并满足下列增量要求：

1. Agent MAY 直接调用对应业务原语或能力接口。
2. MAY 返回 HAI 信封供 UI 展示或收集 `submission`；该 Surface 上的后续交互若会改变协议状态或推进交易状态，MUST 通过对应原语 action 进入后续链路。

### Submission {#s-19-5-2}

`submission` 是 `AUTONOMOUS`、无活跃挂起控制时，Principal 在 UI 中完成交互后，MAY 将**非状态变更**的受控结果回流 Agent 可见链或后续执行链的机制。典型场景包括选型、筛选、表单填写等辅助 Agent 继续规划的操作；它**不是** CONFIRMED 确认续跑路径，MUST NOT 替代具名业务 Action 或 Resume/Cancel。

Submission MUST NOT 改变协议状态。会推进交易或事务状态的动作 MUST 通过对应原语 action 完成（见 确认后续跑）；完整确认视图与 V2 权威数据的展示与绑定属于 CONFIRMED 路径，不属于 Submission。

Submission 的最小语义 MUST 满足以下要求：

1. Submission MUST 显式携带一个 `action` 字段，用于标识该次 UI 交互结果所对应的 UTP action；该字段 MUST NOT 省略为隐式约定，也 MUST NOT 依赖 `description`、按钮文案或本地路由推断。
2. 当同一 Surface 上存在多种后续交互结果时，不同结果 MUST 通过 Submission 中不同的 `action` 显式区分；MUST NOT 另设平行事件命名体系。
3. 若提交结果进入 Agent 可见链，MUST 按 数据可见性规范 执行可见性裁剪；V2 级数据 MUST NOT 以原始值进入 Agent 可见内容，MAY 以资源标识符或经裁剪的 V1 摘要表达。
4. 存在活跃挂起控制时，Submission MUST NOT 替代确认续跑所需的业务 Action 或 Resume/Cancel。
5. 若提交结果进入 Agent 可见链，结构化提交事实 SHOULD 由 `payload` 承载；若同时需要面向 Agent 的自然语言说明，SHOULD 使用 `agent_text`。

以下示例仅用于说明 Submission 的最小语义，不构成唯一合法格式：

```json
{
  "action": "utp.source.lookup",
  "agent_text": "委托人已选择商品 item-XYZ-001",
  "payload": { "item_id": "item-XYZ-001" },
  "timestamp": "2026-07-20T06:02:00Z"
}
```

Submission MUST 由代表 Principal 的 UTP Runtime 提交；Agent MUST NOT 伪造或代发该受控结果（见[Agent友好接口](agent-friendly-interface.md)）。

---

## SUPERVISED 控制语义 {#s-19-6}

### 协议行为 {#s-19-6-1}

`SUPERVISED` 表示该 Action 可观察、可中断，但不要求显式确认。Action 声明为 `SUPERVISED` 时，协议行为 MUST 满足 HAI 信封 中 `SUPERVISED` 行的执行门与 HAI 信封规则。实现支持该档位时，窗口计时与中断处理 MUST 由处理方与控制通道承担：

1. 处理方在有副作用 Action 执行前产生 `pre_execution` control event；其中涉及 V2 的受控预览或权威重读时，适用 Data Source；进入 Agent 可见链的内容适用 数据可见性规范。
2. 代表 Principal 的 UTP Runtime 若在线且支持 interrupt，可在 `interrupt_window_ms` 内提交 `utp.hai.interrupt` 以取消本次待执行操作。
3. `interrupt_window_ms` 由实现维护为权威窗口计时；窗口结束未收到有效中断则自动执行。
4. 若实现不支持 `SUPERVISED` 所需的实时 interrupt 通道，MUST 返回 `HAI_CAPABILITY_MISMATCH` 或 `HAI_CONTROL_CHANNEL_UNAVAILABLE`；不得在未满足该等级语义的情况下继续执行。

### pre_execution 事件 {#s-19-6-2}

`pre_execution` 事件 MUST 至少表达下列语义要素；若承载通道已天然区分事件类型，对应的事件类型字段可省略：

| 字段名 | 类型 | 必填 | 描述 |
| --- | --- | --- | --- |
| `notification_type` | enum | 否 | 固定值 `"pre_execution"`；当通道已天然区分该事件时可省略 |
| `intended_action` | string | 是 | 即将执行的操作标识 |
| `consequence_preview` | object | 否 | 操作后果预览；若提供，其 Agent 可见内容与权威读取要求分别参见 数据可见性规范 与 Data Source |
| `interrupt_window_ms` | integer | 是 | Principal 可中断的时间窗口（毫秒），默认 5000 |
| `auto_proceed` | boolean | 否 | 窗口结束后是否自动执行；若省略，在 `SUPERVISED` 下默认为自动继续 |

### 中断机制 {#s-19-6-3}

在 `interrupt_window_ms` 内，代表 Principal 的 UTP Runtime MAY 发送 `utp.hai.interrupt` 以取消本次待执行的 SUPERVISED Action：

| 字段名 | 类型 | 必填 | 描述 |
| --- | --- | --- | --- |
| `action` | enum | 是 | 固定值 `"utp.hai.interrupt"` |
| `intended_action` | string | 是 | 被取消的操作标识（MUST 与 `pre_execution` 事件中的 `intended_action` 一致） |
| `reason` | string | 否 | 取消原因 |

处理方收到有效的 `utp.hai.interrupt` 后 MUST 取消本次待执行的 SUPERVISED Action，MUST NOT 执行对应业务 Action，并 MUST 向 Agent 可见链返回可审计的取消结果。若 Action 需要 Principal 明确确认后再执行，实现方 MUST 在原语定义中将该 Action 声明为 `CONFIRMED`，MUST NOT 依赖 SUPERVISED 中断路径实现确认门。

窗口外的中断请求返回 `INTERRUPT_WINDOW_EXPIRED`。若 UTP Runtime 检测到 Principal 不在线，SHOULD 将 `interrupt_window_ms` 设为 0（等效 AUTONOMOUS）。

---

## CONFIRMED 控制语义 {#s-19-7}

### 协议行为 {#s-19-7-1}

`CONFIRMED` 表示当前交易/事务在收到 Principal 明确确认前不得继续推进。Action 声明为 `CONFIRMED` 时，协议行为 MUST 满足以下要求：

1. 处理方 MAY 在前序 Action 的响应中为后续 `CONFIRMED` Action 创建活跃 Suspend Record 并返回 HAI 信封。Agent 无有效 `suspend_id` 调用 `CONFIRMED` Action 时，处理方 MUST 在状态推进前创建或返回活跃 Suspend Record，并阻止该 Action 产生业务副作用；挂起响应中 StateView 的 `state` 与 `state_version` MUST 保持不变。
2. Principal 的确认 **MUST** 由代表 Principal 的 UTP Runtime 调用 Suspend Record 中的 `suspended_action`，并携带匹配的 `suspend_id` 完成（见 确认后续跑）；界面展示所依赖的权威读取与数据隔离要求分别见 Data Source 与 数据可见性规范。
3. 存在活跃挂起控制时，Agent 发起调用 MUST 被阻断；仅确认续跑业务 Action 或窄语义 control action（见 窄语义 Resume / Cancel）MAY 改变当前控制门状态。
4. 确认续跑执行业务 Action 前，处理方 MUST 完成本章的挂起校验，并应用该 Action 适用的完整性、身份、授权、证据与 Mandate 校验（见[认证与授权](identity-authorization.md)、[风控与审计](risk-audit.md)）；取消、超时或校验失败时 MUST 返回可审计的协议结果。

### 挂起记录（Suspend Record） {#s-19-7-2}

#### 定义（Suspend Record） {#s-19-7-2-1}

当处理方为声明 `interaction_level = CONFIRMED` 的目标 Action 建立人工确认控制时，处理方 MUST 创建一个 Suspend Record；该建立可发生在前序 Action 的响应中，或发生在 Agent 无凭证调用该目标 Action 时。Suspend Record 表达单次人工确认控制的完整生命周期；HAI 信封中的 `suspend` 字段承载该对象在当前响应中的协议表示。StateView 与 HAI 挂起控制 MUST 并行表达（见 活跃 HAI 挂起时的 Agent 可见最小语义）。

以下示例仅用于说明 Suspend Record 的最小语义要素，不构成唯一合法格式：

```json
{
  "suspend_id": "sus_01J...",
  "session_id": "utp-session-abc",
  "transaction_id": "utp-txn-xyz",
  "suspended_action": "utp.purchase.complete",
  "reason": "purchase_confirmation",
  "status": "ACTIVE",
  "created_at": "2026-07-20T06:00:00Z",
  "timeout_ms": 300000,
  "surface_id": "surf_01J..."
}
```

| 字段名 | 类型 | 必填 | 描述 |
| --- | --- | --- | --- |
| `suspend_id` | string | 是 | 协议层权威挂起标识或挂起引用（见 suspend_id 确认续跑凭据） |
| `session_id` | string | 是 | 关联的 UTP 会话 |
| `transaction_id` | string | 条件必填 | 关联的交易上下文；当挂起记录已进入交易事务语义或存在多分支时提供 |
| `suspended_action` | string | 是 | 被挂起的操作标识（如 `utp.purchase.complete`） |
| `reason` | enum | 是 | 挂起原因分类（见 标准 suspend_reason 枚举）；用于控制审计与说明，MUST NOT 用于确定 Surface 或续跑 Action |
| `status` | enum | 是 | `ACTIVE` / `RESUMED` / `CANCELLED` / `EXPIRED` |
| `created_at` | ISO-8601 | 是 | 挂起记录创建时间 |
| `timeout_ms` | integer | 是 | 超时时长（毫秒），默认 300000（5 分钟） |
| `surface_id` | string | 是 | 关联的 Confirmation Surface（见 确认界面） |

#### suspend_id 为确认续跑凭据 {#s-19-7-2-2}

`suspend_id` MUST 由处理方生成，并在对应的 Suspend Record 生命周期内保持唯一，作为**单次确认控制**的协议层权威凭据。每个 `suspend_id` MUST 与唯一一个 `suspended_action`、关联会话和 Confirmation Surface 绑定；MUST NOT 允许多个具名业务 Action 共用同一 `suspend_id`。适用完整性 Profile 时，处理方 MAY 额外绑定数据快照或其哈希。

- 实现 MAY 将 `suspend_id` 映射到本地运行时标识，但 MUST NOT 用这些本地标识替代 `suspend_id`。
- 本地运行时标识只允许出现在实现内部，MUST NOT 进入协议主体或跨实现的审计记录作为权威标识。
- 代表 Principal 的 UTP Runtime 提交确认续跑、Resume / Cancel 时，均以 `suspend_id` 定位 Suspend Record；续跑请求的 `action` MUST 等于该对象的 `suspended_action`。
- 处理方 MUST 校验 `suspend_id` 的合法性、未过期性，以及其与当前会话、当前主体和 `suspended_action` 的匹配关系；适用完整性 Profile 时还 MUST 校验其定义的完整性绑定。
- Evidence Bundle MUST 以 `suspend_id` 绑定本次 Suspend Record 所对应的 Surface、确认数据与决策结果。
- UTP Runtime MUST NOT 将 `suspend_id` 暴露给 Agent 推理上下文；UTP Runtime MAY 从完整响应中提取，并仅在代表 Principal 提交后续 Action 时使用（见 安全考量）。

#### 状态行为约束 {#s-19-7-2-3}

1. 存在活跃 Suspend Record 时，处理方 MUST 在普通业务 Action 继续执行前优先检查该挂起控制；任何会推进当前交易/事务状态的普通原语操作 MUST 被拒绝，除非该挂起已被合法恢复或取消。
2. 同一会话同时最多存在一个活跃 Suspend Record。复杂 B2B 场景 MAY 按 `transaction_id` 支持每分支一个活跃 Suspend Record；本版本以 session 级互斥为准。
3. 活跃 Suspend Record 与 StateView 共同构成当前执行前控制上下文。
4. 超时后处理方 MUST 将 Suspend Record 置为 `EXPIRED`，使对应 `suspend_id` 不再可用于确认续跑（见 超时处理）。
5. 活跃 Suspend Record 的建立、解除与超时 MUST 记录到 Evidence Bundle，并绑定对应的 `suspend_id`。
6. Agent 在活跃 Suspend Record 仍 `ACTIVE` 时再次发起同一 `suspended_action`，或 UTP Runtime 再次展示同一 Confirmation Surface，处理方 MUST 返回已有挂起语义（含同一 `suspend_id`），MUST NOT 创建第二个活跃 Suspend Record；若会话已有活跃 Suspend Record 而请求会推进其他 Action，处理方 MUST 返回 `SUSPEND_ALREADY_ACTIVE` 或等价挂起结果。
7. 挂起已 `EXPIRED`、`CANCELLED` 或已解除后，Agent 再次发起 `CONFIRMED` Action MUST 创建**新的** Suspend Record 与新的 `suspend_id`；MUST NOT 复用已关闭挂起的凭据。
8. 适用完整性 Profile 时，确认续跑前若权威数据相对挂起创建时的 `data_hash` 已变更，处理方 MUST 按 一致性校验 中止当前续跑；MUST 将旧挂起标记为 `EXPIRED` 或 `CANCELLED` 并解除活跃挂起控制；MUST 创建**新的** Suspend Record 与新的 `suspend_id`（reason=`data_change_reconfirm`）。MUST NOT 就地更新旧挂起的 `data_hash` 而保留同一 `suspend_id`。MUST NOT 在旧 `suspend_id` 上继续提交会改变业务语义的独立 `update` 类 Action 作为确认前置步骤。

#### 标准 suspend_reason 枚举 {#s-19-7-2-4}

下列枚举构成协议标准取值集合。实现 MUST 能识别并处理标准取值；MAY 在 Profile 中声明扩展取值，但扩展取值 MUST NOT 改变本章已定义的控制语义。`reason` 用于说明为何进入人工确认控制，MUST NOT 作为 UTP Runtime 确定 Surface 或续跑 Action 的依据。

| reason | 说明 | 典型关联状态 |
| --- | --- | --- |
| `purchase_confirmation` | 订单确认 | PURCHASING |
| `payment_authorization` | 支付授权确认 | PAYING |
| `high_value_approval` | 超出阈值的大额审批 | PURCHASING / PAYING |
| `address_verification` | 收货地址确认 | PURCHASING |
| `identity_verification` | 身份验证 | 任何状态 |
| `mandate_issuance` | Principal 签发 Mandate | INIT / SOURCING |
| `data_change_reconfirm` | 引用数据已变更需重新确认 | 任何状态 |
| `risk_escalation` | 风控升级触发的人工确认 | 任何状态 |

#### 超时处理 {#s-19-7-2-5}

`timeout_ms` 规定活跃挂起的有效期限，与 SUPERVISED 的 `interrupt_window_ms`（见 SUPERVISED 控制语义）无关。到期后，处理方 MUST 将 Suspend Record 置为 `EXPIRED` 并解除活跃挂起控制；该状态只表示确认令牌已失效，不规定业务取消、Saga 补偿或其它业务处置。

- 超时后收到 Resume 或确认续跑时，处理方 MUST 返回 `SUSPEND_EXPIRED`（或等价错误）。
- 所有活跃挂起 MUST 设置 `timeout_ms`；MUST NOT 允许会话永久悬停。

---

### 确认界面（Confirmation Surface） {#s-19-7-3}

#### 定义 {#s-19-7-3-1}

确认界面（Confirmation Surface）定义为**关联活跃 Suspend Record 的 Action Surface**（见 动作承接界面），承载 `CONFIRMED` 执行门下的人工确认交互。Confirmation Surface MUST 满足 协议互操作要素 协议互操作要素与 行为契约 全部行为契约（含 CS-4～CS-6）；其 `action` MUST 等于关联活跃 Suspend Record 的 `suspended_action`（见 协议互操作要素）。

是否存在活跃确认门由 Suspend Record 表达，不由 Confirmation Surface 表达。Principal 的确认 MUST 经 Suspend Record 中的 `suspended_action` 触发（见 确认后续跑），而非仅通过 Confirmation Surface 内嵌的 Confirm/Cancel 按钮语义。

#### 确认完整性绑定 {#s-19-7-3-2}

所见即所签、证据强度与 UI 布局解耦：跨实现 MUST 按下列规则执行，MUST NOT 因 Surface 组件树、sections 命名或 UI 交互形态不同而改变校验语义。

- 适用完整性 Profile 且存在 `data_source` 时，`data_hash` MUST 取自 `data_source` 响应中的 `data_hash`（见 Data Source 响应格式），表示 Principal 确认时所见的**权威业务数据**快照；确认续跑前 MUST 按该 Profile 的一致性规则重读或校验，失败时 MUST NOT 续跑。
- UI 排版、sections、组件类型、文案与样式 MUST NOT 参与 `data_hash` 计算。
- `integrity.surface_hash` MAY 仅对 协议互操作要素 规定的协议互操作要素（不含 UI 表达层）计算；最小互操作剖面下 MAY 省略；当参与方声明或互操作层要素参与所见即所签绑定时 MUST 提供（见 证据绑定内容）。
- Principal 在 Surface 中的编辑结果 MUST 经 `suspended_action` 的 input 一并提交（见 确认后续跑）；MUST NOT 以独立 `update` 类 Action 消耗同一 `suspend_id`（见 挂起状态行为约束与 Surface 决策结果边界）。

#### Surface 决策结果边界 {#s-19-7-3-3}

Surface 负责承载 UI 表达（UI 表达要素）与协议互操作要素（协议互操作要素）；Principal 在单次确认中提交的决策结果 MUST 经 `suspended_action` 的 input 一次提交；MUST NOT 拆分为多个具名业务 Action 共用同一 `suspend_id`。

---

### 确认后续跑（Confirmation Continuation） {#s-19-7-4}

Principal 在 Confirmation Surface 中完成确认后，代表 Principal 的 UTP Runtime MUST 以标准 ActionRequest 调用 Suspend Record 中的 `suspended_action`，并在请求侧 `hai` attachment 中携带匹配的 `suspend_id`。该路径 MUST 触发对应原语的状态迁移；MUST NOT 依赖 `utp.hai.resume` 作为默认续跑机制。身份、授权、证据及完整性所需的信息由相应章节或 Action/Profile 规则处理，不是确认续跑 HAI attachment 的固定字段。

以下示例仅用于说明确认后续跑的最小语义要素，不构成唯一合法格式：

```json
{
  "action": "utp.purchase.complete",
  "session_id": "utp-session-abc",
  "input": {
    "purchase_id": "purchase-5-001",
    "shipping_address_id": "addr-002"
  },
  "hai": {
    "suspend_id": "sus_01J..."
  },
  "idempotency_key": "idem_01J..."
}
```

确认续跑业务 Action 请求 MUST 满足：

| 要求 | 描述 |
| --- | --- |
| 发起方约束 | 请求 MUST 由代表 Principal 的 UTP Runtime 提交；Agent MUST NOT 以该路径提交带 `suspend_id` 的确认续跑 |
| Action 匹配 | 请求 `action` MUST 等于 Suspend Record 的 `suspended_action`；MUST NOT 使用同一 `suspend_id` 提交其他具名业务 Action |
| 挂起凭证 | `hai.suspend_id` MUST 有效、未过期，且与当前会话、Suspend Record 及 `suspended_action` 匹配 |
| Input 约束 | 业务 input MUST 符合挂起 `suspended_action` 在原语章定义的 input schema |
| 完整性 | 适用完整性 Profile 时，处理方 MUST 按其规则验证 Principal 确认时所见数据与当前权威数据的一致性（所见即所签） |
| 证据绑定 | 适用的身份、授权、Mandate 与证据要求 MUST 按 Action、`SecurityRequirement` 与相应章节处理（见[认证与授权](identity-authorization.md)、[风控与审计](risk-audit.md)） |

处理方收到确认续跑业务 Action 后，MUST 在执行业务 Action 并触发状态迁移前完成：`suspend_id` 与 `suspended_action` 匹配校验、最新 StateView 与交易上下文重读、Action 合法性复验、input schema 校验，以及该 Action 适用的完整性、身份、授权、证据和 Mandate 校验；通过后 MUST 解除活跃挂起控制。具体业务状态迁移语义见[全局状态机](global-state-machine.md)。

确认续跑采用[原语框架](primitive-framework.md)定义的标准请求与响应语义。Agent 侧后续可执行 Action 仍由[Agent友好接口](agent-friendly-interface.md) `valid_next_actions` 表达；挂起期间 Agent 仅见只读 Action，与代表 Principal 的 UTP Runtime 续跑所用 `suspended_action` 职责分离。

若会话 HAI 快照（见 会话 HAI 快照）不含 `CONFIRMED`，Agent 无凭证调用 `CONFIRMED` Action 时处理方 MUST 返回 `HAI_CHANNEL_DENIED` 或 `HAI_CAPABILITY_UNSUPPORTED`。

### 窄语义 Resume / Cancel（Narrow Control Actions） {#s-19-7-5}

`utp.hai.resume` 与 `utp.hai.cancel` 为窄语义 control action，仅在无法直接调用 `suspended_action` 的遗留或极简 UI 场景保留（例如 UI 仅提供 Confirm/Cancel 二选一、无法组装业务 Action 请求体时）。实现 MAY 支持 narrow resume；对 `suspended_action` 的确认续跑为 MUST。Narrow Resume 成功后仍 MUST 恢复并执行 Suspend Record 中的 `suspended_action`，MUST NOT 将 Resume 本身视为业务状态迁移。

#### 控制通道与触发方 {#s-19-7-5-1}

Resume / Cancel 均通过 **HAI control channel** 提交；触发方为 **代表 Principal 的 UTP Runtime**。

- Agent MUST 被阻断以避免推进当前交易/事务状态的普通原语 action；
- HAI control channel MAY 由代表 Principal 的 UTP Runtime 提交 `utp.hai.resume` / `utp.hai.cancel`；
- 处理方 MUST 校验控制通道请求携带的会话级认证令牌与 `suspend_id` 的关联性；
- 若当前实现不具备可用于提交 Resume/Cancel 的 control channel，且确认续跑业务 Action 亦不可用，进入 CONFIRMED 前处理方 MUST 返回 `HAI_CONTROL_CHANNEL_UNAVAILABLE`（与 SUPERVISED 所需的**实时** interrupt 通道不同；后者缺失时 MUST 返回 `HAI_CAPABILITY_MISMATCH`）。

control channel 的承载路径 MAY 为网络调用、受控回调、桥接通道或其他可认证提交路径。

#### Resume 请求 {#s-19-7-5-2}

仅在 narrow resume 适用场景下，Principal 在 Confirmation Surface 中确认后，代表 Principal 的 UTP Runtime MAY 通过控制通道发送 Resume。除本节列出的增量字段外，Resume 请求 MUST 满足[确认后续跑](#s-19-7-4)对 `session_id`、`suspend_id` 与标准写 Action `idempotency_key` 的适用约束，并按确认控制点的证据绑定与完整性规则处理适用的安全要求。

以下示例仅用于说明 narrow resume 相对 确认后续跑 的增量语义，不构成唯一合法格式：

```json
{
  "action": "utp.hai.resume",
  "session_id": "utp-session-abc",
  "suspend_id": "sus_01J...",
  "decision": {
    "timestamp": "2026-07-20T06:02:00Z",
    "modifications": { "shipping_address_id": "addr-002" }
  },
  "idempotency_key": "idem_01J..."
}
```

| 字段名 | 类型 | 必填 | 描述 |
| --- | --- | --- | --- |
| `action` | enum | 是 | 固定值 `"utp.hai.resume"` |
| `decision` | Decision | 是 | narrow resume 增量语义：Principal 的决策结果；成功后续跑仍 MUST 恢复 Suspend Record 中的 `suspended_action` |
| `decision.timestamp` | ISO-8601 | 条件必填 | 当实现需要记录确认时间或以该时间参与超时校验时提供 |
| `decision.modifications` | object | 否 | Principal 修改或选择的字段（仅 ID、枚举值、布尔值）；字段语义由对应原语定义 |

处理方收到 Resume 后，MUST 在提交原 `suspended_action` 或其后续状态迁移前，完成与[确认后续跑](#s-19-7-4)确认续跑等价的、适用于该 Action 的完整性、身份、授权、证据、Mandate 及上下文复验义务。

`decision.modifications` 表达本次确认提交的受控决策结果。HAI 负责校验其完整性、字段白名单与值域约束；其如何映射为 `suspended_action` 的 input 由对应原语定义。

#### Cancel 请求 {#s-19-7-5-3}

Principal 或代表 Principal 的 UTP Runtime 决定放弃当前挂起时，控制通道 MUST 发送 Cancel。以下示例仅用于说明最小语义要素，不构成唯一合法格式：

```json
{
  "action": "utp.hai.cancel",
  "session_id": "utp-session-abc",
  "suspend_id": "sus_01J...",
  "reason": "principal_cancelled",
  "timestamp": "2026-07-20T06:02:00Z",
  "idempotency_key": "idem_01J..."
}
```

| 字段名 | 类型 | 必填 | 描述 |
| --- | --- | --- | --- |
| `action` | enum | 是 | 固定值 `"utp.hai.cancel"` |
| `session_id` | string | 是 | 关联的 UTP 会话标识 |
| `suspend_id` | string | 是 | 关联的挂起标识 |
| `reason` | enum | 是 | 取消原因：`principal_cancelled` / `timeout` / `runtime_abort` |
| `timestamp` | ISO-8601 | 否 | 取消动作发生时间；当实现需要记录审计时间点时提供 |
| `idempotency_key` | string | 是 | 幂等键 |

Cancel 触发后，处理方 MUST：

1. 将对应活跃 Suspend Record 标记为 `CANCELLED` 并解除该挂起控制；
2. 根据当前全局状态判断是否需要触发补偿链（参见 [全局状态机的 Saga 补偿链](global-state-machine.md)）；
3. 返回标准自描述响应（见 控制结果与 Agent 可见响应）。

#### Resume/Cancel 约束 {#s-19-7-5-4}

1. Resume/Cancel MUST 为幂等操作（同一 suspend_id + idempotency_key 重复发送无副作用）。
2. `decision.modifications` 中 MUST NOT 包含 V2 级数据值，仅允许 ID 引用和枚举值。
3. 已超时的活跃挂起收到 Resume 时，MUST 返回 `SUSPEND_EXPIRED` 错误。
4. 当 Resume 提供 `decision.timestamp` 时，其与 `created_at` 之差 MUST 小于 `timeout_ms`。
5. Cancel 与 Resume 互斥，同一 suspend_id 只能接受其中之一（否则 `RESUME_CONFLICT`）。
6. Mandate 覆盖的操作在 Resume 或实际执行前 MUST 按[认证与授权](identity-authorization.md)重新校验 Mandate；失败时返回 `MANDATE_SCOPE_EXCEEDED` 或重新创建新的 CONFIRMED Suspend Record。

### 控制结果与 Agent 可见响应 {#s-19-7-6}

本节规定 **挂起解除之后** Agent 必须能感知到的结果，不定义独立的「控制结果对象」。

Principal 在 Confirmation Surface 完成确认后，代表 Principal 的 UTP Runtime 调用 [确认后续跑](#s-19-7-4) 中的 `suspended_action`（或 narrow Resume/Cancel 成功并触发等价后续执行）。处理方解除活跃 Suspend Record，并返回该业务 Action 的 **标准 P0 ActionResponse**——其中既含原语 `output` 与 `valid_next_actions`，也含 `hai.suspend.status = RESUMED` 或 `CANCELLED` 等挂起解除语义。该响应 MUST 进入绑定同一 `session_id` 的 Agent 可见链，MUST NOT 仅停留在 UTP Runtime 内部。

成功响应属于[Agent友好接口](agent-friendly-interface.md)定义的状态迁移响应链；MUST 至少含可用于定位业务资源的稳定引用（见下列规则）。若服务端已知下一步动作的权威默认参数，SHOULD 在响应链中内联 `default_input`（见[Agent友好接口](agent-friendly-interface.md)）。

以下示例对应 `utp.purchase.complete` 确认续跑成功后的 P0 ActionResponse Agent 可见投影；`output` 字段名与取值仅作说明。Cancel 场景下 `hai.suspend.status` 为 `CANCELLED`，`valid_next_actions` 与 `agent_hint` 按取消语义调整。以下示例不构成唯一合法格式：

```json
{
  "action": "utp.purchase.complete",
  "session_id": "utp-session-abc123",
  "execution_result": "SUCCESS",
  "output": {
    "purchase_id": "purchase-5-001",
    "status": "confirmed"
  },
  "valid_next_actions": ["utp.pay.initiate"],
  "data_visibility": "V2",
  "hai": {
    "suspend": {
      "status": "RESUMED"
    },
    "agent_hint": "委托人已在 UI 中完成采购确认。后续执行应遵循该原语的普通响应契约。"
  }
}
```

**规则**：

1. 控制成功响应 MUST 至少表明：活跃挂起控制已解除，以及可用于定位业务资源的稳定引用仍然可得（如 `output.purchase_id`、`output.checkout_id`、`output.order_id`）。
2. Agent 可见响应 MUST NOT 包含 `suspend_id` 明文；挂起解除状态 SHOULD 由 `hai.suspend.status` 表达。
3. 确认续跑业务 Action 的经校验 input SHOULD 作为受控决策结果进入后续执行链；其业务解释与后续动作约束由对应原语定义。
4. 人工确认已完成且活跃挂起控制已解除这一事实 MUST 对 Agent 可见链可见。代表 Principal 的 UTP Runtime 续跑产生的标准 P0 ActionResponse（含 `output`、`valid_next_actions`、`hai.suspend.status`；StateView 变更由状态机制并行提供）MUST 进入绑定同一 `session_id` 的 Agent 可见链。交付可通过 session 事件、push 或等价机制实现；单独轮询 StateView MUST NOT 替代含 `valid_next_actions` 的控制结果交付。
5. 控制边界说明 SHOULD 使用 `hai.agent_hint`；面向 Agent 的自然语言说明 MAY 另行使用 `agent_text`。
6. Cancel 响应同样 MUST 以标准 P0 ActionResponse 进入 Agent 可见的协议响应链；`reason=runtime_abort` 时同样适用。

---

## 确认控制点的证据绑定 {#s-19-8}

### 定位 {#s-19-8-1}

在 HAI 的确认控制点上，确认续跑业务 Action 或 narrow Resume 执行前 MUST 满足该 Action 适用的身份、授权、Mandate 与证据要求。相关机制与对象定义分别见[认证与授权](identity-authorization.md)与[风控与审计](risk-audit.md)。本节规定 HAI 对这些要求的衔接，不定义确认续跑 `hai` attachment 的平行字段体系。

### 绑定内容 {#s-19-8-2}

确认控制点可能需要下列证据语义要素。其对象、传输位置和验证方式由《身份与授权》、《风控与审计》及 Action/Profile 定义；不得将它们作为确认续跑 `hai` attachment 的固定字段。适用的字段 MUST 按 Action、`SecurityRequirement`、《身份与授权》或参与方声明的强度提供。

| 字段名 | 类型 | 必填等级 | 描述 |
| --- | --- | --- | --- |
| `principal_id` | string | 条件必填 | 本次确认对应的 Principal 身份结果 |
| `session_binding` | string | 条件必填 | 与当前会话或代表 Principal 的 UTP Runtime 绑定的验证结果 |
| `data_hash` | string | 条件必填 | 适用完整性 Profile 时，Principal 确认时所见数据哈希；存在 `data_source` 时 MUST 与其权威快照一致；计算范围与确认场景约束见 确认完整性绑定 |
| `verification_refs` | string[] | 条件必填 | Action、`SecurityRequirement`（《安全与信任》）、《身份与授权》或 `operation_requirements` 要求更高认证/授权强度时 MUST 提供 |
| `mandate_ref` | string | 条件必填 | 本次确认依赖 Mandate 或操作受 Mandate 覆盖时 MUST 提供 |
| `evidence_component_refs` | string[] | 条件必填 | 参与方或 UTP Runtime 要求写入 Evidence Bundle 时 MUST 提供 |
| `surface_hash` | string | 条件必填 | 最小互操作剖面下 MAY 省略；参与方声明或互操作层要素参与所见即所签绑定时 MUST 提供；计算范围见 确认完整性绑定 |

最小互操作剖面下，确认续跑业务 Action 的 HAI attachment MUST 仅含 `suspend_id`；身份、会话绑定、完整性和其它证据语义由相应章节或 Action/Profile 的既有机制承载并验证。

### 强度要求的来源 {#s-19-8-3}

- Action 静态声明、原语风险等级、[信任准入评估](security-trust.md) `SecurityRequirement`、[认证与授权](identity-authorization.md)、Handler 的 `operation_requirements` 及会话协商结果决定本次确认所需的认证与授权强度。
- 这些强度要求 MUST 引用《身份与授权》及相关原语的既有定义。
- 参与方 MUST 在 Profile 或 `operation_requirements` 中显式声明所需强度，MUST NOT 仅依赖 UI 表达层暗示。
- HAI Resume 与确认续跑业务 Action 只消费并绑定"本次确认已经满足所需认证/授权要求"的验证结果。

所需绑定缺失或验证失败时返回 `HAI_EVIDENCE_INVALID`。

---

## 交易完整性保障 {#s-19-9}

### 引用式数据传递（Reference-by-ID） {#s-19-9-1}

跨推理步骤的数据关联 MUST 通过不可变资源标识符引用，MUST NOT 通过数据结构复制。此规则与 [传输与通信](transport-communication.md) 消息信封幂等键及 [全局状态机](global-state-machine.md) 状态一致性保障互补。

1. 原语响应中用于后续步骤引用的业务数据，MUST 以资源标识符形式提供。
2. Agent 后续操作中 MUST 通过 ID 引用资源，MUST NOT 传递来自先前上下文的业务数据值。
3. 原语接收到 ID 后，MUST 从权威存储获取当前数据，MUST NOT 信任 Agent 传递的非 ID 字段。
4. 当 Principal 需要在复杂业务结构中作出选择时，回传结果 SHOULD 收敛为资源标识符、枚举值或布尔值，以避免 V2 数据重新进入 Agent 推理上下文。
5. [活跃 HAI 挂起时的 Agent 可见最小语义](#s-19-2-3) 的挂起响应，与 [控制结果与 Agent 可见响应](#s-19-7-6) 的控制结果，共同记录"人工控制门"的前后状态；挂起解除后承接业务语义的引用链，应由对应原语的普通响应继续提供。

例如，Agent 发起 `utp.purchase.complete` 时，input MUST 仅含 `purchase_id` 等资源标识符；处理方 MUST 忽略 Agent 传递的非 ID 业务字段，并从权威存储获取完整数据。

### 一致性校验（Integrity Check） {#s-19-9-2}

适用完整性 Profile 的资金变动或合同义务操作，执行前 MUST 进行一致性校验，比对 `data_hash`：

| result | 协议行为 |
| --- | --- |
| `consistent` | 正常执行 |
| `changed` | 中止操作；旧挂起 MUST 作废；MUST 创建新 Suspend Record 与新 `suspend_id`（reason=`data_change_reconfirm`）；返回 `INTEGRITY_CHECK_FAILED` 及新 HAI 信封 |
| `not_found` | 中止操作，返回 `RESOURCE_NOT_FOUND` 并触发补偿链 |

---

## HAI 会话能力与控制要求 {#s-19-10}

多厂商 HAI 互操作 MUST 在会话建立时冻结能力边界。发起方 UTP Runtime MUST 在 `session.init` 中声明 `hai.execution_support`；处理方在执行 HAI 相关 Action 前 MUST 依据该快照、最低控制要求 的 `minimum_interaction_level` 与 Action 静态声明求值。缺少所需能力时 MUST 返回确定性错误，MUST NOT 静默降级或假定未声明能力存在。

`execution_support` 仅声明 UTP Runtime 对相应 HAI 控制语义的承接能力，不表示 Agent 已获得 Principal 对任一 Action 的确认授权。确认续跑时，Action Handler MUST 依据 Suspend Record、会话绑定及该 Action 适用的身份、授权、Mandate、完整性和证据要求，验证请求是否可代表 Principal。会话 HAI 能力边界以 `session.init` 快照为唯一 normative 依据；Discovery 或其它预连接 advertisement MAY 供实现预选，但 MUST NOT 替代会话快照作为处理方求值输入。

### 会话 HAI 快照 {#s-19-10-1}

发起方 UTP Runtime MUST 在 `session.init` 中声明 HAI 快照，并在该会话生命周期内保持冻结。`hai` 对象包含两类**正交**声明，MUST NOT 混为同一维度：

1. **执行支持（execution_support）**：UTP Runtime 在本会话中承接的 `interaction_level` 及其可选增强；见本节。
2. **最低控制要求（minimum_interaction_level）**：各参与方对本会话 Action 的控制底线；见 最低控制要求。

下列示例仅说明 `execution_support` 的最小语义要素，不构成唯一合法格式：

```json
{
  "hai": {
    "execution_support": {
      "AUTONOMOUS": { "submission": true },
      "SUPERVISED": true,
      "CONFIRMED": true
    }
  }
}
```

| 字段 | 类型 | 必填 | 描述 |
| --- | --- | --- | --- |
| `execution_support` | object | 是 | 键为 `interaction_level`（`AUTONOMOUS` / `SUPERVISED` / `CONFIRMED`）；值为 `true` 或对象。键存在表示 UTP Runtime 在本会话中支持该等级的完整控制语义 |
| `execution_support.AUTONOMOUS` | boolean \| object | 否 | 支持 AUTONOMOUS 控制语义 自主执行语义。值为对象时 MAY 含 `submission`（boolean）；省略或为 `false` 时视为不支持 Submission 结构化提交 |
| `execution_support.AUTONOMOUS.submission` | boolean | 否 | 是否支持 Submission 定义的 `AUTONOMOUS` 无挂起结构化提交；省略时视为不支持 |
| `execution_support.SUPERVISED` | boolean \| object | 否 | 支持 SUPERVISED 控制语义 监督执行语义，含预执行通知与实时 `utp.hai.interrupt`；MUST NOT 拆为独立 boolean 开关另行协商 |
| `execution_support.CONFIRMED` | boolean \| object | 否 | 支持 CONFIRMED 控制语义 人工确认语义，含活跃挂起控制、Principal 确认续跑及 Confirmation Surface 互操作；MUST NOT 拆为独立 boolean 开关另行协商 |

`execution_support` 语义约束如下：

1. 若声明 `CONFIRMED`，UTP Runtime MUST 在本会话中支持活跃挂起控制、代表 Principal 的确认续跑（`suspended_action` + 匹配 `suspend_id`，见 确认后续跑）及 确认界面 规定的 Confirmation Surface 互操作语义。
2. 若声明 `SUPERVISED`，UTP Runtime MUST 在本会话中支持 SUPERVISED 控制语义 规定的完整监督语义，含预执行控制事件与窗口内 `utp.hai.interrupt`。
3. 若未声明某 `interaction_level`，处理方对该等级的 `effective_interaction_level` MUST 返回 `HAI_CAPABILITY_MISMATCH` 或 `HAI_CAPABILITY_UNSUPPORTED`。

`session.init` 的 `hai` 对象 MAY 同时携带 最低控制要求 定义的 `minimum_interaction_level`，与 `execution_support` 一并冻结。

### 最低控制要求 {#s-19-10-2}

除 Action 在原语定义文件中的静态 `interaction_level` 外，UTP 商业拓扑中的**各参与方**（如 Buyer、Seller、Payer、Payee、PaymentProcessor、Escrow、Inspector、Arbiter 等，见[商业拓扑](business-topology.md)）MAY 对特定 Action 声明最低控制严格度。处理方 MUST 在 Action 合法后、执行 HAI 控制语义前，按能力求值与差异处理求出**生效控制等级**（`effective_interaction_level`），并据此选择各控制等级的控制路径。

最低控制要求 MAY 来自下列来源；对同一 Action，处理方 MUST 取各来源中的**最严格**等级作为 `required_minimum_level`（严格度排序见 交互控制等级）：

1. **Handler 要求**：执行该 Action 的 Endpoint 所属角色（handler role）在其 UTPProfile、角色绑定 Profile 或签名的 `operation_requirements` 端点（见[信任准入评估中的 SecurityRequirement](security-trust.md)）中声明的 `minimum_interaction_level`。Handler 不限于 Seller；例如 `utp.pay.initiate` 的 handler 可能是 PaymentProcessor 或 Seller，相应 Profile 发布方 MAY 声明最低等级。
2. **会话锁定要求**：`session.init` 握手冻结的 `hai.minimum_interaction_level`，表达本会话各参与方已协商的控制底线（如买方组织策略、托管方条件等）。
3. **SecurityRequirement**：[信任准入评估](security-trust.md) 对受保护操作给出的 `human_confirmation` 等准入约束；若其语义等价于要求人工确认门，处理方 MUST 将其映射为不低于 `CONFIRMED` 的最低要求并纳入求值。

下列示例仅说明 `minimum_interaction_level` 的最小语义要素；MAY 出现在 Handler Profile、`operation_requirements` 响应或 `session.init` 快照中，不构成唯一合法格式：

```json
{
  "hai": {
    "minimum_interaction_level": {
      "utp.purchase.complete": "CONFIRMED",
      "utp.pay.initiate": "CONFIRMED",
      "default": "AUTONOMOUS"
    }
  }
}
```

| 字段 | 类型 | 必填 | 描述 |
| --- | --- | --- | --- |
| `minimum_interaction_level` | object | 否 | 键为 Action 标识或 `default`；值为所需最低 `interaction_level`。具体 Action 条目优先于 `default` |

Action 静态声明的 `interaction_level` MUST NOT 低于本会话适用的 `required_minimum_level`；否则处理方 MUST 返回 `HAI_CAPABILITY_MISMATCH`。CONFIRMED 挂起的 `timeout_ms` 由挂起创建响应中的 Suspend Record 表达（见 挂起记录），MUST NOT 作为 Profile 或会话协商中的 HAI 能力项声明。

### 能力求值与差异处理 {#s-19-10-3}

处理方在 HAI 相关 Action 执行前 MUST 按下列顺序求值：

1. 读取 Action 静态声明的 `interaction_level`（未声明 `hai` 视为 `AUTONOMOUS`，见 HAI 控制剖面）。
2. 按 最低控制要求 汇总 `required_minimum_level`；若静态声明严格度低于 `required_minimum_level`，MUST 返回 `HAI_CAPABILITY_MISMATCH`。
3. 令 `effective_interaction_level = max(静态声明, required_minimum_level)`（按 交互控制等级 严格度排序取较高者）。
4. 将会话 HAI 快照（会话 HAI 快照）的 `execution_support` 与 `effective_interaction_level` 比较；不满足时 MUST 返回下表所列错误。

| 条件 | 要求 |
| --- | --- |
| `effective_interaction_level` 为 `CONFIRMED`，快照未声明 `execution_support.CONFIRMED` | MUST 返回 `HAI_CHANNEL_DENIED` 或 `HAI_CAPABILITY_UNSUPPORTED`；Agent MUST NOT 在无挂起凭证时推进 |
| `effective_interaction_level` 为 `SUPERVISED`，快照未声明 `execution_support.SUPERVISED` | MUST 返回 `HAI_CAPABILITY_MISMATCH`；MUST NOT 在未满足 SUPERVISED 控制语义 语义的情况下继续执行 |
| 依赖 Submission `submission`，快照中 `execution_support.AUTONOMOUS.submission` 不为 `true` | 非阻断提交 MUST NOT 成为必要前提；MAY 改由显式 Agent 动作或本地内部状态处理 |
| 参与方声明的 HAI 要求当前实现不具备 | MUST 返回 `HAI_CAPABILITY_UNSUPPORTED` |

要求更高认证或授权强度的确认流程，MUST 按[认证与授权](identity-authorization.md)与相关原语章转入具备相应能力的确认环境；该要求不改变 `effective_interaction_level` 所适用的控制语义。

### 与 Mandate 机制的关联 {#s-19-10-4}

Mandate 的签发、验证与适用范围以[认证与授权](identity-authorization.md)为准。HAI 仅在确认续跑执行业务 Action 或 narrow Resume 前消费 Mandate 校验结果，不定义 Mandate 求值规则，亦不定义 `interaction_level` 求值规则。

确认续跑执行业务 Action 或 narrow Resume 前，Mandate 覆盖的操作 MUST 按[认证与授权](identity-authorization.md)重新校验 Mandate；校验失败时 MUST NOT 继续执行，并 MUST 返回相应错误（例如 `MANDATE_SCOPE_EXCEEDED`）。

### 最小互操作剖面 {#s-19-10-5}

声称支持 HAI 的实现，其会话快照中的 `execution_support` 至少 MUST 声明 `CONFIRMED`，并满足下列能力：

| 能力 | 要求 |
| --- | --- |
| 控制等级 | MUST 正确实现 交互控制等级 三级 `interaction_level` 语义；求值规则见 能力求值与差异处理 |
| 活跃挂起控制 | MUST 支持活跃 Suspend Record、`suspend_id` 与 超时处理 规定的超时处理 |
| Action Surface / Confirmation Surface | MUST 支持 协议互操作要素 互操作要素、行为契约 行为契约与 确认界面 确认界面特化约束 |
| 数据隔离 | MUST 支持 V2 数据隔离与 Data Source 权威读取约束（数据可见性与 Data Source） |
| 确认后续跑 | MUST 支持 `suspended_action` 确认续跑；MAY 支持 narrow `resume` / `cancel` |
| 证据与完整性 | MUST 支持对适用身份、授权、证据与完整性 Profile 的衔接；`data_hash` 一致性检查仅在相应 Profile 适用时要求 |
| 会话能力声明 | MUST 支持 会话 HAI 快照 会话 HAI 快照 |

`SUPERVISED` 与 `AUTONOMOUS.submission` 属于增强能力：仅当 `execution_support` 声明相应等级或可选特性时，实现方 MUST 满足对应章节语义。

---

## 错误码 {#s-19-11}

| 错误码 | 可恢复 | 描述 | 恢复建议 |
| --- | --- | --- | --- |
| `HAI_CONTEXT_REQUIRED` | 是 | 对 `CONFIRMED` Action 的调用缺少有效 `suspend_id`；处理方已返回已有或新建的 HAI 上下文，且未执行业务副作用 | 由 Principal 完成确认续跑，或使用返回的 HAI 上下文进入确认界面 |
| `HAI_CHANNEL_DENIED` | 否 | UTP Runtime 不支持代表 Principal 确认续跑，或当前 Action 不允许该发起方提交 | 选择 `execution_support` 声明 `CONFIRMED` 的 UTP Runtime，或调整 Action 声明 |
| `HAI_CAPABILITY_MISMATCH` | 否 | UTP Runtime 不支持 `effective_interaction_level` 所需 HAI 能力，或 Action 静态声明严格度低于适用的最低控制要求 | 升级 UTP Runtime 能力，或调整 Action 的 `interaction_level` 声明与各来源的最低要求 |
| `HAI_CONTROL_CHANNEL_UNAVAILABLE` | 是 | 缺少可用于提交 resume/cancel 的 HAI 控制通道 | 建立控制通道后再进入 CONFIRMED；SUPERVISED 实时 interrupt 缺失时 MUST 返回 `HAI_CAPABILITY_MISMATCH` |
| `HAI_DATA_SOURCE_FORBIDDEN_TO_AGENT` | 否 | Agent 请求将 HAI 控制读取结果交付至其可见链 | 改由 UTP Runtime / Surface 读取权威数据，或改由业务原语返回可见结果 |
| `HAI_SURFACE_INTEGRITY_MISMATCH` | 是 | 适用完整性 Profile 时，surface_hash / data_hash 不一致 | 重新获取 Surface 与数据后重试 |
| `HAI_EVIDENCE_INVALID` | 是 | 确认控制点所需的身份/授权/证据绑定缺失或不满足要求 | 补齐对应验证结果或重新进入满足要求的确认环境 |
| `HAI_CAPABILITY_UNSUPPORTED` | 否 | 当前实现缺少所需 HAI 能力 | 选择支持相应能力的实现或降级 |
| `SUSPEND_EXPIRED` | 是 | 活跃挂起控制已超时 | 重新发起操作触发新的挂起控制 |
| `SUSPEND_ALREADY_ACTIVE` | 否 | 会话已有活跃挂起控制，且本次请求会创建新挂起或推进非只读 Action | 等待当前挂起解决，或返回已有挂起语义供 UI 重展示 |
| `RESUME_INVALID_SUSPEND_ID` | 否 | `suspend_id` 不存在、不属于当前会话，或请求 `action` 与挂起 `suspended_action` 不匹配 | 检查 `suspend_id` 与 `action` 是否与当前挂起一致 |
| `RESUME_CONFLICT` | 否 | 同一 suspend_id 已收到 Resume 或 Cancel | 操作已完成，无需重复 |
| `DATA_VISIBILITY_VIOLATION` | 否 | Agent 可见响应违反 数据可见性规范 可见性约束 | 按 数据可见性规范 裁剪 Agent 可见内容后重试 |
| `INTEGRITY_CHECK_FAILED` | 是 | 引用数据已变更 | 重新获取数据并重新确认 |
| `MANDATE_SCOPE_EXCEEDED` | 是 | 操作超出 Mandate 授权范围 | 请求 Principal 签发新 Mandate 或重新发起确认流程 |
| `SUBMISSION_INVALID` | 否 | Submission 中的 `action` / `payload` 不符合当前 Surface 约定或违反 数据可见性规范 可见性约束 | 按 Submission 修正 Submission 语义或重新提交 |
| `INTERRUPT_WINDOW_EXPIRED` | 否 | 中断请求超出时间窗口 | 操作已自动执行 |
| `DATA_SOURCE_UNAVAILABLE` | 是 | `data_source.action_ref` 所引用 Action 不可用 | 重试或触发 Cancel |

---

## 安全考量 {#s-19-12}

| 威胁 | 防护机制 |
| --- | --- |
| 协议标识与本地实现标识混用 | 协议使用 `suspend_id` 作为权威挂起标识；本地实现标识只能作为实现内部映射使用 |
| 挂起凭据复用或错配 | 每个 `suspend_id` MUST 仅绑定一个 `suspended_action` 与一次确认尝试；MUST NOT 跨 Action 复用；已关闭挂起 MUST NOT 接受续跑 |
| Agent 自行 resume 或伪造 Principal 确认续跑 | 确认续跑 MUST 由代表 Principal 的 UTP Runtime 提交 `suspended_action` + 匹配 `suspend_id`；Agent MUST 被阻断；UTP Runtime MUST 阻断 Agent 对 `CONFIRMED` Action 的无凭证续跑 |
| `suspend_id` 泄漏至 LLM | UTP Runtime MUST 将 `suspend_id` 与 Agent 推理上下文隔离，并仅在代表 Principal 提交后续 Action 时使用；Agent 可见响应 MUST NOT 含 `suspend_id` 明文 |
| Agent 绕过 `CONFIRMED` 执行门 | 处理方 MUST 依据 Action 声明的 `interaction_level` 检查执行门；Agent 在无合法 `suspend_id` 时处理方 MUST 返回 HAI 信封或 `HAI_CONTEXT_REQUIRED`，并拒绝推进性原语 |
| Resume/Cancel 伪造 | MUST 携带会话级认证令牌，验证与 `suspend_id` 关联；触发方 MUST 为代表 Principal 的 UTP Runtime |
| 无限期挂起 | 所有活跃挂起控制 MUST 设置 `timeout_ms`；超时 MUST 将 Suspend Record 置为 `EXPIRED` 并解除活跃挂起控制 |
| 重放攻击 | 处理方 MUST 将 `suspend_id` 的有效性、会话、主体和目标 Action 进行关联校验；写 Action 的幂等性按原语框架规则处理 |
| Surface 数据篡改 | 适用完整性 Profile 时，Data Source 响应 SHOULD 携带强完整性证明；处理方按该 Profile 校验数据或 Surface 的完整性绑定 |
| V2 数据泄漏 | Agent 不得请求将 HAI 控制读取结果交付至其可见链；处理方 MUST 按数据可见性规则裁剪 V2 响应 |
| LLM 幻觉导致错误确认 | Confirmation Surface 数据来自权威源，非 Agent 推理输出 |
| 过期数据确认 | refresh_strategy=strict 强制确认前重新获取或校验 |
| 确认控制点证据不足 | 本次确认所需认证、授权与证据绑定结果必须可由《身份与授权》与《风控与审计》体系验证 |
| 提交信息注入攻击 | 仅允许受控结构化提交；V2 数据禁入；不得直接触发状态迁移 |
| SUPERVISED 窗口绕过 | `interrupt_window_ms` 为权威窗口计时，Agent 无法缩短 |
| Data Source 滥用 | 处理方仅向已认证会话交付受控数据，MUST 验证 `action_ref`、附加参数与业务锚点归属 |

---

> **以下附录为信息性内容**，不构成规范性要求。

---

## 附录 H：Confirmation Surface 实现方案参考 {#s-appendix-h}

### H.5 Confirmation Surface 实现方案选型指南 {#s-h-5}

| 维度 | 沙箱化应用卡片 | 协议化声明式 UI | Web 页面重定向 | 原生组件 |
| --- | --- | --- | --- | --- |
| **代表性技术** | MCP Apps（`io.modelcontextprotocol/ui`）、iframe 应用 | A2UI v0.9+/v1.0 声明式组件树 | 商家确认页、支付机构页面 | iOS / Android / Desktop 原生组件 |
| **挂起控制能力** | 外部控制通道驱动 | 取决于配套执行环境 | 回调驱动 | 由本地原生实现 |
| **集成深度** | 中 | 深 | 浅 | 最深 |
| **跨客户端兼容** | 中到高，取决于宿主能力支持情况 | 中，取决于 UTP Runtime 实现 | 高 | 低（本地实现约束较强） |
| **UI 定制度** | 中到高，受宿主容器限制 | 高 | 由确认环境控制 | 最高 |
| **数据隔离** | 依赖沙箱与宿主权限控制 | 依赖本地渲染层、组件权限与受控数据通道 | 依赖独立页面、服务端会话与回调机制 | 依赖本地原生安全边界 |
| **开发成本** | 中 | 高 | 低 | 最高 |

UTP Runtime MAY 在不同场景下混合使用多种方案。所有方案均须满足 行为契约 的行为契约、数据可见性规范 的数据边界、Data Source 的权威读取约束和 HAI 会话能力与控制要求 的能力声明要求。

选型原则如下：

- 低到中风险确认：优先选择开发成本较低、可快速复用的模式。
- 需要深度定制但仍要受控隔离：优先选择声明式或原生模式。
- 高风险支付与授权：优先选择安全边界最清晰的独立页面或原生模式。

确认界面的提交结果应按对应原语定义的 input 语义接入后续步骤。HAI 负责执行门、校验与控制结果交接。

所有方案均 MUST 满足 行为契约 定义的六项行为契约，并通过 HAI 能力快照（见 会话 HAI 快照）声明其能力边界。
