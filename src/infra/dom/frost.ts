/**
 * 玻璃面里那份"壁纸切片"要跟视口对齐：切片必须画在
 * "如果它没被裁掉时本来该在的位置"上，否则每张卡片都会显示壁纸的不同部位。
 *
 * CSS 的 background-attachment: fixed 在这里靠不住——祖先有
 * will-change / transform（比如右滑卡片的 .swipe__content）时，
 * 背景会退回按元素自身尺寸缩放。所以这里直接把元素在视口里的偏移
 * 写成 --frost-x / --frost-y，由 app.css 用它们反推切片的位置。
 *
 * 只写两个自定义属性，不触发重排，滚动时每帧一次。
 */
const FROST_SELECTOR = [
  '.glass-surface',
  '.topbar',
  '.chip',
  '.note-card',
  '.editor',
  '.paper-sheet',
  '.sheet',
  '.panel',
  '.quick',
].join(',')

export function trackFrostOffsets(): () => void {
  let frame = 0

  const update = () => {
    frame = 0
    for (const el of document.querySelectorAll<HTMLElement>(FROST_SELECTOR)) {
      const rect = el.getBoundingClientRect()
      el.style.setProperty('--frost-x', `${Math.round(rect.left)}px`)
      el.style.setProperty('--frost-y', `${Math.round(rect.top)}px`)
    }
  }

  const schedule = () => {
    if (frame) return
    frame = requestAnimationFrame(update)
  }

  schedule()
  window.addEventListener('resize', schedule)
  // 滚动事件不冒泡，用捕获拿到内部滚动容器（.notes / .settings__body）
  document.addEventListener('scroll', schedule, true)

  // 新笔记、切屏都会换掉节点，位置得重算
  const observer = new MutationObserver(schedule)
  observer.observe(document.body, { childList: true, subtree: true })

  return () => {
    if (frame) cancelAnimationFrame(frame)
    window.removeEventListener('resize', schedule)
    document.removeEventListener('scroll', schedule, true)
    observer.disconnect()
  }
}
