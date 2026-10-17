import type { CourseRepo } from '../../core/ports'
import { INBOX_ID, createCourse, inboxCourse, type Course } from '../../core/model/course'
import { newId } from '../../core/ids'
import { db } from './schema'

export const courseRepo: CourseRepo = {
  async list() {
    const courses = await db.courses.toArray()
    return courses.sort((a, b) => a.order - b.order)
  },

  async ensureInbox() {
    const existing = await db.courses.get(INBOX_ID)
    if (existing) return existing
    const inbox = inboxCourse(Date.now())
    await db.courses.put(inbox)
    return inbox
  },

  async create(name, order) {
    const course = createCourse({ id: newId(), name, order })
    await db.courses.put(course)
    return course
  },

  async rename(id, name) {
    if (id === INBOX_ID) throw new Error('未分类不可改名')
    await db.courses.update(id, { name: name.trim() })
  },

  async remove(id) {
    if (id === INBOX_ID) throw new Error('未分类不可删除')
    // 先迁移笔记，再删课程：任何一步失败都不会留下孤儿笔记
    await db.notes.where('courseId').equals(id).modify({ courseId: INBOX_ID })
    await db.courses.delete(id)
  },
}

export async function nextCourseOrder(): Promise<number> {
  const courses: Course[] = await db.courses.toArray()
  return courses.reduce((max, course) => Math.max(max, course.order), 0) + 1
}
