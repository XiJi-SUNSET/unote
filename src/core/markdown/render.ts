import MarkdownIt from 'markdown-it'
import DOMPurify from 'dompurify'

const md = new MarkdownIt({
  html: false, // 用户写的 HTML 一律当文本，从源头减少注入口
  linkify: true,
  breaks: true,
})

/** 允许渲染的 URL 协议：本地资源 blob:、内嵌图 data:、图片引用 asset: */
const ALLOWED_URI = /^(?:(?:https?|mailto|tel|blob|data|asset):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i

export type AssetResolver = (assetId: string) => string | null

/**
 * 渲染 Markdown 为可安全注入的 HTML。
 * `asset:<id>` 会在渲染前被替换成真实 URL（blob:），替换失败则留一个占位标记。
 */
export function renderMarkdown(source: string, resolveAsset?: AssetResolver): string {
  let html = md.render(source)

  if (resolveAsset) {
    html = html.replace(/src="asset:([A-Za-z0-9_-]+)"/g, (_match, id: string) => {
      const url = resolveAsset(id)
      return url ? `src="${url}"` : `src="" data-missing-asset="${id}"`
    })
  }

  return DOMPurify.sanitize(html, { ALLOWED_URI_REGEXP: ALLOWED_URI })
}
