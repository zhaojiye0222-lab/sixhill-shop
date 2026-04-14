import { defineConfig } from 'unocss'
import presetWeapp from 'unocss-preset-weapp'
import { transformerClass, transformerAttributify } from 'unocss-preset-weapp/transformer'
import transformerDirectives from '@unocss/transformer-directives'

export default defineConfig({
  presets: [
    presetWeapp({
      // Weapp preset config
      isH5: false,
      platform: 'uniapp',
      transform: true,
      whRpx: false, // VERY IMPORTANT: Set to false so w-12 becomes 3rem (which converts to 96rpx) instead of 12rpx
      preflight: false // Disable preflight to avoid generating `page,::before,::after` which breaks WXSS parsing
    })
  ],
  transformers: [
    transformerDirectives(),
    transformerAttributify(),
    transformerClass()
  ],
  shortcuts: [
    {
      'custom-scrollbar': ''
    }
  ]
})