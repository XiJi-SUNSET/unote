import { describe, expect, it } from 'vitest'
import { ALL_COURSES, resolveCourseId } from './context'
import { INBOX_ID } from '../model/course'
import { deriveTitle } from '../model/note'

describe('resolveCourseId —— 上下文即默认值', () => {
  const existingIds = ['math', 'net']

  it('优先用当前选中的课程', () => {
    expect(
      resolveCourseId({ activeCourseId: 'math', lastCourseId: 'net', existingIds }),
    ).toBe('math')
  })

  it('「全部」视图回落到上次用过的课程', () => {
    expect(
      resolveCourseId({ activeCourseId: ALL_COURSES, lastCourseId: 'net', existingIds }),
    ).toBe('net')
  })

  it('课程已被删除时回落到未分类', () => {
    expect(
      resolveCourseId({ activeCourseId: 'gone', lastCourseId: 'gone', existingIds }),
    ).toBe(INBOX_ID)
  })

  it('什么都没有时回落到未分类', () => {
    expect(
      resolveCourseId({ activeCourseId: null, lastCourseId: null, existingIds: [] }),
    ).toBe(INBOX_ID)
  })
})

describe('deriveTitle', () => {
  it('取首行并去掉 Markdown 前缀', () => {
    expect(deriveTitle('# 为什么 TCP 要三次握手\n\n老师说两次不够')).toBe('为什么 TCP 要三次握手')
    expect(deriveTitle('- 列表项')).toBe('列表项')
    expect(deriveTitle('> 引用')).toBe('引用')
  })

  it('跳过空行', () => {
    expect(deriveTitle('\n\n第二行才是正文')).toBe('第二行才是正文')
  })

  it('空正文得到空标题', () => {
    expect(deriveTitle('   \n\n ')).toBe('')
  })

  it('过长时截断并加省略号', () => {
    const title = deriveTitle('一'.repeat(80))
    expect(title).toHaveLength(61)
    expect(title.endsWith('…')).toBe(true)
  })
})
