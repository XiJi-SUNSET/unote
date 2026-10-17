import { create } from 'zustand'
import { newId } from '../core/ids'
import { applyScheme, resolveScheme, type Scheme, type Theme } from '../app/theme'
import { assetRepo } from '../infra/db/assetRepo'
import { getSetting, setSetting } from '../infra/db/settingsRepo'
import { compressImage } from '../infra/image/compress'
import { averageLuma } from '../infra/image/luma'

export const WALLPAPER_ASSET_PREFIX = 'wallpaper-'

interface SettingsState {
  ready: boolean
  theme: Theme
  scheme: Scheme
  glass: boolean
  blur: number
  dim: number
  wallpaperId: string | null
  wallpaperUrl: string | null
  wallpaperLuma: number | null

  load: () => Promise<void>
  setTheme: (theme: Theme) => Promise<void>
  setGlass: (glass: boolean) => Promise<void>
  setBlur: (blur: number) => Promise<void>
  setDim: (dim: number) => Promise<void>
  setWallpaper: (file: File) => Promise<void>
  clearWallpaper: () => Promise<void>
}

let currentUrl: string | null = null

function revokeCurrent() {
  if (currentUrl) {
    URL.revokeObjectURL(currentUrl)
    currentUrl = null
  }
}

function applyVisuals(state: Pick<SettingsState, 'theme' | 'glass' | 'blur' | 'wallpaperLuma'>) {
  const scheme = resolveScheme(state.theme, state.wallpaperLuma)
  applyScheme(scheme)
  const root = document.documentElement
  root.style.setProperty('--blur', `${state.blur}px`)
  root.dataset.glass = state.glass ? 'on' : 'off'
  return scheme
}

export const useSettings = create<SettingsState>()((set, get) => ({
  ready: false,
  theme: 'auto',
  scheme: 'light',
  glass: true,
  blur: 16,
  dim: 0.22,
  wallpaperId: null,
  wallpaperUrl: null,
  wallpaperLuma: null,

  async load() {
    const [theme, glass, blur, dim, wallpaperId, wallpaperLuma] = await Promise.all([
      getSetting<Theme>('theme', 'auto'),
      getSetting<boolean>('glass', true),
      getSetting<number>('blur', 16),
      getSetting<number>('dim', 0.22),
      getSetting<string | null>('wallpaperId', null),
      getSetting<number | null>('wallpaperLuma', null),
    ])

    let wallpaperUrl: string | null = null
    if (wallpaperId) {
      const asset = await assetRepo.get(wallpaperId)
      if (asset) {
        revokeCurrent()
        currentUrl = URL.createObjectURL(asset.blob)
        wallpaperUrl = currentUrl
      }
    }

    const scheme = applyVisuals({ theme, glass, blur, wallpaperLuma })
    set({ ready: true, theme, glass, blur, dim, wallpaperId, wallpaperLuma, wallpaperUrl, scheme })
  },

  async setTheme(theme) {
    await setSetting('theme', theme)
    const scheme = applyVisuals({ ...get(), theme })
    set({ theme, scheme })
  },

  async setGlass(glass) {
    await setSetting('glass', glass)
    applyVisuals({ ...get(), glass })
    set({ glass })
  },

  async setBlur(blur) {
    await setSetting('blur', blur)
    applyVisuals({ ...get(), blur })
    set({ blur })
  },

  async setDim(dim) {
    await setSetting('dim', dim)
    set({ dim })
  },

  async setWallpaper(file) {
    const { blob, width, height } = await compressImage(file)
    const luma = await averageLuma(blob)
    const id = `${WALLPAPER_ASSET_PREFIX}${newId()}`
    await assetRepo.put({
      id,
      blob,
      mime: blob.type || 'image/webp',
      width,
      height,
      bytes: blob.size,
      createdAt: Date.now(),
    })

    const previous = get().wallpaperId
    await setSetting('wallpaperId', id)
    await setSetting('wallpaperLuma', luma)
    if (previous && previous !== id) await assetRepo.remove(previous)

    revokeCurrent()
    currentUrl = URL.createObjectURL(blob)
    const scheme = applyVisuals({ ...get(), wallpaperLuma: luma })
    set({ wallpaperId: id, wallpaperUrl: currentUrl, wallpaperLuma: luma, scheme })
  },

  async clearWallpaper() {
    const previous = get().wallpaperId
    await setSetting('wallpaperId', null)
    await setSetting('wallpaperLuma', null)
    if (previous) await assetRepo.remove(previous)
    revokeCurrent()
    const scheme = applyVisuals({ ...get(), wallpaperLuma: null })
    set({ wallpaperId: null, wallpaperUrl: null, wallpaperLuma: null, scheme })
  },
}))
