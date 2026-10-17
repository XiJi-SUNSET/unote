import { lazy, Suspense, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import {
  ArrowLeft,
  Bold,
  ChevronDown,
  Eye,
  Heading2,
  Image as ImageIcon,
  Italic,
  List,
  Pencil,
  Quote,
} from 'lucide-react'
import { useApp } from '../stores/appStore'
import { compressImage } from '../infra/image/compress'
import { assetRepo } from '../infra/db/assetRepo'
import { newId } from '../core/ids'

const SAVE_DELAY = 400

function formatWhen(timestamp: number): string {
  const date = new Date(timestamp)
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getMonth() + 1} 月 ${date.getDate()} 日 ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/** markdown-it + DOMPurify 只在第一次切预览时加载，不拖累冷启动。 */
const MarkdownView = lazy(() =>
  import('../components/MarkdownView').then((mod) => ({ default: mod.MarkdownView })),
)

export function EditorScreen() {
  const editing = useApp((state) => state.editing)
  const courses = useApp((state) => state.courses)
  const saveNote = useApp((state) => state.saveNote)
  const closeEditor = useApp((state) => state.closeEditor)

  const noteId = editing?.id ?? ''
  /** 默认渲染：打开笔记先看到排版好的内容，点铅笔才进源码编辑 */
  const [mode, setMode] = useState<'preview' | 'edit'>('preview')
  const [previewSource, setPreviewSource] = useState('')
  const [sheet, setSheet] = useState<'none' | 'course'>('none')

  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const fileRef = useRef<HTMLInputElement | null>(null)
  const bodyRef = useRef('')
  const savedRef = useRef('')
  const timerRef = useRef<number | null>(null)

  const flush = useCallback(async () => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current)
      timerRef.current = null
    }
    const value = bodyRef.current
    if (value === savedRef.current) return
    savedRef.current = value
    await saveNote({ body: value })
  }, [saveNote])

  // 换笔记时重置缓冲；用 layout effect 避免先闪一帧旧内容
  useLayoutEffect(() => {
    const body = editing?.body ?? ''
    bodyRef.current = body
    savedRef.current = body
    setPreviewSource(body)
    setMode(body.trim() ? 'preview' : 'edit')
    setSheet('none')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noteId])

  useEffect(() => () => void flush(), [flush])

  useEffect(() => {
    function onHide() {
      if (document.visibilityState === 'hidden') void flush()
    }
    document.addEventListener('visibilitychange', onHide)
    return () => document.removeEventListener('visibilitychange', onHide)
  }, [flush])

  if (!editing) return null

  const course = courses.find((item) => item.id === editing.courseId)
  const courseName = course?.name ?? '未分类'

  function scheduleSave(value: string) {
    bodyRef.current = value
    if (timerRef.current !== null) window.clearTimeout(timerRef.current)
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null
      savedRef.current = value
      void saveNote({ body: value })
    }, SAVE_DELAY)
  }

  function applyValue(value: string, caret: number) {
    const el = textareaRef.current
    if (!el) return
    el.value = value
    el.setSelectionRange(caret, caret)
    scheduleSave(value)
    el.focus()
  }

  function wrap(before: string, after = '') {
    const el = textareaRef.current
    if (!el) return
    const { selectionStart, selectionEnd, value } = el
    const selected = value.slice(selectionStart, selectionEnd)
    const next = value.slice(0, selectionStart) + before + selected + after + value.slice(selectionEnd)
    applyValue(next, selectionStart + before.length + selected.length + after.length)
  }

  function prefixLine(prefix: string) {
    const el = textareaRef.current
    if (!el) return
    const start = el.selectionStart
    const lineStart = el.value.lastIndexOf('\n', start - 1) + 1
    const next = el.value.slice(0, lineStart) + prefix + el.value.slice(lineStart)
    applyValue(next, start + prefix.length)
  }

  function insertBlock(text: string) {
    const el = textareaRef.current
    if (!el) return
    const start = el.selectionStart
    const next = el.value.slice(0, start) + text + el.value.slice(el.selectionEnd)
    applyValue(next, start + text.length)
  }

  async function onPickImage(file: File | undefined) {
    if (!file) return
    const { blob, width, height } = await compressImage(file)
    const id = newId()
    await assetRepo.put({
      id,
      blob,
      mime: blob.type || 'image/webp',
      width,
      height,
      bytes: blob.size,
      createdAt: Date.now(),
    })
    insertBlock(`\n![图片](asset:${id})\n`)
  }

  async function goBack() {
    await flush()
    await closeEditor()
  }

  async function startEdit() {
    await flush()
    setMode('edit')
  }

  function startPreview() {
    void flush()
    setPreviewSource(bodyRef.current)
    setMode('preview')
  }

  return (
    <section className="editor">
      <header className="editor__bar">
        <button type="button" className="icon-btn" aria-label="返回" onClick={() => void goBack()}>
          <ArrowLeft size={20} />
        </button>

        <button type="button" className="editor__course" onClick={() => setSheet('course')}>
          {courseName}
          <ChevronDown size={13} />
        </button>

        <span className="editor__spacer" />

        <button
          type="button"
          className="icon-btn"
          aria-label={mode === 'preview' ? '编辑' : '预览'}
          onClick={() => (mode === 'preview' ? void startEdit() : startPreview())}
        >
          {mode === 'preview' ? <Pencil size={18} /> : <Eye size={19} />}
        </button>
      </header>

      <div className="editor__stage">
        <article className="paper-sheet">
          {mode === 'preview' ? (
            <div className="reader">
              <div className="reader__meta">
                <span>{formatWhen(editing.updatedAt)}</span>
                <span className="reader__dot" />
                <span>{courseName}</span>
                {editing.pinned ? (
                  <>
                    <span className="reader__dot" />
                    <span>置顶</span>
                  </>
                ) : null}
              </div>
              <div className="reader__body">
                {previewSource.trim() ? (
                  <Suspense fallback={<p className="empty__hint">渲染中…</p>}>
                    <MarkdownView source={previewSource} />
                  </Suspense>
                ) : (
                  <p className="empty__hint">这条笔记还是空的。</p>
                )}
              </div>
            </div>
          ) : (
            <textarea
              key={editing.id}
              ref={textareaRef}
              className="editor__textarea"
              defaultValue={editing.body}
              placeholder="写点什么…"
              spellCheck={false}
              onChange={(event) => scheduleSave(event.target.value)}
            />
          )}

          {mode === 'edit' ? (
            <div className="editor__toolbar" role="toolbar" aria-label="格式">
              <button type="button" className="tool" aria-label="加粗" onClick={() => wrap('**', '**')}>
                <Bold size={17} />
              </button>
              <button type="button" className="tool" aria-label="斜体" onClick={() => wrap('*', '*')}>
                <Italic size={17} />
              </button>
              <button type="button" className="tool" aria-label="标题" onClick={() => prefixLine('## ')}>
                <Heading2 size={17} />
              </button>
              <button type="button" className="tool" aria-label="列表" onClick={() => prefixLine('- ')}>
                <List size={17} />
              </button>
              <button type="button" className="tool" aria-label="引用" onClick={() => prefixLine('> ')}>
                <Quote size={17} />
              </button>
              <button type="button" className="tool" aria-label="插入图片" onClick={() => fileRef.current?.click()}>
                <ImageIcon size={17} />
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                hidden
                onChange={(event) => {
                  void onPickImage(event.target.files?.[0])
                  event.target.value = ''
                }}
              />
            </div>
          ) : null}
        </article>
      </div>

      {sheet === 'course' ? (
        <div className="sheet-mask" onClick={() => setSheet('none')}>
          <div className="sheet" onClick={(event) => event.stopPropagation()}>
            <p className="sheet__title">归到哪门课</p>
            <div className="sheet__chips">
              {courses.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`chip${item.id === editing.courseId ? ' is-active' : ''}`}
                  onClick={() => {
                    setSheet('none')
                    void saveNote({ courseId: item.id })
                  }}
                >
                  {item.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}
