import { useSettings } from '../stores/settingsStore'

/** 全屏壁纸层。位于内容之下，模糊只在这一层做一次。 */
export function Wallpaper() {
  const url = useSettings((state) => state.wallpaperUrl)
  const blur = useSettings((state) => state.blur)
  const dim = useSettings((state) => state.dim)

  return (
    <div className="wallpaper" aria-hidden="true">
      {url ? (
        <div
          className="wallpaper__img"
          style={{ backgroundImage: `url("${url}")`, filter: `blur(${blur}px)` }}
        />
      ) : (
        <div className="wallpaper__fallback" />
      )}
      <div className="wallpaper__scrim" style={{ opacity: dim }} />
    </div>
  )
}
