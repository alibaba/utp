---
title: 争议解决原语 — MCP 绑定
section: primitives
owner: dispute-team
status: drafting
version: 2026-07-29
---

# 争议解决原语 — MCP 绑定

## MCP Binding {#s-16-8-2}
| 操作 | MCP Tool Name | 说明 |
| --- | --- | --- |
| `utp.resolve.raise` | `utp_resolve_raise` | 输入为争议请求。 |
| `utp.resolve.mediate` | `utp_resolve_mediate` | 输入为调解请求或调解结果。 |
| `utp.resolve.arbitrate` | `utp_resolve_arbitrate` | 输入为仲裁请求。 |
| `utp.resolve.compensate` | `utp_resolve_compensate` | 输入为补偿指令（受限调用）。 |

**MCP 特殊规则：**

- MCP Server MUST 在 `utp_resolve_compensate` 的 Tool Description 中明确声明调用权限限制。
- MCP Resources SHOULD 暴露当前争议状态（`dispute_status`）和待处理的争议列表（`pending_disputes`）。
- 证据包内容 MUST NOT 直接暴露在 MCP Resources 中。Agent MUST 通过 `utp_resolve_mediate` 或导出端点获取证据。
