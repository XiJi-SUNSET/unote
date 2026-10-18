import { useLayoutEffect, useRef, useState } from 'react'
import { ArrowUp, Maximize2 } from 'lucide-react'
import { useApp } from '../stores/appStore'

const MAX_HEIGHT = 132

export function QuickCapture() {
  const createNote = useApp((state) => state.createNote)
  const openNote = useApp((state) => state.openNote)
  const [value, setValue] = useState('')
  const [busy, setBusy] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement | null>(null)

  // 用 textarea 而不是 input：粘贴多行内容时换行不会被吞掉
  useLayoutEffect(() => {
    const el = inputRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, MAX_HEIGHT)}px`
  }, [value])

  async function submit() {
    const text = value.trim()
    if (!text || busy) return
    setBusy(true)
    try {
      await createNote(text)
      setValue('')
      document.querySelector('.notes')?.scrollTo({ top: 0, behavior: 'smooth' })
    } finally {
      setBusy(false)
    }
  }

  async function expand() {
    if (busy) return
    setBusy(true)
    try {
      const note = await createNote(value.trim())
      setValue('')
      if (note) await openNote(note.id)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form
      className="quick"
      onSubmit={(event) => {
        event.preventDefault()
        void submit()
      }}
    >
      <textarea
        ref={inputRef}
        rows={1}
        className="quick__input"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key !== 'Enter' || event.shiftKey) return
          // 中文输入法选词时的回车不算提交
          if (event.nativeEvent.isComposing) return
          event.preventDefault()
          void submit()
        }}
        placeholder="记点什么…"
        enterKeyHint="done"
        autoComplete="off"
        spellCheck={false}
        aria-label="快速记录"
      />
      <button type="button" className="quick__icon" aria-label="展开编辑" onClick={() => void expand()}>
        <Maximize2 size={16} />
      </button>
      <button type="submit" className="quick__send" aria-label="保存" disabled={!value.trim()}>
        <ArrowUp size={18} />
      </button>
    </form>
  )
}
