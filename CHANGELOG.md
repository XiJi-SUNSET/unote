# 变更日志

本项目的所有重要变更都会记录在此文件。

格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，
版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

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
