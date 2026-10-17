# AGENTS.md

给在这个仓库里工作的 AI 代理（以及新加入的贡献者）的约束说明。**动手前先读完。**

## 产品红线

Unote 是一个 **Android 单机、完全离线**的课堂速记应用。以下改动一律不接受：

- 任何网络请求、账号体系、云同步、崩溃上报、埋点
- 富文本 / WYSIWYG 编辑器
- 引入 UI 组件库（见 [docs/01](docs/01-tech-stack.md) §4.5）
- 给 release 清单加 `INTERNET` 权限
- 在 UI 里弹"欢迎引导""评分我们"之类的打扰

理由记录在 [README](README.md)「明确不做」和 [ADR-0003](docs/adr/0003-no-sync-no-account.md)。

## 架构红线

```
UI (screens/components) → 应用层 (stores) → 领域层 (core) → 基础设施 (infra)
```

- `src/core/**` **不得** import `react`、`dexie`、`@capacitor/*`。它只依赖 `core/ports.ts` 定义的接口。ESLint 会拦。
- 组件不得直接访问数据库，只能通过 store 或 repo。
- 样式不得出现字面量颜色、圆角、间距，只能用 `src/styles/tokens.css` 里的变量。
- 新增依赖前必须说明：现有依赖为什么不够用、体积增加多少。

## 数据红线

- 正文只存在 `body` 字段，图片引用统一写成 `![alt](asset:<id>)`，**不出现文件路径**。
- `id` 生成后永不变更，导入去重依赖它。
- 备份包格式见 [docs/03](docs/03-data-backup.md)，`formatVersion` 只增不改。
- 任何 schema 迁移必须先写快照，再迁移。

## 常用命令

```bash
pnpm dev           # 浏览器调试（无原生能力）
pnpm test          # 单元测试
pnpm e2e           # Playwright（M1 起）
pnpm android:run   # 真机 / 模拟器
pnpm lint && pnpm typecheck
```

## 提交前自检

- [ ] 没有新增网络请求或权限
- [ ] 真机竖屏 + 横屏都试过
- [ ] 键盘弹起时输入区没被挡住
- [ ] 样式只用了 token 变量
- [ ] 补了测试；改了 CHANGELOG 的 Unreleased

## 文档地图

| 要改什么 | 先读 |
|---|---|
| 技术选型 | [docs/01-tech-stack.md](docs/01-tech-stack.md) |
| 分层与流程 | [docs/02-architecture.md](docs/02-architecture.md) |
| 数据与备份 | [docs/03-data-backup.md](docs/03-data-backup.md) |
| 视觉与交互 | [docs/04-design-system.md](docs/04-design-system.md) |
| 排期 | [docs/05-roadmap.md](docs/05-roadmap.md) |
| 为什么这么定 | [docs/adr/](docs/adr/) |
