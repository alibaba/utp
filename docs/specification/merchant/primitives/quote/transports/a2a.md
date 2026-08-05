---
title: 报价原语 — A2A 绑定
section: merchant
owner: merchant-team
status: review
version: 2026-07-31
format: html
---

<h1>报价原语 — A2A 绑定</h1>
<h2 id="s-a2a-binding">A2A 绑定（A2A Binding）</h2>
<table><thead><tr><th>操作</th><th>A2A Task Name</th></tr></thead><tbody>
<tr><td><code>quote</code></td><td><code>utp:quote:quote</code></td></tr>
<tr><td><code>revise</code></td><td><code>utp:quote:revise</code></td></tr>
<tr><td><code>bid</code></td><td><code>utp:quote:bid</code></td></tr>
<tr><td><code>decline</code></td><td><code>utp:quote:decline</code></td></tr>
<tr><td><code>query</code></td><td><code>utp:quote:query</code></td></tr>
<tr><td><code>list</code></td><td><code>utp:quote:list</code></td></tr>
</tbody></table>

**传输特殊规则：**

- REST Binding 为 MUST（基线）；MCP / A2A 为 MAY（通用规则继承（Commons Inheritance））。全部写操作 MUST 携带 idempotency_key；响应 MUST 包含 X-UTP-Quote-Status 头部。

