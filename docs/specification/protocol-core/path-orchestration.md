---
title: 路径编排
section: protocol-core
owner: protocol-architecture
status: drafting
version: 2026-07-30
---

# 路径编排（Path Orchestration） {#s-18-path-orchestration}

本章规定 UTP Runtime 如何将已经锁定的采购 Mode、商业拓扑、发现与协商结果和原语契约编译为可执行路径，并在运行时只开放当前上下文允许的 Action。路径编排是发起方的本地 Runtime 能力，可以由调用方 SDK 或平台运行时实现。

路径编排的核心输出是业务语义、调用角色方向与状态机衔接；通信层在每次请求前依据 `service_catalogs`、目标 Action 的 `transport_bindings` 与当前 `HandlerRole` 确认本次投递方式。

---

## 总体时序 {#s-181}

除首次建立路径外，后续每次 Action 都从当前 DAG、StateView 与 `available_actions` 开始；它不因通信绑定变化而重新生成路径。

![路径编排总体时序](/documentation/assets/diagrams/path-orchestration-overall-flow.svg)

## 编排输入 {#s-182}

路径编排位于发现与协商、商业建模、原语执行和通信之间。它将上游已经确定的事实编译为受约束的行动空间，并以状态机提交结果持续更新该空间。

| 模块 | 向路径编排提供 | 路径编排如何使用 |
| --- | --- | --- |
| [采购模式](/documentation/specification/protocol-core/procurement-models.html) | 已锁定的 `SelectedMode` 及其对原语/Action 的裁剪规则 | 展开或裁剪业务路径。 |
| [商业拓扑](/documentation/specification/protocol-core/business-topology.html) | Role、业务关系和已锁定的拓扑快照 | 验证角色关系与调用方向。 |
| [发现与协商](/documentation/specification/protocol-core/discovery-negotiation.html) | `relation_compatibilities`、已选 Primitive/扩展、`role_domain_bindings` 与 `service_catalogs` | 以兼容 Primitive/扩展确定路径可用范围，并向通信层提供逐请求投递所需的 `service_catalogs`。 |
| [P0 原语通用框架](/documentation/specification/protocol-core/primitive-framework.html) | Action 的 `initiator_role`、`handler_role`、Schema、`execution_result` 与 `valid_next_actions` | 定义 Action 的业务契约；路径编排不解释原语内部业务事实。 |
| [全局状态机](/documentation/specification/protocol-core/global-state-machine.html) | StateView、Action 守卫、迁移、补偿和超时结论 | 路径编排在规定时点调用状态机，不自行裁定状态迁移。 |
| [人机协同交互](/documentation/specification/protocol-core/human-agent-interaction.html) | 生效控制等级、挂起与恢复语义 | 路径编排执行其控制门；不解释人工确认、授权或证据本身。 |

处理方在本域完成 Schema、业务资源、权限和幂等校验；状态机提交全局状态。路径编排以这些已定义的协议事实为基础形成和更新行动空间。

## DAG 生成 {#s-183}

**生成前提。**

新路径的生成 MUST 使用同一会话或商业上下文中已经锁定的下列输入：

1. `selected_mode`：采购模式已确定的全部维度取值；未启用的 Primitive、Action 或行为变体不得进入路径。
2. `commerce_topology`：Role 节点、角色关系及其不可变引用；它只描述业务责任结构。
3. `NegotiationResult.relation_compatibilities`：每个关系对可共同使用的 Primitive、版本和扩展；未共同协商的 Primitive、扩展或 Action 不得进入路径。
4. 原语与扩展的规范定义：用于取得 Action 的唯一 `initiator_role`、唯一 `handler_role`、输入输出 Schema、状态影响和 Mode 约束。

`role_domain_bindings` 证明运行时 Role 已由经过发现的业务域承担；它不使路径编排取得投递地址。`service_catalogs` 也不是 DAG 输入：它只由通信层在每次请求前读取。

**`execution_dag`。**

对每个锁定的 Mode、拓扑和协商快照组合，路径编排 MUST 生成一个本地 `execution_dag`。DAG 是结构、角色与 Action 范围的运行时快照，不是协议网络实体，不要求任何 Endpoint 执行“创建 DAG”操作。

```text
execution_dag
├─ dag_id
├─ selected_mode_ref
├─ topology_ref
├─ negotiation_ref
├─ nodes[]
│  ├─ node_id
│  ├─ primitive
│  ├─ actions[]
│  ├─ initiator_role
│  └─ handler_role
├─ edges[]
│  ├─ from_node_id
│  └─ to_node_id
└─ entry_node_ids[]
```

每个节点代表一个 Primitive 的已允许 Action 范围和唯一的角色方向。节点中的 `initiator_role` 与 `handler_role` MUST 与 Action 定义一致，并且必须能在锁定拓扑及已协商关系中验证。DAG 保存节点、依赖边、角色方向与 Action 范围。

生成时，路径编排 MUST 先按 Mode 和原语组合规则形成节点及结构边，再以拓扑验证各节点所需的角色关系，最后以 `relation_compatibilities` 过滤未协商的 Primitive、版本和扩展。边只表达原语节点之间的结构性衔接；节点不得编码状态条件、业务条件或传输条件。Resolve 等横切原语只有在 Mode、拓扑和协商结果均允许时才能作为可从适用节点激活的节点加入。

## 状态机初始化 {#s-184}

新 DAG 生成后，路径编排 MUST 调用状态机 `initialize_state_view` 形成初始 `trade_context_id` 与 INIT StateView。初始化不执行原语 Action，也不等同于业务状态迁移。

若调用携带既有 `trade_context_id`，状态机初始化只读取该上下文的权威 StateView，不得新建上下文或重置状态。只有新建商业上下文且不存在既有 `trade_context_id` 时，才创建初始 StateView。初始化的核心输出是可被后续状态守卫和状态机推进引用的 `trade_context_id`、StateView 及其版本；路径编排不得以本地缓存替代该输出。

## 路径选择 {#s-185}

路径编排向发起方运行时交付下列本地运行时结果：

```text
dag_id + execution_dag + StateView + available_actions
```

路径编排的核心输出由下表界定：

| 输出 | 含义 | 使用边界 |
| --- | --- | --- |
| `execution_dag` | 本次上下文中的节点、结构依赖、角色方向与允许的 Action 范围。 | 是执行结构快照，不是网络实体，也不包含投递地址或传输绑定。 |
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

所有前置校验通过后，路径编排将完整 P0 ActionRequest、`handler_role`、`dag_id` 及不可变 Mode/拓扑引用交给通信层。通信层 MUST 在每次请求前确认本次可用的 Service、Endpoint 和传输绑定。前置校验拒绝或挂起时，调用链停在本地并保持当前 StateView。

请求发起的核心输出是一次可由通信层投递的 ActionRequest；它保留调用方提供的 `session_id`、适用的 `idempotency_key` 与 `input`，并关联当前唯一的 `handler_role`。

## 响应处理 {#s-188}

响应处理只接受处理方返回的完整 P0 `ActionResponse`。其中 `execution_result = PENDING` 是已获得的标准响应，必须进入下一步的状态机推进；它不等同于调用观察结果未知。路径编排不得把 `execution_result`、`primitive_state`、业务输出或某个参与方的本地状态直接解释为全局状态迁移。

网络超时、连接中断或响应丢失只表示本次调用观察结果未知，不是 `ActionResponse`，也不得伪造为 `FAILURE`。此时路径编排 MUST 保留原请求的会话与幂等上下文，并通过通信层的重试、查询或异步通知恢复；在获得标准响应前，不得开放依赖该结果的后续业务 Action。

## 状态机推进 {#s-189}

收到标准响应后，路径编排 MUST 调用 `commit_state_transition`。状态机使用 `evaluate_result`，结合执行前 StateView、ActionResponse、Mode 与 DAG 语义裁定并提交权威 StateView；提交后的 StateView 是本节点的核心输出。

路径编排随后使用最新 StateView 和“路径选择”的规则覆盖上一轮 `available_actions`。若状态机要求补偿或给出超时结论，路径编排 MUST 通过状态机的补偿或超时能力取得既有原语 Action，再将其纳入同一套 DAG、状态守卫和 HAI 约束；不得绕过正常执行链直接调用补偿处理方。

## DAG 生命周期 {#s-1810}

`execution_dag` 对其锁定的 Mode、拓扑和协商快照不可变。Mode、商业拓扑或协商结果发生变化、失效或需要更换时，路径编排 MUST 创建新的 DAG，并为新路径建立新的初始 StateView；不得原地修改既有 DAG 或复用其 `dag_id`。

旧 DAG 转为只读历史：它不再提供新的业务 `available_actions`，仅允许状态查询、结果确认、幂等恢复或状态机定义的收尾与补偿。旧路径中的结果只有在上游明确作为新路径输入并已通过适用的授权、Mode、拓扑与状态校验时才能复用；路径编排不得隐式继承旧 DAG 的 StateView、候选 Action 或投递信息。

以下示例说明职责分界：

```text
锁定 Mode + Topology + NegotiationResult
  → 路径编排生成新的 DAG
  → 状态机初始化 INIT StateView
  → 调用方从 available_actions 选择 Action
  → 路径编排完成约束校验并发起请求
  → 通信层每次请求前确认 Service + Endpoint + transport
  → 处理方返回 ActionResponse(valid_next_actions)
  → 状态机推进并提交 StateView
  → 路径编排过滤并返回新的 available_actions
```

上例中，通信层可以在不同请求中使用同一已验证 Service 目录中的不同兼容绑定；这不构成路径变更。只有影响 Mode、拓扑或协商能力范围的变化才触发新的 DAG。
