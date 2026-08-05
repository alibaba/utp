---
title: 报价原语 — REST 绑定
section: merchant
owner: merchant-team
status: review
version: 2026-07-31
format: html
---

<h1>报价原语 — REST 绑定</h1>
<h2 id="s-rest-binding">REST 绑定（REST Binding）</h2>
<p>供应商侧 REST 端点统一使用 <code>/utp/m/v1/</code> 前缀，与买方侧 <code>/utp/v1/</code> 区分。</p>
<table><thead><tr><th>操作</th><th>HTTP 方法</th><th>端点</th><th>Content-Type</th></tr></thead><tbody>
<tr><td><code>quote</code></td><td><code>POST</code></td><td><code>/utp/m/v1/quotes/{inquiry_id}/quote</code></td><td>application/json</td></tr>
<tr><td><code>revise</code></td><td><code>POST</code></td><td><code>/utp/m/v1/quotes/{inquiry_id}/revisions</code></td><td>application/json</td></tr>
<tr><td><code>bid</code></td><td><code>POST</code></td><td><code>/utp/m/v1/quotes/{inquiry_id}/bid</code></td><td>application/json</td></tr>
<tr><td><code>decline</code></td><td><code>POST</code></td><td><code>/utp/m/v1/quotes/{inquiry_id}/decline</code></td><td>application/json</td></tr>
<tr><td><code>query</code></td><td><code>GET</code></td><td><code>/utp/m/v1/quotes/{inquiry_id}</code></td><td>application/json</td></tr>
<tr><td><code>list</code></td><td><code>GET</code></td><td><code>/utp/m/v1/quotes?status=&from=&cursor=&limit=</code></td><td>application/json</td></tr>
</tbody></table>

**传输特殊规则：**

- REST Binding 为 MUST（基线）；MCP / A2A 为 MAY（通用规则继承（Commons Inheritance））。全部写操作 MUST 携带 idempotency_key；响应 MUST 包含 X-UTP-Quote-Status 头部。

