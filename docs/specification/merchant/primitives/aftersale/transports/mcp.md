---
title: 售后原语 — MCP 绑定
section: merchant
owner: merchant-team
status: review
version: 2026-07-31
format: html
---

<h1>售后原语 — MCP 绑定</h1>
<h2 id="s-mcp-binding">MCP 绑定（MCP Binding）</h2>
<table><thead><tr><th>操作</th><th>MCP Tool Name</th></tr></thead><tbody>
<tr><td><code>approve</code></td><td><code>utp_aftersale_approve</code></td></tr>
<tr><td><code>reject</code></td><td><code>utp_aftersale_reject</code></td></tr>
<tr><td><code>propose</code></td><td><code>utp_aftersale_propose</code></td></tr>
<tr><td><code>confirm_return</code></td><td><code>utp_aftersale_confirm_return</code></td></tr>
<tr><td><code>query</code></td><td><code>utp_aftersale_query</code></td></tr>
<tr><td><code>list</code></td><td><code>utp_aftersale_list</code></td></tr>
</tbody></table>

**传输特殊规则：**

- Embedded 绑定不适用于本原语（供应商侧 Endpoint 必须可被平台反向调用）。传输语义与 MessageEnvelope 继承 UTP 规范 《MessageEnvelope》。

