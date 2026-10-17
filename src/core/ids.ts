/**
 * 轻量 ULID：前 10 位是毫秒时间戳（Crockford Base32），字典序即时间序。
 * 同一毫秒内递增，保证 id 单调、导入导出时文件名天然有序。
 */

const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'

let lastTime = 0

function encode(value: number, length: number): string {
  let rest = value
  let out = ''
  for (let i = 0; i < length; i += 1) {
    out = ALPHABET.charAt(rest % 32) + out
    rest = Math.floor(rest / 32)
  }
  return out
}

export function newId(now: number = Date.now()): string {
  const time = now > lastTime ? now : lastTime + 1
  lastTime = time
  const random = Math.floor(Math.random() * 32 ** 5)
  return encode(time, 10) + encode(random, 6)
}

/** 从 id 还原生成时间（用于兜底排序，不依赖 createdAt 字段）。 */
export function timeFromId(id: string): number {
  let value = 0
  for (let i = 0; i < 10 && i < id.length; i += 1) {
    const index = ALPHABET.indexOf(id.charAt(i))
    if (index < 0) return 0
    value = value * 32 + index
  }
  return value
}
