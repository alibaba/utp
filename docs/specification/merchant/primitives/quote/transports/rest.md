---
title: 报价原语 — REST 绑定
section: merchant
owner: merchant-team
status: review
version: 2026-07-31
---

# 报价原语 — REST 绑定

## REST 绑定（REST Binding） {#s-rest-binding}

供应商侧 REST 端点统一使用 `/utp/m/v1/` 前缀，与买方侧 `/utp/v1/` 区分。

| 操作 | HTTP 方法 | 端点 | Content-Type |
| --- | --- | --- | --- |
| `quote` | `POST` | `/utp/m/v1/quotes/{inquiry_id}/quote` | application/json |
| `revise` | `POST` | `/utp/m/v1/quotes/{inquiry_id}/revisions` | application/json |
| `bid` | `POST` | `/utp/m/v1/quotes/{inquiry_id}/bid` | application/json |
| `decline` | `POST` | `/utp/m/v1/quotes/{inquiry_id}/decline` | application/json |
| `query` | `GET` | `/utp/m/v1/quotes/{inquiry_id}` | application/json |
| `list` | `GET` | `/utp/m/v1/quotes?status=&from=&cursor=&limit=` | application/json |

**传输特殊规则：**

- REST Binding 为 MUST（基线）；MCP / A2A 为 MAY（通用规则继承（Commons Inheritance））。全部写操作 MUST 携带 idempotency_key；响应 MUST 包含 X-UTP-Quote-Status 头部。
