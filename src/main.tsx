import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './app/App'
import './styles/tokens.css'
import './styles/app.css'

const container = document.getElementById('root')
if (!container) throw new Error('缺少 #root 挂载点')

async function start() {
  // 开发预览用：?demo=1 先灌几条示例数据，保证种子数据在 boot 之前落库
  if (import.meta.env.DEV && new URLSearchParams(window.location.search).has('demo')) {
    const { seedDemoIfEmpty, openDemoNote } = await import('./infra/db/demoSeed')
    await seedDemoIfEmpty()
    if (new URLSearchParams(window.location.search).has('open')) await openDemoNote()
  }

  createRoot(container as HTMLElement).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

void start()
