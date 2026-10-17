import type { Note } from '../core/model/note'
import { plainText } from '../core/markdown/plain'

function formatTime(timestamp: number): string {
  const date = new Date(timestamp)
  const now = new Date()
  const sameDay = date.toDateString() === now.toDateString()
  if (sameDay) {
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
  }
  const sameYear = date.getFullYear() === now.getFullYear()
  return sameYear
    ? `${date.getMonth() + 1} 月 ${date.getDate()} 日`
    : `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`
}

interface Props {
  note: Note
  courseName?: string
  onOpen: (id: string) => void
}

export function NoteCard({ note, courseName, onOpen }: Props) {
  const excerpt = plainText(note.body).slice(0, 80)
  const title = note.title || '无标题'

  return (
    <button type="button" className="note-card" onClick={() => onOpen(note.id)}>
      <span className="note-card__title">{title}</span>
      {excerpt ? <span className="note-card__excerpt">{excerpt}</span> : null}
      <span className="note-card__meta">
        <span>{formatTime(note.updatedAt)}</span>
        {courseName ? <span className="note-card__course">{courseName}</span> : null}
        {note.pinned ? <span className="note-card__pin">置顶</span> : null}
      </span>
    </button>
  )
}
