---
title: 支付原语 — REST 绑定
section: primitives
owner: payment-team
status: drafting
version: 2026-07-29
---

# 支付原语 — REST 绑定

## REST Binding {#s-14-8-1}
| 操作 | HTTP 方法 | 端点 | Content-Type |
| --- | --- | --- | --- |
| `utp.pay.initiate` | `POST` | `/utp/pay` | `application/json` |
| `utp.pay.confirm` | `POST` | `/utp/pay/{payment_request_id}/confirm` | `application/json` |
| `utp.pay.term` | `POST` | `/utp/pay/{purchase_id}/term` | `application/json` |
| 查询支付状态 | `GET` | `/utp/pay/{purchase_id}` | — |
| 查询支付进度 | `GET` | `/utp/pay/{purchase_id}/progress` | — |
| 获取支付凭证 | `GET` | `/utp/pay/{payment_confirmation_id}` | — |
| 支付渠道回调 | `POST` | `/utp/pay/webhook` | `application/json` |
| `utp.pay.refund` | `POST` | `/utp/pay/refunds` | `application/json` |

**REST 特殊规则：**

- 三个 `GET` 端点（查询支付状态 / 查询支付进度 / 获取支付凭证）为 `utp.pay.query` 的 REST 绑定，均为只读操作，MUST NOT 触发资金变动或状态迁移。
- `initiate` 支持同步和异步两种模式。同步模式下直接返回 `CONFIRMED`；异步模式下返回 `AUTHORIZED`，后续通过 webhook 回调通知确认结果。
- 支付渠道回调端点（`/utp/pay/webhook`）MUST 验证回调签名，防止伪造支付确认。
- `utp.pay.refund` 的 REST 请求体 MUST 携带 `transaction_id` 与原支付引用，路径参数不得作为唯一退款锚点。
- 所有涉及支付令牌（`token`）的请求 MUST 通过 HTTPS 传输。协议引擎 MUST NOT 在日志中记录令牌明文。
- 所有响应 MUST 包含 `X-UTP-Payment-Status` 头部标识当前支付状态。
