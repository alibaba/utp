---
title: 交付原语 — MCP 绑定
section: merchant
owner: merchant-team
status: review
version: 2026-07-31
---

# 交付原语 — MCP 绑定

## MCP 绑定（MCP Binding） {#s-mcp-binding}

| 操作 | MCP Tool Name |
| --- | --- |
| `prepare` | `utp_delivery_prepare` |
| `split` | `utp_delivery_split` |
| `ship` | `utp_delivery_ship` |
| `update` | `utp_delivery_update` |
| `query` | `utp_delivery_query` |

**传输特殊规则：**

- 标识符与参数一律置于请求体（与 UTP-B 规范 《履约原语》 的 Fulfill REST 风格一致）；全部写操作 MUST 携带 idempotency_key。
