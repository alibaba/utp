---
title: 订购原语 — A2A 绑定
section: primitives
owner: purchase-team
status: drafting
version: 2026-07-29
---

# 订购原语 — A2A 绑定

## A2A 绑定（A2A Binding） {#s-13-8-3}

| 操作 | A2A Task Name | 说明 |
| --- | --- | --- |
| `utp.purchase.create` | `utp:purchase:create` | 同步任务，直接返回相应对象草案。 |
| `utp.purchase.update` | `utp:purchase:update` | 同步任务，返回更新后的草案。 |
| `utp.purchase.complete` | `utp:purchase:complete` | 异步任务。接收 Mandate 后状态为 `pending`，Mandate 准入、库存锁定和承诺处理完成后状态为 `completed`。 |
| `utp.purchase.contract-create` | `utp:purchase:contract-create` | 同步任务，返回采购合同或框架协议草案。 |
| `utp.purchase.contract-update` | `utp:purchase:contract-update` | 同步任务，返回更新后的合同草案。 |
| `utp.purchase.contract-complete` | `utp:purchase:contract-complete` | 异步任务，完成 Mandate 准入和合同承诺处理。 |
| `utp.purchase.query` | `utp:purchase:query` | 同步只读任务。无业务请求体；以任务目标中的 `purchase_id` 或 `agreement_id` 定位，返回相应对象状态视图。 |
| `utp.purchase.cancel` | `utp:purchase:cancel` | 同步任务。无业务请求体；以任务目标中的 `purchase_id` 或 `agreement_id` 定位，取消草案；订单同时释放临时库存资源。 |

**A2A 特殊规则：**

- `purchase:complete` MUST 在同一 Task ID 下完成 Mandate 准入与承诺处理。
- 除创建任务外，A2A Task 的 `target` MUST 包含唯一的 `purchase_id` 或 `agreement_id`；`query` 与 `cancel` 不传递业务输入。
- 承诺成立后，A2A Task Artifact MUST 包含相应的订单、采购合同或框架协议凭证。
- 长期协议循环场景中，每次循环 MUST 使用新的 Task ID，通过 `agreement_ref` 关联。
