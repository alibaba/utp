---
title: UTP 规范总览 — Universal Trade Protocol
section: specification
owner: documentation-editor
status: drafting
version: 2026-07-28
# 存量页面迁移：正文为 HTML 原样嵌入；后续编写新内容时可改为纯 Markdown（去掉 format 行）
format: html
---

<h1>Universal Trade Protocol Specification</h1>
          <p class="lead">UTP 将跨平台交易拆解为可组合、可协商、可审计的 P0–P6 原语，使人、Agent、交易平台和履约系统能够使用一致语义协作。</p>
          <p class="draft-note">本规范当前处于 Draft。首页和 P0 已形成首版规则，其余页面的骨架不具备规范效力。</p>

          <h2 id="purpose">协议目标</h2>
          <p>UTP 提供交易参与方之间的公共语言，覆盖发现、询盘、订购、支付、履约和争议解决。协议重点定义可观察行为、状态、消息与责任边界，不限定参与方的内部业务实现。</p>
          <div class="card-grid">
            <div class="card"><strong>可组合</strong><br><small>按业务需要组合原语，不要求所有场景执行同一条固定链路。</small></div>
            <div class="card"><strong>传输无关</strong><br><small>原语语义独立于 REST、MCP、A2A 和 Embedded 映射。</small></div>
            <div class="card"><strong>Agent 友好</strong><br><small>状态、错误、下一步动作和人工确认点可被结构化理解。</small></div>
            <div class="card"><strong>可治理</strong><br><small>日期版本、负责人、评审状态和机器契约具有明确发布边界。</small></div>
          </div>

          <h2 id="participants">参与方</h2>
          <table>
            <thead><tr><th>角色</th><th>职责</th></tr></thead>
            <tbody>
              <tr><td>Buyer / Buyer Agent</td><td>表达交易意图、提供必要信息并在授权边界内确认决策。</td></tr>
              <tr><td>Seller / Seller Agent</td><td>提供商品、报价、订单、履约与售后信息。</td></tr>
              <tr><td>Platform</td><td>发现参与方、编排原语、传递上下文并保持协议状态一致。</td></tr>
              <tr><td>Service Provider</td><td>在支付、物流、认证、争议处理等环节提供专业服务。</td></tr>
            </tbody>
          </table>

          <h2 id="primitive-map">P0–P6 原语地图</h2>
          <div class="primitive-grid">
            <a class="primitive-card" href="/documentation/specification/protocol-core/primitive-framework.html"><span class="primitive-id">P0</span><strong>Primitive Commons</strong><small>所有原语共享的信封、状态、错误和安全规则。</small></a>
            <a class="primitive-card" href="/documentation/specification/primitives/source/index.html"><span class="primitive-id">P1</span><strong>Source 寻源</strong><small>发现商品、供应商、服务和可交易资源。</small></a>
            <a class="primitive-card" href="/documentation/specification/primitives/negotiate/index.html"><span class="primitive-id">P2</span><strong>Negotiate 询盘</strong><small>询价、报价、还价与条款确认。</small></a>
            <a class="primitive-card" href="/documentation/specification/primitives/purchase/index.html"><span class="primitive-id">P3</span><strong>Purchase 订购</strong><small>形成购买承诺并提交交易意图。</small></a>
            <a class="primitive-card" href="/documentation/specification/primitives/pay/index.html"><span class="primitive-id">P4</span><strong>Pay 支付</strong><small>建立、确认和追踪资金处理。</small></a>
            <a class="primitive-card" href="/documentation/specification/primitives/fulfill/index.html"><span class="primitive-id">P5</span><strong>Fulfill 履约</strong><small>准备、交付、跟踪、验收与收货。</small></a>
            <a class="primitive-card" href="/documentation/specification/primitives/resolve/index.html"><span class="primitive-id">P6</span><strong>Resolve 争议解决</strong><small>发起、协商、裁决与补偿争议。</small></a>
          </div>

          <h2 id="composition">原语组合</h2>
          <p>典型交易可以按以下顺序执行，但每个场景可以依据模式、拓扑和参与方声明跳过或重复部分原语：</p>
          <div class="flow" aria-label="典型交易原语顺序">
            <span>P1 寻源</span><b>→</b><span>P2 询盘</span><b>→</b><span>P3 订购</span><b>→</b><span>P4 支付</span><b>→</b><span>P5 履约</span><b>→</b><span>P6 解决</span>
          </div>
          <p>跨原语一致性由全局状态机和编排规则约束。</p>

          <h2 id="reading-path">阅读路径</h2>
          <ol>
            <li>先阅读 P0，理解所有原语共享的公共规则。</li>
            <li>根据业务角色进入一个或多个 P1–P6 原语。</li>
            <li>实现具体协议时阅读对应传输绑定。</li>
            <li>涉及跨环节流程时阅读全局状态机与 Agent/人机协同规则。</li>
            <li>最后使用 Reference、Schema 和服务契约完成一致性核对。</li>
          </ol>
