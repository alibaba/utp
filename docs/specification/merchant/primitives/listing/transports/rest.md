---
title: 商品原语 — REST 绑定
section: merchant
owner: merchant-team
status: review
version: 2026-07-31
---

# 商品原语 — REST 绑定

## REST 绑定（REST Binding） {#s-rest-binding}

供应商侧 REST 端点统一使用 `/utp/m/v1/` 前缀，与买方侧 `/utp/v1/` 区分。

| 操作 | HTTP 方法 | 端点 | Content-Type |
| --- | --- | --- | --- |
| `utp.listing.publish` | `POST` | `/utp/m/v1/listings` | application/json |
| `utp.listing.update` | `PATCH` | `/utp/m/v1/listings/{listing_id}` | application/json |
| `utp.listing.list` | `POST` | `/utp/m/v1/listings/{listing_id}/list` | application/json |
| `utp.listing.delist` | `POST` | `/utp/m/v1/listings/{listing_id}/delist` | application/json |
| `utp.listing.query` | `GET` | `/utp/m/v1/listings/{listing_id} 或 /utp/m/v1/listings?status=&category=&page=` | — |
| `utp.listing.archive` | `POST` | `/utp/m/v1/listings/{listing_id}/archive` | application/json |
| `批量 publish/update` | `POST` | `/utp/m/v1/listings/batch` | application/json |
