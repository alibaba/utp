# UTP 规范协作指南

规范正文以 Markdown 编写，源码位于 `docs-src/specification/`；本目录（`docs-src/authoring/`）存放开发者指南与工具（模板、评审清单、治理文件、校验脚本），不参与发布。构建产物由 `scripts/build-docs.mjs` 生成到 `public/documentation/`（不进 git）。贡献者只修改自己负责的章节目录；共享导航、模板、样式、脚本和发布记录由文档站维护者管理。

## 内容状态

页面通过 front-matter 的 `status` 字段（渲染为 `utp-status` 元数据）在以下状态间流转：

`skeleton → drafting → review → approved → published`

- `skeleton`：页面结构已建立，正文尚不具备规范效力。
- `drafting`：负责人正在编写。
- `review`：内容完整，等待必需评审。
- `approved`：语义、接口和安全要求已通过评审。
- `published`：已纳入正式日期版本。

## 编写规则

1. 新建页面在 `docs-src/specification/` 对应章节目录下编写 Markdown，front-matter 声明 `title/section/owner/status/version`；结构参考 `docs-src/authoring/templates/` 中对应页面类型的骨架。
2. 一个变更只处理一个原语或一个公共主题。
3. UTP 的 P0–P8 统一称为“原语（Primitive）”。
4. MUST、MUST NOT、SHOULD、SHOULD NOT 和 MAY 按 RFC 2119/8174 使用。
5. 未定义的 Draft 内容必须明确写明“不具备规范效力”，不得留下空白、TODO 或 TBD。
6. 原语正文定义语义；传输页面只负责映射，不重新定义语义。
7. 带章节编号的标题，锚点 id 必须将编号中的点号逐级换为连字符：`19.1 → {#s-19-1}`、`19.1.1 → {#s-19-1-1}`、`19.11 → {#s-19-11}`；禁止去掉点号直接拼接（如 19.1.1 写成 `s-1911`，会与 19.11 冲突）；附录编号同理（`H.5 → {#s-h-5}`）。
8. 图表（SVG）引用写法：文件放入 `docs-src/assets/diagrams/`，正文中用 Markdown 图片语法 + 站点绝对路径引用，alt 文本必须完整描述图中信息（无障碍与 SEO）：

   ```markdown
   ![Escrow 托管资金流转：采购方付款进托管方，验收通过后释放资金给供应商。](/documentation/assets/diagrams/escrow-flow.svg)
   ```

   约束：路径必须以 `/documentation/assets/diagrams/` 开头（本地预览直接可用，云构建时自动改写为完整 CDN 地址）；禁止相对路径（`../assets/...`）与外部图床；SVG 根元素应声明 `viewBox`（不写死 `width/height`），以适配正文区 `max-width: 100%` 的自适应缩放；需要图题时改用内联 `<figure>` + `<figcaption>`（见 `templates/protocol-chapter.md` 图片区示例）。
9. 页面进入 `review` 前先执行 `npm run docs:build`，再执行 `node docs-src/authoring/tests/validate-site.mjs`（会校验图片引用目标文件存在性，死链直接报错）。

## 章节负责人填充流程

1. 规范维护者先在 `OWNERS.yaml` 中确认章节 owner 和必需 reviewers；没有明确 owner 的章节不得进入 `drafting`。
2. 负责人参照 `docs-src/authoring/templates/` 中对应页面类型的章节骨架，在 Markdown 中按相同标题结构编写正文；页面外壳（导航、面包屑、目录等）由构建脚本统一生成，不需手写。
3. 将 front-matter 的 `status` 从 `skeleton` 更新为 `drafting`，按模板标题逐节补全。暂未定义的部分必须保留“不具备规范效力”的明确声明。
4. 若新增或移动页面，负责人同步更新 `manifest.json` 的完整 `pages` 注册表；只有需要出现在两级左侧导航中的页面才加入 `navigation`。不得手工复制侧边栏或前后页链接。
5. 负责人完成自查和静态验证后，将状态更新为 `review`，并按变更内容附上 `review-checklists/` 中适用的检查清单。
6. `OWNERS.yaml` 中的必需 reviewers 逐项确认。跨原语、安全、身份、支付或共享资产变更必须包含对应领域评审人。
7. 规范维护者确认评审记录、版本、导航和机器契约边界后，更新为 `approved`；只有纳入日期版本并记录到 `CHANGELOG.md` 后才能标记 `published`。

推荐每位负责人只提交自己章节目录的正文变更。`docs-src/specification/manifest.json`、`docs-src/assets/` 与本目录（`CHANGELOG.md`、`templates/`、检查清单等）属于共享文件，由规范维护者合并或协调修改。

协议核心集中维护在 `docs-src/specification/core/index.md`。架构、发现与协商、身份与信任、模式与拓扑、传输、安全和版本内容不得再拆分为独立 Core 页面。

## 评审和发布

负责人根据 `OWNERS.yaml` 邀请评审。涉及跨原语规则、安全、身份或支付时，必须获得对应领域评审。规范维护者完成发布检查后更新页面状态和 `CHANGELOG.md`。
