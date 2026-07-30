---
title: 订购原语 — REST 绑定
section: primitives
owner: purchase-team
status: drafting
version: 2026-07-29
---

# 订购原语 — REST 绑定

## REST Binding {#s-13-8-1}
| 操作 | HTTP 方法 | 端点 | Content-Type |
| --- | --- | --- | --- |
| `utp.purchase.create` | `POST` | `/utp/v1/purchase` | `application/json` |
| `utp.purchase.update` | `PATCH` | `/utp/v1/purchase/{purchase_id}` | `application/json` |
| `utp.purchase.complete` | `POST` | `/utp/v1/purchase/{purchase_id}/complete` | `application/json` |
| `utp.purchase.contract_create` | `POST` | `/utp/v1/purchase/contracts` | `application/json` |
| `utp.purchase.contract_update` | `PATCH` | `/utp/v1/purchase/contracts/{agreement_id}` | `application/json` |
| `utp.purchase.contract_complete` | `POST` | `/utp/v1/purchase/contracts/{agreement_id}/complete` | `application/json` |
| `utp.purchase.query` | `GET` | `/utp/v1/purchase/{purchase_id}` 或 `/utp/v1/purchase/contracts/{agreement_id}` | — |
| `utp.purchase.cancel` | `DELETE` | `/utp/v1/purchase/{purchase_id}` 或 `/utp/v1/purchase/contracts/{agreement_id}` | — |
| 获取证据包 | `GET` | `/utp/v1/purchase/{purchase_id}/evidence` | — |

**REST 特殊规则：**

- `complete` 和 `contract_complete` 支持异步处理；订单或协议目标分别由路径中的 `purchase_id` 或 `agreement_id` 确定，请求体承载完成操作所需的业务输入与 Mandate。
- `update` 与 `contract_update` 使用 `PATCH` 语义，仅传输需要修改的字段。
- `query` 与 `cancel` 不使用 HTTP 请求 body；订单或合同由路径中的目标标识确定。
- `DELETE` 仅在相应 `*_DRAFT` 状态允许。对承诺处理中或已完成承诺执行 `DELETE` MUST 返回 `405 Method Not Allowed`。
- 所有响应 MUST 包含状态头部；订单使用 `X-UTP-Purchase-Status`，合同使用 `X-UTP-Contract-Status`。
