/** 条目（笔记）与图片资产的数据模型。字段语义见 docs/03-data-backup.md §2。 */

export const SCHEMA_VERSION = 1 as const

export interface Note {
  id: string
  /** 必填，默认 'inbox'（未分类）；见 core/course/context.ts */
  courseId: string
  /** 显式标题；空串表示"用首行" */
  title: string
  /** Markdown 正文，不含 frontmatter */
  body: string
  tags: string[]
  pinned: boolean
  createdAt: number
  updatedAt: number
  /** 软删除时间戳；null = 未删除。见 docs/07-interaction-spec.md §5 */
  deletedAt: number | null
  schema: typeof SCHEMA_VERSION
}

export interface Asset {
  id: string
  blob: Blob
  mime: string
  width: number
  height: number
  bytes: number
  createdAt: number
}

/**
 * 从正文推导标题：取第一行非空文本，去掉 Markdown 前缀标记。
 * 导出与列表都依赖它，所以保持纯函数、可测试。
 */
export function deriveTitle(body: string, maxLength = 60): string {
  const firstLine = body
    .split('\n')
    .map((line) => line.trim())
    .find((line) => line.length > 0)

  if (!firstLine) return ''

  const cleaned = firstLine
    .replace(/^#{1,6}\s+/, '')
    .replace(/^>\s?/, '')
    .replace(/^[-*+]\s+/, '')
    .replace(/^\d+\.\s+/, '')
    .trim()

  return cleaned.length > maxLength ? `${cleaned.slice(0, maxLength)}…` : cleaned
}

export function createNote(args: {
  id: string
  courseId: string
  body?: string
  title?: string
  now?: number
}): Note {
  const now = args.now ?? Date.now()
  const body = args.body ?? ''
  return {
    id: args.id,
    courseId: args.courseId,
    title: args.title ?? deriveTitle(body),
    body,
    tags: [],
    pinned: false,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    schema: SCHEMA_VERSION,
  }
}
