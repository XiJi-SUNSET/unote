import { describe, expect, it } from 'vitest'
import { createNote } from './model/note'
import { TRASH_TTL_DAYS, isTrashExpired, trashDeadline } from './trash'

const NOW = new Date('2026-10-18T12:00:00Z').getTime()
const DAY = 24 * 60 * 60 * 1000

function deletedDaysAgo(days: number) {
  return { ...createNote({ id: 'N1', courseId: 'inbox', now: NOW }), deletedAt: NOW - days * DAY }
}

describe('回收站过期', () => {
  it('保留期是 30 天', () => {
    expect(TRASH_TTL_DAYS).toBe(30)
    expect(trashDeadline(NOW)).toBe(NOW - 30 * DAY)
  })

  it('未删除的笔记永不过期', () => {
    expect(isTrashExpired(createNote({ id: 'N1', courseId: 'inbox', now: NOW }), NOW)).toBe(false)
  })

  it('刚删的还在保留期内', () => {
    expect(isTrashExpired(deletedDaysAgo(29), NOW)).toBe(false)
  })

  it('满 30 天即过期', () => {
    expect(isTrashExpired(deletedDaysAgo(30), NOW)).toBe(true)
    expect(isTrashExpired(deletedDaysAgo(31), NOW)).toBe(true)
  })
})
