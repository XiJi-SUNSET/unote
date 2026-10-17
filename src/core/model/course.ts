/** 课程（笔记的唯一分组维度）。'inbox' 是保留课程，不可删除、不可改名。 */

export const INBOX_ID = 'inbox'
export const INBOX_NAME = '未分类'

export interface Course {
  id: string
  /** 课程名，可重命名 */
  name: string
  /** 手动排序，小的在前 */
  order: number
  /** 归档后不在切换条出现，笔记仍保留 */
  archived: boolean
  createdAt: number
}

export function createCourse(args: { id: string; name: string; order: number; now?: number }): Course {
  return {
    id: args.id,
    name: args.name.trim(),
    order: args.order,
    archived: false,
    createdAt: args.now ?? Date.now(),
  }
}

export function inboxCourse(now = 0): Course {
  return {
    id: INBOX_ID,
    name: INBOX_NAME,
    order: 0,
    archived: false,
    createdAt: now,
  }
}
