---
title: 询盘原语 — A2A 绑定
section: primitives
owner: negotiation-team
status: drafting
version: 2026-07-29
---

# 询盘原语 — A2A 绑定

## A2A Binding {#s-12-8-3}
| 操作 | A2A Task / Event | 说明 |
| --- | --- | --- |
| `utp.negotiate.inquiry` | `utp:negotiate:inquiry` | 异步任务。供应商确认后通过 A2A Push Notification 通知。 |
| `utp.negotiate.quote` | `utp:negotiate:quote` Task Event | Seller → Buyer 的异步事件；事件 Artifact 携带已签 QuoteResponse，Buyer 确认接收不构成 binding。 |
| `utp.negotiate.counter-offer` | `utp:negotiate:counter_offer` | 异步任务。供应商回复后通知采购方。 |
| `utp.negotiate.binding` | `utp:negotiate:binding` | Buyer 对 Seller 已签报价发起确认；验证通过后任务状态为 `completed`。 |

**A2A 特殊规则：**

- 多轮协商场景中，A2A Task MUST 使用同一 Task ID 贯穿所有轮次，通过 A2A Artifact 的版本号区分各轮报价。
- 竞价场景（`pricing_mode == L3`）中，各供应商的报价 Task MUST 使用独立的 Task ID，通过 `inquiry_ref` 关联。
