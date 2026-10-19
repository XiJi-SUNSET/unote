/**
 * core 层只依赖这些接口，不接触 Dexie / React / Capacitor。
 * 实现位于 infra/，见 docs/02-architecture.md §5。
 */
import type { Course } from './model/course'
import type { Asset, Note } from './model/note'

export interface NoteRepo {
  listAll(): Promise<Note[]>
  listByCourse(courseId: string): Promise<Note[]>
  countByCourse(): Promise<Record<string, number>>
  get(id: string): Promise<Note | undefined>
  upsert(note: Note): Promise<void>
  softDelete(id: string, now?: number): Promise<void>
  restore(id: string): Promise<void>
  listDeleted(): Promise<Note[]>
  purge(id: string): Promise<void>
  /** 物理删除删除时间早于 before 的笔记，返回条数。见 core/trash.ts */
  purgeExpired(before: number): Promise<number>
}

export interface CourseRepo {
  list(): Promise<Course[]>
  ensureInbox(): Promise<Course>
  create(name: string, order: number): Promise<Course>
  rename(id: string, name: string): Promise<void>
  /** 删除课程：其下笔记全部迁到 inbox，绝不级联删除 */
  remove(id: string): Promise<void>
}

export interface AssetRepo {
  put(asset: Asset): Promise<void>
  get(id: string): Promise<Asset | undefined>
  remove(id: string): Promise<void>
}
