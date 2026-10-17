import { Settings } from 'lucide-react'
import { useApp } from '../stores/appStore'
import { ALL_COURSES } from '../core/course/context'
import { CourseChips } from '../components/CourseChips'
import { NoteCard } from '../components/NoteCard'
import { QuickCapture } from '../components/QuickCapture'

export function ListScreen() {
  const courses = useApp((state) => state.courses)
  const notes = useApp((state) => state.notes)
  const activeCourseId = useApp((state) => state.activeCourseId)
  const setActiveCourse = useApp((state) => state.setActiveCourse)
  const addCourse = useApp((state) => state.addCourse)
  const openNote = useApp((state) => state.openNote)
  const goSettings = useApp((state) => state.goSettings)

  const showCourseName = activeCourseId === ALL_COURSES
  const courseName = (id: string) => courses.find((course) => course.id === id)?.name

  return (
    <section className="list">
      <header className="topbar">
        <span className="brand">Unote</span>
        <button type="button" className="icon-btn" aria-label="设置" onClick={() => void goSettings()}>
          <Settings size={18} />
        </button>
      </header>

      <CourseChips
        courses={courses}
        activeId={activeCourseId}
        onSelect={(id) => void setActiveCourse(id)}
        onCreate={(name) => void addCourse(name)}
      />

      <div className="notes">
        {notes.length === 0 ? (
          <div className="empty">
            <p className="empty__title">还没有笔记</p>
            <p className="empty__hint">在下面写一句，回车就存下。</p>
          </div>
        ) : (
          notes.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              courseName={showCourseName ? courseName(note.courseId) : undefined}
              onOpen={(id) => void openNote(id)}
            />
          ))
        )}
      </div>

      <QuickCapture />
    </section>
  )
}
