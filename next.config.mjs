const backend = process.env.EMBERA_API_ORIGIN || 'http://127.0.0.1:8000'
export default {
  devIndicators: false,
  async rewrites() {
    return [
      { source: '/bioscape', destination: '/bioscape.html' },
      { source: '/api/:path*', destination: backend + '/api/:path*' },
    ]
  },
}
