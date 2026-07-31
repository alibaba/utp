---
title: 路径编排
section: protocol-core
owner: protocol-architecture
status: drafting
version: 2026-07-30
---

# 路径编排（Path Orchestration） {#s-18-path-orchestration}

本章规定 UTP Runtime 如何从商业拓扑、发现与协商结果和原语契约中选择 Mode，并编译为可执行路径；运行时只开放当前上下文允许的 Action。路径编排是发起方的本地 Runtime 能力，可以由调用方 SDK 或平台运行时实现。

路径编排的核心输出是业务语义、调用角色方向与状态机衔接；通信层在每次请求前依据 `service_catalogs`、目标 Action 的 `transport_bindings` 与当前 `HandlerRole` 确认本次投递方式。

---

## 总体时序 {#s-181}

除首次建立路径外，后续每次 Action 都从当前 DAG、StateView 与 `available_actions` 开始；它不因通信绑定变化而重新生成路径。

![路径编排总体时序](/documentation/assets/diagrams/path-orchestration-overall-flow.svg)

## 编排输入 {#s-182}

路径编排位于发现与协商、商业建模、原语执行和通信之间。它将上游已经确定的事实编译为受约束的行动空间，并以状态机提交结果持续更新该空间。

| 模块 | 向路径编排提供 | 路径编排如何使用 |
| --- | --- | --- |
| [采购模式](/documentation/specification/protocol-core/procurement-models.html) | 六维 Level 的语义及其对原语/Action 的裁剪规则 | 在 DAG 生成时从协商交集中选择确定 `mode`，再展开或裁剪业务路径。 |
| [商业拓扑](/documentation/specification/protocol-core/business-topology.html) | Role、业务关系和已锁定的拓扑快照 | 验证角色关系与调用方向。 |
| [发现与协商](/documentation/specification/protocol-core/discovery-negotiation.html) | `relation_compatibilities`、已选 Primitive/扩展、`role_domain_bindings` 与 `service_catalogs` | 以兼容 Primitive/扩展确定路径可用范围，并向通信层提供逐请求投递所需的 `service_catalogs`。 |
| [P0 原语通用框架](/documentation/specification/protocol-core/primitive-framework.html) | Action 的 `initiator_role`、`handler_role`、Schema、`execution_result` 与 `valid_next_actions` | 定义 Action 的业务契约；路径编排不解释原语内部业务事实。 |
| [全局状态机](/documentation/specification/protocol-core/global-state-machine.html) | StateView、Action 守卫、迁移、补偿和超时结论 | 路径编排在规定时点调用状态机，不自行裁定状态迁移。 |
| [人机协同交互](/documentation/specification/protocol-core/human-agent-interaction.html) | 生效控制等级、挂起与恢复语义 | Provider 在 Action 执行边界应用控制门；路径编排仅使用其业务结果更新行动空间，不解释或校验 HAI 语义。 |

处理方在本域完成 Schema、业务资源、权限和幂等校验；状态机提交全局状态。路径编排以这些已定义的协议事实为基础形成和更新行动空间。

## DAG 生成 {#s-183}

### 生成输入

新路径的生成 MUST 使用同一商业上下文中锁定的下列输入：

1. `commerce_topology`：Role 节点、关系及其不可变引用；它只描述业务责任结构。
2. 成功的 `NegotiationResult`：其中的 `relation_compatibilities` 提供关系级 Primitive、扩展及 `common_mode_range`，`role_domain_bindings` 证明 Role 承担关系，`service_catalogs` 是冻结的服务目录快照。
3. 原语与扩展定义：用于取得 Action 的唯一 `initiator_role`、唯一 `handler_role`、Mode 约束和状态影响。

`selected_mode` 不是路径编排的输入。路径编排从 `NegotiationResult` 的关系级 Mode 交集生成本次 DAG 的确定 `mode`。`service_catalogs` 必须原样写入 DAG；编排阶段不得筛选、排序、合并、替换，也不得选择具体的 Service、Endpoint 或传输绑定。

### 核心骨架（`primitive_dag_skeleton`）

`primitive_dag_skeleton` 定义稳定的核心原语结构。路径编排先从 `relation_compatibilities` 取得各关系共同支持的 Primitive、版本和扩展，形成候选 `active_primitives`，再按下列规则生成节点和结构边：

```text
Source → Negotiate → Purchase → Pay → Fulfill
```

1. `Source` 是核心主链的入口节点。
2. 当生成的 `mode` 满足 `pricing_mode = L3` 或 `decision_path ∈ {L2, L3}`，且 `utp.negotiate` 已协商兼容时，保留 `Source → Negotiate → Purchase`。
3. 其他情况下不加入 `Negotiate`，使用压缩边 `Source → Purchase`。
4. `Purchase → Pay` 与 `Pay → Fulfill` 是强前置依赖；图不得生成绕过它们、反向流转或形成环的边。
5. `Resolve` 只有在对应关系已协商兼容、拓扑存在所需角色且原语定义允许时，才作为异常或补偿节点加入；其激活条件仍由状态机、原语定义和 `valid_next_actions` 判定。

```json
{
  "kind": "utp.primitive_dag_skeleton",
  "input_refs": [
    "commerce_topology",
    "NegotiationResult.relation_compatibilities",
    "NegotiationResult.role_domain_bindings",
    "NegotiationResult.service_catalogs"
  ],
  "canonical_order": ["utp.source", "utp.negotiate", "utp.purchase", "utp.pay", "utp.fulfill"],
  "mandatory_predecessors": {
    "utp.pay": ["utp.purchase"],
    "utp.fulfill": ["utp.pay"]
  },
  "exception_primitives": ["utp.resolve"],
  "forbidden_edges": [
    ["utp.source", "utp.pay"],
    ["utp.source", "utp.fulfill"],
    ["utp.negotiate", "utp.pay"],
    ["utp.negotiate", "utp.fulfill"],
    ["utp.purchase", "utp.fulfill"],
    ["utp.fulfill", "utp.pay"]
  ]
}
```

### Mode 选择与生成算法

1. 校验 `NegotiationResult.status = succeeded`，并按核心骨架和拓扑解析候选节点所需的角色关系。
2. 从每个必需角色关系的 `relation_compatibilities` 取得 `common_mode_range`，按六个 Mode 维度求交集，形成本次路径的有效 Mode 范围。
3. 对每个维度按 `L0 → L1 → L2 → L3` 的固定顺序选择交集中的最低可用 Level，生成完整且确定的 `mode`。任一必需维度为空时，MUST 不生成 DAG，并按 P0 错误框架返回编排失败。
4. 以该 `mode` 过滤候选 `active_primitives`，再按 `primitive_dag_skeleton` 创建节点、压缩边、强前置边及适用的异常节点。
5. 校验每个节点的角色方向与拓扑一致、Primitive/扩展属于对应关系的协商结果、每条边满足骨架规则且图无环。
6. 将 `NegotiationResult.service_catalogs` 原样复制到 `execution_dag.service_catalogs`，返回不可变的 `execution_dag`。

### 运行期执行 DAG 示例

`execution_dag` 是本地执行快照，不是协议网络实体；它记录生成后的 `mode`、节点、角色方向、结构依赖和协商服务目录。状态机和后续请求均使用其中冻结的 `mode`，而不是重新选择 Mode。

```text
execution_dag
├─ dag_id
├─ mode                         # DAG 生成阶段选择的六维确定值
├─ topology_ref
├─ negotiation_ref
├─ service_catalogs[]
├─ nodes[]
│  ├─ node_id
│  ├─ primitive
│  ├─ actions[]
│  ├─ initiator_role
│  └─ handler_role
├─ edges[]
└─ entry_node_ids[]
```

| 字段 | 说明 |
| --- | --- |
| `dag_id` | 本次 DAG 的本地标识。 |
| `mode` | 由关系级 `common_mode_range` 交集按最低兼容级生成的完整六维 Mode。 |
| `topology_ref`、`negotiation_ref` | 生成该图所依据的商业拓扑和协商结果快照。 |
| `service_catalogs` | 唯一 `NegotiationResult.service_catalogs` 的完整原样快照；可携带端点声明，但不代表已选定服务或端点。 |
| `nodes` | 原语、允许的 Action 和唯一角色方向；节点不得保存 `selected_service_id`、`endpoint` 或具体传输绑定。 |
| `edges`、`entry_node_ids` | 原语节点之间的结构依赖与入口节点。 |

以下示例展示未加入 `Negotiate` 的压缩主链。节点只表达业务原语及角色，通信层在请求时才解析实际投递方式。

```json
{
  "dag_id": "dag-20260731-001",
  "mode": {
    "pricing_mode": "L0",
    "decision_path": "L0",
    "payment_structure": "L0",
    "fulfillment_structure": "L0",
    "relationship_mode": "L0",
    "compliance_level": "L0"
  },
  "topology_ref": "commerce_topology:topology-001",
  "negotiation_ref": "NegotiationResult:negotiation-001",
  "service_catalogs": [
    {
      "roles": ["Seller"],
      "services": [{ "id": "seller-rest", "transport": "rest", "endpoint": "https://seller.example.com/utp" }]
    },
    {
      "roles": ["PaymentProcessor"],
      "services": [{ "id": "payment-rest", "transport": "rest", "endpoint": "https://payment.example.com/utp" }]
    }
  ],
  "nodes": [
    { "node_id": "P1", "primitive": "utp.source", "actions": ["utp.source.search"], "initiator_role": "Buyer", "handler_role": "Seller" },
    { "node_id": "P3", "primitive": "utp.purchase", "actions": ["utp.purchase.create"], "initiator_role": "Buyer", "handler_role": "Seller" },
    { "node_id": "P4", "primitive": "utp.pay", "actions": ["utp.pay.initiate"], "initiator_role": "Buyer", "handler_role": "PaymentProcessor" },
    { "node_id": "P5", "primitive": "utp.fulfill", "actions": ["utp.fulfill.receive"], "initiator_role": "Seller", "handler_role": "Buyer" }
  ],
  "edges": [
    { "from_node_id": "P1", "to_node_id": "P3" },
    { "from_node_id": "P3", "to_node_id": "P4" },
    { "from_node_id": "P4", "to_node_id": "P5" }
  ],
  "entry_node_ids": ["P1"]
}
```

通信层使用 `execution_dag.service_catalogs`、节点的 `handler_role` 与目标 Action 的传输绑定，在每次请求时确定可用的 Service、Endpoint 和传输方式；该决定不回写 DAG，也不改变其服务目录快照。

## 状态机初始化 {#s-184}

新 DAG 生成后，路径编排 MUST 使用 `execution_dag.mode` 调用状态机 `initialize_state_view`，形成初始 `trade_context_id` 与 INIT StateView。初始化不执行原语 Action，也不等同于业务状态迁移。

若调用携带既有 `trade_context_id`，状态机初始化只读取该上下文的权威 StateView，不得新建上下文或重置状态。只有新建商业上下文且不存在既有 `trade_context_id` 时，才创建初始 StateView。初始化的核心输出是可被后续状态守卫和状态机推进引用的 `trade_context_id`、StateView 及其版本；路径编排不得以本地缓存替代该输出。

## 路径选择 {#s-185}

路径编排向发起方运行时交付下列本地运行时结果：

```text
dag_id + execution_dag + StateView + available_actions
```

路径编排的核心输出由下表界定：

| 输出 | 含义 | 使用边界 |
| --- | --- | --- |
| `execution_dag` | 本次上下文中的 `mode`、节点、结构依赖、角色方向、允许的 Action 范围及冻结的 `service_catalogs`。 | 是执行结构快照，不是网络实体；目录可透传端点声明，但不包含已选定的服务、端点或传输绑定。 |
| `StateView` | 状态机提交的当前协议阶段、标识与版本。 | 是下一次状态校验与路径更新的输入；路径编排不得自行改写。 |
| `available_actions` | 当前 DAG 中依赖已满足、已通过 Mode、拓扑、协商与状态守卫过滤的候选 Action。 | 调用方只能从此集合提交下一次 Action，且每次执行前仍须完成全部前置校验。 |
| 控制或恢复结论 | 前置校验的阻止/挂起结果，或状态机给出的补偿、超时结论。 | 决定保持当前路径、激活既有补偿 Action，或等待恢复；不得伪造 ActionResponse。 |

`available_actions` 是当前 DAG 中可由调用方选择的完整 Action 名称集合。每个条目至少包含 `action` 与 `description`；其角色方向已由 DAG 唯一确定。调用方 MUST 选择 `dag_id`、Action 并按 P0 提供 `session_id`、适用的 `idempotency_key` 和 `input`。调用方 MUST NOT 传入节点、角色、处理方或投递信息，也不得直接调用业务处理方。

**可用动作。**

初始候选来自 DAG 入口节点中已协商、被 Mode 启用且满足初始状态守卫的 Action。一次标准 `ActionResponse` 返回后，后续候选只能来自其 `valid_next_actions`；空数组表示该响应没有提出后续候选。

对每个候选，路径编排 MUST 依次确认：

1. Action 属于当前 DAG 的节点 Action 范围，且其 Primitive 与扩展已在协商结果中启用；
2. Action 位于当前执行节点，或位于该节点允许到达的直接后继节点；
3. Action 的唯一角色方向仍符合锁定的拓扑和 Mode；
4. 状态机 `validate_action_by_state` 对当前 StateView 返回允许；
5. 通过全部检查后按完整 Action 名称去重，形成新的 `available_actions`。

`valid_next_actions` 只是原语处理方提出的候选，不表示该 Action 已对调用方最终开放。路径编排不得依据原语的业务输出、`primitive_state` 或传输结果自行创造候选。某个 Action 在后续响应中再次出现且再次通过全部检查时 MAY 重新进入行动空间；DAG 不保存循环条件或重复执行条件。

## 约束校验 {#s-186}

调用方提交外部原语调用时，所有推进性 Action MUST 经由下列本地调用链：

```text
调用方选择 dag_id + Action + P0 input
  → 路径编排解析当前节点与唯一角色方向
  → 活跃挂起检查、状态守卫、授权/风控与 HAI 控制
  → 通信层逐请求确认投递方式并发送 ActionRequest
  → 处理方返回 P0 ActionResponse
  → 状态机提交结果，路径编排更新行动空间
```

路径编排 MUST 按以下顺序执行前置约束：

1. 检查当前会话是否存在活跃的人机协同挂起；存在时，除挂起恢复、取消或已声明只读操作外，不得推进普通业务 Action。
2. 校验 `dag_id`、Action 与当前 `available_actions`，并将其唯一解析为 DAG 节点、`initiator_role` 和 `handler_role`。
3. 调用 `validate_action_by_state(execution_dag, StateView, action)`；拒绝时不得发送原语请求。
4. 适用时执行身份授权和风控章节规定的准入校验；该校验不替代处理方的最终业务裁定。
5. 按人机协同章节求值生效控制等级。需要挂起或人工确认时，创建或返回既有挂起语义，且不得发送原语请求。

## 请求发起 {#s-187}

所有前置校验通过后，路径编排将完整 P0 ActionRequest、`handler_role`、`dag_id`、`execution_dag.mode`、拓扑引用及 `execution_dag.service_catalogs` 交给通信层。通信层 MUST 在每次请求前依据目录快照和目标 Action 的传输绑定，确认本次可用的 Service、Endpoint 和传输方式。前置校验拒绝或挂起时，调用链停在本地并保持当前 StateView。

请求发起的核心输出是一次可由通信层投递的 ActionRequest；它保留调用方提供的 `session_id`、适用的 `idempotency_key` 与 `input`，并关联当前唯一的 `handler_role`。

## 响应处理 {#s-188}

响应处理只接受处理方返回的完整 P0 `ActionResponse`。其中 `execution_result = PENDING` 是已获得的标准响应，必须进入下一步的状态机推进；它不等同于调用观察结果未知。路径编排不得把 `execution_result`、`primitive_state`、业务输出或某个参与方的本地状态直接解释为全局状态迁移。

网络超时、连接中断或响应丢失只表示本次调用观察结果未知，不是 `ActionResponse`，也不得伪造为 `FAILURE`。此时路径编排 MUST 保留原请求的会话与幂等上下文，并通过通信层的重试、查询或异步通知恢复；在获得标准响应前，不得开放依赖该结果的后续业务 Action。

## 状态机推进 {#s-189}

收到标准响应后，路径编排 MUST 调用 `commit_state_transition`。状态机使用 `evaluate_result`，结合执行前 StateView、ActionResponse、Mode 与 DAG 语义裁定并提交权威 StateView；提交后的 StateView 是本节点的核心输出。

路径编排随后使用最新 StateView 和“路径选择”的规则覆盖上一轮 `available_actions`。若状态机要求补偿或给出超时结论，路径编排 MUST 通过状态机的补偿或超时能力取得既有原语 Action，再将其纳入同一套 DAG、状态守卫和 HAI 约束；不得绕过正常执行链直接调用补偿处理方。

## DAG 生命周期 {#s-1810}

`execution_dag` 对其生成的 `mode`、拓扑和协商快照不可变。商业拓扑或协商结果发生变化、失效，或重新计算出的 Mode 发生变化时，路径编排 MUST 创建新的 DAG，并为新路径建立新的初始 StateView；不得原地修改既有 DAG 或复用其 `dag_id`。

旧 DAG 转为只读历史：它不再提供新的业务 `available_actions`，仅允许状态查询、结果确认、幂等恢复或状态机定义的收尾与补偿。旧路径中的结果只有在上游明确作为新路径输入并已通过适用的授权、Mode、拓扑与状态校验时才能复用；路径编排不得隐式继承旧 DAG 的 StateView、候选 Action 或投递信息。

以下示例说明职责分界：

```text
Topology + NegotiationResult
  → 路径编排选择 Mode 并生成新的 DAG
  → 状态机初始化 INIT StateView
  → 调用方从 available_actions 选择 Action
  → 路径编排完成约束校验并发起请求
  → 通信层每次请求前确认 Service + Endpoint + transport
  → 处理方返回 ActionResponse(valid_next_actions)
  → 状态机推进并提交 StateView
  → 路径编排过滤并返回新的 available_actions
```

上例中，通信层可以在不同请求中使用同一已验证 Service 目录中的不同兼容绑定；这不构成路径变更。只有影响 Mode、拓扑或协商能力范围的变化才触发新的 DAG。
