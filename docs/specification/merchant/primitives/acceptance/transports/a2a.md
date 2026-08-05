---
title: 接单原语 — A2A 绑定
section: merchant
owner: merchant-team
status: review
version: 2026-07-31
format: html
---

<h1>接单原语 — A2A 绑定</h1>
<h2 id="s-a2a-binding">A2A 绑定（A2A Binding）</h2>
<table><thead><tr><th>操作</th><th>A2A Task Name</th></tr></thead><tbody>
<tr><td><code>accept</code></td><td><code>utp:acceptance:accept</code></td></tr>
<tr><td><code>reject</code></td><td><code>utp:acceptance:reject</code></td></tr>
<tr><td><code>hold</code></td><td><code>utp:acceptance:hold</code></td></tr>
<tr><td><code>amend_leadtime</code></td><td><code>utp:acceptance:amend</code></td></tr>
<tr><td><code>amend_price</code></td><td><code>utp:acceptance:amend_price</code></td></tr>
<tr><td><code>query</code></td><td><code>utp:acceptance:query</code></td></tr>
<tr><td><code>list</code></td><td><code>utp:acceptance:list</code></td></tr>
</tbody></table>

**传输特殊规则：**

- 全部写操作 MUST 携带 idempotency_key；响应 MUST 包含 X-UTP-Acceptance-Status 头部。

