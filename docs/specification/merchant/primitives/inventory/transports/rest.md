---
title: 库存原语 — REST 绑定
section: merchant
owner: merchant-team
status: review
version: 2026-07-31
format: html
---

<h1>库存原语 — REST 绑定</h1>
<h2 id="s-rest-binding">REST 绑定（REST Binding）</h2>
<p>供应商侧 REST 端点统一使用 <code>/utp/m/v1/</code> 前缀，与买方侧 <code>/utp/v1/</code> 区分。</p>
<table><thead><tr><th>操作</th><th>HTTP 方法</th><th>端点</th><th>Content-Type</th></tr></thead><tbody>
<tr><td><code>set</code></td><td><code>PUT</code></td><td><code>/utp/m/v1/inventory/{listing_id}/{sku_id}</code></td><td>application/json</td></tr>
<tr><td><code>adjust</code></td><td><code>POST</code></td><td><code>/utp/m/v1/inventory/{listing_id}/{sku_id}/adjustments</code></td><td>application/json</td></tr>
<tr><td><code>query</code></td><td><code>GET</code></td><td><code>/utp/m/v1/inventory?listing_id=&sku_id=</code></td><td>application/json</td></tr>
<tr><td><code>hold.query</code></td><td><code>GET</code></td><td><code>/utp/m/v1/inventory/holds?sku_id=&transaction_id=&status=</code></td><td>application/json</td></tr>
<tr><td><code>批量 set/adjust</code></td><td><code>POST</code></td><td><code>/utp/m/v1/inventory/batch</code></td><td>application/json</td></tr>
</tbody></table>

