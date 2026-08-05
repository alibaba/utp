---
title: 交付原语 — A2A 绑定
section: merchant
owner: merchant-team
status: review
version: 2026-07-31
---

# 交付原语 — A2A 绑定

## A2A 绑定（A2A Binding） {#s-a2a-binding}

| 操作 | A2A Task Name |
| --- | --- |
| `prepare` | `utp:delivery:prepare` |
| `split` | `utp:delivery:split` |
| `ship` | `utp:delivery:ship` |
| `update` | `utp:delivery:update` |
| `query` | `utp:delivery:query` |

**传输特殊规则：**

- 标识符与参数一律置于请求体（与 UTP-B 规范 《履约原语》 的 Fulfill REST 风格一致）；全部写操作 MUST 携带 idempotency_key。
