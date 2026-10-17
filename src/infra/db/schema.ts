import Dexie, { type Table } from 'dexie'
import type { Asset, Note } from '../../core/model/note'
import type { Course } from '../../core/model/course'

export interface SettingRow {
  key: string
  value: unknown
}

/**
 * 表结构与索引的语义见 docs/03-data-backup.md §1。
 * 改 schema 必须同时升 version() 并写迁移，且迁移前先快照。
 */
export class UnoteDB extends Dexie {
  notes!: Table<Note, string>
  courses!: Table<Course, string>
  assets!: Table<Asset, string>
  settings!: Table<SettingRow, string>

  constructor(name = 'unote') {
    super(name)
    this.version(1).stores({
      notes: '&id, courseId, updatedAt, createdAt, pinned, deletedAt',
      courses: '&id, order',
      assets: '&id, createdAt',
      settings: '&key',
    })
  }
}

export const db = new UnoteDB()
