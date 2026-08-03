---
title: 协议核心概览
section: protocol-core
owner: protocol-architecture
status: drafting
---

# 协议核心概览

UTP 为采购交易中的参与方提供共同的商业语言与可组合的执行约定。采购平台、业务系统、服务提供方和自动化运行时能够在同一笔交易中识别相同的采购模式、角色关系、原语动作、状态阶段与安全要求，并通过已协商的通信绑定完成互操作。

本页帮助读者建立 UTP 的整体心智模型，并指向各项规范的权威定义；字段、Schema 和规范性要求以对应章节为准。

## UTP 解决的问题

采购交易通常跨越商品、报价、订单、付款、履约和售后等多个业务系统。UTP 将这些系统间需要共同理解的部分收敛为协议层能力：

| 目标 | UTP 的协议机制 |
| --- | --- |
| 适配不同采购形态 | 以[采购模式](procurement-models.md)表达价格形成、付款、履约、交易关系和合规等可协商维度。 |
| 建立跨方协作关系 | 以[商业拓扑](business-topology.md)定义 Role 与业务关系，并以[发现与协商](discovery-negotiation.md)确认可共同使用的能力。 |
| 执行可组合的商业动作 | 以[P0 原语通用框架](primitive-framework.md)统一 Action、请求响应、错误、幂等和补偿等基础约定。 |
| 保持交易过程一致 | 以[全局状态机](global-state-machine.md)维护跨方可识别的 StateView，并以[路径编排](path-orchestration.md)开放当前可执行的 Action。 |
| 在不同集成方式间互操作 | 以[传输与通信](transport-communication.md)统一 REST、MCP、A2A 与 Embedded 承载下的请求、结果和异步语义。 |
| 建立可验证的信任与控制 | 通过[信任准入评估](security-trust.md)、[认证与授权](identity-authorization.md)、[风控与审计](risk-audit.md)和[人机协同交互](human-agent-interaction.md)约束准入、授权、证据和人工控制。 |

## 核心运行模型

一笔 UTP 交易从已确定的商业意图开始。采购模式定义这笔交易的执行要求，商业拓扑定义其中的 Role 与关系；发现与协商在相关 Role 之间确认 Primitive、版本、扩展和 Mode 的兼容范围。路径编排据此生成执行 DAG，状态机形成并维护 StateView，调用方从当前 `available_actions` 中选择 Action。

每次 Action 在前置约束通过后由通信层选择本次请求的 Service、Endpoint 和传输绑定，处理方返回标准 `ActionResponse`。状态机据此提交新的 StateView，路径编排再更新下一轮可执行的 Action。超时、补偿、人工确认与恢复都在同一套状态、幂等和控制语义中处理。

```text
商业意图
  → 采购模式 + 商业拓扑
  → 发现与协商
  → 路径编排 + 全局状态机
  → Action 请求与响应
  → 状态推进 + 下一轮行动空间
```

## 参与方与协议角色

UTP 区分“由谁实现能力”与“在本次交易中承担什么 Role”。同一组织或运行时可以承担多个 Role；Role 的含义由商业拓扑和 Action 的调用方向确定，而不是由行业、部署位置或产品名称确定。

| 对象 | 在协议中的位置 | 需要提供或消费的内容 |
| --- | --- | --- |
| 调用方运行时 | 在当前行动空间中选择 Action，并维护会话和幂等上下文。 | `dag_id`、Action、P0 input、`session_id`、`idempotency_key`。 |
| 处理方 | 按原语契约执行业务动作，并返回标准结果。 | `ActionResponse`、`execution_result`、`valid_next_actions` 与业务输出。 |
| Role | 描述交易中的商业责任与调用关系。 | 由 `CommerceTopology` 和 Action 的 `initiator_role`、`handler_role` 共同约束。 |
| 业务域与 Profile | 为 Role 提供发现入口、能力声明和服务目录。 | `role_domain_bindings`、Profile、Primitive/扩展与 `service_catalogs`。 |
| 信任、授权和风控能力 | 对受保护 Action 给出准入、授权和审计约束。 | 身份材料、授权委托、风险信号和证据。 |

调用方与处理方是一次 Action 的方向性概念；商业拓扑中的 Role 是稳定的业务责任概念。路径编排使用两者形成唯一的调用方向，通信层再为这次方向确定实际投递绑定。

## 从发现到状态推进

UTP 将一次交易拆分为连续但可独立验证的阶段。每一阶段只消费已经锁定的事实，并将其结果交给下一阶段。

| 阶段 | 输入 | 主要处理 | 输出 | 规范入口 |
| --- | --- | --- | --- | --- |
| 商业建模 | 采购意图与业务规则 | 选择 Mode，建立 Role 和关系。 | `SelectedMode`、`CommerceTopology`。 | [采购模式](procurement-models.md)、[商业拓扑](business-topology.md) |
| 发现与协商 | Role 到业务域的绑定、待协商关系对。 | 读取 Profile，确认可共同使用的 Primitive、版本、扩展和 Mode 范围。 | `relation_compatibilities`、`service_catalogs`。 | [发现与协商](discovery-negotiation.md) |
| 执行准备 | 已锁定的 Mode、拓扑和协商结果。 | 生成 `execution_dag`，初始化 StateView，推导行动空间。 | `dag_id`、StateView、`available_actions`。 | [路径编排](path-orchestration.md)、[全局状态机](global-state-machine.md) |
| Action 执行 | 选定 Action、P0 input、会话和幂等上下文。 | 完成状态、授权、风控和人机协同约束，再经通信层投递。 | `ActionRequest` 与标准 `ActionResponse`。 | [原语通用框架](primitive-framework.md)、[传输与通信](transport-communication.md) |
| 状态推进与恢复 | `ActionResponse` 或状态机的补偿、超时结论。 | 提交 StateView，更新行动空间；在未知结果时保留上下文并恢复。 | 新 StateView、下一轮 `available_actions` 或恢复结论。 | [全局状态机](global-state-machine.md)、[路径编排](path-orchestration.md) |

这条链路的关键在于：协商结果决定“哪些能力可以进入路径”，行动空间决定“当前哪些 Action 可以执行”，而标准响应和 StateView 决定“执行后可以如何继续”。

## 商业模型、能力与扩展如何组合

UTP 不把 B2B、B2C 或某个垂直行业编码为固定流程。它以可组合的 Mode、拓扑、Primitive 与扩展描述一次交易：

| 层次 | 回答的问题 | 变化方式 |
| --- | --- | --- |
| 采购模式 | 价格如何形成、谁决定价格、如何付款和履约、关系和合规要求是什么？ | Mode 维度在交易建立时锁定。 |
| 商业拓扑 | 这笔交易有哪些 Role，它们之间有哪些业务关系？ | 拓扑快照提供稳定的责任结构。 |
| Primitive | 要执行什么标准商业动作？ | Primitive 定义 Action 契约、状态影响和补偿边界。 |
| 扩展 | 在标准动作上需要增加哪些行业或业务能力？ | 仅在协商结果确认兼容时进入路径。 |
| Action | 当前上下文实际允许调用的哪个动作？ | 由 DAG、状态守卫、Mode、拓扑和协商结果共同过滤。 |

因此，`valid_next_actions` 只是处理方在某次响应中提出的候选集合；路径编排会结合当前 DAG 和 StateView 再次过滤，形成调用方真正可见的 `available_actions`。这一机制使同一 Primitive 能在不同 Mode、拓扑和扩展组合下保持一致的协议边界。

## 核心构件

| 构件 | 作用 | 关键输出 |
| --- | --- | --- |
| Mode | 描述交易在价格、付款、履约、关系和合规上的执行要求。 | 已锁定的 `SelectedMode`。 |
| CommerceTopology | 描述交易中 Role 和业务关系的责任结构。 | 拓扑快照与角色关系。 |
| 发现与协商 | 确认可互操作的能力范围与服务目录。 | `relation_compatibilities`、`role_domain_bindings`、`service_catalogs`。 |
| Primitive 与 Action | 将商业动作封装为可验证、可组合的协议契约。 | P0 `ActionRequest`、`ActionResponse` 与 `valid_next_actions`。 |
| StateView | 表达交易上下文的权威协议阶段与标识。 | 当前 StateView、迁移与补偿结论。 |
| execution_dag | 将已锁定的商业事实编译为本地执行结构。 | `available_actions` 与唯一角色方向。 |
| 传输绑定 | 为某次请求提供实际的调用承载。 | Service、Endpoint 与 transport。 |

## 原语契约与消息语义

Primitive 是 UTP 的可组合业务单元，Action 是 Primitive 在运行时暴露的具体调用。每个 Primitive 使用统一的 P0 框架描述身份、业务意图、契约、输入输出、状态影响与补偿边界；具体商品、报价、订单、付款或履约字段由对应 Primitive 和扩展规范定义。

所有 Action 以 P0 信封交换请求和响应。调用方在请求中携带会话、幂等和输入信息；处理方以 `ActionResponse` 返回执行结果、原语状态、业务输出和 `valid_next_actions`。这使得不同传输绑定上的调用具有相同的业务语义，也使状态机能够以标准结果推进交易。

扩展用于在不改变基础 Primitive 含义的前提下增加可协商能力。扩展的 Schema、版本和依赖关系必须在发现与协商阶段确认；运行时只使用当前协商范围内的 Primitive 与扩展，避免双方对输入输出结构产生不同解释。

## 服务目录与传输绑定

UTP 将“业务上调用哪个 Action”与“本次请求怎样发送”分开处理。发现与协商收集可用 Service 的目录，路径编排确定 Action 的唯一角色方向，通信层在每次请求前根据目录、目标 Action 的 `transport_bindings` 和当前 `HandlerRole` 选择兼容绑定。

| 关注点 | 协议对象 | 说明 |
| --- | --- | --- |
| 能否进入本次交易 | `relation_compatibilities` | 记录 Role 关系对共同支持的 Primitive、版本、扩展和 Mode 范围。 |
| 能否调用当前动作 | `execution_dag`、StateView、`available_actions` | 记录结构依赖、角色方向和状态守卫后的结果。 |
| 向哪里以及如何投递 | `service_catalogs`、`transport_bindings` | 在请求时解析 Service、Endpoint 与 transport。 |
| 如何保持可靠性 | `session_id`、`idempotency_key`、标准响应和异步通知 | 处理重复请求、超时、观察结果未知与恢复。 |

当前规范支持 REST、MCP、A2A 和 Embedded SDK 等承载。无论采用哪一种，通信层都需要保持 P0 的请求响应、会话、幂等、错误和异步语义一致。

## 状态、控制与异常恢复

StateView 是跨方协作时的权威协议视图。它不要求各参与方放弃自身的内部资源状态，而是规定当交易推进、同步或恢复时，哪些阶段、标识和结果必须被共同识别。`initialize_state_view` 建立或读取交易上下文；`validate_action_by_state` 约束当前 Action；`commit_state_transition` 根据标准响应提交新的 StateView。

UTP 以三类结果区分正常推进与异常处理：

| 情形 | 协议处理 |
| --- | --- |
| 处理方返回标准响应，包括 `PENDING` | 进入状态机，由结果和当前上下文决定新的 StateView 与行动空间。 |
| 前置约束拒绝或要求人工确认 | 保持当前 StateView，创建或返回适用的控制、挂起或恢复语义。 |
| 超时、连接中断或响应丢失 | 视为调用观察结果未知；保留会话和幂等上下文，经重试、查询或异步通知取得标准结果后继续。 |

补偿和超时不是绕过主链路的特殊调用。状态机给出结论后，相关 Action 仍进入同一套 DAG、状态守卫、授权、风控和人机协同控制。

## 信任、安全与治理

商业互操作不仅需要双方理解相同的 Schema，也需要能够判断请求来自谁、谁授权了本次操作、是否满足准入规则，以及如何保留可验证证据。UTP 将这些要求拆分为独立但可组合的协议能力：

| 能力 | 解决的问题 | 对应规范 |
| --- | --- | --- |
| 信任准入 | 对接前和受保护操作前需要满足哪些声明与判定。 | [信任准入评估](security-trust.md) |
| 认证与授权 | 如何建立机器身份、用户委托与操作级授权之间的信任链。 | [认证与授权](identity-authorization.md) |
| 风控与审计 | 如何传递风险信号、封装证据并支持审计。 | [风控与审计](risk-audit.md) |
| 人机协同 | 哪些 Action 可自主推进，哪些需观察、中断或人工确认。 | [人机协同交互](human-agent-interaction.md) |

这些能力在 Action 执行时与状态守卫共同生效：身份、授权、风控和控制等级提供执行条件，处理方完成本域业务校验，状态机对跨方状态推进给出权威结论。

## 版本与协议演进

UTP 的互操作范围由发现与协商阶段锁定。参与方通过 Profile 和协商结果声明并确认所使用的 Primitive、版本、扩展和 Mode 范围；运行时的 DAG 以这些锁定事实为输入。对已有交易而言，Mode、商业拓扑或协商能力范围发生变化时，会形成新的 DAG 与新的初始 StateView，而不会原地改变既有执行结构。

这一设计将演进分为两个层次：协议实现可以通过新增或升级 Primitive、扩展、Schema 和传输绑定扩展能力；单笔交易则持续使用建立时已经确认的能力集合，直到完成、恢复、补偿或显式重建路径。详见[发现与协商](discovery-negotiation.md)、[原语通用框架](primitive-framework.md)与[路径编排](path-orchestration.md)。

## 协议层次与阅读路径

UTP 将稳定的跨方约定放在协议核心，将具体业务能力放在原语和扩展中。首次接入时，可按以下顺序阅读：

1. 从[采购模式](procurement-models.md)和[商业拓扑](business-topology.md)确定交易的业务结构。
2. 阅读[发现与协商](discovery-negotiation.md)，了解 Profile、兼容性和服务目录如何建立。
3. 阅读[P0 原语通用框架](primitive-framework.md)、[全局状态机](global-state-machine.md)和[路径编排](path-orchestration.md)，了解 Action 如何被允许、执行和推进。
4. 选择[传输与通信](transport-communication.md)定义的适用绑定，并接入认证、授权、信任、风控与审计能力。
5. 根据业务需要阅读各[交易原语](../index.md)及其扩展定义。

## 协议核心章节

| 主题 | 说明 |
| --- | --- |
| [发现与握手](discovery-handshake.md) | 建立发现前的基础交互。 |
| [发现与协商](discovery-negotiation.md) | 发现 Profile，并协商 Primitive、扩展和 Mode 兼容范围。 |
| [采购模式](procurement-models.md) | 用可组合维度表达 B2B、B2C 等采购要求。 |
| [商业拓扑](business-topology.md) | 定义 Role、关系与责任结构。 |
| [路径编排](path-orchestration.md) | 将锁定事实编译为 DAG 和行动空间。 |
| [全局状态机](global-state-machine.md) | 定义 StateView、状态迁移、补偿和超时处理。 |
| [传输与通信](transport-communication.md) | 定义跨传输的一致消息、会话与投递语义。 |
| [认证与授权](identity-authorization.md) | 定义身份、授权委托和操作级授权。 |
| [信任准入评估](security-trust.md) | 定义互操作前和受保护操作前的准入语义。 |
| [风控与审计](risk-audit.md) | 定义风控信号、证据与审计机制。 |
| [人机协同交互](human-agent-interaction.md) | 定义人工确认、挂起、恢复和可观察控制。 |
| [商业场景](business-scenarios.md) | 通过场景说明各核心构件如何组合。 |

## 设计原则

- **先协商，后执行。** 只有 Mode、拓扑与能力范围已经确定，Action 才进入执行路径。
- **业务语义与传输承载分离。** 同一 Action 保持一致的请求、结果和状态语义，可由不同绑定承载。
- **状态是跨方协作的共同语言。** 本地资源实现可以不同，但跨方推进以 StateView 和标准响应为依据。
- **能力可组合，扩展可协商。** 原语和扩展通过明确的版本、Schema 与兼容范围组合，而非依赖临时的点对点约定。
- **安全与人工控制贯穿执行链。** 认证、授权、风控、审计与人机协同在适用的执行节点共同约束交易推进。

本页的信息架构参考 [UCP Overview](https://ucp.dev/latest/specification/overview/) 对核心对象、发现协商、服务与能力、身份安全、传输和版本治理的组织方式；UTP 的术语、模型和规范性要求均以本规范各章节为准。
