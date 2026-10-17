/**
 * 仅开发环境使用的示例数据。
 * 入口在 main.tsx，只有 URL 带 ?demo=1 且 import.meta.env.DEV 时才会执行，
 * 构建产物里会被摇掉。不会出现在正式包里。
 */
import { createNote } from '../../core/model/note'
import { INBOX_ID } from '../../core/model/course'
import { newId } from '../../core/ids'
import { db } from './schema'
import { courseRepo, nextCourseOrder } from './courseRepo'
import { noteRepo } from './noteRepo'

const SAMPLES: Array<{ course: string; body: string; pinned?: boolean }> = [
  {
    course: '计算机网络',
    body: '# 为什么 TCP 要三次握手\n\n老师说"两次不够"，可两次明明也能确认收发能力……\n\n> 下次课问：如果第三次丢了会怎样？',
    pinned: true,
  },
  {
    course: '高等数学',
    body: '## 拉格朗日中值定理\n\n证明里那个 ξ 为什么一定在开区间内？端点连续、内部可导，所以……',
  },
  {
    course: '高等数学',
    body: '作业：P143 第 7、9、12 题\n\n第 9 题要用两次中值定理。',
  },
  {
    course: '计算机网络',
    body: '实验课分组：我和小林、老张一组，下周三交报告。',
  },
]

export async function seedDemoIfEmpty(): Promise<boolean> {
  if ((await db.notes.count()) > 0) return false

  await courseRepo.ensureInbox()
  const courseIds = new Map<string, string>()
  let order = await nextCourseOrder()

  for (const name of new Set(SAMPLES.map((sample) => sample.course))) {
    const course = await courseRepo.create(name, order)
    order += 1
    courseIds.set(name, course.id)
  }

  for (const sample of SAMPLES) {
    const note = createNote({
      id: newId(),
      courseId: courseIds.get(sample.course) ?? INBOX_ID,
      body: sample.body,
    })
    await noteRepo.upsert({ ...note, pinned: sample.pinned ?? false })
  }

  return true
}

/** 预览编辑屏用：把最近一条设成"上次打开的笔记"，冷启动就会直接进去。 */
export async function openDemoNote(): Promise<void> {
  const notes = await noteRepo.listAll()
  const latest = notes[0]
  if (!latest) return
  const { setSetting } = await import('./settingsRepo')
  await setSetting('lastNoteId', latest.id)
}
