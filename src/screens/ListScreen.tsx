import { useState } from 'react'
import { Pin, PinOff, Settings, Trash2 } from 'lucide-react'
import { useApp } from '../stores/appStore'
import { ALL_COURSES } from '../core/course/context'
import { CourseChips } from '../components/CourseChips'
import { NoteCard } from '../components/NoteCard'
import { QuickCapture } from '../components/QuickCapture'
import { SwipeCard } from '../components/SwipeCard'

export function ListScreen() {
  const courses = useApp((state) => state.courses)
  const notes = useApp((state) => state.notes)
  const activeCourseId = useApp((state) => state.activeCourseId)
  const setActiveCourse = useApp((state) => state.setActiveCourse)
  const addCourse = useApp((state) => state.addCourse)
  const openNote = useApp((state) => state.openNote)
  const pinNote = useApp((state) => state.pinNote)
  const deleteNote = useApp((state) => state.deleteNote)
  const goSettings = useApp((state) => state.goSettings)

  const [openId, setOpenId] = useState<string | null>(null)

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
        onSelect={(id) => {
          setOpenId(null)
          void setActiveCourse(id)
        }}
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
            <SwipeCard
              key={note.id}
              open={openId === note.id}
              onOpenChange={(open) => setOpenId(open ? note.id : null)}
              actions={
                <>
                  <button
                    type="button"
                    className="swipe__action swipe__action--pin"
                    onClick={() => {
                      setOpenId(null)
                      void pinNote(note.id, !note.pinned)
                    }}
                  >
                    {note.pinned ? <PinOff size={16} /> : <Pin size={16} />}
                    {note.pinned ? '取消' : '置顶'}
                  </button>
                  <button
                    type="button"
                    className="swipe__action swipe__action--danger"
                    onClick={() => {
                      setOpenId(null)
                      void deleteNote(note.id)
                    }}
                  >
                    <Trash2 size={16} />
                    删除
                  </button>
                </>
              }
            >
              <NoteCard
                note={note}
                courseName={showCourseName ? courseName(note.courseId) : undefined}
                onOpen={(id) => {
                  if (openId) {
                    setOpenId(null)
                    return
                  }
                  void openNote(id)
                }}
              />
            </SwipeCard>
          ))
        )}
      </div>

      <QuickCapture />
    </section>
  )
}
