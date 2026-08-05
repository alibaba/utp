---
title: 报价原语 — A2A 绑定
section: merchant
owner: merchant-team
status: review
version: 2026-07-31
---

# 报价原语 — A2A 绑定

## A2A 绑定（A2A Binding） {#s-a2a-binding}

| 操作 | A2A Task Name |
| --- | --- |
| `quote` | `utp:quote:quote` |
| `revise` | `utp:quote:revise` |
| `bid` | `utp:quote:bid` |
| `decline` | `utp:quote:decline` |
| `query` | `utp:quote:query` |
| `list` | `utp:quote:list` |

**传输特殊规则：**

- REST Binding 为 MUST（基线）；MCP / A2A 为 MAY（通用规则继承（Commons Inheritance））。全部写操作 MUST 携带 idempotency_key；响应 MUST 包含 X-UTP-Quote-Status 头部。
