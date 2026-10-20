import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { App } from './App'
import { db } from '../infra/db/schema'
import { useApp } from '../stores/appStore'
import { ALL_COURSES } from '../core/course/context'
import { INBOX_ID } from '../core/model/course'

beforeEach(async () => {
  db.close()
  await db.delete()
  await db.open()
  useApp.setState({
    ready: false,
    screen: 'list',
    courses: [],
    notes: [],
    deleted: [],
    activeCourseId: ALL_COURSES,
    lastCourseId: INBOX_ID,
    editing: null,
  })
})

describe('<App />', () => {
  it('挂载后渲染列表空态，不白屏', async () => {
    render(<App />)

    await waitFor(() => {
      expect(screen.getByText('Unote')).toBeTruthy()
    })

    expect(screen.getByText('还没有笔记')).toBeTruthy()
    expect(screen.getByLabelText('快速记录')).toBeTruthy()
  })

  it('在编辑屏里被系统杀掉后，冷启动直接进阅读态（渲染好的 Markdown）', async () => {
    await useApp.getState().boot()
    await useApp.getState().createNote('# 直接打开我')
    const note = useApp.getState().notes[0]
    if (!note) throw new Error('note missing')
    // 进过编辑屏才会有"上一篇"可回；快速记录不算
    await useApp.getState().openNote(note.id)

    // 模拟重启：清空内存态，boot 会读回 lastNoteId
    useApp.setState({ ready: false, editing: null, screen: 'list' })
    render(<App />)

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: '直接打开我' })).toBeTruthy()
    })
    expect(screen.getByLabelText('编辑')).toBeTruthy()
  })
})
