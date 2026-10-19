import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { buildBackup } from '../../core/backup/export'
import { createNote } from '../../core/model/note'
import { db } from '../db/schema'
import { importBackup } from './backupService'
import { zipEntries } from './zip'

function backupFile(
  notes: Parameters<typeof buildBackup>[0]['notes'],
  settings: Record<string, unknown> = {},
): File {
  const entries = buildBackup({
    notes,
    courses: [],
    assets: [],
    settings,
    appVersion: '0.1.4',
    now: new Date('2026-10-18T12:00:00Z'),
  })
  const bytes = zipEntries(entries)
  // Uint8Array 的底层 buffer 可能是 SharedArrayBuffer，File 只吃 ArrayBuffer
  const copy = new Uint8Array(bytes.byteLength)
  copy.set(bytes)
  return new File([copy.buffer], 'unote.zip', { type: 'application/zip' })
}

beforeEach(async () => {
  db.close()
  await db.delete()
  await db.open()
})

describe('导入', () => {
  it('覆盖模式不会把壁纸弄丢', async () => {
    await db.assets.put({
      id: 'wallpaper-1',
      blob: new Blob(['x']),
      mime: 'image/webp',
      width: 1,
      height: 1,
      bytes: 1,
      createdAt: 0,
    })
    await db.settings.put({ key: 'wallpaperId', value: 'wallpaper-1' })
    await db.notes.put(createNote({ id: 'OLD', courseId: 'inbox', body: '旧笔记' }))

    const file = backupFile([createNote({ id: 'NEW', courseId: 'inbox', body: '新笔记' })])
    await importBackup(file, 'replace')

    // 笔记被整体替换，但壁纸资产还在，wallpaperId 不会指向空
    expect(await db.notes.get('OLD')).toBeUndefined()
    expect(await db.notes.get('NEW')).toBeDefined()
    expect(await db.assets.get('wallpaper-1')).toBeDefined()
  })

  it('覆盖模式会把包里的阅读设置接过来', async () => {
    const file = backupFile([], { theme: 'dark', card: 80, sheet: 40 })
    await importBackup(file, 'replace')

    expect((await db.settings.get('theme'))?.value).toBe('dark')
    expect((await db.settings.get('card'))?.value).toBe(80)
    expect((await db.settings.get('sheet'))?.value).toBe(40)
  })

  it('设置值不合法时整条丢掉，不写坏界面', async () => {
    const file = backupFile([], { theme: 'solarized', card: 'abc', blur: 999 })
    await importBackup(file, 'replace')

    expect(await db.settings.get('theme')).toBeUndefined()
    expect(await db.settings.get('card')).toBeUndefined()
    expect((await db.settings.get('blur'))?.value).toBe(100)
  })

  it('合并模式不动本机的阅读设置', async () => {
    await db.settings.put({ key: 'theme', value: 'light' })

    const file = backupFile([createNote({ id: 'N1', courseId: 'inbox', body: '带回来的' })], {
      theme: 'dark',
    })
    await importBackup(file, 'merge')

    expect(await db.notes.get('N1')).toBeDefined()
    expect((await db.settings.get('theme'))?.value).toBe('light')
  })
})
