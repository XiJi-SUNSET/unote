/**
 * 纯文本摘要：不依赖 markdown-it。
 * 列表卡片每张都要用它，不能把渲染器拖进首屏 bundle。
 */
export function plainText(source: string): string {
  return source
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[#>*_`~-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}
