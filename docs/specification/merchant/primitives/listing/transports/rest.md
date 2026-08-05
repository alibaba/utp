---
title: 商品原语 — REST 绑定
section: merchant
owner: merchant-team
status: review
version: 2026-07-31
format: html
---

<h1>商品原语 — REST 绑定</h1>
<h2 id="s-rest-binding">REST 绑定（REST Binding）</h2>
<p>供应商侧 REST 端点统一使用 <code>/utp/m/v1/</code> 前缀，与买方侧 <code>/utp/v1/</code> 区分。</p>
<table><thead><tr><th>操作</th><th>HTTP 方法</th><th>端点</th><th>Content-Type</th></tr></thead><tbody>
<tr><td><code>utp.listing.publish</code></td><td><code>POST</code></td><td><code>/utp/m/v1/listings</code></td><td>application/json</td></tr>
<tr><td><code>utp.listing.update</code></td><td><code>PATCH</code></td><td><code>/utp/m/v1/listings/{listing_id}</code></td><td>application/json</td></tr>
<tr><td><code>utp.listing.list</code></td><td><code>POST</code></td><td><code>/utp/m/v1/listings/{listing_id}/list</code></td><td>application/json</td></tr>
<tr><td><code>utp.listing.delist</code></td><td><code>POST</code></td><td><code>/utp/m/v1/listings/{listing_id}/delist</code></td><td>application/json</td></tr>
<tr><td><code>utp.listing.query</code></td><td><code>GET</code></td><td><code>/utp/m/v1/listings/{listing_id} 或 /utp/m/v1/listings?status=&category=&page=</code></td><td>—</td></tr>
<tr><td><code>utp.listing.archive</code></td><td><code>POST</code></td><td><code>/utp/m/v1/listings/{listing_id}/archive</code></td><td>application/json</td></tr>
<tr><td><code>批量 publish/update</code></td><td><code>POST</code></td><td><code>/utp/m/v1/listings/batch</code></td><td>application/json</td></tr>
</tbody></table>

