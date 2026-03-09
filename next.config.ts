/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: false, // <-- Отключаем двойной рендер, который ломает WebRTC
}

module.exports = nextConfig

