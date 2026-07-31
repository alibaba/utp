---
title: 订购原语 — MCP 绑定
section: primitives
owner: purchase-team
status: drafting
version: 2026-07-29
---

# 订购原语 — MCP 绑定

## MCP 绑定（MCP Binding） {#s-13-8-2}

| 操作 | MCP Tool Name | 说明 |
| --- | --- | --- |
| `utp.purchase.create` | `utp_purchase_create` | 输入为 OrderCreateRequest。 |
| `utp.purchase.update` | `utp_purchase_update` | 输入为对应对象的草案更新请求。 |
| `utp.purchase.complete` | `utp_purchase_complete` | 输入为 PurchaseCompleteRequest（含 Mandate）。 |
| `utp.purchase.contract-create` | `utp_purchase_contract_create` | 输入为 ContractCreateRequest。 |
| `utp.purchase.contract-update` | `utp_purchase_contract_update` | 输入为 ContractUpdateRequest。 |
| `utp.purchase.contract-complete` | `utp_purchase_contract_complete` | 输入为 ContractCompleteRequest（含 Mandate）。 |
| `utp.purchase.query` | `utp_purchase_query` | 只读工具。无业务请求体；以工具目标参数 `purchase_id` 或 `agreement_id` 定位，返回相应对象的状态视图。 |
| `utp.purchase.cancel` | `utp_purchase_cancel` | 无业务请求体；以工具目标参数 `purchase_id` 或 `agreement_id` 定位，取消相应 `*_DRAFT` 状态下的承诺草案。 |

**MCP 特殊规则：**

- MCP Server MUST 分别在订单与合同创建工具的 Tool Description 中声明各自前置条件。
- `utp_purchase_complete` 与 `utp_purchase_contract_complete` MUST 声明Mandate 准入要求。
- 除 `create` 与 `contract-create` 外，MCP 工具 MUST 通过 `target` 参数携带唯一的 `purchase_id` 或 `agreement_id`；`query` 与 `cancel` 不得额外定义业务请求体。
- MCP Resources SHOULD 暴露当前订单或合同状态，以及订单待付款信息（`payment_due`）。
