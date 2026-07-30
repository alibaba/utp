---
title: 支付原语 — A2A 绑定
section: primitives
owner: payment-team
status: drafting
version: 2026-07-29
---

# 支付原语 — A2A 绑定

## A2A Binding {#s-14-8-3}
| 操作 | A2A Task Name | 说明 |
| --- | --- | --- |
| `utp.pay.initiate` | `utp:pay:initiate` | 异步任务。发起后状态 `pending`，支付渠道确认后状态 `completed`。 |
| `utp.pay.confirm` | `utp:pay:confirm` | 由协议引擎内部触发，不直接对外暴露。 |
| `utp.pay.term` | `utp:pay:term` | 异步任务，含 Fulfill 前置条件验证。 |
| `utp.pay.query` | `utp:pay:query` | 同步只读任务，即时返回支付状态，不产生 Task Artifact 副作用。 |
| `utp.pay.refund` | `utp:pay:refund` | 异步受限任务。完成后 Task Artifact 包含 RefundResult 与 `PAYMENT_REFUNDED` 事件。 |

**A2A 特殊规则：**

- 支付相关 A2A Task MUST 在同一 Session 下执行，MUST NOT 跨 Session 传递支付令牌。
- 支付确认后的 Task Artifact MUST 包含完整的 PaymentConfirmation 对象。
- Escrow 场景下，资金入托管和释放 MUST 分别生成独立的 A2A Task。
