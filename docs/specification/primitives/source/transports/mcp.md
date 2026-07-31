---
title: 寻源原语 — MCP 绑定
section: primitives
owner: sourcing-team
status: drafting
version: 2026-07-29
---

# 寻源原语 — MCP 绑定

## MCP 绑定（MCP Binding） {#s-11-8-2}

| 操作 | MCP Tool Name | 说明 |
| --- | --- | --- |
| `utp.source.search` | `utp_source_search` | 输入为 SearchRequest 对象。 |
| `utp.source.lookup` | `utp_source_lookup` | 输入为 `item_id` 和 `supplier_id`。 |

**MCP 特殊规则：**

- MCP Server MUST 在 Tool Description 中声明各操作的输入 Schema 和前置条件。
- Agent Client MAY 通过 MCP Resources 接口订阅候选集合变更通知。
