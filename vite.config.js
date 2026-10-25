import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// Open early connections to the API and Supabase so the first request
// doesn't pay for DNS + TLS after the JavaScript has loaded.
function preconnect(env) {
  const origins = [env.VITE_API_URL, env.VITE_SUPABASE_URL]
    .filter((u) => /^https:\/\//.test(u || ''))
    .map((u) => new URL(u).origin)
  return {
    name: 'gigset-preconnect',
    transformIndexHtml: () =>
      origins.map((href) => ({ tag: 'link', attrs: { rel: 'preconnect', href, crossorigin: '' }, injectTo: 'head-prepend' })),
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react(), preconnect(env)],
    // Relative asset paths so the static build works from any sub-path
    // (e.g. a GitHub Pages project site) with no server config.
    base: './',
    build: {
      rolldownOptions: {
        output: {
          // Stable vendor chunks: they change rarely, so returning visitors
          // keep them cached while page code updates.
          codeSplitting: {
            groups: [
              { name: 'vendor-react', test: /node_modules[\\/](react|react-dom|react-router|react-router-dom|scheduler)[\\/]/, priority: 30 },
              { name: 'vendor-motion', test: /node_modules[\\/](framer-motion|motion-dom|motion-utils)[\\/]/, priority: 20 },
              { name: 'vendor-supabase', test: /node_modules[\\/]@supabase[\\/]/, priority: 10 },
            ],
          },
        },
      },
    },
  }
})
