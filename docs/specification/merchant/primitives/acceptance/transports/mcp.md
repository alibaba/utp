---
title: 接单原语 — MCP 绑定
section: merchant
owner: merchant-team
status: review
version: 2026-07-31
format: html
---

<h1>接单原语 — MCP 绑定</h1>
<h2 id="s-mcp-binding">MCP 绑定（MCP Binding）</h2>
<table><thead><tr><th>操作</th><th>MCP Tool Name</th></tr></thead><tbody>
<tr><td><code>accept</code></td><td><code>utp_acceptance_accept</code></td></tr>
<tr><td><code>reject</code></td><td><code>utp_acceptance_reject</code></td></tr>
<tr><td><code>hold</code></td><td><code>utp_acceptance_hold</code></td></tr>
<tr><td><code>amend_leadtime</code></td><td><code>utp_acceptance_amend</code></td></tr>
<tr><td><code>amend_price</code></td><td><code>utp_acceptance_amend_price</code></td></tr>
<tr><td><code>query</code></td><td><code>utp_acceptance_query</code></td></tr>
<tr><td><code>list</code></td><td><code>utp_acceptance_list</code></td></tr>
</tbody></table>

**传输特殊规则：**

- 全部写操作 MUST 携带 idempotency_key；响应 MUST 包含 X-UTP-Acceptance-Status 头部。

