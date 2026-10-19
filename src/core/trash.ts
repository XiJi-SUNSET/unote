import type { Note } from './model/note'

/**
 * 回收站保留天数。docs/07-interaction-spec.md §5 与设置页文案都以它为准。
 * 单机没有墓碑记录，过期即物理删除。
 */
export const TRASH_TTL_DAYS = 30

const DAY_MS = 24 * 60 * 60 * 1000

/** 早于这个时间点删除的笔记就算过期。 */
export function trashDeadline(now = Date.now()): number {
  return now - TRASH_TTL_DAYS * DAY_MS
}

/** 纯函数，方便测边界；列表与清理都从这里取判断。 */
export function isTrashExpired(note: Note, now = Date.now()): boolean {
  if (note.deletedAt === null) return false
  return note.deletedAt <= trashDeadline(now)
}
