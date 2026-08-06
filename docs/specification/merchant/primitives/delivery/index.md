---
title: 交付原语
section: merchant
owner: merchant-team
status: review
version: 2026-07-31
---

# 交付原语（Delivery） {#s-m7}

## 目录 {#s-m7-toc}

- [Overview（概述）](#s-m71)
- [Lifecycle / State Machine（生命周期 / 状态机）](#s-m72)
- [Error Handling（错误处理）](#s-m73)
- [Scopes（权限范围）](#s-m74)
- [Guidelines（角色职责指引）](#s-m75)
- [Mode-Driven Behavior（模式驱动行为）](#s-m76)
- [与 P5 Fulfill 的事实传导契约（Interlock with P5）](#s-m77)
- [操作矩阵（Operations Matrix）](#s-m78)
- [Entities（实体定义）](#s-m79)
- [Use Case Walkthroughs（用例演练）](#s-m710)

---

## 原语身份 {#s-m7-identity}

```
primitive_id:   utp.delivery
version:        2026-07-31
initiator_role: Seller
handler_role:   Marketplace
intent:         供应商以协议动作完成备货申报、发货、拆单与履约异常申报
state_delta:    purchase_credential → delivery(SHIPPED)（资源作用域）
actions:        prepare, ship, split, update, query
compensation:   异常申报（update: exception/delay）→ 传导为买方侧 DELAYED；
                拒收/争议由 P5/P6 处理，MP5 不定义逆向物流原语
```

---

## Overview（概述） {#s-m71}

### 意图 {#s-m711}

Delivery 是 UTP-M 第五个供应商原语（MP5），其意图是让供应商以标准协议动作申报**履约执行事实**：备货进度、发货（运单）、分批拆单、延迟与异常。 UTP-B 规范 P5 Fulfill 是"采购方可观测"的履约原语（[采购方可观测状态机](../../../primitives/fulfill/index.md#s-1531)），其 `notify` 推送的事实来源在 UTP 规范中留白——MP5 正式定义这些事实的产生方式，闭合"供应商发货 → 买方感知"的链路。

### 关键设计原则 {#s-m712}

- **MP5 产生事实，P5 消费事实**。MP5 的每个生效动作 MUST 由 Marketplace 转换为买方侧 `fulfill.notify` 推送（载荷 `FulfillNotifyInput`）与 `fulfill.query` 可查询的履约事件（`FulfillmentEvent`，[与 P5 Fulfill 的事实传导契约（Interlock with P5）](#s-m77)）。买方可观测状态机（SHIPPED/DELAYED/DELIVERED）的驱动源即 MP5。
- **备货态是供应商内部状态的最小外露**。UTP-B 规范明确"备货、待发等供应方内部状态不在（买方可观测）状态机范围内"（《采购方可观测状态机》）。MP5 的 `prepare` 仅用于供应商向平台申报备货进度（供 `leadtime` 查询参考与延迟预警），MUST NOT 触发买方可观测状态迁移。
- **验收永远在买方。**`receive`/`reject`/`inspect` 是 P5 的买方/检验方动作；MP5 不定义任何验收或逆向物流动作，退换货走 P6 Resolve 的补偿指令。

### 范围 {#s-m713}

- **备货申报（prepare）**：申报备货开始/完成，更新预计发货时间。
- **发货（ship）**：提交运单（承运商、运单号、包裹明细、批次），产出签名的 Shipment 凭证；触发库存核销（[与 P3 Purchase 的库存一致性契约（Interlock with P3）](../../primitives/inventory/index.md#s-m47)）。
- **拆单（split）**：将一笔订单拆分为多个交付批次（需 Listing 声明 `splittable` 且已锁定交易条款允许）。
- **异常申报（update）**：延迟、破损重发、物流商变更、跨境单证事件等履约事实的补充申报。
- **查询（query）**：发货单与批次状态检索。

### 前置条件 {#s-m714}

| 条件 | 必需？ | 说明 |
| --- | --- | --- |
| `purchase.status == 'PURCHASED'` | MUST | 订购已成立（MP4 ACCEPTED 且 P3 原子迁移完成）。 |
| TradeMethod 履约前置条件已满足 | MUST | 与 UTP-B 规范 《前置条件》 前置条件一致：`payment_structure == L0`（全额预付）时付款完成后方可发货；分期/后付按 TradeMethod 锁定的子步骤执行。 |
| `session.state ∈ {FULFILLING, PAYING}` | MUST | 分期场景 Pay 与 Fulfill 交叉执行（UTP-B 规范 《前置条件》）。 |
| `split → listing.fulfillment_terms.splittable == true` | MUST | 拆单需商品声明支持，且已锁定交易条款明确允许分批交付；不得仅根据 `fulfillment_structure` 等级推导。 |

### 后置条件与语义契约 {#s-m715}

```json
{
  "primitive": "utp.delivery",
  "postconditions": [
    "delivery.shipment_id != null（ship 成功后）",
    "shipment.status == 'SHIPPED' → 买方收到 fulfill.notify(SHIPPED)",
    "inventory.lock(对应数量) → CONSUMED（M4.7 核销映射）",
    "shipment ∈ evidence_bundle（含运单、签名、时间戳）"
  ],
  "invariants": [
    "Σ(全部批次数量) == purchase.line_items 数量（不多发不漏发）",
    "shipment.transaction_id == purchase.transaction_id",
    "ship 后运单核心字段（承运商、运单号）不可篡改，更正 MUST 以 update 事件追加"
  ],
  "side_effects": [
    "买方侧可观测状态迁移（经 fulfill.notify）",
    "库存核销（LOCKED → CONSUMED）",
    "分期场景：发货事实 MAY 触发下一期支付条件（TradeMethod 子步骤）"
  ],
  "compensation": {
    "on_delay": "update(type=delay) → 买方侧 DELAYED；超过约定时限买方可发起 Resolve",
    "on_logistics_exception": "update(type=exception) + 重发批次（新 package）；原包裹事实保留",
    "on_buyer_reject": "P5 reject → P6 Resolve 补偿指令决定退货/退款；MP5 只读关联"
  }
}
```

---

## Lifecycle / State Machine（生命周期 / 状态机） {#s-m72}

### Shipment 资源状态机（供应商视角） {#s-m721}

![Shipment 资源状态机：PREPARING/READY/SHIPPED/EXCEPTION/DELIVERED/CLOSED 及买方可观测映射](../../../../assets/diagrams/m-delivery-state-machine.svg)

分批交付时，每个批次（`batch_id`）独立走上述状态机；订单级视图是全部批次状态的聚合。

### 状态定义与迁移规则 {#s-m722}

| 状态 | 含义 | 进入条件 | 允许的操作 | 买方可观测映射 |
| --- | --- | --- | --- | --- |
| `PREPARING` | 备货中（内部状态外露） | `prepare` 申报 | `prepare`, `ship`, `split`, `update`, `query` | 无（不迁移买方状态；供 leadtime 参考） |
| `READY` | 备货完成待交运 | `prepare(completed)` | `ship`, `split`, `update`, `query` | 无 |
| `SHIPPED` | 已交运（凭证已生成） | `ship` 成功（运单校验通过） | `update`, `query` | `fulfill.notify → SHIPPED` |
| `EXCEPTION` | 履约异常（延迟/破损/丢件） | `update(type=delay\|exception)` | `update`（更正/重发）, `query` | `fulfill.notify → DELAYED`（发货前延迟）或异常履约事件 |
| `DELIVERED` | 已妥投（物流回执镜像，只读） | 承运商妥投回执经 Marketplace 确认 | `query` | `fulfill.notify → DELIVERED` |
| `CLOSED` | 批次履约事实闭合（终态） | 买方 `receive`（或 `reject` 进入 Resolve 后裁决完毕） | `query`（只读） | `RECEIVED / FULFILLED`（P5 内部） |

**确定性约束：**`ship` 对已 `SHIPPED` 批次 MUST 幂等返回既有凭证；`DELIVERED`/`CLOSED` 由回执与买方动作驱动，供应商 MUST NOT 直接声明（与 UTP-B 规范 《全局状态机》"状态不能因参与方直接声明目标状态而推进"一致）。

---

## Error Handling（错误处理） {#s-m73}

| 错误码 | 严重级别 | HTTP 映射 | 描述 | 建议处理 |
| --- | --- | --- | --- | --- |
| `DELIVERY.ORDER_NOT_PURCHASED` | error | 409 | 订购未成立（非 `PURCHASED`）即尝试发货。 | 等待 MP4 受理与 P3 成立。 |
| `DELIVERY.PAYMENT_PRECONDITION` | error | 409 | TradeMethod 约定的支付前置条件未满足（如定金未确认）。 | 等待 PaymentConfirmation。 |
| `DELIVERY.QUANTITY_MISMATCH` | error | 422 | 批次数量合计与订单数量不一致（超发/漏发）。 | 校正包裹明细。 |
| `DELIVERY.SPLIT_NOT_ALLOWED` | error | 403 | 商品未声明 `splittable`，或已锁定交易条款不允许分批交付。 | 整单发货或与买方协商变更条款。 |
| `DELIVERY.TRACKING_INVALID` | error | 422 | 运单号格式无效或承运商不可识别。 | 校验 `carrier_code` 与运单号。 |
| `DELIVERY.ALREADY_SHIPPED` | warning | 409 | 批次已发货。 | 幂等返回既有 Shipment 凭证。 |
| `DELIVERY.OVERDUE` | warning | 200 | 发货已超过承诺交期（响应内警示，非拒绝）。 | 立即发货或 `update(delay)` 申报延迟。 |
| `DELIVERY.NOT_FOUND` | error | 404 | 发货单/批次不存在或不属于调用方。 | 校验标识。 |

---

## Scopes（权限范围） {#s-m74}

| Scope | 类型 | 描述 | 授予方 | 默认分配 |
| --- | --- | --- | --- | --- |
| `delivery:prepare` | Action Scope | 申报备货进度。 | Marketplace | Seller 角色（仅本方订单） |
| `delivery:ship` | Action Scope | 提交发货凭证。 | Marketplace | Seller 角色 |
| `delivery:split` | Action Scope | 声明分批交付计划。 | Marketplace | Seller 角色（Listing 与已锁定交易条款允许时） |
| `delivery:update` | Action Scope | 申报延迟/异常/更正事件。 | Marketplace | Seller 角色 |
| `delivery:query` | Action Scope | 查询发货单与批次状态。 | Marketplace | Seller 角色；Shipper 对其承运批次可读 |

**约束：**`ship` 的 Shipment 凭证 MUST 携带 Seller ES256 签名；当某段履约责任由独立物流方承担时，承运段的轨迹事实由 Shipper 按 UTP-B 规范 `Fulfill.track` 义务提交，MP5 不代替 Shipper 签名。

---

## Guidelines（角色职责指引） {#s-m75}

### Seller 角色职责 {#s-m751}

| 职责 | 级别 | 说明 |
| --- | --- | --- |
| 按期发货 | MUST | MUST 在承诺交期（Listing `leadtime_days` 或 MP4 修订值）内 `ship`；预见延迟 MUST 提前 `update(delay)` 申报。 |
| 运单真实 | MUST | 承运商、运单号 MUST 真实有效；虚假发货（空单号刷时效）是平台治理与 P6 争议中的重责事实。 |
| 包裹明细完整 | MUST | `packages[].items` MUST 精确到 `sku_id + quantity`，与订单行对齐；含 `external_ref` 便于买方与 ERP 对单。 |
| 批次计划先行 | SHOULD | 分批交付 SHOULD 先以 `split` 声明完整批次计划，再逐批 `ship`，让买方对齐预期。 |
| 单证同步 | MUST（`compliance_level ≥ L2`） | 跨境单证（报关、原产地证）事件 MUST 经 `update(type=customs)` 申报并附文档引用。 |

### Marketplace 角色职责 {#s-m752}

| 职责 | 级别 | 说明 |
| --- | --- | --- |
| 事实转换 | MUST | MP5 生效事件 MUST 在声明时限（SHOULD ≤ 60s）内转换为买方侧 `fulfill.notify` 推送与履约事件流（[与 P5 Fulfill 的事实传导契约（Interlock with P5）](#s-m77) 映射表）。 |
| 回执汇聚 | MUST | MUST 汇聚承运商/Shipper 回执，驱动 `DELIVERED` 镜像状态，并向供应商推送 `delivery_receipt` [回调](../../onboarding.md#s-m261)。 |
| 凭证归档 | MUST | Shipment 凭证、异常事件、回执 MUST 纳入 Evidence Bundle，保存期不低于争议时效期。 |
| 时效监控 | SHOULD | SHOULD 监控发货时效并在临近超期时预警供应商（`DELIVERY.OVERDUE` 警示）。 |

---

## Mode-Driven Behavior（模式驱动行为） {#s-m76}

| Mode 配置 | MP5 行为 |
| --- | --- |
| fulfillment=L0（直接履约） | Seller 自行配送：`ship` 的 `carrier_code` MAY 为 `self_delivery`；轨迹事件由 Seller 经 `update` 自行申报。 |
| fulfillment=L1（标准委托） | `ship` MUST 携带承运商与运单号；轨迹由承运商数据源汇聚。 |
| fulfillment=L2（分阶段履约） | 阶段性发货事实和凭证 MUST 可关联到所属履约阶段；`split` 仅在交易条款允许时可用；某阶段要求独立检验时，`INSPECTED` 结论由 Inspector 提交（P5），MP5 只读。 |
| fulfillment=L3（跨境） | `update` 事件类型扩展 `customs`/`document`；清关事实经 `fulfill.notify` 进入买方可观测履约事件流（`FulfillNotifyInput.event_type = CUSTOMS`）。 |
| payment=L1+（分期/里程碑） | `ship`/`DELIVERED`/检验合格等事实按 TradeMethod 子步骤 MAY 触发下一期支付条件；MP5 响应 MUST 回显所触发的子步骤标识。 |
| type=service/digital（服务/虚拟） | 物流状态跳过：`ship` 语义为"服务激活/交付物开通"，`tracking` 字段以激活凭证替代（UTP-B 规范 《模式驱动行为（Mode-Driven Behavior）》 虚拟商品条款的供给侧对应）。 |

---

## 与 P5 Fulfill 的事实传导契约（Interlock with P5） {#s-m77}

本节是闭环不变式 4（商品—交易闭环（End-to-End Loop））的规范定义。Marketplace MUST 按下表执行 MP5 → P5 的事实转换：

| MP5 事件 | 买方侧 `fulfill.notify` | `FulfillNotifyInput.status` | 买方可观测状态 |
| --- | --- | --- | --- |
| `ship` 成功 | 发货通知（含运单、批次、ETA） | `SHIPPED` | `SHIPPED` |
| `update(type=delay)`（发货前） | 延迟通知（含新 ETA 与原因） | `DELAYED` | `DELAYED` |
| `update(type=exception)`（在途） | 异常通知 | `IN_TRANSIT`（附异常描述） | 不变（事件流可见） |
| 承运商妥投回执 | 妥投通知 | `DELIVERED` | `DELIVERED` |
| `update(type=customs)` | 清关事件（L3） | `CUSTOMS` | 不变（事件流可见） |

- `shipment_id`、`batch_id`、`tracking_number` 在两侧 MUST 同值——买方 `track` 查到的与供应商 `query` 查到的 是同一记录的两个投影（字段可见性按角色权限裁剪）。
- 转换生成的通知载荷 MUST 符合 UTP-B 规范 [订单履约事件通知（notify）](../../../primitives/fulfill/index.md#s-1571)定义的 `FulfillNotifyInput` 结构并携带 `transaction_id`。
- 买方 `receive` 生成的收货凭证（`FulfillReceiveOutput`）、`reject` 生成的拒收凭证（`FulfillRejectOutput`，含 `RejectionConfirmation`）MUST 经回调 `utp.delivery.receipt` 通知供应商（[回调事件类型注册表](../../onboarding.md#s-m261)），驱动 MP5 侧 `CLOSED`。
- 全部批次 `CLOSED` 且其他义务完成后，全局状态是否迁移 `SETTLED` 由全局状态机决定（UTP-B 规范 《状态定义》），MP5 不参与该判定。

---

## 操作矩阵（Operations Matrix） {#s-m78}

### 操作矩阵 {#s-m781}

| 操作 | 适用状态 | 状态影响 | `valid_next_actions` | 关键约束 |
| --- | --- | --- | --- | --- |
| `utp.delivery.prepare` | （订购成立后）, `PREPARING` | 进入/更新 `PREPARING`；`completed` 时进入 `READY` | `ship`, `split`, `update`, `query` | Seller；可选动作；不触发买方状态迁移。 |
| `utp.delivery.split` | `PREPARING`, `READY` | 登记批次计划（不发货） | `ship`, `update`, `query` | Seller；MUST 满足 Listing 的 `splittable` 声明与已锁定交易条款；批次数量合计 == 订单数量。 |
| `utp.delivery.ship` | `PREPARING`, `READY`（或直接首次调用） | 批次进入 `SHIPPED`；生成签名凭证；库存核销；触发买方 notify | `update`, `query` | Seller；MUST 附运单与包裹明细；MUST 携带 Seller 签名；幂等。 |
| `utp.delivery.update` | `PREPARING`, `READY`, `SHIPPED`, `EXCEPTION` | 追加事件（delay/exception/customs/correction）；delay 使买方侧 `DELAYED` | `ship`（重发）, `query` | Seller；事件 MUST 附结构化类型与说明；不可覆盖既有事实，只可追加。 |
| `utp.delivery.query` | 任意 | 无 | 当前状态可执行动作 | Seller；按 `transaction_id`/`shipment_id`/`batch_id` 查询，含回执与买方验收结论镜像。 |

## Entities（实体定义） {#s-m79}

### Shipment（发货凭证） {#s-m791}

| 字段名 | 类型 | 必填 | 描述 |
| --- | --- | --- | --- |
| `shipment_id` | string | 是 | 发货单唯一标识；与 UTP-B 规范 P5 履约事件与 `Shipment` 实体的 `shipment_id` 同值。 |
| `transaction_id` / `purchase_id` | string | 是 | 关联全局事务与订购标识。 |
| `batch_id` | string | 条件 | 批次标识；分批交付时必填，整单发货可省略。 |
| `status` | enum | 是 | [状态定义与迁移规则](#s-m722) 状态枚举。 |
| `carrier_code` | string | 是 | 承运商标识（标准承运商码表或 `self_delivery`）。 |
| `tracking_number` | string | 条件 | 运单号；`self_delivery`/虚拟交付可以激活凭证替代。 |
| `packages` | Package[] | 是 | 包裹明细（[Package](#s-m792)），至少一件。 |
| `ships_from` | string | 是 | 实际发货地。 |
| `estimated_delivery_at` | ISO-8601 | 否 | 预计送达时间（ETA）。 |
| `shipped_at` | ISO-8601 | 是 | 交运时间。 |
| `document_refs` | array | 否 | 单证引用（发货单、报关单、原产地证等）；`compliance_level ≥ L2` 时按要求必附。 |
| `seller_signature` | string | 是 | Seller ES256 签名（JWS），覆盖 `shipment_hash`。**shipment_hash 定义（规范性）**：对对象 `{transaction_id, batch_id, carrier_code, tracking_number, packages, ships_from, shipped_at}`（缺省字段省略键）按 RFC 8785（JCS）规范化后的 UTF-8 字节串计算 SHA-256，十六进制小写串作为 JWS payload（统一规则见 通用规则继承（Commons Inheritance））。Marketplace MUST 重算并验证，不一致返回 `DELIVERY.TRACKING_INVALID`。 |

### Package {#s-m792}

| 字段名 | 类型 | 必填 | 描述 |
| --- | --- | --- | --- |
| `package_no` | string | 是 | 包裹编号（发货单内唯一）。 |
| `items` | array | 是 | 装箱明细：`{listing_id, sku_id, external_ref, quantity}`。 |
| `weight_kg` / `dimensions_cm` | number / object | 否 | 重量与体积（长宽高）。 |

### ShipmentEvent（异常/补充事件） {#s-m793}

| 字段名 | 类型 | 必填 | 描述 |
| --- | --- | --- | --- |
| `event_id` | string | 是 | 事件唯一标识。 |
| `shipment_id` | string | 是 | 关联发货单。 |
| `type` | enum | 是 | `delay` / `exception` / `customs` / `document` / `correction`。 |
| `reason_code` | string | 是 | 结构化原因码（如 `stockout_delay`、`carrier_lost`、`customs_inspection`）。 |
| `detail` | string | 否 | 补充说明。 |
| `new_eta` | ISO-8601 | 条件 | `type == delay` 时必填。 |
| `evidence_refs` | array | 否 | 证据引用（破损照片、承运商异常单等）。 |
| `occurred_at` | ISO-8601 | 是 | 事件时间。 |
| `seller_signature` | string | 是 | Seller ES256 签名。 |

### SplitPlan {#s-m794}

`SplitPlan` 记录 `plan_id`、`transaction_id`、批次数组（每批 `batch_id`、商品明细、计划发货时间）与 `seller_signature`（覆盖 `plan_hash`：对 `{transaction_id, batches}` 按 RFC 8785 规范化后的 SHA-256，统一规则见 通用规则继承（Commons Inheritance））。批次数量合计 MUST 等于订单数量；计划登记后各批次按 `ship` 独立执行，计划变更以新版本追加（不可删除已发货批次）。

---

## Use Case Walkthroughs（用例演练） {#s-m710}

### 标准发货与买方感知 {#s-m7101}

```
// Seller 发货
POST /utp/m/v1/deliveries
{
  "idempotency_key": "idem-ship-20260723-001",
  "transaction_id": "utp-txn-01J4X7K9M2P5Q8R3V6W0YZ",
  "purchase_id": "ORD-20260722-88721",
  "shipment": {
    "carrier_code": "SF",
    "tracking_number": "SF1234567890123",
    "ships_from": "上海",
    "estimated_delivery_at": "2026-07-26T18:00:00Z",
    "packages": [
      { "package_no": "PKG-001",
        "items": [ { "listing_id": "item-BT-NC-001", "sku_id": "sku-X3-BLK",
                     "external_ref": "ERP-MAT-004512", "quantity": 100 } ],
        "weight_kg": 25.0 }
    ]
  },
  "seller_signature": "eyJhbGciOiJFUzI1NiJ9..."
}

// 响应
{
  "shipment_id": "shp-20260723-0442",
  "status": "SHIPPED",
  "inventory_effect": { "sku-X3-BLK": { "locked_consumed": 100 } },
  "valid_next_actions": ["utp.delivery.update", "utp.delivery.query"]
}

// Marketplace 同步转换为买方侧 fulfill.notify（UTP-B 规范 15.7.1）：
// POST {buyer_callback_base}/utp/v1/fulfillments/notifications
// { "transaction_id": "...", "shipment_id": "shp-20260723-0442",
//   "status": "SHIPPED", "tracking_number": "SF1234567890123", ... }
```

### 延迟申报与分批发货 {#s-m7102}

```
延迟：POST /utp/m/v1/deliveries/{id}/events
      { "type": "delay", "reason_code": "stockout_delay",
        "new_eta": "2026-07-30T18:00:00Z" }
      → 买方可观测状态 → DELAYED；买方可依约发起 Resolve 或等待

分批：split（批次 A 60 件 / 批次 B 40 件）→ ship(A) → 买方 receive(A)
      → PARTIAL_DELIVERED（P5）→ ship(B) → receive(B) → FULFILLED
```
