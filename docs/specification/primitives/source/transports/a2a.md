---
title: 寻源原语 — A2A 绑定
section: primitives
owner: sourcing-team
status: drafting
version: 2026-07-29
---

# 寻源原语 — A2A 绑定

## A2A 绑定（A2A Binding） {#s-11-8-3}

| 操作 | A2A Task Name | 说明 |
| --- | --- | --- |
| `utp.source.search` | `utp:source:search` | 异步任务，通过 A2A Artifact 返回候选集合。 |
| `utp.source.lookup` | `utp:source:lookup` | 同步/异步均可，取决于响应大小。 |

**A2A 特殊规则：**

- 大规模搜索（`page_size > 50` 或预计结果超过 100 条）MUST 使用异步模式，通过 A2A Task 状态推送进度。
- A2A Artifact 中 MUST 包含 `candidate_set_id`，以支持后续携带该引用的 `search` 细化候选范围。
