import type { Course } from '../model/course'
import type { Note } from '../model/note'
import { buildManifest } from './format'

export interface ExportAsset {
  id: string
  ext: string
  mime: string
  bytes: Uint8Array
}

export interface BackupInput {
  notes: Note[]
  courses: Course[]
  assets: ExportAsset[]
  settings: Record<string, unknown>
  appVersion: string
  now?: Date
}

const encoder = new TextEncoder()

function text(value: string): Uint8Array {
  return encoder.encode(value)
}

/** JSON 字符串在 YAML 里也是合法的双引号标量，省掉一套转义规则。 */
function scalar(value: string): string {
  return JSON.stringify(value)
}

function isoDate(timestamp: number): string {
  return new Date(timestamp).toISOString()
}

function datePart(timestamp: number): string {
  return isoDate(timestamp).slice(0, 10)
}

export function assetExtFromMime(mime: string): string {
  if (mime.includes('png')) return 'png'
  if (mime.includes('jpeg') || mime.includes('jpg')) return 'jpg'
  if (mime.includes('gif')) return 'gif'
  if (mime.includes('avif')) return 'avif'
  return 'webp'
}

/** 导出时把 `asset:<id>` 改写成包内相对路径 `assets/<id>.<ext>`。 */
export function rewriteAssetLinksToPaths(body: string, extById: Map<string, string>): string {
  return body.replace(/asset:([A-Za-z0-9_-]+)/g, (match, id: string) => {
    const ext = extById.get(id)
    return ext ? `assets/${id}.${ext}` : match
  })
}

export function serializeNote(note: Note, courseName: string, extById: Map<string, string>): string {
  const frontmatter = [
    '---',
    `id: ${scalar(note.id)}`,
    `course: ${scalar(courseName)}`,
    `courseId: ${scalar(note.courseId)}`,
    `title: ${scalar(note.title)}`,
    `created: ${scalar(isoDate(note.createdAt))}`,
    `updated: ${scalar(isoDate(note.updatedAt))}`,
    `tags: ${JSON.stringify(note.tags)}`,
    `pinned: ${note.pinned ? 'true' : 'false'}`,
    `schema: ${note.schema}`,
    '---',
    '',
  ].join('\n')

  return frontmatter + rewriteAssetLinksToPaths(note.body, extById)
}

export function buildBackup(input: BackupInput): Record<string, Uint8Array> {
  const entries: Record<string, Uint8Array> = {}
  const extById = new Map(input.assets.map((asset) => [asset.id, asset.ext]))
  const nameById = new Map(input.courses.map((course) => [course.id, course.name]))

  for (const note of input.notes) {
    const courseName = nameById.get(note.courseId) ?? '未分类'
    const filename = `notes/${datePart(note.createdAt)}-${note.id.slice(0, 10)}.md`
    entries[filename] = text(serializeNote(note, courseName, extById))
  }

  for (const asset of input.assets) {
    entries[`assets/${asset.id}.${asset.ext}`] = asset.bytes
  }

  entries['courses.json'] = text(
    JSON.stringify(
      input.courses.map((course) => ({
        id: course.id,
        name: course.name,
        order: course.order,
        archived: course.archived,
        createdAt: course.createdAt,
      })),
      null,
      2,
    ),
  )

  entries['settings.json'] = text(JSON.stringify(input.settings, null, 2))

  entries['manifest.json'] = text(
    JSON.stringify(
      buildManifest({
        notes: input.notes.length,
        courses: input.courses.length,
        assets: input.assets.length,
        appVersion: input.appVersion,
        now: input.now,
      }),
      null,
      2,
    ),
  )

  return entries
}
