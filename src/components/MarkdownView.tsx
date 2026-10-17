import { useEffect, useMemo, useState } from 'react'
import { renderMarkdown } from '../core/markdown/render'
import { assetRepo } from '../infra/db/assetRepo'

const ASSET_RE = /asset:([A-Za-z0-9_-]+)/g

/** 渲染 Markdown，并把 asset:<id> 解析成 blob URL（用完即 revoke）。 */
export function MarkdownView({ source }: { source: string }) {
  const [urls, setUrls] = useState<Record<string, string>>({})

  useEffect(() => {
    const ids = new Set<string>()
    for (const match of source.matchAll(ASSET_RE)) {
      const id = match[1]
      if (id) ids.add(id)
    }

    let cancelled = false
    const created: string[] = []

    void (async () => {
      const next: Record<string, string> = {}
      for (const id of ids) {
        const asset = await assetRepo.get(id)
        if (!asset) continue
        const url = URL.createObjectURL(asset.blob)
        created.push(url)
        next[id] = url
      }
      if (cancelled) {
        created.forEach((url) => URL.revokeObjectURL(url))
        return
      }
      setUrls(next)
    })()

    return () => {
      cancelled = true
      created.forEach((url) => URL.revokeObjectURL(url))
    }
  }, [source])

  const html = useMemo(
    () => renderMarkdown(source, (id) => urls[id] ?? null),
    [source, urls],
  )

  return <div className="markdown" dangerouslySetInnerHTML={{ __html: html }} />
}
