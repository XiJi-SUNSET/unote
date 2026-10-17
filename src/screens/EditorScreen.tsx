import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import {
  ArrowLeft,
  Bold,
  ChevronDown,
  Eye,
  EyeOff,
  Heading2,
  Image as ImageIcon,
  Italic,
  List,
  MoreHorizontal,
  Pin,
  PinOff,
  Quote,
  Trash2,
} from 'lucide-react'
import { useApp } from '../stores/appStore'
import { compressImage } from '../infra/image/compress'
import { assetRepo } from '../infra/db/assetRepo'
import { newId } from '../core/ids'

const SAVE_DELAY = 400

/** markdown-it + DOMPurify 只在第一次切预览时加载，不拖累冷启动。 */
const MarkdownView = lazy(() =>
  import('../components/MarkdownView').then((mod) => ({ default: mod.MarkdownView })),
)

export function EditorScreen() {
  const editing = useApp((state) => state.editing)
  const courses = useApp((state) => state.courses)
  const saveNote = useApp((state) => state.saveNote)
  const closeEditor = useApp((state) => state.closeEditor)
  const deleteNote = useApp((state) => state.deleteNote)

  const noteId = editing?.id ?? ''
  const [mode, setMode] = useState<'edit' | 'preview'>('edit')
  const [previewSource, setPreviewSource] = useState('')
  const [sheet, setSheet] = useState<'none' | 'course' | 'more'>('none')
  const [pinned, setPinned] = useState(false)

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

  // 只在这条笔记发生变化时重置本地缓冲。
  // 不能依赖 editing.body —— 自动保存会改它，那样每次保存都会把预览模式弹回编辑。
  useEffect(() => {
    bodyRef.current = editing?.body ?? ''
    savedRef.current = editing?.body ?? ''
    setPinned(editing?.pinned ?? false)
    setMode('edit')
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
          aria-label={mode === 'edit' ? '预览' : '编辑'}
          onClick={() => {
            if (mode === 'edit') {
              void flush()
              setPreviewSource(bodyRef.current)
              setMode('preview')
            } else {
              setMode('edit')
            }
          }}
        >
          {mode === 'edit' ? <Eye size={19} /> : <EyeOff size={19} />}
        </button>

        <button type="button" className="icon-btn" aria-label="更多" onClick={() => setSheet('more')}>
          <MoreHorizontal size={20} />
        </button>
      </header>

      <div className="editor__body">
        {mode === 'edit' ? (
          <textarea
            key={editing.id}
            ref={textareaRef}
            className="editor__textarea"
            defaultValue={editing.body}
            placeholder="写点什么…"
            spellCheck={false}
            onChange={(event) => scheduleSave(event.target.value)}
          />
        ) : (
          <div className="editor__preview">
            {previewSource.trim() ? (
              <Suspense fallback={<p className="empty__hint">渲染中…</p>}>
                <MarkdownView source={previewSource} />
              </Suspense>
            ) : (
              <p className="empty__hint">这条笔记还是空的。</p>
            )}
          </div>
        )}
      </div>

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

      {sheet !== 'none' ? (
        <div className="sheet-mask" onClick={() => setSheet('none')}>
          <div className="sheet" onClick={(event) => event.stopPropagation()}>
            {sheet === 'course' ? (
              <>
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
              </>
            ) : (
              <div className="sheet__actions">
                <button
                  type="button"
                  className="sheet__action"
                  onClick={() => {
                    const next = !pinned
                    setPinned(next)
                    setSheet('none')
                    void saveNote({ pinned: next })
                  }}
                >
                  {pinned ? <PinOff size={17} /> : <Pin size={17} />}
                  {pinned ? '取消置顶' : '置顶'}
                </button>
                <button
                  type="button"
                  className="sheet__action sheet__action--danger"
                  onClick={() => {
                    setSheet('none')
                    void deleteNote(editing.id)
                  }}
                >
                  <Trash2 size={17} />
                  删除（可在设置里找回）
                </button>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </section>
  )
}
