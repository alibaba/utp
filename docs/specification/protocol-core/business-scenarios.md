---
title: 商业场景
section: protocol-core
owner: protocol-architecture
status: drafting
version: 2026-07-30
---

# 商业场景（Business Scenarios）

商业场景用于说明同一组 UTP 原语、Mode 与商业拓扑如何组合成典型采购路径。一笔交易的实际路径由 Mode、CommerceTopology、已锁定交易条款和对应原语的标准结果共同确定。

本页描述 B2C 标准采购与 B2B 标准采购的基线路径。

## B2C 标准采购

### 场景描述

B2C 标准采购描述个人消费者通过电商平台购买一件标准商品的路径。典型特征是固定售价、即时下单、即时全额支付和直接履约。该场景使用最简 Mode 配置，状态路径通常跳过 `NEGOTIATING`，从 `SOURCING` 进入 `PURCHASING`，再推进到 `PAYING`、`FULFILLING` 和 `SETTLED`。

### Mode 配置

| 维度 | Level | 含义 |
| --- | --- | --- |
| `pricing_mode` | `L0` | 固定售价。 |
| `decision_path` | `L0` | 买方按当前有效价格进入订购。 |
| `payment_structure` | `L0` | 即时全额支付。 |
| `fulfillment_structure` | `L0` | 直接履约。 |
| `relationship_mode` | `L0` | 一次性交易。 |
| `compliance_level` | `L0` | 无附加合规要求。 |

Mode 六元组为 `(L0, L0, L0, L0, L0, L0)`。

### 拓扑

B2C 标准采购使用基础支付和履约责任结构。Buyer 与 Payer 可以由同一消费者承担，Seller 与 Payee 可以由同一商家承担，但拓扑仍显式保留这些责任角色。

```json
{
  "topology_id": "b2c_standard_purchase",
  "roles": [
    "Buyer",
    "Payee",
    "Payer",
    "PaymentProcessor",
    "Seller"
  ],
  "role_relationships": [
    {
      "role_pair": ["Buyer", "Seller"],
      "relation_types": ["information", "fulfillment"],
      "description": "商品、订单信息交换及商品交付关系。"
    },
    {
      "role_pair": ["Buyer", "Payer"],
      "relation_types": ["authorization", "evidence"],
      "description": "买方授权支付方付款，并接收付款结果证据。"
    },
    {
      "role_pair": ["Payer", "Payee"],
      "relation_types": ["funds"],
      "description": "支付方与收款方之间存在支付和退款关系。"
    },
    {
      "role_pair": ["Payer", "PaymentProcessor"],
      "relation_types": ["authorization", "funds", "evidence"],
      "description": "支付方授权支付处理方执行支付或退款，并接收处理结果。"
    },
    {
      "role_pair": ["Payee", "PaymentProcessor"],
      "relation_types": ["authorization", "funds", "evidence"],
      "description": "收款方授权支付处理方处理收款或退款，并接收处理结果。"
    },
    {
      "role_pair": ["Seller", "Payee"],
      "relation_types": ["authorization", "evidence"],
      "description": "卖方授权收款方收款，并接收收款结果证据。"
    }
  ]
}
```

标准快递如果只是 Seller 的履约安排，不需要在拓扑中声明独立角色；如果承运方以独立责任方参与协议，则拓扑应加入 `Shipper`，并将 `fulfillment_structure` 调整为与该责任结构匹配的 Level。

### 原语路径

![B2C 标准采购原语路径：P1 Source 形成候选集合，P3 Purchase 确认订购，P4 Pay 完成支付，P5 Fulfill 履约和收货。](/documentation/assets/diagrams/b2c-standard-purchase-primitive-path.svg)

| 顺序 | 原语 Action | 状态影响 | 说明 |
| --- | --- | --- | --- |
| 1 | `utp.source.search` 或 `utp.source.lookup` | `INIT -> SOURCING` 或保持 `SOURCING` | 形成或更新候选商品集合，沿用 `trade_context_id`。 |
| 2 | `utp.purchase.create` / `utp.purchase.update` | 保持上下文级状态 | 创建或调整 Purchase 草案，不创建 `transaction_id`。 |
| 3 | `utp.purchase.complete` | 派生 `PURCHASING` | 确认独立交易边界后形成 `transaction_id` 和交易级 `StateView`。 |
| 4 | `utp.pay.initiate` / `utp.pay.confirm` | 进入或保持 `PAYING` | 完成即时全额支付义务。支付渠道流水不得替代 `transaction_id`。 |
| 5 | `utp.fulfill.notify` | `PAYING -> FULFILLING` | 接受发货、妥投或其他履约事件。 |
| 6 | `utp.fulfill.receive` | `FULFILLING -> SETTLED` | 买方收货或验收完成，且付款义务已完成。 |

该路径不经过 `NEGOTIATING`。`purchase.complete` 是交易级状态形成点；此后的 Purchase、Pay、Fulfill 和可能发生的 Resolve 均绑定同一 `transaction_id`。

## B2B 标准采购

### 场景描述

B2B 标准采购是一类满足企业采购最低要求的场景基线。标准 B2B 场景要求 Buyer 与 Seller 至少具备组织主体身份，交易过程形成可审计的固定价条款快照或 Binding Terms、Purchase Credential、企业主体或资质核验结果，并将 Purchase、Pay、Fulfill 和可能发生的 Resolve 绑定到同一个 `transaction_id`。

最低标准 B2B 采购可以是简单企业采购：企业向办公耗材供应商采购 100 箱 A4 复印纸，供应商给出固定企业价，买方按当前有效价格订购，使用企业账户一次性付款，卖方按约定地址直接发货，交易完成后开具企业发票。该交易的 B2B 属性来自组织主体、采购凭证、资质核验、发票与审计要求。

### 最低标准案例：企业办公耗材采购

#### Mode 配置

| 维度 | Level | 含义 |
| --- | --- | --- |
| `pricing_mode` | `L0` | 固定企业价。 |
| `decision_path` | `L0` | 买方按当前有效价格进入订购。 |
| `payment_structure` | `L0` | 即时全额付款。 |
| `fulfillment_structure` | `L0` | 直接履约。 |
| `relationship_mode` | `L0` | 一次性交易。 |
| `compliance_level` | `L1` | 企业主体与资质核验。 |

Mode 六元组为 `(L0, L0, L0, L0, L0, L1)`。该配置表示本笔交易采用最简交易路径，但仍满足企业主体、采购凭证、发票和审计要求。

#### 拓扑

```json
{
  "topology_id": "b2b_baseline_procurement",
  "roles": [
    "Buyer",
    "Payee",
    "Payer",
    "PaymentProcessor",
    "Seller"
  ],
  "role_relationships": [
    {
      "role_pair": ["Buyer", "Seller"],
      "relation_types": ["information", "fulfillment"],
      "description": "企业采购信息交换和办公耗材交付关系。"
    },
    {
      "role_pair": ["Buyer", "Payer"],
      "relation_types": ["authorization", "evidence"],
      "description": "企业采购方授权企业支付方付款，并交换采购授权和付款结果证据。"
    },
    {
      "role_pair": ["Payer", "Payee"],
      "relation_types": ["funds"],
      "description": "企业支付方与收款方之间存在全额支付和退款关系。"
    },
    {
      "role_pair": ["Payer", "PaymentProcessor"],
      "relation_types": ["authorization", "funds", "evidence"],
      "description": "企业支付方授权支付处理方执行支付或退款，并接收处理结果。"
    },
    {
      "role_pair": ["Payee", "PaymentProcessor"],
      "relation_types": ["authorization", "funds", "evidence"],
      "description": "企业收款方授权支付处理方处理收款或退款，并接收处理结果。"
    },
    {
      "role_pair": ["Seller", "Payee"],
      "relation_types": ["authorization", "evidence"],
      "description": "企业供应方授权收款方收款，并交换发票和收款结果证据。"
    }
  ]
}
```

最低标准案例不引入 `Shipper` 或 `Inspector` 责任角色。企业资质核验属于合规证据，在 Source 与 Purchase 阶段提交和引用；卖方自配送时仍由 Seller 承担 Fulfill 责任。

#### 原语路径

![B2B 最低标准采购原语路径：P1 Source 管理采购意图、企业主体核验和候选商品，跳过 P2 Negotiate，P3 Purchase 形成采购凭证，P4 Pay 使用企业账户全额支付，P5 Fulfill 由卖方直接履约。](/documentation/assets/diagrams/b2b-baseline-procurement-primitive-path.svg)

| 顺序 | 原语 Action | 状态影响 | 说明 |
| --- | --- | --- | --- |
| 1 | `utp.source.search` 或 `utp.source.lookup` | `INIT -> SOURCING` 或保持 `SOURCING` | 管理采购意图、企业主体核验和候选商品。 |
| 2 | `utp.purchase.create` / `utp.purchase.update` | 保持上下文级状态 | 创建或调整 Purchase 草案；可引用企业资质、发票抬头和采购授权信息。 |
| 3 | `utp.purchase.complete` | 派生 `PURCHASING` | 确认独立交易边界，形成 `transaction_id` 和 Purchase Credential。 |
| 4 | `utp.pay.initiate` / `utp.pay.confirm` | 进入或保持 `PAYING` | 使用企业账户完成即时全额支付。 |
| 5 | `utp.fulfill.notify` / `utp.fulfill.receive` | `PAYING -> FULFILLING -> SETTLED` | 卖方直接履约，收货或验收完成后交易收敛。 |

该路径跳过 `NEGOTIATING`，与 B2C 最简路径相比，它增加的是 `compliance_level = L1` 带来的组织主体、采购授权、发票和审计证据要求。
