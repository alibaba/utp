---
title: 交付原语 — A2A 绑定
section: merchant
owner: merchant-team
status: review
version: 2026-07-31
format: html
---

<h1>交付原语 — A2A 绑定</h1>
<h2 id="s-a2a-binding">A2A 绑定（A2A Binding）</h2>
<table><thead><tr><th>操作</th><th>A2A Task Name</th></tr></thead><tbody>
<tr><td><code>prepare</code></td><td><code>utp:delivery:prepare</code></td></tr>
<tr><td><code>split</code></td><td><code>utp:delivery:split</code></td></tr>
<tr><td><code>ship</code></td><td><code>utp:delivery:ship</code></td></tr>
<tr><td><code>update</code></td><td><code>utp:delivery:update</code></td></tr>
<tr><td><code>query</code></td><td><code>utp:delivery:query</code></td></tr>
</tbody></table>

**传输特殊规则：**

- 标识符与参数一律置于请求体（与 UTP-B 规范 《履约原语》 的 Fulfill REST 风格一致）；全部写操作 MUST 携带 idempotency_key。

