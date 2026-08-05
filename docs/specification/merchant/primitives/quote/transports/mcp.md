---
title: 报价原语 — MCP 绑定
section: merchant
owner: merchant-team
status: review
version: 2026-07-31
---

# 报价原语 — MCP 绑定

## MCP 绑定（MCP Binding） {#s-mcp-binding}

| 操作 | MCP Tool Name |
| --- | --- |
| `quote` | `utp_quote_quote` |
| `revise` | `utp_quote_revise` |
| `bid` | `utp_quote_bid` |
| `decline` | `utp_quote_decline` |
| `query` | `utp_quote_query` |
| `list` | `utp_quote_list` |

**传输特殊规则：**

- REST Binding 为 MUST（基线）；MCP / A2A 为 MAY（通用规则继承（Commons Inheritance））。全部写操作 MUST 携带 idempotency_key；响应 MUST 包含 X-UTP-Quote-Status 头部。
