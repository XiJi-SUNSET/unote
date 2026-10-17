import { describe, expect, it } from 'vitest'
import { renderMarkdown } from './render'
import { plainText } from './plain'

describe('renderMarkdown', () => {
  it('渲染基础 Markdown', () => {
    expect(renderMarkdown('**粗** 和 *斜*')).toContain('<strong>粗</strong>')
  })

  it('把 HTML 当纯文本，不生成真实标签', () => {
    const html = renderMarkdown('<script>alert(1)</script>\n\n<img src=x onerror="alert(1)">')
    // 没有任何危险标签被创建，原文只作为转义文本出现
    expect(html).not.toContain('<script')
    expect(html).not.toContain('<img')
    expect(html).toContain('&lt;script&gt;')
  })

  it('把 asset: 引用替换成真实 URL', () => {
    const html = renderMarkdown('![课堂板书](asset:abc123)', (id) =>
      id === 'abc123' ? 'blob:http://localhost/1' : null,
    )
    expect(html).toContain('src="blob:http://localhost/1"')
  })

  it('资源缺失时留占位标记，不炸渲染', () => {
    const html = renderMarkdown('![x](asset:missing)', () => null)
    expect(html).toContain('data-missing-asset="missing"')
  })

  it('javascript: 不会被渲染成链接', () => {
    const html = renderMarkdown('[点我](javascript:alert(1))')
    expect(html).not.toContain('<a ')
  })

  it('正常外链仍然可用', () => {
    expect(renderMarkdown('[站点](https://example.com)')).toContain('href="https://example.com"')
  })
})

describe('plainText', () => {
  it('压成一行摘要', () => {
    expect(plainText('# 标题\n\n- 一\n- 二')).toBe('标题 一 二')
  })
})
