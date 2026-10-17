import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, Download, ImagePlus, RotateCcw, Trash2, Upload, X } from 'lucide-react'
import { useApp } from '../stores/appStore'
import { useSettings } from '../stores/settingsStore'
import { INBOX_ID } from '../core/model/course'
import type { Theme } from '../app/theme'
import {
  downloadBlob,
  exportBackup,
  importBackup,
} from '../infra/backup/backupService'

const THEMES: Array<{ value: Theme; label: string }> = [
  { value: 'auto', label: '跟随壁纸' },
  { value: 'light', label: '浅色' },
  { value: 'dark', label: '深色' },
]

interface SliderRowProps {
  label: string
  value: number
  min: number
  max: number
  suffix: string
  onChange: (value: number) => void
}

function SliderRow({ label, value, min, max, suffix, onChange }: SliderRowProps) {
  return (
    <label className="field">
      <span>
        {label} · {value}
        {suffix}
      </span>
      <input
        className="slider"
        type="range"
        min={min}
        max={max}
        step={1}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  )
}

export function SettingsScreen() {
  const goList = useApp((state) => state.goList)
  const deleted = useApp((state) => state.deleted)
  const courses = useApp((state) => state.courses)
  const courseCounts = useApp((state) => state.courseCounts)
  const deleteCourse = useApp((state) => state.deleteCourse)
  const restoreNote = useApp((state) => state.restoreNote)
  const purgeNote = useApp((state) => state.purgeNote)

  const theme = useSettings((state) => state.theme)
  const overlay = useSettings((state) => state.overlay)
  const blur = useSettings((state) => state.blur)
  const bgBlur = useSettings((state) => state.bgBlur)
  const card = useSettings((state) => state.card)
  const sheet = useSettings((state) => state.sheet)
  const wallpaperUrl = useSettings((state) => state.wallpaperUrl)
  const hasWallpaper = useSettings((state) => state.wallpaperId !== null)
  const setTheme = useSettings((state) => state.setTheme)
  const setGlassValue = useSettings((state) => state.setGlassValue)
  const setWallpaper = useSettings((state) => state.setWallpaper)
  const clearWallpaper = useSettings((state) => state.clearWallpaper)

  const wallpaperRef = useRef<HTMLInputElement>(null)
  const importRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState<'export' | 'import' | 'wallpaper' | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge')
  const [confirmCourse, setConfirmCourse] = useState<string | null>(null)

  useEffect(() => {
    void useApp.getState().loadDeleted()
  }, [])

  async function onExport() {
    setBusy('export')
    setMessage(null)
    try {
      const result = await exportBackup()
      downloadBlob(result.blob, result.filename)
      setMessage(
        `已导出 ${result.counts.notes} 条笔记、${result.counts.courses} 门课程、${result.counts.assets} 张图片`,
      )
    } catch (error) {
      setMessage(`导出失败：${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setBusy(null)
    }
  }

  async function onImport(file: File | undefined) {
    if (!file) return
    setBusy('import')
    setMessage(null)
    try {
      const result = await importBackup(file, importMode)
      await useApp.getState().refresh()
      setMessage(
        `导入完成：新增 ${result.added}、更新 ${result.updated}、跳过 ${result.skipped}`,
      )
    } catch (error) {
      setMessage(`导入失败：${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setBusy(null)
    }
  }

  async function onPickWallpaper(file: File | undefined) {
    if (!file) return
    setBusy('wallpaper')
    setMessage(null)
    try {
      await setWallpaper(file)
    } catch (error) {
      setMessage(`壁纸设置失败：${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setBusy(null)
    }
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
          <p className="panel__title">壁纸</p>

          <div className="panel__row" style={{ marginBottom: 'var(--sp-3)' }}>
            <div
              className="wall-chip"
              style={wallpaperUrl ? { backgroundImage: `url("${wallpaperUrl}")` } : undefined}
            >
              {!wallpaperUrl ? <span>默认</span> : null}
            </div>
            <button
              type="button"
              className="btn"
              disabled={busy === 'wallpaper'}
              onClick={() => wallpaperRef.current?.click()}
            >
              <ImagePlus size={15} />
              {hasWallpaper ? '换一张' : '选一张'}
            </button>
            {hasWallpaper ? (
              <button type="button" className="btn btn--ghost" onClick={() => void clearWallpaper()}>
                <X size={15} />
                移除
              </button>
            ) : null}
          </div>

          <SliderRow
            label="壁纸遮罩"
            value={overlay}
            min={0}
            max={90}
            suffix="%"
            onChange={(value) => void setGlassValue('overlay', value)}
          />
          <SliderRow
            label="壁纸模糊"
            value={bgBlur}
            min={0}
            max={30}
            suffix="px"
            onChange={(value) => void setGlassValue('bgBlur', value)}
          />
          <SliderRow
            label="界面模糊"
            value={blur}
            min={0}
            max={30}
            suffix="px"
            onChange={(value) => void setGlassValue('blur', value)}
          />
          <SliderRow
            label="卡片不透明度"
            value={card}
            min={20}
            max={95}
            suffix="%"
            onChange={(value) => void setGlassValue('card', value)}
          />
          <SliderRow
            label="阅读纸面"
            value={sheet}
            min={0}
            max={100}
            suffix="%"
            onChange={(value) => void setGlassValue('sheet', value)}
          />

          <input
            ref={wallpaperRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(event) => {
              void onPickWallpaper(event.target.files?.[0])
              event.target.value = ''
            }}
          />
        </div>

        <div className="panel">
          <p className="panel__title">外观</p>
          <div className="segmented">
            {THEMES.map((item) => (
              <button
                key={item.value}
                type="button"
                className={`segmented__item${theme === item.value ? ' is-active' : ''}`}
                onClick={() => void setTheme(item.value)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="panel">
          <p className="panel__title">课程</p>
          <ul className="trash">
            {courses.map((course) => (
              <li key={course.id} className="trash__row">
                <span className="trash__title">{course.name}</span>
                <span className="panel__hint">{courseCounts[course.id] ?? 0} 篇</span>
                {course.id === INBOX_ID ? null : confirmCourse === course.id ? (
                  <>
                    <button
                      type="button"
                      className="btn btn--accent"
                      onClick={() => {
                        setConfirmCourse(null)
                        void deleteCourse(course.id)
                      }}
                    >
                      删除
                    </button>
                    <button
                      type="button"
                      className="btn btn--ghost"
                      onClick={() => setConfirmCourse(null)}
                    >
                      取消
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    className="icon-btn icon-btn--danger"
                    aria-label={`删除课程 ${course.name}`}
                    onClick={() => setConfirmCourse(course.id)}
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </li>
            ))}
          </ul>
          <p className="panel__hint" style={{ marginTop: 'var(--sp-2)' }}>
            删除课程不删笔记，笔记会移到「未分类」。
          </p>
        </div>

        <div className="panel">
          <p className="panel__title">备份</p>
          <p className="panel__hint" style={{ marginBottom: 'var(--sp-3)' }}>
            导出为 ZIP（Markdown + 图片 + manifest），换手机时导入即可。
          </p>

          <div className="panel__row">
            <button type="button" className="btn btn--accent" disabled={busy === 'export'} onClick={() => void onExport()}>
              <Download size={15} />
              {busy === 'export' ? '打包中…' : '导出 ZIP'}
            </button>

            <button
              type="button"
              className="btn"
              disabled={busy === 'import'}
              onClick={() => importRef.current?.click()}
            >
              <Upload size={15} />
              {busy === 'import' ? '导入中…' : '导入 ZIP'}
            </button>
          </div>

          <div className="panel__row" style={{ marginTop: 'var(--sp-2)' }}>
            <label className="radio">
              <input
                type="radio"
                name="import-mode"
                checked={importMode === 'merge'}
                onChange={() => setImportMode('merge')}
              />
              合并（推荐）
            </label>
            <label className="radio">
              <input
                type="radio"
                name="import-mode"
                checked={importMode === 'replace'}
                onChange={() => setImportMode('replace')}
              />
              覆盖
            </label>
          </div>

          <input
            ref={importRef}
            type="file"
            accept=".zip,application/zip"
            hidden
            onChange={(event) => {
              void onImport(event.target.files?.[0])
              event.target.value = ''
            }}
          />

          {message ? <p className="panel__msg">{message}</p> : null}
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
            Unote 0.1.0 · 本地存储，不联网。
            <br />
            回收站里的笔记不会被导出。
          </p>
        </div>
      </div>
    </section>
  )
}
