---
title: UTP-M 供应商侧规范 · 目录总览
section: merchant
owner: merchant-team
status: review
version: 2026-07-30
format: html
---

<h1 id="s-utp-m-specification">UTP-M Specification — 2026-07-30（Draft）</h1>
    <h2 id="s-merchant-side">UTP 供应商侧规范（Merchant-Side Specification）— Release Candidate 1</h2>
    <blockquote>
      <p>本规范定义 UTP（Universal Trade Protocol）v1.0 的<strong>供应商侧能力</strong>：商品发布与上下架、库存管理、订单受理、发货执行、结算对账、ERP 集成与供应商 Agent。本规范是 UTP v1.0 的<strong>商家侧分册（Merchant-Side Volume）</strong>，与主规范（买方侧各章）共同构成同一部协议：MP 原语与 P1—P6 遵守同一 P0 原语框架，术语、错误码与 Schema 共用同一注册表体系。与主规范章节体系的对应关系及治理路线见<a href="appendices.html#s-me">附录 E</a>（资料性）。</p>
    </blockquote>

    <h2 id="s-positioning">定位与阅读方式</h2>
    <p>主规范 UTP 定义的六大交易原语（P1—P6）以采购方（Buyer）为主要发起方，回答"交易如何执行"。本规范回答其前置与对偶问题：<strong>商品从哪里来、订单如何被供应商受理与履行、货款如何回到供应商</strong>。二者合起来构成完整的商业闭环：</p>
<div class="diagram"><img src="/documentation/assets/diagrams/m-volume-map.svg" alt="商家侧分册与主规范的章节对偶：M2→L0 发现、MP1→P1、MP3↔P2 询盘、MP2/MP4↔P3、MP5→P5、M8←P4 打款" style="max-width: 100%; height: auto;"></div>
    <p>本规范所有原语遵守主规范 <a href="/documentation/specification/protocol-core/primitive-framework.html#s-1023-action-definition-format">10.2.3 操作定义格式</a>的角色绑定规则：每个 Action 恰好声明一个 <code>initiator_role</code> 与一个 <code>handler_role</code>。"UTP-M"仅是编辑与阅读上的分组名称，发现与协商流程 MUST NOT 据此推断角色方向。</p>

    <h2 id="s-toc-tables">章节目录</h2>
    <h3 id="s-part-0">导读</h3>
    <table>
      <thead><tr><th>页面</th><th>标题</th><th>内容概要</th></tr></thead>
      <tbody>
        <tr><td>Quickstart</td><td><a href="quickstart.html">供应商接入快速开始</a></td><td>非规范性导读：最小实现面（REST 客户端 + Webhook）、入驻→铺货→日常循环三阶段、Agent/Bridge 选型指引</td></tr>
      </tbody>
    </table>
    <h3 id="s-part-1">总纲</h3>
    <table>
      <thead><tr><th>章节</th><th>标题</th><th>内容概要</th></tr></thead>
      <tbody>
        <tr><td>M1</td><td><a href="overview.html">供应商侧架构总览</a></td><td>设计原则、角色模型（新增 Marketplace）、两种拓扑（平台托管/自托管）、MP 原语总表、商品—交易闭环、与主规范的衔接矩阵</td></tr>
        <tr><td>M2</td><td><a href="onboarding.html">入驻与能力声明</a></td><td>供应商入驻五步流程：身份与密钥、Profile 发布、Registry 登记、资质合规、回调登记与连通性验收</td></tr>
      </tbody>
    </table>
    <h3 id="s-part-2">供应商原语（MP 系列）</h3>
    <table>
      <thead><tr><th>章节</th><th>原语</th><th>原语 ID</th><th>方向</th><th>核心 Action</th></tr></thead>
      <tbody>
        <tr><td>M3</td><td><a href="primitives/listing/index.html">MP1 商品管理</a></td><td><code>utp.listing</code></td><td>Seller → Marketplace</td><td><code>publish</code>, <code>update</code>, <code>list</code>, <code>delist</code>, <code>query</code>, <code>archive</code>, <code>batch</code></td></tr>
        <tr><td>M4</td><td><a href="primitives/inventory/index.html">MP2 库存管理</a></td><td><code>utp.inventory</code></td><td>Seller → Marketplace</td><td><code>set</code>, <code>adjust</code>, <code>query</code>, <code>hold.query</code>, <code>batch</code></td></tr>
        <tr><td>M5</td><td><a href="primitives/quote/index.html">MP3 询盘响应（草案新增）</a></td><td><code>utp.quote</code></td><td>Seller → Marketplace</td><td><code>quote, revise, bid, decline, query, list</code></td></tr>
        <tr><td>M6</td><td><a href="primitives/acceptance/index.html">MP4 订单受理</a></td><td><code>utp.acceptance</code></td><td>Seller → Marketplace</td><td><code>accept</code>, <code>reject</code>, <code>hold</code>, <code>amend_leadtime</code>, <code>query</code>, <code>list</code></td></tr>
        <tr><td>M7</td><td><a href="primitives/delivery/index.html">MP5 交付原语</a></td><td><code>utp.delivery</code></td><td>Seller → Marketplace</td><td><code>prepare</code>, <code>ship</code>, <code>split</code>, <code>update</code>, <code>query</code></td></tr>
        <tr><td>M8</td><td><a href="primitives/aftersale/index.html">MP6 售后原语</a></td><td><code>utp.aftersale</code></td><td>Seller → Marketplace</td><td><code>approve</code>, <code>reject</code>, <code>propose</code>, <code>confirm_return</code>, <code>query</code>, <code>list</code></td></tr>
      </tbody>
    </table>
    <h3 id="s-part-3">经营与集成</h3>
    <table>
      <thead><tr><th>章节</th><th>标题</th><th>内容概要</th></tr></thead>
      <tbody>
        <tr><td>M8</td><td><a href="settlement.html">结算与对账</a></td><td>结算模型（佣金/分账/回款周期）、只读扩展 <code>utp.pay.settlement</code>（账单列表/明细/差异申报）、对账闭环</td></tr>
        <tr><td>M9</td><td><a href="erp-bridge.html">ERP 集成与 Bridge</a></td><td>Bridge 部署形态、ID 映射规范、上行/下行同步模式、库存防超卖、幂等与容错、对账钩子</td></tr>
        <tr><td>M10</td><td><a href="merchant-agent.html">供应商 Agent 与人机协同</a></td><td>Merchant Agent 职责边界、自动接单/报价策略（AcceptancePolicy）、HAI 控制点与挂起语义衔接、Agent 授权</td></tr>
      </tbody>
    </table>
    <h3 id="s-part-4">场景与整合</h3>
    <table>
      <thead><tr><th>章节</th><th>标题</th><th>内容概要</th></tr></thead>
      <tbody>
        <tr><td>M11</td><td><a href="walkthrough.html">供应商全链路演练</a></td><td>入驻 → 发布 → 上架 → 被寻源 → 接单 → 发货 → 结算的端到端 JSON 序列演练，与买方视角对照</td></tr>
        <tr><td>附录</td><td><a href="appendices.html">附录</a></td><td>MA 术语表、MB 错误码总表、MC Scope 总表、MD Schema 索引、ME 章节对应与整合路线、MF 开放问题</td></tr>
      </tbody>
    </table>

    <h2 id="s-conventions">编辑约定</h2>
    <ul>
      <li>本规范沿用主规范 README 第 4 节的全部行文规范：RFC 2119 关键词、实体四列表格（字段名/类型/必填/描述）、<code>snake_case</code> 字段、JSON 示例与实体定义严格一致。</li>
      <li>章节编号使用 <code>M{n}</code> 前缀，小节使用 <code>M{n}.{x}</code>；锚点格式 <code>id="s-m{编号去点}"</code>，如 <code>s-m31</code>、<code>s-m311</code>，避免与主规范 <code>s-*</code> 冲突。</li>
      <li>凡引用主规范内容，一律使用相对链接 <code>../{file}.html#s-xxx</code> 并注明章节号；本规范 MUST NOT 复制主规范定义，只做引用。</li>
      <li>与主规范章节体系的对应关系与联动清单以<a href="appendices.html#s-me">附录 E</a>为准（资料性）。</li>
    </ul>

    <h2 id="s-stability">稳定性分级承诺（Stability Levels）</h2>
    <p>本规范以 RC（Release Candidate）状态发布，对实现方按三级做出稳定性承诺：</p>
    <table>
      <thead><tr><th>级别</th><th>范围</th><th>承诺</th></tr></thead>
      <tbody>
        <tr><td><strong>Stable</strong></td><td>MP1、MP2、MP4、MP5（商品/库存/接单/交付）操作集与 REST 路径、请求/响应 Schema、资源状态机、错误码、回调事件、签名规则（JCS+SHA-256+JWS ES256）、幂等契约、批量协议、五步入驻流程（MP3 询盘响应为 2026-07-30 草案新增，暂列 Experimental，不在本行承诺内）</td><td>正式版 MUST NOT 做破坏性变更；新增字段一律 OPTIONAL；SDK 可直接按本版本实现</td></tr>
        <tr><td><strong>Stable-with-dependency</strong></td><td>Profile 结构（随主规范 3.3）、MessageEnvelope、Mode 超时配置、MP4↔P3 / MP5↔P5 / MP6↔P6 衔接引用</td><td>自身语义稳定；若主规范对应章节变更，本规范同步修订引用（不改变本侧行为）</td></tr>
        <tr><td>MP3 报价原语与 MP6 售后原语（本轮新增，实现方反馈后可能调整字段与状态命名）；<MP3 报价原语与 MP6 售后原语（本轮新增，实现方反馈后可能调整字段与状态命名）；sMP3 报价原语与 MP6 售后原语（本轮新增，实现方反馈后可能调整字段与状态命名）；tMP3 报价原语与 MP6 售后原语（本轮新增，实现方反馈后可能调整字段与状态命名）；rMP3 报价原语与 MP6 售后原语（本轮新增，实现方反馈后可能调整字段与状态命名）；oMP3 报价原语与 MP6 售后原语（本轮新增，实现方反馈后可能调整字段与状态命名）；nMP3 报价原语与 MP6 售后原语（本轮新增，实现方反馈后可能调整字段与状态命名）；gMP3 报价原语与 MP6 售后原语（本轮新增，实现方反馈后可能调整字段与状态命名）；>MP3 报价原语与 MP6 售后原语（本轮新增，实现方反馈后可能调整字段与状态命名）；EMP3 报价原语与 MP6 售后原语（本轮新增，实现方反馈后可能调整字段与状态命名）；xMP3 报价原语与 MP6 售后原语（本轮新增，实现方反馈后可能调整字段与状态命名）；pMP3 报价原语与 MP6 售后原语（本轮新增，实现方反馈后可能调整字段与状态命名）；eMP3 报价原语与 MP6 售后原语（本轮新增，实现方反馈后可能调整字段与状态命名）；rMP3 报价原语与 MP6 售后原语（本轮新增，实现方反馈后可能调整字段与状态命名）；iMP3 报价原语与 MP6 售后原语（本轮新增，实现方反馈后可能调整字段与状态命名）；mMP3 报价原语与 MP6 售后原语（本轮新增，实现方反馈后可能调整字段与状态命名）；eMP3 报价原语与 MP6 售后原语（本轮新增，实现方反馈后可能调整字段与状态命名）；nMP3 报价原语与 MP6 售后原语（本轮新增，实现方反馈后可能调整字段与状态命名）；tMP3 报价原语与 MP6 售后原语（本轮新增，实现方反馈后可能调整字段与状态命名）；aMP3 报价原语与 MP6 售后原语（本轮新增，实现方反馈后可能调整字段与状态命名）；lMP3 报价原语与 MP6 售后原语（本轮新增，实现方反馈后可能调整字段与状态命名）；<MP3 报价原语与 MP6 售后原语（本轮新增，实现方反馈后可能调整字段与状态命名）；/MP3 报价原语与 MP6 售后原语（本轮新增，实现方反馈后可能调整字段与状态命名）；sMP3 报价原语与 MP6 售后原语（本轮新增，实现方反馈后可能调整字段与状态命名）；tMP3 报价原语与 MP6 售后原语（本轮新增，实现方反馈后可能调整字段与状态命名）；rMP3 报价原语与 MP6 售后原语（本轮新增，实现方反馈后可能调整字段与状态命名）；oMP3 报价原语与 MP6 售后原语（本轮新增，实现方反馈后可能调整字段与状态命名）；nMP3 报价原语与 MP6 售后原语（本轮新增，实现方反馈后可能调整字段与状态命名）；gMP3 报价原语与 MP6 售后原语（本轮新增，实现方反馈后可能调整字段与状态命名）；>MP3 报价原语与 MP6 售后原语（本轮新增，实现方反馈后可能调整字段与状态命名）；<MP3 报价原语与 MP6 售后原语（本轮新增，实现方反馈后可能调整字段与状态命名）；/MP3 报价原语与 MP6 售后原语（本轮新增，实现方反馈后可能调整字段与状态命名）；tMP3 报价原语与 MP6 售后原语（本轮新增，实现方反馈后可能调整字段与状态命名）；dMP3 报价原语与 MP6 售后原语（本轮新增，实现方反馈后可能调整字段与状态命名）；>MP3 报价原语与 MP6 售后原语（本轮新增，实现方反馈后可能调整字段与状态命名）；<MP3 报价原语与 MP6 售后原语（本轮新增，实现方反馈后可能调整字段与状态命名）；tMP3 报价原语与 MP6 售后原语（本轮新增，实现方反馈后可能调整字段与状态命名）；dMP3 报价原语与 MP6 售后原语（本轮新增，实现方反馈后可能调整字段与状态命名）；>MP3 报价原语与 MP6 售后原语（本轮新增，实现方反馈后可能调整字段与状态命名）；<code>utp.pay.settlement</code> 扩展、<code>delegation_policy</code> 透传模式（询盘/争议）、AI 辅助录入 <code>source_materials</code>、多仓库存投影</td><td>MAY 在后续版本调整；生产依赖前应跟踪附录 MF 开放问题</td></tr>
      </tbody>
    </table>

    <h2 id="s-doc-meta">文档信息</h2>
    <ul>
      <li><strong>版本：</strong> 2026-07-30（日期版本，Draft；按上述稳定性分级承诺发布，稳定后随主规范按季度发布正式版）</li>
      <li><strong>基础：</strong> UTP Protocol Specification v1.0（2026-07-03）</li>
      <li><strong>原语版本基线：</strong> 2026-07-01（与主规范 P1—P6 对齐）</li>
      <li><strong>状态：</strong> Release Candidate——Stable 面冻结；转正式版前待办：Marketplace 角色 RFC 流程（附录 ME 第 2 项）与主规范引用冻结点后的一致性复扫</li>
      <li><strong>机读契约：</strong> 实体 Schema、原语定义文件与状态机见<a href="appendices.html#s-md">附录 MD</a>；一致性校验工具（validate_schemas / test_fixtures）随本规范同源发布</li>
    </ul>
