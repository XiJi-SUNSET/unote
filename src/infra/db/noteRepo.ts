import type { NoteRepo } from '../../core/ports'
import type { Note } from '../../core/model/note'
import { db } from './schema'

/** 置顶优先，其余按更新时间倒序。 */
function byPinnedThenRecent(a: Note, b: Note): number {
  if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
  return b.updatedAt - a.updatedAt
}

export const noteRepo: NoteRepo = {
  async listAll() {
    const notes = await db.notes.toArray()
    return notes.filter((note) => note.deletedAt === null).sort(byPinnedThenRecent)
  },

  async listByCourse(courseId) {
    const notes = await db.notes.where('courseId').equals(courseId).toArray()
    return notes.filter((note) => note.deletedAt === null).sort(byPinnedThenRecent)
  },

  async countByCourse() {
    const notes = await db.notes.toArray()
    const counts: Record<string, number> = {}
    for (const note of notes) {
      if (note.deletedAt !== null) continue
      counts[note.courseId] = (counts[note.courseId] ?? 0) + 1
    }
    return counts
  },

  async get(id) {
    return db.notes.get(id)
  },

  async upsert(note) {
    await db.notes.put(note)
  },

  async softDelete(id, now = Date.now()) {
    await db.notes.update(id, { deletedAt: now, updatedAt: now })
  },

  async restore(id) {
    await db.notes.update(id, { deletedAt: null, updatedAt: Date.now() })
  },

  async listDeleted() {
    const notes = await db.notes.toArray()
    return notes
      .filter((note) => note.deletedAt !== null)
      .sort((a, b) => (b.deletedAt ?? 0) - (a.deletedAt ?? 0))
  },

  async purge(id) {
    await db.notes.delete(id)
  },

  async purgeExpired(before) {
    // deletedAt 上有索引，且 null 不进索引，所以这条只会扫到回收站里的条目
    const ids = await db.notes.where('deletedAt').belowOrEqual(before).primaryKeys()
    if (ids.length > 0) await db.notes.bulkDelete(ids)
    return ids.length
  },
}
