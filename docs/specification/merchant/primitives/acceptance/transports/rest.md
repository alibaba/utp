---
title: 接单原语 — REST 绑定
section: merchant
owner: merchant-team
status: review
version: 2026-07-31
---

# 接单原语 — REST 绑定

## REST 绑定（REST Binding） {#s-rest-binding}

供应商侧 REST 端点统一使用 `/utp/m/v1/` 前缀，与买方侧 `/utp/v1/` 区分。

| 操作 | HTTP 方法 | 端点 | Content-Type |
| --- | --- | --- | --- |
| `accept` | `POST` | `/utp/m/v1/acceptances/{routing_id}/accept` | application/json |
| `reject` | `POST` | `/utp/m/v1/acceptances/{routing_id}/reject` | application/json |
| `hold` | `POST` | `/utp/m/v1/acceptances/{routing_id}/hold` | application/json |
| `amend_leadtime` | `POST` | `/utp/m/v1/acceptances/{routing_id}/amendments` | application/json |
| `amend_price` | `POST` | `/utp/m/v1/acceptances/{routing_id}/amend-price` | application/json |
| `query` | `GET` | `/utp/m/v1/acceptances/{routing_id}` | application/json |
| `list` | `GET` | `/utp/m/v1/acceptances?status=&from=&cursor=&limit=` | application/json |

**传输特殊规则：**

- 全部写操作 MUST 携带 idempotency_key；响应 MUST 包含 X-UTP-Acceptance-Status 头部。
