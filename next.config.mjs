const backend = process.env.EMBERA_API_ORIGIN || 'http://127.0.0.1:8000'
export default {
  async rewrites() {
    return [{ source: '/api/:path*', destination: backend + '/api/:path*' }]
  },
}
