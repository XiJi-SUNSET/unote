import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { useApp } from './appStore'
import { db } from '../infra/db/schema'
import { INBOX_ID } from '../core/model/course'
import { ALL_COURSES } from '../core/course/context'

beforeEach(async () => {
  db.close()
  await db.delete()
  await db.open()
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
})
