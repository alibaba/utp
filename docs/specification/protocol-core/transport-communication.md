---
title: 传输与通信
section: protocol-core
owner: protocol-architecture
status: drafting
version: 2026-07-30
---

# 传输与通信（Transport & Communication） {#s-4-transport-communication}

本章规定 UTP Action 如何在参与方之间可靠、安全且可互操作地交换。它的目标是让同一 Action 无论承载于 REST、MCP、A2A 或 Embedded SDK，上层观察到的请求、结果、幂等和异步语义保持一致。

本章不定义原语的业务输入、输出、状态机或补偿逻辑；这些内容由 [P0 原语通用框架](/documentation/specification/protocol-core/primitive-framework.html) 和各原语定义文件规定。

---

## 定位与边界 {#s-41}

传输层只负责将已确定的协议操作投递到正确的处理方，并将结果或通知交付给可验证的接收方。各层职责如下：

| 阶段 | 权威职责 | 本章职责 |
| --- | --- | --- |
| 发现与协商 | 发布并验证 Profile、Primitive、版本、扩展和共同能力范围，并输出已验证的 `service_catalogs` | 不选择具体的 Service、Endpoint 或传输方式。 |
| 路径编排 | 在已协商能力内确定角色方向、Selected Mode 与业务状态路径 | 使用该业务语义建立投递上下文；路径编排不得选择具体的 Service、Endpoint 或传输绑定。 |
| P0 与原语 | 定义 Action、输入/输出 Schema、状态影响、补偿与业务错误 | 不改变任何业务字段或状态语义。 |
| 传输与通信 | 在每次请求前确认 Service、Endpoint 和传输绑定，并对请求、响应和通知进行封装、认证、投递、去重与恢复 | 定义跨绑定不变的通信语义。 |

实现方 MUST 在发起 Action 前完成适用的发现、协商和路径选择。路径选择确定业务语义，但不选择传输；通信层 MUST 在每次请求前根据 `service_catalogs` 和目标 Action 的 `transport_bindings` 确认本次投递的 Service、Endpoint 和传输绑定。传输绑定 MUST NOT 根据 URL、Tool 名称、Task 名称或消息内容自行推断调用角色、业务 Mode 或权限。

`session_id` 将一次通信关联到已经建立的协议会话；`mode_ref`、`topology_ref` 等会话快照引用在适用时用于一致性校验，而不构成本章对 Mode 或拓扑的重新协商。

### MessageEnvelope {#s-411}

所有跨进程或跨网络的 UTP 请求、响应和通知 MUST 具有等价的 **MessageEnvelope** 语义。具体绑定可以将字段映射到 HTTP Body/Header、MCP Tool 参数与 Resource 更新、A2A Task/Artifact 或 SDK 对象，但不得丢失字段含义。

| 字段 | 类型 | 适用性 | 说明 |
| --- | --- | --- | --- |
| `message_id` | string | MUST | 本次投递的全局唯一标识，用于通知去重与审计关联。 |
| `message_type` | enum | MUST | `request`、`response`、`notification` 或 `error`。 |
| `event_type` | string | 事件通知 MUST | 已注册事件标识；事件通知 MUST NOT 同时携带 `action`，其 `payload` 按事件注册表中的 Schema 解释。 |
| `sent_at` | datetime | MUST | 发送时间，ISO 8601 UTC。 |
| `sender` | object | MUST | 发送方的可验证主体引用及其当前角色。 |
| `correlation_id` | string | 响应/通知 SHOULD | 被响应的 `message_id`、Task ID 或已注册订阅引用。 |
| `mode_ref` / `topology_ref` | string | 会话锁定后 SHOULD | 对已锁定会话快照的不可变引用。 |
| `payload` | object | MUST | 请求时为完整 P0 ActionRequest；响应时为完整 P0 ActionResponse；错误时为 P0 ErrorResponse。事件通知按事件注册表解释。 |

MessageEnvelope 是传输封装，不创建第二套业务请求/响应格式。`payload` 的解释规则如下：

- **请求**：`payload MUST 是完整 P0 ActionRequest`，包括 `action`、`session_id`、条件式 `idempotency_key` 与 `input`。接收方从 `payload.action` 按已协商 Primitive 与扩展声明进行最长匹配，解析所属 Primitive 或扩展。
- **响应**：`payload MUST 是完整 P0 ActionResponse`，包括 `action`、`session_id`、`output`，并在适用时包含 `idempotency_key`、`primitive_state`、`execution_result` 与 `valid_next_actions`。
- **错误**：`payload MUST 是 P0 ErrorResponse`，即 `{ "error": ErrorDetail }`。错误码的责任归属由本章和 P0 的统一错误规则判定。
- **通知**：`message_type = notification` 在携带 P0 ActionResponse 的 Action 通知与携带 `event_type` 的事件通知之间二选一；事件通知的 `payload` 按事件注册表中的 Schema 解释。

`payload` 不得成为绕开 P0 Schema、授权或状态校验的旁路。

以下示例只说明请求的最小封装要素，不规定原语的业务字段：

```json
{
  "message_id": "msg-01J9A1B2C3D4",
  "message_type": "request",
  "sent_at": "2026-07-30T09:00:00Z",
  "sender": { "subject": "buyer.example.com", "role": "Buyer" },
  "payload": {
    "action": "utp.source.search",
    "session_id": "utp-session-01J9A",
    "idempotency_key": "idem-01J9A-search-1",
    "input": { "query": "industrial servo motor" }
  }
}
```

## 消息校验与会话上下文 {#s-42}

### 接收校验顺序 {#s-422}

接收方 MUST 按下列顺序处理消息；任一步骤失败时不得产生该 Action 的业务副作用：

1. 验证传输安全、签名或绑定自身的等效身份与完整性证据。
2. 验证消息时效、防重放信息、`message_id` 和发送方上下文。
3. 解析 `payload.session_id`，并校验已锁定的 `mode_ref`、`topology_ref` 与调用方向。
4. 对写请求按 `payload.idempotency_key` 执行幂等查找；命中首次结果时直接返回该结果。
5. 对请求按 `payload.action` 与已选 Action 的输入 Schema 校验 `payload.input`，再执行 P0、授权和原语业务规则。

接收方 MUST NOT 因为重放的同一有效写请求再次执行副作用。相同幂等键但 `action`、会话或规范化业务负载不同，MUST 作为冲突处理，而不是返回旧结果。

### 会话超时上下文 {#s-424}

会话快照 MAY 为原语声明协商后的时限、交付窗口或超时处置引用。传输层 MUST 携带并校验该快照引用，但不得自行选择时限、延长时限或改变超时后的业务处置。到达传输超时仅表示本次投递结果未知；原语超时及其补偿由相应原语和会话规则决定。

## 异步通信 {#s-43}

### Push Notification {#s-431}

当 Action 需要在初始响应后交付报价、状态变化、完成结果或事件时，发送方 SHOULD 使用 **Push Notification**。接收地址或订阅通道 MUST 来自已验证的 Profile、会话快照或绑定原生注册流程；发送方 MUST NOT 信任业务负载中临时提供的回调地址。

通知 MUST 使用 `message_type = notification`，携带唯一 `message_id`、可关联的 `correlation_id` 及相应的 Action/事件 Schema 负载。接收方返回传输级确认仅代表已持久化或已接收该通知，不表示接受报价、确认支付或同意任何业务条款。

发送方在未得到确认时 SHOULD 进行有界指数退避重试；重复通知由接收方按 `message_id` 去重。超过交付窗口后，发送方 MUST 保留可查询的最终状态或结果引用，供对方恢复。

### Polling 降级 {#s-432}

**Polling** 是 Push 不可用、订阅丢失或交付窗口结束后的标准恢复路径。处理方 MUST 为可异步完成的 Action 提供相应的只读查询能力，或在绑定原生状态资源中暴露等价信息。轮询 MUST 不改变原语状态、报价有效期、签名或可见性范围。

查询结果在适用的编排会话中 MUST 返回 `valid_next_actions`，使调用方能够区分“仍在等待”“可继续操作”和“已终态”三种状态。调用方 SHOULD 对轮询使用指数退避；不得因未收到通知而重新提交具有副作用的原始 Action。

## 可靠投递 {#s-44}

### 请求、响应与幂等 {#s-441}

写操作的重试由同一 `session_id`、`action` 和 `idempotency_key` 标识。首次处理完成后，处理方 MUST 在幂等保留期内返回等价的成功、拒绝或失败结果；重试 MUST NOT 创建额外订单、资金动作、库存锁定或补偿记录。幂等键格式、保留期和 `TRANSPORT.IDEMPOTENCY_CONFLICT` 的完整规则以 P0 的引用规范为准。

响应 MUST 通过 `correlation_id`、绑定原生请求标识或两者关联到请求。异步受理而尚无最终结果时，响应 MUST 表达 P0 的 `execution_result = PENDING`；网络已投递不等于业务已完成。

### 重试与超时边界 {#s-442}

发送方仅在错误被声明为可重试、未获得确定响应或接收方明确要求稍后重试时 MAY 重试。重试 SHOULD 使用指数退避和抖动，并遵循 `Retry-After` 或绑定原生的等价等待提示。

传输超时只说明本次投递未得到确认；它不得自行将原语状态判定为失败、取消或补偿。发送方 MUST 使用同一幂等键重试、查询状态或等待异步通知。原语 SLA、报价有效期、支付时限和超时后的业务处置由会话快照及各原语定义决定。

## 传输绑定 {#s-45}

每个已发布 Action MUST 至少声明一种 `transport_bindings`。Action 的角色、Schema、状态影响和错误语义在不同绑定之间 MUST 保持相同；各原语传输页面是端点、Tool、Task 与 SDK 方法名的权威映射。

| 绑定 | 通用投影 | 异步交付 | 最低要求 |
| --- | --- | --- | --- |
| REST | Action 映射为已声明的 HTTP 方法与 Endpoint。 | 已验证回调或查询端点。 | HTTPS、HTTP 状态与 P0 结果不混淆、可携带幂等与签名元数据。 |
| MCP | Action 映射为 Tool，状态和只读结果可映射为 Resource。 | Resource 更新通知或受控轮询。 | Tool Description 声明输入 Schema、前置条件与权限边界。 |
| A2A | Action 映射为 Task，业务结果映射为 Artifact。 | Task 状态与 Artifact 更新。 | Task 生命周期不得替代 P0 原语状态机；Task ID 可作为关联标识。 |
| Embedded | Action 映射为本地 SDK 调用或事件订阅。 | 回调、Promise 或本地事件流。 | 保留相同的会话、幂等、权限和错误语义。 |

每次请求前，通信层 MUST 按以下顺序确认投递：从 `HandlerRole` 定位其所属的 `service_catalogs` 项；从该目录项的 `services` 唯一服务配置数组取得传输配置；以已协商 Primitive 与扩展声明对完整 Action ID 执行最长匹配，确定适用的 `transport_bindings`；再以 `transport_bindings` 的 `type` 匹配数组项的 `transport`，并将其 Endpoint 与 Action 的 path、Tool、Task 或 SDK 投影组合。UTP 不支持在 Profile、协商结果或路径编排中选择多个 Service：`services` 直接表示同一贸易 API 面的可用传输配置。不存在兼容的可用配置时，通信层 MUST 不发送该请求，并返回 `TRANSPORT.SERVICE_UNAVAILABLE`。

该确认结果仅服务于本次投递，MUST NOT 写入或冻结为路径编排结果。后续请求 MUST 重新确认，并且仅可在同一已验证的 catalog 中采用另一已声明且可用的兼容绑定；Profile 的 Service 声明发生变化时 MUST 重新发现与协商，再使用新的 catalog。无论选择何种绑定，Action 的业务含义、授权条件、可见数据、调用角色、Selected Mode 和会话语义都不得改变。

## 传输安全 {#s-46}

### HTTP 基线 {#s-461}

所有 HTTP 绑定 MUST 使用 TLS 1.2 或更高版本，SHOULD 使用 TLS 1.3。对跨主体的 HTTP 写请求，UTP 采用 [RFC 9421](https://www.rfc-editor.org/rfc/rfc9421) HTTP Message Signatures 作为基线；接收方 MUST 能验证 ES256，MAY 支持其他已注册算法。

存在 Body 时，发送方 MUST 使用 [RFC 9530](https://www.rfc-editor.org/rfc/rfc9530) `Content-Digest` 对原始字节计算摘要。代理和网关 MUST NOT 重序列化已签名 Body。请求签名至少覆盖 `@method`、`@authority`、`@path`、适用时的 `@query`、`content-digest`、会话标识以及写操作的幂等键；响应签名至少覆盖 `@status`、适用时的 `content-digest` 与 `content-type`。

签名验证使用 Profile 中发布的 `signing_keys` 或由已验证会话绑定的等效密钥材料。每个可用于 HTTP 消息签名的 `signing_keys` 条目 MUST 以 `kid` 标识，并提供 `public_key_jwk`，或提供可经 HTTPS 获取的稳定 `key_uri`；发送方在签名输入中标识所用 `kid`，接收方 MUST 使用同一版本 Profile 中匹配的密钥验证。消息签名保证来源与完整性，不替代 TLS 的机密性保护。

### 防重放与非 HTTP 等效性 {#s-462}

HTTP 写请求的签名输入 MUST 包含 `created`、`expires` 和一次性 `nonce`。接收方 MUST 在有效窗口内记录并拒绝同一发送方的重复 nonce；幂等重试仍通过相同业务幂等键关联，不能依赖 nonce 重新执行业务副作用。

MCP、A2A 与 Embedded 绑定 MAY 使用其原生认证机制，但必须提供与上述要求等效的：发送方身份绑定、载荷完整性、时效或防重放控制，以及对会话与幂等上下文的保护。无法提供等效保障的绑定 MUST NOT 承载需要该安全等级的 Action。

## 错误与一致性 {#s-47}

传输与通信层负责网关与通信错误，MUST 使用 `TRANSPORT.{CATEGORY}_{DETAIL}` 错误码；其返回体 MUST 使用 P0 定义的 `ErrorResponse`。原语框架负责业务错误：跨原语通用业务错误使用 `UTP.{CATEGORY}_{DETAIL}`，原语专有业务错误使用 `{PRIMITIVE}.{ACTION}.{DETAIL}`。调用方 MUST 以错误码前缀判定责任层，不得根据 HTTP 状态、MCP Tool 错误、A2A Task 状态或 SDK 异常推断业务语义。

传输错误发生在 Action 被交给 P0 或原语处理之前，MUST NOT 产生业务状态迁移或业务副作用。原语已受理后的 `PENDING`、`REJECTED`、`FAILURE` 与 `messages` 保持既有 P0 和原语定义；它们不得被通信层改写为 `TRANSPORT.*` 错误。

| 情形 | 处理 | 结果类型 |
| --- | --- | --- |
| 网关认证或授权失败 | 拒绝投递且不执行 Action。 | `TRANSPORT.AUTH_UNAUTHORIZED` 或 `TRANSPORT.AUTH_FORBIDDEN`。 |
| 信封、绑定映射或通信载荷不合法 | 拒绝投递且不执行 Action。 | `TRANSPORT.MESSAGE_INVALID`。 |
| 会话快照、关联或调用方向无效 | 拒绝投递且不执行 Action。 | `TRANSPORT.CONTEXT_INVALID`。 |
| 防重放校验失败 | 拒绝投递且不执行 Action。 | `TRANSPORT.REPLAY_DETECTED`。 |
| 幂等键冲突 | 不执行新请求。 | `TRANSPORT.IDEMPOTENCY_CONFLICT`。 |
| Service、Endpoint 或绑定暂不可用 | 返回可重试信息。 | `TRANSPORT.SERVICE_UNAVAILABLE`。 |
| 交付窗口内未取得确认 | 不判断原语结果；使用同一幂等键重试、查询或等待通知。 | `TRANSPORT.DELIVERY_TIMEOUT`。 |
| 网关限流 | 不执行 Action，并按 `retry_after` 等待。 | `TRANSPORT.RATE_LIMITED`。 |
| 已受理的异步操作 | 返回受理事实并等待后续结果。 | 正常响应，`execution_result = PENDING`。 |
| 业务拒绝或业务失败 | 由 P0 与原语定义解释。 | `UTP.*` 或 `{PRIMITIVE}.{ACTION}.{DETAIL}`。 |

同一 Action 在任一绑定上产生的最终业务结果 MUST 可归一化为相同的 P0 响应或错误语义。HTTP 状态码、MCP Tool 错误、A2A Task 失败和 SDK 异常只是投影，不得成为跨绑定可观察的业务差异。

## 互操作矩阵与示例 {#s-48}

| 能力 | REST | MCP | A2A | Embedded |
| --- | --- | --- | --- | --- |
| 同步请求/响应 | HTTP 请求/响应 | Tool 调用结果 | 完成态 Task/Artifact | 方法返回值或 Promise |
| 异步状态 | 回调 + 查询 | Resource 更新 + 读取 | Task/Artifact 更新 | 事件订阅或回调 |
| 去重锚点 | `message_id` + `idempotency_key` | 等价调用与会话上下文 | Task/消息标识 + 幂等键 | 调用标识 + 幂等键 |
| 身份与完整性 | TLS + RFC 9421 | 原生认证与等效证明 | 原生认证与等效证明 | 宿主安全边界与等效证明 |

以下流程展示异步 Action 的共同语义：

```text
Caller ── request(idempotency_key=K) ──▶ Handler
Caller ◀─ response(execution_result=PENDING) ─ Handler
Handler ── notification(correlation_id=request.message_id) ──▶ Caller
Caller ── transport acknowledgement ──▶ Handler
Caller ── query（仅在通知未交付或状态未知时）──▶ Handler
```

无论上述每一箭头采用 REST、MCP、A2A 还是 Embedded，Handler 对同一 `K` MUST 至多执行一次副作用，通知确认 MUST 不被解释为业务确认，查询 MUST 保持只读。
