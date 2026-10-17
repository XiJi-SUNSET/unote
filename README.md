<div align="center">

# Unote

**无纸化学习的课堂速记本。**

不联网 · 不注册 · 不上传 · 一个 APK 就够

![Platform](https://img.shields.io/badge/platform-Android%208.0%2B-3DDC84?logo=android&logoColor=white)
![License](https://img.shields.io/badge/license-MIT-blue)
![Status](https://img.shields.io/badge/status-design%20phase-orange)
![Network](https://img.shields.io/badge/runtime%20network-none-critical)

</div>

---

## 这是什么

上课时脑子里冒出来的问题、老师随口给的答案、突然想记的一句话——它们只活十几秒。

纸质笔记本太重，通用笔记软件太吵。**Unote** 只做一件事：**在你还有记忆的那 5 秒里，把东西接住。**

名字读作 *you-note*，也可以是 *un-note*——不是本子，但记得住。

## 为什么不是别的笔记软件

| | 纸质笔记 | 通用笔记 App | Unote |
|---|---|---|---|
| 打开就能写 | 要掏本子 | 启动 → 找入口 → 点"新建" | 启动即光标 |
| 功能面 | 没有 | 双链、AI、看板、云同步…… | 只有写、看、找 |
| 联网 | 不需要 | 常常默认要 | 安装包里没有网络权限 |
| 数据归属 | 你的本子 | 厂商的服务器 | 你的 ZIP 文件 |

## 功能（v1）

- **秒开即写** — 冷启动直接回到上一篇，光标在末尾
- **Markdown** — 标题、列表、引用、代码、粗斜体、分割线；编辑/预览切换
- **图片** — 相册选图 / 相机拍摄 / 剪贴板粘贴，自动压缩为 WebP 后内嵌
- **按课程分组** — 每篇笔记归属一门课，课程内按时间倒序；新建时默认落在上次用的课
- **搜索与标签** — 全文检索、按标签筛选、置顶
- **壁纸** — 全局一张，自动提取主色调并切换明暗前景
- **横竖屏** — 竖屏单栏沉浸，横屏左右分栏（列表 + 编辑）
- **ZIP 备份** — 一键导出 `notes/*.md + assets/*.webp + manifest.json`，可导入另一台设备

## 明确不做

这些不是"以后再说"，是**设计上的拒绝**，用来保护上面的 5 秒：

- 账号、云同步、多端漫游
- AI 摘要、智能问答
- 协作、分享链接、在线发布
- 富文本所见即所得（WYSIWYG）编辑器
- 任何形式的埋点、统计、崩溃上报

## 技术栈

Android 原生壳（Capacitor）+ React + TypeScript，数据全部落在本机 IndexedDB，图片以 Blob 内嵌，导出走 Web Worker。

- 完整选型与论证：[docs/01-tech-stack.md](docs/01-tech-stack.md)
- 模块与数据流：[docs/02-architecture.md](docs/02-architecture.md)
- 数据模型与备份格式：[docs/03-data-backup.md](docs/03-data-backup.md)
- 视觉与交互规范：[docs/04-design-system.md](docs/04-design-system.md)
- 里程碑：[docs/05-roadmap.md](docs/05-roadmap.md)
- 交互规格（学自 Exterior，已按轻量 APK 裁剪）：[docs/07-interaction-spec.md](docs/07-interaction-spec.md)

## 目录结构

```
unote/
├── docs/                  设计文档（当前阶段的主要产出）
│   ├── adr/               架构决策记录
│   └── design/            视觉参考、原型图
├── .github/               Issue / PR 模板
├── AGENTS.md              给 AI 代理与贡献者的红线清单
├── README.md
├── CONTRIBUTING.md
├── CHANGELOG.md
└── SECURITY.md
```

M0 落地后会追加 `src/`、`android/`、`package.json` 等工程目录，届时更新此图。

## 开发环境（M0 起）

| 依赖 | 版本 |
|---|---|
| Node.js | 22 LTS |
| pnpm | 9+（`corepack enable`） |
| JDK | 21 |
| Android SDK | Platform 35 / Build-Tools 35 |
| Gradle | 随 Capacitor 模板 |

```bash
pnpm install
pnpm dev          # 浏览器预览（无原生能力）
pnpm test         # 单元 + 集成测试
pnpm android:sync # 构建 web 产物并同步进 Android 工程
pnpm android:open # 用 Android Studio 打开原生工程
```

APK 由 GitHub Actions 构建（`.github/workflows/android.yml`）：推 `v*` tag 时自动出包并挂到 Release；也可以在 Actions 页手动触发。

## 路线图

- [x] **M0-设计** 仓库骨架、技术选型、数据格式
- [ ] **M1-闭环** 列表 / 编辑 / 保存 / 预览 / 插图
- [ ] **M2-审美** 壁纸、主题、排版、横屏、动效
- [ ] **M3-数据** 搜索、标签、ZIP 导入导出、自动快照
- [ ] **M4-发布** 签名、GitHub Release、开源首发

详见 [docs/05-roadmap.md](docs/05-roadmap.md)。

## 没有网络的保证

不是"我们没有上传"，是**它根本没有联网的能力**：

1. Release 的 `AndroidManifest.xml` 不含 `android.permission.INTERNET`；
2. CI 对合并后的清单做断言，一旦有人加回来就红灯；
3. 页面 CSP 限定 `default-src 'self'`，运行时 `fetch()` 到外部域名会被直接拦截。

## 参与贡献

欢迎 issue 与 PR。开始之前请读 [CONTRIBUTING.md](CONTRIBUTING.md)。
设计上的改动（颜色、字体、圆角、动效曲线）请先开 issue 讨论，不要直接提 PR——这个项目的护城河就是克制。

## 许可证

[MIT](LICENSE)。拿去改，拿去用，别做成需要登录的版本。

---

<details>
<summary>English</summary>

**Unote** is a deliberately small, offline-first markdown notebook for Android, built for students who study without paper and still need to catch an idea in five seconds.

Fast capture, markdown + inline images, wallpaper theming, portrait/landscape layouts, and a portable ZIP backup (`notes/*.md` + `assets/`). No account, no sync, no telemetry — the release manifest does not even request the `INTERNET` permission.

Built with Capacitor + React + TypeScript; data lives in local IndexedDB, images are stored as Blobs, export runs in a Web Worker.

</details>
