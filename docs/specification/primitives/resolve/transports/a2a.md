---
title: 争议解决原语 — A2A 绑定
section: primitives
owner: dispute-team
status: drafting
version: 2026-07-29
---

# 争议解决原语 — A2A 绑定

## A2A Binding {#s-16-8-3}
| 操作 | A2A Task Name | 说明 |
| --- | --- | --- |
| `utp.resolve.raise` | `utp:resolve:raise` | 同步任务。返回争议登记信息。 |
| `utp.resolve.mediate` | `utp:resolve:mediate` | 异步任务。调解过程可能持续多天。 |
| `utp.resolve.arbitrate` | `utp:resolve:arbitrate` | 异步任务。仲裁过程可能持续数月。 |
| `utp.resolve.compensate` | `utp:resolve:compensate` | 异步任务。补偿执行后通知各方。 |

**A2A 特殊规则：**

- 争议相关的 A2A Task MUST 通知所有拓扑参与方（不仅仅是争议双方）。
- `mediate` 和 `arbitrate` 的 Task 状态更新 MUST 通过 A2A Push 通知机制推送给各方。
