---
title: M10 ERP 集成与 Bridge
section: merchant
owner: merchant-team
status: review
version: 2026-07-31
---

# M10 · ERP 集成与 Bridge（ERP Integration &amp; Merchant Bridge） {#s-m10}

## 定位（Positioning） {#s-m101}

绝大多数供应商的商品、库存、订单、发货与财务事实的权威系统是其内部 ERP/WMS/OMS。本章定义 **Merchant Bridge**：把供应商内部系统与 UTP-M 原语连接起来的集成规范。Bridge 是 UTP 规范存量兼容思想（[存量兼容](../guides/legacy-migration.md)的 Bridge/Adapter 模式）在供应商侧的具体化——UTP 规范定义了"传统系统如何映射 UTP 语义"，本章定义"供应商内部单据如何映射 MP 原语"。

本章内容是**实现指引 + 少量互操作约束**：ID [映射](#s-m103)与幂等/一致性规则（[库存一致性与防超卖（Inventory Consistency）](#s-m105)）为规范性要求（RFC 关键词有效）；同步模式与部署形态为最佳实践。

## 部署形态（Deployment Patterns） {#s-m102}

| 形态 | 结构 | 适用 |
| --- | --- | --- |
| `native`（原生集成） | ERP 厂商内置 UTP-M 客户端，直接调用 MP 原语 | 新一代云 ERP；变更成本低 |
| `bridge`（独立中间件） | 独立部署的 Bridge 进程：北向对接 Marketplace（MP 原语 + 回调），南向对接 ERP（DB/API/文件/MQ） | 存量 ERP 不可改造；主流形态 |
| `agent_embedded`（Agent 内嵌） | Merchant Agent（供应商 Agent 与人机协同）内嵌 Bridge 能力，集成与决策一体 | 中小供应商；SaaS 化交付 |
| `none`（人工后台） | 无系统集成，人工通过商家后台操作（后台内部调用 MP 原语） | 极小规模商家；协议视角与其他形态无差别 |

入驻时以 `erp_integration_mode` 声明形态（[MerchantRegistration 实体](onboarding.md#s-m241)），供 Marketplace 评估时效预期（如自动接单可达性）。无论何种形态，协议交互面完全相同——这是"传输无关性"约束在集成层的延伸。

![Merchant Bridge 架构：北向协议面（MP 调用/回调/签名幂等）与南向集成面（单据订阅/DB/API/MQ），中部 ID 映射表与同步游标](../../assets/diagrams/m-bridge-architecture.svg)

## ID 映射规范（Identifier Mapping） {#s-m103}

Bridge MUST 维护双向 ID 映射表并保证映射持久、唯一、可审计：

| UTP-M 标识 | ERP 侧典型单据 | 映射建立时机 | 协议承载字段 |
| --- | --- | --- | --- |
| `listing_id` + `sku_id` | 物料/商品主数据（Item Master） | `listing.publish` 成功时 | `skus[].external_ref`（[ListingSku](primitives/listing/index.md#s-m392)）：发布时写入 ERP 物料号，平台在订单路由中原样回传 |
| `purchase_id` / `transaction_id` | 销售订单（SO） | `acceptance.accept` 后创建 SO 时 | AcceptanceRecord 与 SO 号在 Bridge 映射表内关联（`transaction_id` 是交易边界的唯一公共锚点， UTP-B 规范 [与全局状态机的关系](../primitives/purchase/index.md#s-1325)；内部单据号与它的映射属 Bridge 私有状态，对应《存量兼容》Bridge/Adapter 模式的卖方侧） |
| `shipment_id` / `batch_id` | 出库单 / 发货单 | ERP 出库确认 → `delivery.ship` | Shipment.packages[].items[].external_ref 回传物料号；出库单号存于映射表 |
| `hold_id` | 库存预留单（Reservation） | `hold_created` 回调时 | InventoryHold.transaction_id 关联 |
| `statement_id` / `entry_id` | 应收对账单 | `statement_issued` 回调时 | SettlementEntry.transaction_id 关联 SO 收款核销 |

**规范性约束：**

- 映射 MUST 一对一（同一 `purchase_id` MUST NOT 映射多个 SO；拆单发货用 `batch_id` 区分，不复制订单）。
- ERP 侧单据号 MUST NOT 出现在跨方协议消息的语义字段中（`external_ref` 是唯一例外，且平台只做透传，不解释其内容）——对应 UTP-B 规范 《全局状态机》"Binding Terms、商家内部字段、任意 output 字段和 Evidence 内容不得成为公共迁移条件；这些业务条件必须先由对应原语处理，并通过 P0 标准 Action Response 表达"。
- 映射表 MUST 可导出用于对账与争议举证。

## 同步模式（Synchronization Patterns） {#s-m104}

### 上行同步（ERP → Marketplace） {#s-m1041}

| 数据流 | MP 原语 | 推荐模式 | 要点 |
| --- | --- | --- | --- |
| 商品主数据 | MP1 `publish`/`update`（批量） | 全量初始化 + 变更事件增量 | 低频；major 变更走审核通道（[版本化与变更分级](primitives/listing/index.md#s-m324)），Bridge SHOULD 合并同一商品短时间内的多次变更 |
| 库存数量 | MP2 `adjust`（增量优先） | 事件驱动（出入库单触发）+ 定时全量校准（`set`） | 高频；纯增量用 `commutative: true` 免锁；全量校准 MUST 用 `expected_revision` 防覆盖并发扣减 |
| 接单结论 | MP4 `accept`/`reject` | ERP 审批流回调驱动 | MUST 在 `deadline` 内完成；审批超时前 Bridge SHOULD 提前 `hold` 声明预计答复时间 |
| 发货事实 | MP5 `ship`/`update` | 出库确认事件驱动 | 出库单确认后 MUST 立即上行；运单号缺失时先 `prepare(completed)` 再补 `ship` |

### 下行同步（Marketplace → ERP） {#s-m1042}

| 数据流 | 来源 | ERP 动作 |
| --- | --- | --- |
| 订单路由 | `order_routed` 回调（[订单路由（Order Routing）](primitives/acceptance/index.md#s-m67)） | 创建待审 SO / 触发自动审批策略 |
| 库存占用/释放 | `hold_created`/`hold_released` 回调 | 创建/释放库存预留单 |
| 妥投与收货回执 | `delivery_receipt` 回调（[与 P5 Fulfill 的事实传导契约（Interlock with P5）](primitives/delivery/index.md#s-m77)） | SO 履约完成、确认收入条件 |
| 结算账单 | `statement_issued` 回调（[账单出具与查询（Statements）](settlement.md#s-m94)） | 生成应收对账任务 |

回调不可达时按 UTP 规范 《Polling 降级》 轮询降级：Bridge MUST 实现基于游标的定时拉取（`acceptance.list`、`inventory.hold.query`、`delivery.query`、`settlement.statement.list`），确保任何推送丢失都能在一个轮询周期内收敛。

## 库存一致性与防超卖（Inventory Consistency） {#s-m105}

多渠道（线下 + 多平台）售卖同一物理库存时，Bridge MUST 遵守：

1. **单一权威**：物理库存的权威值在 ERP；平台侧 `available` 是 ERP 分配给该渠道的**渠道配额**的镜像。Bridge MUST NOT 让两个渠道共享同一无划分配额（超卖根源）。
2. **增量优先**：渠道内销售扣减由平台 lock/consume 自动完成（[与 P3 Purchase 的库存一致性契约（Interlock with P3）](primitives/inventory/index.md#s-m47)），Bridge MUST NOT 对协议内订单重复下调 `available`；只同步**协议外**变化（线下出库、盘亏、调拨），使用 `adjust + reason_code + source_ref`。
3. **校准窗口**：定时全量校准（`set`）MUST 选择低峰窗口执行，且以 `expected_revision` 提交；遇 `INVENTORY.REVISION_CONFLICT` MUST 重读后基于最新占用重新计算，MUST NOT 盲目重试覆盖。
4. **安全垫**：高并发 SKU SHOULD 配置渠道安全库存（ERP 侧扣留缓冲量不分配），把并发窗口内的超卖概率压到接单环节可拦截的水平——最终兜底是 MP4 `reject(inventory_insufficient)`，但 SHOULD 作为异常路径而非常态。

## 幂等、顺序与容错（Idempotency, Ordering &amp; Fault Tolerance） {#s-m106}

- **幂等键派生**：Bridge 的 `idempotency_key` MUST 从 ERP 侧业务单据确定性派生（如 `ship-{出库单号}`），保证进程重启/重放后同一单据不产生重复副作用。
- **顺序保证**：同一资源（同一 SKU 库存、同一订单）的上行操作 MUST 串行化（按资源分片的本地队列）；跨资源无顺序要求。回调消费 MUST 容忍乱序与重复：以事件携带的资源状态与 `revision`/时间戳做幂等合并，MUST NOT 依赖到达顺序。
- **重试与死信**：上行失败按指数退避重试；不可恢复错误（4xx 语义错误）MUST 进入死信队列并告警人工处理，MUST NOT 无限重试。
- **断点续传**：Bridge MUST 持久化同步游标；重启后从游标恢复，配合幂等键实现精确一次的等效语义。
- **时钟与时限**：接单 `deadline` 等时限判断 MUST 以消息载荷内的时间戳为准（服务端时钟），Bridge 本地时钟仅作参考。

## 对账钩子（Reconciliation Hooks） {#s-m107}

Bridge SHOULD 实现三层定时对账，闭合"事件驱动可能丢失"的最后风险：

| 层 | 核对对象 | 协议接口 | 差异处置 |
| --- | --- | --- | --- |
| 商品层 | ERP 在售物料 × 平台 LISTED 集合 | `listing.query`（列表） | 缺失→补发布；多余→下架或核对映射 |
| 库存层 | ERP 渠道配额 × 平台 `available/holds` | `inventory.query` + `hold.query`（含 `revision` 流水与 `source_ref`） | 差异→定位缺失事件→校准 `set` |
| 单据层 | ERP SO/出库/应收 × 平台受理/发货/结算记录 | `acceptance.list`、`delivery.query`、`settlement.entry.query` | 差异→补传事实或提交 [对账闭环与差异处理（Reconciliation Loop）](settlement.md#s-m95) 差异申报 |

## 安全边界（Security Boundary） {#s-m108}

- Seller 私钥 MUST 由供应商侧（Bridge/HSM/密管服务）持有；MUST NOT 托管给 Marketplace。Bridge 代签场景下，Bridge 属于 Seller 信任域内组件。
- Bridge 北向出站 MUST 校验 Marketplace 回调签名（RFC 9421）与事件幂等；南向凭据（ERP 账号）MUST 与北向密钥隔离存储。
- Bridge 操作日志 MUST 记录：协议请求/响应摘要、签名指纹、ID 映射变更、游标推进——满足争议举证与审计要求（UTP 规范《风控与审计》的供应商侧落点）。
