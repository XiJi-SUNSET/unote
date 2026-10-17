/** 备份包格式定义，规范见 docs/03-data-backup.md §4。 */

export const BACKUP_FORMAT = 'unote.backup'
export const BACKUP_FORMAT_VERSION = 1

export class BackupError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'BackupError'
  }
}

export interface BackupManifest {
  format: string
  formatVersion: number
  appVersion: string
  exportedAt: string
  counts: { notes: number; courses: number; assets: number }
}

export function buildManifest(args: {
  notes: number
  courses: number
  assets: number
  appVersion: string
  now?: Date
}): BackupManifest {
  return {
    format: BACKUP_FORMAT,
    formatVersion: BACKUP_FORMAT_VERSION,
    appVersion: args.appVersion,
    exportedAt: (args.now ?? new Date()).toISOString(),
    counts: { notes: args.notes, courses: args.courses, assets: args.assets },
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function parseManifest(raw: string): BackupManifest {
  let data: unknown
  try {
    data = JSON.parse(raw)
  } catch {
    throw new BackupError('manifest.json 不是合法的 JSON')
  }

  if (!isRecord(data)) throw new BackupError('manifest.json 结构不对')
  if (data.format !== BACKUP_FORMAT) throw new BackupError('这不是 Unote 的备份包')

  const version = data.formatVersion
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 1) {
    throw new BackupError('备份包缺少有效的 formatVersion')
  }
  if (version > BACKUP_FORMAT_VERSION) {
    throw new BackupError(`备份包版本 ${version} 比当前版本新，请先升级 App`)
  }

  const counts = isRecord(data.counts) ? data.counts : {}
  return {
    format: BACKUP_FORMAT,
    formatVersion: version,
    appVersion: typeof data.appVersion === 'string' ? data.appVersion : 'unknown',
    exportedAt: typeof data.exportedAt === 'string' ? data.exportedAt : '',
    counts: {
      notes: typeof counts.notes === 'number' ? counts.notes : 0,
      courses: typeof counts.courses === 'number' ? counts.courses : 0,
      assets: typeof counts.assets === 'number' ? counts.assets : 0,
    },
  }
}
