import { unzipSync, zipSync } from 'fflate'

/**
 * 同步实现：M1 的规模（几 MB）足够快，而且能直接在 main 线程跑通。
 * 等 M3 真出现大包，再换成 fflate 的异步版本 + Worker（docs/02 §4.4）。
 */
export function zipEntries(entries: Record<string, Uint8Array>): Uint8Array {
  return zipSync(entries, { level: 6 })
}

export function unzipEntries(data: Uint8Array): Record<string, Uint8Array> {
  return unzipSync(data)
}
