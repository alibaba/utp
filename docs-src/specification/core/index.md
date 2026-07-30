---
title: UTP 协议核心
section: core
owner: protocol-architecture
status: skeleton
version: 2026-07-28
# 存量页面迁移：正文为 HTML 原样嵌入；后续编写新内容时可改为纯 Markdown（去掉 format 行）
format: html
---

<h1>UTP 协议核心</h1>
          <p class="draft-note">当前 Draft 的协议核心仍是结构骨架；以下未进入评审的章节不得作为实现依据。</p>

          <h2 id="normative-language">规范性语言</h2>
          <p>本节预留规范性关键词的解释入口；在相关要求完成评审前，本页不新增协议约束。</p>

          <h2 id="architecture-roles">架构与参与方</h2>
          <h3 id="architecture-scope">范围</h3>
          <p>本节将定义协议边界、参与方、逻辑层次及原语和编排之间的关系。</p>
          <h3 id="participants">参与方</h3>
          <p>本节将区分买方、卖方、Agent、平台和专业服务提供方的职责。</p>
          <h3 id="protocol-layers">协议层次</h3>
          <p>本节将说明发现、信任、原语语义、传输映射和跨原语编排的依赖方向。</p>
          <h3 id="design-boundaries">设计边界</h3>
          <p>本节将明确 UTP 定义的可观察行为以及实现方保留的内部自由。</p>

          <h2 id="discovery-governance-negotiation">发现、治理与协商</h2>
          <h3 id="discovery-entry">发现入口</h3>
          <p>本节将定义参与方如何发布可访问的协议描述和服务端点。</p>
          <h3 id="primitive-declaration">原语声明</h3>
          <p>本节将定义 P0–P6、版本、传输、作用域和扩展信息的声明结构。</p>
          <h3 id="session-negotiation">协商流程</h3>
          <p>本节将定义双方如何选择共同支持的原语版本、模式和传输。</p>
          <h3 id="negotiation-failure">失败处理</h3>
          <p>本节将定义版本不兼容、无共同原语和声明失效时的处理。</p>
          <h3 id="mode-governance">治理</h3>
          <p>本节将定义新增维度、角色和连接关系的治理边界。</p>

          <h2 id="identity-trust">身份与信任</h2>
          <h3 id="identity-model">身份模型</h3>
          <p>本节将区分组织、用户、Agent、服务和密钥身份。</p>
          <h3 id="authentication">认证</h3>
          <p>本节将定义参与方和消息来源的认证要求。</p>
          <h3 id="authorization-delegation">授权与委托</h3>
          <p>本节将定义作用域、委托链、人工确认和权限收回。</p>
          <h3 id="evidence">证据</h3>
          <p>本节将定义关键决策、交易承诺和争议材料的可验证记录。</p>

          <h2 id="modes-topology">交易模式与拓扑</h2>
          <h3 id="transaction-modes">交易模式</h3>
          <p>本节将定义影响原语选择、人工参与和决策路径的模式维度。</p>
          <h3 id="commercial-topology">商业拓扑</h3>
          <p>本节将定义多平台、多角色和多服务参与时的关系表示。</p>
          <h3 id="mode-topology-negotiation">协商</h3>
          <p>本节将定义模式与拓扑声明如何进入会话协商。</p>

          <h2 id="transport-layer">传输层</h2>
          <h3 id="mapping-principles">映射原则</h3>
          <p>本节将定义原语语义与 REST、MCP、A2A、Embedded 映射之间的边界。</p>
          <h3 id="envelope-mapping">信封映射</h3>
          <p>本节将定义 P0 信封在不同传输中的承载方式。</p>
          <h3 id="transport-errors">状态和错误</h3>
          <p>本节将定义传输状态与业务结果之间的映射。</p>
          <h3 id="transport-security">安全</h3>
          <p>本节将定义加密、认证、消息完整性和重放防护的公共要求。</p>

          <h2 id="standard-primitives">标准原语</h2>
          <table>
            <thead><tr><th>编号</th><th>原语</th><th>规范入口</th></tr></thead>
            <tbody>
              <tr><td>P0</td><td>公共框架</td><td><a href="/documentation/specification/protocol-core/primitive-framework.html">概览</a></td></tr>
              <tr><td>P1</td><td>寻源</td><td><a href="/documentation/specification/primitives/source/index.html">概览</a></td></tr>
              <tr><td>P2</td><td>询盘</td><td><a href="/documentation/specification/primitives/negotiate/index.html">概览</a></td></tr>
              <tr><td>P3</td><td>订购</td><td><a href="/documentation/specification/primitives/purchase/index.html">概览</a></td></tr>
              <tr><td>P4</td><td>支付</td><td><a href="/documentation/specification/primitives/pay/index.html">概览</a></td></tr>
              <tr><td>P5</td><td>履约</td><td><a href="/documentation/specification/primitives/fulfill/index.html">概览</a></td></tr>
              <tr><td>P6</td><td>争议解决</td><td><a href="/documentation/specification/primitives/resolve/index.html">概览</a></td></tr>
            </tbody>
          </table>

          <h2 id="security">安全</h2>
          <h3 id="security-baseline">安全基线</h3>
          <p>本节将定义传输安全、消息完整性、最小权限和敏感数据要求。</p>

          <h2 id="versioning-compatibility">版本与兼容性</h2>
          <h3 id="date-version">日期版本</h3>
          <p>本节将定义 <code>YYYY-MM-DD</code> 版本格式及协议与原语的版本关系。</p>
          <h3 id="compatibility">兼容性</h3>
          <p>本节将区分兼容变更、破坏性变更和协商失败。</p>
          <h3 id="release-lifecycle">发布生命周期</h3>
          <p>本节将定义 Draft、Approved、Published 和废弃状态的进入条件。</p>

          <h2 id="glossary">术语入口</h2>
          <p>稳定术语集中维护在<a href="/documentation/specification/reference/glossary.html">术语表</a>。</p>
