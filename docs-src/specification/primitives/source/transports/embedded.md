---
title: 寻源原语 — EMBEDDED 绑定
section: primitives
owner: sourcing-team
status: drafting
version: 2026-07-29
---

# 寻源原语 — EMBEDDED 绑定

## Embedded SDK Binding {#s-11-8-4}
| 操作 | SDK 方法签名 | 说明 |
| --- | --- | --- |
| `utp.source.search` | `client.source.search(request: SearchRequest): Promise` | 返回候选集合。 |
| `utp.source.lookup` | `client.source.lookup(itemId: string, supplierId: string, sections?: string[]): Promise` | 返回商品详情。 |

---
