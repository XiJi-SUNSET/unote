import { afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'

// jsdom 没有 matchMedia，主题切换要用到
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(() => false),
  }),
})

afterEach(() => {
  cleanup()
})
