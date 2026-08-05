---
title: 商品原语 — MCP 绑定
section: merchant
owner: merchant-team
status: review
version: 2026-07-31
---

# 商品原语 — MCP 绑定

## MCP 绑定（MCP Binding） {#s-mcp-binding}

| 操作 | MCP Tool Name |
| --- | --- |
| `publish` | `utp_listing_publish` |
| `update` | `utp_listing_update` |
| `list` | `utp_listing_list` |
| `delist` | `utp_listing_delist` |
| `query` | `utp_listing_query` |
| `archive` | `utp_listing_archive` |
| `batch` | `utp_listing_batch` |

**传输特殊规则：**

- 批量模式在 A2A 下 MUST 使用异步 Task，通过 Artifact 返回逐条结果。
