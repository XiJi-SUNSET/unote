import { useEffect, useRef, useState, type ReactNode } from 'react'

const ACTION_WIDTH = 132
const OPEN_THRESHOLD = 56

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  actions: ReactNode
  children: ReactNode
}

/**
 * 右滑露出操作。触屏用 Pointer 事件，桌面用鼠标拖拽同样可用。
 * 滑动过程中不触发卡片点击；已展开时点一下先收起。
 */
export function SwipeCard({ open, onOpenChange, actions, children }: Props) {
  const [offset, setOffset] = useState(open ? ACTION_WIDTH : 0)
  const [dragging, setDragging] = useState(false)
  const startX = useRef(0)
  const startY = useRef(0)
  const base = useRef(0)
  const active = useRef(false)
  const moved = useRef(false)

  useEffect(() => {
    if (!active.current) setOffset(open ? ACTION_WIDTH : 0)
  }, [open])

  function onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (event.pointerType === 'mouse' && event.button !== 0) return
    startX.current = event.clientX
    startY.current = event.clientY
    base.current = offset
    moved.current = false
  }

  function onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (event.pointerType === 'mouse' && event.buttons === 0) return
    const dx = event.clientX - startX.current
    const dy = event.clientY - startY.current

    if (!active.current) {
      // 先判方向：竖向滚动优先，避免和列表滚动打架
      if (Math.abs(dx) < 8 || Math.abs(dx) <= Math.abs(dy)) return
      active.current = true
      moved.current = true
      setDragging(true)
      try {
        event.currentTarget.setPointerCapture(event.pointerId)
      } catch {
        // 合成事件/老旧 WebView 可能不支持指针捕获，退化为普通拖拽
      }
    }

    setOffset(Math.min(ACTION_WIDTH, Math.max(0, base.current + dx)))
  }

  function settle() {
    if (!active.current) return
    active.current = false
    setDragging(false)
    const shouldOpen = offset > OPEN_THRESHOLD
    setOffset(shouldOpen ? ACTION_WIDTH : 0)
    onOpenChange(shouldOpen)
  }

  return (
    <div className="swipe">
      <div
        className="swipe__actions"
        inert={!open}
        style={{ opacity: Math.min(1, offset / 40) }}
      >
        {actions}
      </div>
      <div
        className={`swipe__content${dragging ? ' is-dragging' : ''}`}
        style={{ transform: `translateX(${offset}px)` }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={settle}
        onPointerCancel={settle}
        onClickCapture={(event) => {
          if (moved.current) {
            moved.current = false
            event.preventDefault()
            event.stopPropagation()
            return
          }
          if (open) {
            event.preventDefault()
            event.stopPropagation()
            onOpenChange(false)
          }
        }}
      >
        {children}
      </div>
    </div>
  )
}
