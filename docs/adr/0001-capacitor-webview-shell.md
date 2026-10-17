# ADR-0001：用 Capacitor + WebView 作为 Android 壳

- **状态**：Accepted
- **日期**：2026-10-17
- **决策者**：项目作者
- **关联**：[01-tech-stack.md](../01-tech-stack.md)

## 背景

项目是一个 Android 单端的离线速记 App，核心卖点是**审美**（壁纸、排版、动效）与**启动速度**。作者的技术背景是 TypeScript / React，不是 Kotlin 或 Dart。

候选方案三条：

1. **Capacitor + React**：Web 技术写在 Android 原生壳里
2. **React Native**：JS 写原生 UI
3. **Kotlin + Jetpack Compose**：纯原生

## 决策

采用 **Capacitor + React + Vite + TypeScript**。

## 理由

1. **审美迭代速度**是这个产品的主要竞争力。设计调整在 Web 里是改一个 CSS 变量、热更新 100ms 内可见；在 Compose 里是改代码 → Gradle 编译 → 重装 → 重进页面，约 30 秒。一天改 50 次样式，这个差距是决定性的。
2. **性能不是瓶颈**。笔记应用的开销集中在文本重排与图片解码，不在渲染管线。真正会卡的两件事（图片解码、壁纸模糊）无论选哪个框架都要单独优化。
3. **能力复用**。作者已具备的 TS/React 能力可以直接迁移，不需要在维护成本上支付"第二语言"的复利。
4. **只做 Android**（C6）意味着跨端框架的最大优势被清零，RN 的分数因此显著下降。

## 后果

**正面**

- 样式调整的快反馈循环
- 大量成熟的 Web 库可用（markdown-it、DOMPurify、fflate）
- 未来可以零成本提供浏览器预览版

**负面**

- 冷启动比原生多 300–700ms（WebView 进程初始化），属固定成本，用原生 Splash 遮蔽
- APK 比原生大约 6MB
- 软键盘、返回键、edge-to-edge 需要手动处理，且不同厂商 ROM 行为有差异
- 极端低端机（< 2GB RAM）上滚动可能掉帧

**需要持续观察**

- WebView 版本碎片化对 CSS `color-mix()` / `backdrop-filter` 的支持
- 若冷启动实测超过 1.5s，需要重新评估（届时可考虑首屏静态化或迁移 RN）

## 被否决的方案

| 方案 | 否决理由 |
|---|---|
| React Native | 毛玻璃在 Android 低端机掉帧；编辑器要高亮必须碰原生；版本升级是长期负债 |
| Kotlin + Compose | 理论与体积最优，但作者非母语，长期维护成本会掩盖收益 |
| PWA（不安壳） | 无法保证"无网络权限"，且无法写入系统分享；Android 上安装体验差 |

## 缓解措施

- 业务逻辑集中在 `core/`（纯 TS，不依赖 React / Capacitor），见 [02-architecture.md](../02-architecture.md) §5
- 所有原生相关代码收敛到 `src/infra/native/` 与 `android/`
- 首屏 bundle 预算 120KB gzip，写入 CI
