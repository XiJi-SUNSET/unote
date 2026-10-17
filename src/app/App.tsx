import { lazy, Suspense, useEffect } from 'react'
import { useApp } from '../stores/appStore'
import { useSettings } from '../stores/settingsStore'
import { ListScreen } from '../screens/ListScreen'
import { EditorScreen } from '../screens/EditorScreen'
import { Wallpaper } from '../components/Wallpaper'

/** 设置页带着备份/fflate，按需加载，别拖累首屏 */
const SettingsScreen = lazy(() =>
  import('../screens/SettingsScreen').then((mod) => ({ default: mod.SettingsScreen })),
)

export function App() {
  const ready = useApp((state) => state.ready)
  const screen = useApp((state) => state.screen)
  const boot = useApp((state) => state.boot)
  const loadSettings = useSettings((state) => state.load)

  useEffect(() => {
    void loadSettings()
  }, [loadSettings])

  useEffect(() => {
    void boot()
  }, [boot])

  if (!ready) return <div className="boot" aria-hidden="true" />

  return (
    <>
      <Wallpaper />
      <div className="app">
        {screen === 'list' ? <ListScreen /> : null}
        {screen === 'editor' ? <EditorScreen /> : null}
        {screen === 'settings' ? (
          <Suspense fallback={null}>
            <SettingsScreen />
          </Suspense>
        ) : null}
      </div>
    </>
  )
}
