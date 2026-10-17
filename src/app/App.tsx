import { useEffect } from 'react'
import { useApp } from '../stores/appStore'
import { ListScreen } from '../screens/ListScreen'
import { EditorScreen } from '../screens/EditorScreen'
import { SettingsScreen } from '../screens/SettingsScreen'
import { getSetting } from '../infra/db/settingsRepo'
import { applyTheme, type Theme } from './theme'

export function App() {
  const ready = useApp((state) => state.ready)
  const screen = useApp((state) => state.screen)
  const boot = useApp((state) => state.boot)

  useEffect(() => {
    void boot()
  }, [boot])

  useEffect(() => {
    void getSetting<Theme>('theme', 'auto').then(applyTheme)
  }, [])

  if (!ready) return <div className="boot" aria-hidden="true" />

  return (
    <div className="app">
      {screen === 'list' ? <ListScreen /> : null}
      {screen === 'editor' ? <EditorScreen /> : null}
      {screen === 'settings' ? <SettingsScreen /> : null}
    </div>
  )
}
