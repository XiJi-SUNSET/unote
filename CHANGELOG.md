# 变更日志

本项目的所有重要变更都会记录在此文件。

格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，
版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

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

### Added

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

- 项目定名 `Unote`，包名 `app.unote`
- 产品决策：编辑器采用「编辑/预览切换」；笔记按课程分组（新增 `Course` 表与 `Note.courseId`）；壁纸为全局一张（移除 `Note.wallpaperId`）
- 备份格式新增 `courses.json` 与 frontmatter 的 `course` / `courseId` 字段

[Unreleased]: https://github.com/
