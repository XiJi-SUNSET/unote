import { db } from './schema'

/** 读设置；缺失时返回 fallback，并顺手写回，避免每次启动都走 default。 */
export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const row = await db.settings.get(key)
  if (!row) return fallback
  return row.value as T
}

export async function setSetting(key: string, value: unknown): Promise<void> {
  await db.settings.put({ key, value })
}
