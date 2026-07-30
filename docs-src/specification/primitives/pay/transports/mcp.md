---
title: 支付原语 — MCP 绑定
section: primitives
owner: payment-team
status: drafting
version: 2026-07-29
---

# 支付原语 — MCP 绑定

## MCP Binding {#s-14-8-2}
| 操作 | MCP Tool Name | 说明 |
| --- | --- | --- |
| `utp.pay.initiate` | `utp_pay_initiate` | 输入为 PaymentRequest 对象。MUST 声明 Mandate 链要求。 |
| `utp.pay.confirm` | `utp_pay_confirm` | 输入为支付渠道回调数据。 |
| `utp.pay.term` | `utp_pay_term` | 输入为多阶段付款请求。 |
| `utp.pay.query` | `utp_pay_query` | 只读工具。输入为 `payment_request_id` 或 `purchase_id`，返回实时支付状态视图。 |
| `utp.pay.refund` | `utp_pay_refund` | 受限资金工具。仅供协议引擎、Resolve 或授权资金服务调用，返回 RefundResult 与 PaymentEvent 引用。 |

**MCP 特殊规则：**

- MCP Server MUST 在 `utp_pay_initiate` 的 Tool Description 中声明支持的支付工具列表和 Tokenizer 要求。
- MCP Resources SHOULD 暴露当前支付状态（`payment_status`）和待付信息（`payment_due`）。
- 支付令牌 MUST NOT 出现在 MCP Resource 列表中（避免敏感信息泄露）。
