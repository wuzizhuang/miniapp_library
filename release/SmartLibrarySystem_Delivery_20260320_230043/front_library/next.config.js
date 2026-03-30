/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // 生成独立的 standalone 输出，用于 Docker 部署
  output: 'standalone',
  async rewrites() {
    return [
      {
        source: '/api/backend/:path*',
        // 在 Docker 中由环境变量 BACKEND_URL 覆盖，本地开发默认转发到 8089
        destination: `${process.env.BACKEND_URL || 'http://localhost:8089'}/api/:path*`,
      },
    ]
  },
}

module.exports = nextConfig
