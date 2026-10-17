# 同类项目调研（Prior Art）

> 调研日期：2026-10-17
> 方法：GitHub Search API（按 star 排序）+ 各仓库 `git/trees` 接口看目录结构
> **诚实声明**：只读了仓库结构、元数据、目录布局，**没有逐行读源码**。标"推测"的地方是推断，不是事实。

---

## 1. 筛选标准

1. Android 可安装，且不依赖账号或服务端
2. 支持 Markdown，最好带图片
3. 数据可导出、可迁移
4. 代码公开、仍在维护

搜了两轮：`markdown notes android` 命中 153 个仓库，`notes app offline language:TypeScript` 命中 323 个。

---

## 2. 样本

| 项目 | ★ | 形态 | 数据层（据目录推测） | 与我们的关系 |
|---|---|---|---|---|
| [markor](https://github.com/gsantner/markor) | 6.3k | Java 原生 Android，2017 至今 | 纯文件系统 | 最接近的"长寿"对照组 |
| [scratch](https://github.com/erictli/scratch) | 1.6k | TypeScript + Vite + **Tauri** | 本地 | 极简主义的最佳参照 |
| [crossnote-app](https://github.com/0xGG/crossnote-app) | 1.1k | TypeScript + React + Vite | **IndexedDB** + 文件系统 | 技术栈几乎和我们一样 |
| [MarkNote](https://github.com/Shouheng88/MarkNote) | 917 | Java 原生 Android | — | Material 设计参照 |
| [markleaf-android](https://github.com/jeiel85/markleaf-android) | 新 | Kotlin + Gradle | 原生 | **仓库规范**的样本 |
| [catch](https://github.com/iiloni/catch) | 7 | TS monorepo + Docker | 服务端 | 反例 |

---

## 3. 六个结论

### 3.1 没有现成的对标物

六个样本里：

- **markor** 是文件编辑器，不是笔记库——没有课程分组，也没有图片内嵌的富内容模型
- **scratch** 用 Tauri 做**桌面**端（仓库里有 `src-tauri/`），不是移动端
- **crossnote** 数据层和我们最像，但它是"浏览器里的笔记本 + git 同步"，没有 Android 壳，也没有离线优先的心智
- **catch** 需要 Docker 自托管，本质上是服务端应用
- **MarkNote** 和 **markleaf** 是 Kotlin 原生，语言不同

**同时满足「Android 壳 + 完全无网 + 课程分组 + 图片 + ZIP 导出」的公开项目，我没找到。** 这既是机会，也意味着没有可以直接抄的架构——得自己拼。

### 3.2 文件系统 vs 数据库，是"组织能力"的分水岭

markor 能活九年，靠的是把"数据即文件"做到极致：没有数据库、没有私有格式，卸载重装只要文件夹还在就一切都在。代价也很清楚——**没有索引就意味着没有课程分组、没有标签、没有全文搜索**。

crossnote 一旦要做"笔记本"级别的组织，立刻换了形态：仓库根目录出现 `pnpm-workspace.yaml`、`patches/`、`e2e/`、`playwright.config.ts`，复杂度上了一个台阶。

> **对我们**：课程分组 + 图片 + 搜索三者叠加，索引是刚需，IndexedDB 的判断成立。但反过来必须接受 markor 的教训——**导出不是备份的副产品，是一等公民的数据形态**。所以 `notes/*.md` 必须人能直接读，这一条要写死在格式规范里（已在 [03](03-data-backup.md) 做到）。

### 3.3 只要做编辑器，迟早会长出 `patches/` 和 `e2e/`

crossnote 根目录同时有这两个目录，还有 Playwright 配置。

推测：`patches/` 是给 Markdown 编辑器相关依赖打补丁——这个生态的库经常需要 patch 才能跑通。

> **对我们**：
> - v1 用 `<textarea>`，天然绕开了 patch 那一半的坑；
> - 但 e2e 那一半躲不掉。**把 Playwright 从 M4 提前到 M1**，用浏览器预览跑核心链路（新建 → 输入 → 切预览 → 导出）。

### 3.4 仓库规范上，Android 项目可以比我们更完整

markleaf-android 根目录有：`fastlane/`（商店元数据）、十种语言的 README、`DESIGN.md`、`benchmark/` 模块、`.github/`。

> **对我们**：`fastlane` 留到 M4（还没到发商店的时候）；多语言 README 也留到有海外用户再说。**但 `DESIGN.md` 这件事我们现在就做了**——就是 [04-design-system.md](04-design-system.md)。

### 3.5 加同步 = 架构爆炸

catch 是 Docker + monorepo + 服务端；crossnote 用浏览器里的 git 做同步。两者为了"多端一致"，都付出了远超"一个笔记本"的复杂度。

> **对我们**：这是"明确不做"清单最硬的一次反向验证。已记入 [ADR-0003](adr/0003-no-sync-no-account.md)，以后再有人提，直接指过去。

### 3.6 2026 年的开源仓库多了一个文件：`AGENTS.md`

scratch 有 `CLAUDE.md`，markleaf-android 有 `AGENTS.md` 和 `GEMINI.md`，catch 有一个 35KB 的 `AGENTS.md`。

趋势很清楚：仓库除了给人看，还要给代理看。而代理最容易犯的错，恰好是**破坏你精心设计的边界**（比如在三层架构里横穿一层依赖）。

> **对我们**：加一个 [AGENTS.md](../AGENTS.md)，把架构红线写成一页纸，让任何代理（包括我）动手前先读。

---

## 4. 采纳清单

| # | 动作 | 落到哪 | 状态 |
|---|---|---|---|
| 1 | Playwright e2e 提前到 M1 | [05-roadmap.md](05-roadmap.md) | 已改 |
| 2 | 强化"导出即数据形态" | [03-data-backup.md](03-data-backup.md) §4 | 原本已是 |
| 3 | 新增 `AGENTS.md` | 仓库根 | 已加 |
| 4 | `fastlane/` 元数据留到 M4 | 05-roadmap | 已记 |
| 5 | "不做同步"写成 ADR | [ADR-0003](adr/0003-no-sync-no-account.md) | 已加 |

---

## 5. 明确不学的

| 不学 | 原因 |
|---|---|
| catch 的服务端 + Docker 部署 | 与"完全离线"直接冲突 |
| crossnote 的 git-in-browser 同步 | 为同步付出的复杂度，我们不需要 |
| scratch 的 Tauri 桌面形态 | 目标设备不同 |
| 它们的 monorepo 结构 | 只有一个包，等真有两个再拆——过早拆是另一种负债 |
| markor 的纯文件模型 | 可移植性我们靠 ZIP 拿到，组织能力不能丢 |
