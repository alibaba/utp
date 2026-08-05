---
title: 接单原语 — REST 绑定
section: merchant
owner: merchant-team
status: review
version: 2026-07-31
format: html
---

<h1>接单原语 — REST 绑定</h1>
<h2 id="s-rest-binding">REST 绑定（REST Binding）</h2>
<p>供应商侧 REST 端点统一使用 <code>/utp/m/v1/</code> 前缀，与买方侧 <code>/utp/v1/</code> 区分。</p>
<table><thead><tr><th>操作</th><th>HTTP 方法</th><th>端点</th><th>Content-Type</th></tr></thead><tbody>
<tr><td><code>accept</code></td><td><code>POST</code></td><td><code>/utp/m/v1/acceptances/{routing_id}/accept</code></td><td>application/json</td></tr>
<tr><td><code>reject</code></td><td><code>POST</code></td><td><code>/utp/m/v1/acceptances/{routing_id}/reject</code></td><td>application/json</td></tr>
<tr><td><code>hold</code></td><td><code>POST</code></td><td><code>/utp/m/v1/acceptances/{routing_id}/hold</code></td><td>application/json</td></tr>
<tr><td><code>amend_leadtime</code></td><td><code>POST</code></td><td><code>/utp/m/v1/acceptances/{routing_id}/amendments</code></td><td>application/json</td></tr>
<tr><td><code>amend_price</code></td><td><code>POST</code></td><td><code>/utp/m/v1/acceptances/{routing_id}/amend-price</code></td><td>application/json</td></tr>
<tr><td><code>query</code></td><td><code>GET</code></td><td><code>/utp/m/v1/acceptances/{routing_id}</code></td><td>application/json</td></tr>
<tr><td><code>list</code></td><td><code>GET</code></td><td><code>/utp/m/v1/acceptances?status=&from=&cursor=&limit=</code></td><td>application/json</td></tr>
</tbody></table>

**传输特殊规则：**

- 全部写操作 MUST 携带 idempotency_key；响应 MUST 包含 X-UTP-Acceptance-Status 头部。

