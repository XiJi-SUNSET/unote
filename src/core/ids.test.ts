import { describe, expect, it } from 'vitest'
import { newId, timeFromId } from './ids'

describe('newId', () => {
  it('生成 16 位、可排序的 id', () => {
    const now = Date.now()
    const first = newId(now)
    const second = newId(now)

    expect(first).toHaveLength(16)
    expect(first).not.toBe(second)
    // 同一毫秒内也要保持单调，导出文件名才不会乱序
    expect(first < second).toBe(true)
  })

  it('前 10 位能还原出时间', () => {
    const now = Date.now()
    const id = newId(now)
    expect(timeFromId(id)).toBeGreaterThanOrEqual(now)
  })
})
