module.exports = {
  devServer: {
    proxy: {
      '/api': {
        target: process.env.VUE_APP_API_BASE_URL || 'http://localhost:3000',
        changeOrigin: true,
        ws: true,
        logLevel: 'debug'
      }
    },
    port: process.env.VUE_APP_PORT || 8080,
    host: '0.0.0.0'
  },
  lintOnSave: false,
  
  // 生产环境配置
  publicPath: process.env.NODE_ENV === 'production' ? '/' : '/',
  outputDir: 'dist',
  assetsDir: 'static'
} 