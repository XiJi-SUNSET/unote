import { create } from 'zustand'
import { newId } from '../core/ids'
import { createNote, deriveTitle, type Note } from '../core/model/note'
import { INBOX_ID, type Course } from '../core/model/course'
import { ALL_COURSES, resolveCourseId } from '../core/course/context'
import { noteRepo } from '../infra/db/noteRepo'
import { courseRepo, nextCourseOrder } from '../infra/db/courseRepo'
import { getSetting, setSetting } from '../infra/db/settingsRepo'

export type Screen = 'list' | 'editor' | 'settings'

const KEY_LAST_NOTE = 'lastNoteId'
const KEY_LAST_COURSE = 'lastCourseId'
const KEY_ACTIVE_COURSE = 'activeCourseId'

type EditablePatch = Partial<Pick<Note, 'body' | 'title' | 'courseId' | 'pinned'>>

interface AppState {
  ready: boolean
  screen: Screen
  courses: Course[]
  notes: Note[]
  deleted: Note[]
  activeCourseId: string
  lastCourseId: string
  editing: Note | null

  boot: () => Promise<void>
  refresh: () => Promise<void>
  loadDeleted: () => Promise<void>

  openNote: (id: string) => Promise<void>
  closeEditor: () => Promise<void>
  createNote: (body: string) => Promise<Note | null>
  saveNote: (patch: EditablePatch) => Promise<void>
  pinNote: (id: string, pinned: boolean) => Promise<void>
  deleteNote: (id: string) => Promise<void>
  restoreNote: (id: string) => Promise<void>
  purgeNote: (id: string) => Promise<void>

  setActiveCourse: (id: string) => Promise<void>
  addCourse: (name: string) => Promise<void>

  goList: () => Promise<void>
  goSettings: () => Promise<void>
}

async function loadNotes(activeCourseId: string): Promise<Note[]> {
  return activeCourseId === ALL_COURSES
    ? noteRepo.listAll()
    : noteRepo.listByCourse(activeCourseId)
}

export const useApp = create<AppState>()((set, get) => ({
  ready: false,
  screen: 'list',
  courses: [],
  notes: [],
  deleted: [],
  activeCourseId: ALL_COURSES,
  lastCourseId: INBOX_ID,
  editing: null,

  async boot() {
    await courseRepo.ensureInbox()
    const courses = await courseRepo.list()

    const [lastNoteId, lastCourseId, activeCourseId] = await Promise.all([
      getSetting<string | null>(KEY_LAST_NOTE, null),
      getSetting<string>(KEY_LAST_COURSE, INBOX_ID),
      getSetting<string>(KEY_ACTIVE_COURSE, ALL_COURSES),
    ])

    const active =
      activeCourseId === ALL_COURSES || courses.some((course) => course.id === activeCourseId)
        ? activeCourseId
        : ALL_COURSES

    // 冷启动直接回到上一篇（docs/07-interaction-spec.md §2.1）
    let editing: Note | null = null
    if (lastNoteId) {
      const note = await noteRepo.get(lastNoteId)
      if (note && note.deletedAt === null) editing = note
    }

    set({
      ready: true,
      courses,
      notes: await loadNotes(active),
      activeCourseId: active,
      lastCourseId,
      editing,
      screen: editing ? 'editor' : 'list',
    })
  },

  async refresh() {
    const { activeCourseId } = get()
    const courses = await courseRepo.list()
    set({ courses, notes: await loadNotes(activeCourseId) })
  },

  async loadDeleted() {
    set({ deleted: await noteRepo.listDeleted() })
  },

  async openNote(id) {
    const note = await noteRepo.get(id)
    if (!note) return
    await setSetting(KEY_LAST_NOTE, id)
    set({ editing: note, screen: 'editor' })
  },

  async closeEditor() {
    set({ editing: null, screen: 'list' })
    await get().refresh()
  },

  async createNote(body) {
    const state = get()
    const courseId = resolveCourseId({
      activeCourseId: state.activeCourseId === ALL_COURSES ? null : state.activeCourseId,
      lastCourseId: state.lastCourseId,
      existingIds: state.courses.map((course) => course.id),
    })

    const note = createNote({ id: newId(), courseId, body })
    await noteRepo.upsert(note)
    await setSetting(KEY_LAST_COURSE, courseId)
    set({ lastCourseId: courseId })
    await setSetting(KEY_LAST_NOTE, note.id)
    await get().refresh()
    return note
  },

  async saveNote(patch) {
    const current = get().editing
    if (!current) return

    const body = patch.body ?? current.body
    const next: Note = {
      ...current,
      ...patch,
      body,
      title: patch.title ?? deriveTitle(body),
      updatedAt: Date.now(),
    }

    await noteRepo.upsert(next)
    await setSetting(KEY_LAST_NOTE, next.id)
    set((state) => ({
      editing: next,
      notes: state.notes.map((note) => (note.id === next.id ? next : note)),
    }))
  },

  async pinNote(id, pinned) {
    const note = await noteRepo.get(id)
    if (!note) return
    await noteRepo.upsert({ ...note, pinned, updatedAt: Date.now() })
    await get().refresh()
  },

  async deleteNote(id) {
    await noteRepo.softDelete(id)
    const { editing } = get()
    if (editing?.id === id) await get().closeEditor()
    else await get().refresh()
  },

  async restoreNote(id) {
    await noteRepo.restore(id)
    await Promise.all([get().refresh(), get().loadDeleted()])
  },

  async purgeNote(id) {
    await noteRepo.purge(id)
    await get().loadDeleted()
  },

  async setActiveCourse(id) {
    await setSetting(KEY_ACTIVE_COURSE, id)
    set({ activeCourseId: id, notes: await loadNotes(id) })
  },

  async addCourse(name) {
    const trimmed = name.trim()
    if (!trimmed) return
    const course = await courseRepo.create(trimmed, await nextCourseOrder())
    await get().refresh()
    await get().setActiveCourse(course.id)
  },

  async goList() {
    set({ screen: 'list' })
    await get().refresh()
  },

  async goSettings() {
    set({ screen: 'settings' })
    await get().loadDeleted()
  },
}))
