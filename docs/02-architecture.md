# 架构设计

> 关联：[01-tech-stack.md](01-tech-stack.md) · [03-data-backup.md](03-data-backup.md)
> 状态：Proposed

---

## 1. 分层

```
┌──────────────────────────────────────────────────────┐
│  UI 层        screens / components                   │
│               只管渲染与手势，不含业务判断            │
├──────────────────────────────────────────────────────┤
│  应用层       stores / usecases                      │
│               编排：打开、保存、导出、导入            │
├──────────────────────────────────────────────────────┤
│  领域层       core/  （纯 TypeScript）               │
│               模型、Markdown、备份格式、校验           │
│               ←←←  可移植边界：不 import React / Dexie │
├──────────────────────────────────────────────────────┤
│  基础设施层   infra/                                 │
│               Dexie、Capacitor 插件、Canvas 压缩      │
└──────────────────────────────────────────────────────┘
```

**唯一硬规则：依赖只能向下。** `core/` 里出现 `import { db } from '../infra/db'` 就是架构违规，用 ESLint 的 `no-restricted-imports` 挡住。

这样做的直接收益：`core/` 可以跑在 Node 里做单元测试（不需要浏览器），也可以在未来被 RN 或原生版本原样复用。

---

## 2. 目录结构

```
src/
├── main.tsx                  # 挂载 + 启动耗时打点（仅 dev）
├── app/
│   ├── App.tsx               # 屏幕栈 + 全局错误边界
│   ├── screenStack.ts        # 三个屏的极简路由
│   └── boot.ts               # 冷启动决策：恢复上次编辑 / 新建 / 空态
├── screens/
│   ├── ListScreen/           # 课程切换 + 时间线 + 搜索
│   ├── EditorScreen/         # 编辑 / 预览 / 插图
│   └── SettingsScreen/       # 主题、壁纸、导出、关于
├── components/
│   ├── Wallpaper/            # 壁纸层 + scrim + 明暗自适应
│   ├── MarkdownView/         # markdown-it 渲染 + 图片解析
│   ├── EditorToolbar/        # 键盘上方的格式化条
│   ├── CourseChips/          # 课程切换条（横向滚动）
│   ├── NoteCard/
│   ├── Sheet/                # 底部弹层
│   └── ...
├── core/                     # ← 可移植边界
│   ├── model/note.ts         # Note / Asset 类型与不变量
│   ├── model/course.ts       # Course；'inbox'（未分类）为保留课程
│   ├── markdown/render.ts    # md -> html（含 asset: 协议）
│   ├── backup/manifest.ts    # 备份格式定义与校验
│   ├── backup/export.ts      # 纯函数：数据 -> zip 条目
│   ├── backup/import.ts      # 纯函数：zip 条目 -> 数据 + 合并策略
│   └── ports.ts              # NoteRepo / CourseRepo / AssetRepo / FileSink
├── infra/
│   ├── db/schema.ts          # Dexie 表结构与版本迁移
│   ├── db/noteRepo.ts
│   ├── db/courseRepo.ts
│   ├── db/assetRepo.ts
│   ├── image/compress.ts     # createImageBitmap -> canvas -> webp
│   ├── fs/shareSink.ts       # Capacitor Filesystem + Share
│   └── native/               # 状态栏、键盘、返回键、震动
├── stores/
│   ├── notesStore.ts
│   ├── coursesStore.ts
│   ├── editorStore.ts
│   └── settingsStore.ts
├── styles/
│   ├── tokens.css            # 设计 token（唯一真源）
│   ├── base.css
│   └── typography.css
└── workers/
    └── export.worker.ts      # fflate 打包，主线程不卡
```

---

## 3. 数据流

单向，且**编辑热路径绕开 React 的渲染**：

```
用户输入
  ↓ (每次按键，ref 直接写，不 setState)
<textarea> ──debounce 400ms──► usecase.save()
                                    ↓
                              Dexie notes 表
                                    ↓ (事务提交后)
                              发布 note:updated 事件
                                    ↓
                    列表页订阅者按需刷新（不是每键刷新）
```

理由：1000 字笔记在 React 里每键 `setState`，会把整个编辑器子树重渲染，中低端机上开始出现输入延迟。所以**正文只存在 ref 里**，React 只负责渲染"与正文无关的东西"（标题、字数、保存状态点）。

---

## 4. 关键流程

### 4.1 冷启动

```
原生 Splash（背景色 = 用户主题底色，避免白闪）
   ↓
读 settings：lastNoteId / lastOpenAt
   ↓
├─ 距上次 < 30 分钟 → 直接进那篇笔记，光标落在末尾
├─ 有草稿未保存   → 恢复草稿
└─ 首次启动       → 空态页（一句话引导，不弹教程）
```

目标：Splash 消失后 **300ms 内**光标可用。

### 4.2 自动保存

| 触发 | 行为 |
|---|---|
| 输入停止 400ms | 写库（写 `body` + `updatedAt`） |
| 失焦 / 切后台（`visibilitychange`） | 立即 flush，不等 debounce |
| 返回列表 | flush 后再切屏 |
| 系统返回键 | 拦截一次：草稿未落库则先 flush |

保存状态在标题栏右侧用一个小圆点表示：`·` 已保存 / `○` 保存中。**不弹 toast。**

### 4.3 插入图片

```
用户选图（<input type=file accept="image/*">，WebView 直接调起系统相册/相机）
  → createImageBitmap（在 Worker 里做，避免主线程卡顿）
  → 长边压到 1600px，canvas.toBlob('image/webp', 0.82)
  → 失败则回退 jpeg 0.85
  → 存入 assets 表，生成 id
  → 在光标处插入 `![](asset:<id>)`
```

**不引入相机插件**：`<input type="file" capture>` 在 Android WebView 里会调起系统相机，行为与本机一致，省一个插件和一套权限申请。

### 4.4 导出

```
点击导出
  → Worker：从 Dexie 读全部 notes + assets（分页，每页 50）
  → core/backup/export.ts：生成 Markdown 文本 + manifest
  → fflate.zip() 流式写入
  → 进度回传主线程（每 50 条一次，不刷爆）
  → 写入 Cache 目录 → Capacitor Share 调起系统分享
```

全程 **不校验网络**、不申请存储权限（Cache 目录属应用私有，Share 通过 FileProvider 授权）。

### 4.5 横竖屏

旋转时**不能重建编辑器**，否则光标与 IME 全部丢失。

做法：DOM 结构不变，只用 CSS Grid 改变布局（`grid-template-columns`），列表在横屏从"覆盖层"变成"左侧栏"。React 组件树零变化。

### 4.6 课程归属

按课程分组给"5 秒法则"带来了一次额外选择。解法借用作者在 Exterior 里用了很久的模式——**上下文即默认值**：

| 你站在哪 | 新笔记落到 |
|---|---|
| 课程「高等数学」的列表里 | 高等数学 |
| 横屏左侧选中某门课 | 那门课 |
| 搜索 / 全部 | `settings.lastCourseId` |
| 冷启动恢复上一篇 | 那一篇的课程 |

**新建不弹选择器。** 课程只在两处出现：卡片上的徽章，以及编辑屏里想改时点一下。

| 场景 | 行为 |
|---|---|
| 首次使用 | 自动建 `inbox`（未分类），不做引导 |
| 删除课程 | 其下笔记全部迁到 `inbox`，**绝不做级联删除** |
| 课程重命名 | 只改 `name`，`id` 不变；备份按 id 匹配，改名不会拆出重复课程 |

完整的屏级交互（底部快速记录条、回收站、触屏规则）见 [07-interaction-spec.md](07-interaction-spec.md)。

---

## 5. 可移植边界

`core/` 只依赖 `ports.ts` 里定义的接口：

```ts
export interface NoteRepo {
  get(id: string): Promise<Note | undefined>
  list(query: ListQuery): Promise<Note[]>
  upsert(note: Note): Promise<void>
  remove(id: string): Promise<void>
}

export interface CourseRepo {
  list(): Promise<Course[]>
  upsert(course: Course): Promise<void>
  remove(id: string): Promise<void>   // 其下笔记迁移到 'inbox'，不级联删除
}

export interface AssetRepo {
  put(blob: Blob, meta: AssetMeta): Promise<Asset>
  get(id: string): Promise<Asset | undefined>
}

export interface FileSink {
  write(name: string, bytes: Uint8Array): Promise<void>
  share(): Promise<void>
}
```

`infra/` 提供实现，`main.tsx` 里注入一次。

**这条边界的意义**：如果三年后 WebView 真的撑不住了，换 RN 或 Kotlin 时，数据模型、Markdown 渲染、备份格式这三块（约占全部逻辑代码的 60%）可以整体搬走。

---

## 6. 无网的强制执行

三层，缺一不可：

1. **清单层**：Release `AndroidManifest.xml` 不含 `INTERNET` / `ACCESS_NETWORK_STATE`。Capacitor 模板默认带，M0 生成工程后**第一件事就是删掉**。
2. **运行层**：CSP 写进 `index.html`：
   ```
   default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline';
   img-src 'self' blob: data:; font-src 'self'; connect-src 'self';
   ```
   任何 `fetch('https://...')` 在运行期直接失败。
3. **CI 层**：构建后解包 APK，断言 `uses-permission` 里没有网络权限（见 M0 清单）。

> 注意：Capacitor 的 dev server 需要网络权限做热更新，但那只存在于 debug 变体。release 变体不注入。

---

## 7. 错误处理

| 场景 | 处理 |
|---|---|
| 渲染异常 | 每屏一个 `ErrorBoundary`，降级为"这页打不开了 + 返回列表"，绝不让整个 App 白屏 |
| 写库失败（配额/事务） | 保留内存草稿，标题栏显示"未保存"，下次输入重试；连续失败 3 次才提示用户导出 |
| 导入的 zip 损坏 | 逐条目校验，坏条目跳过并在结果页报告数量，不整体回滚 |
| 图片解码失败 | 渲染为占位块 + alt 文本，不阻塞正文 |
| 迁移失败 | 迁移前先写一份完整快照到 `snapshots` 表，失败则回滚版本号并提示 |

---

## 8. 性能手法

- **虚拟列表**：超过 60 条启用窗口化渲染（自研，约 80 行，不引库）
- **图片懒加载**：`IntersectionObserver` 进入视口才 `createObjectURL`，离开 3 屏外 `revoke`
- **路由分割**：编辑器代码只在进入编辑屏时加载（`React.lazy`）
- **零运行时样式**：CSS 变量 + 预编译，不做 CSS-in-JS
- **壁纸只模糊一次**：见 [04-design-system.md §4](04-design-system.md)

---

## 9. 未决问题

- 搜索结果高亮是否需要逐字定位（影响是否需要预建 token 索引）
- 单篇笔记的图片数量上限（暂定软提醒 20 张）
- 是否支持"批量选择导出"（影响导出 Worker 的输入设计）
