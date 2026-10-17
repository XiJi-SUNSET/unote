import { create } from 'zustand'
import { newId } from '../core/ids'
import { applyScheme, resolveScheme, type Scheme, type Theme } from '../app/theme'
import { assetRepo } from '../infra/db/assetRepo'
import { getSetting, setSetting } from '../infra/db/settingsRepo'
import { compressImage } from '../infra/image/compress'
import { averageLuma } from '../infra/image/luma'

export const WALLPAPER_ASSET_PREFIX = 'wallpaper-'

/** 与 Exterior 的 GLASS_DEFAULTS 对齐：遮罩 45 / 模糊 16 / 卡片 62 / 壁纸模糊 0 */
export const GLASS_DEFAULTS = {
  overlay: 22,
  blur: 16,
  bgBlur: 0,
  card: 62,
  sheet: 90,
}

export type GlassKey = keyof typeof GLASS_DEFAULTS

interface SettingsState {
  ready: boolean
  theme: Theme
  scheme: Scheme
  glass: boolean
  overlay: number
  blur: number
  bgBlur: number
  card: number
  sheet: number
  wallpaperId: string | null
  wallpaperUrl: string | null
  wallpaperLuma: number | null

  load: () => Promise<void>
  setTheme: (theme: Theme) => Promise<void>
  setGlass: (enabled: boolean) => Promise<void>
  setGlassValue: (key: GlassKey, value: number) => Promise<void>
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

interface Visuals {
  theme: Theme
  glass: boolean
  overlay: number
  blur: number
  bgBlur: number
  card: number
  sheet: number
  wallpaperLuma: number | null
}

/**
 * 把用户调的四个材质参数写成 CSS 变量。
 * 结构对齐 Exterior：壁纸遮罩 / 界面模糊 / 壁纸模糊 / 界面不透明度。
 */
function applyVisuals(state: Visuals): Scheme {
  const scheme = resolveScheme(state.theme, state.wallpaperLuma)
  applyScheme(scheme)

  const root = document.documentElement
  const dark = scheme === 'dark'
  const veilRgb = dark ? '28, 22, 20' : '255, 239, 229'
  const cardRgb = dark ? '54, 46, 41' : '255, 247, 240'
  const cardAlpha = state.card / 100

  root.style.setProperty('--overlay', `rgba(${veilRgb}, ${state.overlay / 100})`)
  root.style.setProperty('--scrim', `rgba(${dark ? '0, 0, 0' : '61, 58, 54'}, ${Math.min(0.7, state.overlay / 100 + 0.12)})`)
  root.style.setProperty('--blur', `${state.blur}px`)
  root.style.setProperty('--bg-blur', `${state.bgBlur}px`)
  root.style.setProperty('--glass', `rgba(${cardRgb}, ${cardAlpha})`)
  root.style.setProperty('--glass-strong', `rgba(${cardRgb}, ${Math.min(0.96, cardAlpha + 0.24)})`)
  root.style.setProperty('--sheet', `rgba(${cardRgb}, ${state.sheet / 100})`)
  root.dataset.glass = state.glass ? 'on' : 'off'

  return scheme
}

function visualsOf(state: SettingsState): Visuals {
  return {
    theme: state.theme,
    glass: state.glass,
    overlay: state.overlay,
    blur: state.blur,
    bgBlur: state.bgBlur,
    card: state.card,
    sheet: state.sheet,
    wallpaperLuma: state.wallpaperLuma,
  }
}

export const useSettings = create<SettingsState>()((set, get) => ({
  ready: false,
  theme: 'auto',
  scheme: 'light',
  glass: true,
  ...GLASS_DEFAULTS,
  wallpaperId: null,
  wallpaperUrl: null,
  wallpaperLuma: null,

  async load() {
    const [theme, glass, overlay, blur, bgBlur, card, sheet, wallpaperId, wallpaperLuma] =
      await Promise.all([
        getSetting<Theme>('theme', 'auto'),
        getSetting<boolean>('glass', true),
        getSetting<number>('overlay', GLASS_DEFAULTS.overlay),
        getSetting<number>('blur', GLASS_DEFAULTS.blur),
        getSetting<number>('bgBlur', GLASS_DEFAULTS.bgBlur),
        getSetting<number>('card', GLASS_DEFAULTS.card),
        getSetting<number>('sheet', GLASS_DEFAULTS.sheet),
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

    const next: SettingsState = {
      ...get(),
      theme,
      glass,
      overlay,
      blur,
      bgBlur,
      card,
      sheet,
      wallpaperId,
      wallpaperUrl,
      wallpaperLuma,
    }
    const scheme = applyVisuals(visualsOf(next))
    set({ ...next, scheme, ready: true })
  },

  async setTheme(theme) {
    await setSetting('theme', theme)
    const scheme = applyVisuals(visualsOf({ ...get(), theme }))
    set({ theme, scheme })
  },

  async setGlass(glass) {
    await setSetting('glass', glass)
    applyVisuals(visualsOf({ ...get(), glass }))
    set({ glass })
  },

  async setGlassValue(key, value) {
    await setSetting(key, value)
    const scheme = applyVisuals(visualsOf({ ...get(), [key]: value }))
    set({ [key]: value, scheme } as Pick<SettingsState, GlassKey | 'scheme'>)
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
    const next = { ...get(), wallpaperId: id, wallpaperUrl: currentUrl, wallpaperLuma: luma }
    const scheme = applyVisuals(visualsOf(next))
    set({ wallpaperId: id, wallpaperUrl: currentUrl, wallpaperLuma: luma, scheme })
  },

  async clearWallpaper() {
    const previous = get().wallpaperId
    await setSetting('wallpaperId', null)
    await setSetting('wallpaperLuma', null)
    if (previous) await assetRepo.remove(previous)
    revokeCurrent()
    const next = { ...get(), wallpaperId: null, wallpaperUrl: null, wallpaperLuma: null }
    const scheme = applyVisuals(visualsOf(next))
    set({ wallpaperId: null, wallpaperUrl: null, wallpaperLuma: null, scheme })
  },
}))
