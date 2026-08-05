---
title: 库存原语 — REST 绑定
section: merchant
owner: merchant-team
status: review
version: 2026-07-31
---

# 库存原语 — REST 绑定

## REST 绑定（REST Binding） {#s-rest-binding}

供应商侧 REST 端点统一使用 `/utp/m/v1/` 前缀，与买方侧 `/utp/v1/` 区分。

| 操作 | HTTP 方法 | 端点 | Content-Type |
| --- | --- | --- | --- |
| `set` | `PUT` | `/utp/m/v1/inventory/{listing_id}/{sku_id}` | application/json |
| `adjust` | `POST` | `/utp/m/v1/inventory/{listing_id}/{sku_id}/adjustments` | application/json |
| `query` | `GET` | `/utp/m/v1/inventory?listing_id=&sku_id=` | application/json |
| `hold.query` | `GET` | `/utp/m/v1/inventory/holds?sku_id=&transaction_id=&status=` | application/json |
| `批量 set/adjust` | `POST` | `/utp/m/v1/inventory/batch` | application/json |
