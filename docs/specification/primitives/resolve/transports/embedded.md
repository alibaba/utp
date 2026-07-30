---
title: 争议解决原语 — EMBEDDED 绑定
section: primitives
owner: dispute-team
status: drafting
version: 2026-07-29
---

# 争议解决原语 — EMBEDDED 绑定

## Embedded SDK Binding {#s-16-8-4}
| 操作 | SDK 方法签名 | 说明 |
| --- | --- | --- |
| `utp.resolve.raise` | `client.resolve.raise(request: DisputeRequest): Promise` | 发起争议。 |
| `utp.resolve.mediate` | `client.resolve.mediate(disputeId: string, request: MediationRequest): Promise` | 调解。 |
| `utp.resolve.arbitrate` | `client.resolve.arbitrate(disputeId: string, request: ArbitrationRequest): Promise` | 仲裁。 |
| `utp.resolve.compensate` | `client.resolve.compensate(disputeId: string, order: CompensationOrder): Promise` | 执行补偿。 |

---
