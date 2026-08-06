---
title: 供应商接入快速开始
section: merchant
owner: merchant-team
status: review
version: 2026-07-31
---

# 供应商接入快速开始（Merchant Quickstart） {#s-mqs}

本页是 UTP-M 的非规范性（Informative）导读：用最短路径说明一个供应商从零到"商品可被全网买方 Agent 购买"需要做什么。全部规范性细节以各章正文为准，本页每一步都给出对应章节。

## 1. 接入前提：你只需要实现两个东西 {#s-mqs1}

![供应商接入三阶段：一次入驻（M2 五步至 ACTIVE）、一次批量铺货（LISTED）、持续事件驱动循环](../../assets/diagrams/m-quickstart-phases.svg)

UTP-M 的最简实现面（通用规则继承（Commons Inheritance） 传输绑定支持要求）：

```
① 一个 REST 客户端     → 调用 Marketplace 承载 MP1—MP6 的供应商侧端点
② 一个 Webhook 端点    → 接收回调推送（订单路由、审核结论、账单）

不需要：MCP/A2A（可选）、Merchant Agent（可选）、ERP Bridge（有 ERP 才需要）
Mode 配置：零配置即可跑通全流程（Mode 默认无关性原则，见 M1 架构总览）
```

## 2. 第一阶段：入驻（一次性，M2） {#s-mqs2}

| 步骤 | 动作 | 产出 | 参考 |
| --- | --- | --- | --- |
| 1 | 生成 ES256 密钥对，确定 `agent_id`（如 `did:web:你的域名`） | 身份与密钥 | [Step 1：身份与密钥（Identity & Keys）](onboarding.md#s-m22) |
| 2 | 在你的域名 `/.well-known/utp` 发布 Profile（声明 MP 原语 + 回调接收端点） | 能力声明 | [Step 2：Profile 发布（Profile Declaration）](onboarding.md#s-m23)（含可复制示例） |
| 3 | 向 Marketplace 提交注册（**必须法人主体亲自完成，不可委托 Agent**） | `merchant_id` | [Step 3：Marketplace 注册（Registration）](onboarding.md#s-m24) |
| 4 | 按平台公示清单提交资质 | `QUALIFIED` | [Step 4：资质与合规（Qualification & Compliance）](onboarding.md#s-m25) |
| 5 | 沙箱验收（签名互验、发布/接单/发货全流程跑通） | `ACTIVE`，可发商品 | [沙箱验收清单（Readiness Checklist）](onboarding.md#s-m262) 验收清单 |

## 3. 第二阶段：铺货（批量，M3 + M4） {#s-mqs3}

```
N 个商品 = ⌈N / 500⌉ 个批次（单批 ≤ 500 条，整批一个 idempotency_key，逐条独立成败）

POST /utp/m/v1/listings/batch   → batch_id → 轮询/回调取逐条结果     （见 MP1 批量模式）
POST /utp/m/v1/inventory/batch  → 初始库存 set                      （见 MP2 操作矩阵）

商品数据来源三选一：
  ERP 导出映射（见 M10 同步模式） / AI 辅助录入 source_materials，确认后生效（见 MP1 SourceMaterials） / 人工录入
```

商品经 `DRAFT → PENDING_REVIEW → LISTED`（[Error Handling（错误处理）](primitives/listing/index.md#s-m33)）后自动进入平台 P1 Source 可搜索范围；审核结论走 `review_result` 回调推送，无需轮询。

## 4. 第三阶段：日常循环（事件驱动） {#s-mqs4}

```
上行（你 → 平台，随 ERP 变化触发）：
  库存变化   → inventory.adjust + commutative:true（最简路径，见 MP2 关键设计原则）
  信息修改   → listing.update（major 变更重新送审）
  发货       → delivery.ship（运单号；平台转为买方侧 fulfill.notify）

下行（平台 → 你的 Webhook）：
  order_routed      → 在 deadline 内 accept（附卖方签名）/ reject / hold    （接单原语）
inquiry_routed    → （可选，声明 utp.quote 后）在 deadline 内 quote / decline （报价原语）
  hold_created/…    → 核对库存占用                                        （见 MP2 与 P3 库存一致性契约）
  statement_issued  → 对账，异议走 discrepancy.submit                      （结算与对账）

兜底铁律：所有回调丢失均可通过 query/list 游标轮询补齐（见 M2 回调事件类型注册表）；
接单超时平台按预设策略处置，订单永不悬挂（见 MP4 错误处理）。
```

## 5. 什么时候才需要 Agent 和 Bridge {#s-mqs5}

| 你的情况 | 需要的组件 | 参考 |
| --- | --- | --- |
| 有 ERP，希望全自动 | Merchant Bridge（单据映射 + 增量同步）+ AcceptancePolicy 自动接单 | M10、[Mode-Driven Behavior（模式驱动行为）](primitives/acceptance/index.md#s-m68) |
| 无 ERP、数据不规范 | AI 辅助录入 + Merchant Agent 代办日常运营（授权与边界见 M11） | [SourceMaterials（AI 辅助录入素材）](primitives/listing/index.md#s-m397)、M10 |
| 只想最小接入 | REST 客户端 + Webhook + 人工后台，全部组件皆可后补 | 本页第 1 节 |

接入完成的判定标准即 [沙箱验收清单（Readiness Checklist）](onboarding.md#s-m262) 沙箱验收清单；端到端报文序列与行为对照见 [M12 全链路演练](walkthrough.md)；机读契约（JSON Schema 与原语定义文件）索引见[附录 MD](appendices.md#s-md)。
