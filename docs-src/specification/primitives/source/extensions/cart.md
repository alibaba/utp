---
title: 寻源原语 — 购物车扩展
section: primitives
owner: sourcing-team
status: drafting
version: 2026-07-29
---

# 寻源原语 — 购物车扩展

## Source Cart Extension（寻源购物车扩展） {#s-1111-source-cart-extension}

Source Cart 是 Source 原语的可选扩展能力，按照[原语扩展规范](/documentation/specification/protocol-core/primitive-framework.html#s-105-extension-spec)挂载在 `utp.source` 命名空间下。该扩展用于在寻源阶段临时或持久保存采购候选项，便于采购方在多次 `search`（包括携带筛选条件的细化搜索）和 `lookup` 后统一比较和提交订购。

Source Cart 不属于 Source 核心操作集合，但会按原语扩展机制向 Source 状态机追加扩展状态与迁移。该扩展不改变 Source 的初始状态、内部终态和既有核心迁移语义，不生成独立 `transaction_id`，也不定义脱离 Source 的独立终态。供应商 Profile 在 `utp.source` 的 `extensions` 中声明 `utp.source_cart` 后，才表示支持本节定义的扩展操作。

### 意图与范围 {#s-11111}

**意图：** Source Cart 扩展用于在 Source 寻源过程中暂存采购方已关注的候选商品项，使采购方能够跨多次 `search`、`lookup` 进行比较、调整选择，并将选中项提交给后续 Negotiate 或 Purchase 原语。

**范围：** Source Cart 覆盖以下场景：

- **加入购物车（`cart.add`）**：将有效详情快照中的候选商品项加入当前会话购物车或已授权持久购物车。
- **查看购物车（`cart.query`）**：查看当前会话购物车或已授权持久购物车，并进入购物车上下文。
- **更新购物车项（`cart.update`）**：在购物车上下文中调整已返回商品项的数量或选择状态。
- **移除购物车项（`cart.remove`）**：在购物车上下文中移除已返回的商品项。

该扩展挂载在 `utp.source` 下，扩展包名为 `utp.source_cart`，操作域为 `cart`。供应商 Profile 在 `utp.source` 的 `extensions` 中声明该扩展后，才表示支持本节定义的扩展操作。

Source Cart 叠加在 `SOURCING` 阶段，只追加 Source 内部扩展状态与迁移，不新增全局状态，不生成独立 `transaction_id`，也不定义脱离 Source 的独立终态。

### 状态影响 {#s-11112}

Source Cart 会向 Source 内部状态机追加 `CART_ACTIVE` 扩展状态，并新增与该状态相关的迁移。Source 的 `INIT` 初始状态、`RELEASED` 内部终态，以及 `search`、`lookup` 的核心迁移保持不变。

![Source Cart 扩展后的 Source 状态机](/documentation/assets/diagrams/source-cart-state-machine.drawio.svg)

| 扩展状态 | 含义 | 进入条件 | 允许的操作 |
| --- | --- | --- | --- |
| `CART_ACTIVE` | 采购方已进入购物车上下文，可查看、调整购物车项，并将选中项提交到后续交易原语。 | `cart.query` 成功返回购物车。 | `utp.source_cart.query`, `utp.source_cart.update`, `utp.source_cart.remove`。 |

`utp.source_cart.query` 可在 `INIT` 或 `SOURCING` 阶段调用，用于查看当前会话或持久购物车，并进入 `CART_ACTIVE` 扩展状态。

| Source 原状态 | 扩展启用后的影响 | 保持不变的约束 |
| --- | --- | --- |
| `INIT` | 额外允许 `utp.source_cart.query` 查看会话购物车或已授权持久购物车，并进入 `CART_ACTIVE`。 | 核心 `search`、`lookup` 仍按 Source 状态机规则执行；不能直接 `cart.add`。 |
| `CANDIDATES_READY` | 不新增直接加购入口；采购方需先 `lookup` 获得详情快照。 | 候选集合仍只表示比较结果，不锁定库存、价格或交易条件。 |
| `DETAIL_VIEWING` | 在详情快照有效时额外允许 `utp.source_cart.add`；加购后采购方可继续 `cart.query` 进入 `CART_ACTIVE`。 | 采购方仍可跳过购物车，直接以候选项调用 `utp.negotiate.inquiry` 或 `utp.purchase.create`。 |
| `RELEASED` | 不允许基于已释放快照执行 `cart.add`。 | 必须重新 `lookup` 获取有效详情快照后才能加购。 |

### 操作定义 {#s-11113}

- **`utp.source_cart.add`**
  - **角色绑定：** Buyer → Seller
  - **执行说明：** Buyer 将有效 `lookup` 详情快照中的候选项加入购物车；Seller 校验快照和商品可用性后写入购物车项。
  - **适用状态：** `DETAIL_VIEWING`
  - **状态影响：** 不进入 `CART_ACTIVE`
  - **后续操作：** `lookup`、`cart.query`
- **`utp.source_cart.query`**
  - **角色绑定：** Buyer → Seller
  - **执行说明：** Buyer 查看当前会话或持久购物车；Seller 返回调用方可访问的购物车内容和已选商品项。
  - **适用状态：** `INIT`、`SEARCHING`、`CANDIDATES_READY`、`DETAIL_VIEWING`、`CART_ACTIVE`
  - **状态影响：** 进入或保持 `CART_ACTIVE`
  - **后续操作：** `lookup`、`cart.query`、`cart.update`、`cart.remove`、`utp.negotiate.inquiry`、`utp.purchase.create`
- **`utp.source_cart.update`**
  - **角色绑定：** Buyer → Seller
  - **执行说明：** Buyer 修改已查看购物车项的数量或选择状态；Seller 校验目标项和可编辑范围后更新购物车。
  - **适用状态：** `CART_ACTIVE`
  - **状态影响：** 保持 `CART_ACTIVE`
  - **后续操作：** `lookup`、`cart.query`、`cart.update`、`cart.remove`、`utp.negotiate.inquiry`、`utp.purchase.create`
- **`utp.source_cart.remove`**
  - **角色绑定：** Buyer → Seller
  - **执行说明：** Buyer 移除已查看购物车项；Seller 删除目标项并返回剩余购物车状态。
  - **适用状态：** `CART_ACTIVE`
  - **状态影响：** 购物车仍有商品项时保持 `CART_ACTIVE`
  - **后续操作：** `lookup`、`cart.query`、`cart.update`、`cart.remove`、`utp.negotiate.inquiry`、`utp.purchase.create`

`utp.source_cart.update` 与 `utp.source_cart.remove` 只能作用于最近一次 `cart.query` 已返回的 `cart_item_id`。`utp.negotiate.inquiry` 与 `utp.purchase.create` 仅在购物车存在已选中商品项，且 Mode 与拓扑前置条件已满足时暴露。

### 身份与资源约束 {#s-11114}

会话维度购物车仅绑定当前 `session_id`，不要求用户身份认证。持久化购物车绑定已认证用户和 `source_cart/{cart_id}` 资源；能力提供方应在 `utp.source` 原语声明中以 `authorization.required=false` 预告可按需申请的授权 scope。临时购物车操作可继续执行；访问持久化资源时，服务端返回引用该已声明 scope 的结构化授权错误，Agent 据此回到 Profile 发起授权。

服务端 MUST 仅返回与调用方身份关联的持久化购物车资源，并按自身访问策略处理商品、数量和用户资料等字段可见性。

### 扩展错误码 {#s-11115}

| 错误码 | 严重级别 | HTTP 映射 | 描述 | 建议处理 |
| --- | --- | --- | --- | --- |
| `SOURCE.CART.UNSUPPORTED` | error | 404 | 供应商未声明 `cart` 扩展能力。 | 隐藏购物车相关动作，回退到核心 Source 流程。 |
| `SOURCE.CART.ITEM_UNAVAILABLE` | warning | 409 | 候选项暂时不可加入购物车，或加入后已不可购买。 | 重新 `lookup` 或提示采购方选择其他候选。 |
| `SOURCE.CART.ITEM_DUPLICATE` | info | 200 | 商品项已存在于购物车中，服务端已合并或返回既有项。 | 刷新购物车视图。 |
| `SOURCE.CART.LIMIT_EXCEEDED` | error | 422 | 购物车商品数、单项数量或持久购物车容量超过限制。 | 调整数量或移除部分商品后重试。 |
| `SOURCE.CART.PRICE_CHANGED` | warning | 200 | 购物车项对应的价格、库存或交易条件已变化。 | 展示最新条件，必要时重新 `lookup`。 |

### 扩展传输绑定 {#s-11116}

Source Cart 扩展遵循 Source 传输绑定规则。扩展操作名称按 `utp.source_cart.{action}` 映射到各传输协议，不改变消息信封、鉴权、幂等和错误响应格式。

| 绑定类型 | 映射规则 |
| --- | --- |
| REST | 使用 `/utp/v1/source/cart` 作为资源根；`add` 使用 `POST /items`，`query` 使用 `GET /`，`update` 使用 `PATCH /items/{cart_item_id}`，`remove` 使用 `DELETE /items/{cart_item_id}`。 |
| MCP | Tool Name 使用 `utp_source_cart_{action}`，例如 `utp_source_cart_query`。 |
| A2A | Task Name 使用 `utp:source:cart:{action}`，例如 `utp:source:cart:add`。 |
| SDK | 挂载在 `client.source.cart` 下，方法名与扩展操作一致：`add`、`query`、`update`、`remove`。 |
