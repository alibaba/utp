---
title: 库存原语
section: merchant
owner: merchant-team
status: review
version: 2026-07-31
---

# 库存原语（Inventory） {#s-m4}

## 目录 {#s-m4-toc}

- [Overview（概述）](#s-m41)
- [库存模型（Inventory Model）](#s-m42)
- [Error Handling（错误处理）](#s-m43)
- [Scopes（权限范围）](#s-m44)
- [Guidelines（角色职责指引）](#s-m45)
- [Mode-Driven Behavior（模式驱动行为）](#s-m46)
- [与 P3 Purchase 的库存一致性契约（Interlock with P3）](#s-m47)
- [操作矩阵（Operations Matrix）](#s-m48)
- [Entities（实体定义）](#s-m49)
- [Use Case Walkthroughs（用例演练）](#s-m410)

---

## 原语身份 {#s-m4-identity}

```
primitive_id:   utp.inventory
version:        2026-07-31
initiator_role: Seller
handler_role:   Marketplace
intent:         供应商维护商品可售数量，并与交易性占用（hold/lock）保持可核验一致
state_delta:    inventory.available 数值变更（资源作用域，无独立状态机）
actions:        set, adjust, query, hold.query, batch
compensation:   adjust（反向调整）；交易性占用的释放由 P3 补偿链触发
```

---

## Overview（概述） {#s-m41}

### 意图 {#s-m411}

Inventory 是 UTP-M 第二个供应商原语（MP2），其意图是让供应商维护 SKU 级可售数量（`available`），并让交易过程中由 P3 Purchase 触发的库存占用（hold）与锁定（lock）对供应商**可见、可查询、可对账**。Inventory 是防止超卖的协议基础。

### 关键设计原则 {#s-m412}

- **数量与信息分离**：Inventory 只管数量，商品信息属于 MP1。二者可独立变更、独立授权、独立限流（库存变更频率通常比商品信息高 2—3 个数量级）。
- **供应商是数量的唯一权威写入方：**`available` 只能由 Seller 通过 `set`/`adjust` 写入；Marketplace MUST NOT 主动修改 `available`，只能在其上叠加交易性占用。
- **交易性占用是 P3 的副作用，不是 MP2 的 Action**：hold（临时占用）与 lock（最终锁定）由 UTP-B 规范 `purchase.create`/`complete` 触发（[《Seller 角色职责》 Seller 职责"锁定库存"](../../../primitives/purchase/index.md#s-1352-seller)），MP2 提供 `hold.query` 让供应商核验占用明细。这保持了 P3 与 MP2 的正交：P3 消费库存，MP2 供给库存。
- **乐观并发**：写操作 MUST 携带 `expected_revision`（乐观锁）或声明 `commutative: true`（纯增量可交换模式，仅 `adjust`），防止 ERP 回写与平台扣减的并发丢失更新（库存一致性与防超卖（Inventory Consistency） 的防超卖基础）。**最简接入路径**：日常同步只用 `adjust + commutative: true`（无需维护版本号、天然抗乱序重试），仅在盘点校准时用 `set + expected_revision`——两个操作、两个场景，足以覆盖全部库存需求。

### 前置条件与后置条件 {#s-m413}

| 条件 | 类型 | 说明 |
| --- | --- | --- |
| `listing.status ∈ {PUBLISHED, LISTED, DELISTED}` | 前置 MUST | 库存挂在已建档商品的 SKU 上；`ARCHIVED` 商品 MUST 拒绝写入。 |
| `merchant.status ∈ {ACTIVE, RESTRICTED}` | 前置 MUST | `RESTRICTED` 仅允许下调（保护既有订单履行）。 |
| `inventory.available >= 0` | 后置 MUST | 任何操作后可售数量不为负。 |
| `inventory.revision` 单调递增 | 后置 MUST | 每次生效写入递增，供对账与并发控制。 |

### 语义契约 {#s-m414}

```json
{
  "primitive": "utp.inventory",
  "preconditions": [
    "listing.status ∈ {PUBLISHED, LISTED, DELISTED}",
    "merchant.status ∈ {ACTIVE, RESTRICTED}",
    "write_op → request.expected_revision != null"
  ],
  "postconditions": [
    "inventory.available >= 0",
    "inventory.revision == previous.revision + 1（生效写入时）",
    "sellable(sku) == available - Σ(active_holds) 且 >= 0"
  ],
  "invariants": [
    "available 只能由 Seller 写入；hold/lock 只能由 P3 交易事件产生",
    "任意时刻 Σ(active_holds) 
```

---

## 库存模型（Inventory Model） {#s-m42}

MP2 定义三层数量视图，粒度为 `listing_id + sku_id`（可选叠加 `warehouse_id` 多仓维度）：

![库存三层数量视图：available 权威值内含 active_holds 占用与 sellable 派生量，发货核销转入 consumed；下半部为 InventoryHold 生命周期 HELD/LOCKED/CONSUMED/RELEASED](../../../../assets/diagrams/m-inventory-model.svg)

| 数量语义 | 写入方 | 变更途径 |
| --- | --- | --- |
| `available` | Seller | `set`（绝对值覆盖）/ `adjust`（增量）；发货核销时系统扣减 |
| `hold`（临时占用） | 协议引擎（P3） | `purchase.create` 创建（带 TTL）；草案取消/过期释放 |
| `lock`（最终锁定） | 协议引擎（P3） | `purchase.complete` 原子成立；P3 补偿链释放 |
| `consumed`（已核销） | 协议引擎（MP5） | `delivery.ship` 确认后由 lock 转入 |
| `sellable` | 派生 | 只读，= `available - Σ(active_holds)` |

Inventory 无独立资源状态机；`hold` 记录具有生命周期：`HELD → LOCKED → CONSUMED` 或 `HELD/LOCKED → RELEASED`，全部由交易事件驱动，供应商通过 `hold.query` 只读核验。

---

## Error Handling（错误处理） {#s-m43}

| 错误码 | 严重级别 | HTTP 映射 | 描述 | 建议处理 |
| --- | --- | --- | --- | --- |
| `INVENTORY.SKU_NOT_FOUND` | error | 404 | `listing_id + sku_id` 不存在或不属于调用方。 | 校验标识。 |
| `INVENTORY.REVISION_CONFLICT` | error | 409 | `expected_revision` 与当前不一致（并发写入）。 | `query` 重读后重试；Bridge 场景见 库存一致性与防超卖（Inventory Consistency）。 |
| `INVENTORY.NEGATIVE_RESULT` | error | 422 | 操作将导致 `available < Σ(active_holds)` 或负值。 | 下调幅度不得低于当前占用量；先待占用释放。 |
| `INVENTORY.LISTING_ARCHIVED` | error | 409 | 商品已归档，库存不可写。 | 无需操作。 |
| `INVENTORY.MERCHANT_RESTRICTED` | error | 403 | `RESTRICTED` 商户尝试上调库存。 | 仅允许下调；联系平台。 |
| `INVENTORY.RATE_LIMITED` | warning | 429 | 变更频率超限。 | 合并变更或使用批量接口。 |
| `INVENTORY.HOLD_NOT_FOUND` | error | 404 | 查询的 `hold_id` 不存在。 | 以 `transaction_id` 维度重查。 |

---

## Scopes（权限范围） {#s-m44}

| Scope | 类型 | 描述 | 授予方 | 默认分配 |
| --- | --- | --- | --- | --- |
| `inventory:set` | Action Scope | 绝对值覆盖可售数量。 | Marketplace | Seller 角色（仅本方 SKU） |
| `inventory:adjust` | Action Scope | 增量调整可售数量。 | Marketplace | Seller 角色（仅本方 SKU） |
| `inventory:query` | Action Scope | 查询数量视图与 revision。 | Marketplace | Seller 角色（仅本方 SKU） |
| `inventory:hold:query` | Action Scope | 查询占用/锁定明细。 | Marketplace | Seller 角色（仅本方 SKU） |

**权限约束**：不存在 `hold:create`/`hold:release` Scope——占用的创建与释放是 P3 交易事件的副作用，任何角色 MUST NOT 通过 MP2 直接操纵占用。

---

## Guidelines（角色职责指引） {#s-m45}

### Seller 角色职责 {#s-m451}

| 职责 | 级别 | 说明 |
| --- | --- | --- |
| 数量真实 | MUST | `available` MUST 反映真实可履约数量；系统性虚高导致的高拒单率是平台治理（[商户生命周期状态（Merchant Lifecycle）](../../onboarding.md#s-m27) `RESTRICTED`）的依据。 |
| 及时同步 | MUST | 线下渠道或多平台销售导致实际库存变化时，MUST 及时下调；SHOULD 通过 Bridge 事件驱动同步（同步模式（Synchronization Patterns））。 |
| 使用 adjust 而非 set | SHOULD | 并发环境下 SHOULD 优先使用增量 `adjust`（交换律成立，冲突率低）；`set` 仅用于全量校准。 |
| 预警配置 | SHOULD | SHOULD 配置 `low_stock_threshold`，在低库存预警时补货或主动 `delist`。 |

### Marketplace 角色职责 {#s-m452}

| 职责 | 级别 | 说明 |
| --- | --- | --- |
| 占用可见 | MUST | 每笔 hold/lock MUST 关联 `transaction_id` 并可被 `hold.query` 查询；创建与释放 MUST 推送回调事件（[回调事件类型注册表](../../onboarding.md#s-m261)）。 |
| TTL 强制 | MUST | 临时 hold MUST 有有效期；到期 MUST 自动释放并推送 `hold_released`（与 UTP-B 规范 《状态定义与迁移规则》 草案过期一致）。 |
| 快照非绑定声明 | MUST | Source 投影中的 `stock` 是查询时点快照，MUST 遵循 UTP-B 规范 《与全局状态机的关系》 非绑定信息声明。 |
| 原子扣减 | MUST | `purchase.complete` 的最终锁定与 MP2 数量视图的变更 MUST 原子一致（同一事务或可线性化等价）。 |

---

## Mode-Driven Behavior（模式驱动行为） {#s-m46}

| Mode 维度 | 对 Inventory 的影响 |
| --- | --- |
| `decision_path` L0（即时下单） | hold 生命周期极短（create→complete 秒级），TTL SHOULD ≤ 30 分钟。 |
| `decision_path` L2+（审批流） | 草案可能长时间停留，hold TTL 由 Mode 协商的超时配置决定（UTP 规范 《会话超时上下文》）；供应商 SHOULD 关注长期占用。 |
| `fulfillment_structure` L2（分阶段履约） | 当某履约阶段包含数量交付义务时，lock MUST 按该阶段实际交付数量核销，剩余数量保持 LOCKED；是否采用分批发货由已锁定交易条款决定。 |
| `relationship_mode` L2+（框架协议） | MAY 为框架协议客户配置专属库存池（`pool_id`），框架内订单优先从专属池占用。 |

---

## 与 P3 Purchase 的库存一致性契约（Interlock with P3） {#s-m47}

本节是闭环不变式 2（商品—交易闭环（End-to-End Loop））的规范定义。平台托管拓扑下，协议引擎 MUST 保证：

1. **同源：**`purchase.create` 校验库存可用性（UTP-B 规范 《Seller 角色职责》 Seller 职责与 《操作定义（Actions）》 操作定义）读取的数量 == MP2 的 `sellable`。
2. **hold 映射：**`purchase.create` 创建的临时库存 hold（UTP-B 规范 《Seller 角色职责》）MUST 生成 MP2 InventoryHold 记录（状态 `HELD`，含 `transaction_id`、TTL）。
3. **lock 映射：**`purchase.complete` 的原子迁移条件之一"最终库存锁定成功"（UTP-B 规范 《状态迁移的原子性》）在 MP2 侧表现为对应 hold 状态 `HELD → LOCKED`；若无先行 hold，则直接创建 `LOCKED` 记录。
4. **释放映射**：P3 补偿链（UTP-B 规范 《补偿链执行》"释放已锁库存"）执行时，MP2 侧对应记录 MUST 迁移至 `RELEASED` 并推送 `hold_released` 回调。
5. **核销映射**：MP5 `delivery.ship` 确认后，对应 `LOCKED` 数量迁移至 `CONSUMED`，`available` 同步扣减（[库存模型（Inventory Model）](#s-m42)）。
6. **证据**：P3 要求的 `inventory_receipt` / `inventory_release_receipt`（UTP-B 规范状态机 T5 与 C-PURCHASE-FAILURE 的 required_evidence）由 Marketplace 基于 InventoryHold 状态迁移记录生成，供应商可通过 `hold.query` 获取同一记录用于对账。

自托管拓扑下，上述契约退化为供应商 Endpoint 的内部实现义务（其对买方承诺的 《Seller 角色职责》 职责不变）。

---

## 操作矩阵（Operations Matrix） {#s-m48}

### 操作矩阵 {#s-m481}

| 操作 | 语义 | `valid_next_actions` | 关键约束 |
| --- | --- | --- | --- |
| `utp.inventory.set` | 绝对值覆盖 `available` | `query`, `adjust` | Seller；MUST 携带 `expected_revision`；结果不得低于当前占用量。 |
| `utp.inventory.adjust` | 增量调整（±delta） | `query`, `adjust` | Seller；MUST 携带 `expected_revision` 或声明 `commutative: true`（纯增量模式，跳过版本检查）；结果非负。 |
| `utp.inventory.query` | 查询数量视图 | `set`, `adjust`, `hold.query` | Seller；支持按 `listing_id`/`sku_id` 批量查询。 |
| `utp.inventory.hold.query` | 查询占用明细 | `query` | Seller；支持按 `sku_id`/`transaction_id`/状态筛选，分页。 |
| `utp.inventory.batch` | 同 `set`/`adjust`，批量提交 | 逐条同单条操作 | Seller；单批 ≤ 500 条、逐条独立成败，MAY 异步；规则同 [批量模式（Batch Mode）](../../primitives/listing/index.md#s-m372)。 |

## Entities（实体定义） {#s-m49}

### InventoryRecord {#s-m491}

| 字段名 | 类型 | 必填 | 描述 |
| --- | --- | --- | --- |
| `listing_id` | string | 是 | 商品标识（[Listing](../../primitives/listing/index.md#s-m391)）。 |
| `sku_id` | string | 是 | SKU 标识。 |
| `warehouse_id` | string | 否 | 仓库维度标识；缺省为单仓合并视图。 |
| `available` | integer | 是 | 可售总量（Seller 权威值）。 |
| `held` | integer | 是 | 当前临时占用合计（派生）。 |
| `locked` | integer | 是 | 当前最终锁定合计（派生）。 |
| `sellable` | integer | 是 | 可下单量 = `available - held - locked`（派生）。 |
| `revision` | integer | 是 | 版本号，单调递增。 |
| `low_stock_threshold` | integer | 否 | 低库存预警阈值。 |
| `updated_at` | ISO-8601 | 是 | 最近变更时间。 |

### InventoryAdjustment {#s-m492}

| 字段名 | 类型 | 必填 | 描述 |
| --- | --- | --- | --- |
| `adjustment_id` | string | 是 | 调整记录唯一标识。 |
| `listing_id` / `sku_id` | string | 是 | 目标 SKU。 |
| `delta` | integer | 是 | 调整量（正为补货，负为核减）。 |
| `reason_code` | enum | 是 | `restock` / `offline_sale` / `damage` / `correction` / `channel_sync`。 |
| `expected_revision` | integer | 否 | 乐观锁版本；`commutative: true` 时可省略。 |
| `source_ref` | string | 否 | 来源单据引用（ERP 出入库单号，供 M10 对账）。 |
| `adjusted_at` | ISO-8601 | 是 | 调整时间。 |

### InventoryHold {#s-m493}

| 字段名 | 类型 | 必填 | 描述 |
| --- | --- | --- | --- |
| `hold_id` | string | 是 | 占用记录唯一标识。 |
| `listing_id` / `sku_id` | string | 是 | 目标 SKU。 |
| `transaction_id` | string | 是 | 关联的全局事务标识（P3 交易边界）。 |
| `purchase_id` | string | 是 | 关联的订购标识。 |
| `quantity` | integer | 是 | 占用数量。 |
| `status` | enum | 是 | `HELD` / `LOCKED` / `CONSUMED` / `RELEASED`。 |
| `expires_at` | ISO-8601 | 条件 | TTL 到期时间；`HELD` 状态必填。 |
| `created_at` / `updated_at` | ISO-8601 | 是 | 创建/最近迁移时间。 |

---

## Use Case Walkthroughs（用例演练） {#s-m410}

### 上架后设置库存并被下单占用 {#s-m4101}

```
// 1. Seller 设置库存
PUT /utp/m/v1/inventory/item-BT-NC-001/sku-X3-BLK
{
  "idempotency_key": "idem-inv-20260722-001",
  "available": 500,
  "expected_revision": 0,
  "low_stock_threshold": 50
}
// 响应
{ "available": 500, "held": 0, "locked": 0, "sellable": 500, "revision": 1 }

// 2. 买方 purchase.create（数量 100）触发 hold —— 回调推送给供应商
{
  "event": "utp.inventory.hold_created",
  "hold_id": "hold-20260722-0091",
  "sku_id": "sku-X3-BLK",
  "transaction_id": "utp-txn-01J4X7K9M2P5Q8R3V6W0YZ",
  "quantity": 100,
  "status": "HELD",
  "expires_at": "2026-07-22T11:00:00Z"
}

// 3. purchase.complete 成功 → hold 转 LOCKED；此时数量视图：
{ "available": 500, "held": 0, "locked": 100, "sellable": 400, "revision": 1 }

// 4. delivery.ship 确认 100 件 → LOCKED 转 CONSUMED，available 核销：
{ "available": 400, "held": 0, "locked": 0, "sellable": 400, "revision": 2 }
```

### ERP 增量同步（并发安全） {#s-m4102}

```
ERP 出库 30 件（线下渠道） → Bridge 推送：
POST /utp/m/v1/inventory/item-BT-NC-001/sku-X3-BLK/adjustments
{ "delta": -30, "reason_code": "offline_sale", "commutative": true,
  "source_ref": "ERP-OUT-20260722-118" }

同一时刻平台侧 lock 扣减并发发生 → 增量语义无冲突，
最终 available 一致收敛；对账以 revision 流水 + source_ref 核对（M10.6）。
```
