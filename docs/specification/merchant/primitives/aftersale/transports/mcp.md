---
title: 售后原语 — MCP 绑定
section: merchant
owner: merchant-team
status: review
version: 2026-07-31
---

# 售后原语 — MCP 绑定

## MCP 绑定（MCP Binding） {#s-mcp-binding}

| 操作 | MCP Tool Name |
| --- | --- |
| `approve` | `utp_aftersale_approve` |
| `reject` | `utp_aftersale_reject` |
| `propose` | `utp_aftersale_propose` |
| `confirm_return` | `utp_aftersale_confirm_return` |
| `query` | `utp_aftersale_query` |
| `list` | `utp_aftersale_list` |

**传输特殊规则：**

- Embedded 绑定不适用于本原语（供应商侧 Endpoint 必须可被平台反向调用）。传输语义与 MessageEnvelope 继承 UTP 规范 《MessageEnvelope》。
