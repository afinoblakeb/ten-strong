import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base:'./',
  plugins:[react(),VitePWA({
    registerType:'autoUpdate',
    includeAssets:['app-icon.svg','apple-touch-icon.png'],
    manifest:{
      id:'./',
      name:'Ten Strong: A 90-Day Strength Challenge',
      short_name:'Ten Strong',
      description:'A private, progressive ten-minute daily strength challenge.',
      theme_color:'#f3f1eb',
      background_color:'#f3f1eb',
      display:'standalone',
      start_url:'./#/',
      scope:'./',
      icons:[
        {src:'app-icon-192.png',sizes:'192x192',type:'image/png'},
        {src:'app-icon-512.png',sizes:'512x512',type:'image/png'},
        {src:'app-icon-512.png',sizes:'512x512',type:'image/png',purpose:'maskable'},
      ],
    },
    workbox:{navigateFallback:'index.html',globPatterns:['**/*.{js,css,html,svg,png,ico,woff2}']},
  })],
})
