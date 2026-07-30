---
title: 支付原语 — EMBEDDED 绑定
section: primitives
owner: payment-team
status: drafting
version: 2026-07-29
---

# 支付原语 — EMBEDDED 绑定

## Embedded SDK Binding {#s-14-8-4}
| 操作 | SDK 方法签名 | 说明 |
| --- | --- | --- |
| `utp.pay.initiate` | `client.pay.initiate(request: PaymentRequest): Promise` | 发起支付请求。 |
| `utp.pay.confirm` | `client.pay.confirm(requestId: string, callback: ChannelCallback): Promise` | 确认支付。 |
| `utp.pay.term` | `client.pay.term(purchaseId: string, termId: string, request: PaymentTermRequest): Promise` | 执行多阶段付款。 |
| `utp.pay.query` | `client.pay.query(ref: { paymentRequestId?: string; purchaseId?: string }): Promise` | 查询支付状态（只读）。 |
| `utp.pay.refund` | `client.pay.refund(request: RefundInstruction): Promise` | 执行受限退款。 |

---
