---
title: 商品原语 — A2A 绑定
section: merchant
owner: merchant-team
status: review
version: 2026-07-31
format: html
---

<h1>商品原语 — A2A 绑定</h1>
<h2 id="s-a2a-binding">A2A 绑定（A2A Binding）</h2>
<table><thead><tr><th>操作</th><th>A2A Task Name</th></tr></thead><tbody>
<tr><td><code>publish</code></td><td><code>utp:listing:publish</code></td></tr>
<tr><td><code>update</code></td><td><code>utp:listing:update</code></td></tr>
<tr><td><code>list</code></td><td><code>utp:listing:list</code></td></tr>
<tr><td><code>delist</code></td><td><code>utp:listing:delist</code></td></tr>
<tr><td><code>query</code></td><td><code>utp:listing:query</code></td></tr>
<tr><td><code>archive</code></td><td><code>utp:listing:archive</code></td></tr>
<tr><td><code>batch</code></td><td><code>utp:listing:batch</code></td></tr>
</tbody></table>

**传输特殊规则：**

- 批量模式在 A2A 下 MUST 使用异步 Task，通过 Artifact 返回逐条结果。

