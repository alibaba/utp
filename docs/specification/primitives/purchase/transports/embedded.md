---
title: 订购原语 — EMBEDDED 绑定
section: primitives
owner: purchase-team
status: drafting
version: 2026-07-29
---

# 订购原语 — EMBEDDED 绑定

## Embedded SDK Binding {#s-13-8-4}
| 操作 | SDK 方法签名 | 说明 |
| --- | --- | --- |
| `utp.purchase.create` | `client.purchase.create(request: OrderCreateRequest): Promise` | 创建订单草案。 |
| `utp.purchase.update` | `client.purchase.update(purchaseId: string, updates: OrderUpdate): Promise` | 更新订单草案。 |
| `utp.purchase.complete` | `client.purchase.complete(purchaseId: string, mandate: Mandate): Promise` | 完成订单订购。 |
| `utp.purchase.contract_create` | `client.purchase.contractCreate(request: ContractCreateRequest): Promise` | 创建合同草案。 |
| `utp.purchase.contract_update` | `client.purchase.contractUpdate(agreementId: string, updates: ContractUpdate): Promise` | 更新合同草案。 |
| `utp.purchase.contract_complete` | `client.purchase.contractComplete(agreementId: string, mandate: Mandate): Promise` | 完成合同承诺。 |
| `utp.purchase.query` | `client.purchase.query(target: PurchaseId \| AgreementId): Promise` | 查询订单或合同状态。 |
| `utp.purchase.cancel` | `client.purchase.cancel(target: PurchaseId \| AgreementId): Promise` | 取消订单或合同草案。 |

---
