import { useEffect, useState } from 'react'
import { ArrowLeft, RotateCcw, Trash2 } from 'lucide-react'
import { useApp } from '../stores/appStore'
import { getSetting, setSetting } from '../infra/db/settingsRepo'
import { applyTheme, type Theme } from '../app/theme'

const THEMES: Array<{ value: Theme; label: string }> = [
  { value: 'auto', label: '跟随系统' },
  { value: 'light', label: '浅色' },
  { value: 'dark', label: '深色' },
]

export function SettingsScreen() {
  const goList = useApp((state) => state.goList)
  const deleted = useApp((state) => state.deleted)
  const restoreNote = useApp((state) => state.restoreNote)
  const purgeNote = useApp((state) => state.purgeNote)

  const [theme, setTheme] = useState<Theme>('auto')

  useEffect(() => {
    void getSetting<Theme>('theme', 'auto').then((saved) => setTheme(saved))
  }, [])

  function changeTheme(next: Theme) {
    setTheme(next)
    void setSetting('theme', next)
    applyTheme(next)
  }

  return (
    <section className="settings">
      <header className="topbar">
        <button type="button" className="icon-btn" aria-label="返回" onClick={() => void goList()}>
          <ArrowLeft size={20} />
        </button>
        <span className="topbar__title">设置</span>
        <span className="topbar__spacer" />
      </header>

      <div className="settings__body">
        <div className="panel">
          <p className="panel__title">外观</p>
          <div className="segmented">
            {THEMES.map((item) => (
              <button
                key={item.value}
                type="button"
                className={`segmented__item${theme === item.value ? ' is-active' : ''}`}
                onClick={() => changeTheme(item.value)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="panel">
          <p className="panel__title">回收站</p>
          {deleted.length === 0 ? (
            <p className="panel__hint">空的。删掉的笔记会在这里留 30 天。</p>
          ) : (
            <ul className="trash">
              {deleted.map((note) => (
                <li key={note.id} className="trash__row">
                  <span className="trash__title">{note.title || '无标题'}</span>
                  <button
                    type="button"
                    className="icon-btn"
                    aria-label="恢复"
                    onClick={() => void restoreNote(note.id)}
                  >
                    <RotateCcw size={16} />
                  </button>
                  <button
                    type="button"
                    className="icon-btn icon-btn--danger"
                    aria-label="彻底删除"
                    onClick={() => void purgeNote(note.id)}
                  >
                    <Trash2 size={16} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="panel">
          <p className="panel__title">关于</p>
          <p className="panel__hint">
            Unote 0.1.0 · 本地存储，不联网。<br />
            导出与导入在 M3 提供。
          </p>
        </div>
      </div>
    </section>
  )
}
