---
title: 争议解决原语 — REST 绑定
section: primitives
owner: dispute-team
status: drafting
version: 2026-07-29
---

# 争议解决原语 — REST 绑定

## REST Binding {#s-16-8-1}
| 操作 | HTTP 方法 | 端点 | Content-Type |
| --- | --- | --- | --- |
| `utp.resolve.raise` | `POST` | `/utp/resolve` | `application/json` |
| `utp.resolve.mediate` | `POST` | `/utp/resolve/{dispute_id}/mediate` | `application/json` |
| `utp.resolve.arbitrate` | `POST` | `/utp/resolve/{dispute_id}/arbitrate` | `application/json` |
| `utp.resolve.compensate` | `POST` | `/utp/resolve/{dispute_id}/compensate` | `application/json` |
| 查询争议状态 | `GET` | `/utp/resolve/{dispute_id}` | — |
| 补充证据 | `POST` | `/utp/resolve/{dispute_id}/evidence` | `application/json` |
| 导出证据包 | `GET` | `/utp/resolve/{dispute_id}/evidence/export` | — |
| 列出交易的所有争议 | `GET` | `/utp/resolve?session_id={session_id}` | — |

**REST 特殊规则：**

- `compensate` 端点 MUST 验证调用方权限。仅协议引擎、Mediator、Arbiter 可调用。Buyer/Seller 直接调用 MUST 返回 `403 Forbidden`。
- 证据导出端点 MUST 返回 `application/jws+json` 格式的完整证据包。
- 所有争议相关端点 MUST 支持 `If-Match` 头部（乐观并发控制），防止证据包被并发修改。
