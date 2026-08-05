---
title: 接单原语 — MCP 绑定
section: merchant
owner: merchant-team
status: review
version: 2026-07-31
---

# 接单原语 — MCP 绑定

## MCP 绑定（MCP Binding） {#s-mcp-binding}

| 操作 | MCP Tool Name |
| --- | --- |
| `accept` | `utp_acceptance_accept` |
| `reject` | `utp_acceptance_reject` |
| `hold` | `utp_acceptance_hold` |
| `amend_leadtime` | `utp_acceptance_amend` |
| `amend_price` | `utp_acceptance_amend_price` |
| `query` | `utp_acceptance_query` |
| `list` | `utp_acceptance_list` |

**传输特殊规则：**

- 全部写操作 MUST 携带 idempotency_key；响应 MUST 包含 X-UTP-Acceptance-Status 头部。
