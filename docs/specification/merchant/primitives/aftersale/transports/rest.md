---
title: 售后原语 — REST 绑定
section: merchant
owner: merchant-team
status: review
version: 2026-07-31
format: html
---

<h1>售后原语 — REST 绑定</h1>
<h2 id="s-rest-binding">REST 绑定（REST Binding）</h2>
<p>供应商侧 REST 端点统一使用 <code>/utp/m/v1/</code> 前缀，与买方侧 <code>/utp/v1/</code> 区分。</p>
<table><thead><tr><th>操作</th><th>HTTP 方法</th><th>端点</th><th>Content-Type</th></tr></thead><tbody>
<tr><td><code>approve</code></td><td><code>POST</code></td><td><code>/utp/m/v1/aftersales/{aftersale_id}/approve</code></td><td>application/json</td></tr>
<tr><td><code>reject</code></td><td><code>POST</code></td><td><code>/utp/m/v1/aftersales/{aftersale_id}/reject</code></td><td>application/json</td></tr>
<tr><td><code>propose</code></td><td><code>POST</code></td><td><code>/utp/m/v1/aftersales/{aftersale_id}/proposals</code></td><td>application/json</td></tr>
<tr><td><code>confirm_return</code></td><td><code>POST</code></td><td><code>/utp/m/v1/aftersales/{aftersale_id}/return-receipt</code></td><td>application/json</td></tr>
<tr><td><code>query</code></td><td><code>GET</code></td><td><code>/utp/m/v1/aftersales/{aftersale_id}</code></td><td>application/json</td></tr>
<tr><td><code>list</code></td><td><code>GET</code></td><td><code>/utp/m/v1/aftersales</code></td><td>application/json</td></tr>
</tbody></table>

