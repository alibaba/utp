---
title: 协议概览
section: concepts
owner: protocol-architecture
status: drafting
---

# 协议概览

UTP（Universal Trade Protocol）将采购交易中需要跨方一致理解的商业事实、动作、状态和控制要求表达为可协商的协议。它不预设某一种行业流程或单一系统架构，而是将采购模式、角色关系、原语、扩展、传输绑定和信任控制组合为一笔交易的执行路径。

本页按交易建立和执行的顺序介绍 UTP。各章节中的 Schema、字段和规范性要求是权威定义；本页不新增协议对象或运行时规则。

## 命名空间治理

UTP 通过稳定标识、受控扩展和协商版本，让参与方能够明确地识别“正在调用什么能力”。原语、Action、扩展和传输配置属于不同层次，不能互相推导或替代。

| 对象 | 标识规则 | 治理含义 |
| --- | --- | --- |
| 核心 Primitive | `utp.{primitive}` | 表示标准化的业务能力，例如 `utp.source`、`utp.purchase`。 |
| 核心 Action | `utp.{primitive}.{action}` | 表示可调用的协议动作，例如 `utp.source.search`。 |
| 官方扩展 | `utp.{primitive}_{extension-domain}` | 将扩展域附着到宿主原语，例如 `utp.source_cart`。 |
| 生态扩展 | 受控反向域名，例如 `com.example.utp.purchase_warranty` | 避免第三方扩展占用 `utp` 官方前缀或发生名称冲突。 |
| 传输配置 | `utp.services[]` | 仅声明本次投递可选的传输配置，不是 Primitive、扩展或 Action 的前缀。 |

原语和扩展的命名、版本和 Schema 声明由 Profile 发布，并在相关 Role 关系的协商中选择共同可用的范围。核心 Primitive 的声明表示支持该版本定义的完整核心操作集合；扩展不能改写核心 Action 的名称、语义、既有字段含义或核心状态迁移。协商完成后，调用方只能使用选定版本中已有的 Action 和 Schema 字段。

这套治理方式将“标识是否有效”“双方是否共同支持”“本次会话是否可用”分开处理：命名保证可识别，Profile 说明可提供的版本与扩展，协商结果决定当前交易的实际能力范围。详见[原语框架](/documentation/specification/protocol-core/primitive-framework.html)和[发现与协商](/documentation/specification/protocol-core/discovery-negotiation.html)。

## 商业场景

商业场景用于说明同一套协议构件如何被组合，而不是定义额外的状态、角色或 Action。现行规范提供 B2C 标准采购和 B2B 标准采购两条基线路径：两者共享消息模型、交易原语和状态语义，差异由 Mode、拓扑、交易条款与合规要求表达。

| 场景 | 典型特征 | 基线路径 |
| --- | --- | --- |
| B2C 标准采购 | 固定售价、即时下单、即时全额支付、直接履约。 | Source → Purchase → Pay → Fulfill；通常跳过 `NEGOTIATING`。 |
| B2B 标准采购 | 组织主体、采购凭证、资质核验、发票与审计要求。 | 可采用与 B2C 相同的最简交易链路，也可按 Mode 加入询盘、审批、账期或复杂履约。 |

一笔交易的实际路径由当前 Mode、`CommerceTopology`、已锁定交易条款和对应原语的标准响应共同决定。例如，`purchase.complete` 形成独立交易边界和 `transaction_id`；后续 Purchase、Pay、Fulfill 与可能发生的 Resolve 都绑定同一交易标识。B2B 并不等同于议价、账期或多方履约，B2C 也不意味着省略协议状态和责任角色。

完整的基线配置、角色关系和 Action 序列见[商业场景](/documentation/specification/protocol-core/business-scenarios.html)；面向实际接入的端到端示例见[采购全链路指南](/documentation/specification/guides/procurement-walkthrough.html)。

## 采购模式

采购模式（Procurement Mode）表达一笔交易的执行要求。UTP 通过六个可独立协商的维度配置原语行为、交互流程和约束条件，使同一协议模型能够覆盖简单采购和复杂采购。

| 维度 | 标识 | 决定的业务问题 |
| --- | --- | --- |
| 价格模式 | `pricing_mode` | 当前价格能否按确定规则得到，还是需要完整询价后形成。 |
| 决策链路 | `decision_path` | 是否直接采纳、需要审批，还是需要双方议价。 |
| 付款结构 | `payment_structure` | 即时支付、分期、账期或其他付款安排。 |
| 履约结构 | `fulfillment_structure` | 直接履约、分段履约或需要更多责任方的履约安排。 |
| 交易关系 | `relationship_mode` | 一次性交易、持续合作或框架关系。 |
| 合规等级 | `compliance_level` | 主体核验、资质、审计和其他附加合规要求。 |

一次交易的 `SelectedMode` 是这六个维度的锁定组合。Mode 不是标签：它裁剪可用 Primitive、Action 和行为变体，也参与角色关系、状态迁移、路径编排和前置约束的判定。Mode 的升级必须遵循规范定义的升级规则，不能由某一次传输选择或本地实现自行改变。

[采购模式](/documentation/specification/protocol-core/procurement-models.html)定义全部维度、Level 语义、Mode 判定、升级约束以及 Mode 与原语和角色的关联规则。

## 商业拓扑

商业拓扑（`CommerceTopology`）是交易责任结构的快照。它以 Role 为节点、以 Role 之间的业务关系为边，回答“谁在交易中承担什么责任、哪些参与方之间必须建立协作关系”。它不表示网络地址，也不直接规定 Action 的执行顺序。

| 构件 | 内容 | 在交易中的作用 |
| --- | --- | --- |
| Role | Buyer、Seller、Payer、Payee、PaymentProcessor、Shipper、Inspector 等业务责任角色。 | 形成参与方责任的共同语言。 |
| Role Relationship | Role 对之间的信息、资金、授权、履约、证据等关系。 | 确定必须完成发现与兼容性校验的范围。 |
| Role Definition 与权限 | 标准 Role 及领域 Role 的定义、加入和治理规则。 | 使角色扩展保持可解释、可验证。 |
| 拓扑快照 | 交易所采用的角色集合与关系集合。 | 为发现、授权解释和路径编排提供稳定输入。 |

一个商业实体可以承担多个 Role，一个 Role 也可能由独立业务域承担。路径编排根据 Action 的 `initiator_role` 和 `handler_role`，在已锁定的拓扑中确定唯一调用方向；发现与协商则按拓扑中相关的 Role 关系验证能力兼容性。

[商业拓扑](/documentation/specification/protocol-core/business-topology.html)给出 `CommerceTopology`、标准角色集、角色关系类型及领域扩展治理的权威定义。

## 发现与协商

发现与协商将抽象 Role 关系连接到可互操作的业务能力。它接收 `role_domain_bindings` 和 `role_relationships`：前者将相关 Role 映射到业务域，后者列出本次交易必须校验的无方向角色对。通过读取相关 Profile，参与方确认每个关系对共同支持的 Primitive、版本、扩展和 Mode 范围。

| 输出 | 含义 | 后续消费者 |
| --- | --- | --- |
| `relation_compatibilities` | 每个 Role 关系对共同支持的 Primitive、版本、扩展和 Mode 范围。 | 采购模式过滤与路径编排。 |
| `role_domain_bindings` | Role 到已发现业务域的绑定。 | 角色方向校验和 Profile 追溯。 |
| `service_catalogs` | 可用 Service 的目录及其传输配置。 | 通信层在每次请求前确认投递方式。 |
| 已选 Primitive 与扩展 | 当前关系中已经确认的能力组合。 | 原语 Schema 解析和 Action 可用范围。 |

协商不直接选择某一次调用的 Service、Endpoint 或传输方式；这些信息保留在服务目录中，由通信层在请求时结合目标 Action 的 `transport_bindings` 和当前 `HandlerRole` 确认。协商也不替代商业拓扑：拓扑给出责任结构，协商给出在该结构中实际可用的协议能力。

详见[发现与协商](/documentation/specification/protocol-core/discovery-negotiation.html)；发现前的基础交互入口见[发现与握手](/documentation/specification/protocol-core/discovery-handshake.html)。

## 路径编排

路径编排将已经锁定的 `SelectedMode`、商业拓扑、协商结果和原语契约编译为本地 `execution_dag`，并在运行时只开放当前上下文允许的 Action。DAG 是结构、角色方向和 Action 范围的执行快照；StateView 是状态机提交的权威交易阶段视图。

```text
编排输入
  → DAG 生成
  → 状态机初始化
  → 路径选择
  → 约束校验
  → 请求发起与响应处理
  → 状态机推进
  → 更新行动空间或进入 DAG 生命周期处理
```

| 核心输出 | 作用 |
| --- | --- |
| `execution_dag` 与 `dag_id` | 记录节点、依赖边、唯一角色方向和允许的 Action 范围。 |
| StateView | 提供当前协议阶段、标识和版本，作为状态校验和后续路径更新的输入。 |
| `available_actions` | 只包含同时通过 Mode、拓扑、协商、DAG 结构和状态守卫过滤的 Action。 |
| 控制与恢复结论 | 表示挂起、阻止、补偿、超时或恢复所需的下一步。 |

调用方只能从 `available_actions` 中选择 Action，并携带会话、幂等和输入上下文。处理方返回的 `valid_next_actions` 只是候选；路径编排会在状态机提交后再次过滤。调用观察结果未知时，路径编排保留会话与幂等上下文，通过重试、查询或异步通知恢复；`PENDING` 则是已取得的标准 `ActionResponse`，会进入状态机推进。

[路径编排](/documentation/specification/protocol-core/path-orchestration.html)定义 DAG、行动空间、约束校验、恢复和生命周期；[全局状态机](/documentation/specification/protocol-core/global-state-machine.html)定义 StateView、迁移、补偿和状态同步。

## 原语框架

原语是 UTP 对基础商业动作的标准化封装，Action 是原语在运行时暴露的具体调用。P0 原语通用框架为全部业务原语提供相同的身份、契约、请求响应、状态、错误、幂等、扩展和版本约定。

| 原语 | 交易中的作用 |
| --- | --- |
| Source | 表达采购意图、检索或查看候选商品。 |
| Negotiate | 形成、修改或确认询报价与交易条款。 |
| Purchase | 创建、调整和完成订购，并形成独立交易边界。 |
| Pay | 发起、确认、终止、查询或退款支付义务。 |
| Fulfill | 接收履约事件、发货、交付和收货结果。 |
| Resolve | 发起争议、调解、仲裁或补偿。 |

每个 Primitive 的规范定义包含业务意图、前置条件、后置条件、不变量、角色绑定、适用状态、状态影响、可暴露的 `valid_next_actions` 和关键约束。`ActionRequest` 与 `ActionResponse` 使用 P0 约定交换；`trade_context_id` 标识商业意图上下文，`transaction_id` 标识独立交易边界，`idempotency_key` 保障可安全重试。

扩展在不改变核心 Primitive 语义的前提下增加能力。它们必须声明宿主原语、版本和 Schema，并在当前 Role 关系的协商结果中共同支持后才能进入请求、响应和 `valid_next_actions`。权威的通用约定见[P0 原语框架](/documentation/specification/protocol-core/primitive-framework.html)，具体语义见[交易原语](/documentation/specification/index.html)。

## 信任与安全

UTP 将“能否互操作”和“能否执行受保护操作”拆分为可组合的协议能力。信任与安全要求贯穿发现、Action 调用、状态推进和审计，而非只附加在传输层。

| 能力 | 解决的问题 | 主要协议对象 |
| --- | --- | --- |
| 信任准入 | 对接前和受保护操作前需要满足哪些机制与判定。 | 准入声明、准入结果、Trust Profile。 |
| 身份认证 | 如何验证发起请求的机器身份。 | 身份材料、信任锚和认证机制声明。 |
| 用户与操作授权 | 谁授权了本次交易，以及本次操作被允许做什么。 | User Authorization、Mandate Chain、操作级凭证。 |
| 风控与审计 | 如何传递风险信号、保留和导出可验证证据。 | Risk Signal、Evidence Bundle、Trust Adjustment Event。 |
| 通信安全 | 如何保护消息、会话、重放防护和传输等效性。 | MessageEnvelope、会话上下文、传输安全约定。 |

处理 Action 时，身份、授权、风险和人机控制等级共同构成前置约束；处理方还需完成本域的 Schema、业务资源、权限和幂等校验。标准响应才会进入全局状态机，形成可追溯的跨方状态结论。

参见[信任准入评估](/documentation/specification/protocol-core/security-trust.html)、[认证与授权](/documentation/specification/protocol-core/identity-authorization.html)、[风控与审计](/documentation/specification/protocol-core/risk-audit.html)和[传输与通信](/documentation/specification/protocol-core/transport-communication.html)。

## 人机交互友好

UTP 将自动化执行、受监督执行和人工确认表达为协议控制语义，而不是某一种 UI 技术方案。人机协同交互控制规定哪些 Action 可以自主推进，哪些必须保持 Principal 可观察、可中断，哪些需要明确确认后续跑；Agent 友好接口则使调用方能够根据标准响应自行判断下一步、恢复错误和安全重试。

| 主题 | 协议能力 | 对运行时的意义 |
| --- | --- | --- |
| 交互控制等级 | `AUTONOMOUS`、`SUPERVISED`、`CONFIRMED` 等控制语义。 | 决定 Action 是否可直接执行、需要观察还是需要确认。 |
| 挂起与恢复 | HAI 信封、`suspend_id`、确认后续跑、窄语义 Resume/Cancel。 | 在人工介入时保持原会话、原 Action 和原控制边界。 |
| 数据可见性 | 数据可见性等级、权威数据读取和引用式数据传递。 | 避免敏感数据进入不必要的推理或展示链路。 |
| 自描述响应 | `valid_next_actions`、Action 描述、状态和控制结果。 | 让调用方无需依赖临时规则即可理解可执行的下一步。 |
| 错误恢复与重试 | 结构化错误、幂等键和重试规则。 | 让失败、超时和重复请求可预测、可恢复。 |

人机协同并不改变商业拓扑、Mode 或原语的业务含义；它在执行链路中增加可观察、可中断和可确认的控制点。Agent 友好设计也不意味着绕过状态、授权或风险约束：运行时仍只能从 `available_actions` 中选择动作，并以标准响应和 StateView 作为后续决策依据。

详细控制语义见[人机协同交互](/documentation/specification/protocol-core/human-agent-interaction.html)，自描述响应、错误恢复和幂等重试约定见[Agent 友好接口](/documentation/specification/protocol-core/agent-friendly-interface.html)。

本页的叙事层次参考《智能体交易研究报告》对协议愿景、架构、安全、集成与共建机制的组织方式，以及 [UCP Overview](https://ucp.dev/latest/specification/overview/) 的概览层次。UTP 的术语、对象、版本和规范性要求仅以 `documentation` 中当前协议章节为准。
