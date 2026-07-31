---
title: 询盘原语 — REST 绑定
section: primitives
owner: negotiation-team
status: drafting
version: 2026-07-29
---

# 询盘原语 — REST 绑定

## REST 绑定（REST Binding） {#s-12-8-1}

| 操作 | HTTP 方法 | 端点 | 方向 / 交付 | Content-Type |
| --- | --- | --- | --- | --- |
| `utp.negotiate.inquiry` | `POST` | `/utp/v1/negotiate/inquiry` | Buyer → Seller / 同步请求 | `application/json` |
| `utp.negotiate.quote` | `POST` | `{callback_base}/utp/v1/negotiate/quote` | Seller → Buyer / 异步回调通知 | `application/json` |
| `utp.negotiate.counter-offer` | `POST` | `/utp/v1/negotiate/counter-offer` | Buyer → Seller / 同步请求 | `application/json` |
| `utp.negotiate.binding` | `POST` | `/utp/v1/negotiate/binding` | Buyer → Seller / 同步请求 | `application/json` |
| `utp.negotiate.query` | `GET` | `/utp/v1/negotiate/{inquiry_id}` | Buyer → Seller / 同步查询 | — |

**REST 特殊规则：**

- Seller 通过异步回调交付已签署的 `quote`。Buyer 在 Profile 或会话建立时登记 `callback_base`；Seller MUST 向固定端点 `{callback_base}/utp/v1/negotiate/quote` 发送完整 MessageEnvelope。Buyer 返回 `2xx` 仅表示已接收，不表示接受报价。
- 当会话未启用 Push Notification 或回调交付失败时，Buyer MUST 通过 `utp.negotiate.query` 获取已产生的报价；轮询不改变报价的签名、有效期或协商状态。
- Seller 签名随最终 `quote` 返回。Buyer 通过 `POST /utp/v1/negotiate/binding` 引用有效报价并提交 `buyer_signature`；服务端验证双方签名和条款哈希后生成 `binding_id`。
- 报价到期自动过期通过 `410 Gone` 状态码表达。
- 所有响应 MUST 包含 `X-UTP-Negotiate-Round` 头部标识当前协商轮次。
