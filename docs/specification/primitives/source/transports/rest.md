---
title: 寻源原语 — REST 绑定
section: primitives
owner: sourcing-team
status: drafting
version: 2026-07-29
---

# 寻源原语 — REST 绑定

## REST 绑定（REST Binding） {#s-11-8-1}

| 操作 | HTTP 方法 | 端点 | Content-Type |
| --- | --- | --- | --- |
| `utp.source.search` | `POST` | `/utp/v1/source/search` | `application/json` |
| `utp.source.lookup` | `GET` | `/utp/v1/source/items/{item_id}?supplier_id={supplier_id}&sections={sections}` | — |

**REST 特殊规则：**

- `search` 操作 MUST 支持分页；包括携带 `candidate_set_id` 的细化搜索。分页参数通过请求体传递，分页元数据通过响应头 `X-Total-Count`、`X-Page-Number`、`X-Page-Size` 返回。
- `lookup` 操作支持 `If-None-Match` 头部实现条件请求（ETag 缓存）。
- 所有响应 MUST 包含 `X-UTP-Session-Id` 头部标识当前会话。
