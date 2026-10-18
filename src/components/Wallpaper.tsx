import { useEffect, useState } from 'react'
import { useSettings } from '../stores/settingsStore'

/**
 * 全屏壁纸层。
 *
 * 高度在启动时按屏幕高度定死（只在宽度变化时更新），
 * 这样软键盘把布局视口压缩时，壁纸不会跟着缩放"跳一下"。
 */
export function Wallpaper() {
  const url = useSettings((state) => state.wallpaperUrl)
  const [height, setHeight] = useState(() => window.innerHeight)

  useEffect(() => {
    let width = window.innerWidth
    const onResize = () => {
      // 键盘只改高度；只有横竖屏切换（宽度变了）才重新取高度
      if (window.innerWidth === width) return
      width = window.innerWidth
      setHeight(window.innerHeight)
    }
    window.addEventListener('resize', onResize)
    window.addEventListener('orientationchange', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
      window.removeEventListener('orientationchange', onResize)
    }
  }, [])

  return (
    <div className="wallpaper" style={{ height }} aria-hidden="true">
      {url ? (
        <div className="wallpaper__img" style={{ backgroundImage: `url("${url}")` }} />
      ) : (
        <div className="wallpaper__fallback" />
      )}
      <div className="wallpaper__veil" />
    </div>
  )
}
