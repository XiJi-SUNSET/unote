import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'app.unote',
  appName: 'Unote',
  webDir: 'dist',
  android: {
    backgroundColor: '#ffefe5',
  },
  plugins: {
    // Capacitor 8 内置的 SystemBars 会自己加内边距，和 safe-area 插件叠加后
    // 顶部会多出一层空白，这里关掉它，只让 safe-area 负责。
    SystemBars: {
      insetsHandling: 'disable',
    },
  },
}

export default config
