---
title: 接单原语 — A2A 绑定
section: merchant
owner: merchant-team
status: review
version: 2026-07-31
---

# 接单原语 — A2A 绑定

## A2A 绑定（A2A Binding） {#s-a2a-binding}

| 操作 | A2A Task Name |
| --- | --- |
| `accept` | `utp:acceptance:accept` |
| `reject` | `utp:acceptance:reject` |
| `hold` | `utp:acceptance:hold` |
| `amend_leadtime` | `utp:acceptance:amend` |
| `amend_price` | `utp:acceptance:amend_price` |
| `query` | `utp:acceptance:query` |
| `list` | `utp:acceptance:list` |

**传输特殊规则：**

- 全部写操作 MUST 携带 idempotency_key；响应 MUST 包含 X-UTP-Acceptance-Status 头部。
