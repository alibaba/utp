---
title: UTP-M 附录（MA—MF）
section: merchant
owner: merchant-team
status: review
version: 2026-07-31
---

# UTP-M 附录（Appendices） {#s-m-appendices}

## 附录 MA：术语表（Glossary） {#s-ma}

以下术语为 UTP-M 新增，与 UTP 规范附录 A 术语表（术语的唯一权威来源）共用同一命名空间，不与既有术语冲突；合并登记路线见附录 ME 第 12 项。

| 术语 | 英文 | 定义 | 定义位置 |
| --- | --- | --- | --- |
| 供应商侧规范 | Merchant-Side Specification（UTP-M） | 一组 `initiator_role = Seller` 的原语与供应商运营规范的编辑分组名称；不构成角色方向的推断依据。 | 问题与边界（Problem & Scope） |
| 平台方 | Marketplace | 托管商品目录与订单路由的 UTP Server 运营方角色，MP1—MP6 原语的 handler_role。 | 新增角色：Marketplace |
| 询盘路由 | Inquiry Routing | Marketplace 将买方 P2 询盘定向推送给声明 `utp.quote` 商户的回调事件；MP3 应答任务的起点。 | [询盘路由（Inquiry Routing）](primitives/quote/index.md#s-m57) |
| 报价记录 | QuoteRecord | 供应商对询盘的签名应答存档（报价/谢绝，含轮次与版本）；纳入协商 Evidence Bundle。 | [terms_hash 计算规则（补充 UTP-B 规范留白）](primitives/quote/index.md#s-m5101a) |
| 打款 | Payout | 平台将已确认账单应付金额打至供应商收款账户的平台驱动动作（P4 结算扩展内，非原语）。 | [打款动作（Payout）](settlement.md#s-m99) |
| 商品档案 | Listing | 供应商发布到 Marketplace 的商品/服务标准结构，含 SKU、定价、履约条款；MP1 的核心实体。 | [Listing](primitives/listing/index.md#s-m391) |
| 商品发布 | Publish | 创建商品档案并进入平台审核的动作（`utp.listing.publish`）。 | [Listing 操作矩阵](primitives/listing/index.md#s-m371) |
| 上架 | List | 使审核通过的商品进入可搜索、可订购状态（`LISTED`）的动作。 | [Listing 操作矩阵](primitives/listing/index.md#s-m371) |
| 下架 | Delist | 使商品原子退出可搜索、可订购范围的动作；不影响既有订单义务。 | [Listing 操作矩阵](primitives/listing/index.md#s-m371) / [状态迁移的确定性](primitives/listing/index.md#s-m323) |
| 版本快照 | ListingSnapshot | 商品每次生效版本的规范化存档，以 `version_hash` 被订单条款快照引用。 | [ListingMedia 与 ListingSnapshot](primitives/listing/index.md#s-m395) |
| 可售数量 | Available | 供应商声明的渠道可售总量，MP2 的权威写入值。 | [库存模型（Inventory Model）](primitives/inventory/index.md#s-m42) |
| 可下单量 | Sellable | 派生只读值：`available − Σ(active_holds)`。 | [库存模型（Inventory Model）](primitives/inventory/index.md#s-m42) |
| 库存占用 | Inventory Hold | P3 交易触发的临时（HELD）或最终（LOCKED）数量占用记录，供应商只读核验。 | [InventoryHold](primitives/inventory/index.md#s-m493) |
| 订单路由 | Order Routing | Marketplace 将待受理订购推送给供应商的回调事件。 | [订单路由（Order Routing）](primitives/acceptance/index.md#s-m67) |
| 受理结论 | Acceptance Conclusion | 供应商对路由订单的签名结论：ACCEPTED / REJECTED / LEADTIME_AMENDED。 | [AcceptanceRecord](primitives/acceptance/index.md#s-m6101) |
| 受理策略 | AcceptancePolicy | Principal 签名的自动接单策略配置，自动决策的授权书面化。 | AcceptancePolicy 实体 |
| 发货凭证 | Shipment | 供应商签名的发货事实凭证（承运商、运单、包裹明细、批次）。 | [Shipment（发货凭证）](primitives/delivery/index.md#s-m791) |
| 批次 | Batch | 分批交付场景下的独立交付单元，独立走发货状态机。 | [Shipment 资源状态机（供应商视角）](primitives/delivery/index.md#s-m721) |
| 结算账单 | SettlementStatement | Marketplace 按结算周期出具的签名账单，逐笔可追溯到交易与支付凭证。 | [SettlementStatement](settlement.md#s-m961) |
| 差异申报 | Settlement Discrepancy | 供应商对账单条目的结构化异议登记；资金后果经 P4/P6 产生。 | [SettlementDiscrepancy](settlement.md#s-m963) |
| 商户桥接器 | Merchant Bridge | 连接供应商内部系统（ERP/WMS）与 UTP-M 原语的集成组件。 | 定位（Positioning） |
| 供应商代理 | Merchant Agent | 代表供应商 Principal 自主执行经营决策的 AI Agent；协议层以 Seller 身份出现。 | 定位（Positioning） |
| 渠道配额 | Channel Quota | ERP 分配给单一销售渠道的库存份额；平台 `available` 是其镜像。 | 库存一致性与防超卖（Inventory Consistency） |
| 资源作用域 | Resource Scope | 与交易上下文/交易生命周期并列的第三个状态作用域，以资源标识（listing_id 等）为生命周期锚点。 | 全局状态机边界声明（State Machine Boundary） |
| Handler 执行模式 | Delegation Mode | 平台托管拓扑下卖方应答义务（P2/P6）的两种执行方式：`direct`（平台代答）与 `passthrough`（透传商家回调）；对买方透明，超时必有兜底。 | Handler 侧执行模式：平台代答与透传（Delegation Mode） |
| 商品级 Mode 收窄 | mode_constraints | Listing 上对商户 Profile Mode 范围的商品级子集声明，驱动 Source 搜索可见性过滤（“能被搜到即可被履约”）。 | [Listing](primitives/listing/index.md#s-m391) / [Mode-Driven Behavior（模式驱动行为）](primitives/listing/index.md#s-m36) |
| 售后单（Aftersale Order） | 以 `aftersale_id` 为锚点的售后处置资源，记录诉求、方案、协商回合、退货验货与退款凭据。 | [Entities（实体定义）](primitives/aftersale/index.md#s-m85) |  |
| 处置方案（AftersaleResolution） | 售后的双方合意结论，含类型、退款金额、是否退货与运费责任；`resolution_hash` 为签名对象。 | [Entities（实体定义）](primitives/aftersale/index.md#s-m85) |  |
| 改价提议（Price Amendment） | 受理阶段卖方提出的价格调整提议。MUST NOT 单方生效，买方确认后 `proposed_terms_hash` 成为权威条款哈希。 | [改价提议（Price Amendment）](primitives/acceptance/index.md#s-m612) |  |

## 附录 MB：错误码总表（Error Code Registry） {#s-mb}

UTP-M 错误码沿用 UTP 规范 `PRIMITIVE.ACTION.REASON` 命名与标准错误响应格式（UTP 规范 《标准错误响应格式》），与 UTP 规范附录 B 错误码总表共用同一注册表体系（`registries/error-codes.registry.json`）；合并登记路线见附录 ME 第 12 项。

| 错误码空间 | 数量 | 定义位置 | 代表条目 |
| --- | --- | --- | --- |
| `LISTING.*` | 15 | [Error Handling（错误处理）](primitives/listing/index.md#s-m33) | `LISTING.PUBLISH.MERCHANT_NOT_ACTIVE`、`LISTING.PUBLISH.INGEST_FAILED`、`LISTING.UPDATE.VERSION_CONFLICT`、`LISTING.LIST.NOT_REVIEWED`、`LISTING.ARCHIVE.OPEN_ORDERS` |
| `INVENTORY.*` | 7 | [Error Handling（错误处理）](primitives/inventory/index.md#s-m43) | `INVENTORY.REVISION_CONFLICT`、`INVENTORY.NEGATIVE_RESULT`、`INVENTORY.HOLD_NOT_FOUND` |
| `QUOTE.*` | 8 | [Error Handling（错误处理）](primitives/quote/index.md#s-m53) | `QUOTE.SIGNATURE_INVALID`、`QUOTE.PRICE_OUT_OF_POLICY`、`QUOTE.BID.WINDOW_CLOSED`、`QUOTE.DECLINE.REASON_REQUIRED` |
| `ACCEPTANCE.*` | 11 | [Error Handling（错误处理）](primitives/acceptance/index.md#s-m63) | `ACCEPTANCE.EXPIRED`、`ACCEPTANCE.SIGNATURE_INVALID`、`ACCEPTANCE.TERMS_MISMATCH`、`ACCEPTANCE.AMEND_PRICE.NOT_ALLOWED` |
| `DELIVERY.*` | 8 | [Error Handling（错误处理）](primitives/delivery/index.md#s-m73) | `DELIVERY.PAYMENT_PRECONDITION`、`DELIVERY.QUANTITY_MISMATCH`、`DELIVERY.SPLIT_NOT_ALLOWED` |
| `AFTERSALE.*` | 10 | [Error Handling（错误码）](primitives/aftersale/index.md#s-m86) | `AFTERSALE.RESOLUTION_EXCEEDS_REQUEST`、`AFTERSALE.MAX_ROUNDS`、`AFTERSALE.QUANTITY_EXCEEDS_RETURN` |
| `SETTLEMENT.*` | 5 | [错误码（Error Codes）](settlement.md#s-m97) | `SETTLEMENT.DISCREPANCY_WINDOW_CLOSED`、`SETTLEMENT.STATEMENT_NOT_FOUND` |

**与 UTP-B 规范既有错误码的触发闭环：**`SOURCE.LOOKUP.ITEM_NOT_FOUND` 与 `PURCHASE.CREATE.INVALID_ITEMS`（"商品已下架"）的触发源由 MP1 `delist`/`archive` 正式定义（[状态迁移的确定性](primitives/listing/index.md#s-m323)）；`PURCHASE.COMPLETE.INVENTORY_UNAVAILABLE` 的供给侧对应为 `ACCEPTANCE.INVENTORY_INSUFFICIENT`。

## 附录 MC：Scope 总表（Scope Registry） {#s-mc}

| Scope | 类型 | 原语/扩展 | 定义位置 |
| --- | --- | --- | --- |
| `listing` / `inventory` / `quote` / `acceptance` / `delivery` / `aftersale` | Primitive 级聚合 | MP1—MP6（Profile `primitives[].authorization.scope` 声明用，蕴含该原语全部 Action Scope） | [Step 2：Profile 发布（Profile Declaration）](onboarding.md#s-m23) |
| `listing:publish` / `listing:update` / `listing:list` / `listing:delist` / `listing:query` / `listing:archive` | Action | MP1 `utp.listing` | [Scopes（权限范围）](primitives/listing/index.md#s-m34) |
| `inventory:set` / `inventory:adjust` / `inventory:query` / `inventory:hold:query` | Action | MP2 `utp.inventory` | [Scopes（权限范围）](primitives/inventory/index.md#s-m44) |
| `quote:quote` / `quote:revise` / `quote:bid` / `quote:decline` / `quote:query` | Action | MP3 `utp.quote`（草案） | [Scopes（权限范围）](primitives/quote/index.md#s-m54) |
| `acceptance:accept` / `acceptance:reject` / `acceptance:hold` / `acceptance:amend` / `acceptance:query` | Action | MP4 `utp.acceptance` | [Scopes（权限范围）](primitives/acceptance/index.md#s-m64) |
| `delivery:prepare` / `delivery:ship` / `delivery:split` / `delivery:update` / `delivery:query` | Action | MP5 `utp.delivery` | [Scopes（权限范围）](primitives/delivery/index.md#s-m74) |
| `aftersale:write`（approve / reject / propose / confirm_return） / `aftersale:read`（query / list） | Action | MP6 `utp.aftersale` | [Scopes（授权范围）](primitives/aftersale/index.md#s-m87) |
| `pay:settlement:read` | Data | `utp.pay.settlement` 扩展 | [Scope 与授权](settlement.md#s-m98) |
| `pay:settlement:discrepancy` | Action | `utp.pay.settlement` 扩展 | [Scope 与授权](settlement.md#s-m98) |

全部 Scope 仅作用于调用方本方资源；Merchant Agent 持有的授权 MUST 显式枚举 Scope 并声明金额上限与时效（Agent 授权链（Delegation & Mandate））。

## 附录 MD：Schema 索引（Schema Index） {#s-md}

UTP-M 的机器可读 Schema 与买方侧原语 Schema **同仓同标准**（JSON Schema draft 2020-12）：每个原语一个目录，`primitive.json` 承载 Action 定义与内部状态机，`entities/` 下每个实体与每个操作的输入/输出各一个文件；`$id` 权威地址前缀为 `https://ut-protocol.com/schemas/`。通用类型（Money、LineItem、Price、TradeMode、Signature、EvidenceReference、Address 等）MUST 复用 `primitives/common/entities/`，MUST NOT 在商家侧重复定义；分页 MUST 复用 `primitives/common/pagination.json`（游标语义），响应导航 MUST 复用 `primitives/common/valid_next_actions.json`（全限定 Action 名）。

| 范围 | Schema 位置（`schemas/`） | 说明 |
| --- | --- | --- |
| MP1 商品管理 | `primitives/listing/primitive.json` + `primitives/listing/entities/` | Listing、Sku、Pricing、FulfillmentTerms、ListingSnapshot、SourceMaterials 与各操作 `*_input`/`*_output`（商品原语） |
| MP2 库存管理 | `primitives/inventory/primitive.json` + `entities/` | InventoryRecord、Adjustment、Hold 与 set/adjust/query/batch 输入输出（库存原语） |
| MP3 询盘响应（草案） | `primitives/quote/primitive.json` + `entities/` | QuoteRecord、DeclineReason 与 quote/decline 输入输出；**报价体复用 `primitives/negotiate/entities/quote.json`（UTP-B 规范权威 Quote 实体）**（报价原语） |
| MP4 订单受理 | `primitives/acceptance/primitive.json` + `entities/` | OrderRouting、AcceptanceRecord、RejectReason 与 accept/reject/hold/amend 输入输出（接单原语） |
| MP5 交付 | `primitives/delivery/primitive.json` + `entities/` | Shipment、Package、SplitPlan、Event 与 prepare/ship/split/update 输入输出（M7；与 UTP-B 规范 Fulfill 侧 Shipment 的合并见 ME 第 7 项） |
| 入驻与能力声明（非原语） | `merchant/registration/` | MerchantRegistration、MerchantStatus、CredentialSubmission、Contact、DelegationPolicy、AcceptancePolicy、ErpIntegrationMode 与 RegistrationOutput（商家入驻） |
| 结算与对账（非原语） | `merchant/settlement/` | SettlementStatement/Entry/Discrepancy、SettlementAccount、Fee、Adjustment 与各查询输入输出（结算与对账） |
| 回调事件（非原语） | `merchant/events/` | 回调 Envelope、EventType 注册表与各事件载荷 `*_payload`（[Step 5：回调登记与连通性验收（Callback & Readiness）](onboarding.md#s-m26)）——以上三者均为非原语能力，与 `discovery/`、`transport/` 同级安置 |

状态机的机器可读定义内嵌于各 `primitive.json` 的 `state_machine`（`scope: resource`，以 `listing_id`/`inquiry_id`/`routing_id`/`shipment_id` 为资源键），与正文各章状态机表逐条一致；Action 迁移以全限定名（`utp.acceptance.accept`）表达，外部与系统事件以 `event` 字段表达。

## 附录 ME：与 UTP 规范的章节对应与整合路线（Integration Map，资料性） {#s-me}

本附录为**资料性（Informative）**：给出本规范（UTP-M 并列的独立协议）各章与 UTP-B 规范章节体系的对应位置，以及 MP 原语升入 UTP 规范正式章节序列（需 RFC 治理流程）时的联动修改清单。对应关系的落地与否不影响本规范条款的规范效力；若执行整合，MUST 遵循 UTP 规范 README 第 3 节新增章节流程与第 4 节全局一致性检查。

| # | 本规范内容 | 整合目标 | 联动修改 |
| --- | --- | --- | --- |
| 1 | M1 架构总览 | 并入 UTP 规范 Ch.2（架构总览新增"供应商侧视图"小节）+ Ch.9（角色） | architecture.html 六层图补充供应商侧调用方向 |
| 2 | Marketplace 角色（新增角色：Marketplace） | UTP 规范 《R2：标准角色集与角色加入规则》 R2 标准角色表（走 RFC 治理流程；过渡期 R3 `marketplace.Marketplace`，《R3：领域角色扩展》） | topology.html 角色表、加入规则表、RoleDefinition 示例；`registries/roles.registry.json` |
| 3 | M2 入驻与能力声明 | 新章节（建议插在 Ch.3 发现与协商之后，作为"商户接入"章） | 全部 26 个页面 sidebar + 编号 +1 联动；discovery.html 《发现与协商》 Profile 增补 `dev.utp.merchant_callback` Service 说明 |
| 4 | M3 MP1 / M4 MP2 / M5 MP3 / M6 MP4 / M7 MP5 六个原语章 | 交易原语组新增五章（P0 通用框架之后、或独立"供应商原语"分组） | index.html 目录表与统计；治理侧发布五个 `PrimitiveDefinition`；MessageEnvelope `primitive` 枚举扩展（transport.html 《MessageEnvelope》 + schemas.html 24.4 两处） |
| 4a | MP3 与 P2 对偶（[与 P2 询盘原语的衔接（Interlock with P2）](primitives/quote/index.md#s-m56)） | primitive-negotiate.html 增补"卖方侧应答经 utp.quote 完成"的规范通道说明（平台托管拓扑） | negotiation_id 上下文共享、Quote 实体复用与 terms_hash [计算规则](primitives/quote/index.md#s-m5101a)的双向交叉引用 |
| 4b | MP3 `revise` 的第二跳表达（[职责边界](primitives/quote/index.md#s-m563) 第 4 项） | `primitives/negotiate/state_machine.json` 增补 `QUOTED --utp.negotiate.quote--> QUOTED` 自环（修订报价的重复交付），或在 `constraints` 中明确“同一 inquiry 的后续 quote 视为版本更新、不改变协商状态” | 本规范 [职责边界](primitives/quote/index.md#s-m563) 已声明当前处理方式； UTP-B 规范补充后引用即可，MP3 语义不变 |
| 5 | MP4 与 P3 [衔接](primitives/acceptance/index.md#s-m66) | primitive-purchase.html 《Seller 角色职责》 / 《订购原语》 增补"卖方承诺处理经 utp.acceptance 完成"的规范通道说明 | 《B2C 退化行为详解》 自动承诺处理脚注指向 AcceptancePolicy |
| 6 | MP2 与 P3 库存契约（[与 P3 Purchase 的库存一致性契约（Interlock with P3）](primitives/inventory/index.md#s-m47)） | primitive-purchase.html 《Seller 角色职责》（锁定库存职责）与 state-machine.html required_evidence 说明处增加交叉引用 | inventory_receipt / inventory_release_receipt 的生成来源注明 InventoryHold |
| 7 | MP5 与 P5 [事实传导](primitives/delivery/index.md#s-m77) | primitive-fulfill.html 《订单履约事件通知（notify）》（notify 的事实来源）增加交叉引用。**历史不一致已修复**： UTP 规范早期版本中 topology/scenarios 引用的未定义操作 `fulfill.ship` 已全部清除，发货事实的唯一产生通道即 `utp.delivery.ship`（MP5），Ch.15 保持纯买方视角 | fulfill/shipment 两个 Shipment Schema 合并为单一权威定义 |
| 8 | M9 结算扩展 | primitive-pay.html 新增"settlement 扩展"小节（按 《原语扩展规范（Primitive Extension Specification）》 扩展规范格式） | Profile `primitives[].extensions` 声明说明；错误码表 |
| 9 | M10 ERP Bridge | compatibility.html（Ch.22）新增"供应商侧 Bridge"小节 | 与既有 Bridge/Adapter 模式图并列 |
| 10 | M11 Merchant Agent 与 HAI | human-agent-interaction.html（Ch.20）新增供应商侧控制点小节；identity.html（Ch.6）授权链示例增补 | AcceptancePolicy 作为授权书面化的示例 |
| 11 | M12 全链路演练 | scenarios.html（Ch.21）新增"供应商侧全链路"场景，或独立章与 Ch.24 并列互链 | 与 procurement-walkthrough.html 互为镜像的交叉引用 |
| 12 | 附录 MA/MB/MC/MD | 并入 UTP 规范附录 A（术语）/ B（错误码）/ Schema 索引（Ch.25 + 附录 D.8） | registries 三个注册表文件同步 |
| 13 | [回调事件注册表](onboarding.md#s-m261) | transport.html 《异步通信》 异步通信增补"供应商侧事件类型"表 | — |

> 整合原则重申：全部新增字段 OPTIONAL（向后兼容）；不改变任何既有 MUST/SHOULD/MAY 等级；不修改既有锚点 ID；MessageEnvelope 枚举扩展属于"只增不删"的兼容变更。

## 附录 MF：开放问题（Open Issues） {#s-mf}

| # | 问题 | 当前 RC 立场 | 待决策方 |
| --- | --- | --- | --- |
| 1 | Marketplace 进入 R2 核心角色集还是保持 R3 领域角色？ | 目标 R2（多数平台托管场景默认需要），过渡期 R3 试点 | RFC 治理流程（≥3 个独立实现方支持） |
| 2 | `fulfill.ship` 的既有不一致（ME 第 7 项） | **已解决**： UTP-B 规范已清除全部 `fulfill.ship` 残留，Ch.15 保持纯买方视角，发货动作统一由 `utp.delivery.ship` 承载 | 已闭环（保留备忘） |
| 3 | MP1 与 MP2 是否合并为单一原语？ | 保持分离（变更频率、授权粒度、限流特征差异大；见 MP 原语总表（Primitive Summary） 正交性检查） | 整合评审 |
| 4 | 多仓（`warehouse_id`）与区域库存的 Source 投影规则 | 本版仅预留字段，投影规则未定义（Experimental） | 后续版本 |
| 5 | 竞价商品（pricing L3）的供应商侧竞价管理动作 | 未覆盖（Listing 仅承载起拍价与截止时间） | 后续版本 |
| 6 | 逆向物流（退货执行）的供应商侧原语化 | 本版由 P6 CompensationOrder 驱动、实现层执行；不原语化 | 视 P6 演进 |
| 7 | Marketplace 联邦（一个供应商多平台分发）的目录同步标准 | 由供应商 Bridge 自行多路复用 MP 原语；不定义平台间同步 | 生态成熟后评估 |
| 8 | 履约卖家视角（妥投确认响应、拒收处理、逆向物流协同）扩展 MP5 还是独立原语？ | 2026-07-30 会议：M 侧目标六原语（四个 + 询盘 + 履约）；本规范立场为扩展 MP5（发货即履约的卖家半边，硬拆违反正交性），MP3 询盘响应已本版落地 | M 侧专项会 |
| 9 | 入驻（商家入驻）与结算（结算与对账）是否原语化？ | 2026-07-30 会议结论：均不原语化——入驻是准入基础设施（Profile 自指悖论），结算是协议事实的簿记视图；打款作为 P4 结算扩展内的平台驱动 Action 已补定义（[打款动作（Payout）](settlement.md#s-m99)） | 已裁决（M 侧专项会可复议） |
