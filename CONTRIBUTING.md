# 贡献指南

先读 [README](README.md) 和 [路线图](docs/05-roadmap.md)。这个项目对"加功能"的容忍度很低，对"打磨已有体验"的容忍度很高。

---

## 1. 开始之前

### 环境

| 依赖 | 版本 |
|---|---|
| Node.js | 22（见 `.nvmrc`） |
| pnpm | 9+（`corepack enable`） |
| JDK | 21 |
| Android SDK | Platform 35 |

```bash
git clone <repo>
cd unote
pnpm install
pnpm dev          # 浏览器调试（无原生能力）
pnpm android:run  # 真机 / 模拟器
```

### 真机优先

WebView 的行为在浏览器里和真机上差别很大（软键盘、返回键、壁纸渲染、性能）。**涉及编辑器和布局的改动，必须在真机上验证过再提 PR。**

---

## 2. 分支与提交

- `main` 受保护，只接受 PR。
- 分支名：`feat/wallpaper-blur`、`fix/save-on-back`、`docs/backup-format`。
- 提交信息遵循 [Conventional Commits](https://www.conventionalcommits.org/)：

```
feat(editor): 支持粘贴图片自动压缩
fix(backup): 导入时丢失置顶状态
docs(adr): 补充选择 IndexedDB 的理由
chore(deps): 升级 capacitor 到 7.x
```

- 一个 PR 只做一件事。混了格式化改动的 PR 会被要求拆开。

---

## 3. 代码规范

- TypeScript `strict` + `noUncheckedIndexedAccess`，不用 `any`（必要时用 `unknown` + 收窄）
- 组件用函数式 + hooks；不写 class 组件
- 样式：CSS Modules + `tokens.css` 里的变量，**禁止字面量颜色/圆角/间距**
- 业务逻辑放 `core/`，且**不允许** import `react`、`dexie`、`@capacitor/*`
- 提交前自动跑：`pnpm lint && pnpm typecheck && pnpm test`

目录职责见 [02-architecture.md](docs/02-architecture.md)。

---

## 4. 测试要求

| 改动 | 必须带的测试 |
|---|---|
| `core/` 下的纯函数 | 单元测试，覆盖边界（见 [03-data-backup.md §8](docs/03-data-backup.md#8-边界情况清单)） |
| 数据迁移 | 旧版本 fixture + 迁移后断言 |
| UI 交互 | 至少一个组件测试，覆盖"打开 → 操作 → 结果" |
| 纯样式改动 | 不需要测试，但需要截图 |

```bash
pnpm test          # 单元
pnpm test:watch
```

---

## 5. 设计改动

颜色、字体、圆角、动效曲线、图标风格——**先开 issue，附上对比图，不要直接提 PR**。

理由：这个项目的视觉是整体调过的，单点改动很容易破坏一致性。前端很便宜，审美很贵。

讨论时请用 [04-design-system.md](docs/04-design-system.md) 的 token 名说话（"把 `--r-md` 从 16 改到 14"比"圆角小一点"有效得多）。

---

## 6. 不接受的贡献

以下方向与产品定位冲突，PR 会被关闭（不是针对你）：

- 云同步、账号、多端
- 任何形式的网络请求（包括崩溃上报、字体 CDN）
- 埋点、使用统计
- AI 功能
- 引入 UI 组件库（见 [01-tech-stack.md §4.5](docs/01-tech-stack.md#45-为什么不用组件库)）
- 富文本 / 所见即所得编辑器（v1 范围内）

有不同意见，欢迎开 issue 辩论，但请先读完 [技术栈文档](docs/01-tech-stack.md) 里的论证。

---

## 7. PR 检查清单

复制到 PR 描述里：

```markdown
- [ ] 在真机上验证过（竖屏 + 横屏）
- [ ] 键盘弹起时输入区未被遮挡
- [ ] 没有新增网络请求 / 权限
- [ ] 新增样式只用 tokens.css 里的变量
- [ ] 补了对应测试
- [ ] 更新了 CHANGELOG 的 Unreleased 段
```

---

## 8. 提交信息之外的约定

- 文档用中文写，代码注释用英文（便于开源协作）。
- 面向用户的文案统一用"你"，不用"您"。
- 新增依赖需要在本 PR 里说明：为什么现有依赖不够用、体积增加多少。

---

## 9. 行为准则

参与本项目即表示同意遵守 [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)。
