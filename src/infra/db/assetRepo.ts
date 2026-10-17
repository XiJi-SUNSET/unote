import type { AssetRepo } from '../../core/ports'
import { db } from './schema'

export const assetRepo: AssetRepo = {
  async put(asset) {
    await db.assets.put(asset)
  },

  async get(id) {
    return db.assets.get(id)
  },

  async remove(id) {
    await db.assets.delete(id)
  },
}
