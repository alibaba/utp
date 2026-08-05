---
title: 售后原语 — A2A 绑定
section: merchant
owner: merchant-team
status: review
version: 2026-07-31
---

# 售后原语 — A2A 绑定

## A2A 绑定（A2A Binding） {#s-a2a-binding}

| 操作 | A2A Task Name |
| --- | --- |
| `approve` | `utp:aftersale:approve` |
| `reject` | `utp:aftersale:reject` |
| `propose` | `utp:aftersale:propose` |
| `confirm_return` | `utp:aftersale:confirm_return` |
| `query` | `utp:aftersale:query` |
| `list` | `utp:aftersale:list` |

**传输特殊规则：**

- Embedded 绑定不适用于本原语（供应商侧 Endpoint 必须可被平台反向调用）。传输语义与 MessageEnvelope 继承 UTP 规范 《MessageEnvelope》。
