import { describe, expect, it } from 'vitest'
import { createNote } from '../../core/model/note'
import { buildBackup } from '../../core/backup/export'
import { readBackup } from '../../core/backup/import'
import { zipEntries, unzipEntries } from './zip'

const NOW = new Date('2026-10-17T12:00:00Z')

describe('备份往返', () => {
  it('export -> zip -> unzip -> import 后内容一致', () => {
    const note = createNote({
      id: 'N1',
      courseId: 'C1',
      body: '# 三次握手\n\n![](asset:A1)',
      now: NOW.getTime(),
    })

    const entries = buildBackup({
      notes: [note],
      courses: [{ id: 'C1', name: '计算机网络', order: 1, archived: false, createdAt: 0 }],
      assets: [{ id: 'A1', ext: 'webp', mime: 'image/webp', bytes: new Uint8Array([1, 2, 3]) }],
      settings: { theme: 'auto' },
      appVersion: '0.1.0',
      now: NOW,
    })

    const bundle = readBackup(unzipEntries(zipEntries(entries)))

    expect(bundle.manifest.counts.notes).toBe(1)
    expect(bundle.notes).toHaveLength(1)
    expect(bundle.notes[0]?.id).toBe('N1')
    expect(bundle.notes[0]?.courseId).toBe('C1')
    expect(bundle.notes[0]?.title).toBe('三次握手')
    // 导出成 assets/<id>.webp，导入再还原成 asset:<id>
    expect(bundle.notes[0]?.body).toContain('asset:A1')
    expect(bundle.assets[0]?.bytes.byteLength).toBe(3)
  })

  it('图片在包里以真实文件存在，Markdown 里是人类可读的相对路径', () => {
    const note = createNote({ id: 'N2', courseId: 'C1', body: '![](asset:A1)', now: NOW.getTime() })
    const entries = buildBackup({
      notes: [note],
      courses: [{ id: 'C1', name: '高数', order: 1, archived: false, createdAt: 0 }],
      assets: [{ id: 'A1', ext: 'webp', mime: 'image/webp', bytes: new Uint8Array([9]) }],
      settings: {},
      appVersion: '0.1.0',
      now: NOW,
    })

    const markdownPath = Object.keys(entries).find((path) => path.startsWith('notes/'))
    expect(markdownPath).toBeDefined()
    const markdown = new TextDecoder().decode(entries[markdownPath ?? ''])
    expect(markdown).toContain('assets/A1.webp')
    expect(entries['assets/A1.webp']).toBeDefined()
  })

  it('缺少 courses.json 时全部落到未分类', () => {
    const note = createNote({ id: 'N3', courseId: 'C9', body: '孤立笔记', now: NOW.getTime() })
    const entries = buildBackup({
      notes: [note],
      courses: [{ id: 'C9', name: '某课', order: 1, archived: false, createdAt: 0 }],
      assets: [],
      settings: {},
      appVersion: '0.1.0',
      now: NOW,
    })
    delete entries['courses.json']

    const bundle = readBackup(entries)
    expect(bundle.notes[0]?.courseId).toBe('inbox')
  })

  it('拒绝 zip slip 路径', () => {
    const entries = buildBackup({
      notes: [],
      courses: [],
      assets: [],
      settings: {},
      appVersion: '0.1.0',
      now: NOW,
    })
    entries['../evil.md'] = new Uint8Array([1])

    expect(() => readBackup(entries)).toThrow(/不安全的路径/)
  })

  it('拒绝不是 Unote 的包', () => {
    expect(() =>
      readBackup({ 'manifest.json': new TextEncoder().encode('{"format":"other"}') }),
    ).toThrow(/不是 Unote/)
  })
})
