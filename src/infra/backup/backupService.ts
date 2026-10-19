import { INBOX_ID } from '../../core/model/course'
import { assetExtFromMime, buildBackup, type ExportAsset } from '../../core/backup/export'
import { readBackup } from '../../core/backup/import'
import { APP_VERSION } from '../../core/version'
import { db, type SettingRow } from '../db/schema'
import { assetRepo } from '../db/assetRepo'
import { courseRepo } from '../db/courseRepo'
import { noteRepo } from '../db/noteRepo'
import { unzipEntries, zipEntries } from './zip'

const EXPORT_SETTINGS = new Set(['theme', 'overlay', 'blur', 'bgBlur', 'card', 'sheet'])

const THEMES = new Set(['auto', 'light', 'dark'])
const GLASS_KEYS = ['overlay', 'blur', 'bgBlur', 'card', 'sheet'] as const

/**
 * 包里带回来的阅读设置要先过一遍再写库：zip 是外部输入，
 * 一个 `theme: "solarized"` 或者 `card: "abc"` 不该把界面弄坏。
 */
function sanitizeSettings(settings: Record<string, unknown>): SettingRow[] {
  const rows: SettingRow[] = []

  const { theme } = settings
  if (typeof theme === 'string' && THEMES.has(theme)) rows.push({ key: 'theme', value: theme })

  for (const key of GLASS_KEYS) {
    const value = settings[key]
    if (typeof value !== 'number' || !Number.isFinite(value)) continue
    rows.push({ key, value: Math.min(100, Math.max(0, Math.round(value))) })
  }

  return rows
}

export interface ExportResult {
  blob: Blob
  filename: string
  counts: { notes: number; courses: number; assets: number }
}

export interface ImportResult {
  added: number
  updated: number
  skipped: number
  courses: number
  assets: number
}

function filenameStamp(now = new Date()): string {
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`
}

/** Uint8Array 的底层 buffer 可能是 SharedArrayBuffer，Blob 只接受 ArrayBuffer，复制一份最稳。 */
function blobFromBytes(bytes: Uint8Array, type: string): Blob {
  const copy = new Uint8Array(bytes.byteLength)
  copy.set(bytes)
  return new Blob([copy.buffer], { type })
}

export async function exportBackup(): Promise<ExportResult> {
  const [notes, courses] = await Promise.all([noteRepo.listAll(), courseRepo.list()])

  // 只导出被正文引用到的图片，孤立资源不进包
  const referenced = new Set<string>()
  for (const note of notes) {
    for (const match of note.body.matchAll(/asset:([A-Za-z0-9_-]+)/g)) {
      const id = match[1]
      if (id) referenced.add(id)
    }
  }

  const assets: ExportAsset[] = []
  for (const id of referenced) {
    const asset = await assetRepo.get(id)
    if (!asset) continue
    assets.push({
      id,
      ext: assetExtFromMime(asset.mime),
      mime: asset.mime,
      bytes: new Uint8Array(await asset.blob.arrayBuffer()),
    })
  }

  const rows = await db.settings.toArray()
  const settings: Record<string, unknown> = {}
  for (const row of rows) {
    if (EXPORT_SETTINGS.has(row.key)) settings[row.key] = row.value
  }

  const entries = buildBackup({ notes, courses, assets, settings, appVersion: APP_VERSION })
  const zipped = zipEntries(entries)

  return {
    blob: blobFromBytes(zipped, 'application/zip'),
    filename: `unote-${filenameStamp()}.zip`,
    counts: { notes: notes.length, courses: courses.length, assets: assets.length },
  }
}

export async function importBackup(file: File, mode: 'merge' | 'replace'): Promise<ImportResult> {
  const data = new Uint8Array(await file.arrayBuffer())
  const bundle = readBackup(unzipEntries(data))

  let added = 0
  let updated = 0
  let skipped = bundle.skipped

  // 壁纸是这台设备的偏好，不在备份包里。覆盖模式要清 assets，
  // 所以先把当前壁纸捞出来，清完再放回去，否则设置里的 wallpaperId 会指向空。
  const wallpaperRow = await db.settings.get('wallpaperId')
  const wallpaperId = typeof wallpaperRow?.value === 'string' ? wallpaperRow.value : null
  const wallpaper = wallpaperId ? await db.assets.get(wallpaperId) : undefined

  await db.transaction('rw', db.notes, db.courses, db.assets, db.settings, async () => {
    if (mode === 'replace') {
      const inbox = await db.courses.get(INBOX_ID)
      await db.notes.clear()
      await db.assets.clear()
      await db.courses.clear()
      if (inbox) await db.courses.put(inbox)
      if (wallpaper) await db.assets.put(wallpaper)

      // 覆盖模式就是整机迁移，包里的阅读设置跟着一起恢复
      for (const row of sanitizeSettings(bundle.settings)) await db.settings.put(row)
    }

    // 课程：先按 id 匹配，再按名字匹配，都没有才新建（改名后导入不会拆出重复课程）
    for (const course of bundle.courses) {
      if (course.id === INBOX_ID) continue
      const byId = await db.courses.get(course.id)
      if (byId) {
        await db.courses.put({ ...byId, ...course })
        continue
      }
      const all = await db.courses.toArray()
      if (all.some((existing) => existing.name === course.name)) continue
      await db.courses.put(course)
    }

    for (const asset of bundle.assets) {
      const existing = await db.assets.get(asset.id)
      if (existing) continue
      await db.assets.put({
        id: asset.id,
        blob: blobFromBytes(asset.bytes, asset.mime),
        mime: asset.mime,
        width: 0,
        height: 0,
        bytes: asset.bytes.byteLength,
        createdAt: Date.now(),
      })
    }

    for (const note of bundle.notes) {
      const existing = await db.notes.get(note.id)
      if (!existing) {
        await db.notes.put(note)
        added += 1
      } else if (note.updatedAt > existing.updatedAt) {
        await db.notes.put(note)
        updated += 1
      } else {
        skipped += 1
      }
    }
  })

  return { added, updated, skipped, courses: bundle.courses.length, assets: bundle.assets.length }
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  setTimeout(() => URL.revokeObjectURL(url), 4000)
}
