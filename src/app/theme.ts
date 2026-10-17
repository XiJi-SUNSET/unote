export type Theme = 'auto' | 'light' | 'dark'
export type Scheme = 'light' | 'dark'

/**
 * 主题解析：auto 时优先跟壁纸的明暗走（壁纸亮 → 用深色文字），
 * 没有壁纸才回落到系统偏好。见 docs/04-design-system.md §4.3。
 */
export function resolveScheme(theme: Theme, wallpaperLuma: number | null): Scheme {
  if (theme !== 'auto') return theme
  if (wallpaperLuma !== null) return wallpaperLuma > 0.58 ? 'light' : 'dark'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function applyScheme(scheme: Scheme): void {
  document.documentElement.dataset.scheme = scheme
}
