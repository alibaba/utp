---
title: 询盘原语 — MCP 绑定
section: primitives
owner: negotiation-team
status: drafting
version: 2026-07-29
---

# 询盘原语 — MCP 绑定

## MCP 绑定（MCP Binding） {#s-12-8-2}

| 操作 | Buyer 侧绑定 | 说明 |
| --- | --- | --- |
| `utp.negotiate.inquiry` | `utp_negotiate_inquiry` | 输入为 InquiryRequest 对象。 |
| `utp.negotiate.quote` | Buyer Resource 更新通知 | Seller 已签报价通过 `notifications/resources/updated` 到达；Buyer 从协商 Resource 读取 QuoteResponse，不暴露可调用 Tool。 |
| `utp.negotiate.counter-offer` | `utp_negotiate_counter_offer` | 输入为 CounterOfferRequest 对象。 |
| `utp.negotiate.binding` | `utp_negotiate_binding` | 输入为 BindingRequest 对象（含签名）。 |

**MCP 特殊规则：**

- MCP Server MUST 在 Tool Description 中声明 `precondition: "session.mode.pricing_mode == L3"`。当 `pricing_mode ∈ {L0, L1, L2}` 时，Agent Client SHOULD 不调用任何 Negotiate Tool。
- MCP Resources 接口 MUST 暴露当前协商状态（`negotiation_status`）及本方可见报价，供 Buyer 轮询或订阅。
- Seller 通过 Resource 更新通知向 Buyer 交付 `quote`；Buyer 从对应协商 Resource 读取报价结果。
