module.exports = {
  plugins: {
    // 'tailwindcss': {}, // Removed to avoid conflict with unocss
    'autoprefixer': {},
    'postcss-rem-to-responsive-pixel': {
      rootValue: 32,
      propList: ['*'],
      transformUnit: 'rpx'
    }
  }
}