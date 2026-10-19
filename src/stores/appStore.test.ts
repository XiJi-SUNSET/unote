import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { registerDraftFlush, useApp } from './appStore'
import { db } from '../infra/db/schema'
import { INBOX_ID } from '../core/model/course'
import { ALL_COURSES } from '../core/course/context'

const DAY_MS = 24 * 60 * 60 * 1000

beforeEach(async () => {
  db.close()
  await db.delete()
  await db.open()
  registerDraftFlush(null)
  useApp.setState({
    ready: false,
    screen: 'list',
    courses: [],
    notes: [],
    deleted: [],
    activeCourseId: ALL_COURSES,
    lastCourseId: INBOX_ID,
    editing: null,
  })
})

describe('appStore', () => {
  it('冷启动会建立 inbox 兜底课程', async () => {
    await useApp.getState().boot()
    expect(useApp.getState().courses.map((course) => course.id)).toContain(INBOX_ID)
  })

  it('新建笔记继承当前课程，标题取首行', async () => {
    await useApp.getState().boot()
    await useApp.getState().addCourse('高等数学')

    const active = useApp.getState().activeCourseId
    expect(active).not.toBe(ALL_COURSES)

    await useApp.getState().createNote('# 三次握手\n\n老师说两次不够')
    const note = useApp.getState().notes[0]

    expect(note?.courseId).toBe(active)
    expect(note?.title).toBe('三次握手')
  })

  it('删除进回收站，恢复后课程不变', async () => {
    await useApp.getState().boot()
    await useApp.getState().addCourse('计算机网络')
    const courseId = useApp.getState().activeCourseId

    await useApp.getState().createNote('要问的问题')
    const created = useApp.getState().notes[0]
    expect(created).toBeDefined()
    if (!created) return

    await useApp.getState().deleteNote(created.id)
    expect(useApp.getState().notes).toHaveLength(0)

    await useApp.getState().loadDeleted()
    expect(useApp.getState().deleted.map((note) => note.id)).toContain(created.id)

    await useApp.getState().restoreNote(created.id)
    const restored = useApp.getState().notes.find((note) => note.id === created.id)
    expect(restored?.courseId).toBe(courseId)
  })

  it('删除课程时笔记迁到未分类，不级联删除', async () => {
    await useApp.getState().boot()
    await useApp.getState().addCourse('要删的课')
    const courseId = useApp.getState().activeCourseId

    await useApp.getState().createNote('一条笔记')
    const created = useApp.getState().notes[0]
    expect(created?.courseId).toBe(courseId)

    await useApp.getState().deleteCourse(courseId)

    const state = useApp.getState()
    expect(state.courses.some((course) => course.id === courseId)).toBe(false)
    const moved = state.notes.find((note) => note.id === created?.id)
    expect(moved?.courseId).toBe(INBOX_ID)
  })

  it('保存正文会同步更新标题', async () => {
    await useApp.getState().boot()
    await useApp.getState().createNote('旧标题')
    const note = useApp.getState().notes[0]
    if (!note) throw new Error('note missing')

    await useApp.getState().openNote(note.id)
    await useApp.getState().saveNote({ body: '新标题\n正文' })

    expect(useApp.getState().editing?.title).toBe('新标题')
    expect(useApp.getState().notes[0]?.title).toBe('新标题')
  })

  it('关编辑屏前先落盘草稿（物理返回键走的就是这条路）', async () => {
    await useApp.getState().boot()
    await useApp.getState().createNote('初稿')
    const note = useApp.getState().notes[0]
    if (!note) throw new Error('note missing')

    await useApp.getState().openNote(note.id)
    registerDraftFlush(() => useApp.getState().saveNote({ body: '按返回前的最后一句' }))

    await useApp.getState().closeEditor()

    expect(useApp.getState().screen).toBe('list')
    expect((await db.notes.get(note.id))?.body).toBe('按返回前的最后一句')
  })

  it('删除正在编辑的笔记不会被 flush 复活', async () => {
    await useApp.getState().boot()
    await useApp.getState().createNote('初稿')
    const note = useApp.getState().notes[0]
    if (!note) throw new Error('note missing')

    await useApp.getState().openNote(note.id)
    registerDraftFlush(() => useApp.getState().saveNote({ body: '不该写回去' }))

    await useApp.getState().deleteNote(note.id)

    const stored = await db.notes.get(note.id)
    expect(stored?.deletedAt).not.toBeNull()
    expect(stored?.body).toBe('初稿')
  })

  it('启动时清掉回收站里超过 30 天的笔记', async () => {
    await useApp.getState().boot()
    await useApp.getState().createNote('放太久了')
    const note = useApp.getState().notes[0]
    if (!note) throw new Error('note missing')

    await db.notes.update(note.id, { deletedAt: Date.now() - 31 * DAY_MS })
    await useApp.getState().boot()

    expect(await db.notes.get(note.id)).toBeUndefined()
  })

  it('回收站里还在 30 天内的笔记不会被清掉', async () => {
    await useApp.getState().boot()
    await useApp.getState().createNote('昨天删的')
    const note = useApp.getState().notes[0]
    if (!note) throw new Error('note missing')

    await db.notes.update(note.id, { deletedAt: Date.now() - 2 * DAY_MS })
    await useApp.getState().boot()

    expect(await db.notes.get(note.id)).toBeDefined()
  })
})
