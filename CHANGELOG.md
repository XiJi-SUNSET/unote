# 变更日志

本项目的所有重要变更都会记录在此文件。

格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，
版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [0.1.4] - 2026-10-18

### Fixed

- **签名不稳定导致无法覆盖安装**：之前每次 CI 都用 runner 新生成的 debug 密钥，
  版本之间签名不同。现在改用一把固定密钥（存放在 GitHub Secrets），
  并让 `versionCode` 跟着 tag 递增（`v0.1.4` → 104）

### Changed

- 图标微调：海浪抬高并加宽，笔触收细，减少画面的刺眼感

> ⚠️ 0.1.4 的签名和之前所有版本都不一样，装之前必须先卸载旧版。
> 卸载会清掉本地数据，**请先在旧版里 设置 → 备份 → 导出 ZIP**，装好新版再导入。

## [0.1.3] - 2026-10-18

### Changed

- 图标按真实意图重画：奶油色点阵纸、一支珊瑚色荧光笔、右下角漫上来的三层海浪
- 低密度图标会放大点阵、抬高水位、省略笔帽细节，48dp 下仍能看出「纸 / 笔 / 水」

## [0.1.2] - 2026-10-18

### Fixed

- 快速记录条换成自动增高的多行输入框，粘贴带换行的内容不再被压成一行
- 顶部留白过多：关掉 Capacitor 8 内置的 `SystemBars.insetsHandling`，内边距只由 safe-area 一层负责
- 移除与 safe-area 冲突的 `@capacitor/status-bar`，状态栏图标样式改用 safe-area 的 API
- 软键盘弹出时壁纸跟着缩放：壁纸高度在启动时固定，只在横竖屏切换时重算

### Changed

- 图标换成手绘草图的平面版：奶油底、珊瑚飞溅点、斜笔触、青蓝水波

## [0.1.1] - 2026-10-17

### Fixed

- 状态栏遮挡：开启 edge-to-edge，接入 `@capacitor-community/safe-area`，旧版 WebView 自动加内边距
- 物理返回键：接管 `backButton`，编辑屏 → 列表 → 退出，不再一按就回桌面
- 状态栏图标跟随明暗主题
- 应用图标与启动图换成珊瑚红底 + 奶油色「u.」（`tools/generate-icons.py` 可重跑）

## [0.1.0] - 2026-10-17

### Added

- Web 原型跑通：Vite 8 + React 19 + TypeScript strict
- 数据层：Dexie（notes / courses / assets / settings），带 ULID 生成
- 列表屏：课程 chips、时间线卡片、空态
- 底部快速记录条：回车即存，`▸` 展开进编辑器
- 编辑屏：textarea + 400ms 自动保存 + 失焦/切后台 flush，标题随首行联动
- 预览：markdown-it + DOMPurify，`asset:` 图片协议，按需懒加载
- 插图：Canvas 压缩到长边 1600 的 WebP 后存 Blob
- 课程继承：新建时不询问，按当前上下文落课程
- 回收站：软删除 + 恢复 + 彻底删除
- 主题：跟随壁纸 / 浅色 / 深色
- 壁纸系统：自定义图片、模糊 / 压暗滑杆、按壁纸亮度自动切明暗
- 毛玻璃材质：卡片 / 面板 / 顶栏 / 工具栏，可在设置里关闭
- 备份：导出 ZIP（notes/*.md + assets/ + courses.json + manifest.json）与导入（合并 / 覆盖）
- 交互：打开笔记默认渲染 Markdown，右滑卡片露出置顶 / 删除
- 阅读层重做：背景压暗 + 浮起玻璃纸面（照 Exterior 的 modal / modal-card），正文改系统无衬线 16px
- 材质可调：壁纸遮罩 / 壁纸模糊 / 界面模糊 / 卡片不透明度 / 阅读纸面 五个滑杆，实时写 CSS 变量
- 课程管理：设置里显示每门课的笔记数，可删除课程（笔记迁到未分类，不级联删除）
- Android 壳：Capacitor 8，`app.unote`，minSdk 26，**清单里没有 INTERNET 权限**，关闭系统备份
- GitHub Actions `android.yml`：tag 触发构建 debug APK 并挂到 Release
- 测试：28 条（含 Dexie 真实读写、备份往返、默认渲染态）

## [Unreleased]

## [0.1.7] - 2026-10-20

### Fixed

- **"界面模糊"滑条彻底换实现**：不再依赖 `backdrop-filter`（安卓 WebView
  上不渲染，两版都没救回来）。现在每个玻璃面自己铺一份**按视口坐标对齐**
  的壁纸切片，再对切片做 `filter: blur()`——这是普通滤镜，一定有效。
  两个滑条从此互不干扰：壁纸模糊只作用于背景，界面模糊只作用于窗口内部
  （实测：界面模糊 0→30，壁纸区域像素差 0.00，卡片与顶栏有变化）
- 切片位置由 `infra/dom/frost.ts` 每帧写入 `--frost-x/--frost-y`，
  滚动、切屏、新增条目都会重算。用横向渐变壁纸验证过对齐：
  按壁纸区灰度拟合直线，预测卡片内三点为 115.5 / 143.3 / 161.4，
  实测 115 / 144 / 161

### Changed

- 移除全部 `backdrop-filter` 声明；弹层遮罩那 2px 装饰性模糊一并去掉
- 壁纸层不再用 `transform: scale(1.04)` 遮模糊边缘，改成统一的
  `--wp-overscan`（96px），让壁纸层与玻璃切片的几何完全一致
- 默认背景渐变抽成 `--wallpaper-fallback` token，壁纸层和玻璃面共用

## [0.1.6] - 2026-10-20

### Fixed

- **设置页的版本号一直是 `0.1.0`**：硬编码字符串，之前每次发版都没跟着动。
  现在读 `core/version.ts` 的 `APP_VERSION`
- **快速记录条写多行时文字跑到圆角外面**：`border-radius: 999px` 在输入框
  长高后会被折算成半高的大圆角（132px 高时约 73px），首行文字正好落在
  圆角曲线外侧。改成 `--r-lg`（22px），与窗口圆角对齐
- **启动时莫名打开一条笔记**：之前只要创建过笔记就会记住"上一篇"，下次
  启动直接进编辑屏。现在只有**确实停在编辑屏里被系统杀掉**才回到那一篇：
  快速记录创建条目不再记录，主动按返回退回列表时清掉
- **界面模糊滑条在安卓上仍然无效**（0.1.5 的 fixed→absolute 没能救回来）：
  原生端把"界面模糊"按 0.7 权重并进壁纸层自身的 `filter: blur()`。玻璃
  背后的 backdrop-filter 采样是否生效都不影响了，拖动滑条一定有可见变化。
  网页端保持原语义

### Changed

- docs/07 §2.1 补充"冷启动回到上一篇"的前提条件

## [0.1.5] - 2026-10-20

### Fixed

- **物理返回键丢字**：按返回退出编辑屏时不再丢最后几百毫秒的输入。
  关屏前会先把未落盘的草稿写进数据库；保存失败会留待下次重试，
  而不是被误记为"已保存"。删除正在编辑的笔记也不会被这次落盘写活
- **APK 上"界面模糊"滑条不起作用**：壁纸层 `position: fixed` 改为
  `absolute`。App 本身固定视口不滚动，视觉等价；但安卓 WebView 对
  fixed 合成层做 backdrop-filter 采样会静默失效（桌面 Chromium 无此
  问题，实测壁纸存在时桌面像素差异 34.9%、滑动链路本身是通的）
- **没设壁纸时两个模糊滑条也有了反馈**：默认渐变叠了一层极淡的
  点阵纸纹理（对齐图标的"点阵纸"意象），且"壁纸模糊"现在同样作用
  于默认背景。平滑渐变本来模糊不可见，这是物理而非代码问题；
  默认背景下效果仍然偏微妙，设壁纸后才是完整体验
- **覆盖模式导入不再弄丢壁纸**：壁纸是本机资产、不在备份包里，
  清空 assets 前会先把它捞出来放回去
- **包里的阅读设置现在真的会被恢复**：之前导出写了 `settings.json`、
  导入却从来不用。覆盖模式会把主题与四个材质滑杆接过来（先过白名单
  与类型检查，手工改过的包写不坏界面）；合并模式不动本机设置
- 设置滑块的圆点描边引用了未定义的 `--panel` token，声明整条失效，
  补上了明暗两套的不透明面板色

### Added

- 回收站 30 天自动清理：启动时扫一次 `deletedAt` 索引（docs/07 §5 承诺过的行为）
- `pnpm check:layers`：零依赖脚本，机器检查 core 层依赖方向与
  `app.css` 字面量颜色，已接入 web CI
- 仓库骨架：README、LICENSE、贡献指南、行为准则、安全策略
- 设计文档：
  - `docs/01-tech-stack.md` 技术选型与论证
  - `docs/02-architecture.md` 分层、目录结构、关键流程
  - `docs/03-data-backup.md` 数据模型与备份包格式 v1
  - `docs/04-design-system.md` 视觉与交互规范
  - `docs/05-roadmap.md` 里程碑与验收标准
- 架构决策记录：ADR-0001（Capacitor 壳）、ADR-0002（IndexedDB 主存储）、ADR-0003（不做同步与账号）
- `docs/06-prior-art.md` 同类项目调研（markor / scratch / crossnote / markleaf / catch）
- `docs/07-interaction-spec.md` 交互规格：新建笔记继承当前上下文，不弹课程选择器
- `AGENTS.md`：给 AI 代理与贡献者的架构红线

### Changed

- `app.css` 最后 5 处字面量颜色换成 token；深色模式下"删除"滑块底色
  是浅珊瑚色，文字改用深色 token，对比度达标
- 文档对齐实现：备份合并不再有"冲突副本"（较新者胜，重复跳过）；
  `settings.json` 字段改为实际导出的主题 + 材质滑杆
- 项目定名 `Unote`，包名 `app.unote`
- 产品决策：编辑器采用「编辑/预览切换」；笔记按课程分组（新增 `Course` 表与 `Note.courseId`）；壁纸为全局一张（移除 `Note.wallpaperId`）
- 备份格式新增 `courses.json` 与 frontmatter 的 `course` / `courseId` 字段

[Unreleased]: https://github.com/XiJi-SUNSET/unote/compare/v0.1.5...HEAD
[0.1.5]: https://github.com/XiJi-SUNSET/unote/compare/v0.1.4...v0.1.5
