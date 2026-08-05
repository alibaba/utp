---
title: 交付原语 — MCP 绑定
section: merchant
owner: merchant-team
status: review
version: 2026-07-31
format: html
---

<h1>交付原语 — MCP 绑定</h1>
<h2 id="s-mcp-binding">MCP 绑定（MCP Binding）</h2>
<table><thead><tr><th>操作</th><th>MCP Tool Name</th></tr></thead><tbody>
<tr><td><code>prepare</code></td><td><code>utp_delivery_prepare</code></td></tr>
<tr><td><code>split</code></td><td><code>utp_delivery_split</code></td></tr>
<tr><td><code>ship</code></td><td><code>utp_delivery_ship</code></td></tr>
<tr><td><code>update</code></td><td><code>utp_delivery_update</code></td></tr>
<tr><td><code>query</code></td><td><code>utp_delivery_query</code></td></tr>
</tbody></table>

**传输特殊规则：**

- 标识符与参数一律置于请求体（与 UTP-B 规范 《履约原语》 的 Fulfill REST 风格一致）；全部写操作 MUST 携带 idempotency_key。

