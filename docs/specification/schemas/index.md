---
title: Schema 发布状态
section: schemas
owner: schema-maintainers
status: drafting
version: 2026-07-31
---

# Schema 发布状态

以下 JSON Schema 与当前 Draft 正文同步发布，供实现、校验和互操作测试使用。协议字段和规范性要求仍以对应章节为准。

| 范围 | Schema | 对应章节 |
| --- | --- | --- |
| 发现与协商 | [`profile.json`](../../../schemas/discovery/profile.json) | [发现与协商](/documentation/specification/protocol-core/discovery-negotiation.html) |
| 发现与协商 | [`discovery_request.json`](../../../schemas/discovery/discovery_request.json) | [发现与协商](/documentation/specification/protocol-core/discovery-negotiation.html) |
| 发现与协商 | [`negotiation_result.json`](../../../schemas/discovery/negotiation_result.json) | [发现与协商](/documentation/specification/protocol-core/discovery-negotiation.html) |
| 传输与通信 | [`message_envelope.json`](../../../schemas/transport/message_envelope.json) | [传输与通信](/documentation/specification/protocol-core/transport-communication.html) |

Schema 使用 JSON Schema Draft 2020-12，并以日期版本标识。Profile、协商结果和消息封装中的 URI、版本、能力和传输绑定只描述结构约束；发现、协商、授权、状态机和业务规则仍需按正文执行。
