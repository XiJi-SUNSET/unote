import { INBOX_ID, type Course } from '../model/course'
import { SCHEMA_VERSION, deriveTitle, type Note } from '../model/note'
import { BackupError, parseManifest, type BackupManifest } from './format'

export interface ImportedAsset {
  id: string
  mime: string
  bytes: Uint8Array
}

export interface BackupBundle {
  notes: Note[]
  courses: Course[]
  assets: ImportedAsset[]
  settings: Record<string, unknown>
  manifest: BackupManifest
  skipped: number
}

const decoder = new TextDecoder()

function decodeText(bytes: Uint8Array): string {
  return decoder.decode(bytes)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** 拒绝 zip slip：绝对路径、`..`、反斜杠一律整包拒绝。 */
function isSafePath(path: string): boolean {
  if (!path) return false
  if (path.startsWith('/') || path.startsWith('\\')) return false
  if (path.includes('..') || path.includes('\\')) return false
  return true
}

function mimeFromExt(ext: string): string {
  if (ext === 'png') return 'image/png'
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg'
  if (ext === 'gif') return 'image/gif'
  if (ext === 'avif') return 'image/avif'
  return 'image/webp'
}

function splitFrontmatter(raw: string): { meta: string; body: string } {
  const normalized = raw.replace(/^\uFEFF/, '')
  if (!normalized.startsWith('---')) return { meta: '', body: normalized }
  const end = normalized.indexOf('\n---', 3)
  if (end < 0) return { meta: '', body: normalized }
  return {
    meta: normalized.slice(3, end).trim(),
    body: normalized.slice(end + 4).replace(/^\r?\n/, ''),
  }
}

function parseScalar(value: string): unknown {
  const trimmed = value.trim()
  if (!trimmed) return null
  if (trimmed.startsWith('"') || trimmed.startsWith('[') || trimmed.startsWith('{')) {
    try {
      return JSON.parse(trimmed)
    } catch {
      return trimmed
    }
  }
  if (trimmed === 'true') return true
  if (trimmed === 'false') return false
  if (trimmed === 'null') return null
  return trimmed
}

function parseFrontmatter(meta: string): Record<string, unknown> {
  const fields: Record<string, unknown> = {}
  for (const line of meta.split('\n')) {
    const index = line.indexOf(':')
    if (index <= 0) continue
    const key = line.slice(0, index).trim()
    fields[key] = parseScalar(line.slice(index + 1))
  }
  return fields
}

function toTime(value: unknown): number | null {
  if (typeof value !== 'string') return null
  const parsed = Date.parse(value)
  return Number.isNaN(parsed) ? null : parsed
}

function parseNote(raw: string, courseIds: Set<string>, fallbackCourseId: string): Note | null {
  const { meta, body } = splitFrontmatter(raw)
  const fields = parseFrontmatter(meta)

  const id = typeof fields.id === 'string' ? fields.id.trim() : ''
  if (!id) return null

  const normalizedBody = body.replace(/assets\/([A-Za-z0-9_-]+)\.[a-z0-9]+/g, (_match, assetId: string) => `asset:${assetId}`)

  const createdAt = toTime(fields.created) ?? Date.now()
  const updatedAt = toTime(fields.updated) ?? createdAt
  const rawCourseId = typeof fields.courseId === 'string' ? fields.courseId : ''
  const courseId = courseIds.has(rawCourseId) ? rawCourseId : fallbackCourseId

  const tags = Array.isArray(fields.tags) ? fields.tags.filter((tag): tag is string => typeof tag === 'string') : []

  return {
    id,
    courseId,
    title: deriveTitle(normalizedBody),
    body: normalizedBody,
    tags,
    pinned: fields.pinned === true,
    createdAt,
    updatedAt,
    deletedAt: null,
    schema: SCHEMA_VERSION,
  }
}

function parseCourses(raw: Uint8Array | undefined): Course[] {
  if (!raw) return []
  try {
    const data: unknown = JSON.parse(decodeText(raw))
    if (!Array.isArray(data)) return []
    return data.filter(isRecord).flatMap((item) => {
      const id = typeof item.id === 'string' ? item.id : ''
      if (!id) return []
      return [
        {
          id,
          name: typeof item.name === 'string' && item.name ? item.name : '未命名',
          order: typeof item.order === 'number' ? item.order : 0,
          archived: item.archived === true,
          createdAt: typeof item.createdAt === 'number' ? item.createdAt : 0,
        },
      ]
    })
  } catch {
    return []
  }
}

function parseSettings(raw: Uint8Array | undefined): Record<string, unknown> {
  if (!raw) return {}
  try {
    const data: unknown = JSON.parse(decodeText(raw))
    return isRecord(data) ? data : {}
  } catch {
    return {}
  }
}

export function readBackup(entries: Record<string, Uint8Array>): BackupBundle {
  for (const path of Object.keys(entries)) {
    if (!isSafePath(path)) throw new BackupError(`备份包含不安全的路径：${path}`)
  }

  const manifestBytes = entries['manifest.json']
  if (!manifestBytes) throw new BackupError('缺少 manifest.json，可能不是 Unote 备份包')
  const manifest = parseManifest(decodeText(manifestBytes))

  const courses = parseCourses(entries['courses.json'])
  const courseIds = new Set(courses.map((course) => course.id))
  // 包里没有课程表时，全部落到未分类（docs/03 §5.2）
  const fallbackCourseId = INBOX_ID

  const assets: ImportedAsset[] = []
  for (const [path, bytes] of Object.entries(entries)) {
    const match = /^assets\/([A-Za-z0-9_-]+)\.([a-z0-9]+)$/.exec(path)
    if (!match) continue
    const id = match[1]
    const ext = match[2]
    if (!id || !ext) continue
    assets.push({ id, mime: mimeFromExt(ext), bytes })
  }

  const notes: Note[] = []
  let skipped = 0
  for (const [path, bytes] of Object.entries(entries)) {
    if (!path.startsWith('notes/') || !path.endsWith('.md')) continue
    const note = parseNote(decodeText(bytes), courseIds, fallbackCourseId)
    if (note) notes.push(note)
    else skipped += 1
  }

  return { notes, courses, assets, settings: parseSettings(entries['settings.json']), manifest, skipped }
}
