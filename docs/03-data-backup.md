# 数据模型与备份格式

> 关联：[02-architecture.md](02-architecture.md) · [ADR-0002](adr/0002-indexeddb-as-primary-store.md)
> 状态：Proposed

---

## 1. 存储布局

IndexedDB 由 Dexie 管理，库名 `unote`，schema 版本号即 Dexie 的 `version(n)`。

```ts
db.version(1).stores({
  notes:     '&id, courseId, updatedAt, createdAt, pinned, *tags',
  courses:   '&id, order',
  assets:    '&id, createdAt',
  settings:  '&key',
  snapshots: '&id, createdAt',
})
```

| 表 | 主键 | 索引 | 说明 |
|---|---|---|---|
| `notes` | `id` | `courseId`, `updatedAt`, `createdAt`, `pinned`, `*tags`（多值） | 正文、标题、元数据 |
| `courses` | `id` | `order` | 课程；`inbox` 为保留课程，不可删 |
| `assets` | `id` | `createdAt` | 图片 Blob，与笔记解耦（可被多篇引用） |
| `settings` | `key` | — | 键值对，`value` 是 JSON |
| `snapshots` | `id` | `createdAt` | 本地快照，仅文本，保留 7 份 |

`updatedAt` 索引是列表排序的主路径；`*tags` 让"按标签筛选"不需要全表扫描。

---

## 2. 数据模型

```ts
export interface Note {
  id: string            // ULID，字典序 = 时间序
  courseId: string      // 必填；默认 'inbox'（未分类）
  title: string         // 显式标题；空字符串表示"用首行"
  body: string          // Markdown 正文，不含 frontmatter
  createdAt: number     // epoch ms
  updatedAt: number
  pinned: boolean
  tags: string[]
  schema: 1             // 单条记录的格式版本
}

export interface Course {
  id: string            // ULID；'inbox' 为保留值
  name: string          // 课程名，可重命名
  order: number         // 手动排序，小的在前
  archived: boolean     // 归档后不在切换条出现，笔记仍保留
  createdAt: number
}

export interface Asset {
  id: string
  blob: Blob
  mime: 'image/webp' | 'image/jpeg'
  width: number
  height: number
  bytes: number
  createdAt: number
}
```

### 不变量

1. `body` 里对图片的引用统一写成 `![alt](asset:<assetId>)`，**不出现任何文件路径**。
2. `id` 一旦生成永不变更，导入时用它做去重与合并。
3. `updatedAt` 单调不减；同一毫秒内多次保存取 `max(now, updatedAt + 1)`。
4. 删除笔记不立即删 `assets`，由"孤立资源清理"任务（每周一次）回收。
5. `courseId` 必须指向存在的课程；`inbox` 永远存在，不能删除、不能归档、不能改名。
6. 删除课程时，其下笔记整体迁到 `inbox`，**不得级联删除笔记**。

---

## 3. 图片管线

```
选图/拍照/粘贴
  → createImageBitmap(blob)              // Worker 内
  → 长边 > 1600 ? 等比缩放 : 原尺寸
  → OffscreenCanvas.convertToBlob({ type: 'image/webp', quality: 0.82 })
  → 失败回退 image/jpeg 0.85
  → Asset 入库，得到 id
  → 光标处插入 ![](asset:<id>)
```

| 规则 | 值 | 理由 |
|---|---|---|
| 长边上限 | 1600px | 手机屏宽 1080–1440，2x 屏也够清晰 |
| 格式 | WebP 优先 | 同质量下比 JPEG 小 25–35% |
| 质量 | 0.82 | 再低会出现文字截图边缘发糊 |
| 单图上限 | 300KB（超了降质量重编码，最多两轮） | 控制导出包体积 |
| 单篇图片软上限 | 20 张 | 超了提示但不阻止 |

渲染时按需 `URL.createObjectURL(blob)`，图片离开视口 3 屏后 `revokeObjectURL`。**必须 revoke**，否则长列表会稳定涨内存。

---

## 4. 备份包格式 v1

### 4.1 文件名

```
unote-20261017-1929.zip
```

`unote-<yyyyMMdd-HHmm>.zip`，本地时间，便于在文件管理器里辨认。

### 4.2 结构

```
unote-20261017-1929.zip
├── manifest.json
├── settings.json
├── courses.json
├── notes/
│   ├── 2026-10-17-01J9Z6Q2K7.md
│   ├── 2026-10-16-01J9Y1M8RB.md
│   └── ...
└── assets/
    ├── 01J8X4M2NA.webp
    └── ...
```

- `courses.json` 保存课程表（名称、顺序、归档状态），**不带它，进另一台设备就只剩一堆没归类的笔记**。

- 笔记文件名 = `<创建日期>-<id前10位>.md`，**人类可读**，也是"用别的编辑器直接打开"的入口。
- 笔记内的图片引用在导出时被改写为包内相对路径 `assets/<id>.webp`；导入时再改写回 `asset:<id>`。
- 这个目录结构与 Obsidian / Typora 的常见习惯兼容：解压后直接就是一堆带 frontmatter 的 Markdown。

### 4.3 manifest.json

```json
{
  "format": "unote.backup",
  "formatVersion": 1,
  "appVersion": "0.4.0",
  "exportedAt": "2026-10-17T11:29:00.000Z",
  "timezone": "Asia/Shanghai",
  "counts": { "notes": 128, "courses": 6, "assets": 43 },
  "bytes": 18234567
}
```

| 字段 | 必填 | 说明 |
|---|---|---|
| `format` | 是 | 固定 `unote.backup`，导入时第一道校验 |
| `formatVersion` | 是 | 整数，v1 为 `1`；导入端拒绝大于自己支持的版本 |
| `appVersion` | 是 | 生成该包的 App 版本，仅用于诊断 |
| `exportedAt` | 是 | ISO 8601 UTC |
| `counts` / `bytes` | 否 | 进度与完整性提示，不作为校验依据 |

完整性依赖 ZIP 自带的 CRC32。整包 sha256 留到 v2（届时会写进 `manifest-digest.txt`）。

### 4.4 单篇笔记（Markdown + YAML frontmatter）

```markdown
---
id: 01J9Z6Q2K7
course: 高等数学
courseId: 01J9Z5A1BC
title: 为什么 TCP 要三次握手
created: 2026-10-17T02:13:44.000Z
updated: 2026-10-17T02:31:09.000Z
tags: [计算机网络, 待查]
pinned: false
schema: 1
---

老师说"两次不够"，因为...

![课堂板书](assets/01J8X4M2NA.webp)

> 下次课问：为什么不是四次？
```

规则：

- frontmatter 只放**元数据**，正文原样保留，不做任何格式化（缩进、空行、尾随空格都不动）。
- 未知字段在导入时保留进 `Note.extra`？——**v1 不保留**，直接丢弃并在导入报告中计数。理由：v1 的字段集合就是全部，保留未知字段反而会掩盖版本问题。v2 再引入 `extra`。
- `title` 为空时，导出时写入首行文本（最多 60 字），但那只是**展示用**的冗余，导入时以 `body` 为准重新推导。

### 4.5 settings.json

```json
{
  "theme": "auto",
  "overlay": 8,
  "bgBlur": 6,
  "blur": 6,
  "card": 70,
  "sheet": 0
}
```

只导出**影响阅读体验**的设置：主题 + 四个材质滑杆。与设备相关的（安全区、屏幕尺寸、壁纸、上一篇位置）不导出——壁纸是这台设备的资产，导入也不会把它从包里读回来。

> 导入侧只信任白名单内的键，且数值要过类型检查：`theme: "solarized"`、`card: "abc"` 这类都会被丢掉并计数，不会写坏界面。

### 4.6 明确不放进包里的东西

| 不导出 | 原因 |
|---|---|
| 回收站/已删除笔记 | 备份不是归档；删除即不备份 |
| 搜索索引 | 可从正文重建 |
| 快照表 | 本身是保护机制，不是数据 |
| 任何设备标识 | 隐私 |

---

## 5. 导入与合并

### 5.1 流程

```
选 zip
  → 读 manifest，校验 format / formatVersion
  → 逐条目解压（坏条目跳过，计数）
  → core/backup/import.ts：解析 frontmatter + 重写图片引用
  → 按策略写入 Dexie（单个事务，失败整体回滚）
  → 重建搜索索引
  → 结果页：新增 x / 更新 y / 跳过 z / 失败 w
```

### 5.2 两种模式

| 模式 | 行为 | 适用 |
|---|---|---|
| **合并**（默认） | 同 id 比较 `updatedAt`，较新者胜；同 id 且时间也相同则判定为重复，跳过并计数（不生成副本，单机没有墓碑） | 从另一台设备带回增量 |
| **覆盖** | 清空 `notes` / `courses` / `assets` 后导入，壁纸资产与包里的阅读设置除外 | 迁移整机、灾难恢复 |

覆盖模式需要**输入设备上的笔记总数**做二次确认，不用"确定吗"这种无效弹窗。
覆盖模式会连同包里的 `settings.json` 一起恢复主题与材质；合并模式不动本机设置。

### 5.2 合并细则

- **图片去重**：按 `id` 命中即复用；id 不同但 `bytes + 尺寸` 相同则复用并改引用（少见，但能省一半空间）。
- **标签**：并集，不做大小写归一（"网络"和"网络 "视为两个，导入报告里提示空格异常）。
- **课程**：先按 `courseId` 匹配；匹配不到再按 `course` 名称匹配（兼容改名后导入的旧包）；仍匹配不到则新建课程，并保留其 `order`。`inbox` 永不被导入覆盖。
- **置顶**：`pinned` 取 OR，避免导入后丢置顶。

---

## 6. 数据安全网

IndexedDB 是"应用数据"，用户点「清除数据」就会清空，卸载也清空。三层防线：

### 6.1 每日本地快照

- 触发：每天首次进入 App，且距上次快照 > 24h
- 内容：全部笔记的文本 + 元数据（**不含图片**），JSON 压缩后通常 < 200KB
- 保留：最近 7 份，滚动覆盖
- 恢复入口：设置 → 数据 → 本地快照 → 选择日期恢复

### 6.2 导出提醒

- 首次安装第 7 天，若从未导出过，列表页顶部出现一条细提示（不是弹窗）
- 此后每 30 天提醒一次；用户可「7 天内不再提示」
- 设置页常驻一行：`上次备份：12 天前`

### 6.3 容量可视化

设置页显示 `navigator.storage.estimate()` 的用量/配额，超过 500MB 时提示清理孤立图片。

---

## 7. 版本迁移

两个独立的版本号，不要混：

| 版本 | 位置 | 作用 |
|---|---|---|
| **DB schema** | Dexie `version(n)` | 本机表结构迁移 |
| **备份格式** | `manifest.formatVersion` | 跨设备交换格式 |
| **单条记录** | `Note.schema` / frontmatter `schema` | 单条数据的字段演进 |

规则：

1. 迁移前先写快照（`snapshots` 表），失败则回滚。
2. `formatVersion` 只增不改：v2 的导入器必须能读 v1。
3. 破坏性迁移（例如把 `tags` 从数组改成对象）必须升 `Note.schema`，并在导入时做逐条转换。
4. 任何迁移都要有对应的单元测试，样本放在 `src/core/backup/__fixtures__/`。

---

## 8. 边界情况清单

实现时要写的测试用例，先列在这里：

- [ ] 空库导出（0 条笔记）→ 合法 zip，只有 manifest
- [ ] 单条笔记 0 字节正文
- [ ] 同一篇笔记被引用 3 次同一张图
- [ ] 图片 asset 丢失（手动删表）→ 渲染占位，导出时跳过并计数
- [ ] zip 里 frontmatter 缺失 → 从文件名和正文兜底
- [ ] zip 里出现 `../` 路径（zip slip）→ 拒绝整个包
- [ ] 导入同一份 zip 两次 → 第二次结果为「全部跳过」
- [ ] 1 万条笔记导出 → Worker 不崩、进度单调递增
- [ ] 笔记标题包含 `/`、`:`、emoji → 文件名安全化后仍可导入
- [ ] 导入缺少 `courses.json` 的包 → 全部落到 `inbox`，结果页提示
- [ ] 课程改名后导入旧包 → 按 `courseId` 合并，不产生重复课程
- [ ] 删除一个含 30 篇笔记的课程 → 30 篇全部迁到 `inbox`，总数守恒
