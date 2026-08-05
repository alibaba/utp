---
title: 商品原语 — A2A 绑定
section: merchant
owner: merchant-team
status: review
version: 2026-07-31
---

# 商品原语 — A2A 绑定

## A2A 绑定（A2A Binding） {#s-a2a-binding}

| 操作 | A2A Task Name |
| --- | --- |
| `publish` | `utp:listing:publish` |
| `update` | `utp:listing:update` |
| `list` | `utp:listing:list` |
| `delist` | `utp:listing:delist` |
| `query` | `utp:listing:query` |
| `archive` | `utp:listing:archive` |
| `batch` | `utp:listing:batch` |

**传输特殊规则：**

- 批量模式在 A2A 下 MUST 使用异步 Task，通过 Artifact 返回逐条结果。
