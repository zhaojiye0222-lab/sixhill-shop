import { defineConfig } from 'vite'
import uni from '@dcloudio/vite-plugin-uni'

// Import unocss dynamically to avoid ESM require issues
// https://vitejs.dev/config/
export default async () => {
  const UnoCSS = (await import('unocss/vite')).default
  return defineConfig({
    plugins: [
      UnoCSS(),
      uni()
    ]
  })
}