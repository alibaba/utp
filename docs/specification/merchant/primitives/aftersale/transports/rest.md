---
title: 售后原语 — REST 绑定
section: merchant
owner: merchant-team
status: review
version: 2026-07-31
---

# 售后原语 — REST 绑定

## REST 绑定（REST Binding） {#s-rest-binding}

供应商侧 REST 端点统一使用 `/utp/m/v1/` 前缀，与买方侧 `/utp/v1/` 区分。

| 操作 | HTTP 方法 | 端点 | Content-Type |
| --- | --- | --- | --- |
| `approve` | `POST` | `/utp/m/v1/aftersales/{aftersale_id}/approve` | application/json |
| `reject` | `POST` | `/utp/m/v1/aftersales/{aftersale_id}/reject` | application/json |
| `propose` | `POST` | `/utp/m/v1/aftersales/{aftersale_id}/proposals` | application/json |
| `confirm_return` | `POST` | `/utp/m/v1/aftersales/{aftersale_id}/return-receipt` | application/json |
| `query` | `GET` | `/utp/m/v1/aftersales/{aftersale_id}` | application/json |
| `list` | `GET` | `/utp/m/v1/aftersales` | application/json |
