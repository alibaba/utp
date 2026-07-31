---
title: 履约原语 — REST 绑定
section: primitives
owner: fulfillment-team
status: drafting
version: 2026-07-29
---

# 履约原语 — REST 绑定

## REST 绑定（REST Binding） {#s-15-8-1}
所有操作均以 `POST` 提交，标识符（如 `purchase_id`、`order_id`、`batch_id`）与其余参数一律置于请求体（`application/json`），不作为路径参数。

| 操作 | 方法 | 端点 |
| --- | --- | --- |
| `utp.fulfill.leadtime` | POST | `/utp/v1/fulfillments/leadtime` |
| `utp.fulfill.list` | POST | `/utp/v1/fulfillments/orders/list` |
| `utp.fulfill.query` | POST | `/utp/v1/fulfillments/orders/query` |
| `utp.fulfill.notify` | POST | 采购方回调端点 `{callback_base}/utp/v1/fulfillments/notifications` |
| `utp.fulfill.receive` | POST | `/utp/v1/fulfillments/receipts` |
| `utp.fulfill.reject` | POST | `/utp/v1/fulfillments/rejections` |

`notify` 由对端向采购方注册的回调基址（`callback_base`）下的固定路径 `/utp/v1/fulfillments/notifications` 推送；采购方在 Profile 或会话建立时登记 `callback_base`，请求体 MUST 携带 `order_id`，并以对端签名保证来源可信。

`receive` 与 `reject` MUST 校验 Buyer 签名。
