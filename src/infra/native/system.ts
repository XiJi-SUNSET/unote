import { Capacitor } from '@capacitor/core'
import { App as CapacitorApp } from '@capacitor/app'
import { StatusBar, Style } from '@capacitor/status-bar'
import type { Scheme } from '../../app/theme'

const isNative = () => Capacitor.isNativePlatform()

/** 状态栏图标跟着主题走：浅色背景要深色图标，反之亦然。 */
export function applyStatusBarStyle(scheme: Scheme): void {
  if (!isNative()) return
  void StatusBar.setStyle({ style: scheme === 'dark' ? Style.Light : Style.Dark })
}

/**
 * 接管 Android 物理返回键。
 * 返回 false 表示已经退无可退，交给系统退出 App。
 */
export function registerBackButton(onBack: () => boolean): () => void {
  if (!isNative()) return () => {}

  const handle = CapacitorApp.addListener('backButton', () => {
    if (!onBack()) void CapacitorApp.exitApp()
  })

  return () => {
    void handle.then((listener) => listener.remove())
  }
}
