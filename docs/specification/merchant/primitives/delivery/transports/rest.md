---
title: 交付原语 — REST 绑定
section: merchant
owner: merchant-team
status: review
version: 2026-07-31
---

# 交付原语 — REST 绑定

## REST 绑定（REST Binding） {#s-rest-binding}

供应商侧 REST 端点统一使用 `/utp/m/v1/` 前缀，与买方侧 `/utp/v1/` 区分。

| 操作 | HTTP 方法 | 端点 | Content-Type |
| --- | --- | --- | --- |
| `prepare` | `POST` | `/utp/m/v1/deliveries/preparations` | application/json |
| `split` | `POST` | `/utp/m/v1/deliveries/split-plans` | application/json |
| `ship` | `POST` | `/utp/m/v1/deliveries` | application/json |
| `update` | `POST` | `/utp/m/v1/deliveries/{shipment_id}/events` | application/json |
| `query` | `GET` | `/utp/m/v1/deliveries?transaction_id=&shipment_id=` | application/json |
