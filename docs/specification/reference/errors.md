---
title: 错误索引
section: reference
owner: documentation-editor
status: drafting
version: 2026-07-31
---

# 错误索引

UTP 使用统一的 `ErrorResponse` 返回直接错误：

```json
{
  "error": {
    "code": "TRANSPORT.MESSAGE_INVALID",
    "severity": "error",
    "message": "Message envelope is invalid.",
    "retryable": false,
    "request_id": "req-01J9A",
    "timestamp": "2026-07-31T09:00:00Z"
  }
}
```

`error` 的字段定义以 [P0 原语通用框架](/documentation/specification/protocol-core/primitive-framework.html#s-1043-standard-error-response) 和 `ErrorResponse` Schema 为准。调用方 MUST 依据 `code` 前缀判定责任层，而不是依据具体传输绑定的状态码、异常或任务状态。

## 错误码空间

| 前缀 | 责任方 | 适用范围 | 权威定义 |
| --- | --- | --- | --- |
| `TRANSPORT.*` | 传输与通信 | 网关认证、信封与上下文校验、防重放、幂等、Service 可用性、投递超时和网关限流 | [传输与通信](/documentation/specification/protocol-core/transport-communication.html#s-47) |
| `UTP.*` | P0 原语框架 | 跨原语的通用业务校验、业务授权、业务冲突、原语执行超时、业务能力不可用和业务限流 | [原语框架](/documentation/specification/protocol-core/primitive-framework.html#s-104-error-code-framework) |
| `{PRIMITIVE}.{ACTION}.{DETAIL}` | 各原语 | 仅属于特定原语或 Action 的业务错误 | 各 P1–P6 原语规范 |

`TRANSPORT.*` 错误发生在 Action 进入 P0 或原语处理之前，MUST NOT 产生业务副作用。已进入原语处理的业务拒绝、失败和恢复语义仍以 P0 与相应原语的 `ActionResponse`、`messages` 和错误码表为准。

## 返回与恢复

- `message_type = error` 的 MessageEnvelope MUST 以 `ErrorResponse` 作为 `payload`。
- `retryable` 和 `retry_after` 只说明是否可以重试当前错误；写操作重试仍 MUST 使用原始 `idempotency_key`。
- `TRANSPORT.DELIVERY_TIMEOUT` 仅说明交付结果未知。调用方 MUST 使用同一幂等键重试、查询或等待通知，不得将其视为原语失败。
- HTTP、MCP、A2A 与 Embedded 的原生错误只是绑定投影，MUST NOT 改变上述错误码和恢复语义。
