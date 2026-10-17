import { useSettings } from '../stores/settingsStore'

/** 全屏壁纸层。模糊与遮罩都由 CSS 变量控制，见 settingsStore.applyVisuals。 */
export function Wallpaper() {
  const url = useSettings((state) => state.wallpaperUrl)

  return (
    <div className="wallpaper" aria-hidden="true">
      {url ? (
        <div className="wallpaper__img" style={{ backgroundImage: `url("${url}")` }} />
      ) : (
        <div className="wallpaper__fallback" />
      )}
      <div className="wallpaper__veil" />
    </div>
  )
}
