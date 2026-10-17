import { useState } from 'react'
import { ArrowUp, Maximize2 } from 'lucide-react'
import { useApp } from '../stores/appStore'

export function QuickCapture() {
  const createNote = useApp((state) => state.createNote)
  const openNote = useApp((state) => state.openNote)
  const [value, setValue] = useState('')
  const [busy, setBusy] = useState(false)

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
      <input
        className="quick__input"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="记点什么…"
        enterKeyHint="done"
        autoComplete="off"
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
