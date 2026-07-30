---
title: 询盘原语 — EMBEDDED 绑定
section: primitives
owner: negotiation-team
status: drafting
version: 2026-07-29
---

# 询盘原语 — EMBEDDED 绑定

## Embedded SDK Binding {#s-12-8-4}
| 操作 | SDK 方法签名 | 说明 |
| --- | --- | --- |
| `utp.negotiate.inquiry` | `client.negotiate.inquiry(request: InquiryRequest): Promise` | 提交询盘。 |
| `utp.negotiate.quote` | `client.negotiate.onQuote(handler: (quote: QuoteResponse) => void): Unsubscribe` | 订阅 Seller → Buyer 的报价通知；回调接收不构成 binding。 |
| `utp.negotiate.counterOffer` | `client.negotiate.counterOffer(request: CounterOfferRequest): Promise` | 提交反报价。 |
| `utp.negotiate.binding` | `client.negotiate.binding(request: BindingRequest): Promise` | 确认绑定（含签名）。 |
| `utp.negotiate.query` | `client.negotiate.query(request: NegotiateQuery): Promise` | 查询本方可见的协商状态和授权数据。 |

---
