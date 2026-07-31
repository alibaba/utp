# Universal Trade Protocol (UTP)

**UTP 是一套面向 AI Agent 时代的开放交易协议规范。** 它将跨平台交易拆解为可组合、可协商、可审计的 P0–P6 原语，使人、Agent、交易平台与履约系统能够使用一致的语义协作。

**状态**：Draft · **许可证**：Apache-2.0 · **官网**：[ut-protocol.com](https://ut-protocol.com)

> ⚠️ 本规范当前处于 **Draft** 阶段。总览与 P0 已形成首版规则，其余章节的骨架**不具备规范效力**，字段与状态迁移仍可能变更。

*UTP (Universal Trade Protocol) is an open trade protocol specification for the AI Agent era. It decomposes cross-platform commerce into composable, negotiable and auditable primitives (P0–P6), so that humans, agents, trading platforms and fulfillment systems can collaborate with consistent semantics. This repository contains the normative specification and its machine-readable JSON Schemas.*

---

## 为什么需要 UTP

当交易的一方或双方由 AI Agent 代理时，买方、卖方、交易平台与履约系统之间缺少一套统一的交互语言：每接入一个平台都要重做一次对接逻辑，Agent 也无法判断「这笔交易当前处于哪一步、下一步该做什么、哪里需要人工确认」。

UTP 提供交易参与方之间的公共语言，覆盖寻源、询盘、订购、支付、履约与争议解决。协议只定义**可观察的行为、状态、消息与责任边界**，不限定任何参与方的内部业务实现。

## 设计原则

| 原则 | 说明 |
|------|------|
| **可组合** | 按业务需要组合原语，不要求所有场景执行同一条固定链路 |
| **传输无关** | 原语语义独立于 REST、MCP、A2A、Embedded 等具体映射 |
| **Agent 友好** | 状态、错误、下一步动作与人工确认点均可被结构化理解 |
| **可治理** | 版本、负责人、评审状态与机器契约具有明确的发布边界 |

## 参与方

| 角色 | 职责 |
|------|------|
| Buyer / Buyer Agent | 表达交易意图、提供必要信息，并在授权边界内确认决策 |
| Seller / Seller Agent | 提供商品、报价、订单、履约与售后信息 |
| Platform | 发现参与方、编排原语、传递上下文并保持协议状态一致 |
| Service Provider | 在支付、物流、认证、争议处理等环节提供专业服务 |

## 原语地图（P0–P6）

| 原语 | 名称 | 职责 |
|------|------|------|
| **P0** | Primitive Commons | 所有原语共享的信封、状态、错误与安全规则 |
| **P1** | Source 寻源 | 发现商品、供应商、服务与可交易资源 |
| **P2** | Negotiate 询盘 | 询价、报价、还价与条款确认 |
| **P3** | Purchase 订购 | 形成购买承诺并提交交易意图 |
| **P4** | Pay 支付 | 建立、确认与追踪资金处理 |
| **P5** | Fulfill 履约 | 准备、交付、跟踪、验收与收货 |
| **P6** | Resolve 争议解决 | 发起、协商、裁决与补偿争议 |

## 仓库结构

```
docs/
├── specification/            # 规范正文
│   ├── index.md              # 规范总览（建议入口）
│   ├── protocol-core/        # 协议核心：原语框架、状态机、身份授权、传输通信、拓扑等
│   ├── primitives/           # P1–P6 各原语定义与传输绑定（rest / mcp / a2a / embedded）
│   ├── orchestration/        # 路径编排
│   ├── concepts/ core/       # 概念与核心说明
│   ├── merchant/ services/   # 商户与服务侧
│   ├── quickstart/ guides/   # 快速开始与接入指引
│   ├── reference/ schemas/   # 参考资料与 Schema 索引
│   └── manifest.json         # 章节清单与元信息
├── authoring/                # 编辑与治理：CONTRIBUTING、CHANGELOG、OWNERS、评审清单、模板、测试
└── assets/                   # 图示、样式与脚本

schemas/                      # 机器可读契约（JSON Schema）
├── common/                   # 全协议可复用实体
├── global-state-machine/     # 全局状态机定义
└── primitives/               # 按原语组织的实体与扩展
    ├── common/               # 原语共用运行时结构
    └── {primitive}/          # 各原语定义、entities、extensions
```

## 开始阅读

1. **规范总览** — [`docs/specification/index.md`](docs/specification/index.md)：协议目标、参与方与原语地图
2. **协议核心** — [`docs/specification/protocol-core/`](docs/specification/protocol-core/)：原语框架（P0）、全局状态机、身份与授权、传输与通信
3. **单个原语** — [`docs/specification/primitives/`](docs/specification/primitives/)：每个原语含 `index.md` 与 `transports/` 下的传输绑定
4. **机器契约** — [`schemas/`](schemas/)：与规范正文一一对应，可直接用于数据校验与代码生成

在线阅读：[ut-protocol.com](https://ut-protocol.com)

## 规范与 Schema 的关系

规范正文定义**语义与规则**（协议如何工作、为什么这样设计）；`schemas/` 下的 JSON Schema 提供**结构与校验依据**（程序据此判断数据是否符合协议）。两者一一对应、同仓同步演进——只有正文，第三方无法验证自己的实现是否正确；只有 Schema，则无法理解字段背后的业务语义。

## 版本与治理

- 规范按**日期版本**标记（见各文档 frontmatter 的 `version` 与 `status`）
- 章节负责人与评审人见 [`docs/authoring/OWNERS.yaml`](docs/authoring/OWNERS.yaml)
- 变更记录见 [`docs/authoring/CHANGELOG.md`](docs/authoring/CHANGELOG.md)
- 规范性要求使用 RFC 2119 关键词（MUST / SHOULD / MAY）

## 贡献

欢迎通过 Issue 与 Pull Request 参与协议讨论与完善。提交前请阅读 [`docs/authoring/CONTRIBUTING.md`](docs/authoring/CONTRIBUTING.md)。

所有提交需签署 DCO（Developer Certificate of Origin）：

```bash
git commit -s -m "your message"
```

## 许可证

本项目采用 [Apache License 2.0](LICENSE)。
