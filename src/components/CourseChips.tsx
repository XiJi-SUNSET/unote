import { useRef, useState } from 'react'
import { Plus } from 'lucide-react'
import type { Course } from '../core/model/course'
import { ALL_COURSES } from '../core/course/context'

interface Props {
  courses: Course[]
  activeId: string
  onSelect: (id: string) => void
  onCreate: (name: string) => void
}

export function CourseChips({ courses, activeId, onSelect, onCreate }: Props) {
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const cancelled = useRef(false)

  function commit() {
    if (cancelled.current) {
      cancelled.current = false
      setAdding(false)
      setName('')
      return
    }
    const value = name.trim()
    setAdding(false)
    setName('')
    if (value) onCreate(value)
  }

  return (
    <div className="chips" role="tablist" aria-label="课程">
      <button
        type="button"
        role="tab"
        aria-selected={activeId === ALL_COURSES}
        className={`chip${activeId === ALL_COURSES ? ' is-active' : ''}`}
        onClick={() => onSelect(ALL_COURSES)}
      >
        全部
      </button>

      {courses
        .filter((course) => !course.archived)
        .map((course) => (
          <button
            key={course.id}
            type="button"
            role="tab"
            aria-selected={activeId === course.id}
            className={`chip${activeId === course.id ? ' is-active' : ''}`}
            onClick={() => onSelect(course.id)}
          >
            {course.name}
          </button>
        ))}

      {adding ? (
        <input
          className="chip chip--input"
          autoFocus
          value={name}
          maxLength={12}
          placeholder="课程名"
          onChange={(event) => setName(event.target.value)}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === 'Enter') event.currentTarget.blur()
            if (event.key === 'Escape') {
              cancelled.current = true
              event.currentTarget.blur()
            }
          }}
        />
      ) : (
        <button
          type="button"
          className="chip chip--add"
          aria-label="新建课程"
          onClick={() => setAdding(true)}
        >
          <Plus size={14} strokeWidth={2} />
        </button>
      )}
    </div>
  )
}
