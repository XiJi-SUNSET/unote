# 技术栈设计

> 状态：Proposed（待确认）
> 决策记录：[ADR-0001](adr/0001-capacitor-webview-shell.md) · [ADR-0002](adr/0002-indexeddb-as-primary-store.md)
> 最后更新：2026-10-17

---

## 0. 结论先行

| 层 | 选择 | 一句话理由 |
|---|---|---|
| 壳 | **Capacitor 7+ / Android 原生工程** | 只要 Android，但保留 Web 的审美迭代速度 |
| 语言 | **TypeScript（strict）** | 复用你已有的 React 能力，零学习成本 |
| 框架 | **React 19 + Vite** | 生态最熟，构建最快 |
| 样式 | **CSS 变量 Token + CSS Modules** | 零运行时，断网友好，样式可读 |
| 状态 | **Zustand** | 3KB，够用，不引入概念税 |
| 存储 | **IndexedDB（Dexie）** | 零原生插件，事务 + Blob，一次到位 |
| 图片 | **Canvas 压缩 → WebP Blob → IndexedDB** | 不碰原生文件系统，路径问题整类消失 |
| 编辑器 | **`<textarea>` + 预览切换** | 中文 IME 唯一稳妥的方案 |
| 渲染 | **markdown-it + DOMPurify** | 本地执行，无 CDN |
| 导出 | **fflate（Web Worker）→ Filesystem → Share** | 大包不卡 UI |
| 测试 | **Vitest + Testing Library** | 逻辑与组件双层 |

**一句话**：用一个"够快"的 WebView，换你十倍的界面迭代速度。这个 App 的性能瓶颈从来不在渲染管线。

---

## 1. 约束条件（按优先级）

设计从这里倒推，而不是从"哪个框架火"倒推。

| # | 约束 | 含义 | 对选型的实际影响 |
|---|---|---|---|
| C1 | **5 秒法则** | 从掏手机到光标出现 ≤ 3 秒，输入不跟手即失败 | 冷启动、bundle 体积、首屏渲染优先级最高 |
| C2 | **审美是功能** | 壁纸、毛玻璃、排版是这个产品的卖点，不是装饰 | 需要 CSS 级别的样式控制力 |
| C3 | **绝对离线** | 无账号、无同步、无埋点，Release 不含 INTERNET 权限 | 排除任何依赖远端资源/云服务的方案 |
| C4 | **数据可携带** | ZIP 导出即可完整重建，格式必须人类可读 | 存储格式要贴近 Markdown 文件，而非私有二进制 |
| C5 | **单人长期维护** | 作者是 TS/React 背景，不是 Kotlin/Dart 背景 | 语言熟悉度权重高于理论性能上限 |
| C6 | **只做 Android** | 不为 iOS 的交互习惯做任何妥协 | 排除跨端框架的"最大公约数"设计 |

> C6 是这次讨论的关键变化：既然不做 iOS，Flutter / RN 最大的优势（跨端）直接清零，只剩"用 JS 写原生 UI"这一条。

---

## 2. 三条路线

### 2.1 评分

权重来自 C1–C6。1–5 分，越高越好。

| 维度 | 权重 | Capacitor + React | React Native | Kotlin + Compose |
|---|---|---|---|---|
| 审美表达力 | 25% | **5** — CSS 全权控制 | 3.5 — RN 样式子集 | 4.5 — Compose 很强但要重编译 |
| 开发效率 | 20% | **5** — 你的主场 | 3.5 | 2.5 — 换语言 |
| 运行性能 | 20% | 3 — WebView | **4.5** — 原生 | **5** |
| 轻量与体积 | 10% | 3 — ~12MB | 3 — ~20MB | **5** — ~6MB |
| 冷启动 | 10% | 3 — 0.6–1.2s | 4 — ~0.5s | **5** — ~0.3s |
| 长期可维护 | 15% | **4** | 4 | 2.5 — 非母语栈 |
| **加权** | | **4.05** | **3.78** | **4.00** |

### 2.2 诚实的话

4.05 / 4.00 / 3.78 —— **三个分数在噪声范围内**。任何一张评分表都能通过调权重把结论调向自己想要的方向，所以别信分数，信下面三条判断：

**判断一：这个 App 的性能瓶颈不在渲染管线。**
一个笔记应用的主要开销是：启动时读几百条文本、输入时重排一个 `<textarea>`、滚动时渲染一列卡片。这些在 2020 年的中端机上都不构成问题。真正会卡的是**图片解码**和**壁纸模糊**——而这两件事在任何框架里都得自己做优化，框架选型救不了。

**判断二：这个产品的迭代 80% 发生在样式层。**
"往左挪 4px"、"这个阴影再淡一点"、"壁纸换一张试试明暗"——这些动作在 Web 里是 DevTools 里改一个数字，在 Compose 里是改代码 → 等 Gradle → 重装 → 重进页面。一个审美驱动的产品，把反馈循环从 0.2 秒拉长到 30 秒，是致命的。

**判断三：换语言的成本是复利的。**
Kotlin/Compose 的理论上限更高，但 C5 说了：你是 TS 背景。第一周能跑通，第三个月开始改细节时会一直卡在"这个 API 叫什么"。而 Web 方案里，你 90% 的时间在写你已经会的东西。

### 2.3 那为什么不选 React Native？

RN 是唯一一个"既用 TS 又快"的选项，看起来最优。否决理由很具体：

1. **毛玻璃**：`expo-blur` 在 Android 上底层是 RenderEffect，低端机会直接掉到 30fps，且不支持"局部模糊"。而这个产品的核心视觉就是壁纸上的半透明卡片。
2. **编辑器**：RN 的 `TextInput` 是原生 EditText，中文 IME 没问题——但一旦你想要**语法高亮**，就必须写原生 TextWatcher 或接第三方，成本陡增。而 Web 里以后想升级成 contenteditable 高亮，是纯前端工作。
3. **依赖地狱**：RN 的版本升级（尤其 Android Gradle / New Architecture）是这个生态长期的老大难。单人项目最怕"三个月没动，回来跑不起来了"。

> 保留后路：业务逻辑（数据模型、Markdown 渲染、备份格式）全部放在**不含任何 UI 依赖的纯 TS 模块**里。哪天真要换 RN 或原生，这层可以原样复用。详见 [02-architecture.md](02-architecture.md) 的"可移植边界"。

---

## 3. 分层选型

### 3.1 壳与构建

| 项 | 选择 | 说明 |
|---|---|---|
| 原生壳 | Capacitor（当前稳定大版本） | 生成标准 Android 工程，Gradle 可控 |
| 构建 | Vite | 冷启动 HMR < 100ms，产物按路由分割 |
| 包管理 | pnpm | 硬链接省磁盘，锁文件严格 |
| Node | 22 LTS | 见 `.nvmrc` |
| JDK | 21 | AGP 8.x 要求 |
| Android | compileSdk 35 / minSdk 26 / targetSdk 35 | minSdk 26 覆盖 96%+ 设备，且免去大量兼容代码 |

### 3.2 应用层

| 项 | 选择 | 备注 |
|---|---|---|
| UI | React 19 + 自研组件 | 不引组件库，见 §4.5 |
| 样式 | CSS 变量 + CSS Modules | 设计 token 集中在 `src/styles/tokens.css` |
| 动效 | CSS transition + View Transitions API（可用则用） | 不引 Framer Motion，省 30KB |
| 状态 | Zustand | 三个 store：notes / editor / settings |
| 路由 | 自研屏幕栈（3 个屏） | 列表、编辑、设置；不值得为它引 router |
| 图标 | lucide-react（按需 import） | 每个 ~0.5KB，tree-shaking 友好 |

### 3.3 数据层

| 项 | 选择 | 备注 |
|---|---|---|
| 主库 | IndexedDB via Dexie | 见 §4.3 |
| 图片 | `Blob` 存独立表 | 见 §4.4 |
| 设置 | Dexie `settings` 表 | 不用 localStorage（容量 5MB 且同步阻塞） |
| 搜索 | 内存倒排索引 + Dexie 前缀扫描 | 千条量级无需 FTS |
| 导出 | fflate + Web Worker | 见 [03-data-backup.md](03-data-backup.md) |
| 落地 | `@capacitor/filesystem` + `@capacitor/share` | 写到 Cache 再走系统分享 |

### 3.4 编辑器与渲染

| 项 | 选择 | 理由 |
|---|---|---|
| 输入 | `<textarea>` | 系统 IME 原生处理，零适配（§4.2） |
| 解析 | markdown-it + 常用插件 | 成熟、可配置、体积可控 |
| 消毒 | DOMPurify | 用户自己写的 HTML 也不该能执行脚本 |
| 代码高亮 | v1 不做，v2 用 highlight.js 子集 | 先保证闭环 |
| 图片引用 | 自定义协议 `asset:<id>` | 渲染时映射为 `blob:` URL |

---

## 4. 关键论证

### 4.1 WebView 真的够快吗

拆开看一次"打开 App → 开始打字"：

| 阶段 | 预算 | 手段 |
|---|---|---|
| 进程 + WebView 初始化 | 400–700ms | 无法优化，属固定成本；用原生 Splash 盖住 |
| JS 解析 + 首屏渲染 | 250ms | 首屏 JS ≤ 120KB gzip，列表页不 import 编辑器 |
| 读最近一篇笔记 | < 50ms | IndexedDB 单条 get |
| **合计** | **≤ 1.2s** | 目标：Splash 后 300ms 内光标可输入 |

对比纸本"掏本子 + 翻页 + 拔笔"，1.2 秒是碾压。所以问题从来不是"能不能打败原生"，而是"能不能打败纸"。

真正需要对抗的是**输入延迟**：`<textarea>` 在 Chromium 里是原生控件，输入延迟与原生 App 同级（< 16ms），这一点不用担心。

### 4.2 为什么是 textarea，不是 CodeMirror / 富文本

移动端 Markdown 编辑器的三条路，都试过：

| 方案 | 中文 IME | 语法高亮 | 光标稳定性 | 结论 |
|---|---|---|---|---|
| `<textarea>` | ✅ 系统原生 | ❌ | ✅ | **v1 采用** |
| CodeMirror 6 | ⚠️ 合成事件期间状态错乱 | ✅ | ⚠️ 软键盘弹起易跳动 | 否决 |
| contenteditable | ⚠️ 各家浏览器行为不一 | ✅ | ❌ 中文输入法上屏时易丢字 | 否决 |

中文输入法会在 `compositionstart` → `compositionupdate` → `compositionend` 之间维持一个"未上屏"的缓冲。任何自己接管渲染的编辑器，都必须正确处理这段时间——而 Android WebView 的 `compositionend` 时机在不同厂商 ROM 上并不一致（小米/华为/搜狗输入法都有过差异）。

**结论**：v1 用 `textarea` + "编辑/预览"切换。牺牲了"边写边看"，换来"永远不丢字"。对一个课堂速记工具，这个交换毫无疑问。

后续若要语法高亮，路线是：`textarea` 透明文字 + 底层镜像 `<pre>` 同步滚动与换行。这条路在移动端有已知的换行对齐坑，放到 v2 再评估。

### 4.3 为什么 IndexedDB 而不是 SQLite 插件

| | IndexedDB（Dexie） | @capacitor-community/sqlite |
|---|---|---|
| 原生依赖 | 无 | 大，含 SQLCipher 分支 |
| 事务 | ✅ | ✅ |
| Blob 存储 | ✅ 原生支持 | 需转 base64 或写文件 |
| 迁移 | Dexie `version().upgrade()` | 手写 SQL 迁移 |
| 体积 | 0 | +3–5MB |
| 风险 | 用户"清除应用数据"会清空 | 同左 |

千条笔记 × 每条 2KB ≈ 2MB，IndexedDB 毫无压力。为这点数据引入一个原生数据库插件，性价比为负。

**但必须正视**：WebView 的存储清除门槛比原生文件低。对策有三层，见 [03-data-backup.md §5](03-data-backup.md#5-数据安全网)。

### 4.4 为什么图片存 Blob 而不是文件系统

如果图片走 `@capacitor/filesystem`，每个 `<img>` 都要 `convertFileSrc()` 转成本地 URL，或者读成 base64 塞进内存——前者依赖 Capacitor 的内置本地服务器（在"无网络权限"的 Release 包里行为需要验证），后者在大图上直接把内存打爆。

存 Blob 的做法：

```
选图 → createImageBitmap → 长边压到 1600 → canvas.toBlob('image/webp', 0.82)
     → 存入 Dexie assets 表 → 笔记里写 `![](asset:<uuid>)`
     → 渲染时 URL.createObjectURL(blob)，离屏/卸载时 revoke
```

好处：没有路径，没有权限，没有 `file://`，导出时直接读 Blob 塞进 zip。整类"图片丢了"的 bug 从根上消失。

### 4.5 为什么不用组件库

shadcn / Radix / MUI 的交互语义是**桌面**的：hover 态、右键菜单、focus ring、多点触控下的 300ms 延迟。而这个产品的交互是**手机**的：长按、滑动、下拉、键盘顶起工具栏。

引进来之后，你要做的不是"用组件"，而是"逐个覆盖组件的默认样式和行为"，最后剩下的代码比手写还多。

例外：图标用 lucide，无状态、无行为，纯 SVG。

---

## 5. 性能预算（写进 CI）

| 指标 | 预算 | 检查方式 |
|---|---|---|
| 首屏 JS（gzip） | ≤ 120 KB | `vite build` + bundle 分析脚本 |
| 首屏 LCP（中端机 WebView） | ≤ 1.2s | 真机手动基线，每次发版记录 |
| 输入到上屏 | ≤ 16ms | 1000 字文档手动测试 |
| 列表滚动 | 60fps @ 1000 条 | 虚拟列表 + 真机 |
| 单图体积 | ≤ 300KB / 长边 1600px | 压缩管线硬限制 |
| 冷启动到可输入 | ≤ 1.2s | `adb shell am start -W` |
| APK（arm64 split） | ≤ 15 MB | CI 构建产物 |

---

## 6. 风险登记

| 风险 | 概率 | 影响 | 缓解 |
|---|---|---|---|
| WebView 冷启动超预算 | 中 | 高 | 路由懒加载、首屏骨架、Splash 原生盖住；必要时把首屏做成静态 HTML 预渲染 |
| 软键盘遮挡输入区 | 高 | 中 | `adjustResize` + `visualViewport` 监听 + `100dvh`；工具栏用 `position: fixed` 跟随键盘 |
| 用户清数据丢笔记 | 低 | 极高 | 自动快照 + 7 天未导出提醒 + 首次启动即引导导出（§03） |
| 大图/多图导致 OOM | 中 | 高 | 压缩管线 + `revokeObjectURL` + 单篇图片数软上限 |
| 壁纸模糊掉帧 | 中 | 中 | 只模糊壁纸层一次，卡片不叠 `backdrop-filter`（§04） |
| Capacitor 大版本升级破坏 | 中 | 中 | 锁版本 + 每次升级跑冒烟清单；原生改动集中在 `android/` 一处 |
| Android 15 强制 edge-to-edge | 高 | 中 | 一开始就按 `safe-area-inset` 布局，不做事后补救 |

---

## 7. 版本与工具链策略

- **Node**：22 LTS，`.nvmrc` 固定
- **依赖**：`pnpm-lock.yaml` 提交；Capacitor 与 Dexie 锁大版本（这两个的破坏性变更最贵）
- **TS**：`strict: true`，`noUncheckedIndexedAccess: true`
- **代码风格**：ESLint 9 flat config + Prettier；提交前 lint-staged
- **Commit**：Conventional Commits（`feat:` / `fix:` / `docs:` / `chore:`）
- **版本号**：SemVer，`0.x` 阶段所有 minor 都可能破坏
- **CI**：M0 落地时一并接入（现在还没有 `package.json`，先放一个必然红灯的 workflow 没有意义）

---

## 8. 已定与待定

**已定（2026-10-17）**：项目名 `Unote`，仓库 `unote`，包名 `app.unote`，中文界面 + 英文品牌（同 flomo 的处理方式）。

**待你拍板**：

1. 编辑器形态：v1 接受"编辑/预览切换"，还是必须所见即所得？
2. 笔记组织：扁平 + 标签，还是按"课程/科目"分组？
3. 壁纸粒度：全局一张，还是每篇笔记都能换？
