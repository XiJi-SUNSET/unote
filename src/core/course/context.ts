import { INBOX_ID } from '../model/course'

/** 课程筛选条上的"全部"，不是真实课程 id。 */
export const ALL_COURSES = 'all'

export interface CreateContext {
  /** 当前列表选中的课程；null 或 ALL_COURSES 表示跨课程视图 */
  activeCourseId: string | null
  /** 上一次用过的课程 */
  lastCourseId: string | null
  /** 现存课程 id，用来兜底不存在的引用 */
  existingIds: readonly string[]
}

/**
 * 新建笔记落哪门课 —— 上下文即默认值（docs/07-interaction-spec.md §1）。
 * 永不要求用户在创建时做选择。
 */
export function resolveCourseId(ctx: CreateContext): string {
  const preferred =
    ctx.activeCourseId && ctx.activeCourseId !== ALL_COURSES ? ctx.activeCourseId : ctx.lastCourseId

  if (preferred && ctx.existingIds.includes(preferred)) return preferred
  return INBOX_ID
}
